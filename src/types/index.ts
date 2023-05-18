import { BigNumber } from 'ethers';

export interface Collateral {
  address: string,
  balance: BigNumber
}

export type Collaterals = Collateral[]

export interface CollateralSwapRoute {
  isSupported: boolean
  fromCollateral: string
  fromCollateralAmount: string
  toCollateral: string
  toCollateralAmount: string
  tokenManager: string
  to?: string
  data?: string
}

export interface Position {
  collateralValue: number
  liquidationPoint: number
  borrowCapacity: number
  borrowAvailable: number
}