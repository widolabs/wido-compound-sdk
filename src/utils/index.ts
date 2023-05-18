import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { Collateral, Collaterals } from '../types';

const MAINNET_ID = 1;
const GOERLI_ID = 5;

const POLYGON_ID = 137;
const MUMBAI_ID = 80001;

const FUJI_ID = 43113;

const GOERLI_OPTIMISM_ID = 420;

const keyToId = {
  mainnet: MAINNET_ID,
  goerli: GOERLI_ID,
  polygon: POLYGON_ID,
  mumbai: MUMBAI_ID,
  goerli_optimism: GOERLI_OPTIMISM_ID,
  fuji: FUJI_ID,
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
  const array = comet.split("_");
  array.pop();
  const chainKey = array.join("_");
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