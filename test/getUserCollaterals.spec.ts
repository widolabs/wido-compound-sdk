import { it, expect } from "vitest"
import { Wido } from '../src';
import { BigNumber } from 'ethers';
import { getWallet } from './helpers';


it("should pass", async () => {
  const wido = new Wido(getWallet(), "mainnet_usdc")
  const userCollaterals = await wido.getUserCollaterals();

  expect(userCollaterals.length).toBeGreaterThanOrEqual(5);

  for (const {balance} of userCollaterals) {
    expect(balance).toEqual(BigNumber.from(0));
  }
})
