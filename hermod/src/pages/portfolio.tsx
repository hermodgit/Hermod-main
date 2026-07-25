import { useState } from 'react';
import { Layout } from '@/components/layout/layout';
import { AddressDisplay } from '@/components/shared/address-display';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListWallets, useAnalyzePortfolio, useListPortfolioSnapshots, getListPortfolioSnapshotsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CHAIN_IDS, getChainName } from '@/lib/chains';

export default function Portfolio() {
  const { data: wallets } = useListWallets();
  const { data: snapshots } = useListPortfolioSnapshots();
  const analyzePortfolio = useAnalyzePortfolio();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  // Default to Robinhood Chain for analysis regardless of where wallet was saved
  const [selectedChainId, setSelectedChainId] = useState<string>('4663');

  const latestSnapshot = snapshots?.[0];

  const handleAnalyze = () => {
    if (!selectedWallet) {
      toast({
        title: 'No wallet selected',
        description: 'Please select a wallet to analyze',
        variant: 'destructive',
      });
      return;
    }

    const wallet = wallets?.find(w => w.id === selectedWallet);
    if (!wallet) return;

    const chainId = parseInt(selectedChainId, 10);

    analyzePortfolio.mutate(
      { data: { walletAddress: wallet.address, chainId } },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListPortfolioSnapshotsQueryKey() });
          const assetCount = (data as any)?.assets?.length ?? 0;
          toast({
            title: 'Portfolio analyzed',
            description: `Snapshot created — ${assetCount} asset${assetCount !== 1 ? 's' : ''} found on ${getChainName(chainId)}`,
          });
        },
        onError: (error: any) => {
          const message = error.message || 'An error occurred';
          toast({
            title: 'Analysis failed',
            description: message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Layout title="Portfolio">
      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="bg-card border border-card-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Analyze Wallet Portfolio</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Scans on-chain Transfer events to discover ERC-20 tokens held by the wallet.
            Choose the chain you want to scan — this is independent of where the wallet was originally saved.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Wallet selector */}
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger data-testid="select-wallet">
                  <SelectValue placeholder="Select a wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets?.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      <code className="font-mono text-sm">{wallet.address.slice(0, 10)}…{wallet.address.slice(-8)}</code>
                      {wallet.label && <span className="ml-2 text-muted-foreground">({wallet.label})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chain selector */}
            <div className="w-48">
              <Select value={selectedChainId} onValueChange={setSelectedChainId}>
                <SelectTrigger data-testid="select-chain">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  {CHAIN_IDS.map((chain) => (
                    <SelectItem key={chain.id} value={String(chain.id)}>
                      {chain.name}
                      {chain.id === 4663 && <span className="ml-1 text-xs text-primary">(primary)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!selectedWallet || analyzePortfolio.isPending}
              data-testid="button-analyze"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              {analyzePortfolio.isPending ? 'Analyzing…' : 'Analyze'}
            </Button>
          </div>

          {(!wallets || wallets.length === 0) && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-500">No wallets connected</p>
                <p className="text-xs text-yellow-500/80 mt-1">Connect a wallet first to analyze your portfolio</p>
              </div>
            </div>
          )}
        </div>

        {/* Latest Snapshot */}
        {latestSnapshot && (
          <>
            <div className="bg-card border border-card-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Latest Snapshot</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    <AddressDisplay address={latestSnapshot.walletAddress} showCopy={false} />
                    {' · '}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                      {getChainName(latestSnapshot.chainId)}
                    </span>
                    {' · '}
                    {formatDate(latestSnapshot.analyzedAt)}
                  </p>
                </div>
                {latestSnapshot.totalUsdValue && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(latestSnapshot.totalUsdValue)}</p>
                  </div>
                )}
              </div>

              {/* Summary pills */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {latestSnapshot.assets.length} asset{latestSnapshot.assets.length !== 1 ? 's' : ''}
                </span>
                {latestSnapshot.assets.find(a => a.isNative) && (
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    {latestSnapshot.assets.find(a => a.isNative)?.balanceFormatted}{' '}
                    {latestSnapshot.assets.find(a => a.isNative)?.tokenSymbol} native
                  </span>
                )}
                {latestSnapshot.assets.filter(a => !a.isNative).length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {latestSnapshot.assets.filter(a => !a.isNative).length} ERC-20 token{latestSnapshot.assets.filter(a => !a.isNative).length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Assets Table */}
            <div className="bg-card border border-card-border rounded-lg overflow-hidden">
              <div className="p-6 border-b border-card-border">
                <h3 className="text-lg font-semibold text-foreground">Assets</h3>
              </div>
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-card-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      USD Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {latestSnapshot.assets.map((asset, index) => (
                    <tr key={index} className="hover:bg-muted/30 transition-colors" data-testid={`asset-${asset.tokenSymbol}`}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {asset.tokenSymbol}
                            {asset.isNative && <span className="ml-2 text-xs text-primary">(Native)</span>}
                          </p>
                          {asset.tokenName && (
                            <p className="text-xs text-muted-foreground">{asset.tokenName}</p>
                          )}
                          {asset.tokenAddress && (
                            <code className="text-xs text-muted-foreground/60 font-mono">
                              {asset.tokenAddress.slice(0, 8)}…{asset.tokenAddress.slice(-6)}
                            </code>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <code className="font-mono text-sm text-foreground">
                          {asset.balanceFormatted || formatNumber(asset.balance, asset.decimals)}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-foreground">
                        {asset.usdValue ? formatCurrency(asset.usdValue) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!latestSnapshot && !analyzePortfolio.isPending && (
          <div className="bg-card border border-card-border rounded-lg p-12 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No portfolio snapshots yet</p>
            <p className="text-xs text-muted-foreground mt-1">Select a wallet and chain, then click Analyze</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
