import { BigNumber, Contract } from 'ethers';
import { Equalizer } from './equalizer';
import { Aave } from './aave';

export enum Providers {
  Equalizer = 0,
  Aave = 1,
}

export abstract class LoanProvider {
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

export class LoanProviders {
  private readonly providers: LoanProvider[];

  constructor(
    widoContract: Contract,
    asset: string,
    amount: BigNumber
  ) {
    this.providers = [
      new Equalizer(widoContract, asset, amount),
      new Aave(widoContract, asset, amount),
    ]
  }

  /**
   * Search all potential providers to return the best one
   * Can return undefined in the case where no provider can be used for this asset/token
   */
  public async getBest(): Promise<LoanProvider | undefined> {
    const firstValidProvider = this.firstValidProvider();
    // if no valid provider found, none will do
    if (!firstValidProvider) {
      return;
    }
    // initialize search values
    let bestFee = await firstValidProvider.fee();
    let bestProvider = firstValidProvider;
    // iterate all providers
    for (const provider of this.providers) {
      if (!await provider.canBeUsed()) {
        // skip useless ones
        continue;
      }
      // check provider fee
      const fee = await provider.fee();
      // compare against the best
      if (fee < bestFee) {
        bestProvider = provider
        bestFee = fee;
      }
    }
    return bestProvider;
  }

  private firstValidProvider(): LoanProvider | undefined {
    return this.providers.find(p => p.canBeUsed())
  }
}