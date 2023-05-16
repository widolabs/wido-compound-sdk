import { ethers, Wallet } from 'ethers';

export function getWallet(): Wallet {
  const provider = new ethers.providers.JsonRpcProvider("https://eth.llamarpc.com", "mainnet");
  const p_key = "0x22f0c122aac6d95f72595de04d4d0b91b9128e8ede07a493d13f80505d4f3e0f" // from keys.lol
  const wallet = new Wallet(p_key);
  return wallet.connect(provider);
}