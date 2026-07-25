import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/layout';
import { AddressDisplay } from '@/components/shared/address-display';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useGetAgent,
  useUpdateAgent,
  useDeleteAgent,
  useListWallets,
  getGetAgentQueryKey,
  getListAgentsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useParams, Link, useLocation } from 'wouter';
import { ArrowLeft, Edit, Trash2, Power, PowerOff, ShieldAlert, Check, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { AgentPolicy, AgentUpdate } from '@workspace/api-client-react';

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  const { data: agent, isLoading, error } = useGetAgent(id!, { query: { enabled: !!id, queryKey: getGetAgentQueryKey(id!) } });
  const { data: wallets } = useListWallets();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Edit Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [walletAddress, setWalletAddress] = useState<string>('none');
  
  // Policy form
  const [maxTxAmount, setMaxTxAmount] = useState('');
  const [maxDailySpend, setMaxDailySpend] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [maxSlippage, setMaxSlippage] = useState('');
  const [requiresManualApproval, setRequiresManualApproval] = useState('true');
  const [allowedTokens, setAllowedTokens] = useState('');
  const [allowedProtocols, setAllowedProtocols] = useState('');
  const [allowedRecipients, setAllowedRecipients] = useState('');
  const [blockedAddresses, setBlockedAddresses] = useState('');

  useEffect(() => {
    if (agent && editSheetOpen) {
      setName(agent.name);
      setDescription(agent.description || '');
      setWalletAddress(agent.walletAddress || 'none');
      if (agent.policy) {
        setMaxTxAmount(agent.policy.maxTransactionAmount || '');
        setMaxDailySpend(agent.policy.maxDailySpend || '');
        setDailyLimit(agent.policy.dailyTransactionLimit?.toString() || '');
        setMaxSlippage(agent.policy.maxSlippage || '');
        setRequiresManualApproval(agent.policy.requiresManualApproval !== false ? 'true' : 'false');
        setAllowedTokens(agent.policy.allowedTokens?.join(', ') || '');
        setAllowedProtocols(agent.policy.allowedProtocols?.join(', ') || '');
        setAllowedRecipients((agent.policy as any).allowedRecipients?.join(', ') || '');
        setBlockedAddresses(agent.policy.blockedAddresses?.join(', ') || '');
      }
    }
  }, [agent, editSheetOpen]);

  const handleUpdate = () => {
    if (!name) return;

    const policy: AgentPolicy = {};
    if (maxTxAmount) policy.maxTransactionAmount = maxTxAmount;
    if (maxDailySpend) policy.maxDailySpend = maxDailySpend;
    if (dailyLimit) policy.dailyTransactionLimit = Number(dailyLimit);
    if (maxSlippage) policy.maxSlippage = maxSlippage;
    policy.requiresManualApproval = requiresManualApproval === 'true';
    
    if (allowedTokens) policy.allowedTokens = allowedTokens.split(',').map(t => t.trim()).filter(Boolean);
    if (allowedProtocols) policy.allowedProtocols = allowedProtocols.split(',').map(t => t.trim()).filter(Boolean);
    if (allowedRecipients) (policy as any).allowedRecipients = allowedRecipients.split(',').map(t => t.trim()).filter(Boolean);
    if (blockedAddresses) policy.blockedAddresses = blockedAddresses.split(',').map(t => t.trim()).filter(Boolean);

    const payload: AgentUpdate = {
      name,
      description,
      walletAddress: walletAddress !== 'none' ? walletAddress : undefined,
      policy: Object.keys(policy).length > 0 ? policy : undefined,
    };

    updateAgent.mutate({ id: id!, data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAgentQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        toast({ title: 'Agent updated' });
        setEditSheetOpen(false);
      },
      onError: (err: any) => toast({ title: 'Update failed', description: err.message, variant: 'destructive' })
    });
  };

  const handleToggleActive = () => {
    if (!agent) return;
    updateAgent.mutate({ id: id!, data: { isActive: !agent.isActive } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAgentQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        toast({ title: agent.isActive ? 'Agent deactivated' : 'Agent activated' });
      }
    });
  };

  const handleDelete = () => {
    deleteAgent.mutate({ id: id! }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        toast({ title: 'Agent deleted' });
        setLocation('/agents');
      }
    });
  };

  const formatType = (type: string) => type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (isLoading) {
    return (
      <Layout title="Agent Details">
        <div className="space-y-6">
          <Skeleton className="h-10 w-32" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !agent) {
    return (
      <Layout title="Agent Not Found">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-4">Agent not found or an error occurred</h2>
          <Link href="/agents"><Button>Return to Agents</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Agent Details">
      <div className="space-y-6">
        <div>
          <Link href="/agents" className="inline-block mb-2">
            <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Agents
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                {agent.name}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {formatType(agent.agentType)}
                </Badge>
                {agent.isActive ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">Inactive</Badge>
                )}
                <span className="text-xs text-muted-foreground font-mono">ID: {agent.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-card-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Agent Details</h3>
              <div className="space-y-4">
                {agent.description && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm text-foreground">{agent.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Connected Wallet</p>
                  {agent.walletAddress ? (
                    <AddressDisplay address={agent.walletAddress} showCopy={true} />
                  ) : (
                    <span className="text-sm text-muted-foreground font-mono">None</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-card-border">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Created</p>
                    <p className="text-sm text-foreground">{formatDate(agent.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Updated</p>
                    <p className="text-sm text-foreground">{formatDate(agent.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Execution Policy</h3>
              </div>
              
              {agent.policy ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Max Transaction Amount</p>
                    <p className="text-lg font-mono text-foreground">{agent.policy.maxTransactionAmount ? `$${agent.policy.maxTransactionAmount}` : 'Unlimited'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Max Daily Spend</p>
                    <p className="text-lg font-mono text-foreground">{agent.policy.maxDailySpend ? `$${agent.policy.maxDailySpend}` : 'Unlimited'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Daily Tx Limit</p>
                    <p className="text-lg font-mono text-foreground">{agent.policy.dailyTransactionLimit ?? 'Unlimited'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Max Slippage</p>
                    <p className="text-lg font-mono text-foreground">{agent.policy.maxSlippage ? `${agent.policy.maxSlippage}%` : 'Default'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Manual Approval</p>
                    <div className="flex items-center gap-2 mt-1">
                      {agent.policy.requiresManualApproval !== false ? (
                        <><Check className="h-5 w-5 text-green-500" /> <span className="text-sm">Required</span></>
                      ) : (
                        <><X className="h-5 w-5 text-red-500" /> <span className="text-sm">Not required</span></>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2 pt-4 border-t border-card-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Allowed Tokens</p>
                    <div className="flex flex-wrap gap-2">
                      {agent.policy.allowedTokens && agent.policy.allowedTokens.length > 0 ? (
                        agent.policy.allowedTokens.map((t, i) => (
                          <Badge key={i} variant="outline" className="font-mono text-xs">{t.slice(0,6)}...{t.slice(-4)}</Badge>
                        ))
                      ) : <span className="text-sm text-muted-foreground">All tokens allowed</span>}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Allowed Protocols</p>
                    <div className="flex flex-wrap gap-2">
                      {agent.policy.allowedProtocols && agent.policy.allowedProtocols.length > 0 ? (
                        agent.policy.allowedProtocols.map((p, i) => (
                          <Badge key={i} variant="secondary">{p}</Badge>
                        ))
                      ) : <span className="text-sm text-muted-foreground">All protocols allowed</span>}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Allowed Recipients</p>
                    <div className="flex flex-wrap gap-2">
                      {(agent.policy as any).allowedRecipients && (agent.policy as any).allowedRecipients.length > 0 ? (
                        (agent.policy as any).allowedRecipients.map((r: string, i: number) => (
                          <Badge key={i} variant="outline" className="font-mono text-xs">{r.slice(0,8)}...{r.slice(-6)}</Badge>
                        ))
                      ) : <span className="text-sm text-muted-foreground">All recipients allowed</span>}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Blocked Addresses</p>
                    <div className="flex flex-wrap gap-2">
                      {agent.policy.blockedAddresses && agent.policy.blockedAddresses.length > 0 ? (
                        agent.policy.blockedAddresses.map((b, i) => (
                          <Badge key={i} variant="outline" className="font-mono text-xs bg-red-500/10 text-red-500 border-red-500/20">{b.slice(0,8)}...{b.slice(-6)}</Badge>
                        ))
                      ) : <span className="text-sm text-muted-foreground">No addresses blocked</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No execution policy configured. Agent operates without constraints.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-card-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Actions</h3>
              <div className="space-y-3">
                <Button className="w-full justify-start" onClick={() => setEditSheetOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Configuration
                </Button>
                <Button variant={agent.isActive ? "outline" : "default"} className="w-full justify-start" onClick={handleToggleActive} disabled={updateAgent.isPending}>
                  {agent.isActive ? <><PowerOff className="mr-2 h-4 w-4" /> Deactivate Agent</> : <><Power className="mr-2 h-4 w-4" /> Activate Agent</>}
                </Button>
                <div className="pt-4 mt-4 border-t border-card-border">
                  <Button variant="destructive" className="w-full justify-start bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-none" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Agent
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Agent</SheetTitle>
            <SheetDescription>Update agent configuration and policy.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="wallet">Connected Wallet</Label>
              <Select value={walletAddress} onValueChange={setWalletAddress}>
                <SelectTrigger id="wallet"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No wallet (Read-only)</SelectItem>
                  {wallets?.map(w => (
                    <SelectItem key={w.id} value={w.address}>
                      <code className="font-mono text-sm">{w.address.slice(0,8)}...{w.address.slice(-6)}</code> {w.label && `(${w.label})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border border-card-border rounded-lg p-4 mt-4 bg-muted/20 space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Policy Limits</h4>
              <div>
                <Label htmlFor="maxTx">Max Transaction Amount (USD)</Label>
                <Input id="maxTx" type="number" value={maxTxAmount} onChange={e => setMaxTxAmount(e.target.value)} placeholder="Unlimited" />
              </div>
              <div>
                <Label htmlFor="maxDaily">Max Daily Spend (USD)</Label>
                <Input id="maxDaily" type="number" value={maxDailySpend} onChange={e => setMaxDailySpend(e.target.value)} placeholder="Unlimited" />
              </div>
              <div>
                <Label htmlFor="dailyLimit">Daily Transaction Limit (Count)</Label>
                <Input id="dailyLimit" type="number" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} placeholder="Unlimited" />
              </div>
              <div>
                <Label htmlFor="maxSlip">Max Slippage (%)</Label>
                <Input id="maxSlip" type="number" step="0.1" value={maxSlippage} onChange={e => setMaxSlippage(e.target.value)} placeholder="Default" />
              </div>
              <div>
                <Label htmlFor="reqApproval">Requires Manual Approval</Label>
                <Select value={requiresManualApproval} onValueChange={setRequiresManualApproval}>
                  <SelectTrigger id="reqApproval"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tokens">Allowed Tokens (Comma separated)</Label>
                <Input id="tokens" value={allowedTokens} onChange={e => setAllowedTokens(e.target.value)} placeholder="0x..." className="font-mono text-xs" />
              </div>
              <div>
                <Label htmlFor="protocols">Allowed Protocols (Comma separated)</Label>
                <Input id="protocols" value={allowedProtocols} onChange={e => setAllowedProtocols(e.target.value)} placeholder="Uniswap, Aave" />
              </div>
              <div>
                <Label htmlFor="allowedRecipients">Allowed Recipients (Comma separated addresses)</Label>
                <Input id="allowedRecipients" value={allowedRecipients} onChange={e => setAllowedRecipients(e.target.value)} placeholder="0x... (leave blank to allow all)" className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground mt-1">If set, agent can only send to these addresses.</p>
              </div>
              <div>
                <Label htmlFor="blockedAddresses">Blocked Addresses (Comma separated)</Label>
                <Input id="blockedAddresses" value={blockedAddresses} onChange={e => setBlockedAddresses(e.target.value)} placeholder="0x... (never send to these)" className="font-mono text-xs" />
              </div>
            </div>

            <Button className="w-full mt-6" onClick={handleUpdate} disabled={updateAgent.isPending}>
              {updateAgent.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {agent.name}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteAgent.isPending}>
              {deleteAgent.isPending ? 'Deleting...' : 'Delete Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
