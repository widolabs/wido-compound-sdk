import { ethers, Wallet } from 'ethers';

export function getWallet(chainId?: number): Wallet {
  let url, network;
  switch (chainId) {
    case 137:
      url = "https://polygon.llamarpc.com";
      network = "matic";
      break;
    default:
      url = "https://eth.llamarpc.com";
      network = "mainnet";
  }
  const provider = new ethers.providers.JsonRpcProvider(url, network);
  const p_key = "0x22f0c122aac6d95f72595de04d4d0b91b9128e8ede07a493d13f80505d4f3e0f" // from keys.lol
  const wallet = new Wallet(p_key);
  return wallet.connect(provider);
}