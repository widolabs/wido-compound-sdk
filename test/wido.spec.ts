import * as wido from "../src/wido"
import { it, expect } from "vitest"

it("should have named exports", () => {
  expect(Object.keys(wido)).toMatchInlineSnapshot(`
    [
      "getSupportedCollaterals",
      "Chain",
      "supportedChains",
    ]
  `)
})
