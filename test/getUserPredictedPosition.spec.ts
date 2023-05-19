import { expect, it } from "vitest"
import { Wido } from '../src';
import { approveWeth, getCometContract, getWallet, getWeth, WBTC, WETH } from './helpers';
import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';
import { BigNumber } from 'ethers';


it("should give a predicted position", async () => {
  const signer = getWallet();
  const wido = new Wido(signer, "mainnet_usdc");
  const cometAddress = cometConstants.address["mainnet_usdc"].Comet;

  // prepare collateral
  const amount = BigNumber.from("1000000000000000000")
  await getWeth(amount, signer);
  await approveWeth(amount, cometAddress, signer);

  // deposit into Comet contract
  const contract = getCometContract(cometAddress, signer);
  await (await contract.functions.supply(WETH, amount)).wait();

  // get swap quote
  const swapQuote = await wido.getCollateralSwapRoute(WETH, WBTC);
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
