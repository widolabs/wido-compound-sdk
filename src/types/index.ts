import { BigNumber } from 'ethers';

export interface Asset {
  name: string,
  address: string,
  decimals: number,
}

export interface UserAsset extends Asset {
  balance: BigNumber
}

export type Assets = Asset[]
export type UserAssets = UserAsset[]

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