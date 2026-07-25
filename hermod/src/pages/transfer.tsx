import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useAccount, useBalance, useReadContract,
  useSendTransaction, useWaitForTransactionReceipt, useWriteContract,
} from 'wagmi';
import {
  erc20Abi, isAddress, parseUnits, parseEther, formatUnits,
} from 'viem';
import {
  useCreateTransaction, useUpdateTransaction, useListWallets,
  useCreateAuditLog, getListTransactionsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import {
  ArrowRight, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Loader2,
} from 'lucide-react';
import { CHAIN_IDS, getChainName, getExplorerUrl } from '@/lib/chains';
import { getTokensForChain, type Token } from '@/lib/tokens';

type Step = 'form' | 'review' | 'signing' | 'done' | 'failed';

function isValidAddress(addr: string): boolean {
  return addr.startsWith('0x') && isAddress(addr as `0x${string}`);
}

export default function Transfer() {
  const { address: connectedAddress, chainId: connectedChainId } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: savedWallets } = useListWallets();
  const createTransaction  = useCreateTransaction();
  const updateTransaction  = useUpdateTransaction();
  const createAuditLog     = useCreateAuditLog();

  // ── Policy check ─────────────────────────────────────────
  const [policyResult, setPolicyResult] = useState<{ allowed: boolean; reason: string; noAgent?: boolean } | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);

  // ── Form state ───────────────────────────────────────────
  const [step, setStep]           = useState<Step>('form');
  const [chainId, setChainId]     = useState<number>(connectedChainId ?? 4663);
  const [token, setToken]         = useState<Token | null>(null);
  const [customToken, setCustomToken] = useState('');   // for custom ERC-20 address
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount]       = useState('');
  const [txHash, setTxHash]       = useState<`0x${string}` | undefined>();
  const [txPlanId, setTxPlanId]   = useState<string>('');

  const tokens = useMemo(() => getTokensForChain(chainId), [chainId]);
  const isNative = token?.address === null;

  // Effective token address (custom or from list)
  const tokenAddress: `0x${string}` | undefined = useMemo(() => {
    if (token?.address) return token.address;
    if (!isNative && customToken && isValidAddress(customToken)) return customToken as `0x${string}`;
    return undefined;
  }, [token, isNative, customToken]);

  // Sender address — prefer connected wallet, fall back to first saved wallet
  const senderAddress = (connectedAddress ?? savedWallets?.[0]?.address) as `0x${string}` | undefined;

  // ── Onchain reads ────────────────────────────────────────
  const { data: nativeBalance } = useBalance({
    address: senderAddress,
    chainId,
    query: { enabled: !!senderAddress && isNative },
  });

  // ERC-20 balance via balanceOf (useBalance `token` param not available in this wagmi build)
  const { data: tokenBalanceRaw } = useReadContract({
    abi:          erc20Abi,
    address:      tokenAddress,
    functionName: 'balanceOf',
    args:         senderAddress ? [senderAddress] : undefined,
    chainId,
    query: { enabled: !!senderAddress && !!tokenAddress },
  });

  const { data: tokenDecimals } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: 'decimals',
    chainId,
    query: { enabled: !!tokenAddress },
  });

  const { data: tokenSymbolOnchain } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: 'symbol',
    chainId,
    query: { enabled: !!tokenAddress && !token },
  });

  // Unify balance representation
  const nativeBalValue = nativeBalance ? { value: nativeBalance.value, decimals: nativeBalance.decimals } : null;
  const tokenBalValue  = (tokenBalanceRaw !== undefined && tokenDecimals !== undefined)
    ? { value: tokenBalanceRaw as bigint, decimals: Number(tokenDecimals) }
    : null;
  const balance        = isNative ? nativeBalValue : tokenBalValue;

  const effectiveDecimals = token?.decimals ?? Number(tokenDecimals ?? 18);
  const effectiveSymbol   = token?.symbol ?? (tokenSymbolOnchain as string) ?? 'TOKEN';

  const balanceDisplay = balance
    ? `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(6)} ${effectiveSymbol}`
    : null;

  // ── Wagmi actions ────────────────────────────────────────
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync }   = useWriteContract();

  const { data: receipt, isLoading: waitingReceipt } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  useEffect(() => {
    if (!receipt || !txPlanId) return;
    const status = receipt.status === 'success' ? 'confirmed' : 'failed';
    setStep(status === 'confirmed' ? 'done' : 'failed');
  }, [receipt]);

  // Fetch policy check whenever user reaches the review step
  useEffect(() => {
    if (step !== 'review') return;
    setPolicyResult(null);
    setPolicyLoading(true);
    fetch('/api/policy/check', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        actionType:       isNative ? 'send_native' : 'send_token',
        tokenAddress:     tokenAddress ?? null,
        tokenSymbol:      effectiveSymbol,
        amount,
        recipientAddress: recipient,
      }),
    })
      .then(r => r.json())
      .then((data) => setPolicyResult(data))
      .catch(() => setPolicyResult({ allowed: true, reason: 'Policy check skipped', noAgent: true }))
      .finally(() => setPolicyLoading(false));
  }, [step]);

  // ── Validation ───────────────────────────────────────────
  const validationErrors: string[] = [];
  if (recipient && !isValidAddress(recipient)) validationErrors.push('Invalid recipient address');
  if (amount && isNaN(Number(amount))) validationErrors.push('Invalid amount');
  if (amount && Number(amount) <= 0) validationErrors.push('Amount must be greater than 0');
  if (balance && amount) {
    try {
      const amtBig = parseUnits(amount, effectiveDecimals);
      if (amtBig > balance.value) validationErrors.push('Insufficient balance');
    } catch {}
  }
  const canReview = recipient && amount && (token || (customToken && isValidAddress(customToken))) && validationErrors.length === 0;

  // ── Sign & Submit ────────────────────────────────────────
  const handleSign = async () => {
    if (!senderAddress) {
      toast({ title: 'Wallet not connected', variant: 'destructive' });
      return;
    }
    setStep('signing');
    try {
      let hash: `0x${string}`;
      if (isNative) {
        hash = await sendTransactionAsync({
          to:      recipient as `0x${string}`,
          value:   parseEther(amount),
          chainId,
        });
      } else if (tokenAddress) {
        const decimals = effectiveDecimals;
        hash = await writeContractAsync({
          abi:          erc20Abi,
          address:      tokenAddress,
          functionName: 'transfer',
          args:         [recipient as `0x${string}`, parseUnits(amount, decimals)],
          chainId,
        });
      } else {
        throw new Error('No token selected');
      }

      setTxHash(hash);

      // Audit: transaction signed
      createAuditLog.mutate({ data: {
        walletAddress: senderAddress,
        eventType:     'transfer_signed',
        transactionHash: hash,
        status:        'success',
        eventData:     { chainId, token: effectiveSymbol, amount, recipient } as any,
      } });

      // Save to DB
      createTransaction.mutate(
        {
          data: {
            walletAddress:    senderAddress,
            chainId,
            actionType:       isNative ? 'send_native' : 'send_token',
            recipientAddress: recipient,
            tokenAddress:     tokenAddress ?? undefined,
            tokenSymbol:      effectiveSymbol,
            amount,
            riskLevel:        'low',
            riskWarnings:     [],
          },
        },
        {
          onSuccess: (plan) => {
            setTxPlanId(plan.id);
            queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
            // Persist the hash via PATCH
            updateTransaction.mutate({
              id:   plan.id,
              data: { status: 'submitted', transactionHash: hash, explorerUrl: getExplorerUrl(hash, chainId) },
            });
          },
        }
      );
    } catch (err: any) {
      // Audit: transaction failed
      createAuditLog.mutate({ data: {
        walletAddress: senderAddress,
        eventType:     'transfer_failed',
        status:        'failed',
        eventData:     { chainId, token: effectiveSymbol, error: err?.shortMessage ?? err?.message } as any,
      } });
      toast({
        title:       'Transaction failed',
        description: err?.shortMessage ?? err?.message ?? 'Unknown error',
        variant:     'destructive',
      });
      setStep('review');
    }
  };

  // ── UI helpers ───────────────────────────────────────────
  const chainOptions = CHAIN_IDS;

  return (
    <Layout title="Transfer">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/transactions">
            <Button variant="ghost" size="icon"><ArrowLeft size={16} /></Button>
          </Link>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'hsl(0 0% 88%)' }}>Transfer Tokens</h2>
            <p style={{ fontSize: 11, color: 'hsl(0 0% 40%)', marginTop: 2 }}>
              Send native or ERC-20 tokens — sign with your connected wallet
            </p>
          </div>
        </div>

        {/* Step: Form */}
        {step === 'form' && (
          <div style={{
            background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 10%)',
            borderTop: '2px solid hsl(112 100% 54%)', borderRadius: 2, padding: 24,
          }}>
            <div className="space-y-5">

              {/* Chain */}
              <div>
                <Label style={{ fontSize: 10, letterSpacing: '0.1em', color: 'hsl(0 0% 40%)' }}>CHAIN</Label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {chainOptions.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setChainId(c.id); setToken(null); }}
                      data-testid={`chain-btn-${c.id}`}
                      style={{
                        fontSize: 10, padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
                        border: `1px solid ${chainId === c.id ? 'hsl(112 100% 54% / 0.5)' : 'hsl(0 0% 14%)'}`,
                        background: chainId === c.id ? 'hsl(112 100% 54% / 0.08)' : 'transparent',
                        color: chainId === c.id ? 'hsl(112 100% 54%)' : 'hsl(0 0% 50%)',
                        transition: 'all 150ms',
                      }}
                    >{c.name}</button>
                  ))}
                </div>
              </div>

              {/* Token selection */}
              <div>
                <Label style={{ fontSize: 10, letterSpacing: '0.1em', color: 'hsl(0 0% 40%)' }}>TOKEN</Label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {tokens.map(t => (
                    <button
                      key={t.symbol + (t.address ?? 'native')}
                      onClick={() => setToken(t)}
                      data-testid={`token-btn-${t.symbol}`}
                      style={{
                        fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                        padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
                        border: `1px solid ${token?.symbol === t.symbol && token?.address === t.address ? 'hsl(112 100% 54% / 0.5)' : 'hsl(0 0% 14%)'}`,
                        background: token?.symbol === t.symbol && token?.address === t.address ? 'hsl(112 100% 54% / 0.08)' : 'transparent',
                        color: token?.symbol === t.symbol && token?.address === t.address ? 'hsl(112 100% 54%)' : 'hsl(0 0% 50%)',
                        transition: 'all 150ms',
                      }}
                    >{t.symbol}</button>
                  ))}
                </div>
                {/* Custom ERC-20 */}
                <div style={{ marginTop: 8 }}>
                  <Input
                    placeholder="Or enter custom ERC-20 address (0x...)"
                    value={customToken}
                    onChange={e => { setCustomToken(e.target.value); setToken(null); }}
                    data-testid="input-custom-token"
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
                  />
                </div>
              </div>

              {/* Balance display */}
              {balanceDisplay && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: 'hsl(0 0% 40%)' }}>BALANCE</span>
                  <button
                    onClick={() => balance && setAmount(formatUnits(balance.value, balance.decimals))}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                      color: 'hsl(112 100% 54%)', background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >{balanceDisplay} <span style={{ fontSize: 9, opacity: 0.7 }}>MAX</span></button>
                </div>
              )}

              {/* Amount */}
              <div>
                <Label style={{ fontSize: 10, letterSpacing: '0.1em', color: 'hsl(0 0% 40%)' }}>AMOUNT</Label>
                <div style={{ position: 'relative', marginTop: 6 }}>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min="0"
                    step="any"
                    data-testid="input-amount"
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, paddingRight: 60 }}
                  />
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'hsl(0 0% 40%)',
                  }}>{effectiveSymbol}</span>
                </div>
              </div>

              {/* Recipient */}
              <div>
                <Label style={{ fontSize: 10, letterSpacing: '0.1em', color: 'hsl(0 0% 40%)' }}>RECIPIENT ADDRESS</Label>
                <Input
                  placeholder="0x..."
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  data-testid="input-recipient"
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, marginTop: 6 }}
                />
              </div>

              {/* Sender info */}
              {senderAddress && (
                <div style={{ padding: '10px 12px', background: 'hsl(0 0% 7%)', border: '1px solid hsl(0 0% 12%)', borderRadius: 2 }}>
                  <span style={{ fontSize: 9, color: 'hsl(0 0% 35%)', letterSpacing: '0.1em' }}>FROM</span>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'hsl(0 0% 70%)', marginTop: 2 }}>
                    {senderAddress.slice(0, 20)}...{senderAddress.slice(-8)}
                  </div>
                </div>
              )}

              {!connectedAddress && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '10px 12px', background: 'hsl(40 100% 50% / 0.06)', border: '1px solid hsl(40 100% 50% / 0.2)', borderRadius: 2 }}>
                  <AlertTriangle size={13} style={{ color: 'hsl(40 100% 50%)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'hsl(40 100% 50%)' }}>
                    Connect your wallet to sign and submit the transaction.
                  </span>
                </div>
              )}

              {/* Validation errors */}
              {validationErrors.map((err, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <XCircle size={12} style={{ color: 'hsl(0 100% 63%)' }} />
                  <span style={{ fontSize: 11, color: 'hsl(0 100% 63%)' }}>{err}</span>
                </div>
              ))}

              <Button
                className="w-full"
                onClick={() => setStep('review')}
                disabled={!canReview}
                data-testid="btn-review"
              >
                Review Transaction <ArrowRight size={13} />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div style={{
            background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 10%)',
            borderTop: '2px solid hsl(40 100% 50%)', borderRadius: 2, padding: 24,
          }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'hsl(0 0% 80%)', marginBottom: 16, letterSpacing: '0.06em' }}>
              REVIEW TRANSACTION
            </h3>

            <div className="space-y-3">
              {[
                { label: 'Action',    value: isNative ? 'Send Native' : 'Send Token' },
                { label: 'Chain',     value: getChainName(chainId) },
                { label: 'Token',     value: effectiveSymbol },
                { label: 'Amount',    value: `${amount} ${effectiveSymbol}` },
                { label: 'From',      value: senderAddress ? `${senderAddress.slice(0,12)}...${senderAddress.slice(-8)}` : '—' },
                { label: 'To',        value: `${recipient.slice(0,12)}...${recipient.slice(-8)}` },
                ...(tokenAddress ? [{ label: 'Token Contract', value: `${tokenAddress.slice(0,12)}...${tokenAddress.slice(-8)}` }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid hsl(0 0% 9%)' }}>
                  <span style={{ fontSize: 10, color: 'hsl(0 0% 40%)', letterSpacing: '0.08em' }}>{row.label.toUpperCase()}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'hsl(0 0% 80%)' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Policy check status */}
            <div data-testid="policy-check" style={{
              marginTop: 16, padding: '10px 12px', borderRadius: 2,
              background: policyLoading ? 'hsl(0 0% 7%)' : policyResult?.allowed === false ? 'hsl(0 100% 63% / 0.06)' : 'hsl(112 100% 54% / 0.05)',
              border: `1px solid ${policyLoading ? 'hsl(0 0% 12%)' : policyResult?.allowed === false ? 'hsl(0 100% 63% / 0.25)' : 'hsl(112 100% 54% / 0.2)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {policyLoading
                  ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: 'hsl(0 0% 40%)' }} />
                  : policyResult?.allowed === false
                  ? <XCircle size={12} style={{ color: 'hsl(0 100% 63%)' }} />
                  : <CheckCircle2 size={12} style={{ color: 'hsl(112 100% 54%)' }} />}
                <span style={{ fontSize: 10, fontWeight: 600, color: 'hsl(0 0% 45%)', letterSpacing: '0.08em' }}>POLICY CHECK</span>
                <span style={{ fontSize: 10, color: policyResult?.allowed === false ? 'hsl(0 100% 63%)' : 'hsl(112 100% 54%)' }}>
                  {policyLoading ? 'Checking policy...' : (policyResult?.reason ?? 'Passed')}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 12, padding: '10px 12px', background: 'hsl(40 100% 50% / 0.06)', border: '1px solid hsl(40 100% 50% / 0.2)', borderRadius: 2, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertTriangle size={13} style={{ color: 'hsl(40 100% 50%)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 11, color: 'hsl(40 100% 50%)', fontWeight: 600 }}>Confirm before signing</p>
                <p style={{ fontSize: 10, color: 'hsl(40 100% 50% / 0.8)', marginTop: 2, lineHeight: 1.6 }}>
                  Verify the recipient address carefully. Blockchain transactions are irreversible. Your wallet will request confirmation.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Button variant="outline" className="flex-1" onClick={() => setStep('form')} data-testid="btn-back">
                <ArrowLeft size={13} /> Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleSign}
                disabled={!connectedAddress || policyResult?.allowed === false}
                data-testid="btn-sign"
              >
                Sign & Send <ArrowRight size={13} />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Signing / Waiting */}
        {step === 'signing' && (
          <div style={{
            background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 10%)', borderRadius: 2,
            padding: 40, textAlign: 'center',
          }}>
            <Loader2 size={32} style={{ color: 'hsl(112 100% 54%)', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'hsl(0 0% 70%)' }}>
              {txHash ? 'Waiting for confirmation...' : 'Waiting for wallet signature...'}
            </p>
            {txHash && (
              <a
                href={getExplorerUrl(txHash, chainId)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 10, color: 'hsl(168 100% 50%)', textDecoration: 'none' }}
              >
                <ExternalLink size={11} />
                View on Explorer
              </a>
            )}
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div style={{
            background: 'hsl(0 0% 5%)', border: '1px solid hsl(112 100% 54% / 0.3)',
            borderTop: '2px solid hsl(112 100% 54%)', borderRadius: 2, padding: 40, textAlign: 'center',
          }}>
            <CheckCircle2 size={40} style={{ color: 'hsl(112 100% 54%)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(0 0% 88%)' }}>Transaction Confirmed</p>
            <p style={{ fontSize: 11, color: 'hsl(0 0% 45%)', marginTop: 6 }}>
              {amount} {effectiveSymbol} sent successfully
            </p>
            {txHash && (
              <a
                href={getExplorerUrl(txHash, chainId)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 16, fontSize: 11, color: 'hsl(112 100% 54%)', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}
              >
                <ExternalLink size={12} />
                {txHash.slice(0, 20)}...
              </a>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center' }}>
              {txPlanId && (
                <Link href={`/transactions/${txPlanId}`}>
                  <Button variant="outline" size="sm">View Plan</Button>
                </Link>
              )}
              <Button size="sm" onClick={() => { setStep('form'); setAmount(''); setRecipient(''); setTxHash(undefined); }}>
                New Transfer
              </Button>
            </div>
          </div>
        )}

        {/* Step: Failed */}
        {step === 'failed' && (
          <div style={{
            background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 100% 63% / 0.3)',
            borderTop: '2px solid hsl(0 100% 63%)', borderRadius: 2, padding: 40, textAlign: 'center',
          }}>
            <XCircle size={40} style={{ color: 'hsl(0 100% 63%)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(0 0% 88%)' }}>Transaction Failed</p>
            {txHash && (
              <a href={getExplorerUrl(txHash, chainId)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 10, color: 'hsl(0 100% 63%)', textDecoration: 'none' }}>
                <ExternalLink size={11} /> View on Explorer
              </a>
            )}
            <Button variant="outline" size="sm" style={{ marginTop: 16 }} onClick={() => setStep('review')}>
              Try Again
            </Button>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Layout>
  );
}
