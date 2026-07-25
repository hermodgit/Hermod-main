import { ConnectButton } from '@rainbow-me/rainbowkit';

interface WalletButtonProps {
  /** 'full' shows address/chain when connected, 'compact' shows icon only */
  size?: 'full' | 'compact';
}

export function WalletButton({ size = 'full' }: WalletButtonProps) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        if (!ready) return null;

        const btnStyle: React.CSSProperties = {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.04em',
          cursor: 'pointer',
          border: 'none',
          borderRadius: 2,
          padding: '5px 14px',
          background: 'hsl(112 100% 54%)',
          color: 'hsl(0 0% 3%)',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          transition: 'background 150ms',
        };

        const hoverIn  = (e: React.MouseEvent<HTMLButtonElement>) =>
          ((e.currentTarget as HTMLButtonElement).style.background = 'hsl(112 100% 46%)');
        const hoverOut = (e: React.MouseEvent<HTMLButtonElement>) =>
          ((e.currentTarget as HTMLButtonElement).style.background = 'hsl(112 100% 54%)');

        /* ── Not connected ── */
        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              style={btnStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
              data-testid="button-connect-wallet"
            >
              Connect Wallet
            </button>
          );
        }

        /* ── Wrong network ── */
        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              style={{ ...btnStyle, background: 'hsl(0 100% 63%)', color: '#fff' }}
              data-testid="button-wrong-network"
            >
              Wrong Network
            </button>
          );
        }

        /* ── Connected ── */
        if (size === 'compact') {
          return (
            <button
              onClick={openAccountModal}
              style={{ ...btnStyle, padding: '5px 10px', gap: 5 }}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
              data-testid="button-wallet-account"
              title={account.address}
            >
              {chain.hasIcon && chain.iconUrl && (
                <img
                  src={chain.iconUrl}
                  alt={chain.name ?? 'Chain'}
                  style={{ width: 12, height: 12, borderRadius: '50%', objectFit: 'contain' }}
                />
              )}
              {account.displayName}
            </button>
          );
        }

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Chain selector */}
            <button
              onClick={openChainModal}
              style={{
                ...btnStyle,
                padding: '5px 8px',
                background: 'hsl(0 0% 8%)',
                color: 'hsl(0 0% 75%)',
                border: '1px solid hsl(0 0% 14%)',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(112 100% 54% / 0.4)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(0 0% 14%)')}
              data-testid="button-chain-selector"
            >
              {chain.hasIcon && chain.iconUrl ? (
                <img
                  src={chain.iconUrl}
                  alt={chain.name ?? 'Chain'}
                  style={{ width: 12, height: 12, borderRadius: '50%', objectFit: 'contain' }}
                />
              ) : (
                chain.name ?? 'Chain'
              )}
            </button>

            {/* Account */}
            <button
              onClick={openAccountModal}
              style={btnStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
              data-testid="button-wallet-account"
              title={account.address}
            >
              {account.displayBalance ? `${account.displayBalance} · ` : ''}
              {account.displayName}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
