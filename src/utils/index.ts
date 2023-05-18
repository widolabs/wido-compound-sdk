import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { Collateral, Collaterals } from '../types';

const MAINNET_ID = 1;
const POLYGON_ID = 137;

const keyToId = {
  mainnet: MAINNET_ID,
  polygon: POLYGON_ID
}

export const widoCollateralSwapAddress: Record<number, string> = {
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