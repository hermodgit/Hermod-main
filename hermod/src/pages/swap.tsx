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
  erc20Abi, isAddress, parseUnits, formatUnits, maxUint256,
} from 'viem';
import {
  useGetSwapQuote, useCreateTransaction, useUpdateTransaction,
  useCreateAuditLog, getListTransactionsQueryKey, getGetSwapQuoteQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  ArrowLeft, ArrowDownUp, ArrowRight, ExternalLink, Loader2,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Info,
} from 'lucide-react';
import { CHAIN_IDS, getChainName, getExplorerUrl } from '@/lib/chains';
import { getTokensForChain, type Token } from '@/lib/tokens';

type Step = 'form' | 'review' | 'approving' | 'swapping' | 'done' | 'failed';

function isValidAddr(a: string): a is `0x${string}` {
  return a.startsWith('0x') && isAddress(a as `0x${string}`);
}

export default function Swap() {
  const { address, chainId: connectedChainId } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const createAuditLog    = useCreateAuditLog();

  // ── Policy check ─────────────────────────────────────────
  const [policyResult, setPolicyResult] = useState<{ allowed: boolean; reason: string; noAgent?: boolean } | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);

  // ── Form state ───────────────────────────────────────────
  const [step, setStep]         = useState<Step>('form');
  const [chainId, setChainId]   = useState(connectedChainId ?? 4663);
  const [sellToken, setSellToken] = useState<Token | null>(null);
  const [buyToken, setBuyToken]   = useState<Token | null>(null);
  const [sellAmount, setSellAmount] = useState('');
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | undefined>();
  const [swapHash, setSwapHash]   = useState<`0x${string}` | undefined>();
  const [txPlanId, setTxPlanId]   = useState('');
  const [slippage] = useState('0.5');

  const tokens = useMemo(() => getTokensForChain(chainId), [chainId]);

  const sellDecimals = sellToken?.decimals ?? 18;

  // Convert human amount → base units for API
  const sellAmountBase = useMemo(() => {
    if (!sellAmount || isNaN(Number(sellAmount)) || Number(sellAmount) <= 0) return '';
    try { return parseUnits(sellAmount, sellDecimals).toString(); } catch { return ''; }
  }, [sellAmount, sellDecimals]);

  // Effective token identifiers for 0x (use symbol for native, address for ERC-20)
  const sellTokenId = sellToken?.address ?? sellToken?.symbol ?? '';
  const buyTokenId  = buyToken?.address  ?? buyToken?.symbol  ?? '';

  // ── Swap quote ──────────────────────────────────────────
  const canFetchQuote = !!sellTokenId && !!buyTokenId && !!sellAmountBase && sellToken?.symbol !== buyToken?.symbol;

  const swapParams = { sellToken: sellTokenId, buyToken: buyTokenId, sellAmount: sellAmountBase, chainId };
  const { data: quote, isLoading: quoteLoading, error: quoteError, refetch: refetchQuote } = useGetSwapQuote(
    swapParams,
    { query: { enabled: canFetchQuote, staleTime: 30_000, retry: false, queryKey: getGetSwapQuoteQueryKey(swapParams) } }
  );

  // ── Balance & allowance ─────────────────────────────────
  // Native balance
  const { data: nativeSellBalance } = useBalance({
    address,
    chainId,
    query: { enabled: !!address && !!sellToken && !sellToken.address },
  });
  // ERC-20 balance via balanceOf (useBalance token param not available in this wagmi build)
  const { data: erc20SellBalanceRaw } = useReadContract({
    abi:          erc20Abi,
    address:      sellToken?.address ?? '0x0',
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    chainId,
    query: { enabled: !!address && !!sellToken?.address },
  });
  const { data: erc20Decimals } = useReadContract({
    abi:          erc20Abi,
    address:      sellToken?.address ?? '0x0',
    functionName: 'decimals',
    chainId,
    query: { enabled: !!sellToken?.address },
  });
  const sellBalance = useMemo(() => {
    if (!sellToken) return null;
    if (!sellToken.address) {
      return nativeSellBalance ? { value: nativeSellBalance.value, decimals: nativeSellBalance.decimals } : null;
    }
    if (erc20SellBalanceRaw !== undefined) {
      return { value: erc20SellBalanceRaw as bigint, decimals: Number(erc20Decimals ?? sellToken.decimals) };
    }
    return null;
  }, [sellToken, nativeSellBalance, erc20SellBalanceRaw, erc20Decimals]);

  // ERC-20 allowance check (0x router address from quote)
  const spender = (quote?.to ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi:          erc20Abi,
    address:      (sellToken?.address ?? '0x0') as `0x${string}`,
    functionName: 'allowance',
    args:         [address ?? '0x0', spender],
    chainId,
    query: { enabled: !!address && !!sellToken?.address && !!quote?.to },
  });

  const needsApproval = useMemo(() => {
    if (!sellToken?.address || !sellAmountBase || !allowance) return false;
    try { return allowance < BigInt(sellAmountBase); }
    catch { return false; }
  }, [sellToken, sellAmountBase, allowance]);

  // ── Wagmi actions ────────────────────────────────────────
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync }   = useWriteContract();

  const { data: approvalReceipt } = useWaitForTransactionReceipt({
    hash:  approvalHash,
    query: { enabled: !!approvalHash },
  });

  const { data: swapReceipt } = useWaitForTransactionReceipt({
    hash:  swapHash,
    query: { enabled: !!swapHash },
  });

  useEffect(() => {
    if (approvalReceipt) {
      refetchAllowance();
      if (approvalReceipt.status === 'success') {
        toast({ title: 'Approval confirmed', description: 'Now submitting swap...' });
        void doSwap();
      } else {
        toast({ title: 'Approval failed', variant: 'destructive' });
        setStep('review');
      }
    }
  }, [approvalReceipt]);

  useEffect(() => {
    if (swapReceipt) {
      setStep(swapReceipt.status === 'success' ? 'done' : 'failed');
    }
  }, [swapReceipt]);

  // Fetch policy check when entering review step
  useEffect(() => {
    if (step !== 'review') return;
    setPolicyResult(null);
    setPolicyLoading(true);
    fetch('/api/policy/check', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        actionType:   'swap_token',
        tokenAddress: sellToken?.address ?? null,
        tokenSymbol:  sellToken?.symbol ?? null,
        protocol:     '0x',
        amount:       sellAmount,
      }),
    })
      .then(r => r.json())
      .then((data) => setPolicyResult(data))
      .catch(() => setPolicyResult({ allowed: true, reason: 'Policy check skipped', noAgent: true }))
      .finally(() => setPolicyLoading(false));
  }, [step]);

  // ── Buy amount display ───────────────────────────────────
  const buyAmountDisplay = useMemo(() => {
    if (!quote?.buyAmount || !buyToken) return null;
    try {
      const formatted = parseFloat(formatUnits(BigInt(quote.buyAmount), buyToken.decimals));
      return formatted.toFixed(6);
    } catch { return null; }
  }, [quote, buyToken]);

  const priceDisplay = quote?.price ? parseFloat(quote.price).toFixed(6) : null;
  const gasDisplay   = quote?.estimatedGas ? `~${Number(quote.estimatedGas).toLocaleString()} gas` : null;

  // ── Insufficient balance ─────────────────────────────────
  const insufficientBalance = useMemo(() => {
    if (!sellBalance || !sellAmountBase) return false;
    try { return BigInt(sellAmountBase) > sellBalance.value; }
    catch { return false; }
  }, [sellBalance, sellAmountBase]);

  // ── Actions ──────────────────────────────────────────────
  const doApprove = async () => {
    if (!sellToken?.address || !address || !quote?.to) return;
    setStep('approving');
    try {
      const hash = await writeContractAsync({
        abi:          erc20Abi,
        address:      sellToken.address as `0x${string}`,
        functionName: 'approve',
        args:         [quote.to as `0x${string}`, maxUint256],
        chainId,
      });
      setApprovalHash(hash);
      createAuditLog.mutate({ data: {
        walletAddress:   address,
        eventType:       'token_approved',
        transactionHash: hash,
        status:          'success',
        eventData:       { chainId, token: sellToken.symbol, spender: quote.to } as any,
      } });
    } catch (err: any) {
      createAuditLog.mutate({ data: {
        walletAddress: address,
        eventType:     'token_approve_failed',
        status:        'failed',
        eventData:     { chainId, token: sellToken.symbol, error: err?.shortMessage ?? err?.message } as any,
      } });
      toast({ title: 'Approval failed', description: err?.shortMessage ?? err?.message, variant: 'destructive' });
      setStep('review');
    }
  };

  const doSwap = async () => {
    if (!quote || !address) return;
    setStep('swapping');
    try {
      const hash = await sendTransactionAsync({
        to:      quote.to as `0x${string}`,
        data:    quote.data as `0x${string}`,
        value:   quote.value ? BigInt(quote.value) : 0n,
        chainId,
      });
      setSwapHash(hash);

      // Audit: swap signed
      createAuditLog.mutate({ data: {
        walletAddress:   address,
        eventType:       'swap_signed',
        transactionHash: hash,
        status:          'success',
        eventData:       { chainId, sell: sellToken?.symbol, buy: buyToken?.symbol, amount: sellAmount } as any,
      } });

      createTransaction.mutate(
        {
          data: {
            walletAddress:    address,
            chainId,
            actionType:       'swap_token',
            tokenAddress:     sellToken?.address ?? undefined,
            tokenSymbol:      `${sellToken?.symbol} → ${buyToken?.symbol}`,
            amount:           sellAmount,
            riskLevel:        'low',
            riskWarnings:     [],
            notes:            `Swap ${sellAmount} ${sellToken?.symbol} → ${buyAmountDisplay} ${buyToken?.symbol} via 0x`,
          },
        },
        {
          onSuccess: (plan) => {
            setTxPlanId(plan.id);
            queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
            updateTransaction.mutate({
              id:   plan.id,
              data: { status: 'submitted', transactionHash: hash, explorerUrl: getExplorerUrl(hash, chainId) },
            });
          },
        }
      );
    } catch (err: any) {
      createAuditLog.mutate({ data: {
        walletAddress: address,
        eventType:     'swap_failed',
        status:        'failed',
        eventData:     { chainId, sell: sellToken?.symbol, buy: buyToken?.symbol, error: err?.shortMessage ?? err?.message } as any,
      } });
      toast({ title: 'Swap failed', description: err?.shortMessage ?? err?.message, variant: 'destructive' });
      setStep('review');
    }
  };

  const handleExecute = async () => {
    if (!quote || !address) return;
    if (needsApproval) {
      await doApprove();
    } else {
      await doSwap();
    }
  };

  // ── Token picker row ─────────────────────────────────────
  const TokenPicker = ({ label, selected, onSelect, exclude }: {
    label: string; selected: Token | null;
    onSelect: (t: Token) => void; exclude?: Token | null;
  }) => (
    <div>
      <Label style={{ fontSize: 10, letterSpacing: '0.1em', color: 'hsl(0 0% 40%)' }}>{label}</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {tokens
          .filter(t => !(exclude?.symbol === t.symbol && exclude?.address === t.address))
          .map(t => (
            <button
              key={t.symbol + (t.address ?? 'n')}
              onClick={() => onSelect(t)}
              style={{
                fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                padding: '4px 10px', borderRadius: 2, cursor: 'pointer', transition: 'all 150ms',
                border: `1px solid ${selected?.symbol === t.symbol && selected?.address === t.address ? 'hsl(168 100% 50% / 0.5)' : 'hsl(0 0% 14%)'}`,
                background: selected?.symbol === t.symbol && selected?.address === t.address ? 'hsl(168 100% 50% / 0.08)' : 'transparent',
                color: selected?.symbol === t.symbol && selected?.address === t.address ? 'hsl(168 100% 50%)' : 'hsl(0 0% 50%)',
              }}
            >{t.symbol}</button>
          ))}
      </div>
    </div>
  );

  const canReview = !!sellToken && !!buyToken && !!sellAmount && !insufficientBalance && !!quote && !quoteError;

  return (
    <Layout title="Swap">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/transactions">
            <Button variant="ghost" size="icon"><ArrowLeft size={16} /></Button>
          </Link>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'hsl(0 0% 88%)' }}>Swap Tokens</h2>
            <p style={{ fontSize: 11, color: 'hsl(0 0% 40%)', marginTop: 2 }}>
              Real quotes via 0x Protocol — sign and submit with your connected wallet
            </p>
          </div>
        </div>

        {/* Form + Quote */}
        {(step === 'form' || step === 'review') && (
          <div style={{
            background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 10%)',
            borderTop: '2px solid hsl(168 100% 50%)', borderRadius: 2, padding: 24,
          }}>
            <div className="space-y-5">

              {/* Chain */}
              <div>
                <Label style={{ fontSize: 10, letterSpacing: '0.1em', color: 'hsl(0 0% 40%)' }}>CHAIN</Label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {CHAIN_IDS.map(c => (
                    <button key={c.id} onClick={() => { setChainId(c.id); setSellToken(null); setBuyToken(null); }}
                      data-testid={`chain-btn-${c.id}`}
                      style={{
                        fontSize: 10, padding: '4px 10px', borderRadius: 2, cursor: 'pointer', transition: 'all 150ms',
                        border: `1px solid ${chainId === c.id ? 'hsl(168 100% 50% / 0.5)' : 'hsl(0 0% 14%)'}`,
                        background: chainId === c.id ? 'hsl(168 100% 50% / 0.08)' : 'transparent',
                        color: chainId === c.id ? 'hsl(168 100% 50%)' : 'hsl(0 0% 50%)',
                      }}
                    >{c.name}</button>
                  ))}
                </div>
              </div>

              {/* Sell token */}
              <TokenPicker label="SELL TOKEN" selected={sellToken} onSelect={setSellToken} exclude={buyToken} />

              {/* Sell amount */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Label style={{ fontSize: 10, letterSpacing: '0.1em', color: 'hsl(0 0% 40%)' }}>SELL AMOUNT</Label>
                  {sellBalance && (
                    <button
                      onClick={() => setSellAmount(formatUnits(sellBalance.value, sellBalance.decimals))}
                      style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(168 100% 50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {parseFloat(formatUnits(sellBalance.value, sellBalance.decimals)).toFixed(4)} MAX
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={sellAmount}
                    onChange={e => setSellAmount(e.target.value)}
                    min="0" step="any"
                    data-testid="input-sell-amount"
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, paddingRight: 64 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'hsl(0 0% 40%)' }}>
                    {sellToken?.symbol ?? '—'}
                  </span>
                </div>
                {insufficientBalance && (
                  <p style={{ fontSize: 10, color: 'hsl(0 100% 63%)', marginTop: 4 }}>Insufficient balance</p>
                )}
              </div>

              {/* Swap direction */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  onClick={() => { const s = sellToken; setSellToken(buyToken); setBuyToken(s); }}
                  style={{
                    width: 32, height: 32, borderRadius: 2, background: 'hsl(0 0% 7%)',
                    border: '1px solid hsl(0 0% 14%)', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: 'hsl(0 0% 40%)',
                    transition: 'all 150ms',
                  }}
                  title="Swap directions"
                ><ArrowDownUp size={13} /></button>
              </div>

              {/* Buy token */}
              <TokenPicker label="BUY TOKEN" selected={buyToken} onSelect={setBuyToken} exclude={sellToken} />

              {/* Quote section */}
              {canFetchQuote && (
                <div style={{ background: 'hsl(0 0% 7%)', border: '1px solid hsl(0 0% 12%)', borderRadius: 2, padding: 14 }}>
                  {quoteLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Loader2 size={12} style={{ color: 'hsl(168 100% 50%)', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 11, color: 'hsl(0 0% 45%)' }}>Fetching quote...</span>
                    </div>
                  )}
                  {quoteError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={12} style={{ color: 'hsl(0 100% 63%)' }} />
                      <span style={{ fontSize: 11, color: 'hsl(0 100% 63%)' }}>
                        {(quoteError as any)?.message?.includes('not configured')
                          ? 'Swap provider not configured — add ZERO_X_API_KEY to enable quotes.'
                          : 'Quote unavailable for this pair. Try a different token or amount.'}
                      </span>
                    </div>
                  )}
                  {quote && !quoteLoading && (
                    <div className="space-y-2">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'hsl(0 0% 40%)', letterSpacing: '0.08em' }}>YOU RECEIVE</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: 'hsl(112 100% 54%)' }}>
                          ≈ {buyAmountDisplay} {buyToken?.symbol}
                        </span>
                      </div>
                      {[
                        { label: 'Price',     value: priceDisplay ? `1 ${sellToken?.symbol} = ${priceDisplay} ${buyToken?.symbol}` : '—' },
                        { label: 'Slippage',  value: `${slippage}%` },
                        { label: 'Provider',  value: quote.provider ?? '0x Protocol' },
                        { label: 'Est. Gas',  value: gasDisplay ?? '—' },
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10, color: 'hsl(0 0% 38%)' }}>{row.label}</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(0 0% 65%)' }}>{row.value}</span>
                        </div>
                      ))}
                      {needsApproval && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', padding: '6px 8px', background: 'hsl(40 100% 50% / 0.06)', border: '1px solid hsl(40 100% 50% / 0.2)', borderRadius: 2 }}>
                          <Info size={11} style={{ color: 'hsl(40 100% 50%)', flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: 'hsl(40 100% 50%)' }}>
                            Approval required — you will sign 2 transactions: first approve, then swap.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!address && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '10px 12px', background: 'hsl(40 100% 50% / 0.06)', border: '1px solid hsl(40 100% 50% / 0.2)', borderRadius: 2 }}>
                  <AlertTriangle size={13} style={{ color: 'hsl(40 100% 50%)' }} />
                  <span style={{ fontSize: 11, color: 'hsl(40 100% 50%)' }}>Connect your wallet to execute the swap.</span>
                </div>
              )}

              {/* Policy check status */}
              {step === 'review' && (
                <div data-testid="policy-check" style={{
                  padding: '10px 12px', borderRadius: 2,
                  background: policyLoading ? 'hsl(0 0% 7%)' : policyResult?.allowed === false ? 'hsl(0 100% 63% / 0.06)' : 'hsl(168 100% 50% / 0.05)',
                  border: `1px solid ${policyLoading ? 'hsl(0 0% 12%)' : policyResult?.allowed === false ? 'hsl(0 100% 63% / 0.25)' : 'hsl(168 100% 50% / 0.2)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {policyLoading
                      ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: 'hsl(0 0% 40%)' }} />
                      : policyResult?.allowed === false
                      ? <XCircle size={12} style={{ color: 'hsl(0 100% 63%)' }} />
                      : <CheckCircle2 size={12} style={{ color: 'hsl(168 100% 50%)' }} />}
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'hsl(0 0% 45%)', letterSpacing: '0.08em' }}>POLICY CHECK</span>
                    <span style={{ fontSize: 10, color: policyResult?.allowed === false ? 'hsl(0 100% 63%)' : 'hsl(168 100% 50%)' }}>
                      {policyLoading ? 'Checking policy...' : (policyResult?.reason ?? 'Passed')}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                {canFetchQuote && (
                  <Button variant="outline" size="sm" onClick={() => refetchQuote()} data-testid="btn-refresh-quote">
                    <RefreshCw size={12} /> Refresh
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={handleExecute}
                  disabled={!canReview || !address || policyResult?.allowed === false}
                  data-testid="btn-execute-swap"
                >
                  {needsApproval ? 'Approve & Swap' : 'Swap'} <ArrowRight size={13} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Approving */}
        {step === 'approving' && (
          <div style={{ background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 10%)', borderRadius: 2, padding: 40, textAlign: 'center' }}>
            <Loader2 size={32} style={{ color: 'hsl(40 100% 50%)', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'hsl(0 0% 70%)', fontWeight: 500 }}>Step 1: Approve token</p>
            <p style={{ fontSize: 11, color: 'hsl(0 0% 40%)', marginTop: 6 }}>
              {approvalHash ? 'Waiting for approval confirmation...' : 'Sign the approval in your wallet...'}
            </p>
            {approvalHash && (
              <a href={getExplorerUrl(approvalHash, chainId)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 10, color: 'hsl(168 100% 50%)', textDecoration: 'none' }}>
                <ExternalLink size={11} /> View approval on explorer
              </a>
            )}
          </div>
        )}

        {/* Swapping */}
        {step === 'swapping' && (
          <div style={{ background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 10%)', borderRadius: 2, padding: 40, textAlign: 'center' }}>
            <Loader2 size={32} style={{ color: 'hsl(168 100% 50%)', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'hsl(0 0% 70%)', fontWeight: 500 }}>
              {needsApproval ? 'Step 2: Executing swap...' : 'Executing swap...'}
            </p>
            <p style={{ fontSize: 11, color: 'hsl(0 0% 40%)', marginTop: 6 }}>
              {swapHash ? 'Waiting for confirmation...' : 'Sign the swap in your wallet...'}
            </p>
            {swapHash && (
              <a href={getExplorerUrl(swapHash, chainId)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 10, color: 'hsl(168 100% 50%)', textDecoration: 'none' }}>
                <ExternalLink size={11} /> View on explorer
              </a>
            )}
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div style={{ background: 'hsl(0 0% 5%)', border: '1px solid hsl(112 100% 54% / 0.3)', borderTop: '2px solid hsl(112 100% 54%)', borderRadius: 2, padding: 40, textAlign: 'center' }}>
            <CheckCircle2 size={40} style={{ color: 'hsl(112 100% 54%)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(0 0% 88%)' }}>Swap Confirmed</p>
            <p style={{ fontSize: 11, color: 'hsl(0 0% 45%)', marginTop: 6 }}>
              {sellAmount} {sellToken?.symbol} → ≈{buyAmountDisplay} {buyToken?.symbol}
            </p>
            {swapHash && (
              <a href={getExplorerUrl(swapHash, chainId)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 16, fontSize: 11, color: 'hsl(112 100% 54%)', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}>
                <ExternalLink size={12} />{swapHash.slice(0, 20)}...
              </a>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center' }}>
              {txPlanId && <Link href={`/transactions/${txPlanId}`}><Button variant="outline" size="sm">View Plan</Button></Link>}
              <Button size="sm" onClick={() => { setStep('form'); setSellAmount(''); setSwapHash(undefined); setApprovalHash(undefined); }}>
                New Swap
              </Button>
            </div>
          </div>
        )}

        {/* Failed */}
        {step === 'failed' && (
          <div style={{ background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 100% 63% / 0.3)', borderTop: '2px solid hsl(0 100% 63%)', borderRadius: 2, padding: 40, textAlign: 'center' }}>
            <XCircle size={40} style={{ color: 'hsl(0 100% 63%)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(0 0% 88%)' }}>Swap Failed</p>
            {swapHash && (
              <a href={getExplorerUrl(swapHash, chainId)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 10, color: 'hsl(0 100% 63%)', textDecoration: 'none' }}>
                <ExternalLink size={11} /> View on explorer
              </a>
            )}
            <Button variant="outline" size="sm" style={{ marginTop: 16 }} onClick={() => setStep('form')}>Try Again</Button>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Layout>
  );
}
