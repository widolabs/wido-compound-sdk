import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { Deployment, UserAsset, UserAssets } from '../types';
import { LoanProvider } from '../providers/loanProvider';
import { BigNumber } from 'ethers';

export const MAINNET_ID = 1;
export const POLYGON_ID = 137;
export const ARBITRUM_ID = 42161;

const keyToId = {
  mainnet: MAINNET_ID,
  polygon: POLYGON_ID,
  arbitrum: ARBITRUM_ID,
}

// TODO: add LoanProvider addresses
export const widoCollateralSwapAddress: Record<number, Record<LoanProvider, string>> = {
  [MAINNET_ID]: {
    [LoanProvider.Equalizer]: "",
    [LoanProvider.Aave]: "",
  },
  [POLYGON_ID]: {
    [LoanProvider.Equalizer]: "",
    [LoanProvider.Aave]: "0xCd5Cc56811676296A75f9582C2eA037D564a72CF",
  },
  [ARBITRUM_ID]: {
    [LoanProvider.Equalizer]: "",
    [LoanProvider.Aave]: "",
  }
}

export const widoTokenManager: Record<number, string> = {
  [MAINNET_ID]: "0xF2F02200aEd0028fbB9F183420D3fE6dFd2d3EcD",
  [POLYGON_ID]: "0x4eedfb447a7a0bec51145590c63c1b751e8c745c",
  [ARBITRUM_ID]: "0x179b7f6178862b33429f515b532d6cd64f61eaeb",
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
    cometKey: comet,
    address: getCometAddress(comet)
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