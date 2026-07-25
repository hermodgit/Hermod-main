import { useState } from 'react';
import { Layout } from '@/components/layout/layout';
import { AddressDisplay } from '@/components/shared/address-display';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useListTransactions,
  useCreateTransaction,
  useParseIntent,
  useListWallets,
  getListTransactionsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Send, AlertCircle } from 'lucide-react';
import { formatDate, formatNumber, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import type { TransactionPlanStatus, ParsedIntent } from '@workspace/api-client-react';

export default function Transactions() {
  const [statusFilter, setStatusFilter] = useState<TransactionPlanStatus | 'all'>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [parseMode, setParseMode] = useState<'ai' | 'manual'>('ai');
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);

  // AI Intent fields
  const [prompt, setPrompt] = useState('');
  const [aiWallet, setAiWallet] = useState('');
  const [aiChain, setAiChain] = useState<number>(1);

  // Manual fields
  const [actionType, setActionType] = useState('send_token');
  const [manualWallet, setManualWallet] = useState('');
  const [manualChain, setManualChain] = useState<number>(1);
  const [recipient, setRecipient] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data: allTransactions } = useListTransactions(
    statusFilter === 'all' ? {} : { status: statusFilter }
  );
  const { data: wallets } = useListWallets();
  const createTransaction = useCreateTransaction();
  const parseIntentMutation = useParseIntent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleParseIntent = () => {
    const wallet = wallets?.find((w) => w.id === aiWallet);
    if (!wallet || !prompt) {
      toast({
        title: 'Missing fields',
        description: 'Please enter a prompt and select a wallet',
        variant: 'destructive',
      });
      return;
    }

    parseIntentMutation.mutate(
      { data: { prompt, walletAddress: wallet.address, chainId: aiChain } },
      {
        onSuccess: (data) => {
          setParsedIntent(data);
          toast({
            title: 'Intent parsed',
            description: data.intent,
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Parse failed',
            description: error.message || 'Failed to parse intent',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleCreateFromIntent = () => {
    if (!parsedIntent) return;
    const wallet = wallets?.find((w) => w.id === aiWallet);
    if (!wallet) return;

    createTransaction.mutate(
      {
        data: {
          walletAddress: wallet.address,
          chainId: aiChain,
          actionType: parsedIntent.actionType,
          recipientAddress: parsedIntent.recipient || undefined,
          tokenSymbol: parsedIntent.tokenIn || parsedIntent.tokenOut || undefined,
          amount: parsedIntent.amount || undefined,
          riskLevel: 'low',
          riskWarnings: parsedIntent.risks,
          notes: parsedIntent.intent,
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
          toast({
            title: 'Transaction plan created',
            description: `Plan ${data.id.slice(0, 8)} created successfully`,
          });
          setSheetOpen(false);
          resetForm();
        },
        onError: (error: any) => {
          toast({
            title: 'Creation failed',
            description: error.message || 'Failed to create transaction',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleCreateManual = () => {
    const wallet = wallets?.find((w) => w.id === manualWallet);
    if (!wallet || !recipient || !tokenSymbol || !amount) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    createTransaction.mutate(
      {
        data: {
          walletAddress: wallet.address,
          chainId: manualChain,
          actionType,
          recipientAddress: recipient,
          tokenSymbol,
          amount,
          riskLevel: 'low',
          notes,
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
          toast({
            title: 'Transaction plan created',
            description: `Plan ${data.id.slice(0, 8)} created successfully`,
          });
          setSheetOpen(false);
          resetForm();
        },
        onError: (error: any) => {
          toast({
            title: 'Creation failed',
            description: error.message || 'Failed to create transaction',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const resetForm = () => {
    setPrompt('');
    setParsedIntent(null);
    setActionType('send_token');
    setRecipient('');
    setTokenSymbol('');
    setAmount('');
    setNotes('');
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

  return (
    <Layout title="Transaction Plans">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Transaction Plans</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Prepare, approve, and execute blockchain transactions
            </p>
          </div>
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as TransactionPlanStatus | 'all')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="pending_approval">Pending Approval</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="signed">Signed</TabsTrigger>
            <TabsTrigger value="submitted">Submitted</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-6">
            <div className="bg-card border border-card-border rounded-lg overflow-hidden">
              {!allTransactions || allTransactions.length === 0 ? (
                <div className="p-12 text-center">
                  <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No transactions found</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a new transaction to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-card-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Action Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Wallet
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {allTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <code className="font-mono text-xs text-foreground">{tx.id.slice(0, 8)}</code>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              {formatActionType(tx.actionType)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <AddressDisplay address={tx.walletAddress} showCopy={false} />
                          </td>
                          <td className="px-6 py-4">
                            {tx.amount && tx.tokenSymbol ? (
                              <span className="font-mono text-sm text-foreground">
                                {formatNumber(tx.amount, 4)} {tx.tokenSymbol}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={getStatusBadgeColor(tx.status)}>
                              {tx.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(tx.createdAt)}</td>
                          <td className="px-6 py-4 text-right">
                            <Link href={`/transactions/${tx.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Transaction Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Transaction Plan</SheetTitle>
            <SheetDescription>Create a new transaction plan using AI or manual input</SheetDescription>
          </SheetHeader>

          <Tabs value={parseMode} onValueChange={(v) => setParseMode(v as 'ai' | 'manual')} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai">Natural Language</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="space-y-4 mt-6">
              <div>
                <Label htmlFor="prompt">Describe what you want to do</Label>
                <Textarea
                  id="prompt"
                  placeholder="Send 100 USDC to 0x1234... on Base"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="ai-wallet">Wallet</Label>
                <Select value={aiWallet} onValueChange={setAiWallet}>
                  <SelectTrigger id="ai-wallet">
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
              <div>
                <Label htmlFor="ai-chain">Chain</Label>
                <Select value={String(aiChain)} onValueChange={(v) => setAiChain(Number(v))}>
                  <SelectTrigger id="ai-chain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Ethereum</SelectItem>
                    <SelectItem value="8453">Base</SelectItem>
                    <SelectItem value="42161">Arbitrum</SelectItem>
                    <SelectItem value="10">Optimism</SelectItem>
                    <SelectItem value="137">Polygon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleParseIntent} disabled={parseIntentMutation.isPending} className="w-full">
                {parseIntentMutation.isPending ? 'Parsing...' : 'Parse Intent'}
              </Button>

              {parsedIntent && (
                <div className="border border-card-border rounded-lg p-4 space-y-3 bg-muted/20">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Intent</p>
                    <p className="text-sm text-foreground">{parsedIntent.intent}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Action</p>
                      <Badge variant="outline" className="text-xs">
                        {formatActionType(parsedIntent.actionType)}
                      </Badge>
                    </div>
                    {parsedIntent.amount && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Amount</p>
                        <p className="text-sm font-mono text-foreground">{parsedIntent.amount}</p>
                      </div>
                    )}
                  </div>
                  {parsedIntent.recipient && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Recipient</p>
                      <code className="text-xs font-mono text-foreground">{parsedIntent.recipient.slice(0, 20)}...</code>
                    </div>
                  )}
                  {parsedIntent.risks && parsedIntent.risks.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Risk Warnings</p>
                      <ul className="space-y-1">
                        {parsedIntent.risks.map((risk: string, idx: number) => (
                          <li key={idx} className="text-xs text-yellow-500 flex items-start gap-1">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button onClick={handleCreateFromIntent} disabled={createTransaction.isPending} className="w-full">
                    {createTransaction.isPending ? 'Creating...' : 'Create Transaction Plan'}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-6">
              <div>
                <Label htmlFor="action-type">Action Type</Label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger id="action-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_native">Send Native</SelectItem>
                    <SelectItem value="send_token">Send Token</SelectItem>
                    <SelectItem value="swap_token">Swap Token</SelectItem>
                    <SelectItem value="approve_token">Approve Token</SelectItem>
                    <SelectItem value="revoke_approval">Revoke Approval</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="manual-wallet">Wallet</Label>
                <Select value={manualWallet} onValueChange={setManualWallet}>
                  <SelectTrigger id="manual-wallet">
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
              <div>
                <Label htmlFor="manual-chain">Chain</Label>
                <Select value={String(manualChain)} onValueChange={(v) => setManualChain(Number(v))}>
                  <SelectTrigger id="manual-chain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Ethereum</SelectItem>
                    <SelectItem value="8453">Base</SelectItem>
                    <SelectItem value="42161">Arbitrum</SelectItem>
                    <SelectItem value="10">Optimism</SelectItem>
                    <SelectItem value="137">Polygon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input
                  id="recipient"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="token-symbol">Token Symbol</Label>
                <Input
                  id="token-symbol"
                  placeholder="USDC"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this transaction..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleCreateManual} disabled={createTransaction.isPending} className="w-full">
                {createTransaction.isPending ? 'Creating...' : 'Create Plan'}
              </Button>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
