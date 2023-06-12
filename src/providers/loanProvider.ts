import { BigNumber } from 'ethers';
import { Provider } from '@ethersproject/providers';

/**
 * The order here is important, needs to be the same the enum in WidoCollateralSwap contract
 * <link>
 */
export enum LoanProvider {
  Equalizer = 0,
  Aave = 1,
}

export abstract class LoanProviderBase {
  protected readonly widoContractAddress: string;
  protected readonly asset: string;
  protected readonly amount: BigNumber;
  protected readonly rpcProvider: Provider;
  private computedFee: BigNumber | null;

  constructor(
    widoContractAddress: string,
    asset: string,
    amount: BigNumber,
    rpcProvider: Provider,
  ) {
    this.widoContractAddress = widoContractAddress;
    this.asset = asset;
    this.amount = amount;
    this.rpcProvider = rpcProvider;
    this.computedFee = null;
  }

  /**
   * Returns the provider type
   */
  abstract id(): LoanProvider;

  /**
   * Computes the fee of this provider for the given asset/amount
   */
  abstract computeFee(): Promise<BigNumber>;

  /**
   * Checks whether the provider is eligible for the given asset/amount
   */
  abstract canBeUsed(): Promise<boolean>;

  /**
   * Returns the fee of the provider
   */
  public async fee(): Promise<BigNumber> {
    if (this.computedFee) {
      return this.computedFee;
    }
    this.computedFee = await this.computeFee();
    return this.computedFee;
  }
}
