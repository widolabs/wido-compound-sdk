import { it } from "vitest"
import { Wido } from '../src';
import { getWallet } from './helpers';


it("should pass", async () => {
  const wido = new Wido(getWallet(137));

  const wmatic = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  const wbtc = "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6";
  const swapQuote = await wido.getCollateralSwapRoute(
    "polygon_usdc", wmatic, wbtc
  );

  const position = await wido.getUserPredictedPosition("polygon_usdc", swapQuote)

  console.log(position)
})
