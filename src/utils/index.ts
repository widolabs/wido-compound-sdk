import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { Contract, ethers } from 'ethers';
import { Comet_ABI } from '../types/comet';

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
  return new ethers.Contract(cometAddress, Comet_ABI, provider);
}