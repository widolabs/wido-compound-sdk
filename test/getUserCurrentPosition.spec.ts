import { it } from "vitest"
import { Wido } from '../src';
import { getWallet } from './helpers';


it("should pass", async () => {
  const wido = new Wido(getWallet());

  const position = await wido.getUserCurrentPosition("polygon_usdc")

  console.log(position)
})
