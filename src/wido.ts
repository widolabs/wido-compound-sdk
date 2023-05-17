import { ethers, Wallet, ContractReceipt } from 'ethers';
import {
  AllowSignatureMessage,
  AllowTypes,
  EIP712Domain,
  Signature
} from '@compound-finance/compound-js/dist/nodejs/types';
import Compound from '@compound-finance/compound-js';
import { providers } from '@0xsequence/multicall';
import { Comet_ABI } from './types/comet';
import { sign } from './utils/EIP712';
import { getChainId, getCometAddress, getCometContract, getWidoContract, pickAsset } from './utils';
import { quote, QuoteRequest, useLocalApi, getWidoSpender } from 'wido';
import { Collaterals, CollateralSwapRoute } from './types';

export class Wido {
  private readonly wallet: Wallet;

  constructor(signer: Wallet) {
    this.wallet = signer;
  }

  /**
   * Returns a list of the existing deployments
   */
  static getDeployments(): string[] {
    return Compound.comet.getSupportedDeployments();
  }

  /**
   * Returns a list of the collaterals supported by the given Comet
   * @param comet
   */
  async getSupportedCollaterals(comet: string): Promise<string[]> {
    Wido.validateComet(comet);

    const contract = getCometContract(comet, this.wallet.provider);
    const numAssets = (await contract.functions.numAssets())[0];
    const calls = [...Array(numAssets).keys()]
      .map(i => contract.functions.getAssetInfo(i));

    return await Promise.all(calls)
      .then(assets => {
        return assets.map(asset => asset[0].asset)
      })
  }

  /**
   * Returns a list of user owned collaterals on the given Comet
   * @param user
   * @param comet
   */
  async getUserCollaterals(user: string, comet: string): Promise<Collaterals> {
    Wido.validateComet(comet);

    const collaterals = await this.getSupportedCollaterals(comet)
    const contract = getCometContract(comet, this.wallet.provider);

    const calls = collaterals.map(collateral => {
      return contract.functions.userCollateral(user, collateral);
    })

    return await Promise.all(calls)
      .then(results => {
        return results.map((result, index) => {
          return {
            address: collaterals[index],
            balance: result.balance
          }
        })
      })
  }

  /**
   * Quotes the possible outcome of the collateral swap
   * @param comet
   * @param fromCollateral
   * @param toCollateral
   */
  async getCollateralSwapRoute(
    comet: string,
    fromCollateral: string,
    toCollateral: string
  ): Promise<CollateralSwapRoute> {
    Wido.validateComet(comet);

    const chainId = getChainId(comet);
    const userAddress = await this.getUserAddress();
    const collaterals = await this.getUserCollaterals(userAddress, comet);

    const fromAsset = pickAsset(collaterals, fromCollateral);
    const toAsset = pickAsset(collaterals, toCollateral);

    const quoteRequest: QuoteRequest = {
      fromChainId: chainId,
      fromToken: fromAsset.address,
      toChainId: chainId,
      toToken: toAsset.address,
      amount: fromAsset.balance.toString(),
      user: userAddress,
      recipient: userAddress,
    }

    useLocalApi(); // REMOVE
    const quoteResponse = await quote(quoteRequest);
    const tokenManager = await getWidoSpender({
      chainId: chainId,
      fromToken: fromAsset.address,
      toChainId: chainId,
      toToken: toAsset.address
    })

    const supported = quoteResponse.isSupported;
    const toAmount = supported ? String(quoteResponse.minToTokenAmount) : "0";

    return {
      isSupported: supported,
      to: quoteResponse.to,
      data: quoteResponse.data,
      tokenManager: tokenManager,
      fromCollateral: fromAsset.address,
      fromCollateralAmount: fromAsset.balance.toString(),
      toCollateral: toAsset.address,
      toCollateralAmount: toAmount
    }
  }

  /**
   * Executes a collateral swap on a Comet given an existing quote
   * @param comet
   * @param swapQuote
   */
  async swapCollateral(
    comet: string,
    swapQuote: CollateralSwapRoute
  ): Promise<ContractReceipt> {
    Wido.validateComet(comet);

    const chainId = getChainId(comet);
    const cometAddress = getCometAddress(comet);
    const widoCollateralSwapContract = getWidoContract(chainId, this.wallet);

    const { allowSignature, revokeSignature } = await this.createSignatures(
      chainId,
      cometAddress,
      widoCollateralSwapContract.address,
    );

    const existingCollateral = {
      addr: swapQuote.fromCollateral,
      amount: swapQuote.fromCollateralAmount
    }
    const finalCollateral = {
      addr: swapQuote.toCollateral,
      amount: swapQuote.toCollateralAmount
    }
    const sigs = {
      allow: allowSignature,
      revoke: revokeSignature
    }

    const tx = await widoCollateralSwapContract.functions.swapCollateral(
      existingCollateral,
      finalCollateral,
      sigs,
      swapQuote.to,
      swapQuote.tokenManager,
      swapQuote.data,
    );

    return tx.wait();
  }

  /**
   * Generates to EIP712 signatures.
   * One to allow WidoRouter to withdraw asset,
   * the other to revoke that permission.
   * @param chainId
   * @param cometAddress
   * @param manager
   * @private
   */
  private async createSignatures(
    chainId: number,
    cometAddress: string,
    manager: string,
  ): Promise<{
    allowSignature: Signature,
    revokeSignature: Signature
  }> {
    const userAddress = await this.getUserAddress()

    const contract = new ethers.Contract(
      cometAddress,
      Comet_ABI,
      new providers.MulticallProvider(this.wallet.provider)
    );

    const results = await Promise.all([
      contract.functions.userNonce(userAddress),
      contract.functions.name(),
      contract.functions.version(),
    ]);

    let nonce = +results[0];
    const name = results[1];
    const version = results[2];

    // generate signature to give permission
    const allowSignature = await this.createAllowSignature(
      chainId,
      cometAddress,
      userAddress,
      manager,
      true,
      nonce,
      name,
      version
    )

    // generate signature to revoke permission
    const revokeSignature = await this.createAllowSignature(
      chainId,
      cometAddress,
      userAddress,
      manager,
      false,
      ++nonce,
      name,
      version
    )

    return {
      allowSignature,
      revokeSignature
    }
  }

  /**
   * Generates a signature for an allow operation
   * @param chainId
   * @param cometAddress
   * @param owner
   * @param manager
   * @param isAllowed
   * @param nonce
   * @param name
   * @param version
   * @private
   */
  private async createAllowSignature(
    chainId: number,
    cometAddress: string,
    owner: string,
    manager: string,
    isAllowed: boolean,
    nonce: number,
    name: string,
    version: string,
  ): Promise<Signature> {
    try {
      manager = ethers.utils.getAddress(manager);
    } catch (e) {
      throw Error('Compound Comet [createAllowSignature] | Argument `manager` must be a valid Ethereum address.');
    }

    const domain: EIP712Domain = {
      name,
      version,
      chainId,
      verifyingContract: cometAddress
    };

    const primaryType = 'Authorization';

    const expiry = 10e9;
    const message: AllowSignatureMessage = {
      owner,
      manager,
      isAllowed,
      nonce,
      expiry
    };

    const types: AllowTypes = {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Authorization: [
        { name: 'owner', type: 'address' },
        { name: 'manager', type: 'address' },
        { name: 'isAllowed', type: 'bool' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' }
      ]
    };

    return await sign(domain, primaryType, message, types, this.wallet);
  }

  private async getUserAddress(): Promise<string> {
    let userAddress = this.wallet.address;

    if (!userAddress && this.wallet.getAddress) {
      userAddress = await this.wallet.getAddress();
    }

    return userAddress;
  }

  private static validateComet(comet: string) {
    const existingDeployments = this.getDeployments()
    if (!existingDeployments.includes(comet)) {
      throw new Error("Comet not supported");
    }
  }
}