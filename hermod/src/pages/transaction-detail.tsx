import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { Layout } from '@/components/layout/layout';
import { AddressDisplay } from '@/components/shared/address-display';
import { RiskBadge } from '@/components/shared/risk-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGetTransaction,
  useUpdateTransaction,
  getGetTransactionQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { ArrowLeft, ExternalLink, Copy, Check, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDate, formatNumber, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { TransactionPlanStatus, TransactionUpdateStatus } from '@workspace/api-client-react';

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: transaction, isLoading } = useGetTransaction(id || '', { query: { enabled: !!id, queryKey: getGetTransactionQueryKey(id || '') } });
  const updateTransaction = useUpdateTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { sendTransactionAsync } = useSendTransaction();
  const [txHash, setTxHash] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedCalldata, setCopiedCalldata] = useState(false);
  const [isCalldataExpanded, setIsCalldataExpanded] = useState(false);

  const { data: receipt, isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  useEffect(() => {
    if (receipt && transaction) {
      const status = receipt.status === 'success' ? 'confirmed' : 'failed';
      updateTransaction.mutate(
        { id: transaction.id, data: { status } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetTransactionQueryKey(transaction.id) });
            toast({
              title: status === 'confirmed' ? 'Transaction confirmed' : 'Transaction failed',
              description: `Transaction has been ${status}`,
              variant: status === 'confirmed' ? 'default' : 'destructive',
            });
          },
        }
      );
    }
  }, [receipt, transaction]);

  const handleStatusUpdate = (status: TransactionUpdateStatus) => {
    if (!transaction) return;

    updateTransaction.mutate(
      { id: transaction.id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTransactionQueryKey(transaction.id) });
          toast({
            title: 'Status updated',
            description: `Transaction status updated to ${status}`,
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Update failed',
            description: error.message || 'Failed to update status',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleSignAndSubmit = async () => {
    if (!transaction) return;

    try {
      let hash: string;

      if (transaction.actionType === 'send_native') {
        if (!transaction.amount || !transaction.recipientAddress) {
          toast({
            title: 'Missing data',
            description: 'Amount and recipient are required for native transfer',
            variant: 'destructive',
          });
          return;
        }

        hash = await sendTransactionAsync({
          to: transaction.recipientAddress as `0x${string}`,
          value: parseEther(transaction.amount),
          chainId: transaction.chainId,
        });
      } else {
        if (!transaction.calldata) {
          toast({
            title: 'No calldata',
            description: 'Calldata is required for this transaction type',
            variant: 'destructive',
          });
          return;
        }

        const to = transaction.targetContract || transaction.recipientAddress;
        if (!to) {
          toast({
            title: 'No target',
            description: 'Target contract or recipient address is required',
            variant: 'destructive',
          });
          return;
        }

        // Contract calls must NOT attach ETH value unless explicitly a payable call
        hash = await sendTransactionAsync({
          to: to as `0x${string}`,
          data: transaction.calldata as `0x${string}`,
          value: 0n,
          chainId: transaction.chainId,
        });
      }

      setTxHash(hash);
      
      const explorerUrl = getExplorerUrl(hash);
      
      updateTransaction.mutate(
        { id: transaction.id, data: { status: 'signed', transactionHash: hash, explorerUrl } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetTransactionQueryKey(transaction.id) });
            
            setTimeout(() => {
              updateTransaction.mutate(
                { id: transaction.id, data: { status: 'submitted' } },
                {
                  onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: getGetTransactionQueryKey(transaction.id) });
                  },
                }
              );
            }, 1000);

            toast({
              title: 'Transaction submitted',
              description: 'Waiting for confirmation...',
            });
          },
        }
      );
    } catch (error: any) {
      toast({
        title: 'Transaction failed',
        description: error.message || 'Failed to sign and submit transaction',
        variant: 'destructive',
      });
    }
  };

  const handleCopyHash = async (hash: string) => {
    await copyToClipboard(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
    toast({
      title: 'Copied',
      description: 'Transaction hash copied',
    });
  };

  const handleCopyCalldata = async (calldata: string) => {
    await copyToClipboard(calldata);
    setCopiedCalldata(true);
    setTimeout(() => setCopiedCalldata(false), 2000);
    toast({
      title: 'Copied',
      description: 'Calldata copied',
    });
  };

  const getExplorerUrl = (hash: string) => {
    if (!transaction) return '';
    const baseUrls: Record<number, string> = {
      1: 'https://etherscan.io',
      137: 'https://polygonscan.com',
      10: 'https://optimistic.etherscan.io',
      42161: 'https://arbiscan.io',
      8453: 'https://basescan.org',
    };
    const baseUrl = baseUrls[transaction.chainId] || baseUrls[1];
    return `${baseUrl}/tx/${hash}`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-muted text-muted-foreground';
      case 'pending_approval':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'approved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'signed':
      case 'submitted':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'confirmed':
        return 'bg-green-600/10 text-green-600 border-green-600/20';
      case 'failed':
        return 'bg-red-600/10 text-red-600 border-red-600/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatActionType = (type: string) => {
    return type
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const getChainName = (chainId: number) => {
    const names: Record<number, string> = {
      1: 'Ethereum',
      8453: 'Base',
      42161: 'Arbitrum',
      10: 'Optimism',
      137: 'Polygon',
    };
    return names[chainId] || `Chain ${chainId}`;
  };

  if (isLoading) {
    return (
      <Layout title="Transaction Detail">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!transaction) {
    return (
      <Layout title="Transaction Detail">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Transaction not found</p>
          <Link href="/transactions">
            <Button variant="outline" className="mt-4">
              Back to Transactions
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const displayHash = transaction.transactionHash || txHash;

  return (
    <Layout title="Transaction Detail">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/transactions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-foreground">Transaction Plan</h2>
              <Badge variant="outline" className={getStatusBadgeColor(transaction.status)}>
                {transaction.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              ID: <code className="font-mono">{transaction.id.slice(0, 16)}...</code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-card-border rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Action Type</p>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {formatActionType(transaction.actionType)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Chain</p>
                  <Badge variant="outline">{getChainName(transaction.chainId)}</Badge>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Wallet</p>
                <AddressDisplay address={transaction.walletAddress} chainId={transaction.chainId} showExplorer />
              </div>

              {transaction.recipientAddress && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Recipient</p>
                  <AddressDisplay address={transaction.recipientAddress} chainId={transaction.chainId} showExplorer />
                </div>
              )}

              {transaction.tokenSymbol && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Token</p>
                    <p className="text-sm font-medium text-foreground">{transaction.tokenSymbol}</p>
                  </div>
                  {transaction.amount && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Amount</p>
                      <p className="text-sm font-mono font-medium text-foreground">
                        {formatNumber(transaction.amount, 4)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {transaction.estimatedGas && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Estimated Gas</p>
                  <p className="text-sm font-mono text-foreground">{transaction.estimatedGas}</p>
                </div>
              )}

              {transaction.riskWarnings && transaction.riskWarnings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <RiskBadge level={transaction.riskLevel} />
                    <p className="text-xs font-medium text-muted-foreground uppercase">Risk Warnings</p>
                  </div>
                  <ul className="space-y-1">
                    {transaction.riskWarnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-yellow-500 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {transaction.calldata && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Calldata</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCalldata(transaction.calldata!)}
                      >
                        {copiedCalldata ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCalldataExpanded(!isCalldataExpanded)}
                      >
                        {isCalldataExpanded ? 'Collapse' : 'Expand'}
                      </Button>
                    </div>
                  </div>
                  <pre className={`bg-muted p-3 rounded text-xs font-mono overflow-x-auto ${isCalldataExpanded ? '' : 'max-h-24'}`}>
                    {transaction.calldata}
                  </pre>
                </div>
              )}

              {displayHash && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Transaction Hash</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs text-foreground bg-muted p-2 rounded flex-1 truncate">
                      {displayHash}
                    </code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyHash(displayHash)}>
                      {copiedHash ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                    <a href={getExplorerUrl(displayHash)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on Explorer
                    </a>
                  </Button>
                </div>
              )}

              {transaction.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Notes</p>
                  <p className="text-sm text-foreground">{transaction.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t border-card-border grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Created:</span> {formatDate(transaction.createdAt)}
                </div>
                <div>
                  <span className="font-medium">Updated:</span> {formatDate(transaction.updatedAt)}
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-card border border-card-border rounded-lg p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Status Timeline</h3>
              <div className="space-y-3">
                {['draft', 'approved', 'signed', 'submitted', 'confirmed'].map((status, idx) => {
                  const isActive = transaction.status === status;
                  const isPassed = ['draft', 'approved', 'signed', 'submitted', 'confirmed'].indexOf(transaction.status) > idx;
                  const isFailed = transaction.status === 'failed';
                  
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                          isActive
                            ? 'bg-primary border-primary text-primary-foreground'
                            : isPassed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-muted border-card-border text-muted-foreground'
                        }`}
                      >
                        {isPassed ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : isActive ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-current" />
                        )}
                      </div>
                      <p className={`text-sm ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                        {status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                      </p>
                    </div>
                  );
                })}
                {transaction.status === 'failed' && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center border-2 bg-red-500 border-red-500 text-white">
                      <XCircle className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-red-500">Failed</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Panel */}
          <div>
            <div className="bg-card border border-card-border rounded-lg p-6 sticky top-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Actions</h3>
              <div className="space-y-3">
                {transaction.status === 'draft' && (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      Review the transaction details, then approve to proceed.
                    </p>
                    <Button className="w-full" onClick={() => handleStatusUpdate('approved')}>
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleStatusUpdate('rejected')}
                    >
                      Reject
                    </Button>
                  </>
                )}

                {(transaction.status === 'pending_approval' || transaction.status === 'approved') && (
                  <>
                    {transaction.actionType !== 'send_native' && !transaction.calldata && (
                      <p className="text-xs text-amber-500 mb-2">
                        ⚠ No calldata — this plan cannot be executed directly. Create a new plan using the AI intent parser or a swap quote to generate executable calldata.
                      </p>
                    )}
                    <Button
                      className="w-full"
                      onClick={handleSignAndSubmit}
                      disabled={transaction.actionType !== 'send_native' && !transaction.calldata}
                    >
                      Sign & Submit
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleStatusUpdate('rejected')}
                    >
                      Reject
                    </Button>
                  </>
                )}

                {(transaction.status === 'signed' || transaction.status === 'submitted') && (
                  <>
                    <div className="flex items-center gap-2 text-blue-500 mb-3">
                      <Clock className="h-4 w-4 animate-spin" />
                      <p className="text-xs">Waiting for confirmation...</p>
                    </div>
                    {displayHash && (
                      <Button variant="outline" className="w-full" asChild>
                        <a href={getExplorerUrl(displayHash)} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View on Explorer
                        </a>
                      </Button>
                    )}
                  </>
                )}

                {transaction.status === 'confirmed' && (
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-green-500">Transaction Confirmed</p>
                  </div>
                )}

                {transaction.status === 'failed' && (
                  <>
                    <div className="text-center mb-3">
                      <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-red-500">Transaction Failed</p>
                    </div>
                    <Button variant="outline" className="w-full">
                      Retry
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
