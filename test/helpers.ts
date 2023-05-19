import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import { getWidoSpender, quote, useLocalApi } from 'wido';

export const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
export const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
export const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

export function getWallet(): Wallet {
  let url = "http://localhost:8545"
  let network = "mainnet";
  const provider = new ethers.providers.JsonRpcProvider(url, network);
  const p_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" // from Anvil fork
  const wallet = new Wallet(p_key);
  return wallet.connect(provider);
}


export function getWethContract(signer: Wallet): Contract {
  return new ethers.Contract(
    WETH,
    [
      "function deposit() public payable",
      "function approve(address, uint) public returns (bool)",
    ],
    signer
  );
}

export function getCometContract(address: string, signer: Wallet): Contract {
  return new ethers.Contract(
    address,
    [
      "function supply(address asset, uint256 amount) external",
      "function withdraw(address asset, uint256 amount) external",
      "function collateralBalanceOf(address account, address asset) external view returns (uint128)",
    ],
    signer
  );
}

export function getERC20Contract(address: string, signer: Wallet): Contract {
  return new ethers.Contract(
    address,
    [
      "function balanceOf(address user) external returns(uint256)",
      "function approve(address, uint) public returns (bool)",
    ],
    signer
  );
}

export async function getWeth(amount: BigNumber, signer: Wallet) {
  const contract = getWethContract(signer);
  await (await contract.functions.deposit({ value: amount })).wait();
}

export async function approveWeth(amount: BigNumber, to: string, signer: Wallet) {
  await approveERC20(WETH, amount, to, signer);
}

export async function approveERC20(asset: string, amount: BigNumber, to: string, signer: Wallet) {
  const contract = getERC20Contract(asset, signer);
  await (await contract.functions.approve(to, amount)).wait();
}

/**
 * Sets the signer with some amount of the given asset
 * Does so by getting WETH and then swapping it for the desired token
 * @param asset
 * @param signer
 * @returns The bought amount
 */
export async function getERC20(asset: string, signer: Wallet) {
  // prepare collateral
  const amount = BigNumber.from("1000000000000000000")
  await getWeth(amount, signer);
  const chainId = await signer.getChainId()

  useLocalApi(); // REMOVE

  const quoteResponse = await quote({
    fromChainId: chainId,
    fromToken: WETH,
    toChainId: chainId,
    toToken: asset,
    amount: amount.toString(),
    user: signer.address,
  });
  const tokenManager = await getWidoSpender({
    chainId: chainId,
    fromToken: WETH,
    toChainId: chainId,
    toToken: asset
  })

  if (!quoteResponse.to) {
    throw new Error("No `to` address on Wido repsonse")
  }

  await approveWeth(amount, tokenManager, signer);

  await (
    await signer.sendTransaction({
      to: quoteResponse.to,
      value: quoteResponse.value,
      data: quoteResponse.data,
    })
  ).wait()

  const erc20Contract = getERC20Contract(asset, signer);
  return await erc20Contract.callStatic.balanceOf(signer.address);
}