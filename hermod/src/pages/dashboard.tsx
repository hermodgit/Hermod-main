import { Layout } from '@/components/layout/layout';
import { StatCard } from '@/components/shared/stat-card';
import { AddressDisplay } from '@/components/shared/address-display';
import { RiskBadge } from '@/components/shared/risk-badge';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useGetDashboardSummary, useListTransactions } from '@workspace/api-client-react';
import {
  Wallet, Cpu, Send, Shield, Plus, Search, Key, FileText,
  ArrowDownUp, Bot, Clock, TrendingUp, ExternalLink, AlertTriangle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { getChainName, getExplorerUrl } from '@/lib/chains';

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: txnData } = useListTransactions({});
  const recentTxns = txnData?.slice(0, 8);

  // Live wallet state from wagmi
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: nativeBalance } = useBalance({ address, query: { enabled: !!address } });

  const nativeBalanceDisplay = nativeBalance
    ? `${parseFloat(formatEther(nativeBalance.value)).toFixed(6)} ${nativeBalance.symbol}`
    : null;

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">

        {/* Wallet Status Banner */}
        {isConnected && address ? (
          <div className="bg-card border border-card-border rounded-lg p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Connected Wallet</p>
                <AddressDisplay address={address} showCopy />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Network</p>
                <p className="text-sm font-mono font-medium text-foreground">{getChainName(chainId)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Native Balance</p>
                <p className="text-sm font-mono font-medium text-foreground">
                  {nativeBalanceDisplay ?? <span className="text-muted-foreground">Fetching…</span>}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <span className="inline-flex items-center gap-1.5 text-xs bg-green-500/10 text-green-500 border border-green-500/20 rounded-full px-2.5 py-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Connected
                </span>
                <Link href="/portfolio">
                  <Button variant="outline" size="sm" className="text-xs">
                    <TrendingUp className="mr-1.5 h-3 w-3" /> Full Portfolio
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-500">No wallet connected</p>
              <p className="text-xs text-muted-foreground mt-0.5">Connect your wallet to see live balance and execute transactions.</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Connected Wallets"
            value={summaryLoading ? '...' : summary?.walletCount || 0}
            icon={Wallet}
          />
          <StatCard
            title="Active Agents"
            value={summaryLoading ? '...' : summary?.activeAgentCount || 0}
            icon={Cpu}
          />
          <StatCard
            title="Pending Transactions"
            value={summaryLoading ? '...' : summary?.pendingTransactionCount || 0}
            icon={Send}
          />
          <StatCard
            title="Risk Alerts"
            value={summaryLoading ? '...' : summary?.riskAlertCount || 0}
            icon={Shield}
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-card-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Link href="/transfer">
              <Button variant="outline" className="w-full justify-start" data-testid="button-transfer">
                <Send className="mr-2 h-4 w-4" />
                Transfer
              </Button>
            </Link>
            <Link href="/swap">
              <Button variant="outline" className="w-full justify-start" data-testid="button-swap">
                <ArrowDownUp className="mr-2 h-4 w-4" />
                Swap
              </Button>
            </Link>
            <Link href="/ai-agent">
              <Button variant="outline" className="w-full justify-start" data-testid="button-ai-agent">
                <Bot className="mr-2 h-4 w-4" />
                AI Agent
              </Button>
            </Link>
            <Link href="/recurring">
              <Button variant="outline" className="w-full justify-start" data-testid="button-recurring">
                <Clock className="mr-2 h-4 w-4" />
                Recurring Plan
              </Button>
            </Link>
            <Link href="/portfolio">
              <Button variant="outline" className="w-full justify-start" data-testid="button-analyze-wallet">
                <Search className="mr-2 h-4 w-4" />
                Analyze Wallet
              </Button>
            </Link>
            <Link href="/risk">
              <Button variant="outline" className="w-full justify-start" data-testid="button-check-risk">
                <Shield className="mr-2 h-4 w-4" />
                Check Token Risk
              </Button>
            </Link>
            <Link href="/approvals">
              <Button variant="outline" className="w-full justify-start" data-testid="button-check-approvals">
                <Key className="mr-2 h-4 w-4" />
                Check Approvals
              </Button>
            </Link>
            <Link href="/transactions">
              <Button variant="outline" className="w-full justify-start" data-testid="button-new-transaction">
                <Plus className="mr-2 h-4 w-4" />
                Prepare Transaction
              </Button>
            </Link>
            <Link href="/agents/new">
              <Button variant="outline" className="w-full justify-start" data-testid="button-create-agent">
                <Cpu className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card border border-card-border rounded-lg">
          <div className="p-6 border-b border-card-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" data-testid="button-view-all-txns">
                <FileText className="mr-2 h-4 w-4" />
                View All
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            {!recentTxns || recentTxns.length === 0 ? (
              <div className="p-12 text-center">
                <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
                <p className="text-xs text-muted-foreground mt-1">Prepared and signed transactions will appear here</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-card-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Token / Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Wallet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {recentTxns.map(tx => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors" data-testid={`tx-row-${tx.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/transactions/${tx.id}`}>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors">
                            {tx.actionType.replace(/_/g, ' ')}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-foreground">
                        {tx.amount && tx.tokenSymbol ? `${tx.amount} ${tx.tokenSymbol}` : tx.tokenSymbol ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {tx.walletAddress ? (
                          <AddressDisplay address={tx.walletAddress} showCopy={false} />
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                          tx.status === 'confirmed' ? 'bg-green-500/10 text-green-500' :
                          tx.status === 'failed'    ? 'bg-red-500/10 text-red-500' :
                          tx.status === 'submitted' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {tx.status ?? 'draft'}
                        </span>
                        {tx.transactionHash && tx.chainId && (
                          <a
                            href={getExplorerUrl(tx.transactionHash as `0x${string}`, Number(tx.chainId))}
                            target="_blank" rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
