import { BigNumber } from 'ethers';
import { LoanProvider } from '../providers/loanProvider';

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
  provider: LoanProvider,
  fromCollateral: string
  fromCollateralAmount: string
  toCollateral: string
  toCollateralAmount: string
  toCollateralMinAmount: string
  price?: string
  data?: string
  fees: Fees
}

export interface Fees {
  providerFee: number
  widoFee: number
  widoFeeUsd: number
  providerFeeUsd: number
  totalUsd: number
}

export interface Position {
  collateralValue: number
  liquidationPoint: number
  borrowCapacity: number
  borrowAvailable: number
}

export interface Deployment {
  chainId: number
  asset: string
  cometKey: string
  address: string
}

export type Deployments = Deployment[]
