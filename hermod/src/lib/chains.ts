import { defineChain } from 'viem';

// ── Robinhood Chain — PRIMARY CHAIN ──────────────────────────────────────────
export const rhChain = defineChain({
  id: 4663,
  name: 'Robinhood',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Robinhood Explorer', url: 'https://robinhoodchain.blockscout.com' },
  },
});

// ── Chain metadata — Robinhood listed first ───────────────────────────────────
export const CHAIN_NAMES: Record<number, string> = {
  4663:    'Robinhood',
  1:       'Ethereum',
  8453:    'Base',
  42161:   'Arbitrum',
  10:      'Optimism',
  137:     'Polygon',
  11155111: 'Sepolia',
};

export const CHAIN_EXPLORERS: Record<number, string> = {
  4663:    'https://robinhoodchain.blockscout.com',
  1:       'https://etherscan.io',
  8453:    'https://basescan.org',
  42161:   'https://arbiscan.io',
  10:      'https://optimistic.etherscan.io',
  137:     'https://polygonscan.com',
  11155111: 'https://sepolia.etherscan.io',
};

export const CHAIN_IDS = [
  { id: 4663,    name: 'Robinhood' },
  { id: 1,       name: 'Ethereum' },
  { id: 8453,    name: 'Base' },
  { id: 42161,   name: 'Arbitrum' },
  { id: 10,      name: 'Optimism' },
  { id: 137,     name: 'Polygon' },
  { id: 11155111, name: 'Sepolia (Testnet)' },
];

export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;
}

export function getExplorerUrl(hash: string, chainId: number): string {
  const base = CHAIN_EXPLORERS[chainId] ?? 'https://etherscan.io';
  return `${base}/tx/${hash}`;
}

export function getAddressExplorerUrl(address: string, chainId: number): string {
  const base = CHAIN_EXPLORERS[chainId] ?? 'https://etherscan.io';
  return `${base}/address/${address}`;
}
