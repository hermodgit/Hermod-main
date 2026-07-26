import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@clerk/react';
import {
  useAccount, useSendTransaction, useWaitForTransactionReceipt, useWriteContract,
} from 'wagmi';
import { erc20Abi, isAddress, parseUnits, formatUnits, maxUint256 } from 'viem';
import { useReadContract } from 'wagmi';
import { useCreateTransaction, useCreateAuditLog, getListTransactionsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ExternalLink, ChevronRight, Info,
} from 'lucide-react';
import { getExplorerUrl } from '@/lib/chains';

// ── Constants ─────────────────────────────────────────────────────
const G  = 'hsl(112 100% 54%)';
const AM = 'hsl(43 100% 54%)';
const RD = 'hsl(0 100% 63%)';
const BL = 'hsl(217 100% 65%)';
const PU = 'hsl(267 100% 70%)';

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

// Aave v3 common tokens per chain
const AAVE_TOKENS: Record<number, { symbol: string; address: `0x${string}`; decimals: number }[]> = {
  1: [
    { symbol: 'USDC',  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6  },
    { symbol: 'USDT',  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6  },
    { symbol: 'DAI',   address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    { symbol: 'WETH',  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
    { symbol: 'WBTC',  address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8  },
  ],
  8453: [
    { symbol: 'USDC',  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6  },
    { symbol: 'WETH',  address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  ],
  42161: [
    { symbol: 'USDC',  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6  },
    { symbol: 'USDT',  address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6  },
    { symbol: 'WETH',  address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
  ],
  10: [
    { symbol: 'USDC',  address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6  },
    { symbol: 'WETH',  address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  ],
};

const AAVE_CHAINS = [
  { id: 1,     name: 'Ethereum'  },
  { id: 42161, name: 'Arbitrum'  },
  { id: 10,    name: 'Optimism'  },
  { id: 8453,  name: 'Base'      },
];

const UNI_CHAINS = [
  { id: 1,     name: 'Ethereum' },
  { id: 42161, name: 'Arbitrum' },
  { id: 10,    name: 'Optimism' },
  { id: 8453,  name: 'Base'     },
];

const FEE_TIERS = [
  { value: 500,   label: '0.05% — Stable pairs' },
  { value: 3000,  label: '0.30% — Most pairs'   },
  { value: 10000, label: '1.00% — Exotic pairs'  },
];

type Tab = 'lending' | 'staking' | 'liquidity' | 'bridge';
type AaveAction = 'supply' | 'borrow' | 'repay' | 'withdraw';
type StakeProtocol = 'lido' | 'rocket-pool';
type LpAction = 'add' | 'remove';
type BridgeDest = 'arbitrum' | 'optimism' | 'base';
type Step = 'form' | 'review' | 'signing' | 'done' | 'failed';

interface TxPlan {
  to: string;
  data: string;
  value: string;
  chainId: number;
  protocol: string;
  action: string;
  requiresApproval?: boolean;
  spender?: string;
  warnings: string[];
  token?: string;
  destination?: string;
}

// ── API helper ────────────────────────────────────────────────────
async function callDefiApi(path: string, body: Record<string, unknown>, token: string | null): Promise<TxPlan> {
  const res = await fetch(`${BASE_URL}/api/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error || 'API error');
  }
  return res.json();
}

// ── Sub-components ────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: 'hsl(0 0% 32%)', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Label style={{ fontSize: 10, color: 'hsl(0 0% 45%)', marginBottom: 6, display: 'block', letterSpacing: '0.06em' }}>{label}</Label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: {
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 10px', background: 'hsl(0 0% 7%)',
        border: '1px solid hsl(0 0% 14%)', borderRadius: 2, color: 'hsl(0 0% 80%)',
        fontSize: 12, fontFamily: 'Inter, sans-serif', outline: 'none', cursor: 'pointer',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {warnings.map((w, i) => (
        <div key={i} style={{
          display: 'flex', gap: 8, alignItems: 'flex-start',
          padding: '8px 10px', background: 'hsl(43 100% 54% / 0.06)',
          border: '1px solid hsl(43 100% 54% / 0.15)', borderRadius: 2,
        }}>
          <AlertTriangle size={11} style={{ color: AM, flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, color: 'hsl(0 0% 60%)', lineHeight: 1.5 }}>{w}</span>
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ plan, onSign, onBack, step }: {
  plan: TxPlan;
  onSign: () => void;
  onBack: () => void;
  step: Step;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>TRANSACTION REVIEW</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { label: 'Protocol',  value: plan.protocol },
          { label: 'Action',    value: plan.action.replace(/_/g, ' ').toUpperCase() },
          { label: 'Contract',  value: `${plan.to.slice(0, 10)}…${plan.to.slice(-8)}` },
          { label: 'Chain ID',  value: String(plan.chainId) },
          ...(plan.token ? [{ label: 'Receives', value: plan.token }] : []),
          ...(plan.destination ? [{ label: 'Destination', value: plan.destination.charAt(0).toUpperCase() + plan.destination.slice(1) }] : []),
          ...(plan.requiresApproval ? [{ label: 'Note', value: 'ERC-20 approval required before execution' }] : []),
        ].map(row => (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '7px 12px', background: 'hsl(0 0% 6%)',
            border: '1px solid hsl(0 0% 11%)', borderRadius: 2,
          }}>
            <span style={{ fontSize: 10, color: 'hsl(0 0% 38%)', fontFamily: 'Inter, sans-serif' }}>{row.label}</span>
            <span style={{ fontSize: 11, color: 'hsl(0 0% 75%)', fontFamily: 'JetBrains Mono, monospace' }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div>
        <SectionLabel>RISK WARNINGS</SectionLabel>
        <WarningList warnings={plan.warnings} />
      </div>

      <div style={{
        padding: '10px 12px', background: 'hsl(217 100% 65% / 0.06)',
        border: '1px solid hsl(217 100% 65% / 0.2)', borderRadius: 2,
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <Info size={11} style={{ color: BL, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: 'hsl(0 0% 55%)' }}>
          🔒 Supervised execution — your wallet signature is required to proceed.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="outline" size="sm" onClick={onBack} disabled={step === 'signing'}
          style={{ fontSize: 11, flex: 1 }}>
          <ArrowLeft size={12} style={{ marginRight: 4 }} /> Back
        </Button>
        <Button size="sm" onClick={onSign} disabled={step === 'signing'}
          style={{ fontSize: 11, flex: 2, background: G, color: '#000', fontWeight: 600 }}>
          {step === 'signing'
            ? <><Loader2 size={12} className="animate-spin" style={{ marginRight: 4 }} />Signing…</>
            : <>Sign & Submit <ChevronRight size={12} style={{ marginLeft: 4 }} /></>
          }
        </Button>
      </div>
    </div>
  );
}

function TxResult({ step, txHash, chainId, onReset }: {
  step: Step; txHash?: string; chainId?: number; onReset: () => void;
}) {
  const explorerUrl = txHash && chainId ? getExplorerUrl(chainId, txHash, 'tx') : null;
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
      {step === 'done'
        ? <CheckCircle2 size={40} style={{ color: G }} />
        : <XCircle size={40} style={{ color: RD }} />
      }
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: step === 'done' ? G : RD, marginBottom: 4 }}>
          {step === 'done' ? 'Transaction Submitted' : 'Transaction Failed'}
        </div>
        <div style={{ fontSize: 11, color: 'hsl(0 0% 45%)' }}>
          {step === 'done' ? 'Your transaction has been submitted and is awaiting confirmation.' : 'The transaction was rejected or failed onchain.'}
        </div>
      </div>
      {explorerUrl && (
        <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: G, display: 'flex', alignItems: 'center', gap: 4 }}>
          View on Explorer <ExternalLink size={10} />
        </a>
      )}
      <Button size="sm" onClick={onReset} style={{ fontSize: 11 }}>New Transaction</Button>
    </div>
  );
}

// ── Tab: Lending (Aave v3) ────────────────────────────────────────
function LendingTab({ address }: { address?: string }) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTx = useCreateTransaction();
  const createAuditLog = useCreateAuditLog();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const [action, setAction] = useState<AaveAction>('supply');
  const [chainId, setChainId] = useState(1);
  const [selectedToken, setSelectedToken] = useState('');
  const [customToken, setCustomToken] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [plan, setPlan] = useState<TxPlan | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | undefined>();
  const [loading, setLoading] = useState(false);

  const tokens = AAVE_TOKENS[chainId] ?? [];
  const token = tokens.find(t => t.address === selectedToken);
  const tokenAddress = (selectedToken || customToken) as `0x${string}` | undefined;
  const decimals = token?.decimals ?? 18;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: 'allowance',
    args: address && plan?.spender ? [address as `0x${string}`, plan.spender as `0x${string}`] : undefined,
    chainId,
    query: { enabled: !!address && !!tokenAddress && !!plan?.spender },
  });

  const { data: approvalReceipt } = useWaitForTransactionReceipt({ hash: approvalHash, query: { enabled: !!approvalHash } });
  const { data: txReceipt } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });

  useEffect(() => {
    if (approvalReceipt?.status === 'success' && step === 'signing') {
      refetchAllowance();
    }
  }, [approvalReceipt]);

  useEffect(() => {
    if (txReceipt && step === 'signing') {
      setStep(txReceipt.status === 'success' ? 'done' : 'failed');
    }
  }, [txReceipt]);

  const handleReview = async () => {
    if (!address) { toast({ title: 'Connect wallet first', variant: 'destructive' }); return; }
    if (!amount || !tokenAddress) { toast({ title: 'Fill all fields', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const endpoint = `defi/aave/${action}`;
      const body: Record<string, unknown> = {
        asset: tokenAddress,
        amount,
        decimals,
        userAddress: address,
        chainId,
      };
      const result = await callDefiApi(endpoint, body, token);
      setPlan(result);
      setStep('review');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!plan || !address) return;
    setStep('signing');
    try {
      // Check if approval needed
      if (plan.requiresApproval && plan.spender && tokenAddress) {
        const amtWei = parseUnits(amount, decimals);
        const needsApproval = !allowance || (allowance as bigint) < amtWei;
        if (needsApproval) {
          toast({ title: 'Approval required', description: 'Approving token spend first…' });
          const aHash = await writeContractAsync({
            abi: erc20Abi,
            address: tokenAddress,
            functionName: 'approve',
            args: [plan.spender as `0x${string}`, maxUint256],
            chainId,
          });
          setApprovalHash(aHash);
          // Wait for approval before continuing
          toast({ title: 'Waiting for approval…', description: 'Then your transaction will be submitted.' });
          return;
        }
      }
      await submitTx();
    } catch (err: any) {
      toast({ title: 'Signing failed', description: err.shortMessage ?? err.message, variant: 'destructive' });
      setStep('review');
    }
  };

  const submitTx = async () => {
    if (!plan || !address) return;
    try {
      const hash = await sendTransactionAsync({
        to: plan.to as `0x${string}`,
        data: plan.data as `0x${string}`,
        value: BigInt(plan.value),
        chainId: plan.chainId,
      });
      setTxHash(hash);
      createTx.mutate({ data: { walletAddress: address, chainId: plan.chainId, actionType: `aave_${action}`, amount, tokenSymbol: token?.symbol, riskLevel: 'medium', notes: `Aave v3 ${action}` } });
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
      toast({ title: 'Transaction submitted', description: 'Waiting for confirmation…' });
    } catch (err: any) {
      toast({ title: 'Signing failed', description: err.shortMessage ?? err.message, variant: 'destructive' });
      setStep('review');
    }
  };

  // Auto-submit tx after approval confirms
  useEffect(() => {
    if (approvalReceipt?.status === 'success' && step === 'signing' && !txHash) {
      void submitTx();
    }
  }, [approvalReceipt]);

  const reset = () => { setStep('form'); setPlan(null); setTxHash(undefined); setApprovalHash(undefined); setAmount(''); };

  if (step === 'done' || step === 'failed') return <TxResult step={step} txHash={txHash} chainId={plan?.chainId} onReset={reset} />;

  if (step === 'review' || step === 'signing') return plan
    ? <ReviewCard plan={plan} onSign={handleSign} onBack={() => setStep('form')} step={step} />
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>AAVE V3 — LENDING & BORROWING</SectionLabel>

      <Field label="ACTION">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {(['supply', 'borrow', 'repay', 'withdraw'] as AaveAction[]).map(a => (
            <button key={a} onClick={() => setAction(a)} style={{
              padding: '7px 0', fontSize: 10, fontWeight: 500, borderRadius: 2, cursor: 'pointer',
              background: action === a ? G : 'hsl(0 0% 7%)',
              border: `1px solid ${action === a ? G : 'hsl(0 0% 14%)'}`,
              color: action === a ? '#000' : 'hsl(0 0% 50%)',
              letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif',
              transition: 'all 150ms',
            }}>{a.toUpperCase()}</button>
          ))}
        </div>
      </Field>

      <Field label="NETWORK">
        <Select value={chainId} onChange={v => { setChainId(Number(v)); setSelectedToken(''); }}
          options={AAVE_CHAINS.map(c => ({ value: c.id, label: c.name }))} />
      </Field>

      <Field label="TOKEN">
        <Select value={selectedToken} onChange={setSelectedToken}
          options={[{ value: '', label: 'Select token…' }, ...tokens.map(t => ({ value: t.address, label: t.symbol })), { value: 'custom', label: 'Custom address…' }]} />
        {selectedToken === 'custom' && (
          <Input value={customToken} onChange={e => setCustomToken(e.target.value)}
            placeholder="0x…" style={{ marginTop: 6, fontSize: 11, height: 34 }} />
        )}
      </Field>

      <Field label={action === 'withdraw' ? 'AMOUNT (use "max" for full amount)' : 'AMOUNT'}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Input value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.0" style={{ fontSize: 12, height: 36 }} />
          {(action === 'repay' || action === 'withdraw') && (
            <button onClick={() => setAmount('max')} style={{
              padding: '0 12px', fontSize: 10, background: 'hsl(0 0% 9%)',
              border: '1px solid hsl(0 0% 16%)', borderRadius: 2,
              color: 'hsl(0 0% 45%)', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>MAX</button>
          )}
        </div>
      </Field>

      {action === 'borrow' && (
        <div style={{ padding: '8px 12px', background: 'hsl(0 100% 63% / 0.06)', border: '1px solid hsl(0 100% 63% / 0.2)', borderRadius: 2, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertTriangle size={11} style={{ color: RD, flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, color: 'hsl(0 0% 55%)' }}>Borrow requires sufficient collateral. Monitor your health factor to avoid liquidation.</span>
        </div>
      )}

      <Button onClick={handleReview} disabled={loading || !amount} style={{ background: G, color: '#000', fontWeight: 600, fontSize: 12 }}>
        {loading ? <><Loader2 size={13} className="animate-spin" style={{ marginRight: 6 }} />Building transaction…</> : 'Review Transaction'}
      </Button>
    </div>
  );
}

// ── Tab: Staking ──────────────────────────────────────────────────
function StakingTab({ address }: { address?: string }) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTx = useCreateTransaction();
  const { sendTransactionAsync } = useSendTransaction();

  const [protocol, setProtocol] = useState<StakeProtocol>('lido');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [plan, setPlan] = useState<TxPlan | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [loading, setLoading] = useState(false);

  const { data: txReceipt } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });
  useEffect(() => {
    if (txReceipt && step === 'signing') setStep(txReceipt.status === 'success' ? 'done' : 'failed');
  }, [txReceipt]);

  const handleReview = async () => {
    if (!address) { toast({ title: 'Connect wallet first', variant: 'destructive' }); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const result = await callDefiApi(`defi/stake/${protocol}`, { amount, userAddress: address }, token);
      setPlan(result);
      setStep('review');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!plan || !address) return;
    setStep('signing');
    try {
      const hash = await sendTransactionAsync({
        to: plan.to as `0x${string}`,
        data: plan.data as `0x${string}`,
        value: BigInt(plan.value),
        chainId: plan.chainId,
      });
      setTxHash(hash);
      createTx.mutate({ data: { walletAddress: address, chainId: plan.chainId, actionType: `stake_${protocol}`, amount, tokenSymbol: plan.token, riskLevel: 'low', notes: `${plan.protocol} liquid staking` } });
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
      toast({ title: 'Staking submitted', description: 'Waiting for confirmation…' });
    } catch (err: any) {
      toast({ title: 'Signing failed', description: err.shortMessage ?? err.message, variant: 'destructive' });
      setStep('review');
    }
  };

  const reset = () => { setStep('form'); setPlan(null); setTxHash(undefined); setAmount(''); };

  if (step === 'done' || step === 'failed') return <TxResult step={step} txHash={txHash} chainId={1} onReset={reset} />;
  if (step === 'review' || step === 'signing') return plan ? <ReviewCard plan={plan} onSign={handleSign} onBack={() => setStep('form')} step={step} /> : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>LIQUID STAKING — ETH → LST</SectionLabel>

      <Field label="PROTOCOL">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([
            { id: 'lido' as StakeProtocol,        label: 'Lido',        token: 'stETH', apy: '~3.5%' },
            { id: 'rocket-pool' as StakeProtocol, label: 'Rocket Pool', token: 'rETH',  apy: '~3.5%' },
          ]).map(p => (
            <button key={p.id} onClick={() => setProtocol(p.id)} style={{
              padding: '12px 14px', borderRadius: 2, cursor: 'pointer', textAlign: 'left',
              background: protocol === p.id ? 'hsl(112 100% 54% / 0.08)' : 'hsl(0 0% 6%)',
              border: `1px solid ${protocol === p.id ? 'hsl(112 100% 54% / 0.4)' : 'hsl(0 0% 12%)'}`,
              transition: 'all 150ms',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: protocol === p.id ? G : 'hsl(0 0% 70%)', marginBottom: 2, fontFamily: 'Inter, sans-serif' }}>{p.label}</div>
              <div style={{ fontSize: 10, color: 'hsl(0 0% 40%)' }}>Receive {p.token} · APY {p.apy}</div>
            </button>
          ))}
        </div>
      </Field>

      <div style={{ padding: '8px 12px', background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 11%)', borderRadius: 2 }}>
        <div style={{ fontSize: 10, color: 'hsl(0 0% 35%)', marginBottom: 4 }}>Network</div>
        <div style={{ fontSize: 11, color: 'hsl(0 0% 55%)' }}>Ethereum Mainnet only · Chain ID 1</div>
      </div>

      <Field label="ETH AMOUNT TO STAKE">
        <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ fontSize: 12, height: 36 }} />
        {protocol === 'rocket-pool' && (
          <div style={{ fontSize: 10, color: 'hsl(0 0% 35%)', marginTop: 4 }}>Minimum: 0.01 ETH</div>
        )}
      </Field>

      <Button onClick={handleReview} disabled={loading || !amount} style={{ background: G, color: '#000', fontWeight: 600, fontSize: 12 }}>
        {loading ? <><Loader2 size={13} className="animate-spin" style={{ marginRight: 6 }} />Building transaction…</> : 'Review Staking Transaction'}
      </Button>
    </div>
  );
}

// ── Tab: Liquidity (Uniswap v3) ───────────────────────────────────
function LiquidityTab({ address }: { address?: string }) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTx = useCreateTransaction();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const [action, setAction] = useState<LpAction>('add');
  const [chainId, setChainId] = useState(1);
  const [token0, setToken0] = useState('');
  const [token1, setToken1] = useState('');
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [fee, setFee] = useState(3000);
  const [tokenId, setTokenId] = useState('');
  const [liquidity, setLiquidity] = useState('');
  const [percentage, setPercentage] = useState('100');
  const [step, setStep] = useState<Step>('form');
  const [plan, setPlan] = useState<TxPlan | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [loading, setLoading] = useState(false);

  const { data: txReceipt } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });
  useEffect(() => {
    if (txReceipt && step === 'signing') setStep(txReceipt.status === 'success' ? 'done' : 'failed');
  }, [txReceipt]);

  const handleReview = async () => {
    if (!address) { toast({ title: 'Connect wallet first', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const tok = await getToken();
      let result: TxPlan;
      if (action === 'add') {
        if (!token0 || !token1 || !amount0 || !amount1) throw new Error('Fill all fields');
        result = await callDefiApi('defi/uniswap/add-liquidity', { token0, token1, amount0, amount1, fee, userAddress: address, chainId }, tok);
      } else {
        if (!tokenId || !liquidity) throw new Error('Position Token ID and liquidity are required');
        result = await callDefiApi('defi/uniswap/remove-liquidity', { tokenId, liquidity, percentage: Number(percentage), userAddress: address, chainId }, tok);
      }
      setPlan(result);
      setStep('review');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!plan || !address) return;
    setStep('signing');
    try {
      // Add liquidity requires approvals for both tokens
      if (action === 'add' && plan.spender) {
        for (const [tAddr] of [[token0], [token1]]) {
          if (!tAddr || !isAddress(tAddr as `0x${string}`)) continue;
          const aHash = await writeContractAsync({
            abi: erc20Abi,
            address: tAddr as `0x${string}`,
            functionName: 'approve',
            args: [plan.spender as `0x${string}`, maxUint256],
            chainId,
          });
          await new Promise(r => setTimeout(r, 500)); // brief pause
          toast({ title: 'Token approved', description: `Approving ${tAddr.slice(0, 6)}…` });
        }
      }
      const hash = await sendTransactionAsync({
        to: plan.to as `0x${string}`,
        data: plan.data as `0x${string}`,
        value: BigInt(plan.value),
        chainId: plan.chainId,
      });
      setTxHash(hash);
      createTx.mutate({ data: { walletAddress: address, chainId: plan.chainId, actionType: action === 'add' ? 'add_liquidity' : 'remove_liquidity', riskLevel: 'medium', notes: `Uniswap v3 LP ${action}` } });
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
      toast({ title: 'Transaction submitted', description: 'Waiting for confirmation…' });
    } catch (err: any) {
      toast({ title: 'Signing failed', description: err.shortMessage ?? err.message, variant: 'destructive' });
      setStep('review');
    }
  };

  const reset = () => { setStep('form'); setPlan(null); setTxHash(undefined); setAmount0(''); setAmount1(''); };

  if (step === 'done' || step === 'failed') return <TxResult step={step} txHash={txHash} chainId={plan?.chainId} onReset={reset} />;
  if (step === 'review' || step === 'signing') return plan ? <ReviewCard plan={plan} onSign={handleSign} onBack={() => setStep('form')} step={step} /> : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>UNISWAP V3 — LIQUIDITY POSITIONS</SectionLabel>

      <Field label="ACTION">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([['add', 'Add Liquidity'], ['remove', 'Remove Liquidity']] as [LpAction, string][]).map(([a, l]) => (
            <button key={a} onClick={() => setAction(a)} style={{
              padding: '9px 0', fontSize: 11, fontWeight: 500, borderRadius: 2, cursor: 'pointer',
              background: action === a ? G : 'hsl(0 0% 7%)',
              border: `1px solid ${action === a ? G : 'hsl(0 0% 14%)'}`,
              color: action === a ? '#000' : 'hsl(0 0% 50%)',
              fontFamily: 'Inter, sans-serif', transition: 'all 150ms',
            }}>{l}</button>
          ))}
        </div>
      </Field>

      <Field label="NETWORK">
        <Select value={chainId} onChange={v => setChainId(Number(v))}
          options={UNI_CHAINS.map(c => ({ value: c.id, label: c.name }))} />
      </Field>

      {action === 'add' ? (
        <>
          <Field label="TOKEN 0 ADDRESS">
            <Input value={token0} onChange={e => setToken0(e.target.value)} placeholder="0x… (e.g. USDC)" style={{ fontSize: 11, height: 34 }} />
          </Field>
          <Field label="TOKEN 1 ADDRESS">
            <Input value={token1} onChange={e => setToken1(e.target.value)} placeholder="0x… (e.g. WETH)" style={{ fontSize: 11, height: 34 }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="AMOUNT TOKEN 0">
              <Input value={amount0} onChange={e => setAmount0(e.target.value)} placeholder="0.0" style={{ fontSize: 12, height: 36 }} />
            </Field>
            <Field label="AMOUNT TOKEN 1">
              <Input value={amount1} onChange={e => setAmount1(e.target.value)} placeholder="0.0" style={{ fontSize: 12, height: 36 }} />
            </Field>
          </div>
          <Field label="FEE TIER">
            <Select value={fee} onChange={v => setFee(Number(v))}
              options={FEE_TIERS.map(f => ({ value: f.value, label: f.label }))} />
          </Field>
          <div style={{ padding: '8px 12px', background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 11%)', borderRadius: 2 }}>
            <div style={{ fontSize: 10, color: 'hsl(0 0% 35%)', marginBottom: 3 }}>Range</div>
            <div style={{ fontSize: 11, color: 'hsl(0 0% 55%)' }}>Full range — earns fees across all prices</div>
          </div>
        </>
      ) : (
        <>
          <Field label="POSITION NFT TOKEN ID">
            <Input value={tokenId} onChange={e => setTokenId(e.target.value)} placeholder="e.g. 123456" style={{ fontSize: 12, height: 36 }} />
          </Field>
          <Field label="LIQUIDITY (from position data, uint128)">
            <Input value={liquidity} onChange={e => setLiquidity(e.target.value)} placeholder="e.g. 1234567890123" style={{ fontSize: 11, height: 34 }} />
          </Field>
          <Field label="PERCENTAGE TO REMOVE">
            <div style={{ display: 'flex', gap: 6 }}>
              <Input value={percentage} onChange={e => setPercentage(e.target.value)} placeholder="100" style={{ fontSize: 12, height: 36 }} />
              {['25', '50', '75', '100'].map(p => (
                <button key={p} onClick={() => setPercentage(p)} style={{
                  padding: '0 10px', fontSize: 10, background: percentage === p ? G : 'hsl(0 0% 9%)',
                  border: `1px solid ${percentage === p ? G : 'hsl(0 0% 16%)'}`,
                  borderRadius: 2, color: percentage === p ? '#000' : 'hsl(0 0% 45%)', cursor: 'pointer',
                }}>{p}%</button>
              ))}
            </div>
          </Field>
        </>
      )}

      <Button onClick={handleReview} disabled={loading} style={{ background: G, color: '#000', fontWeight: 600, fontSize: 12 }}>
        {loading ? <><Loader2 size={13} className="animate-spin" style={{ marginRight: 6 }} />Building transaction…</> : 'Review Transaction'}
      </Button>
    </div>
  );
}

// ── Tab: Bridge ───────────────────────────────────────────────────
function BridgeTab({ address }: { address?: string }) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTx = useCreateTransaction();
  const { sendTransactionAsync } = useSendTransaction();

  const [destination, setDestination] = useState<BridgeDest>('arbitrum');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [plan, setPlan] = useState<TxPlan | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [loading, setLoading] = useState(false);

  const { data: txReceipt } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });
  useEffect(() => {
    if (txReceipt && step === 'signing') setStep(txReceipt.status === 'success' ? 'done' : 'failed');
  }, [txReceipt]);

  const handleReview = async () => {
    if (!address) { toast({ title: 'Connect wallet first', variant: 'destructive' }); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const result = await callDefiApi('defi/bridge', { destination, amount, userAddress: address }, token);
      setPlan(result);
      setStep('review');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!plan || !address) return;
    setStep('signing');
    try {
      const hash = await sendTransactionAsync({
        to: plan.to as `0x${string}`,
        data: plan.data as `0x${string}`,
        value: BigInt(plan.value),
        chainId: plan.chainId,
      });
      setTxHash(hash);
      createTx.mutate({ data: { walletAddress: address, chainId: 1, actionType: 'bridge_token', amount, tokenSymbol: 'ETH', riskLevel: 'medium', notes: `Bridge ETH to ${destination}` } });
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
      toast({ title: 'Bridge transaction submitted', description: `~10–15 min to appear on ${destination}` });
    } catch (err: any) {
      toast({ title: 'Signing failed', description: err.shortMessage ?? err.message, variant: 'destructive' });
      setStep('review');
    }
  };

  const reset = () => { setStep('form'); setPlan(null); setTxHash(undefined); setAmount(''); };

  if (step === 'done' || step === 'failed') return <TxResult step={step} txHash={txHash} chainId={1} onReset={reset} />;
  if (step === 'review' || step === 'signing') return plan ? <ReviewCard plan={plan} onSign={handleSign} onBack={() => setStep('form')} step={step} /> : null;

  const BRIDGES = [
    { id: 'arbitrum' as BridgeDest, label: 'Arbitrum One', chainId: 42161, time: '~10 min', withdrawal: '~7 days' },
    { id: 'optimism' as BridgeDest, label: 'Optimism',     chainId: 10,    time: '~10 min', withdrawal: '~7 days' },
    { id: 'base'     as BridgeDest, label: 'Base',         chainId: 8453,  time: '~10 min', withdrawal: '~7 days' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>OFFICIAL CANONICAL BRIDGES — ETHEREUM → L2</SectionLabel>

      <Field label="DESTINATION">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {BRIDGES.map(b => (
            <button key={b.id} onClick={() => setDestination(b.id)} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderRadius: 2, cursor: 'pointer', textAlign: 'left',
              background: destination === b.id ? 'hsl(112 100% 54% / 0.08)' : 'hsl(0 0% 6%)',
              border: `1px solid ${destination === b.id ? 'hsl(112 100% 54% / 0.4)' : 'hsl(0 0% 12%)'}`,
              transition: 'all 150ms',
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: destination === b.id ? G : 'hsl(0 0% 70%)', fontFamily: 'Inter, sans-serif' }}>{b.label}</div>
                <div style={{ fontSize: 10, color: 'hsl(0 0% 38%)', marginTop: 2 }}>Deposit {b.time} · Withdraw {b.withdrawal}</div>
              </div>
              {destination === b.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: G }} />}
            </button>
          ))}
        </div>
      </Field>

      <div style={{ padding: '8px 12px', background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 11%)', borderRadius: 2 }}>
        <div style={{ fontSize: 10, color: 'hsl(0 0% 35%)', marginBottom: 3 }}>From → To</div>
        <div style={{ fontSize: 11, color: 'hsl(0 0% 55%)' }}>
          Ethereum Mainnet → {BRIDGES.find(b => b.id === destination)?.label} · ETH only (official bridge)
        </div>
      </div>

      <Field label="ETH AMOUNT">
        <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ fontSize: 12, height: 36 }} />
      </Field>

      <Button onClick={handleReview} disabled={loading || !amount} style={{ background: G, color: '#000', fontWeight: 600, fontSize: 12 }}>
        {loading ? <><Loader2 size={13} className="animate-spin" style={{ marginRight: 6 }} />Building transaction…</> : 'Review Bridge Transaction'}
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function DeFi() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>('lending');

  const TABS: { id: Tab; label: string; badge?: string }[] = [
    { id: 'lending',   label: 'Lending',   badge: 'Aave v3'  },
    { id: 'staking',   label: 'Staking',   badge: 'Lido · Rocket Pool' },
    { id: 'liquidity', label: 'Liquidity', badge: 'Uniswap v3' },
    { id: 'bridge',    label: 'Bridge',    badge: 'L2s' },
  ];

  return (
    <Layout title="DeFi">
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', color: 'hsl(0 0% 35%)', textDecoration: 'none' }}>
              <ArrowLeft size={14} />
            </Link>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'hsl(0 0% 88%)', letterSpacing: '-0.02em', margin: 0 }}>DeFi</h1>
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
              color: G, background: 'hsl(112 100% 54% / 0.1)',
              border: '1px solid hsl(112 100% 54% / 0.25)',
              borderRadius: 2, padding: '2px 7px',
            }}>LIVE</span>
          </div>
          <p style={{ fontSize: 11, color: 'hsl(0 0% 38%)', margin: 0 }}>
            Supply, borrow, stake, provide liquidity, and bridge — all supervised and policy-enforced.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', borderBottom: '1px solid hsl(0 0% 10%)', marginBottom: 24, gap: 0,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '9px 4px', fontSize: 11, fontWeight: 500,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: activeTab === tab.id ? 'hsl(0 0% 88%)' : 'hsl(0 0% 38%)',
                borderBottom: activeTab === tab.id ? `2px solid ${G}` : '2px solid transparent',
                marginBottom: -1, transition: 'color 150ms', fontFamily: 'Inter, sans-serif',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Protocol badge */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            fontSize: 9, letterSpacing: '0.08em', color: 'hsl(0 0% 30%)',
            background: 'hsl(0 0% 6%)', border: '1px solid hsl(0 0% 11%)',
            borderRadius: 2, padding: '3px 8px',
          }}>
            {TABS.find(t => t.id === activeTab)?.badge}
          </span>
        </div>

        {/* Panel */}
        <div style={{
          background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 11%)',
          borderRadius: 4, padding: 24,
        }}>
          {activeTab === 'lending'   && <LendingTab   address={address} />}
          {activeTab === 'staking'   && <StakingTab   address={address} />}
          {activeTab === 'liquidity' && <LiquidityTab address={address} />}
          {activeTab === 'bridge'    && <BridgeTab    address={address} />}
        </div>

        {/* Supervised note */}
        <div style={{
          marginTop: 12, padding: '8px 12px',
          background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 9%)', borderRadius: 2,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: 'hsl(0 0% 32%)' }}>
            🔒 Supervised execution — all transactions require your wallet signature. Policy engine enforced.
          </span>
        </div>

      </div>
    </Layout>
  );
}
