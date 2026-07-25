import { createPublicClient, http, defineChain, type Chain, type PublicClient, type Address, type Abi } from "viem";
import { mainnet, base, optimism, arbitrum, polygon, sepolia } from "viem/chains";

// Robinhood Chain — primary chain, hardcoded RPC (no env var required)
const rhChain: Chain = defineChain({
  id: 4663,
  name: "Robinhood",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Robinhood Explorer", url: "https://robinhoodchain.blockscout.com" },
  },
});

const CHAIN_MAP: Record<number, Chain> = {
  4663:    rhChain,
  1:       mainnet,
  8453:    base,
  10:      optimism,
  42161:   arbitrum,
  137:     polygon,
  11155111: sepolia,
};

export function getChain(chainId: number): Chain {
  return CHAIN_MAP[chainId] ?? mainnet;
}

export function createViemClient(chainId: number): PublicClient {
  const chain = getChain(chainId);

  // Robinhood: use hardcoded public RPC; others: use viem defaults
  const transport =
    chainId === 4663
      ? http("https://rpc.mainnet.chain.robinhood.com")
      : http();

  return createPublicClient({ chain, transport }) as PublicClient;
}

// ERC-20 minimal ABI for balance + allowance queries
export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const satisfies Abi;

// ERC-20 Approval event
export const APPROVAL_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "spender", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Approval",
    type: "event",
  },
] as const satisfies Abi;

// ERC-20 Transfer event (used for token discovery)
export const TRANSFER_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
] as const satisfies Abi;

export const MAX_UINT256 =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;
