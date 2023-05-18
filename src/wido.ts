import { ethers, Wallet, ContractReceipt, Contract, BigNumber } from 'ethers';
import {
  AllowSignatureMessage,
  AllowTypes,
  AssetInfo,
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
  private readonly comet: string;
  private readonly cometContract: Contract;
  private readonly wallet: Wallet;

  constructor(signer: Wallet, comet: string) {
    Wido.validateComet(comet);
    this.wallet = signer;
    this.comet = comet;
    this.cometContract = getCometContract(comet, this.wallet.provider);
  }

  /**
   * Returns a list of the existing deployments
   */
  static getDeployments(): string[] {
    return Compound.comet.getSupportedDeployments();
  }

  /**
   * Returns a list of the collaterals supported by the given Comet
   */
  async getSupportedCollaterals(): Promise<string[]> {
    const infos = await this.getAssetsInfo();
    return infos.map(asset => asset.asset)
  }

  /**
   * Returns a list of user owned collaterals on the given Comet
   */
  async getUserCollaterals(): Promise<Collaterals> {
    const collaterals = await this.getSupportedCollaterals()
    const userAddress = this.getUserAddress();

    const calls = collaterals.map(collateral => {
      return this.cometContract.callStatic.userCollateral(userAddress, collateral);
    })

    return await Promise.all(calls)
      .then(results => {
        return results.map((result, index) => {
          return {
            address: collaterals[index],
            balance: result[0]
          }
        })
      })
  }

  /**
   * Returns the user's current position details in a Comet
   */
  async getUserCurrentPosition() {
    const userAddress = await this.getUserAddress();
    const infos = await this.getAssetsInfo();

    const { balances, prices } = await this.getCollateralsDetails(infos, userAddress);

    const {
      collateralValueInBaseUnits,
      totalBorrowCapacityInBaseUnits
    } = Wido.getPositionDetails(infos, balances, prices);

    const borrowedInBaseUnits = await this.getBorrowedInBaseUnits(userAddress);

    const borrowCapacityInBaseUnits = totalBorrowCapacityInBaseUnits - borrowedInBaseUnits;

    return {
      collateralValue: collateralValueInBaseUnits,
      liquidationPoint: "", // TODO
      borrowCapacity: totalBorrowCapacityInBaseUnits,
      borrowAvailable: borrowCapacityInBaseUnits,
    }
  }

  /**
   * Returns the user's current position details in a Comet
   * @param swapQuote
   */
  async getUserPredictedPosition(swapQuote: CollateralSwapRoute) {
    const userAddress = await this.getUserAddress();
    const infos = await this.getAssetsInfo();

    const { balances, prices } = await this.getCollateralsDetails(infos, userAddress);

    // modify the balances to subtract the swapped balance and increase the potentially received
    // in order to compute the predicted position details
    const predictedBalances = balances.map((balance, i) => {
      const { asset } = infos[i];
      if (asset === swapQuote.fromCollateral) {
        return balance.sub(BigNumber.from(swapQuote.fromCollateralAmount))
      } else if (asset === swapQuote.toCollateral) {
        return balance.add(BigNumber.from(swapQuote.toCollateralAmount))
      } else {
        return balance;
      }
    })

    const {
      collateralValueInBaseUnits,
      totalBorrowCapacityInBaseUnits
    } = Wido.getPositionDetails(infos, predictedBalances, prices);

    const borrowedInBaseUnits = await this.getBorrowedInBaseUnits(userAddress);

    const borrowCapacityInBaseUnits = totalBorrowCapacityInBaseUnits - borrowedInBaseUnits;

    return {
      collateralValue: collateralValueInBaseUnits,
      liquidationPoint: "", // TODO
      borrowCapacity: totalBorrowCapacityInBaseUnits,
      borrowAvailable: borrowCapacityInBaseUnits,
    }
  }

  /**
   * Quotes the possible outcome of the collateral swap
   * @param fromCollateral
   * @param toCollateral
   */
  async getCollateralSwapRoute(
    fromCollateral: string,
    toCollateral: string
  ): Promise<CollateralSwapRoute> {
    const chainId = getChainId(this.comet);
    const userAddress = await this.getUserAddress();
    const collaterals = await this.getUserCollaterals();

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
    const toAmount = supported && quoteResponse.minToTokenAmount
      ? String(quoteResponse.minToTokenAmount)
      : "0";

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
   * @param swapQuote
   */
  async swapCollateral(
    swapQuote: CollateralSwapRoute
  ): Promise<ContractReceipt> {
    const chainId = getChainId(this.comet);
    const cometAddress = getCometAddress(this.comet);
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
   * @private
   */
  private async getAssetsInfo(): Promise<AssetInfo[]> {
    const numAssets = await this.cometContract.callStatic.numAssets();

    return await Promise.all(
      [...Array(numAssets).keys()]
        .map(i => this.cometContract.callStatic.getAssetInfo(i))
    );
  }

  /**
   * Fetch and return the base token details of a Comet
   * @private
   */
  private async getBaseTokenDetails(): Promise<{
    basePrice: number,
    baseDecimals: number,
  }> {
    const baseTokenPriceFeed = await this.cometContract.callStatic.baseTokenPriceFeed();
    const basePrice = +(await this.cometContract.callStatic.getPrice(baseTokenPriceFeed)).toString() / 1e8;
    const baseDecimals = +(await this.cometContract.callStatic.decimals()).toString();

    return {
      basePrice,
      baseDecimals,
    }
  }

  /**
   * Fetch and return the details of the collaterals of a user on a Comet
   * @param infos
   * @param userAddress
   * @private
   */
  private async getCollateralsDetails(
    infos: AssetInfo[],
    userAddress: string
  ): Promise<{
    balances: BigNumber[]
    prices: BigNumber[]
  }> {
    const promisesCollaterals = [];
    const promisesPrices = [];
    for (let i = 0; i < infos.length; i++) {
      const { asset, priceFeed } = infos[i];
      promisesCollaterals.push(this.cometContract.callStatic.collateralBalanceOf(userAddress, asset));
      promisesPrices.push(this.cometContract.callStatic.getPrice(priceFeed));
    }
    const collateralBalances = await Promise.all(promisesCollaterals);
    const collateralPrices = await Promise.all(promisesPrices);
    return {
      balances: collateralBalances,
      prices: collateralPrices
    }
  }

  /**
   * Returns the summary of a position on the Comet given the list of balances/prices
   * @param infos
   * @param balances
   * @param prices
   * @private
   */
  private static getPositionDetails(infos: AssetInfo[], balances: BigNumber[], prices: BigNumber[]): {
    collateralValueInBaseUnits: number
    totalBorrowCapacityInBaseUnits: number
  } {
    let collateralValueInBaseUnits = 0;
    let totalBorrowCapacityInBaseUnits = 0;
    for (let i = 0; i < infos.length; i++) {
      const collateralBalance = +(balances[i].toString()) / +(infos[i].scale).toString();
      const collateralPrice = +prices[i].toString() / 1e8;
      collateralValueInBaseUnits += collateralBalance * collateralPrice;
      totalBorrowCapacityInBaseUnits += (
        collateralBalance * collateralPrice * (+infos[i].borrowCollateralFactor.toString() / 1e18)
      );
    }
    return {
      collateralValueInBaseUnits,
      totalBorrowCapacityInBaseUnits
    }
  }

  /**
   * Returns the amount of borrowed base token
   * @param userAddress
   * @private
   */
  private async getBorrowedInBaseUnits(userAddress: string): Promise<number> {
    const { basePrice, baseDecimals } = await this.getBaseTokenDetails();
    const borrowBalance = +(await this.cometContract.callStatic.borrowBalanceOf(userAddress)).toString();
    return borrowBalance / Math.pow(10, baseDecimals) * basePrice;
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
      contract.callStatic.userNonce(userAddress),
      contract.callStatic.name(),
      contract.callStatic.version(),
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