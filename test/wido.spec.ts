import * as wido from "../src"
import { it, expect, describe } from "vitest"
import { Deployments, WidoCompoundSdk } from '../src';
import { approveERC20, approveWeth, getCometContract, getERC20, getWallet, getWeth, USDC, WBTC, WETH } from './helpers';
import { BigNumber } from 'ethers';
import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { useLocalApi } from 'wido';

useLocalApi();

describe("CollateralSwap SDK", () => {

  it("should return already known deployments", async () => {
    const deployments = WidoCompoundSdk.getDeployments()

    console.log(deployments)
    expect(deployments.length).toBeGreaterThanOrEqual(8);

    const existingDeployments: Deployments = [
      {
        chainId: 1,
        asset: "usdc",
        cometKey: "mainnet_usdc",
        address: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
      },
      {
        chainId: 1,
        asset: "weth",
        cometKey: "mainnet_weth",
        address: '0xA17581A9E3356d9A858b789D68B4d866e593aE94',
      },
      {
        chainId: 137,
        asset: "usdc",
        cometKey: "polygon_usdc",
        address: '0xF25212E676D1F7F89Cd72fFEe66158f541246445',
      },
      {
        chainId: 42161,
        asset: 'usdc',
        cometKey: 'arbitrum_usdc',
        address: '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA'
      }
    ]

    for (const deployment of deployments) {
      const found = existingDeployments.some(d => {
        return (
          d.asset === deployment.asset &&
          d.chainId === deployment.chainId &&
          d.cometKey === deployment.cometKey
        )
      })
      expect(found).toBeTruthy();
    }
  })

  it("should return known supported collaterals", async () => {
    const comet = "mainnet_usdc";
    const wido = new WidoCompoundSdk(getWallet(comet), comet)
    const supportedAssets = await wido.getSupportedCollaterals();

    expect(supportedAssets.length).toBeGreaterThanOrEqual(5);

    const expectedAssets = [
      {
        name: "COMP",
        address: '0xc00e94Cb662C3520282E6f5717214004A7f26888'
      },
      {
        name: "WBTC",
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
      },
      {
        name: "WETH",
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
      },
      {
        name: "UNI",
        address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
      },
      {
        name: "LINK",
        address: '0x514910771AF9Ca656af840dff83E8264EcF986CA'
      },
    ];

    for (const asset of expectedAssets) {
      const found = supportedAssets.some(a => a.name == asset.name && a.address == asset.address)
      expect(found).toBeTruthy();
    }
  })

})
