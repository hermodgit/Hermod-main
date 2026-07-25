import { useState } from 'react';
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
  useListAgents,
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
  useListWallets,
  getListAgentsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { Plus, Trash2, Cpu, Power, PowerOff, ShieldAlert, ChevronRight, ChevronDown } from 'lucide-react';
import type { AgentPolicy, AgentInput } from '@workspace/api-client-react';

export default function Agents() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState<AgentInput['agentType']>('payment');
  const [walletAddress, setWalletAddress] = useState<string>('none');
  const [showPolicy, setShowPolicy] = useState(false);

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

  const { data: agents, isLoading } = useListAgents();
  const { data: wallets } = useListWallets();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = () => {
    if (!name) {
      toast({ title: 'Missing fields', description: 'Name is required', variant: 'destructive' });
      return;
    }

    const policy: AgentPolicy = {};
    if (maxTxAmount) policy.maxTransactionAmount = maxTxAmount;
    if (maxDailySpend) policy.maxDailySpend = maxDailySpend;
    if (dailyLimit) policy.dailyTransactionLimit = Number(dailyLimit);
    if (maxSlippage) policy.maxSlippage = maxSlippage;
    policy.requiresManualApproval = requiresManualApproval === 'true';
    
    if (allowedTokens) {
      policy.allowedTokens = allowedTokens.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (allowedProtocols) {
      policy.allowedProtocols = allowedProtocols.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (allowedRecipients) {
      (policy as any).allowedRecipients = allowedRecipients.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (blockedAddresses) {
      policy.blockedAddresses = blockedAddresses.split(',').map(t => t.trim()).filter(Boolean);
    }

    const payload: AgentInput = {
      name,
      description,
      agentType,
      walletAddress: walletAddress !== 'none' ? walletAddress : undefined,
      policy: Object.keys(policy).length > 0 ? policy : undefined,
    };

    createAgent.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        toast({ title: 'Agent created', description: 'Successfully created new agent' });
        setSheetOpen(false);
        resetForm();
      },
      onError: (err: any) => {
        toast({ title: 'Creation failed', description: err.message || 'Error creating agent', variant: 'destructive' });
      }
    });
  };

  const handleToggleActive = (id: string, current: boolean) => {
    updateAgent.mutate({ id, data: { isActive: !current } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        toast({ title: current ? 'Agent deactivated' : 'Agent activated' });
      }
    });
  };

  const handleDelete = () => {
    if (!deleteAgentId) return;
    deleteAgent.mutate({ id: deleteAgentId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        toast({ title: 'Agent deleted' });
        setDeleteAgentId(null);
      }
    });
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setAgentType('payment');
    setWalletAddress('none');
    setShowPolicy(false);
    setMaxTxAmount('');
    setMaxDailySpend('');
    setDailyLimit('');
    setMaxSlippage('');
    setRequiresManualApproval('true');
    setAllowedTokens('');
    setAllowedProtocols('');
    setAllowedRecipients('');
    setBlockedAddresses('');
  };

  const formatType = (type: string) => type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <Layout title="AI Financial Agents">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Agents</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage your automated AI financial agents</p>
          </div>
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        ) : !agents || agents.length === 0 ? (
          <div className="bg-card border border-card-border rounded-lg p-12 text-center">
            <Cpu className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No agents yet. Create your first AI financial agent.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {agents.map(agent => (
              <div key={agent.id} className="bg-card border border-card-border rounded-lg p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      {agent.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {formatType(agent.agentType)}
                      </Badge>
                      {agent.isActive ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteAgentId(agent.id)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-3 mb-6 flex-1">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Wallet</p>
                    {agent.walletAddress ? (
                      <AddressDisplay address={agent.walletAddress} showCopy={true} />
                    ) : (
                      <span className="text-sm text-muted-foreground font-mono">No wallet</span>
                    )}
                  </div>
                  {agent.policy && (
                    <div className="bg-muted/30 p-3 rounded-md border border-card-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground uppercase">Policy Active</p>
                      </div>
                      <div className="text-sm space-y-1 text-foreground/80">
                        {agent.policy.maxTransactionAmount && <p>Max Tx: <span className="font-mono text-foreground">${agent.policy.maxTransactionAmount}</span></p>}
                        {agent.policy.requiresManualApproval !== undefined && (
                          <p>Manual Approval: <span className="text-foreground">{agent.policy.requiresManualApproval ? 'Yes' : 'No'}</span></p>
                        )}
                        {agent.policy.allowedTokens && <p>Allowed Tokens: <span className="text-foreground">{agent.policy.allowedTokens.length}</span></p>}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 mt-auto">
                  <Button variant="outline" className="flex-1" onClick={() => handleToggleActive(agent.id, agent.isActive)} disabled={updateAgent.isPending}>
                    {agent.isActive ? <><PowerOff className="h-4 w-4 mr-2" /> Deactivate</> : <><Power className="h-4 w-4 mr-2" /> Activate</>}
                  </Button>
                  <Link href={`/agents/${agent.id}`} className="flex-1 flex">
                    <Button className="w-full">View Details</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Agent</SheetTitle>
            <SheetDescription>Configure a new AI financial agent and its execution policies.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Treasury Manager Agent" />
            </div>
            <div>
              <Label htmlFor="desc">Description (Optional)</Label>
              <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Manages yield farming across multiple chains..." />
            </div>
            <div>
              <Label htmlFor="type">Agent Type</Label>
              <Select value={agentType} onValueChange={v => setAgentType(v as AgentInput['agentType'])}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="treasury">Treasury</SelectItem>
                  <SelectItem value="defi_execution">DeFi Execution</SelectItem>
                  <SelectItem value="risk_monitoring">Risk Monitoring</SelectItem>
                  <SelectItem value="portfolio_analysis">Portfolio Analysis</SelectItem>
                </SelectContent>
              </Select>
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

            <div className="border border-card-border rounded-lg overflow-hidden mt-4">
              <button 
                type="button"
                className="w-full bg-muted/50 p-3 flex items-center justify-between hover:bg-muted/80 transition-colors text-sm font-medium"
                onClick={() => setShowPolicy(!showPolicy)}
              >
                <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Agent Policy (Optional)</span>
                {showPolicy ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              
              {showPolicy && (
                <div className="p-4 space-y-4 bg-card">
                  <div>
                    <Label htmlFor="maxTx">Max Transaction Amount (USD)</Label>
                    <Input id="maxTx" type="number" value={maxTxAmount} onChange={e => setMaxTxAmount(e.target.value)} placeholder="1000" />
                  </div>
                  <div>
                    <Label htmlFor="maxDaily">Max Daily Spend (USD)</Label>
                    <Input id="maxDaily" type="number" value={maxDailySpend} onChange={e => setMaxDailySpend(e.target.value)} placeholder="5000" />
                  </div>
                  <div>
                    <Label htmlFor="dailyLimit">Daily Transaction Limit (Count)</Label>
                    <Input id="dailyLimit" type="number" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} placeholder="10" />
                  </div>
                  <div>
                    <Label htmlFor="maxSlip">Max Slippage (%)</Label>
                    <Input id="maxSlip" type="number" step="0.1" value={maxSlippage} onChange={e => setMaxSlippage(e.target.value)} placeholder="1.5" />
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
                    <Label htmlFor="tokens">Allowed Tokens (Comma separated addresses)</Label>
                    <Input id="tokens" value={allowedTokens} onChange={e => setAllowedTokens(e.target.value)} placeholder="0x..., 0x..." className="font-mono text-xs" />
                  </div>
                  <div>
                    <Label htmlFor="protocols">Allowed Protocols (Comma separated)</Label>
                    <Input id="protocols" value={allowedProtocols} onChange={e => setAllowedProtocols(e.target.value)} placeholder="Uniswap, Aave, Compound" />
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
              )}
            </div>

            <Button className="w-full mt-6" onClick={handleCreate} disabled={createAgent.isPending}>
              {createAgent.isPending ? 'Creating...' : 'Create Agent'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteAgentId} onOpenChange={(open) => !open && setDeleteAgentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this agent? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAgentId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteAgent.isPending}>
              {deleteAgent.isPending ? 'Deleting...' : 'Delete Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
