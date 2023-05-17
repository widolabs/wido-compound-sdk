import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { Contract, ethers } from 'ethers';
import { Comet_ABI } from '../types/comet';
import { AssetInfo } from '@compound-finance/compound-js/dist/nodejs/types';
import { Collateral, Collaterals } from '../types';

export function getCometAddress(cometKey: string): string {
  // @ts-ignore
  return cometConstants.address[cometKey].Comet;
}

export function getChainId(comet: string): number {
  const chainKey = comet.split("_")[0]
  const provider = new ethers.providers.BaseProvider(chainKey);
  return provider._network.chainId;
}

export function getCometContract(comet: string, provider: ethers.providers.Provider): Contract {
  const cometAddress = getCometAddress(comet)
  return new Contract(cometAddress, Comet_ABI, provider);
}

export async function getAssetInfoByAddress(contract: Contract, address: string): Promise<AssetInfo> {
  return await contract.functions.getAssetInfoByAddress(address);
}

export function pickAsset(collaterals: Collaterals, address: string): Collateral {
  for (const collateral of collaterals) {
    if (collateral.asset === address) {
      return collateral
    }
  }
  throw new Error(`Collateral ${address} not supported`);
}