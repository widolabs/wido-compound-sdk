import { BigNumber, Contract } from 'ethers';
import { LoanProviderBase, LoanProvider } from './loanProvider';

export class Equalizer extends LoanProviderBase {
  public id(): LoanProvider {
    return LoanProvider.Equalizer;
  }

  public async canBeUsed(): Promise<boolean> {
    const contract = await this.buildContract();
    const maxAmount = await contract.callStatic.maxFlashLoan(this.asset);

    // if maxAmount is zero, asset is not supported
    if (BigNumber.from(0).eq(maxAmount)) {
      return false;
    }

    return this.amount.lt(maxAmount);
  }

  public async computeFee(): Promise<BigNumber> {
    const contract = await this.buildContract();
    return await contract.callStatic.flashFee(this.asset, this.amount);
  }

  private async buildContract(): Promise<Contract> {
    const widoContract = new Contract(
      this.widoContractAddress, [
        "function loanProvider() returns(address)"
      ],
      this.rpcProvider
    );
    const poolAddress = await widoContract.callStatic.loanProvider();
    return new Contract(
      poolAddress,
      [
        "function flashFee(address,uint256) returns(uint256)",
        "function maxFlashLoan(address) returns(uint256)"
      ],
      this.rpcProvider
    );
  }
}