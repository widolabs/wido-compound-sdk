import { BigNumber, Contract } from 'ethers';
import { LoanProvider, Providers } from './loanProvider';

export class Equalizer extends LoanProvider {
  public id(): Providers {
    return Providers.Equalizer;
  }

  public async canBeUsed(): Promise<boolean> {
    return Promise.resolve(false);
  }

  public async computeFee(): Promise<BigNumber> {
    const contract = await this.buildContract();
    return await contract.callStatic.flashFee(this.asset, this.amount);
  }

  private async buildContract(): Promise<Contract> {
    const poolAddress = await this.widoContract.callStatic.equalizerProvider();
    return new Contract(
      poolAddress,
      [
        "function flashFee(address,uint256) returns(uint256)"
      ],
      this.widoContract.provider
    );
  }
}