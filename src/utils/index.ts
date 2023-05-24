import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { Deployment, UserAsset, UserAssets } from '../types';

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
  [MAINNET_ID]: "0x5E5713a0d915701F464DEbb66015adD62B2e6AE9",
  [POLYGON_ID]: "0x5E5713a0d915701F464DEbb66015adD62B2e6AE9",
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
  return getDeploymentDetails(comet).chainId
}

/**
 * Returns the deployment details of a Comet
 * @param comet
 */
export function getDeploymentDetails(comet: string): Deployment {
  const parts = comet.split("_");
  const asset = parts.pop() as string;
  const chainKey = parts.join("_");
  // @ts-ignore
  const chainId = keyToId[chainKey];
  return {
    chainId: chainId,
    asset: asset,
    cometKey: comet
  }
}

/**
 * Seek and return a collateral from the list, by address
 * @param collaterals
 * @param asset
 */
export function pickAsset(collaterals: UserAssets, asset: string): UserAsset {
  for (const collateral of collaterals) {
    if (collateral.name === asset) {
      return collateral
    }
  }
  throw new Error(`Collateral ${asset} not supported`);
}