import * as wido from "../src"
import { it, expect, describe } from "vitest"
import { Deployments, WidoCompoundSdk } from '../src';
import { approveERC20, approveWeth, getCometContract, getERC20, getWallet, getWeth, USDC, WBTC, WETH } from './helpers';
import { BigNumber } from 'ethers';
import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { useLocalApi } from 'wido';

useLocalApi();

describe("CollateralSwap SDK", () => {

  it("should have named exports", () => {
    expect(Object.keys(wido)).toMatchInlineSnapshot(`
    [
      "WidoCompoundSdk",
    ]
  `)
  })

  it("should return already known deployments", async () => {
    const deployments = WidoCompoundSdk.getDeployments()

    expect(deployments.length).toBeGreaterThanOrEqual(4);

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

  it("should return user collaterals", async () => {
    const comet = "mainnet_usdc";
    const wido = new WidoCompoundSdk(getWallet(comet), comet)
    const userCollaterals = await wido.getUserCollaterals();

    expect(userCollaterals.length).toBeGreaterThanOrEqual(5);

    for (const { balance } of userCollaterals) {
      expect(balance).toEqual(BigNumber.from(0));
    }
  })

  it("should quote a swap", async () => {
    const comet = "mainnet_usdc";
    const wido = new WidoCompoundSdk(getWallet(comet), comet);
    const weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const comp = "0xc00e94Cb662C3520282E6f5717214004A7f26888";
    const swapQuote = await wido.getCollateralSwapRoute("WETH", "COMP", BigNumber.from(0));

    expect(swapQuote.isSupported).toBeTruthy();
    expect(swapQuote.fromCollateral).toEqual(weth);
    expect(swapQuote.toCollateral).toEqual(comp);
  })

  it("should have an initial empty position", async () => {
    const comet = "mainnet_usdc";
    const wido = new WidoCompoundSdk(getWallet(comet), comet);

    const position = await wido.getUserCurrentPosition()

    expect(position.collateralValue).toEqual(0);
    expect(position.liquidationPoint).toEqual(0);
    expect(position.borrowCapacity).toEqual(0);
    expect(position.borrowAvailable).toEqual(0);
  })

  it("should have positive position after deposit", async () => {
    // Arrange
    const comet = "mainnet_usdc";
    const signer = getWallet(comet);
    const wido = new WidoCompoundSdk(signer, comet);
    const cometAddress = cometConstants.address[comet].Comet;

    // prepare collateral
    const amount = BigNumber.from(10000000000)
    await getWeth(amount, signer);
    await approveWeth(amount, cometAddress, signer);

    // deposit into Comet contract
    const contract = getCometContract(cometAddress, signer);
    await (await contract.functions.supply(WETH, amount)).wait();

    // Act
    const position = await wido.getUserCurrentPosition()

    // Assert
    expect(position.collateralValue).toBeGreaterThan(0);
    expect(position.liquidationPoint).toEqual(0);
    expect(position.borrowCapacity).toBeGreaterThan(0);
    expect(position.borrowAvailable).toBeGreaterThan(0);

    // Clean (it's a "permanent" fork)
    await (await contract.functions.withdraw(WETH, amount)).wait();
  })

  it("should give a predicted position", async () => {
    const comet = "mainnet_usdc";
    const signer = getWallet(comet);
    const wido = new WidoCompoundSdk(signer, comet);
    const cometAddress = cometConstants.address[comet].Comet;

    // prepare collateral
    const amount = BigNumber.from("1000000000000000000")
    await getWeth(amount, signer);
    await approveWeth(amount, cometAddress, signer);

    // deposit into Comet contract
    const contract = getCometContract(cometAddress, signer);
    await (await contract.functions.supply(WETH, amount)).wait();

    // get swap quote
    const swapQuote = await wido.getCollateralSwapRoute("WETH", "WBTC", amount);
    expect(swapQuote.fromCollateralAmount).toEqual(amount.toString());

    // Act
    const currentPosition = await wido.getUserCurrentPosition()
    const predictedPosition = await wido.getUserPredictedPosition(swapQuote)

    // Assert (we expect lose of value due to swap slippage)
    expect(predictedPosition.collateralValue).toBeLessThan(currentPosition.collateralValue);
    expect(predictedPosition.liquidationPoint).toEqual(currentPosition.liquidationPoint);
    expect(predictedPosition.borrowCapacity).toBeLessThan(currentPosition.borrowCapacity);
    expect(predictedPosition.borrowAvailable).toBeLessThan(currentPosition.borrowAvailable);

    // Clean (it's a "permanent" fork)
    await (await contract.functions.withdraw(WETH, amount)).wait();
  })

  it("should execute a collateral swap", async () => {
    const comet = "mainnet_usdc";
    const signer = getWallet(comet);
    const wido = new WidoCompoundSdk(signer, comet);
    const cometAddress = cometConstants.address[comet].Comet;
    const loanAmount = BigNumber.from(500 * 10 ** 6);

    // prepare collateral
    const wbtcAmount = await getERC20(WBTC, signer);

    // deposit into Comet contract
    await approveERC20(WBTC, wbtcAmount, cometAddress, signer);
    const contract = getCometContract(cometAddress, signer);
    await (await contract.functions.supply(WBTC, wbtcAmount)).wait();

    await (await contract.functions.withdraw(USDC, loanAmount)).wait();

    // get swap quote
    const swapQuote = await wido.getCollateralSwapRoute("WBTC", "WETH", wbtcAmount);
    expect(swapQuote.fromCollateralAmount).toEqual(wbtcAmount.toString());

    const predictedPosition = await wido.getUserPredictedPosition(swapQuote)

    // Act
    await wido.swapCollateral(swapQuote)
    const currentPosition = await wido.getUserCurrentPosition()

    // Assert
    const wethDeposited = await contract.callStatic.collateralBalanceOf(signer.address, WETH);
    expect(BigInt(wethDeposited)).toBeGreaterThanOrEqual(BigInt(swapQuote.toCollateralMinAmount));
    expect(currentPosition.collateralValue).toBeGreaterThanOrEqual(predictedPosition.collateralValue);

    // Clean (it's a "permanent" fork)
    await approveERC20(USDC, loanAmount, cometAddress, signer);
    await (await contract.functions.supply(USDC, loanAmount)).wait();
    await (await contract.functions.withdraw(WETH, swapQuote.toCollateralMinAmount)).wait();
  }, 50000)

})

