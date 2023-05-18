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
    const infos = await Wido.getAssetsInfo(contract);

    return infos.map(asset => asset.asset)
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
      return contract.callStatic.userCollateral(user, collateral);
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
   * @param comet
   */
  async getUserCurrentPosition(comet: string) {
    Wido.validateComet(comet);

    const userAddress = await this.getUserAddress();
    const cometContract = getCometContract(comet, this.wallet.provider);
    const infos = await Wido.getAssetsInfo(cometContract);

    const { balances, prices } = await Wido.getCollateralsDetails(cometContract, infos, userAddress);

    const {
      collateralValueInBaseUnits,
      totalBorrowCapacityInBaseUnits
    } = Wido.getPositionDetails(infos, balances, prices);

    const borrowedInBaseUnits = await Wido.getBorrowedInBaseUnits(cometContract, userAddress);

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
   * @param comet
   * @param swapQuote
   */
  async getUserPredictedPosition(comet: string, swapQuote: CollateralSwapRoute) {
    Wido.validateComet(comet);

    const userAddress = await this.getUserAddress();
    const cometContract = getCometContract(comet, this.wallet.provider);
    const infos = await Wido.getAssetsInfo(cometContract);

    const { balances, prices } = await Wido.getCollateralsDetails(cometContract, infos, userAddress);

    // modify the balances to subtract the swapped balance and increase the potentially received
    // in order to compute the predicted position details
    const predictedBalances = balances.map((balance, i) => {
      const {asset} = infos[i];
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

    const borrowedInBaseUnits = await Wido.getBorrowedInBaseUnits(cometContract, userAddress);

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
   *
   * @param cometContract
   * @private
   */
  private static async getAssetsInfo(cometContract: Contract): Promise<AssetInfo[]> {
    const numAssets = await cometContract.callStatic.numAssets();

    return await Promise.all(
      [...Array(numAssets).keys()]
        .map(i => cometContract.callStatic.getAssetInfo(i))
    );
  }

  /**
   * Fetch and return the base token details of a Comet
   * @param cometContract
   * @private
   */
  private static async getBaseTokenDetails(cometContract: Contract): Promise<{
    basePrice: number,
    baseDecimals: number,
  }> {
    const baseTokenPriceFeed = await cometContract.callStatic.baseTokenPriceFeed();
    const basePrice = +(await cometContract.callStatic.getPrice(baseTokenPriceFeed)).toString() / 1e8;
    const baseDecimals = +(await cometContract.callStatic.decimals()).toString();

    return {
      basePrice,
      baseDecimals,
    }
  }

  /**
   * Fetch and return the details of the collaterals of a user on a Comet
   * @param cometContract
   * @param infos
   * @param userAddress
   * @private
   */
  private static async getCollateralsDetails(
    cometContract: Contract,
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
      promisesCollaterals.push(cometContract.callStatic.collateralBalanceOf(userAddress, asset));
      promisesPrices.push(cometContract.callStatic.getPrice(priceFeed));
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
   * @param cometContract
   * @param userAddress
   * @private
   */
  private static async getBorrowedInBaseUnits(cometContract: Contract, userAddress: string): Promise<number> {
    const { basePrice, baseDecimals } = await Wido.getBaseTokenDetails(cometContract);
    const borrowBalance = +(await cometContract.callStatic.borrowBalanceOf(userAddress)).toString();
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