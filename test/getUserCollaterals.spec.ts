import { it, expect } from "vitest"
import { Wido } from '../src';
import { BigNumber } from 'ethers';
import { getWallet } from './helpers';


it("should pass", async () => {
  const wido = new Wido(getWallet())
  const userCollaterals = await wido.getUserCollaterals(
    "0xCb005d849F384b64838aAD885d5Ff150fc8B7904",
    "mainnet_usdc"
  );

  expect(userCollaterals.length).toBeGreaterThanOrEqual(5);

  for (const asset of userCollaterals) {
    expect(asset).toEqual(BigNumber.from(0));
  }
})
