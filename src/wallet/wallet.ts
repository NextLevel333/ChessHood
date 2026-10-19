/**
 * Minimal EIP-1193 wallet helper built on viem. The wallet only SIGNS a server-issued message;
 * it never sends transactions. Authorization is decided by the server, not by this code.
 */
import { createWalletClient, custom, getAddress, type EIP1193Provider } from 'viem';

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export function hasWallet(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

function provider(): EIP1193Provider {
  if (!window.ethereum) throw new Error('No browser wallet found. Install MetaMask or similar.');
  return window.ethereum;
}

export async function connectWallet(): Promise<{ address: `0x${string}`; chainId: number }> {
  const p = provider();
  const accounts = (await p.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts[0]) throw new Error('The wallet did not return an account.');
  const chainHex = (await p.request({ method: 'eth_chainId' })) as string;
  return { address: getAddress(accounts[0]), chainId: Number.parseInt(chainHex, 16) };
}

export async function signChallenge(address: `0x${string}`, message: string): Promise<string> {
  const client = createWalletClient({ transport: custom(provider()) });
  return client.signMessage({ account: address, message });
}
