import { useState } from 'react';
import { CHAIN_IDS, getAddressExplorerUrl } from '@/lib/chains';
import { Layout } from '@/components/layout/layout';
import { AddressDisplay } from '@/components/shared/address-display';
import { RiskBadge } from '@/components/shared/risk-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalyzeWalletRisk, useAnalyzeTokenRisk, useListRiskReports, getListRiskReportsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Shield, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { formatDate, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import type { RiskReport } from '@workspace/api-client-react';

export default function Risk() {
  const { data: reports } = useListRiskReports();
  const analyzeWallet = useAnalyzeWalletRisk();
  const analyzeToken = useAnalyzeTokenRisk();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [address, setAddress] = useState('');
  const [targetType, setTargetType] = useState<'wallet' | 'token'>('wallet');
  const [chainId, setChainId] = useState<number>(4663);
  const [selectedReport, setSelectedReport] = useState<RiskReport | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);

  const isAnalyzing = analyzeWallet.isPending || analyzeToken.isPending;

  const handleAnalyze = () => {
    if (!address || !address.startsWith('0x')) {
      toast({
        title: 'Invalid address',
        description: 'Please enter a valid Ethereum address starting with 0x',
        variant: 'destructive',
      });
      return;
    }

    const onSuccess = (data: RiskReport) => {
      setSelectedReport(data);
      queryClient.invalidateQueries({ queryKey: getListRiskReportsQueryKey() });
      toast({ title: 'Analysis complete', description: `Risk level: ${data.riskLevel.toUpperCase()}` });
    };
    const onError = (error: any) => {
      const message = error.message || 'An error occurred';
      const isConfigError = error.status === 503 || message.toLowerCase().includes('goplus') || message.toLowerCase().includes('api key');
      toast({
        title: 'Analysis failed',
        description: isConfigError ? 'GoPlus API key not configured. Please add it in Settings.' : message,
        variant: 'destructive',
      });
    };

    if (targetType === 'wallet') {
      analyzeWallet.mutate({ data: { walletAddress: address, chainId } }, { onSuccess, onError });
    } else {
      analyzeToken.mutate({ data: { tokenAddress: address, chainId } }, { onSuccess, onError });
    }
  };

  const handleCopyAddress = async (addr: string) => {
    await copyToClipboard(addr);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
    toast({
      title: 'Copied',
      description: 'Address copied to clipboard',
    });
  };


  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedFindings = selectedReport?.findings ? [...selectedReport.findings].sort((a, b) => {
    return (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
  }) : [];

  return (
    <Layout title="Risk Detector">
      <div className="space-y-6">
        {/* Analysis Form */}
        <div className="bg-card border border-card-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Analyze Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="lg:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as 'wallet' | 'token')}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wallet">Wallet Address</SelectItem>
                  <SelectItem value="token">Token Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
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
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !address}>
            <Shield className="mr-2 h-4 w-4" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Results Panel */}
          <div className="lg:col-span-2">
            {isAnalyzing && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-4">
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}

            {!isAnalyzing && selectedReport && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <RiskBadge level={selectedReport.riskLevel} className="text-base px-4 py-1.5" />
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        {selectedReport.targetType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <code className="font-mono text-sm text-foreground">
                        {selectedReport.targetAddress.slice(0, 10)}...{selectedReport.targetAddress.slice(-8)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyAddress(selectedReport.targetAddress)}
                      >
                        {copiedAddr ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    {selectedReport.verificationSource && (
                      <p className="text-xs text-muted-foreground">
                        Source: {selectedReport.verificationSource}
                      </p>
                    )}
                  </div>
                  {selectedReport.explorerUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedReport.explorerUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Explorer
                      </a>
                    </Button>
                  )}
                </div>

                {sortedFindings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Findings</h3>
                    <div className="space-y-3">
                      {sortedFindings.map((finding, idx) => (
                        <div
                          key={idx}
                          className="border border-card-border rounded-lg p-4 bg-muted/20"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <code className="text-xs font-mono text-muted-foreground">{finding.code}</code>
                            <RiskBadge level={finding.severity} />
                          </div>
                          <p className="text-sm text-foreground mb-2">{finding.description}</p>
                          {finding.recommendedAction && (
                            <p className="text-xs text-primary">→ {finding.recommendedAction}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.recommendedActions && selectedReport.recommendedActions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Recommended Actions</h3>
                    <ul className="space-y-2">
                      {selectedReport.recommendedActions.map((action, idx) => (
                        <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4 border-t border-card-border">
                  <p className="text-xs text-muted-foreground">Analyzed {formatDate(selectedReport.createdAt)}</p>
                </div>
              </div>
            )}

            {!isAnalyzing && !selectedReport && (
              <div className="bg-card border border-card-border rounded-lg p-12 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No analysis selected</p>
                <p className="text-xs text-muted-foreground mt-1">Enter an address above or select from history</p>
              </div>
            )}
          </div>

          {/* History Panel */}
          <div>
            <div className="bg-card border border-card-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-card-border">
                <h3 className="text-sm font-semibold text-foreground">Recent Reports</h3>
              </div>
              {!reports || reports.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-muted-foreground">No reports yet</p>
                </div>
              ) : (
                <div className="divide-y divide-card-border max-h-[600px] overflow-y-auto">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <code className="font-mono text-xs text-foreground">
                          {report.targetAddress.slice(0, 8)}...
                        </code>
                        <RiskBadge level={report.riskLevel} className="text-xs" />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground uppercase">{report.targetType}</span>
                        <span className="text-muted-foreground">{report.findings.length} findings</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(report.createdAt)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {analyzeWallet.error && (analyzeWallet.error as any).status === 503 && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-500">API Configuration Required</p>
                    <p className="text-xs text-yellow-500/80 mt-1">
                      GoPlus API key not configured.{' '}
                      <Link href="/settings">
                        <span className="underline cursor-pointer">Configure in Settings</span>
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
