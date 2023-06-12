import { BigNumber, Contract } from 'ethers';
import { LoanProviderBase, LoanProvider } from './loanProvider';

export class Aave extends LoanProviderBase {
  public id(): LoanProvider {
    return LoanProvider.Aave;
  }

  public async canBeUsed(): Promise<boolean> {
    const contract = await this.buildContract();
    const acceptedAssets = await contract.callStatic.getReservesList();

    if (!acceptedAssets.includes(this.asset)) {
      return false;
    }

    return true;

    /*
    // Extra check to make sure there's enough liquidity
    // for now skipping, waiting response
    const configuration = await contract.callStatic.getConfiguration(this.asset);
    const bitsConfiguration = BigInt(configuration.toString()).toString(2);

    const borrowBits = bitsConfiguration.slice(80, 116);
    const supplyBits = bitsConfiguration.slice(116, 152);
    console.log(parseInt(borrowBits, 2));
    console.log(parseInt(supplyBits, 2));
    */
  }

  public async computeFee(): Promise<BigNumber> {
    const contract = await this.buildContract();
    const feeBps = await contract.callStatic.FLASHLOAN_PREMIUM_TOTAL();
    return this.amount.mul(feeBps).div(10000);
  }

  private async buildContract(): Promise<Contract> {
    const widoContract = new Contract(
      this.widoContractAddress, [
        "function POOL() returns(address)"
      ],
      this.rpcProvider
    );
    const poolAddress = await widoContract.callStatic.POOL();
    return new Contract(
      poolAddress,
      [
        "function FLASHLOAN_PREMIUM_TOTAL() returns(uint128)",
        "function getReservesList() external view returns (address[])",
        "function getConfiguration(address asset) external view returns (uint256)"
      ],
      this.rpcProvider
    );
  }

}