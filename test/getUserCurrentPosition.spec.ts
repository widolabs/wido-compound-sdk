import { it } from "vitest"
import { Wido } from '../src';
import { getWallet } from './helpers';


it("should pass", async () => {
  const wido = new Wido(getWallet(137), "polygon_usdc");

  const position = await wido.getUserCurrentPosition()

  console.log(position)
})
