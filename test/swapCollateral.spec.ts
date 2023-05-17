import { it, expect } from "vitest"
import { Wido } from '../src';
import { getWallet } from './helpers';


it("should pass", async () => {

  const wido = new Wido(getWallet());

  //await wido.swapCollateral("mainnet_usdc")
})
