import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { Contract, providers, Wallet } from 'ethers';
import { Comet_ABI } from '../types/comet';
import { AssetInfo } from '@compound-finance/compound-js/dist/nodejs/types';
import { Collateral, Collaterals } from '../types';
import { WidoCollateralSwap_ABI } from '../types/widoCollateralSwap';

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

export function getCometAddress(cometKey: string): string {
  // @ts-ignore
  return cometConstants.address[cometKey].Comet;
}

export function getChainId(comet: string): number {
  const chainKey = comet.split("_")[0]
  // @ts-ignore
  return keyToId[chainKey];
}

export function getCometContract(comet: string, provider: providers.Provider): Contract {
  const cometAddress = getCometAddress(comet)
  return new Contract(cometAddress, Comet_ABI, provider);
}

export function getWidoContract(chainId: number, signer: Wallet): Contract {
  if (!(chainId in widoCollateralSwapAddress)) {
    throw new Error(`WidoCollateralSwap not deployed on chain ${chainId}`);
  }
  const address = widoCollateralSwapAddress[chainId];
  return new Contract(address, WidoCollateralSwap_ABI, signer);
}

export async function getAssetInfoByAddress(contract: Contract, address: string): Promise<AssetInfo> {
  return await contract.callStatic.getAssetInfoByAddress(address);
}

export function pickAsset(collaterals: Collaterals, address: string): Collateral {
  for (const collateral of collaterals) {
    if (collateral.address === address) {
      return collateral
    }
  }
  throw new Error(`Collateral ${address} not supported`);
}