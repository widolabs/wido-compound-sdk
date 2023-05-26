import { BigNumber, Contract } from 'ethers';
import { Equalizer } from './equalizer';
import { Aave } from './aave';
import { LoanProviderBase } from './loanProvider';

export class LoanProviders {
  private readonly providers: LoanProviderBase[];

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
  public async getBest(): Promise<LoanProviderBase | undefined> {
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

  private firstValidProvider(): LoanProviderBase | undefined {
    return this.providers.find(p => p.canBeUsed())
  }
}