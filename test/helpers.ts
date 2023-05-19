import { BigNumber, Contract, ethers, Wallet } from 'ethers';

export const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

export function getWallet(chainId?: number): Wallet {
  let url = "http://localhost:8545"
  let network = "mainnet";
  const provider = new ethers.providers.JsonRpcProvider(url, network);
  const p_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" // from keys.lol
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

export async function getWeth(amount: BigNumber, signer: Wallet) {
  const contract = getWethContract(signer);
  await (await contract.functions.deposit({ value: amount })).wait();
}

export async function approveWeth(amount: BigNumber, to: string, signer: Wallet) {
  const contract = getWethContract(signer);
  await (await contract.functions.approve(to, amount)).wait();
}