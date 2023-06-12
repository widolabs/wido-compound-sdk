import { BigNumber } from 'ethers';
import { Provider } from '@ethersproject/providers';
import { Equalizer } from './equalizer';
import { Aave } from './aave';
import { LoanProvider, LoanProviderBase } from './loanProvider';
import { widoCollateralSwapAddress } from '../utils';

export class LoanProviders {
  private readonly providers: LoanProviderBase[];

  constructor(
    chainId: number,
    asset: string,
    amount: BigNumber,
    rpcProvider: Provider
  ) {
    this.providers = [];

    if (widoCollateralSwapAddress[chainId][LoanProvider.Equalizer]) {
      this.providers.push(
        new Equalizer(widoCollateralSwapAddress[chainId][LoanProvider.Equalizer], asset, amount, rpcProvider)
      );
    }

    if (widoCollateralSwapAddress[chainId][LoanProvider.Aave]) {
      this.providers.push(
        new Aave(widoCollateralSwapAddress[chainId][LoanProvider.Aave], asset, amount, rpcProvider)
      );
    }
  }

  /**
   * Search all potential providers to return the best one
   * Can return undefined in the case where no provider can be used for this asset/token
   */
  public async getBest(): Promise<LoanProviderBase | undefined> {
    const firstValidProvider = await this.firstValidProvider();
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

  private async firstValidProvider(): Promise<LoanProviderBase | undefined> {
    for (const provider of this.providers) {
      const valid = await provider.canBeUsed();
      if (valid) {
        return provider;
      }
    }
    return;
  }
}