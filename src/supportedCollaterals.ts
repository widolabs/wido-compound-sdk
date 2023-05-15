import { ethers } from 'ethers';
import { Comet_ABI } from './types/comet';
import { getProvider } from './utils/getProvider';
import { ChainId } from './types';

/**
 * Returns a list of the collaterals supported by the Comet contract
 */
export async function getSupportedCollaterals(cometAddress: string, chainId: ChainId): Promise<string[]> {
  const provider = getProvider(chainId);
  const contract = new ethers.Contract(cometAddress, Comet_ABI, provider);

  const numAssets = (await contract.functions.numAssets())[0];

  const calls = [];

  for (let i = 0; i < numAssets; i++) {
    calls.push(contract.functions.getAssetInfo(i));
  }

  return await Promise.all(calls)
    .then(assets => {
      return assets.map(asset => asset[0].asset)
    })
}
