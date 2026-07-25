import { useState } from 'react';
import { Layout } from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useListApiKeys, useCreateApiKey, useRevokeApiKey, getListApiKeysQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Key, Copy, Check, Trash2, AlertTriangle } from 'lucide-react';
import { formatDate, copyToClipboard } from '@/lib/utils';
import type { ApiKeyCreated } from '@workspace/api-client-react';

export default function Developer() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [newKey, setNewKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const { data: keys, isLoading } = useListApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = () => {
    if (!label) return;
    createKey.mutate({ data: { label } }, {
      onSuccess: (data) => {
        setNewKey(data);
        queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
        setLabel('');
        toast({ title: 'API Key Created' });
      }
    });
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await copyToClipboard(newKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewKey(null);
    setLabel('');
  };

  const handleRevoke = () => {
    if (!revokeId) return;
    revokeKey.mutate({ id: revokeId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
        toast({ title: 'API Key Revoked' });
        setRevokeId(null);
      }
    });
  };

  const routes = [
    { method: 'GET', path: '/api/healthz', desc: 'System health check', auth: 'None' },
    { method: 'GET', path: '/api/wallets', desc: 'List connected wallets', auth: 'Clerk / API Key' },
    { method: 'POST', path: '/api/portfolio/analyze', desc: 'Fetch latest balances', auth: 'Clerk / API Key' },
    { method: 'POST', path: '/api/risk/analyze-wallet', desc: 'Get wallet risk report', auth: 'Clerk / API Key' },
    { method: 'GET', path: '/api/approvals', desc: 'List token approvals', auth: 'Clerk / API Key' },
    { method: 'POST', path: '/api/transactions', desc: 'Create transaction plan', auth: 'Clerk / API Key' },
    { method: 'POST', path: '/api/ai/parse-intent', desc: 'Natural language to intent', auth: 'Clerk / API Key' },
    { method: 'GET', path: '/api/agents', desc: 'List configured agents', auth: 'Clerk / API Key' },
    { method: 'GET', path: '/api/recurring', desc: 'List recurring plans', auth: 'Clerk / API Key' },
    { method: 'GET', path: '/api/audit', desc: 'Query audit logs', auth: 'Clerk / API Key' },
  ];

  return (
    <Layout title="Developer">
      <div className="space-y-8">
        
        {/* API Keys Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">API Keys</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage keys for programmatic access to your agents</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Key className="w-4 h-4 mr-2" /> Generate Key
            </Button>
          </div>

          <div className="bg-card border border-card-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-card-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Label</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Prefix</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Used</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading keys...</td></tr>
                ) : !keys || keys.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No API keys found. Generate one to get started.</td></tr>
                ) : (
                  keys.map(k => (
                    <tr key={k.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 font-medium text-sm text-foreground">{k.label}</td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{k.prefix}...</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(k.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never'}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" onClick={() => setRevokeId(k.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* API Reference */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">API Reference</h2>
          
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-4 flex gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-500">Authentication</p>
              <p className="text-sm text-amber-500/80 mt-1">
                Pass your API key in the header: <code className="bg-amber-500/20 px-1 py-0.5 rounded">X-API-Key: hmd_...</code>
              </p>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b border-card-border">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Method</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Endpoint</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Description</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Auth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border text-sm">
                {routes.map((route, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={
                        route.method === 'GET' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                        route.method === 'POST' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                        'bg-purple-500/10 text-purple-500 border-purple-500/20'
                      }>{route.method}</Badge>
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">{route.path}</td>
                    <td className="px-6 py-4 text-foreground">{route.desc}</td>
                    <td className="px-6 py-4 text-muted-foreground">{route.auth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent>
          {!newKey ? (
            <>
              <DialogHeader>
                <DialogTitle>Generate API Key</DialogTitle>
                <DialogDescription>Create a new API key for programmatic access.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Trading Bot Script" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeCreateDialog}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!label || createKey.isPending}>Generate Key</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>API Key Generated</DialogTitle>
                <DialogDescription className="text-amber-500 font-medium">
                  ⚠ Copy this key now. It will not be shown again.
                </DialogDescription>
              </DialogHeader>
              <div className="bg-muted p-4 rounded-md flex items-center justify-between border border-card-border mt-4">
                <code className="text-green-400 font-mono text-sm break-all">{newKey.key}</code>
                <Button variant="ghost" size="icon" onClick={handleCopy} className="ml-4 shrink-0">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={closeCreateDialog}>I've copied it</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeId} onOpenChange={open => !open && setRevokeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>Are you sure? Any services using this key will immediately lose access.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revokeKey.isPending}>Revoke Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
