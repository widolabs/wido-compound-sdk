import { it, expect } from "vitest"
import { Wido } from '../src';


it("should return already known dpeloyments", async () => {
  const deployments = await Wido.getDeployments()

  expect(deployments.length).toBeGreaterThanOrEqual(8);

  const existingDeployments = [
    'mainnet_usdc',
    'mainnet_weth',
    'polygon_usdc',
    'goerli_usdc',
    'goerli_weth',
    'mumbai_usdc',
    'goerli_optimism_usdc',
    'fuji_usdc'
  ]

  for (const deployment of deployments) {
    expect(existingDeployments).toContain(deployment)
  }
})
