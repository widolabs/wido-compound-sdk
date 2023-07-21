import { BigNumber, Contract, ethers, Signature, Signer, TypedDataDomain } from 'ethers';
import type { TypedDataSigner } from "@ethersproject/abstract-signer";
import { AllowSignatureMessage, AssetInfo, } from '@compound-finance/compound-js/dist/nodejs/types';
import Compound from '@compound-finance/compound-js';
import { providers } from '@0xsequence/multicall';
import { splitSignature } from 'ethers/lib/utils';
import { Comet_ABI } from './types/comet';
import { IWidoCollateralSwap_ABI } from './types/widoCollateralSwap';
import {
  formatNumber,
  getChainId,
  getCometAddress,
  getDeploymentDetails,
  pickAsset,
  widoCollateralSwapAddress
} from './utils';
import { getWidoSpender, quote, Providers } from 'wido';
import { Asset, Assets, CollateralSwapRoute, Deployments, Position, UserAssets } from './types';
import { LoanProviders } from './providers/loanProviders';
import { LoanProvider } from './providers/loanProvider';
import { CoingeckoTokensPriceFetcher } from './utils/coingecko-tokens-price-fetcher';

export class WidoCompoundSdk {
  private readonly comet: string;
  private readonly signer: Signer & TypedDataSigner;
  private readonly priceFetcher: CoingeckoTokensPriceFetcher;

  constructor(signer: Signer & TypedDataSigner, comet: string) {
    WidoCompoundSdk.validateComet(comet);
    this.signer = signer;
    this.comet = comet;
    this.priceFetcher = new CoingeckoTokensPriceFetcher();
  }

  /**
   * Returns a list of the existing deployments
   */
  public static getDeployments(): Deployments {
    const deployments = Compound.comet.getSupportedDeployments();
    const result = [];
    for (const deployment of deployments) {
      const details = getDeploymentDetails(deployment);
      if (details) {
        result.push(details);
      }
    }
    return result;
  }

  /**
   * Returns a list of the collaterals supported by the given Comet
   */
  public async getSupportedCollaterals(): Promise<Assets> {
    const cometContract = await this.getCometContract();
    const names = Compound.comet.getSupportedCollaterals(this.comet);
    const infos = await this.getAssetsInfo(cometContract);
    const decimals = await this.getDecimals(infos);
    return infos.map((asset, i) => {
      return {
        name: names[i],
        address: asset.asset,
        decimals: Number(decimals[i].toString()),
      }
    })
  }

  /**
   * Returns a list of user owned collaterals on the given Comet
   */
  public async getUserCollaterals(): Promise<UserAssets> {
    const cometContract = await this.getCometContract();

    const collaterals = await this.getSupportedCollaterals()
    const userAddress = this.getUserAddress();

    const calls = collaterals.map(collateral => {
      return cometContract.callStatic.userCollateral(userAddress, collateral.address);
    })

    return await Promise.all(calls)
      .then(results => {
        return results.map((result, index) => {
          return {
            name: collaterals[index].name,
            address: collaterals[index].address,
            decimals: collaterals[index].decimals,
            balance: result[0]
          }
        })
      })
      .catch(() => {
        throw new Error("Failed to fetch collaterals")
      })
  }

  /**
   * Returns the user's current position details in a Comet
   */
  public async getUserCurrentPosition(): Promise<Position> {
    const cometContract = await this.getCometContract();

    const userAddress = await this.getUserAddress();
    const infos = await this.getAssetsInfo(cometContract);

    const { balances, prices } = await WidoCompoundSdk.getCollateralsDetails(cometContract, infos, userAddress);

    return await WidoCompoundSdk.getPositionDetails(cometContract, userAddress, infos, balances, prices);
  }

  /**
   * Returns the user's current position details in a Comet
   * @param swapQuote
   */
  public async getUserPredictedPosition(swapQuote: CollateralSwapRoute): Promise<Position> {
    const cometContract = await this.getCometContract();

    const userAddress = await this.getUserAddress();
    const infos = await this.getAssetsInfo(cometContract);

    const { balances, prices } = await WidoCompoundSdk.getCollateralsDetails(cometContract, infos, userAddress);

    // modify the balances to subtract the swapped balance and increase the potentially received
    // in order to compute the predicted position details
    const predictedBalances = balances.map((balance, i) => {
      const { asset } = infos[i];
      if (asset === swapQuote.fromCollateral) {
        return balance.sub(BigNumber.from(swapQuote.fromCollateralAmount))
      } else if (asset === swapQuote.toCollateral) {
        return balance.add(BigNumber.from(swapQuote.toCollateralMinAmount))
      } else {
        return balance;
      }
    })

    return await WidoCompoundSdk.getPositionDetails(cometContract, userAddress, infos, predictedBalances, prices);
  }

  /**
   * Quotes the possible outcome of the collateral swap
   * @param fromCollateral
   * @param toCollateral
   * @param amount
   */
  public async getCollateralSwapRoute(
    fromCollateral: string,
    toCollateral: string,
    amount: BigNumber
  ): Promise<CollateralSwapRoute> {
    const chainId = getChainId(this.comet);

    // pick assets from collaterals list
    const collaterals = await this.getUserCollaterals();
    const fromAsset = pickAsset(collaterals, fromCollateral);
    const toAsset = pickAsset(collaterals, toCollateral);

    // check user has enough balance
    if (amount.gt(fromAsset.balance)) {
      throw new Error("From amount bigger than balance");
    }

    // initial quote to get final amount
    let quoteResponse = await quote({
      fromChainId: chainId,
      fromToken: fromAsset.address,
      toChainId: chainId,
      toToken: toAsset.address,
      amount: amount.toString(),
      providers: [Providers.ZeroEx],
    });

    // select best provider for this swap
    const provider = await this.getBestProvider(
      chainId,
      toAsset.address,
      BigNumber.from(quoteResponse.toTokenAmount)
    );
    if (!provider) {
      throw new Error("There is no loan provider to enable this swap");
    }

    // quote Wido API for complete route
    quoteResponse = await quote({
      fromChainId: chainId,
      fromToken: fromAsset.address,
      toChainId: chainId,
      toToken: toAsset.address,
      amount: amount.toString(),
      user: widoCollateralSwapAddress[chainId][provider.id()],
      providers: [Providers.ZeroEx],
    });

    // fetch Wido Token Manager address
    const tokenManager = await getWidoSpender({
      chainId: chainId,
      fromToken: fromAsset.address,
      toChainId: chainId,
      toToken: toAsset.address
    })

    // check values and set defaults
    const supported = quoteResponse.isSupported;
    const toAmount = supported && quoteResponse.toTokenAmount
      ? quoteResponse.toTokenAmount
      : "0";
    const minToAmount = supported && quoteResponse.minToTokenAmount
      ? quoteResponse.minToTokenAmount
      : "0";

    // compute fees
    const wido_fee_bps = quoteResponse.feeBps ?? 0;
    const widoFee = formatNumber(amount.mul(wido_fee_bps).div(10000), fromAsset.decimals);
    const providerFee = formatNumber(await provider.computeFee(), toAsset.decimals);
    const usdFees = await this.getUsdFees(
      fromAsset, widoFee,
      toAsset, providerFee,
      chainId
    );

    // construct & return quote
    return {
      isSupported: supported,
      provider: provider.id(),
      to: quoteResponse.to,
      data: quoteResponse.data,
      tokenManager: tokenManager,
      fromCollateral: fromAsset.address,
      fromCollateralAmount: amount.toString(),
      toCollateral: toAsset.address,
      toCollateralAmount: toAmount,
      toCollateralMinAmount: minToAmount,
      price: quoteResponse.price,
      fees: {
        providerFee: providerFee,
        widoFee: widoFee,
        widoFeeUsd: usdFees.widoFee,
        providerFeeUsd: usdFees.providerFee,
        totalUsd: usdFees.widoFee + usdFees.providerFee
      }
    }
  }

  /**
   * Executes a collateral swap on a Comet given an existing quote
   * @param swapQuote
   */
  public async swapCollateral(
    swapQuote: CollateralSwapRoute
  ): Promise<string> {
    const chainId = getChainId(this.comet);
    const cometAddress = getCometAddress(this.comet);
    const widoCollateralSwapContract = await this.getWidoContract(chainId, swapQuote.provider);

    // create allow & revoke signatures for Comet contract
    const { allowSignature, revokeSignature } = await this.createSignatures(
      chainId,
      cometAddress,
      widoCollateralSwapContract.address,
    );

    // build collateral structs
    const existingCollateral = {
      addr: swapQuote.fromCollateral,
      amount: swapQuote.fromCollateralAmount
    }
    const finalCollateral = {
      addr: swapQuote.toCollateral,
      amount: swapQuote.toCollateralMinAmount
    }

    // build signatures struct
    const sigs = {
      allow: allowSignature,
      revoke: revokeSignature
    }

    // build Wido swap struct
    const widoSwap = {
      router: swapQuote.to,
      tokenManager: swapQuote.tokenManager,
      callData: swapQuote.data,
    }

    // invoke Wido contract
    const tx = await widoCollateralSwapContract.functions.swapCollateral(
      existingCollateral,
      finalCollateral,
      sigs,
      widoSwap,
      cometAddress
    );

    return tx.hash;
  }

  /**
   * Find and return the best provider for the current asset/amount
   * @param chainId
   * @param asset
   * @param amount
   * @private
   */
  private async getBestProvider(chainId: number, asset: string, amount: BigNumber) {
    if (!this.signer.provider) {
      throw new Error("Signer without provider");
    }
    const providers = new LoanProviders(chainId, asset, amount, this.signer.provider);
    return providers.getBest();
  }

  /**
   * Returns the info of all supported assets in the Comet
   * @private
   */
  private async getAssetsInfo(cometContract: Contract): Promise<AssetInfo[]> {
    const numAssets = await cometContract.callStatic.numAssets().catch(() => {
      throw new Error("Failed to fetch numAssets")
    });
    return await Promise.all(
      [...Array(numAssets).keys()]
        .map(i => cometContract.callStatic.getAssetInfo(i))
    )
      .catch(() => {
        throw new Error("Failed to fetch assets info")
      });
  }

  /**
   * Returns the decimals of all the assets
   * @private
   */
  private async getDecimals(infos: AssetInfo[]): Promise<number[]> {
    if (!this.signer.provider) {
      throw new Error("Signer without provider");
    }
    const calls = [];
    const provider = new providers.MulticallProvider(this.signer.provider);
    for (let i = 0; i < infos.length; i++) {
      const contract = new Contract(
        infos[i].asset,
        [
          "function decimals() external returns(uint8)"
        ],
        provider
      );
      calls.push(contract.callStatic.decimals());
    }
    return await Promise.all(calls).catch(() => {
      throw new Error("Failed to fetch decimals")
    })
  }

  /**
   * Fetch and return the base token details of a Comet
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
    const collateralBalances = await Promise.all(promisesCollaterals).catch(() => {
      throw new Error("Failed to fetch collateral balances")
    });
    const collateralPrices = await Promise.all(promisesPrices).catch(() => {
      throw new Error("Failed to fetch collateral prices")
    });
    return {
      balances: collateralBalances,
      prices: collateralPrices
    }
  }

  /**
   * Returns the summary of a position on the Comet given the list of balances/prices
   * @param cometContract
   * @param userAddress
   * @param infos
   * @param balances
   * @param prices
   * @private
   */
  private static async getPositionDetails(
    cometContract: Contract,
    userAddress: string,
    infos: AssetInfo[],
    balances: BigNumber[],
    prices: BigNumber[]
  ): Promise<Position> {
    let collateralValue_inBaseUnits = 0;
    let totalBorrowCapacity_inBaseUnits = 0;
    let liquidationPoint_inBaseUnits = 0;

    for (let i = 0; i < infos.length; i++) {
      const collateralBalance = +(balances[i].toString()) / +(infos[i].scale).toString();
      const collateralPrice = +prices[i].toString() / 1e8;
      collateralValue_inBaseUnits += collateralBalance * collateralPrice;
      totalBorrowCapacity_inBaseUnits += (
        collateralBalance * collateralPrice * (+infos[i].borrowCollateralFactor.toString() / 1e18)
      );
      liquidationPoint_inBaseUnits += (
        collateralBalance * collateralPrice * (+infos[i].liquidationFactor.toString() / 1e18)
      );
    }

    const borrowed_inBaseUnits = await WidoCompoundSdk.getBorrowedInBaseUnits(cometContract, userAddress);
    const borrowAvailable_inBaseUnits = totalBorrowCapacity_inBaseUnits - borrowed_inBaseUnits;

    const borrowPercentageUsed =
      totalBorrowCapacity_inBaseUnits > 0
        ? (totalBorrowCapacity_inBaseUnits - borrowAvailable_inBaseUnits) / totalBorrowCapacity_inBaseUnits
        : 0;

    liquidationPoint_inBaseUnits *= borrowPercentageUsed;

    return {
      collateralValue: collateralValue_inBaseUnits,
      liquidationPoint: liquidationPoint_inBaseUnits,
      borrowCapacity: totalBorrowCapacity_inBaseUnits,
      borrowAvailable: borrowAvailable_inBaseUnits
    }
  }

  /**
   * Returns the amount of borrowed base token
   * @param cometContract
   * @param userAddress
   * @private
   */
  private static async getBorrowedInBaseUnits(cometContract: Contract, userAddress: string): Promise<number> {
    const { basePrice, baseDecimals } = await WidoCompoundSdk.getBaseTokenDetails(cometContract);
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
    const contract = await this.getCometContract()

    const results = await Promise.all([
      contract.callStatic.userNonce(userAddress),
      contract.callStatic.name(),
      contract.callStatic.version(),
    ])
      .catch(() => {
        throw new Error("Failed to fetch signature details")
      });

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

    const domain: TypedDataDomain = {
      name,
      version,
      chainId,
      verifyingContract: cometAddress
    };

    const expiry = 10e9;

    const message: AllowSignatureMessage = {
      owner,
      manager,
      isAllowed,
      nonce,
      expiry
    };

    const types = {
      Authorization: [
        { name: 'owner', type: 'address' },
        { name: 'manager', type: 'address' },
        { name: 'isAllowed', type: 'bool' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' }
      ]
    };

    const sig = await this.signer._signTypedData(domain, types, message);

    return splitSignature(sig);
  }

  /**
   * Fetch prices of both assets and converts the fees into a single USD amount
   * @param fromAsset
   * @param widoFee
   * @param toAsset
   * @param providerFee
   * @param chainId
   * @private
   */
  private async getUsdFees(
    fromAsset: Asset,
    widoFee: number,
    toAsset: Asset,
    providerFee: number,
    chainId: number
  ): Promise<{
    widoFee: number,
    providerFee: number
  }> {
    const prices = await this.priceFetcher.fetch([
      fromAsset.address,
      toAsset.address
    ], chainId)
    const fromAssetPrice = fromAsset.address.toLowerCase() in prices ? prices[fromAsset.address.toLowerCase()].usd : 0;
    const toAssetPrice = toAsset.address.toLowerCase() in prices ? prices[toAsset.address.toLowerCase()].usd : 0;
    return {
      widoFee: widoFee * fromAssetPrice,
      providerFee: providerFee * toAssetPrice
    }
  }

  /**
   * Returns user public address
   * @private
   */
  private async getUserAddress(): Promise<string> {
    return this.signer.getAddress();
  }

  /**
   * Builds an instance of the Comet contract given the comet key
   */
  private async getCometContract(): Promise<Contract> {
    await this.checkWalletInRightChain();

    if (!this.signer.provider) {
      throw new Error("Signer without provider");
    }

    const cometAddress = getCometAddress(this.comet)

    return new Contract(
      cometAddress,
      Comet_ABI,
      new providers.MulticallProvider(this.signer.provider)
    );
  }

  /**
   * Builds an instance of the Wido contract on a given chain
   * @param chainId
   * @param provider
   */
  private async getWidoContract(chainId: number, provider: LoanProvider): Promise<Contract> {
    await this.checkWalletInRightChain();
    if (!(chainId in widoCollateralSwapAddress)) {
      throw new Error(`WidoCollateralSwap not deployed on chain ${chainId}`);
    }
    const address = widoCollateralSwapAddress[chainId][provider];
    return new Contract(address, IWidoCollateralSwap_ABI, this.signer);
  }

  /**
   * Checks that the wallet is in the right chain
   * @private
   */
  private async checkWalletInRightChain(): Promise<void> {
    const cometChain = getChainId(this.comet);
    const walletChain = await this.signer.getChainId();
    if (cometChain !== walletChain) {
      throw new Error("Wallet is in another chain");
    }
  }

  /**
   * Checks the given `comet` is a supported deployment
   * @param comet
   * @private
   */
  private static validateComet(comet: string) {
    const existingDeployments = this.getDeployments()
    if (!existingDeployments.some(d => d.cometKey === comet)) {
      throw new Error("Comet not supported");
    }
  }
}