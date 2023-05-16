import * as wido from "../src"
import { it, expect } from "vitest"

it("should have named exports", () => {
  expect(Object.keys(wido)).toMatchInlineSnapshot(`
    [
      "Wido",
    ]
  `)
})
