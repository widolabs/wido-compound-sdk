import { expect, it } from "vitest"
import { Wido } from '../src';
import { getWallet } from './helpers';


it("should have empty position", async () => {
  const wido = new Wido(getWallet(), "mainnet_usdc");

  const position = await wido.getUserCurrentPosition()

  expect(position.collateralValue).toEqual(0);
  expect(position.liquidationPoint).toEqual(0);
  expect(position.borrowCapacity).toEqual(0);
  expect(position.borrowAvailable).toEqual(0);
})
