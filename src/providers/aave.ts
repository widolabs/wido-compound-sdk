import { BigNumber, Contract } from 'ethers';
import { LoanProvider, Providers } from './loanProvider';

export class Aave extends LoanProvider {
  public id(): Providers {
    return Providers.Aave;
  }

  public async canBeUsed(): Promise<boolean> {
    return Promise.resolve(false);
  }

  public async computeFee(): Promise<BigNumber> {
    const contract = await this.buildContract();
    const feeBps = await contract.callStatic.FLASHLOAN_PREMIUM_TOTAL();
    return this.amount.mul(feeBps).div(10000);
  }

  private async buildContract(): Promise<Contract> {
    const poolAddress = await super.widoContract.callStatic.POOL();
    return new Contract(
      poolAddress,
      [
        "function FLASHLOAN_PREMIUM_TOTAL() returns(uint128)"
      ],
      this.widoContract.provider
    );
  }

}