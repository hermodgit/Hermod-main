import { useState } from 'react';
import { CHAIN_IDS } from '@/lib/chains';
import { Layout } from '@/components/layout/layout';
import { AddressDisplay } from '@/components/shared/address-display';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useListRecurringPlans,
  useCreateRecurringPlan,
  useUpdateRecurringPlan,
  useDeleteRecurringPlan,
  useListWallets,
  useListAgents,
  getListRecurringPlansQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, PauseCircle, PlayCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import type { RecurringPlanInput, RecurringPlanStatus } from '@workspace/api-client-react';

export default function Recurring() {
  const [filter, setFilter] = useState<RecurringPlanStatus | 'all'>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPausingAll, setIsPausingAll] = useState(false);

  // Form State
  const [walletAddress, setWalletAddress] = useState('');
  const [chainId, setChainId] = useState('4663');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<RecurringPlanInput['frequency']>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxExecutions, setMaxExecutions] = useState('');
  const [agentId, setAgentId] = useState('none');

  const { data: plans, isLoading } = useListRecurringPlans();
  const { data: wallets } = useListWallets();
  const { data: agents } = useListAgents();
  
  const createPlan = useCreateRecurringPlan();
  const updatePlan = useUpdateRecurringPlan();
  const deletePlan = useDeleteRecurringPlan();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filteredPlans = plans?.filter(p => filter === 'all' || p.status === filter);
  const activePlansCount = plans?.filter(p => p.status === 'active').length || 0;

  const handleCreate = () => {
    if (!walletAddress || !recipientAddress || !tokenSymbol || !amount || !startDate) {
      toast({ title: 'Missing required fields', variant: 'destructive' });
      return;
    }

    const payload: RecurringPlanInput = {
      walletAddress,
      chainId: Number(chainId),
      recipientAddress,
      tokenSymbol,
      tokenAddress: tokenAddress || undefined,
      amount,
      frequency,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      maxExecutions: maxExecutions ? Number(maxExecutions) : undefined,
      agentId: agentId !== 'none' ? agentId : undefined,
    };

    createPlan.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRecurringPlansQueryKey() });
        toast({ title: 'Recurring plan created' });
        setSheetOpen(false);
        resetForm();
      },
      onError: (err: any) => toast({ title: 'Creation failed', description: err.message, variant: 'destructive' })
    });
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    updatePlan.mutate({ id, data: { status: newStatus as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRecurringPlansQueryKey() });
        toast({ title: `Plan ${newStatus}` });
      }
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deletePlan.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRecurringPlansQueryKey() });
        toast({ title: 'Plan deleted' });
        setDeleteId(null);
      }
    });
  };

  const handleEmergencyPause = async () => {
    if (!plans) return;
    const active = plans.filter(p => p.status === 'active');
    setIsPausingAll(true);
    try {
      await Promise.all(active.map(p => updatePlan.mutateAsync({ id: p.id, data: { status: 'paused' } })));
      queryClient.invalidateQueries({ queryKey: getListRecurringPlansQueryKey() });
      toast({ title: 'All active plans paused' });
    } catch (e) {
      toast({ title: 'Error pausing plans', variant: 'destructive' });
    } finally {
      setIsPausingAll(false);
    }
  };

  const resetForm = () => {
    setWalletAddress('');
    setChainId('1');
    setRecipientAddress('');
    setTokenSymbol('');
    setTokenAddress('');
    setAmount('');
    setFrequency('monthly');
    setStartDate('');
    setEndDate('');
    setMaxExecutions('');
    setAgentId('none');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'paused': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground border-muted-foreground/20';
    }
  };

  return (
    <Layout title="Recurring Payments">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Recurring Plans</h2>
            <p className="text-sm text-muted-foreground mt-1">Automate regular token transfers</p>
          </div>
          <div className="flex items-center gap-3">
            {activePlansCount > 0 && (
              <Button variant="outline" className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10" onClick={handleEmergencyPause} disabled={isPausingAll}>
                <AlertTriangle className="mr-2 h-4 w-4" /> Pause All
              </Button>
            )}
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Plan
            </Button>
          </div>
        </div>

        <Tabs value={filter} onValueChange={v => setFilter(v as RecurringPlanStatus | 'all')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="paused">Paused</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>
          
          <TabsContent value={filter} className="mt-6">
            <div className="bg-card border border-card-border rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="p-12 flex justify-center"><Clock className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : !filteredPlans || filteredPlans.length === 0 ? (
                <div className="p-12 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No recurring plans found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-card-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Token / Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Recipient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Schedule</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Executions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {filteredPlans.map(plan => (
                        <tr key={plan.id} className="hover:bg-muted/30">
                          <td className="px-6 py-4">
                            <div className="font-mono text-sm">{formatNumber(plan.amount)} {plan.tokenSymbol}</div>
                            {plan.tokenAddress && <div className="text-xs text-muted-foreground font-mono mt-1">{plan.tokenAddress.slice(0,8)}...</div>}
                          </td>
                          <td className="px-6 py-4">
                            <AddressDisplay address={plan.recipientAddress || ''} showCopy={true} />
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="capitalize mb-1">{plan.frequency}</Badge>
                            <div className="text-xs text-muted-foreground">Next: {plan.nextExecutionAt ? formatDate(plan.nextExecutionAt) : '—'}</div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {plan.executionCount || 0} {plan.maxExecutions ? `/ ${plan.maxExecutions}` : ''}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={`capitalize ${getStatusColor(plan.status)}`}>{plan.status}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {(plan.status === 'active' || plan.status === 'paused') && (
                                <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(plan.id, plan.status)}>
                                  {plan.status === 'active' ? <PauseCircle className="h-4 w-4 text-amber-500" /> : <PlayCircle className="h-4 w-4 text-green-500" />}
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(plan.id)} className="text-muted-foreground hover:text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Recurring Plan</SheetTitle>
            <SheetDescription>Set up automated periodic transactions.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="wallet">From Wallet</Label>
              <Select value={walletAddress} onValueChange={setWalletAddress}>
                <SelectTrigger id="wallet"><SelectValue placeholder="Select wallet" /></SelectTrigger>
                <SelectContent>
                  {wallets?.map(w => <SelectItem key={w.id} value={w.address}>{w.address.slice(0,8)}...{w.address.slice(-6)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="chain">Network</Label>
              <Select value={chainId} onValueChange={setChainId}>
                <SelectTrigger id="chain"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHAIN_IDS.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input id="recipient" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100" />
              </div>
              <div>
                <Label htmlFor="symbol">Token Symbol</Label>
                <Input id="symbol" value={tokenSymbol} onChange={e => setTokenSymbol(e.target.value)} placeholder="USDC" />
              </div>
            </div>
            <div>
              <Label htmlFor="tokenAddr">Token Contract (Optional for Native)</Label>
              <Input id="tokenAddr" value={tokenAddress} onChange={e => setTokenAddress(e.target.value)} className="font-mono text-xs" />
            </div>
            <div>
              <Label htmlFor="freq">Frequency</Label>
              <Select value={frequency} onValueChange={v => setFrequency(v as any)}>
                <SelectTrigger id="freq"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Start Date</Label>
                <Input id="start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="end">End Date (Optional)</Label>
                <Input id="end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxExec">Max Executions</Label>
                <Input id="maxExec" type="number" value={maxExecutions} onChange={e => setMaxExecutions(e.target.value)} placeholder="e.g. 12" />
              </div>
            </div>
            <div>
              <Label htmlFor="agent">Assigned Agent (Optional)</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger id="agent"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Agent (System Executed)</SelectItem>
                  {agents?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <Button className="w-full mt-6" onClick={handleCreate} disabled={createPlan.isPending}>
              {createPlan.isPending ? 'Creating...' : 'Create Plan'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>Are you sure you want to delete this recurring plan? Future executions will be cancelled.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletePlan.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
