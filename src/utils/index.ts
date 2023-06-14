import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { Deployment, UserAsset, UserAssets } from '../types';
import { LoanProvider } from '../providers/loanProvider';
import { BigNumber } from 'ethers';

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

export const widoCollateralSwapAddress: Record<number, Record<LoanProvider, string>> = {
  [MAINNET_ID]: {
    [LoanProvider.Equalizer]: "0x30426d33a78afdb8788597d5bfabdadc3be95698",
    [LoanProvider.Aave]: "0xae2563b4315469bf6bdd41a6ea26157de57ed94e",
  },
  [POLYGON_ID]: {
    [LoanProvider.Equalizer]: "0x5D2aa1cF0E760911D41DaA5e916B40ffd6146cF5",
    [LoanProvider.Aave]: "0xfC16794C42229839C4e2460D803501517D777133",
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

/**
 * Formats an `amount` of `decimals` precision into a string for the UI
 */
export function formatNumber(amount: BigNumber, decimals: number, precision = 4): string {
  const { integer, decimal } = getAmountParts(amount, decimals);
  const _decimal = BigNumber.from(decimal);
  if (_decimal.eq(BigNumber.from(0))) {
    return integer;
  }
  // compose visible number
  return integer + "." + decimal.substring(0, precision)
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