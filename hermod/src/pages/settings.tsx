import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/layout';
import { useGetSettingsStatus } from '@workspace/api-client-react';
import { useUser } from '@clerk/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Check, X, User, Sliders, Shield, Cpu, Zap, Wallet,
  ExternalLink, Save, RefreshCw,
} from 'lucide-react';
import { CHAIN_IDS } from '@/lib/chains';

interface UserPreferences {
  defaultChainId: number;
  defaultSlippage: string;
  displayCurrency: string;
  requirePolicyCheck: boolean;
  aiEnabled: boolean;
}

const BASE_URL = import.meta.env.BASE_URL ?? '/';

async function fetchPreferences(): Promise<UserPreferences> {
  const res = await fetch(`${BASE_URL}api/settings/preferences`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load preferences');
  return res.json();
}

async function savePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  const res = await fetch(`${BASE_URL}api/settings/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error('Failed to save preferences');
  return res.json();
}

const FEATURE_ICONS: Record<string, any> = {
  Core:   Shield,
  AI:     Cpu,
  Swap:   Zap,
  Risk:   Shield,
  Wallet: Wallet,
};

export default function Settings() {
  const { data: systemStatus, isLoading: statusLoading } = useGetSettingsStatus();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Preferences state ─────────────────────────────────────────────────────
  const { data: savedPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: fetchPreferences,
  });

  const [defaultChainId, setDefaultChainId]         = useState<string>('4663');
  const [defaultSlippage, setDefaultSlippage]       = useState('0.5');
  const [displayCurrency, setDisplayCurrency]       = useState('USD');
  const [requirePolicyCheck, setRequirePolicyCheck] = useState(true);
  const [aiEnabled, setAiEnabled]                   = useState(true);
  const [dirty, setDirty]                           = useState(false);

  useEffect(() => {
    if (savedPrefs) {
      setDefaultChainId(String(savedPrefs.defaultChainId ?? 4663));
      setDefaultSlippage(savedPrefs.defaultSlippage ?? '0.5');
      setDisplayCurrency(savedPrefs.displayCurrency ?? 'USD');
      setRequirePolicyCheck(savedPrefs.requirePolicyCheck ?? true);
      setAiEnabled(savedPrefs.aiEnabled ?? true);
      setDirty(false);
    }
  }, [savedPrefs]);

  const saveMutation = useMutation({
    mutationFn: savePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
      setDirty(false);
    },
    onError: () => {
      toast({ title: 'Save failed', description: 'Could not save settings. Try again.', variant: 'destructive' });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      defaultChainId:    Number(defaultChainId),
      defaultSlippage,
      displayCurrency,
      requirePolicyCheck,
      aiEnabled,
    });
  };

  const markDirty = () => setDirty(true);

  // ── Feature status from system ────────────────────────────────────────────
  const featureGroups = systemStatus?.items.reduce<Record<string, typeof systemStatus.items>>((acc, item) => {
    const group = (item as any).feature ?? 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {}) ?? {};

  return (
    <Layout title="Settings">
      <div className="space-y-6 max-w-3xl">

        {/* ── User Profile ──────────────────────────────────────────────── */}
        <div className="bg-card border border-card-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">User Profile</h3>
          </div>
          <div className="flex items-center gap-4">
            {user?.imageUrl && (
              <img src={user.imageUrl} alt="avatar" className="w-14 h-14 rounded-full border border-card-border" />
            )}
            <div className="flex-1 space-y-1">
              <p className="font-medium text-foreground">{user?.fullName || 'No name set'}</p>
              <p className="text-sm text-muted-foreground">{user?.emailAddresses?.[0]?.emailAddress || 'No email'}</p>
              <p className="text-xs text-muted-foreground font-mono">ID: {user?.id}</p>
            </div>
            <a
              href="https://accounts.clerk.com/user"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Manage Account
              </Button>
            </a>
          </div>
        </div>

        {/* ── Application Preferences ───────────────────────────────────── */}
        <div className="bg-card border border-card-border rounded-lg">
          <div className="p-6 border-b border-card-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Application Preferences</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Customize how Hermod works for you</p>
              </div>
            </div>
            {dirty && (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 bg-yellow-500/10 text-xs">
                Unsaved changes
              </Badge>
            )}
          </div>

          {prefsLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="p-6 space-y-6">

              {/* Default Network */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium">Default Network</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Chain shown first when connecting wallet or creating transactions
                  </p>
                </div>
                <Select
                  value={defaultChainId}
                  onValueChange={v => { setDefaultChainId(v); markDirty(); }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHAIN_IDS.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} {c.id === 4663 && <span className="text-primary ml-1">(Primary)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Default Slippage */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium">Default Slippage Tolerance</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Maximum price movement you'll accept on swaps (%)
                  </p>
                </div>
                <div className="flex items-center gap-2 w-48">
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    value={defaultSlippage}
                    onChange={e => { setDefaultSlippage(e.target.value); setDirty(true); }}
                    className="w-full"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>

              {/* Display Currency */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium">Display Currency</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Currency used for portfolio valuations and estimates
                  </p>
                </div>
                <Select
                  value={displayCurrency}
                  onValueChange={v => { setDisplayCurrency(v); setDirty(true); }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="ETH">ETH (Ξ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Policy Check */}
              <div className="flex items-center justify-between gap-4 py-1">
                <div>
                  <Label className="text-sm font-medium">Require Policy Check</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Always run agent policy validation before signing transactions
                  </p>
                </div>
                <Switch
                  checked={requirePolicyCheck}
                  onCheckedChange={v => { setRequirePolicyCheck(v); setDirty(true); }}
                />
              </div>

              {/* AI Features */}
              <div className="flex items-center justify-between gap-4 py-1">
                <div>
                  <Label className="text-sm font-medium">AI Features</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enable AI-powered intent parsing and transaction suggestions
                  </p>
                </div>
                <Switch
                  checked={aiEnabled}
                  onCheckedChange={v => { setAiEnabled(v); setDirty(true); }}
                />
              </div>

              <div className="pt-2 border-t border-card-border flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !dirty}
                  className="min-w-32"
                >
                  {saveMutation.isPending ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Save Preferences</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── System Feature Status ─────────────────────────────────────── */}
        <div className="bg-card border border-card-border rounded-lg">
          <div className="p-6 border-b border-card-border">
            <h3 className="text-lg font-semibold text-foreground">Feature Availability</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Which platform features are active on this instance
            </p>
          </div>
          <div className="p-6">
            {statusLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(featureGroups).map(([feature, items]) => {
                  const Icon = FEATURE_ICONS[feature] ?? Shield;
                  const allConfigured = items.every(i => i.configured);
                  const someConfigured = items.some(i => i.configured);
                  return (
                    <div
                      key={feature}
                      className={`rounded-lg border p-4 flex flex-col items-center gap-2 text-center ${
                        allConfigured
                          ? 'border-green-500/30 bg-green-500/5'
                          : someConfigured
                          ? 'border-yellow-500/30 bg-yellow-500/5'
                          : 'border-card-border bg-muted/20'
                      }`}
                    >
                      <Icon className={`h-6 w-6 ${allConfigured ? 'text-green-500' : someConfigured ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                      <p className="text-sm font-medium text-foreground">{feature}</p>
                      {allConfigured ? (
                        <Badge variant="outline" className="text-xs text-green-500 border-green-500/30 bg-green-500/10">
                          <Check className="h-3 w-3 mr-1" /> Active
                        </Badge>
                      ) : someConfigured ? (
                        <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/30 bg-yellow-500/10">
                          Partial
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <X className="h-3 w-3 mr-1" /> Not configured
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Robinhood Chain always shown as active */}
            <div className="mt-4 p-3 rounded-lg border border-primary/30 bg-primary/5 flex items-center gap-3">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Robinhood Chain (ID: 4663)</p>
                <p className="text-xs text-muted-foreground">
                  Primary network — hardcoded &amp; always active · RPC: rpc.mainnet.chain.robinhood.com
                </p>
              </div>
              <Badge variant="outline" className="ml-auto text-xs text-primary border-primary/30 bg-primary/10 flex-shrink-0">
                Primary
              </Badge>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
