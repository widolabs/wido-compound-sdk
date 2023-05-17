import { it, expect } from "vitest"
import { Wido } from '../src';
import { getWallet } from './helpers';


it("should quote a swap", async () => {
  const wido = new Wido(getWallet())
  const wbtc = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
  const comp = "0xc00e94Cb662C3520282E6f5717214004A7f26888";
  const swapQuote = await wido.getCollateralSwapRoute(
    "mainnet_usdc", wbtc, comp
  );

  expect(swapQuote.isSupported).toBeTruthy();
  expect(swapQuote.fromCollateral).toEqual(wbtc);
  expect(swapQuote.toCollateral).toEqual(comp);
})
