import { BigNumber, Contract } from 'ethers';

/**
 * The order here is important, needs to be the same the enum in WidoCollateralSwap contract
 * <link>
 */
export enum LoanProvider {
  Equalizer = 0,
  Aave = 1,
}

export abstract class LoanProviderBase {
  protected readonly widoContract: Contract;
  protected readonly asset: string;
  protected readonly amount: BigNumber;
  private computedFee: BigNumber | null;

  constructor(
    widoContract: Contract,
    asset: string,
    amount: BigNumber
  ) {
    this.widoContract = widoContract;
    this.asset = asset;
    this.amount = amount;
    this.computedFee = null;
  }

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
