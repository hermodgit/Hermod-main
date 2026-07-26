import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useAccount, useSendTransaction, useWaitForTransactionReceipt, useWriteContract,
} from 'wagmi';
import { erc20Abi, isAddress, parseUnits, parseEther } from 'viem';
import {
  useParseIntent, useCreateTransaction, useListWallets,
  getListTransactionsQueryKey, type ParsedIntent,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import {
  Bot, Send, AlertTriangle, CheckCircle2, ArrowRight, Loader2,
  ExternalLink, XCircle, User, Cpu, RefreshCw,
} from 'lucide-react';
import { CHAIN_IDS, getChainName, getExplorerUrl } from '@/lib/chains';
import { getExplorerUrl as explorerUrl } from '@/lib/chains';

interface Message {
  role:    'user' | 'assistant' | 'system';
  content: string;
  plan?:   ParsedIntent;
  error?:  string;
  txPlanId?: string;
  txHash?: string;
  chainId?: number;
}

const EXAMPLE_PROMPTS = [
  'Send 0.01 ETH to 0x1234567890123456789012345678901234567890',
  'Analyze wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 for risks',
  'Swap 100 USDC to ETH on Base',
  'Create a weekly payment rule of 50 USDC',
  'Check if 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 is a safe token',
  'Revoke all unlimited token approvals',
];

// Fully executable now (wallet signs on this page)
const ACTIONABLE_TYPES = ['send_native', 'send_token', 'approve_token', 'revoke_approval'];

// AI can plan these but UI redirects to dedicated page / shows "coming soon"
const SWAP_TYPE = 'swap_token';
const DEFI_INTENT_TYPES = ['lend_token', 'borrow_token', 'stake_token', 'add_liquidity', 'remove_liquidity', 'claim_rewards', 'bridge_token'];

const DEFI_LABELS: Record<string, { label: string; icon: string; note: string }> = {
  lend_token:       { label: 'Supply / Lend',       icon: '🏦', note: 'Aave, Compound, Morpho' },
  borrow_token:     { label: 'Borrow',               icon: '💳', note: 'Collateral required — liquidation risk' },
  stake_token:      { label: 'Stake',                icon: '🔒', note: 'Lido, Rocket Pool, native staking' },
  add_liquidity:    { label: 'Add Liquidity',        icon: '💧', note: 'Uniswap LP, Curve, Balancer' },
  remove_liquidity: { label: 'Remove Liquidity',     icon: '🔓', note: 'Withdraw LP position' },
  claim_rewards:    { label: 'Claim Rewards',        icon: '🎁', note: 'Yield, staking rewards, LP fees' },
  bridge_token:     { label: 'Bridge Cross-chain',   icon: '🌉', note: 'Arbitrum, Optimism, Base bridges' },
};

export default function AIAssistant() {
  const { address, chainId: connectedChainId } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: wallets } = useListWallets();

  const [messages, setMessages] = useState<Message[]>([
    {
      role:    'assistant',
      content: 'I am Hermod — your onchain financial execution planner. Describe what you want to do and I will convert it into a structured, verifiable transaction plan. I never execute without your explicit wallet signature.',
    },
  ]);
  const [input, setInput]         = useState('');
  const [chainId, setChainId]     = useState(connectedChainId ?? 1);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [txHashes, setTxHashes]   = useState<Record<string, `0x${string}`>>({});

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  const parseIntent    = useParseIntent();
  const createTxPlan   = useCreateTransaction();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync }   = useWriteContract();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Wait for tx receipt per signing ID
  const currentTxHash = signingId ? txHashes[signingId] : undefined;
  const { data: receipt } = useWaitForTransactionReceipt({
    hash:  currentTxHash,
    query: { enabled: !!currentTxHash },
  });

  useEffect(() => {
    if (!receipt || !signingId) return;
    const status = receipt.status === 'success' ? 'confirmed' : 'failed';
    setMessages(prev => prev.map(m =>
      m.txPlanId === signingId
        ? { ...m, txHash: currentTxHash, content: status === 'confirmed' ? 'Transaction confirmed onchain.' : 'Transaction failed onchain.' }
        : m
    ));
    setSigningId(null);
  }, [receipt]);

  const senderAddress = address ?? wallets?.[0]?.address;

  const handleSend = () => {
    const prompt = input.trim();
    if (!prompt) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMsg]);

    parseIntent.mutate(
      { data: { prompt, walletAddress: senderAddress ?? '', chainId } },
      {
        onSuccess: (plan) => {
          // missingInfo lives in rawPlan (not typed on ParsedIntent)
          const rawMissing = ((plan.rawPlan as any)?.missingInfo as string[] | undefined) ?? [];
          const missingInfo = rawMissing.length
            ? `\n\nMissing information:\n${rawMissing.map(i => `• ${i}`).join('\n')}`
            : '';
          const risks = plan.risks?.length
            ? `\n\nRisk warnings:\n${plan.risks.map(r => `⚠ ${r}`).join('\n')}`
            : '';
          const isActionable = ACTIONABLE_TYPES.includes(plan.actionType) && !rawMissing.length;
          const isSwap = plan.actionType === SWAP_TYPE && !rawMissing.length;
          const isDefiIntent = DEFI_INTENT_TYPES.includes(plan.actionType);

          const content = isActionable
            ? `Transaction plan ready: ${plan.actionType.replace(/_/g, ' ')}.${risks}${missingInfo}\n\nReview the details and click "Create & Sign" — your wallet signature is required to proceed.`
            : isSwap
            ? `Swap plan ready.${risks}${missingInfo}\n\nClick "Open Swap" to execute with real-time quotes.`
            : isDefiIntent
            ? `Intent recognized: ${plan.intent}.${risks}${missingInfo}\n\nClick "Open DeFi" to execute this ${DEFI_LABELS[plan.actionType]?.label ?? plan.actionType.replace(/_/g, ' ')} action with supervised wallet signing.`
            : `I've analyzed your request: ${plan.intent}.${risks}${missingInfo}${
                plan.actionType === 'analyze_wallet' || plan.actionType === 'analyze_risk'
                  ? '\n\nThis is an analysis request — no transaction required. Use the Risk or Portfolio pages for deep analysis.'
                  : '\n\nI need more information to create a transaction plan. Please clarify the missing fields above.'
              }`;

          setMessages(prev => [...prev, { role: 'assistant', content, plan }]);
        },
        onError: (err: any) => {
          const errorMsg = err?.message ?? 'Failed to parse intent';
          const isApiKeyMissing = errorMsg.includes('not configured') || errorMsg.includes('OPENAI_API_KEY');
          setMessages(prev => [...prev, {
            role:    'assistant',
            content: isApiKeyMissing
              ? 'AI parsing is not configured. Please add OPENAI_API_KEY to your environment secrets in Settings to enable natural language parsing.'
              : `Error: ${errorMsg}`,
            error: errorMsg,
          }]);
        },
      }
    );
  };

  const handleCreateAndSign = async (plan: ParsedIntent, msgIndex: number) => {
    if (!senderAddress) {
      toast({ title: 'No wallet connected', variant: 'destructive' });
      return;
    }

    // Create the transaction plan in DB first
    createTxPlan.mutate(
      {
        data: {
          walletAddress:    senderAddress,
          chainId,
          actionType:       plan.actionType,
          recipientAddress: plan.recipient ?? undefined,
          tokenSymbol:      plan.tokenIn ?? plan.tokenOut ?? undefined,
          amount:           plan.amount ?? undefined,
          riskLevel:        (plan.risks as string[])?.length > 2 ? 'high' : (plan.risks as string[])?.length > 0 ? 'medium' : 'low',
          riskWarnings:     plan.risks ?? [],
          notes:            plan.intent,
        },
      },
      {
        onSuccess: async (txPlan) => {
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });

          // Update message with txPlanId
          setMessages(prev => prev.map((m, i) =>
            i === msgIndex ? { ...m, txPlanId: txPlan.id, chainId } : m
          ));

          // For non-signable types, just redirect to detail
          if (!ACTIONABLE_TYPES.includes(plan.actionType) || plan.actionType === 'approve_token' || plan.actionType === 'revoke_approval') {
            toast({ title: 'Plan created', description: 'Open the transaction detail to review and sign.' });
            return;
          }

          // Try to sign immediately
          setSigningId(txPlan.id);
          try {
            let hash: `0x${string}`;
            if (plan.actionType === 'send_native' && plan.recipient && plan.amount) {
              hash = await sendTransactionAsync({
                to:      plan.recipient as `0x${string}`,
                value:   parseEther(plan.amount),
                chainId,
              });
            } else if (plan.actionType === 'send_token' && plan.recipient && plan.amount) {
              // Use the first contract address as token address if available
              const tokenAddr = (plan.contractAddresses as string[])?.[0];
              if (!tokenAddr || !isAddress(tokenAddr)) {
                throw new Error('Token contract address not found. Please use the Transfer page for ERC-20 sends.');
              }
              hash = await writeContractAsync({
                abi:          erc20Abi,
                address:      tokenAddr as `0x${string}`,
                functionName: 'transfer',
                args:         [plan.recipient as `0x${string}`, parseUnits(plan.amount, 18)],
                chainId,
              });
            } else {
              // For swap, redirect to swap page with pre-filled data
              setLocation('/swap');
              return;
            }

            setTxHashes(prev => ({ ...prev, [txPlan.id]: hash }));

            // Update plan status in DB
            toast({ title: 'Transaction submitted', description: 'Waiting for confirmation...' });
          } catch (err: any) {
            setSigningId(null);
            setMessages(prev => prev.map((m, i) =>
              i === msgIndex
                ? { ...m, content: m.content + `\n\n❌ Signing failed: ${err?.shortMessage ?? err?.message}` }
                : m
            ));
          }
        },
        onError: (err: any) => {
          toast({ title: 'Failed to create plan', description: err?.message, variant: 'destructive' });
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLoading = parseIntent.isPending;

  return (
    <Layout title="AI Agent">
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 2, background: 'hsl(112 100% 54% / 0.1)', border: '1px solid hsl(112 100% 54% / 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={15} style={{ color: 'hsl(112 100% 54%)' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: 'hsl(0 0% 88%)' }}>Hermod AI Agent</h2>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 6px', borderRadius: 2, background: 'hsl(220 100% 60% / 0.1)', border: '1px solid hsl(220 100% 60% / 0.25)', color: 'hsl(220 100% 70%)' }}>
                  SUPERVISED
                </span>
              </div>
              <p style={{ fontSize: 10, color: 'hsl(0 0% 40%)', marginTop: 1 }}>Natural language → verified plan → <strong style={{ color: 'hsl(0 0% 55%)' }}>your wallet signs</strong></p>
            </div>
          </div>
          {/* Chain picker */}
          <div style={{ display: 'flex', gap: 4 }}>
            {CHAIN_IDS.filter(c => [1, 8453, 42161, 10, 137].includes(c.id)).map(c => (
              <button key={c.id} onClick={() => setChainId(c.id)}
                style={{
                  fontSize: 9, padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
                  border: `1px solid ${chainId === c.id ? 'hsl(112 100% 54% / 0.5)' : 'hsl(0 0% 12%)'}`,
                  background: chainId === c.id ? 'hsl(112 100% 54% / 0.08)' : 'transparent',
                  color: chainId === c.id ? 'hsl(112 100% 54%)' : 'hsl(0 0% 35%)',
                  fontFamily: 'Inter, sans-serif', letterSpacing: '0.06em', transition: 'all 150ms',
                }}
              >{c.name}</button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: 2, flexShrink: 0,
                background: msg.role === 'user' ? 'hsl(0 0% 8%)' : 'hsl(112 100% 54% / 0.1)',
                border: `1px solid ${msg.role === 'user' ? 'hsl(0 0% 14%)' : 'hsl(112 100% 54% / 0.25)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {msg.role === 'user'
                  ? <User size={13} style={{ color: 'hsl(0 0% 50%)' }} />
                  : <Bot size={13} style={{ color: 'hsl(112 100% 54%)' }} />
                }
              </div>

              {/* Bubble */}
              <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: 8, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  background: msg.role === 'user' ? 'hsl(0 0% 7%)' : 'hsl(0 0% 5%)',
                  border: `1px solid ${msg.error ? 'hsl(0 100% 63% / 0.25)' : msg.role === 'user' ? 'hsl(0 0% 12%)' : 'hsl(0 0% 10%)'}`,
                  borderLeft: msg.role === 'assistant' ? `2px solid ${msg.error ? 'hsl(0 100% 63%)' : 'hsl(112 100% 54%)'}` : undefined,
                  borderRadius: 2, padding: '10px 14px',
                }}>
                  <p style={{ fontSize: 12, color: 'hsl(0 0% 80%)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif' }}>
                    {msg.content}
                  </p>
                </div>

                {/* Plan card */}
                {msg.plan && ACTIONABLE_TYPES.includes(msg.plan.actionType) && !((msg.plan.rawPlan as any)?.missingInfo as string[] | undefined)?.length && (
                  <div style={{ background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 10%)', borderTop: '2px solid hsl(112 100% 54%)', borderRadius: 2, padding: 14, width: '100%' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: 'hsl(0 0% 35%)', marginBottom: 10 }}>TRANSACTION PLAN</div>
                    <div className="space-y-2">
                      {[
                        { label: 'Action',    value: msg.plan.actionType.replace(/_/g, ' ').toUpperCase() },
                        { label: 'Chain',     value: getChainName(chainId) },
                        ...(msg.plan.tokenIn  ? [{ label: 'Token In',   value: msg.plan.tokenIn as string }] : []),
                        ...(msg.plan.tokenOut ? [{ label: 'Token Out',  value: msg.plan.tokenOut as string }] : []),
                        ...(msg.plan.amount   ? [{ label: 'Amount',     value: msg.plan.amount as string }] : []),
                        ...(msg.plan.recipient ? [{ label: 'Recipient', value: `${(msg.plan.recipient as string).slice(0,14)}...` }] : []),
                        ...(msg.plan.protocol  ? [{ label: 'Protocol',  value: msg.plan.protocol as string }] : []),
                        ...(msg.plan.estimatedGas ? [{ label: 'Est. Gas', value: msg.plan.estimatedGas as string }] : []),
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10, color: 'hsl(0 0% 38%)' }}>{row.label}</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(0 0% 72%)' }}>{row.value}</span>
                        </div>
                      ))}
                    </div>

                    {(msg.plan.risks as string[])?.length > 0 && (
                      <div style={{ marginTop: 10, padding: '8px', background: 'hsl(40 100% 50% / 0.06)', border: '1px solid hsl(40 100% 50% / 0.18)', borderRadius: 2 }}>
                        {(msg.plan.risks as string[]).map((r, ri) => (
                          <div key={ri} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: ri < (msg.plan!.risks as string[]).length - 1 ? 4 : 0 }}>
                            <AlertTriangle size={10} style={{ color: 'hsl(40 100% 50%)', flexShrink: 0, marginTop: 2 }} />
                            <span style={{ fontSize: 10, color: 'hsl(40 100% 50%)', lineHeight: 1.5 }}>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Supervised execution disclaimer */}
                    <div style={{ marginTop: 10, padding: '6px 8px', background: 'hsl(220 100% 60% / 0.05)', border: '1px solid hsl(220 100% 60% / 0.15)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 9, color: 'hsl(220 100% 65%)' }}>🔒</span>
                      <span style={{ fontSize: 9, color: 'hsl(0 0% 45%)', lineHeight: 1.4 }}>Supervised execution — your wallet signature is required. Hermod never signs on your behalf.</span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                      {!msg.txPlanId ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCreateAndSign(msg.plan!, i)}
                          disabled={createTxPlan.isPending || !!signingId}
                        >
                          {createTxPlan.isPending ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={12} />}
                          Create & Sign
                        </Button>
                      ) : (
                        <>
                          <Link href={`/transactions/${msg.txPlanId}`} style={{ flex: 1 }}>
                            <Button variant="outline" size="sm" className="w-full">
                              <ExternalLink size={11} /> View Plan
                            </Button>
                          </Link>
                          {msg.txHash && (
                            <a
                              href={getExplorerUrl(msg.txHash, msg.chainId ?? chainId)}
                              target="_blank" rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm">
                                <ExternalLink size={11} /> Explorer
                              </Button>
                            </a>
                          )}
                          {signingId === msg.txPlanId && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'hsl(168 100% 50%)' }}>
                              <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                              Confirming...
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Redirect cards for swap/non-actionable */}
                {msg.plan && msg.plan.actionType === SWAP_TYPE && !((msg.plan.rawPlan as any)?.missingInfo as string[] | undefined)?.length && !msg.txPlanId && (
                  <Link href="/swap">
                    <Button variant="outline" size="sm">
                      <ArrowRight size={12} /> Open Swap Page
                    </Button>
                  </Link>
                )}
                {msg.plan && msg.plan.actionType === 'create_recurring' && (
                  <Link href="/recurring">
                    <Button variant="outline" size="sm">
                      <ArrowRight size={12} /> Open Recurring Page
                    </Button>
                  </Link>
                )}
                {msg.plan && (msg.plan.actionType === 'analyze_wallet' || msg.plan.actionType === 'analyze_risk') && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link href="/risk"><Button variant="outline" size="sm"><ArrowRight size={12} /> Risk Page</Button></Link>
                    <Link href="/portfolio"><Button variant="outline" size="sm"><ArrowRight size={12} /> Portfolio Page</Button></Link>
                  </div>
                )}

                {/* DeFi intent card — executable via /defi page */}
                {msg.plan && DEFI_INTENT_TYPES.includes(msg.plan.actionType) && (() => {
                  const defi = DEFI_LABELS[msg.plan.actionType];
                  return (
                    <div style={{ background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 10%)', borderTop: '2px solid hsl(112 100% 54%)', borderRadius: 2, padding: 14, width: '100%' }}>
                      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: 'hsl(0 0% 35%)', marginBottom: 8 }}>DEFI INTENT RECOGNIZED</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 18 }}>{defi?.icon ?? '⚡'}</span>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(0 0% 80%)' }}>{defi?.label ?? msg.plan.actionType.replace(/_/g, ' ')}</p>
                          <p style={{ fontSize: 10, color: 'hsl(0 0% 40%)', marginTop: 1 }}>{defi?.note}</p>
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 6px', borderRadius: 2, background: 'hsl(112 100% 54% / 0.10)', border: '1px solid hsl(112 100% 54% / 0.3)', color: 'hsl(112 100% 54%)' }}>
                          LIVE
                        </span>
                      </div>
                      {msg.plan.protocol && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: 'hsl(0 0% 38%)' }}>Protocol</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(0 0% 72%)' }}>{msg.plan.protocol as string}</span>
                        </div>
                      )}
                      {msg.plan.amount && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: 'hsl(0 0% 38%)' }}>Amount</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(0 0% 72%)' }}>{msg.plan.amount as string} {msg.plan.tokenIn as string}</span>
                        </div>
                      )}
                      <Link href="/defi" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                        fontSize: 11, fontWeight: 600, color: '#000', textDecoration: 'none',
                        padding: '7px 14px', background: 'hsl(112 100% 54%)', borderRadius: 2,
                      }}>
                        Open DeFi <ArrowRight size={11} />
                      </Link>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: 2, background: 'hsl(112 100% 54% / 0.1)', border: '1px solid hsl(112 100% 54% / 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={13} style={{ color: 'hsl(112 100% 54%)' }} />
              </div>
              <div style={{ background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 10%)', borderLeft: '2px solid hsl(112 100% 54%)', borderRadius: 2, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={13} style={{ color: 'hsl(112 100% 54%)', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12, color: 'hsl(0 0% 50%)' }}>Analyzing intent...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Example prompts (shown only initially) */}
        {messages.length === 1 && (
          <div style={{ flexShrink: 0, marginBottom: 12 }}>
            <p style={{ fontSize: 9, letterSpacing: '0.1em', color: 'hsl(0 0% 30%)', marginBottom: 8 }}>EXAMPLE COMMANDS</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EXAMPLE_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setInput(p)}
                  data-testid={`btn-example-${i}`}
                  style={{
                    fontSize: 10, padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
                    border: '1px solid hsl(0 0% 12%)', background: 'hsl(0 0% 5%)',
                    color: 'hsl(0 0% 45%)', transition: 'all 150ms', textAlign: 'left',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(112 100% 54% / 0.3)'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(0 0% 70%)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(0 0% 12%)'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(0 0% 45%)'; }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{
          flexShrink: 0,
          background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 12%)',
          borderTop: '2px solid hsl(112 100% 54%)', borderRadius: 2,
          display: 'flex', alignItems: 'flex-end', gap: 8, padding: 12,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a financial action... (Enter to send, Shift+Enter for newline)"
            rows={2}
            data-testid="input-prompt"
            style={{
              flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'hsl(0 0% 80%)',
              lineHeight: 1.6, padding: 0,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{ padding: '6px 12px' }}
              data-testid="btn-send"
            >
              {isLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
            </Button>
            {messages.length > 1 && (
              <button
                onClick={() => setMessages([messages[0]])}
                title="Clear conversation"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(0 0% 35%)', padding: 4 }}
              >
                <RefreshCw size={11} />
              </button>
            )}
          </div>
        </div>

        {!address && (
          <p style={{ fontSize: 10, color: 'hsl(40 100% 50%)', textAlign: 'center', marginTop: 6, flexShrink: 0 }}>
            ⚠ Connect your wallet to sign and execute transaction plans
          </p>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Layout>
  );
}
