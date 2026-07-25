import { Link } from 'wouter';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const G  = 'hsl(112 100% 54%)';
const C  = 'hsl(168 100% 50%)';
const AM = 'hsl(40 100% 50%)';

/* ── Shared typography helpers ─────────────────────────────────── */
const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{
    fontFamily: 'Inter, sans-serif',
    fontSize: 22, fontWeight: 700,
    letterSpacing: '-0.02em',
    color: 'hsl(0 0% 92%)',
    marginBottom: 20, marginTop: 56,
    paddingBottom: 12,
    borderBottom: '1px solid hsl(0 0% 10%)',
    display: 'flex', alignItems: 'center', gap: 10,
  }}>{children}</h2>
);

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{
    fontFamily: 'Inter, sans-serif',
    fontSize: 14, fontWeight: 600,
    color: 'hsl(0 0% 80%)',
    marginBottom: 10, marginTop: 28,
  }}>{children}</h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{
    fontSize: 13, lineHeight: 1.9,
    color: 'hsl(0 0% 52%)',
    marginBottom: 14,
  }}>{children}</p>
);

const Code = ({ children }: { children: React.ReactNode }) => (
  <code style={{
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    color: G,
    background: 'hsl(112 100% 54% / 0.08)',
    border: '1px solid hsl(112 100% 54% / 0.15)',
    padding: '1px 6px',
    borderRadius: 2,
  }}>{children}</code>
);

const Tag = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{
    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
    padding: '2px 7px', borderRadius: 2,
    background: `${color}12`,
    border: `1px solid ${color}30`,
    color,
  }}>{children}</span>
);

const Table = ({ rows }: { rows: [string, string, string][] }) => (
  <div style={{ overflowX: 'auto', marginBottom: 24 }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid hsl(0 0% 10%)' }}>
          {['Layer', 'Component', 'Role'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 10, letterSpacing: '0.08em', color: 'hsl(0 0% 32%)', fontWeight: 600 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b, c], i) => (
          <tr key={i} style={{ borderBottom: '1px solid hsl(0 0% 7%)' }}>
            <td style={{ padding: '10px 14px', color: G, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, whiteSpace: 'nowrap' }}>{a}</td>
            <td style={{ padding: '10px 14px', color: 'hsl(0 0% 78%)', fontWeight: 500 }}>{b}</td>
            <td style={{ padding: '10px 14px', color: 'hsl(0 0% 48%)', lineHeight: 1.6 }}>{c}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ── Main component ─────────────────────────────────────────────── */
export default function Whitepaper() {
  return (
    <div style={{ minHeight: '100dvh', background: 'hsl(0 0% 3%)', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>

      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(57,255,20,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(57,255,20,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 56,
        borderBottom: '1px solid hsl(0 0% 10%)',
        background: 'hsl(0 0% 3% / 0.92)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href={`${basePath}/`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: 'hsl(0 0% 40%)', textDecoration: 'none',
            transition: 'color 150ms',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'hsl(0 0% 65%)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'hsl(0 0% 40%)'; }}
          >
            <ArrowLeft size={13} /> Back
          </Link>
          <span style={{ width: 1, height: 16, background: 'hsl(0 0% 12%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={`${basePath}/logo.png`} alt="Hermod" style={{ width: 18, height: 18, objectFit: 'contain' }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#fff' }}>HERMOD</span>
            <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'hsl(0 0% 30%)', background: 'hsl(0 0% 7%)', border: '1px solid hsl(0 0% 12%)', padding: '2px 6px', borderRadius: 2 }}>WHITEPAPER</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tag color={G}>v1.0</Tag>
          <span style={{ fontSize: 10, color: 'hsl(0 0% 28%)' }}>July 2025</span>
        </div>
      </nav>

      {/* Body */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto', padding: '64px 32px 120px' }}>

        {/* Title block */}
        <div style={{ marginBottom: 56, paddingBottom: 40, borderBottom: '1px solid hsl(0 0% 8%)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <Tag color={G}>TECHNICAL WHITEPAPER</Tag>
            <Tag color={C}>ROBINHOOD CHAIN</Tag>
            <Tag color={AM}>SUPERVISED AI</Tag>
          </div>
          <h1 style={{
            fontSize: 42, fontWeight: 800,
            letterSpacing: '-0.035em',
            color: '#fff',
            lineHeight: 1.1,
            marginBottom: 20,
          }}>
            Hermod: Verifiable Financial Agents for Onchain Finance
          </h1>
          <p style={{ fontSize: 15, color: 'hsl(0 0% 48%)', lineHeight: 1.8, maxWidth: 620 }}>
            A production-grade operating console for AI agents that manage real onchain assets — with policy enforcement, risk detection, human-in-the-loop execution, and a full immutable audit trail.
          </p>
          <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Network',   value: 'Robinhood Chain (mainnet)' },
              { label: 'Version',   value: '1.0.0' },
              { label: 'Status',    value: 'Early Access' },
              { label: 'License',   value: 'Proprietary' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 9, letterSpacing: '0.1em', color: 'hsl(0 0% 28%)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'hsl(0 0% 65%)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Table of contents */}
        <div style={{ background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 9%)', borderLeft: `3px solid ${G}`, borderRadius: 2, padding: '20px 24px', marginBottom: 48 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'hsl(0 0% 30%)', marginBottom: 14 }}>TABLE OF CONTENTS</div>
          {[
            ['1', 'Abstract'],
            ['2', 'Problem Statement'],
            ['3', 'The Hermod Solution'],
            ['4', 'System Architecture'],
            ['5', 'Agent Execution Model'],
            ['6', 'Policy Engine & Risk Detection'],
            ['7', 'Security Model'],
            ['8', 'Supported Protocols & Chains'],
            ['9', 'Roadmap'],
            ['10', 'Conclusion'],
          ].map(([n, title]) => (
            <div key={n} style={{ display: 'flex', gap: 12, padding: '4px 0' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: G, minWidth: 20 }}>{n}.</span>
              <span style={{ fontSize: 12, color: 'hsl(0 0% 55%)' }}>{title}</span>
            </div>
          ))}
        </div>

        {/* ── 1. Abstract ── */}
        <H2><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: G }}>01</span> Abstract</H2>
        <P>
          Hermod is a non-custodial AI agent operating console built on Robinhood Chain — a high-performance EVM-compatible network designed for mainstream finance. It translates natural language financial instructions into structured, verifiable transaction plans, enforces configurable policy rules before any execution, and maintains an immutable audit trail of every agent action.
        </P>
        <P>
          Unlike fully autonomous DeFi agents that operate without human oversight, Hermod operates on a <strong style={{ color: 'hsl(0 0% 72%)' }}>supervised execution model</strong>: the AI prepares and validates transaction plans, humans retain the final signing authority. This design makes Hermod suitable for both individual users managing personal assets and institutional operators overseeing agent fleets.
        </P>

        {/* ── 2. Problem Statement ── */}
        <H2><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: G }}>02</span> Problem Statement</H2>
        <P>
          Onchain finance has reached a level of complexity that is increasingly difficult to manage manually. Users must monitor token balances across multiple chains, execute multi-step DeFi interactions (lending, swapping, yield harvesting), manage token approvals, and respond to market conditions — often simultaneously.
        </P>
        <P>
          Existing solutions fall into two unsatisfactory categories:
        </P>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '16px 0 24px' }}>
          {[
            {
              title: 'Manual Execution',
              color: AM,
              points: ['Slow and error-prone', 'Requires constant attention', 'No automation possible', 'Poor UX for non-technical users'],
            },
            {
              title: 'Fully Autonomous Bots',
              color: 'hsl(0 100% 63%)',
              points: ['No human oversight', 'Smart contract risk with no recourse', 'Opaque decision-making', 'Regulatory gray areas'],
            },
          ].map(({ title, color, points }) => (
            <div key={title} style={{ background: 'hsl(0 0% 5%)', border: `1px solid ${color}25`, borderTop: `2px solid ${color}`, borderRadius: 2, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 12 }}>{title}</div>
              {points.map(p => (
                <div key={p} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ color, fontSize: 10, flexShrink: 0, marginTop: 2 }}>✕</span>
                  <span style={{ fontSize: 11, color: 'hsl(0 0% 42%)', lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <P>
          Hermod addresses both failure modes by providing the automation of AI with the safety guarantees of human approval — a middle path we call <strong style={{ color: 'hsl(0 0% 72%)' }}>supervised autonomous finance</strong>.
        </P>

        {/* ── 3. The Hermod Solution ── */}
        <H2><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: G }}>03</span> The Hermod Solution</H2>
        <P>
          Hermod provides a four-layer operating model for AI-driven onchain finance:
        </P>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, margin: '16px 0 24px' }}>
          {[
            { n: '01', title: 'Intent Parsing', color: G, body: 'Natural language instructions are processed by a fine-tuned LLM that extracts structured transaction parameters — recipient, amount, token, protocol, chain — and identifies missing information or risk signals.' },
            { n: '02', title: 'Plan Verification', color: C, body: 'Every parsed plan is validated against the policy engine before being presented to the user. Risk warnings are generated for large amounts, unverified contracts, slippage exposure, and known scam patterns.' },
            { n: '03', title: 'Human Approval', color: AM, body: 'The user reviews the structured plan — action type, parameters, risk warnings — and signs the transaction with their own wallet. Hermod never holds private keys or signs on behalf of users.' },
            { n: '04', title: 'Audit & Tracing', color: 'hsl(270 60% 65%)', body: 'Every intent parse, plan creation, approval decision, and execution outcome is written to an immutable audit log. Agents and transactions are fully traceable end-to-end.' },
          ].map(({ n, title, color, body }) => (
            <div key={n} style={{ display: 'flex', gap: 16, background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 9%)', borderLeft: `3px solid ${color}`, borderRadius: 2, padding: '16px 20px', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color, flexShrink: 0, fontWeight: 700 }}>{n}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(0 0% 80%)', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'hsl(0 0% 45%)', lineHeight: 1.75 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 4. System Architecture ── */}
        <H2><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: G }}>04</span> System Architecture</H2>
        <P>
          Hermod is composed of three primary services deployed as a monorepo artifact:
        </P>
        <Table rows={[
          ['Frontend',    'React + Vite SPA',        'User console, AI chat, portfolio dashboard, wallet management'],
          ['API Server',  'Node.js + Express',        'Intent parsing, policy engine, transaction lifecycle, audit log'],
          ['Database',    'PostgreSQL (Drizzle ORM)', 'Wallets, agents, transactions, snapshots, audit events'],
        ]} />
        <H3>Blockchain Connectivity</H3>
        <P>
          All on-chain reads and transaction construction use <Code>viem</Code> — a TypeScript-native Ethereum client. Hermod connects to the following RPC endpoints:
        </P>
        <div style={{ background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 9%)', borderRadius: 2, padding: '16px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'hsl(0 0% 50%)', lineHeight: 2, marginBottom: 24 }}>
          <div><span style={{ color: G }}>Robinhood Chain </span><span style={{ color: 'hsl(0 0% 30%)' }}>chainId=4663 · </span>https://rpc.mainnet.chain.robinhood.com</div>
          <div><span style={{ color: G }}>Ethereum       </span><span style={{ color: 'hsl(0 0% 30%)' }}>chainId=1     · </span>public RPC</div>
          <div><span style={{ color: G }}>Base           </span><span style={{ color: 'hsl(0 0% 30%)' }}>chainId=8453  · </span>public RPC</div>
          <div><span style={{ color: G }}>Arbitrum One   </span><span style={{ color: 'hsl(0 0% 30%)' }}>chainId=42161 · </span>public RPC</div>
          <div><span style={{ color: G }}>Optimism       </span><span style={{ color: 'hsl(0 0% 30%)' }}>chainId=10    · </span>public RPC</div>
          <div><span style={{ color: G }}>Polygon        </span><span style={{ color: 'hsl(0 0% 30%)' }}>chainId=137   · </span>public RPC</div>
        </div>
        <H3>Wallet Connectivity</H3>
        <P>
          Users connect wallets via <Code>wagmi</Code> + <Code>RainbowKit</Code>, supporting injected wallets (MetaMask, Rabby), Coinbase Wallet, and WalletConnect-compatible signers. Authentication is handled by <Code>Clerk</Code>. Hermod is fully non-custodial — private keys never leave the user's device.
        </P>

        {/* ── 5. Agent Execution Model ── */}
        <H2><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: G }}>05</span> Agent Execution Model</H2>
        <P>
          Hermod operates agents in <strong style={{ color: 'hsl(0 0% 72%)' }}>supervised mode</strong>. Every action follows a strict lifecycle:
        </P>
        <div style={{ position: 'relative', margin: '24px 0 32px', paddingLeft: 24 }}>
          <div style={{ position: 'absolute', left: 7, top: 12, bottom: 12, width: 1, background: 'hsl(0 0% 12%)' }} />
          {[
            { step: 'PROMPT',   color: G,   label: 'User describes intent in natural language' },
            { step: 'PARSE',    color: G,   label: 'LLM extracts structured JSON plan with risk signals' },
            { step: 'VALIDATE', color: C,   label: 'Policy engine checks limits, blocklists, and risk thresholds' },
            { step: 'REVIEW',   color: AM,  label: 'User reviews full plan — action, parameters, risks, estimated gas' },
            { step: 'SIGN',     color: AM,  label: 'User signs transaction with their own wallet (MetaMask, etc.)' },
            { step: 'EXECUTE',  color: G,   label: 'Transaction submitted on-chain, hash recorded' },
            { step: 'AUDIT',    color: 'hsl(270 60% 65%)', label: 'Outcome written to immutable audit log' },
          ].map(({ step, color, label }) => (
            <div key={step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16, position: 'relative' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: `${color}20`, border: `1.5px solid ${color}`, flexShrink: 0, marginTop: 1 }} />
              <div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color, letterSpacing: '0.1em' }}>{step}</span>
                <span style={{ fontSize: 12, color: 'hsl(0 0% 48%)', marginLeft: 10 }}>{label}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: 'hsl(112 100% 54% / 0.04)', border: '1px solid hsl(112 100% 54% / 0.14)', borderRadius: 2, padding: '14px 18px', marginBottom: 24 }}>
          <span style={{ fontSize: 11, color: 'hsl(0 0% 55%)', lineHeight: 1.75 }}>
            <strong style={{ color: G }}>Key invariant:</strong> Hermod's AI layer generates and validates plans but holds no signing authority. The <Code>requiresUserConfirmation: true</Code> flag is immutable in all plan outputs. This is enforced at the API level and cannot be overridden by prompt injection.
          </span>
        </div>

        {/* ── 6. Policy Engine ── */}
        <H2><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: G }}>06</span> Policy Engine &amp; Risk Detection</H2>
        <P>
          Every agent is governed by a configurable policy set. Policies are evaluated server-side before any transaction plan is returned to the client.
        </P>
        <Table rows={[
          ['Spend limits',    'Per-transaction maximum',    'Rejects plans exceeding defined USD or token thresholds'],
          ['Token allowlist', 'Permitted token symbols',    'Only whitelisted tokens may appear in transaction plans'],
          ['Chain allowlist', 'Permitted chain IDs',        'Restricts agent activity to specific networks'],
          ['Address block',   'Blocked recipient addresses','Prevents sends to known scam, mixer, or exchange-deposit addresses'],
          ['Action types',    'Permitted action categories','Disables specific plan types (e.g. block all approvals)'],
          ['Manual approval', 'Require human review',       'Forces explicit click-through for all plans regardless of policy pass'],
        ]} />
        <H3>Risk Signal Generation</H3>
        <P>
          The AI layer independently generates risk warnings for every plan. Risk signals are additive — policies may reject a plan outright, while risk warnings are surfaced to the user for informed consent. Categories include:
        </P>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 24 }}>
          {[
            'Large amount relative to balance',
            'Unverified ERC-20 contract',
            'Token approval (unlimited allowance)',
            'Cross-chain bridge action',
            'Known scam / rug-pull patterns',
            'Exchange deposit address recipient',
            'Slippage & MEV exposure (swaps)',
            'Liquidation risk (borrow positions)',
            'Smart contract interaction risk',
            'Irreversible action warning',
          ].map(r => (
            <div key={r} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', background: 'hsl(40 100% 50% / 0.04)', border: '1px solid hsl(40 100% 50% / 0.12)', borderRadius: 2, padding: '8px 10px' }}>
              <span style={{ color: AM, fontSize: 9, flexShrink: 0, marginTop: 2 }}>⚠</span>
              <span style={{ fontSize: 11, color: 'hsl(0 0% 45%)', lineHeight: 1.5 }}>{r}</span>
            </div>
          ))}
        </div>

        {/* ── 7. Security Model ── */}
        <H2><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: G }}>07</span> Security Model</H2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { title: 'Non-Custodial', color: G, body: 'Hermod never holds private keys. Wallet signing happens exclusively in the user\'s browser via wagmi. The API server cannot initiate transactions.' },
            { title: 'Auth & Sessions', color: C, body: 'Authentication is handled by Clerk with JWT session tokens. All API endpoints require a valid session. Clerk proxy is routed through the Hermod domain to prevent cross-origin leakage.' },
            { title: 'Prompt Injection', color: AM, body: 'The system prompt enforces requiresUserConfirmation: true as a hard constraint. JSON output is schema-validated server-side before being returned — malformed or injected outputs are rejected.' },
            { title: 'Audit Integrity', color: 'hsl(270 60% 65%)', body: 'Audit events are append-only and written with server-side timestamps. Clients cannot modify or delete audit records. Each event includes actor, action, target, and outcome.' },
          ].map(({ title, color, body }) => (
            <div key={title} style={{ background: 'hsl(0 0% 5%)', border: `1px solid ${color}20`, borderTop: `2px solid ${color}`, borderRadius: 2, padding: '18px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 10 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'hsl(0 0% 42%)', lineHeight: 1.75 }}>{body}</div>
            </div>
          ))}
        </div>

        {/* ── 8. Supported Protocols ── */}
        <H2><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: G }}>08</span> Supported Protocols &amp; Chains</H2>
        <H3>Currently Executable</H3>
        <Table rows={[
          ['ETH/ERC-20 Send',  'Native transfer',   'Send ETH or any ERC-20 token to an address'],
          ['Token Swap',       '0x Protocol',        'Best-execution quotes across DEX aggregators'],
          ['Token Approval',   'ERC-20 standard',   'Grant or revoke spending allowances'],
          ['Portfolio Scan',   'On-chain logs',      'Discover ERC-20 holdings via Transfer event scanning'],
          ['Risk Analysis',    'Hermod AI',          'Contract and wallet risk scoring with audit trail'],
          ['Recurring Sends',  'Scheduler',          'Automated periodic transfers with policy enforcement'],
        ]} />
        <H3>Intent Recognized (Execution Coming Soon)</H3>
        <Table rows={[
          ['Lending',          'Aave, Compound, Morpho',         'Supply assets for yield; borrow against collateral'],
          ['Liquid Staking',   'Lido, Rocket Pool',              'Stake ETH for stETH / rETH yield'],
          ['LP Provision',     'Uniswap v3, Curve, Balancer',    'Add / remove concentrated liquidity positions'],
          ['Reward Harvest',   'Protocol-specific',              'Claim staking rewards, LP fees, governance tokens'],
          ['Cross-chain',      'Arbitrum, Optimism, Base bridges','Bridge assets between supported EVM networks'],
        ]} />

        {/* ── 9. Roadmap ── */}
        <H2><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: G }}>09</span> Roadmap</H2>
        <div style={{ marginBottom: 28 }}>
          {[
            { phase: 'Q3 2025', label: 'Foundation', color: G, items: [
              'Robinhood Chain mainnet support (chainId 4663)',
              'AI intent parsing — natural language → structured JSON plan',
              'Supervised execution model (human wallet signature required)',
              'Policy engine v1 — per-agent spend limits, token & chain allowlists',
              'Portfolio scanner — on-chain Transfer log scanning + CoinGecko USD prices',
              'Token swap — 0x Protocol (EVM chains) + native Uniswap V3 (RH Chain)',
              'Native & ERC-20 token transfer',
              'Token approval management & revocation',
              'Recurring / scheduled payments with policy enforcement',
              'Risk analysis — wallet & contract scoring',
              'Multi-agent fleet dashboard — CRUD agents with per-agent policies',
              'Immutable audit trail — full event log per action',
              'Developer API key management',
              'Mobile-responsive console (bottom nav + slide-out drawer)',
              'Multi-wallet management',
            ], done: true },
            { phase: 'Q4 2025', label: 'DeFi Integrations', color: C, items: [
              'Aave v3 supply / borrow integration',
              'Uniswap v3 LP position management (add / remove liquidity)',
              'Lido & Rocket Pool liquid staking',
              'Yield / reward harvesting',
              'Cross-chain bridge integrations (Arbitrum, Optimism, Base)',
            ], done: false },
            { phase: 'Q1 2026', label: 'Autonomy', color: AM, items: [
              'Conditional execution triggers (price-based, time-based, event-based)',
              'Agent-to-agent communication layer',
              'Institutional REST API + webhook delivery',
              'Policy templates marketplace',
              'Agent performance analytics dashboard',
            ], done: false },
            { phase: 'Q2 2026', label: 'Scale', color: 'hsl(270 60% 65%)', items: [
              'On-chain policy contracts (verifiable, tamper-proof enforcement)',
              'Third-party plugin SDK',
              'Multi-user team workspaces with role-based access',
              'Enterprise audit export (CSV, JSON, S3)',
            ], done: false },
          ].map(({ phase, label, color, items, done }) => (
            <div key={phase} style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              <div style={{ width: 88, flexShrink: 0, paddingTop: 2 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: done ? color : 'hsl(0 0% 30%)', fontWeight: 600 }}>{phase}</div>
                <Tag color={done ? color : 'hsl(0 0% 25%)'}>{done ? 'LIVE' : 'PLANNED'}</Tag>
              </div>
              <div style={{ flex: 1, background: 'hsl(0 0% 5%)', border: `1px solid ${done ? color + '25' : 'hsl(0 0% 9%)'}`, borderLeft: `3px solid ${done ? color : 'hsl(0 0% 12%)'}`, borderRadius: 2, padding: '14px 18px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: done ? 'hsl(0 0% 80%)' : 'hsl(0 0% 38%)', marginBottom: 10 }}>{label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {items.map(item => (
                    <span key={item} style={{ fontSize: 10, color: done ? 'hsl(0 0% 50%)' : 'hsl(0 0% 28%)', background: 'hsl(0 0% 7%)', border: '1px solid hsl(0 0% 10%)', padding: '3px 8px', borderRadius: 2 }}>
                      {done ? '✓ ' : ''}{item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 10. Conclusion ── */}
        <H2><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: G }}>10</span> Conclusion</H2>
        <P>
          Hermod represents a pragmatic approach to the future of onchain finance: AI that amplifies human intent, policy engines that enforce safety invariants, and an audit trail that makes every decision accountable. As Robinhood Chain grows into a mainstream financial network, the need for compliant, verifiable agent infrastructure becomes critical.
        </P>
        <P>
          We believe the right model is not fully autonomous agents — it is agents that operate transparently within human-defined constraints, with every action logged and every execution requiring explicit human authorization. This is the Hermod model.
        </P>
        <div style={{ marginTop: 40, padding: '20px 24px', background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 9%)', borderLeft: `3px solid ${G}`, borderRadius: 2, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(0 0% 78%)', marginBottom: 4 }}>Follow development</div>
            <div style={{ fontSize: 11, color: 'hsl(0 0% 38%)' }}>Early access · Updates · Release notes</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <a href="https://x.com/HermodAgent" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, color: 'hsl(0 0% 45%)', textDecoration: 'none',
              padding: '7px 14px', border: '1px solid hsl(0 0% 12%)', borderRadius: 2,
              transition: 'color 150ms, border-color 150ms',
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = '#fff'; el.style.borderColor = 'hsl(0 0% 28%)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = 'hsl(0 0% 45%)'; el.style.borderColor = 'hsl(0 0% 12%)'; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              @HermodAgent
            </a>
            <Link href={`${basePath}/sign-up`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 600, color: 'hsl(0 0% 3%)', textDecoration: 'none',
              padding: '7px 16px', background: G, borderRadius: 2,
              transition: 'background 150ms',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'hsl(112 100% 46%)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = G; }}
            >
              Get Early Access <ExternalLink size={11} />
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 56, paddingTop: 24, borderTop: '1px solid hsl(0 0% 8%)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'hsl(0 0% 22%)' }}>© 2025 Hermod. All rights reserved.</span>
          <span style={{ fontSize: 10, color: 'hsl(0 0% 22%)' }}>Non-custodial · Verifiable · Auditable</span>
        </div>
      </div>
    </div>
  );
}
