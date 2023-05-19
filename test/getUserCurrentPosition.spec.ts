import { expect, it } from "vitest"
import { Wido } from '../src';
import { approveWeth, getWallet, getWeth, WETH } from './helpers';
import { BigNumber, ethers } from 'ethers';
import { cometConstants } from '@compound-finance/compound-js/dist/nodejs/constants';


it("should have empty position", async () => {
  const wido = new Wido(getWallet(), "mainnet_usdc");

  const position = await wido.getUserCurrentPosition()

  expect(position.collateralValue).toEqual(0);
  expect(position.liquidationPoint).toEqual(0);
  expect(position.borrowCapacity).toEqual(0);
  expect(position.borrowAvailable).toEqual(0);
})

it("should have positive position after deposit", async () => {
  // Arrange
  const signer = getWallet();
  const wido = new Wido(signer, "mainnet_usdc");
  const cometAddress = cometConstants.address["mainnet_usdc"].Comet;

  // prepare collateral
  const amount = BigNumber.from(10000000000)
  await getWeth(amount, signer);
  await approveWeth(amount, cometAddress, signer);

  // deposit into Comet contract
  const contract = new ethers.Contract(
    cometAddress,
    [
      "function supply(address, uint256) external",
      "function withdraw(address, uint256) external"
    ],
    signer
  );
  await (await contract.functions.supply(WETH, amount)).wait();

  // Act
  const position = await wido.getUserCurrentPosition()

  // Assert
  expect(position.collateralValue).toBeGreaterThan(0);
  expect(position.liquidationPoint).toEqual(0);
  expect(position.borrowCapacity).toBeGreaterThan(0);
  expect(position.borrowAvailable).toBeGreaterThan(0);

  // Clean (it's a "permanent" fork)
  await (await contract.functions.withdraw(WETH, amount)).wait();
})
