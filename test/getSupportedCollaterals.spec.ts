import { it, expect } from "vitest"
import { Wido } from '../src';
import { getWallet } from './helpers';


it("should pass", async () => {
  const wido = new Wido(getWallet(), "mainnet_usdc")
  const supportedAssets = await wido.getSupportedCollaterals();

  expect(supportedAssets.length).toBeGreaterThanOrEqual(5);

  const expectedAssets = [
    '0xc00e94Cb662C3520282E6f5717214004A7f26888',
    '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    '0x514910771AF9Ca656af840dff83E8264EcF986CA'
  ];

  for (const asset of expectedAssets) {
    expect(supportedAssets).toContain(asset);
  }
})
