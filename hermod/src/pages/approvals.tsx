import { useState } from 'react';
import { CHAIN_IDS, getExplorerUrl as getChainExplorerUrl } from '@/lib/chains';
import { Layout } from '@/components/layout/layout';
import { AddressDisplay } from '@/components/shared/address-display';
import { RiskBadge } from '@/components/shared/risk-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useListWallets,
  useListApprovals,
  usePrepareRevokeApproval,
  getListApprovalsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSendTransaction } from 'wagmi';
import { Key, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { formatNumber, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import type { TokenApproval, PreparedTransaction } from '@workspace/api-client-react';

export default function Approvals() {
  const { data: wallets } = useListWallets();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedWallet, setSelectedWallet] = useState('');
  const [chainId, setChainId] = useState<number>(4663);
  const [revokeApproval, setRevokeApproval] = useState<TokenApproval | null>(null);
  const [preparedTx, setPreparedTx] = useState<PreparedTransaction | null>(null);
  const [txHash, setTxHash] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState(false);

  const wallet = wallets?.find((w) => w.id === selectedWallet);
  
  const approvalsParams = { walletAddress: wallet?.address || '', chainId };
  const { data: approvals, isLoading: isLoadingApprovals } = useListApprovals(
    approvalsParams,
    { query: { enabled: !!wallet?.address, queryKey: getListApprovalsQueryKey(approvalsParams) } }
  );

  const prepareRevoke = usePrepareRevokeApproval();
  const { sendTransactionAsync } = useSendTransaction();

  const handleRevoke = (approval: TokenApproval) => {
    if (!wallet) return;
    setRevokeApproval(approval);
    setPreparedTx(null);
    setTxHash('');

    prepareRevoke.mutate(
      {
        data: {
          tokenAddress: approval.tokenAddress,
          spenderAddress: approval.spenderAddress,
          walletAddress: wallet.address,
          chainId,
        },
      },
      {
        onSuccess: (data) => {
          setPreparedTx(data);
        },
        onError: (error: any) => {
          const message = error.message || 'Failed to prepare transaction';
          const isRpcError = message.toLowerCase().includes('rpc') || message.toLowerCase().includes('provider');
          
          toast({
            title: 'Preparation failed',
            description: isRpcError
              ? 'RPC configuration required. Please configure in Settings.'
              : message,
            variant: 'destructive',
          });
          setRevokeApproval(null);
        },
      }
    );
  };

  const handleSignAndSubmit = async () => {
    if (!preparedTx || !revokeApproval) return;

    try {
      const hash = await sendTransactionAsync({
        to: preparedTx.to as `0x${string}`,
        data: preparedTx.data as `0x${string}`,
        value: BigInt(preparedTx.value || '0'),
        chainId: preparedTx.chainId,
      });

      setTxHash(hash);
      queryClient.invalidateQueries({ queryKey: getListApprovalsQueryKey({ walletAddress: wallet?.address || '', chainId }) });
      
      toast({
        title: 'Transaction submitted',
        description: 'Revoke transaction has been sent',
      });
    } catch (error: any) {
      toast({
        title: 'Transaction failed',
        description: error.message || 'Failed to sign transaction',
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setRevokeApproval(null);
    setPreparedTx(null);
    setTxHash('');
  };

  const handleCopyHash = async () => {
    if (!txHash) return;
    await copyToClipboard(txHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
    toast({
      title: 'Copied',
      description: 'Transaction hash copied',
    });
  };

  const getExplorerUrl = (hash: string) => getChainExplorerUrl(hash, chainId);

  return (
    <Layout title="Approval Scanner">
      <div className="space-y-6">
        {/* Scanner Controls */}
        <div className="bg-card border border-card-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Scan Wallet Approvals</h2>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="wallet">Wallet</Label>
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger id="wallet">
                  <SelectValue placeholder="Select a wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets?.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <code className="font-mono text-sm">
                        {w.address.slice(0, 10)}...{w.address.slice(-8)}
                      </code>
                      {w.label && <span className="ml-2 text-muted-foreground">({w.label})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="chain">Chain</Label>
              <Select value={String(chainId)} onValueChange={(v) => setChainId(Number(v))}>
                <SelectTrigger id="chain">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAIN_IDS.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!wallets || wallets.length === 0 ? (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-500">No wallets connected</p>
                <p className="text-xs text-yellow-500/80 mt-1">
                  Connect a wallet first to scan for approvals
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Approvals Table */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-card-border">
            <h3 className="text-lg font-semibold text-foreground">Active Approvals</h3>
          </div>
          {isLoadingApprovals ? (
            <div className="p-12 text-center">
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
              <p className="text-sm text-muted-foreground mt-4">Scanning approvals...</p>
            </div>
          ) : !wallet ? (
            <div className="p-12 text-center">
              <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Select a wallet to scan</p>
            </div>
          ) : !approvals || approvals.length === 0 ? (
            <div className="p-12 text-center">
              <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No approvals found for this wallet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your tokens appear to have no active approvals
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-card-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Token
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Spender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Allowance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {approvals.map((approval, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{approval.tokenSymbol}</p>
                          {approval.tokenName && (
                            <p className="text-xs text-muted-foreground">{approval.tokenName}</p>
                          )}
                          <code className="text-xs text-muted-foreground font-mono">
                            {approval.tokenAddress.slice(0, 8)}...
                          </code>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          {approval.spenderLabel && (
                            <p className="text-sm font-medium text-foreground">{approval.spenderLabel}</p>
                          )}
                          <AddressDisplay
                            address={approval.spenderAddress}
                            showCopy
                            showExplorer={false}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {approval.isUnlimited ? (
                          <span className="text-sm font-semibold text-red-500">UNLIMITED</span>
                        ) : (
                          <code className="font-mono text-sm text-foreground">
                            {formatNumber(approval.allowance, 4)}
                          </code>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <RiskBadge level={approval.riskLevel} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevoke(approval)}
                          disabled={prepareRevoke.isPending}
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!revokeApproval} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Approval</DialogTitle>
            <DialogDescription>
              {prepareRevoke.isPending && 'Preparing transaction...'}
              {preparedTx && !txHash && 'Sign and submit the transaction to revoke this approval'}
              {txHash && 'Transaction submitted successfully'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {prepareRevoke.isPending && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}
            {preparedTx && !txHash && (
              <>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Token</p>
                  <p className="text-sm text-muted-foreground">
                    {revokeApproval?.tokenSymbol} ({revokeApproval?.tokenAddress.slice(0, 10)}...)
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Spender</p>
                  <p className="text-sm text-muted-foreground">
                    {revokeApproval?.spenderLabel || revokeApproval?.spenderAddress.slice(0, 10) + '...'}
                  </p>
                </div>
                {preparedTx.description && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Description</p>
                    <p className="text-sm text-muted-foreground">{preparedTx.description}</p>
                  </div>
                )}
                {preparedTx.estimatedGas && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Estimated Gas</p>
                    <p className="text-sm text-muted-foreground font-mono">{preparedTx.estimatedGas}</p>
                  </div>
                )}
              </>
            )}
            {txHash && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Transaction Hash</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs text-foreground bg-muted p-2 rounded flex-1 truncate">
                    {txHash}
                  </code>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyHash}>
                    {copiedHash ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <a href={getExplorerUrl(txHash)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View on Explorer
                  </a>
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            {!txHash && (
              <>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                {preparedTx && (
                  <Button onClick={handleSignAndSubmit}>Sign & Submit</Button>
                )}
              </>
            )}
            {txHash && (
              <Button onClick={handleCloseDialog}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
