import { ethers } from 'ethers';
import { Chain, ChainId, supportedChains } from '../types';
import { providers } from '@0xsequence/multicall';

export const getProvider = (chain: ChainId): providers.MulticallProvider => {
  if (!supportedChains.includes(chain)) {
    throw new Error("Unsupported chain");
  }

  return new providers.MulticallProvider(new ethers.providers.JsonRpcProvider(rpcEndpoints[chain]));
}

const rpcEndpoints: Record<ChainId, string> = {
  [Chain.MAINNET]: "https://eth.llamarpc.com",
  [Chain.POLYGON]: "https://polygon.llamarpc.com",
}