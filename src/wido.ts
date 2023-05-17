import { ethers, Wallet } from 'ethers';
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
import { getChainId, getCometAddress, getCometContract } from './utils';

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
  async getUserCollaterals(user: string, comet: string): Promise<string[]> {
    const collaterals = await this.getSupportedCollaterals(comet)
    const contract = getCometContract(comet, this.wallet.provider);

    const calls = collaterals.map(collateral => {
      return contract.functions.userCollateral(user, collateral);
    })

    return await Promise.all(calls)
      .then(results => {
        return results.map(r => r.balance)
      })
  }

  /**
   *
   * @param comet
   */
  async swapCollateral(comet: string): Promise<void> {
    Wido.validateComet(comet);

    const chainId = getChainId(comet);
    const cometAddress = getCometAddress(comet);
    const widoRouter = "0xCb005d849F384b64838aAD885d5Ff150fc8B7904";

    const { allowSignature, revokeSignature } = await this.createSignatures(
      chainId,
      cometAddress,
      widoRouter,
    );


    // send both sigs plus order to Wido
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
    let userAddress = this.wallet.address;

    if (!userAddress && this.wallet.getAddress) {
      userAddress = await this.wallet.getAddress();
    }

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

  private static validateComet(comet: string) {
    const existingDeployments = this.getDeployments()
    if (!existingDeployments.includes(comet)) {
      throw new Error("Comet not supported");
    }
  }

}