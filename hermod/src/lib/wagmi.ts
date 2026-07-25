import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, base, optimism, arbitrum, polygon } from 'wagmi/chains';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';
import { rhChain } from './chains';

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'hermod-fallback-id';

// Robinhood Chain is first — it becomes the default chain
export const config = createConfig({
  chains: [rhChain, mainnet, base, optimism, arbitrum, polygon, sepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Hermod' }),
    walletConnect({ projectId: walletConnectProjectId }),
  ],
  transports: {
    [rhChain.id]: http('https://rpc.mainnet.chain.robinhood.com'),
    [mainnet.id]:  http(),
    [base.id]:     http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]:  http(),
    [sepolia.id]:  http(),
  },
});
