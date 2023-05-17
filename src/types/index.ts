import { BigNumber } from 'ethers';

export interface Collateral {
  asset: string,
  balance: BigNumber
}

export type Collaterals = Collateral[]

export interface CollateralSwapRouteResponse {
  isSupported: boolean
  toCollateralAmount: string
}