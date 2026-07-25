export interface Token {
  symbol:   string;
  name:     string;
  address:  `0x${string}` | null; // null = native
  decimals: number;
  chainId:  number;
}

// Native token sentinel
export const NATIVE_TOKEN_ADDRESS = null;

export const COMMON_TOKENS: Token[] = [
  // ── Ethereum Mainnet ─────────────────────────────────────
  { symbol: 'ETH',  name: 'Ethereum',    address: null,                                        decimals: 18, chainId: 1 },
  { symbol: 'USDC', name: 'USD Coin',    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  chainId: 1 },
  { symbol: 'USDT', name: 'Tether USD',  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  chainId: 1 },
  { symbol: 'DAI',  name: 'Dai',         address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, chainId: 1 },
  { symbol: 'WETH', name: 'Wrapped ETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, chainId: 1 },
  { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  chainId: 1 },
  { symbol: 'LINK', name: 'Chainlink',   address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, chainId: 1 },
  { symbol: 'UNI',  name: 'Uniswap',     address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, chainId: 1 },
  // ── Base ─────────────────────────────────────────────────
  { symbol: 'ETH',  name: 'Ethereum',    address: null,                                        decimals: 18, chainId: 8453 },
  { symbol: 'USDC', name: 'USD Coin',    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6,  chainId: 8453 },
  { symbol: 'WETH', name: 'Wrapped ETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, chainId: 8453 },
  { symbol: 'DAI',  name: 'Dai',         address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, chainId: 8453 },
  // ── Arbitrum ──────────────────────────────────────────────
  { symbol: 'ETH',  name: 'Ethereum',    address: null,                                        decimals: 18, chainId: 42161 },
  { symbol: 'USDC', name: 'USD Coin',    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6,  chainId: 42161 },
  { symbol: 'USDT', name: 'Tether USD',  address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6,  chainId: 42161 },
  { symbol: 'WETH', name: 'Wrapped ETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, chainId: 42161 },
  // ── Optimism ──────────────────────────────────────────────
  { symbol: 'ETH',  name: 'Ethereum',    address: null,                                        decimals: 18, chainId: 10 },
  { symbol: 'USDC', name: 'USD Coin',    address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6,  chainId: 10 },
  { symbol: 'USDT', name: 'Tether USD',  address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6,  chainId: 10 },
  { symbol: 'WETH', name: 'Wrapped ETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, chainId: 10 },
  // ── Polygon ───────────────────────────────────────────────
  { symbol: 'MATIC',name: 'Polygon',     address: null,                                        decimals: 18, chainId: 137 },
  { symbol: 'USDC', name: 'USD Coin',    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6,  chainId: 137 },
  { symbol: 'USDT', name: 'Tether USD',  address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6,  chainId: 137 },
  { symbol: 'WETH', name: 'Wrapped ETH', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, chainId: 137 },
  // ── Robinhood Chain (primary) ─────────────────────────────
  { symbol: 'ETH',  name: 'Ether',        address: null,                                        decimals: 18, chainId: 4663 },
  { symbol: 'WETH', name: 'Wrapped ETH',  address: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73', decimals: 18, chainId: 4663 },
  // ── Sepolia ───────────────────────────────────────────────
  { symbol: 'ETH',  name: 'Sepolia ETH', address: null,                                        decimals: 18, chainId: 11155111 },
];

export function getTokensForChain(chainId: number): Token[] {
  return COMMON_TOKENS.filter(t => t.chainId === chainId);
}

export function getNativeToken(chainId: number): Token {
  const native = COMMON_TOKENS.find(t => t.chainId === chainId && t.address === null);
  return native ?? { symbol: 'ETH', name: 'Ether', address: null, decimals: 18, chainId };
}

export function formatTokenAmount(amount: bigint, decimals: number, dp = 6): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const frac  = amount % divisor;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, dp).replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : String(whole);
}
