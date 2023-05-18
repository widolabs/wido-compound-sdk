import { it } from "vitest"
import { Wido } from '../src';
import { getWallet } from './helpers';


it("should pass", async () => {
  const wido = new Wido(getWallet(137));

  const position = await wido.getUserCurrentPosition("polygon_usdc")

  console.log(position)
})
