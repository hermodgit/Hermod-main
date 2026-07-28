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
  useListAgents,
  useListWallets,
  getGetAgentQueryKey,
  getListAgentsQueryKey,
  useListAgentMessages,
  useUpdateAgentMessage,
  useSendAgentMessage,
  useListAgentLinks,
  useCreateAgentLink,
  useDeleteAgentLink,
  getListAgentMessagesQueryKey,
  getListAgentLinksQueryKey,
  getAgentMessagesPendingCountQueryKey,
  useCreatePolicyTemplate,
  getListPolicyTemplatesQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useParams, Link, useLocation } from 'wouter';
import {
  ArrowLeft, Edit, Trash2, Power, PowerOff, ShieldAlert, Check, X,
  Inbox, Send, Link2, Plus, CheckCircle2, XCircle, Loader2, Radio, LayoutTemplate,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { AgentPolicy, AgentUpdate, AgentMessageType } from '@workspace/api-client-react';

// ── Style constants ────────────────────────────────────────────────
const G  = 'hsl(112 100% 54%)';
const AM = 'hsl(43 100% 54%)';
const RD = 'hsl(0 100% 63%)';
const C  = 'hsl(190 100% 54%)';

type Tab = 'overview' | 'inbox' | 'outbox' | 'links';

const MSG_STATUS_STYLES: Record<string, { color: string; label: string }> = {
  pending:   { color: AM, label: 'PENDING' },
  actioned:  { color: G,  label: 'ACTIONED' },
  dismissed: { color: 'hsl(0 0% 35%)', label: 'DISMISSED' },
};

const MSG_TYPE_LABELS: Record<string, string> = {
  signal:     'Signal',
  delegation: 'Delegation',
  status:     'Status',
};

function MsgBadge({ status }: { status: string }) {
  const s = MSG_STATUS_STYLES[status] ?? MSG_STATUS_STYLES.dismissed;
  return (
    <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 7px', borderRadius: 2, border: `1px solid ${s.color}33`, background: `${s.color}12`, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>('overview');

  const { data: agent, isLoading, error } = useGetAgent(id!, { query: { enabled: !!id, queryKey: getGetAgentQueryKey(id!) } });
  const { data: wallets } = useListWallets();
  const { data: allAgents } = useListAgents();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();

  // Comms
  const { data: inbox, isLoading: inboxLoading } = useListAgentMessages(id!, 'inbox', { query: { enabled: !!id && tab === 'inbox' } });
  const { data: outbox, isLoading: outboxLoading } = useListAgentMessages(id!, 'outbox', { query: { enabled: !!id && tab === 'outbox' } });
  const { data: links, isLoading: linksLoading } = useListAgentLinks(id!, { query: { enabled: !!id && tab === 'links' } });

  const updateMsg = useUpdateAgentMessage();
  const sendMsg   = useSendAgentMessage();
  const createLink = useCreateAgentLink();
  const deleteLink = useDeleteAgentLink();
  const createTemplate = useCreatePolicyTemplate();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendMsgOpen, setSendMsgOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Send message form
  const [msgToAgent, setMsgToAgent]   = useState('');
  const [msgType, setMsgType]         = useState<AgentMessageType>('signal');
  const [msgDesc, setMsgDesc]         = useState('');
  const [msgActionType, setMsgActionType] = useState('send_token');
  const [msgTokenSymbol, setMsgTokenSymbol] = useState('ETH');
  const [msgAmount, setMsgAmount]     = useState('');
  const [msgRecipient, setMsgRecipient] = useState('');

  // Link form
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkRole, setLinkRole]         = useState<'source' | 'target'>('source');

  // Edit form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [walletAddress, setWalletAddress] = useState<string>('none');
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

  const invalidateComms = () => {
    queryClient.invalidateQueries({ queryKey: getListAgentMessagesQueryKey(id!, 'inbox') });
    queryClient.invalidateQueries({ queryKey: getListAgentMessagesQueryKey(id!, 'outbox') });
    queryClient.invalidateQueries({ queryKey: getAgentMessagesPendingCountQueryKey() });
  };

  const pendingInbox = (inbox ?? []).filter(m => m.status === 'pending').length;

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

    const payload: AgentUpdate = { name, description, walletAddress: walletAddress !== 'none' ? walletAddress : undefined, policy: Object.keys(policy).length > 0 ? policy : undefined };
    updateAgent.mutate({ id: id!, data: payload }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAgentQueryKey(id!) }); queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() }); toast({ title: 'Agent updated' }); setEditSheetOpen(false); },
      onError: (err: any) => toast({ title: 'Update failed', description: err.message, variant: 'destructive' }),
    });
  };

  const handleToggleActive = () => {
    if (!agent) return;
    updateAgent.mutate({ id: id!, data: { isActive: !agent.isActive } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAgentQueryKey(id!) }); queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() }); toast({ title: agent.isActive ? 'Agent deactivated' : 'Agent activated' }); },
    });
  };

  const handleDelete = () => {
    deleteAgent.mutate({ id: id! }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() }); toast({ title: 'Agent deleted' }); setLocation('/agents'); },
    });
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !agent?.policy) return;
    const rules = {
      maxTransactionAmount: agent.policy.maxTransactionAmount ?? undefined,
      maxDailySpend: agent.policy.maxDailySpend ?? undefined,
      dailyTransactionLimit: agent.policy.dailyTransactionLimit ?? undefined,
      requiresManualApproval: agent.policy.requiresManualApproval,
      maxSlippage: agent.policy.maxSlippage ?? undefined,
      allowedTokens: agent.policy.allowedTokens ?? [],
      allowedProtocols: agent.policy.allowedProtocols ?? [],
      allowedRecipients: (agent.policy as any).allowedRecipients ?? [],
      blockedAddresses: agent.policy.blockedAddresses ?? [],
    };
    createTemplate.mutate({ data: { name: templateName.trim(), category: 'custom', rules } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPolicyTemplatesQueryKey() });
        toast({ title: 'Template saved', description: `"${templateName.trim()}" added to your templates.` });
        setSaveTemplateOpen(false);
        setTemplateName('');
      },
      onError: (err: any) => toast({ title: 'Failed to save template', description: err.message, variant: 'destructive' }),
    });
  };

  const handleMsgAction = (msgId: string, status: 'actioned' | 'dismissed') => {
    updateMsg.mutate({ id: msgId, data: { status } }, {
      onSuccess: () => { invalidateComms(); toast({ title: status === 'actioned' ? 'Signal approved — transaction queued' : 'Signal dismissed' }); },
      onError: (err: any) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
    });
  };

  const handleSendMsg = () => {
    if (!msgToAgent) { toast({ title: 'Select a target agent', variant: 'destructive' }); return; }
    sendMsg.mutate({
      data: {
        fromAgentId: id!,
        toAgentId: msgToAgent,
        type: msgType,
        payload: { description: msgDesc, actionType: msgActionType, tokenSymbol: msgTokenSymbol, amount: msgAmount || undefined, recipient: msgRecipient || undefined },
      },
    }, {
      onSuccess: () => { invalidateComms(); toast({ title: 'Signal sent' }); setSendMsgOpen(false); setMsgToAgent(''); setMsgDesc(''); setMsgAmount(''); setMsgRecipient(''); },
      onError: (err: any) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
    });
  };

  const handleCreateLink = () => {
    if (!linkTargetId) { toast({ title: 'Select an agent to link', variant: 'destructive' }); return; }
    const [sourceId, targetId] = linkRole === 'source' ? [id!, linkTargetId] : [linkTargetId, id!];
    createLink.mutate({ data: { sourceAgentId: sourceId, targetAgentId: targetId } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAgentLinksQueryKey(id!) }); toast({ title: 'Link created' }); setLinkTargetId(''); },
      onError: (err: any) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
    });
  };

  const handleDeleteLink = (linkId: string) => {
    deleteLink.mutate({ id: linkId }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAgentLinksQueryKey(id!) }); toast({ title: 'Link removed' }); },
    });
  };

  const formatType = (type: string) => type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const otherAgents = (allAgents ?? []).filter(a => a.id !== id);

  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { key: 'overview', label: 'Overview', icon: ShieldAlert },
    { key: 'inbox',    label: `Inbox${pendingInbox > 0 ? ` (${pendingInbox})` : ''}`, icon: Inbox },
    { key: 'outbox',   label: 'Outbox', icon: Send },
    { key: 'links',    label: 'Links', icon: Link2 },
  ];

  const P = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'hsl(0 0% 40%)' }}>{label}</label>
      {children}
    </div>
  );

  const Sel = ({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 2, background: 'hsl(0 0% 7%)', border: '1px solid hsl(0 0% 14%)', color: 'hsl(0 0% 80%)', fontSize: 12, outline: 'none' }}>
      {children}
    </select>
  );

  const Inp = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'hsl(0 0% 40%)' }}>{label}</label>
      <input {...props} style={{ padding: '8px 10px', borderRadius: 2, background: 'hsl(0 0% 7%)', border: '1px solid hsl(0 0% 14%)', color: 'hsl(0 0% 80%)', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box', ...props.style }} />
    </div>
  );

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
        {/* ── Header ── */}
        <div>
          <Link href="/agents" className="inline-block mb-2">
            <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Agents
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">{agent.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{formatType(agent.agentType)}</Badge>
                {agent.isActive
                  ? <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                  : <Badge variant="outline" className="bg-muted text-muted-foreground">Inactive</Badge>}
                <span className="text-xs text-muted-foreground font-mono">ID: {agent.id.slice(0,8)}…</span>
              </div>
            </div>
            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setSendMsgOpen(true); }} style={{ padding: '7px 14px', borderRadius: 2, border: '1px solid hsl(0 0% 14%)', background: 'hsl(0 0% 6%)', color: 'hsl(0 0% 70%)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Radio size={12} /> Send Signal
              </button>
              <button onClick={() => setEditSheetOpen(true)} style={{ padding: '7px 14px', borderRadius: 2, border: '1px solid hsl(0 0% 14%)', background: 'hsl(0 0% 6%)', color: 'hsl(0 0% 70%)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Edit size={12} /> Edit
              </button>
              <button onClick={handleToggleActive} disabled={updateAgent.isPending} style={{ padding: '7px 14px', borderRadius: 2, border: `1px solid ${agent.isActive ? 'hsl(43 100% 54% / 0.3)' : 'hsl(112 100% 54% / 0.3)'}`, background: agent.isActive ? 'hsl(43 100% 54% / 0.08)' : 'hsl(112 100% 54% / 0.08)', color: agent.isActive ? AM : G, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {agent.isActive ? <><PowerOff size={12} /> Deactivate</> : <><Power size={12} /> Activate</>}
              </button>
              <button onClick={() => setDeleteDialogOpen(true)} style={{ padding: '7px 14px', borderRadius: 2, border: '1px solid hsl(0 100% 63% / 0.3)', background: 'hsl(0 100% 63% / 0.06)', color: RD, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ borderBottom: '1px solid hsl(0 0% 10%)', display: 'flex', gap: 2 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            const hasPending = t.key === 'inbox' && pendingInbox > 0;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{ padding: '8px 16px', fontSize: 11, fontWeight: 500, cursor: 'pointer', background: 'transparent', border: 'none', borderBottom: isActive ? `2px solid ${G}` : '2px solid transparent', color: isActive ? G : 'hsl(0 0% 45%)', marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Icon size={12} />
                {t.label}
                {hasPending && <span style={{ background: AM, color: '#000', fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 999 }}>{pendingInbox}</span>}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Agent Details */}
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
                    {agent.walletAddress
                      ? <AddressDisplay address={agent.walletAddress} showCopy={true} />
                      : <span className="text-sm text-muted-foreground font-mono">None</span>}
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

              {/* Execution Policy */}
              <div className="bg-card border border-card-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Execution Policy</h3>
                  </div>
                  {agent.policy && (
                    <button
                      onClick={() => { setTemplateName(agent.name + ' Policy'); setSaveTemplateOpen(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 2, border: '1px solid hsl(0 0% 14%)', background: 'transparent', color: 'hsl(0 0% 50%)', fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'hsl(112 100% 54%)'; e.currentTarget.style.borderColor = 'hsl(112 100% 54% / 0.35)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'hsl(0 0% 50%)'; e.currentTarget.style.borderColor = 'hsl(0 0% 14%)'; }}
                    >
                      <LayoutTemplate size={11} /> Save as Template
                    </button>
                  )}
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
                        {agent.policy.requiresManualApproval !== false
                          ? <><Check className="h-5 w-5 text-green-500" /> <span className="text-sm">Required</span></>
                          : <><X className="h-5 w-5 text-red-500" /> <span className="text-sm">Not required</span></>}
                      </div>
                    </div>
                    <div className="md:col-span-2 pt-4 border-t border-card-border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Allowed Tokens</p>
                      <div className="flex flex-wrap gap-2">
                        {agent.policy.allowedTokens?.length
                          ? agent.policy.allowedTokens.map((t, i) => <Badge key={i} variant="outline" className="font-mono text-xs">{t.slice(0,6)}…{t.slice(-4)}</Badge>)
                          : <span className="text-sm text-muted-foreground">All tokens allowed</span>}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Allowed Protocols</p>
                      <div className="flex flex-wrap gap-2">
                        {agent.policy.allowedProtocols?.length
                          ? agent.policy.allowedProtocols.map((p, i) => <Badge key={i} variant="secondary">{p}</Badge>)
                          : <span className="text-sm text-muted-foreground">All protocols allowed</span>}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Blocked Addresses</p>
                      <div className="flex flex-wrap gap-2">
                        {agent.policy.blockedAddresses?.length
                          ? agent.policy.blockedAddresses.map((b, i) => <Badge key={i} variant="outline" className="font-mono text-xs bg-red-500/10 text-red-500 border-red-500/20">{b.slice(0,8)}…{b.slice(-6)}</Badge>)
                          : <span className="text-sm text-muted-foreground">No addresses blocked</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No execution policy configured. Agent operates without constraints.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Inbox tab ── */}
        {tab === 'inbox' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 12, color: 'hsl(0 0% 38%)' }}>Incoming signals from other agents. Approve to queue a transaction plan.</p>
              {pendingInbox > 0 && <span style={{ fontSize: 11, color: AM, fontWeight: 600 }}>{pendingInbox} pending</span>}
            </div>
            <div style={{ background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 9%)', borderRadius: 2, overflow: 'hidden' }}>
              {inboxLoading ? (
                <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Loader2 size={20} style={{ color: 'hsl(0 0% 30%)', animation: 'spin 1s linear infinite' }} /></div>
              ) : !inbox || inbox.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <Inbox size={36} style={{ color: 'hsl(0 0% 18%)', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 12, color: 'hsl(0 0% 30%)' }}>No incoming signals yet.</p>
                </div>
              ) : (
                inbox.map(m => (
                  <div key={m.id} style={{ padding: '14px 16px', borderBottom: '1px solid hsl(0 0% 7%)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <MsgBadge status={m.status} />
                        <span style={{ fontSize: 10, color: 'hsl(0 0% 35%)', fontFamily: 'JetBrains Mono, monospace' }}>{MSG_TYPE_LABELS[m.type] ?? m.type}</span>
                        <span style={{ fontSize: 10, color: 'hsl(0 0% 28%)' }}>from <strong style={{ color: 'hsl(0 0% 50%)' }}>{m.fromAgentName}</strong></span>
                      </div>
                      {(m.payload as any).description && (
                        <p style={{ fontSize: 11, color: 'hsl(0 0% 60%)', marginBottom: 4 }}>{(m.payload as any).description as string}</p>
                      )}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {(m.payload as any).actionType && <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'hsl(0 0% 40%)' }}>action: {(m.payload as any).actionType as string}</span>}
                        {(m.payload as any).amount && <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: C }}>{(m.payload as any).amount as string} {(m.payload as any).tokenSymbol as string}</span>}
                        {(m.payload as any).recipient && <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'hsl(0 0% 35%)' }}>→ {((m.payload as any).recipient as string).slice(0,10)}…</span>}
                      </div>
                      <p style={{ fontSize: 9, color: 'hsl(0 0% 28%)', marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(m.createdAt).toLocaleString()}
                        {m.actionedAt && ` · ${m.status} ${new Date(m.actionedAt).toLocaleString()}`}
                      </p>
                    </div>
                    {m.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => handleMsgAction(m.id, 'actioned')}
                          disabled={updateMsg.isPending}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 2, border: `1px solid ${G}40`, background: `${G}10`, color: G, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                        >
                          <CheckCircle2 size={11} /> Approve
                        </button>
                        <button
                          onClick={() => handleMsgAction(m.id, 'dismissed')}
                          disabled={updateMsg.isPending}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 2, border: '1px solid hsl(0 0% 14%)', background: 'transparent', color: 'hsl(0 0% 40%)', fontSize: 10, cursor: 'pointer' }}
                        >
                          <XCircle size={11} /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Outbox tab ── */}
        {tab === 'outbox' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 12, color: 'hsl(0 0% 38%)' }}>Signals sent by this agent to other agents.</p>
              <button
                onClick={() => setSendMsgOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 2, border: 'none', background: G, color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={12} /> Send Signal
              </button>
            </div>
            <div style={{ background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 9%)', borderRadius: 2, overflow: 'hidden' }}>
              {outboxLoading ? (
                <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Loader2 size={20} style={{ color: 'hsl(0 0% 30%)', animation: 'spin 1s linear infinite' }} /></div>
              ) : !outbox || outbox.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <Send size={36} style={{ color: 'hsl(0 0% 18%)', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 12, color: 'hsl(0 0% 30%)' }}>No signals sent yet. Use "Send Signal" to instruct another agent.</p>
                </div>
              ) : (
                outbox.map(m => (
                  <div key={m.id} style={{ padding: '14px 16px', borderBottom: '1px solid hsl(0 0% 7%)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <MsgBadge status={m.status} />
                        <span style={{ fontSize: 10, color: 'hsl(0 0% 35%)' }}>{MSG_TYPE_LABELS[m.type] ?? m.type}</span>
                        <span style={{ fontSize: 10, color: 'hsl(0 0% 28%)' }}>to <strong style={{ color: 'hsl(0 0% 50%)' }}>{m.toAgentName}</strong></span>
                      </div>
                      {(m.payload as any).description && <p style={{ fontSize: 11, color: 'hsl(0 0% 60%)', marginBottom: 4 }}>{(m.payload as any).description as string}</p>}
                      <div style={{ display: 'flex', gap: 12 }}>
                        {(m.payload as any).amount && <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: C }}>{(m.payload as any).amount as string} {(m.payload as any).tokenSymbol as string}</span>}
                        {(m.payload as any).recipient && <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'hsl(0 0% 35%)' }}>→ {((m.payload as any).recipient as string).slice(0,10)}…</span>}
                      </div>
                      <p style={{ fontSize: 9, color: 'hsl(0 0% 28%)', marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>{new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Links tab ── */}
        {tab === 'links' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 12, color: 'hsl(0 0% 38%)' }}>
              Link this agent with other agents to define communication pipelines. A source agent emits signals; a target agent receives them.
            </p>

            {/* Create link */}
            <div style={{ padding: 16, background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 9%)', borderRadius: 2 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'hsl(0 0% 35%)', marginBottom: 12 }}>ADD LINK</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={{ fontSize: 10, color: 'hsl(0 0% 40%)', display: 'block', marginBottom: 4 }}>THIS AGENT IS THE</label>
                  <Sel value={linkRole} onChange={v => setLinkRole(v as 'source' | 'target')}>
                    <option value="source">Source (sends signals)</option>
                    <option value="target">Target (receives signals)</option>
                  </Sel>
                </div>
                <div style={{ flex: 2, minWidth: 180 }}>
                  <label style={{ fontSize: 10, color: 'hsl(0 0% 40%)', display: 'block', marginBottom: 4 }}>LINKED TO AGENT</label>
                  <Sel value={linkTargetId} onChange={setLinkTargetId}>
                    <option value="">Select agent…</option>
                    {otherAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Sel>
                </div>
                <button
                  onClick={handleCreateLink}
                  disabled={createLink.isPending || !linkTargetId}
                  style={{ padding: '8px 16px', borderRadius: 2, border: 'none', background: G, color: '#000', fontSize: 11, fontWeight: 600, cursor: linkTargetId ? 'pointer' : 'not-allowed', opacity: linkTargetId ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6, height: 34 }}
                >
                  {createLink.isPending ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />} Add
                </button>
              </div>
            </div>

            {/* Link list */}
            <div style={{ background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 9%)', borderRadius: 2, overflow: 'hidden' }}>
              {linksLoading ? (
                <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Loader2 size={20} style={{ color: 'hsl(0 0% 30%)', animation: 'spin 1s linear infinite' }} /></div>
              ) : !links || links.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <Link2 size={36} style={{ color: 'hsl(0 0% 18%)', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 12, color: 'hsl(0 0% 30%)' }}>No agent links yet.</p>
                </div>
              ) : (
                links.map(lk => {
                  const isSource = lk.sourceAgentId === id;
                  return (
                    <div key={lk.id} style={{ padding: '12px 16px', borderBottom: '1px solid hsl(0 0% 7%)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Link2 size={12} style={{ color: 'hsl(0 0% 35%)', flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12, color: 'hsl(0 0% 60%)' }}>
                        <span style={{ color: G, fontWeight: 500 }}>{lk.sourceAgentName}</span>
                        <span style={{ color: 'hsl(0 0% 30%)', margin: '0 8px' }}>→</span>
                        <span style={{ color: C, fontWeight: 500 }}>{lk.targetAgentName}</span>
                        <span style={{ fontSize: 9, marginLeft: 10, color: 'hsl(0 0% 35%)', fontFamily: 'JetBrains Mono, monospace' }}>
                          ({isSource ? 'you emit' : 'you receive'})
                        </span>
                      </div>
                      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 7px', borderRadius: 2, border: `1px solid ${G}40`, background: `${G}10`, color: G }}>
                        {lk.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                      <button
                        onClick={() => handleDeleteLink(lk.id)}
                        style={{ padding: '4px 8px', borderRadius: 2, border: '1px solid hsl(0 0% 12%)', background: 'transparent', color: 'hsl(0 0% 35%)', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Send Signal Sheet ── */}
      {sendMsgOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSendMsgOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 400, height: '100%', background: 'hsl(0 0% 4%)', borderLeft: '1px solid hsl(0 0% 10%)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid hsl(0 0% 9%)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'hsl(0 0% 88%)' }}>Send Signal</h3>
              <p style={{ fontSize: 11, color: 'hsl(0 0% 38%)', marginTop: 4 }}>Emit a structured message from <strong style={{ color: G }}>{agent.name}</strong> to another agent.</p>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
              <P label="TO AGENT">
                <Sel value={msgToAgent} onChange={setMsgToAgent}>
                  <option value="">Select target agent…</option>
                  {otherAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Sel>
              </P>
              <P label="MESSAGE TYPE">
                <Sel value={msgType} onChange={v => setMsgType(v as AgentMessageType)}>
                  <option value="signal">Signal — price/market alert</option>
                  <option value="delegation">Delegation — execute on behalf</option>
                  <option value="status">Status — informational update</option>
                </Sel>
              </P>
              <Inp label="DESCRIPTION (OPTIONAL)" value={msgDesc} onChange={e => setMsgDesc(e.target.value)} placeholder="ETH price crossed $4,000 — execute swap" />
              {msgType !== 'status' && (
                <>
                  <div style={{ padding: 12, background: 'hsl(0 0% 6%)', border: '1px solid hsl(0 0% 10%)', borderRadius: 2 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: 'hsl(0 0% 35%)', marginBottom: 10 }}>SUGGESTED ACTION (OPTIONAL)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <P label="ACTION TYPE">
                        <Sel value={msgActionType} onChange={setMsgActionType}>
                          <option value="send_token">Send Token</option>
                          <option value="swap">Swap</option>
                          <option value="defi">DeFi Protocol</option>
                        </Sel>
                      </P>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 2 }}>
                          <Inp label="AMOUNT" type="number" value={msgAmount} onChange={e => setMsgAmount(e.target.value)} placeholder="0.1" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 10, color: 'hsl(0 0% 40%)', display: 'block', marginBottom: 4 }}>TOKEN</label>
                          <Sel value={msgTokenSymbol} onChange={setMsgTokenSymbol}>
                            {['ETH','USDC','USDT','DAI','WBTC','MATIC','LINK'].map(t => <option key={t} value={t}>{t}</option>)}
                          </Sel>
                        </div>
                      </div>
                      <Inp label="RECIPIENT (OPTIONAL)" value={msgRecipient} onChange={e => setMsgRecipient(e.target.value)} placeholder="0x…" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div style={{ padding: 16, borderTop: '1px solid hsl(0 0% 9%)' }}>
              <button
                onClick={handleSendMsg}
                disabled={sendMsg.isPending || !msgToAgent}
                style={{ width: '100%', padding: 10, borderRadius: 2, border: 'none', background: G, color: '#000', fontSize: 12, fontWeight: 700, cursor: (!msgToAgent || sendMsg.isPending) ? 'not-allowed' : 'pointer', opacity: !msgToAgent ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {sendMsg.isPending ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</> : <><Radio size={13} /> Send Signal</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Sheet ── */}
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
                      <code className="font-mono text-sm">{w.address.slice(0,8)}…{w.address.slice(-6)}</code> {w.label && `(${w.label})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border border-card-border rounded-lg p-4 bg-muted/20 space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Policy Limits</h4>
              <div><Label>Max Transaction (USD)</Label><Input type="number" value={maxTxAmount} onChange={e => setMaxTxAmount(e.target.value)} placeholder="Unlimited" /></div>
              <div><Label>Max Daily Spend (USD)</Label><Input type="number" value={maxDailySpend} onChange={e => setMaxDailySpend(e.target.value)} placeholder="Unlimited" /></div>
              <div><Label>Daily Tx Limit (Count)</Label><Input type="number" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} placeholder="Unlimited" /></div>
              <div><Label>Max Slippage (%)</Label><Input type="number" step="0.1" value={maxSlippage} onChange={e => setMaxSlippage(e.target.value)} placeholder="Default" /></div>
              <div>
                <Label>Requires Manual Approval</Label>
                <Select value={requiresManualApproval} onValueChange={setRequiresManualApproval}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Allowed Tokens (comma-separated)</Label><Input value={allowedTokens} onChange={e => setAllowedTokens(e.target.value)} placeholder="0x…" className="font-mono text-xs" /></div>
              <div><Label>Allowed Protocols</Label><Input value={allowedProtocols} onChange={e => setAllowedProtocols(e.target.value)} placeholder="Uniswap, Aave" /></div>
              <div><Label>Allowed Recipients</Label><Input value={allowedRecipients} onChange={e => setAllowedRecipients(e.target.value)} placeholder="0x… (blank = all)" className="font-mono text-xs" /></div>
              <div><Label>Blocked Addresses</Label><Input value={blockedAddresses} onChange={e => setBlockedAddresses(e.target.value)} placeholder="0x…" className="font-mono text-xs" /></div>
            </div>
            <Button className="w-full mt-6" onClick={handleUpdate} disabled={updateAgent.isPending}>
              {updateAgent.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Save as Template Dialog ── */}
      <Dialog open={saveTemplateOpen} onOpenChange={open => { if (!open) { setSaveTemplateOpen(false); setTemplateName(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Policy as Template</DialogTitle>
            <DialogDescription>
              Give this policy template a name. It will be saved to your private template library and can be applied to any agent in one click.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Label htmlFor="tpl-name">Template Name</Label>
            <Input
              id="tpl-name"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="e.g. My Conservative Policy"
              onKeyDown={e => { if (e.key === 'Enter') handleSaveTemplate(); }}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setSaveTemplateOpen(false); setTemplateName(''); }}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim() || createTemplate.isPending}>
              {createTemplate.isPending ? 'Saving…' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>Are you sure you want to delete {agent.name}? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteAgent.isPending}>
              {deleteAgent.isPending ? 'Deleting…' : 'Delete Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
