import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { Deployment, UserAsset, UserAssets } from '../types';
import { LoanProvider } from '../providers/loanProvider';
import { BigNumber } from 'ethers';

const MAINNET_ID = 1;
const POLYGON_ID = 137;
const ARBITRUM_ID = 42161;

const keyToId = {
  mainnet: MAINNET_ID,
  polygon: POLYGON_ID,
  arbitrum: ARBITRUM_ID,
}

export const widoCollateralSwapAddress: Record<number, Record<LoanProvider, string>> = {
  [MAINNET_ID]: {
    [LoanProvider.Equalizer]: "0x2F43AFe8E9a5Ddd90D7B16e1798879CD35D46A2F",
    [LoanProvider.Aave]: "0xaAA9f2FeE419977804eBD06F6E121f76FbcE8498",
  },
  [POLYGON_ID]: {
    [LoanProvider.Equalizer]: "0xA2e08590f6f0ed44a65361deFcE090C00e8e6e10",
    [LoanProvider.Aave]: "0x17000CdCCCFf2D0B2d8958BA40c751Fa9b4BE089",
  },
  [ARBITRUM_ID]: {
    [LoanProvider.Equalizer]: "",
    [LoanProvider.Aave]: "0x74436167012475749168f33324e84990C8013647",
  }
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
  const details = getDeploymentDetails(comet);
  if (!details) {
    throw new Error("Wrong comet key")
  }
  return details.chainId
}

/**
 * Returns the deployment details of a Comet
 * @param comet
 */
export function getDeploymentDetails(comet: string): Deployment | undefined {
  const parts = comet.split("_");
  const asset = parts.pop() as string;
  const chainKey = parts.join("_");
  // @ts-ignore
  const chainId = keyToId[chainKey];
  if (!chainId) return;
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

/**
 * Formats an `amount` of `decimals` precision into a string for the UI
 */
export function formatNumber(amount: BigNumber, decimals: number, precision = 8): number {
  const { integer, decimal } = getAmountParts(amount, decimals);
  const _decimal = BigNumber.from(decimal);
  if (_decimal.eq(BigNumber.from(0))) {
    return Number(integer);
  }
  // compose visible number
  return Number(integer + "." + decimal.substring(0, precision))
}

/**
 * Returns the given amount in split in two parts: `integer` and `decimal`
 *  so it can be formatted and shown as necessary
 */
export function getAmountParts(amount: BigNumber, decimals: number): {
  integer: string
  decimal: string
} {
  const _unit = BigNumber.from("1" + "0".repeat(decimals))
  // separate parts
  const integerPart = amount.div(_unit);
  const decimalPart = amount.sub(integerPart.mul(_unit));
  let decimalPartString = decimalPart.toString()
  // check if extra zeros required on decimal part
  if (decimalPartString.length < decimals) {
    const leftZeros = decimals - decimalPartString.length;
    decimalPartString = "0".repeat(leftZeros) + decimalPartString
  }
  return {
    integer: integerPart.toString(),
    decimal: decimalPartString
  }
}