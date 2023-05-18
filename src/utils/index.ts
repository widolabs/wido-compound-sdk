import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { Contract, providers, Wallet } from 'ethers';
import { WidoCollateralSwap_ABI } from '../types/widoCollateralSwap';
import { Comet_ABI } from '../types/comet';
import { Collateral, Collaterals } from '../types';

const MAINNET_ID = 1;
const POLYGON_ID = 137;

const keyToId = {
  mainnet: MAINNET_ID,
  polygon: POLYGON_ID
}

const widoCollateralSwapAddress: Record<number, string> = {
  [MAINNET_ID]: "",
  [POLYGON_ID]: "",
}

/**
 * Get contract address from the comet key
 * @param cometKey
 */
export function getCometAddress(cometKey: string): string {
  // @ts-ignore
  return cometConstants.address[cometKey].Comet;
}

/**
 * Convert comet key to chain ID
 * @param comet
 */
export function getChainId(comet: string): number {
  const chainKey = comet.split("_")[0]
  // @ts-ignore
  return keyToId[chainKey];
}

/**
 * Builds an instance of the Comet contract given the comet key
 * @param comet
 * @param provider
 */
export function getCometContract(comet: string, provider: providers.Provider): Contract {
  const cometAddress = getCometAddress(comet)
  return new Contract(cometAddress, Comet_ABI, provider);
}

/**
 * Builds an instance of the Wido contract on a given chain
 * @param chainId
 * @param signer
 */
export function getWidoContract(chainId: number, signer: Wallet): Contract {
  if (!(chainId in widoCollateralSwapAddress)) {
    throw new Error(`WidoCollateralSwap not deployed on chain ${chainId}`);
  }
  const address = widoCollateralSwapAddress[chainId];
  return new Contract(address, WidoCollateralSwap_ABI, signer);
}

/**
 * Seek and return a collateral from the list, by address
 * @param collaterals
 * @param address
 */
export function pickAsset(collaterals: Collaterals, address: string): Collateral {
  for (const collateral of collaterals) {
    if (collateral.address === address) {
      return collateral
    }
  }
  throw new Error(`Collateral ${address} not supported`);
}