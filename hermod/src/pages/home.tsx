import { Link } from 'wouter';
import { useEffect, useRef, useState } from 'react';
import {
  Shield, TrendingUp, Clock, FileText, Code, Lock,
  ArrowRight, Cpu, Repeat, Key, CheckCircle2, Zap,
  Globe, Activity, AlertTriangle, Eye,
} from 'lucide-react';
import { WalletButton } from '@/components/shared/wallet-button';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const G  = 'hsl(112 100% 54%)';
const C  = 'hsl(168 100% 50%)';
const AM = 'hsl(40 100% 50%)';

/* ── Scroll-reveal hook ─────────────────────────────────────── */
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold: 0.12, ...options });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

/* ── Counter animation hook ─────────────────────────────────── */
function useCounter(target: number, inView: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(pct * target));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);
  return val;
}

/* ── Fade-in wrapper ─────────────────────────────────────────── */
function Reveal({
  children, delay = 0, direction = 'up',
}: { children: React.ReactNode; delay?: number; direction?: 'up' | 'left' | 'right' }) {
  const { ref, inView } = useInView();
  const tx = direction === 'left' ? '-24px' : direction === 'right' ? '24px' : '0px';
  const ty = direction === 'up' ? '28px' : '0px';
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translate(0,0)' : `translate(${tx},${ty})`,
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Stat counter card ──────────────────────────────────────── */
function StatCounter({ value, suffix, label, color }: {
  value: number; suffix: string; label: string; color: string;
}) {
  const { ref, inView } = useInView();
  const count = useCounter(value, inView);
  return (
    <div
      ref={ref}
      style={{
        textAlign: 'center',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
    >
      <div className="home-stat-value" style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 36,
        fontWeight: 600,
        color,
        lineHeight: 1,
        letterSpacing: '-0.03em',
      }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: 11, color: 'hsl(0 0% 40%)', marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

/* ── Feature card ───────────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, description, accent, delay }: {
  icon: React.ElementType; title: string; description: string; accent: string; delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? 'hsl(0 0% 6%)' : 'hsl(0 0% 4%)',
          border: `1px solid ${hovered ? accent + '40' : 'hsl(0 0% 10%)'}`,
          borderTop: `2px solid ${hovered ? accent : 'hsl(0 0% 14%)'}`,
          borderRadius: 2,
          padding: '24px',
          cursor: 'default',
          transition: 'all 250ms ease',
          boxShadow: hovered ? `0 0 32px ${accent}18` : 'none',
          height: '100%',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 2,
          background: `${accent}14`,
          border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
          transition: 'all 250ms ease',
          boxShadow: hovered ? `0 0 16px ${accent}30` : 'none',
        }}>
          <Icon size={16} style={{ color: accent, transition: 'transform 250ms ease', transform: hovered ? 'scale(1.15)' : 'scale(1)' }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(0 0% 88%)', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'hsl(0 0% 42%)', lineHeight: 1.7 }}>{description}</div>
      </div>
    </Reveal>
  );
}

/* ── Terminal line ──────────────────────────────────────────── */
function TerminalLine({ text, color, delay }: { text: string; color?: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
      color: color || 'hsl(0 0% 55%)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(-8px)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      lineHeight: 1.8,
    }}>
      {text}
    </div>
  );
}

/* ── Step card ──────────────────────────────────────────────── */
function StepCard({ n, title, body, delay }: { n: number; title: string; body: string; delay: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          background: 'hsl(0 0% 5%)',
          border: `1px solid ${hovered ? G + '35' : 'hsl(0 0% 10%)'}`,
          borderRadius: 2,
          padding: '28px 24px',
          transition: 'all 250ms ease',
          boxShadow: hovered ? `0 0 24px ${G}12` : 'none',
        }}
      >
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, fontWeight: 600,
          color: hovered ? G : 'hsl(0 0% 25%)',
          letterSpacing: '0.1em',
          marginBottom: 14,
          transition: 'color 250ms',
        }}>
          STEP {String(n).padStart(2, '0')}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'hsl(0 0% 88%)', marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'hsl(0 0% 42%)', lineHeight: 1.7 }}>{body}</div>
      </div>
    </Reveal>
  );
}

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════════════════════ */
export default function Home() {
  const [terminalActive, setTerminalActive] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTerminalActive(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ minHeight: '100dvh', background: 'hsl(0 0% 3%)', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>

      {/* Global keyframes */}
      <style>{`
        @keyframes gridPulse {
          0%, 100% { opacity: 0.018; }
          50% { opacity: 0.035; }
        }
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.06; }
          50% { transform: translateY(-18px) rotate(3deg); opacity: 0.11; }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.04; }
          50% { transform: translateY(14px) rotate(-4deg); opacity: 0.09; }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.18; transform: scale(1); }
          50% { opacity: 0.28; transform: scale(1.04); }
        }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0; }
        }
        @keyframes scanline {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        .hero-glow {
          animation: glow 4s ease-in-out infinite;
        }
        .float-a { animation: floatA 7s ease-in-out infinite; }
        .float-b { animation: floatB 9s ease-in-out infinite; }
        .ticker-track { animation: ticker 28s linear infinite; }
        .cursor-blink { animation: blink 1s step-end infinite; }
      `}</style>

      {/* ── Background grid ── */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(57,255,20,0.018) 1px, transparent 1px),
          linear-gradient(90deg, rgba(57,255,20,0.018) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
        pointerEvents: 'none', zIndex: 0,
        animation: 'gridPulse 6s ease-in-out infinite',
      }} />

      {/* ── Ambient glow blobs ── */}
      <div className="hero-glow" style={{
        position: 'fixed', top: '8%', left: '18%',
        width: 480, height: 480,
        background: 'radial-gradient(circle, hsl(112 100% 54% / 0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0, borderRadius: '50%',
      }} />
      <div className="hero-glow" style={{
        position: 'fixed', top: '40%', right: '10%',
        width: 360, height: 360,
        background: 'radial-gradient(circle, hsl(168 100% 50% / 0.07) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0, borderRadius: '50%',
        animationDelay: '2s',
      }} />

      {/* ── NAV ── */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 56,
        borderBottom: '1px solid hsl(0 0% 10%)',
        background: 'hsl(0 0% 3% / 0.9)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={`${basePath}/logo.png`} alt="Hermod" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', color: '#fff' }}>HERMOD</span>
          <span className="hidden sm:inline" style={{
            marginLeft: 6, fontSize: 9, letterSpacing: '0.1em', color: 'hsl(0 0% 30%)',
            background: 'hsl(0 0% 7%)', border: '1px solid hsl(0 0% 12%)',
            padding: '2px 6px', borderRadius: 2,
          }}>v1.0</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WalletButton />
          <Link href={`${basePath}/sign-in`}
            className="hidden sm:inline-block"
            style={{
              fontSize: 11, color: 'hsl(0 0% 55%)', textDecoration: 'none',
              padding: '5px 14px', border: '1px solid hsl(0 0% 14%)', borderRadius: 2,
              transition: 'color 150ms, border-color 150ms',
            }}
          >Sign In</Link>
          <Link href={`${basePath}/whitepaper`} style={{
            fontSize: 11, fontWeight: 600, color: 'hsl(0 0% 3%)', textDecoration: 'none',
            padding: '5px 14px', background: G, borderRadius: 2, letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}>Whitepaper</Link>
        </div>
      </nav>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="home-section home-hero" style={{ position: 'relative', zIndex: 1, padding: '96px 40px 80px', textAlign: 'center' }}>

        {/* Floating hexagons */}
        <div className="home-hex float-a" style={{ position: 'absolute', top: 60, left: '12%', fontSize: 72, color: G, pointerEvents: 'none', userSelect: 'none', fontFamily: 'monospace' }}>⬡</div>
        <div className="home-hex float-b" style={{ position: 'absolute', top: 120, right: '14%', fontSize: 48, color: C, pointerEvents: 'none', userSelect: 'none', fontFamily: 'monospace' }}>⬡</div>
        <div className="home-hex float-a" style={{ position: 'absolute', bottom: 60, left: '25%', fontSize: 32, color: AM, pointerEvents: 'none', userSelect: 'none', fontFamily: 'monospace', animationDelay: '3s' }}>⬡</div>

        {/* Status badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10,
            color: 'hsl(0 0% 55%)', background: 'hsl(0 0% 5%)',
            border: '1px solid hsl(0 0% 12%)', borderRadius: 2, padding: '5px 12px', letterSpacing: '0.1em',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: G, display: 'inline-block', boxShadow: `0 0 8px ${G}` }} />
            LIVE — MAINNET READY · EARLY ACCESS OPEN
          </div>
        </div>

        <h1 className="home-h1" style={{
          fontSize: 52, fontWeight: 700, lineHeight: 1.08,
          letterSpacing: '-0.03em', color: 'hsl(0 0% 93%)',
          maxWidth: 680, margin: '0 auto 20px',
        }}>
          Verifiable Financial<br />
          <span style={{ color: G }}>Agents</span> for Onchain Finance
        </h1>

        <p style={{ fontSize: 14, color: 'hsl(0 0% 46%)', maxWidth: 460, margin: '0 auto 36px', lineHeight: 1.8 }}>
          A production-grade operating console for AI agents managing real onchain assets — with policy enforcement, risk detection, and full audit trail.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 48 }}>
          <Link href={`${basePath}/sign-up`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 12, fontWeight: 600, color: 'hsl(0 0% 3%)', textDecoration: 'none',
            padding: '10px 24px', background: G, borderRadius: 2, letterSpacing: '0.04em',
            boxShadow: `0 0 24px ${G}40`,
            transition: 'background 150ms, box-shadow 150ms',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'hsl(112 100% 46%)'; el.style.boxShadow = `0 0 40px ${G}60`; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = G; el.style.boxShadow = `0 0 24px ${G}40`; }}
          >
            Launch Console <ArrowRight size={13} />
          </Link>
          <a href="#features" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'hsl(0 0% 55%)', textDecoration: 'none',
            padding: '10px 22px', border: '1px solid hsl(0 0% 14%)', borderRadius: 2,
            transition: 'color 150ms, border-color 150ms',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#fff'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'hsl(0 0% 30%)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'hsl(0 0% 55%)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'hsl(0 0% 14%)'; }}
          >
            Explore Features
          </a>
        </div>

        {/* Terminal chip */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', background: 'hsl(0 0% 5%)',
          border: '1px solid hsl(0 0% 12%)', borderRadius: 2,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          color: 'hsl(0 0% 40%)', maxWidth: '100%', overflow: 'hidden',
        }}>
          <span style={{ color: G, flexShrink: 0 }}>$</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>hermod analyze --wallet 0x1234...5678</span>
          <span style={{ color: C, flexShrink: 0 }}>✓ LOW</span>
        </div>
      </section>

      {/* ══ TICKER ════════════════════════════════════════════ */}
      <div style={{ overflow: 'hidden', borderTop: '1px solid hsl(0 0% 8%)', borderBottom: '1px solid hsl(0 0% 8%)', padding: '10px 0', background: 'hsl(0 0% 4%)', position: 'relative', zIndex: 1 }}>
        <div className="ticker-track" style={{ display: 'flex', gap: 64, whiteSpace: 'nowrap', width: 'max-content' }}>
          {[...Array(2)].map((_, rep) => (
            [
              { label: 'Transactions Analyzed', value: '2.4M+', color: G },
              { label: 'Risk Alerts Caught', value: '18,400+', color: 'hsl(0 100% 63%)' },
              { label: 'Wallets Monitored', value: '94,000+', color: C },
              { label: 'Avg Response Time', value: '<200ms', color: AM },
              { label: 'Policy Rules Enforced', value: '5.1M+', color: G },
              { label: 'Chains Supported', value: '12', color: C },
              { label: 'Agent Executions', value: '310K+', color: AM },
              { label: 'Uptime', value: '99.97%', color: G },
            ].map((item, i) => (
              <span key={`${rep}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: '0.06em' }}>
                <span style={{ color: item.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{item.value}</span>
                <span style={{ color: 'hsl(0 0% 30%)' }}>{item.label}</span>
                <span style={{ color: 'hsl(0 0% 18%)', margin: '0 8px' }}>·</span>
              </span>
            ))
          ))}
        </div>
      </div>

      {/* ══ STATS ═════════════════════════════════════════════ */}
      <section className="home-section" style={{ position: 'relative', zIndex: 1, padding: '72px 40px', maxWidth: 960, margin: '0 auto' }}>
        <div className="home-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 8%)', borderRadius: 2, overflow: 'hidden' }}>
          {[
            { value: 2400000, suffix: '+', label: 'Transactions', color: G },
            { value: 94000, suffix: '+', label: 'Wallets Monitored', color: C },
            { value: 18400, suffix: '+', label: 'Risk Alerts', color: 'hsl(0 100% 63%)' },
            { value: 9997, suffix: '/10K', label: 'Uptime Score', color: AM },
          ].map((s, i) => (
            <div key={i} style={{ background: 'hsl(0 0% 4%)', padding: '32px 24px' }}>
              <StatCounter {...s} />
            </div>
          ))}
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════ */}
      <section id="features" className="home-section" style={{ position: 'relative', zIndex: 1, padding: '72px 40px', maxWidth: 1040, margin: '0 auto' }}>
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', color: 'hsl(0 0% 30%)' }}>CAPABILITIES</span>
            <div style={{ flex: 1, height: 1, background: 'hsl(0 0% 10%)' }} />
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', color: 'hsl(0 0% 30%)' }}>SIX MODULES</span>
          </div>
        </Reveal>

        <div className="home-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: Shield,     title: 'Risk Detection',      description: 'Real-time wallet & token risk analysis with verifiable onchain data. Blacklist detection, honeypot scanning, and rugpull indicators.', accent: 'hsl(0 100% 63%)' },
            { icon: TrendingUp, title: 'Portfolio Analysis',   description: 'Track balances, PnL, and composition across all chains and wallets. Historical snapshots with on-demand refresh.', accent: G },
            { icon: Key,        title: 'Approval Manager',    description: 'Discover, review, and revoke token approvals across all connected wallets. Infinite-approval detection and risk scoring.', accent: AM },
            { icon: Clock,      title: 'Transaction Engine',  description: 'Prepare, simulate, review, and execute transactions with full policy enforcement and approval flows.', accent: C },
            { icon: Cpu,        title: 'AI Agent Control',    description: 'Deploy and manage AI financial agents with spend limits, allowed-token lists, and manual override capability.', accent: G },
            { icon: FileText,   title: 'Audit & Compliance',  description: 'Immutable event log of every agent action, approval decision, and system event. Exportable for compliance reporting.', accent: 'hsl(168 100% 50%)' },
          ].map((f, i) => (
            <FeatureCard key={i} {...f} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
      <section className="home-section" style={{ position: 'relative', zIndex: 1, padding: '72px 40px', background: 'hsl(0 0% 4%)', borderTop: '1px solid hsl(0 0% 8%)', borderBottom: '1px solid hsl(0 0% 8%)' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', color: 'hsl(0 0% 30%)' }}>HOW IT WORKS</span>
              <div style={{ flex: 1, height: 1, background: 'hsl(0 0% 10%)' }} />
            </div>
          </Reveal>

          <div className="home-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, position: 'relative' }}>
            {/* connector line */}
            <div className="home-step-connector" style={{
              position: 'absolute', top: 36, left: 'calc(33.3% - 6px)', right: 'calc(33.3% - 6px)',
              height: 1, background: `linear-gradient(90deg, ${G}40, transparent 40%, transparent 60%, ${G}40)`,
              pointerEvents: 'none',
            }} />
            <StepCard n={1} title="Connect Wallets" body="Link any EVM-compatible wallet. Hermod reads on-chain state — no custody, no private keys, fully non-custodial." delay={0} />
            <StepCard n={2} title="Configure Policies" body="Define spend limits, allowed token lists, protocol whitelist, daily transaction caps, and approval thresholds for every agent." delay={120} />
            <StepCard n={3} title="Deploy & Monitor" body="Agents execute within policy bounds. Every action is logged, auditable, and stoppable at any point through the console." delay={240} />
          </div>
        </div>
      </section>

      {/* ══ TERMINAL DEMO ══════════════════════════════════════ */}
      <section className="home-section" style={{ position: 'relative', zIndex: 1, padding: '72px 40px', maxWidth: 1040, margin: '0 auto' }}>
        <div className="home-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>

          {/* Left copy */}
          <div>
            <Reveal>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', color: 'hsl(0 0% 30%)' }}>DEVELOPER-FIRST</span>
                <div style={{ flex: 1, height: 1, background: 'hsl(0 0% 10%)' }} />
              </div>
            </Reveal>
            <Reveal delay={80}>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'hsl(0 0% 90%)', lineHeight: 1.2, marginBottom: 16 }}>
                Full API access.<br />
                <span style={{ color: C }}>Build on top.</span>
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p style={{ fontSize: 12, color: 'hsl(0 0% 45%)', lineHeight: 1.8, marginBottom: 24 }}>
                Every feature available via a REST API secured by API keys. Integrate Hermod's risk analysis, wallet monitoring, and agent execution into your own applications.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: Zap,     text: 'Sub-200ms response time on all endpoints' },
                  { icon: Globe,   text: 'REST API with OpenAPI spec + codegen' },
                  { icon: Lock,    text: 'Per-key scopes, rate limits, and audit trail' },
                  { icon: Activity,text: 'Webhook events for agent actions and alerts' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <item.icon size={12} style={{ color: C, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'hsl(0 0% 50%)' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right terminal */}
          <Reveal direction="right">
            <div
              ref={terminalRef}
              style={{
                background: 'hsl(0 0% 4%)',
                border: '1px solid hsl(0 0% 12%)',
                borderTop: `2px solid ${C}`,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {/* Terminal header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 14px', borderBottom: '1px solid hsl(0 0% 10%)',
                background: 'hsl(0 0% 5%)',
              }}>
                {['hsl(0 100% 63%)', AM, G].map((c, i) => (
                  <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
                ))}
                <span style={{ marginLeft: 8, fontSize: 10, color: 'hsl(0 0% 30%)', fontFamily: 'JetBrains Mono, monospace' }}>hermod-api ~ curl</span>
              </div>
              <div style={{ padding: '16px 20px', minHeight: 260 }}>
                {terminalActive && (<>
                  <TerminalLine text="$ curl https://api.hermod.io/v1/wallets/analyze \\" delay={0} color={G} />
                  <TerminalLine text='  -H "Authorization: Bearer hmd_key_xxx" \' delay={120} />
                  <TerminalLine text='  -d {"address":"0x1234...5678","chain":1}' delay={240} />
                  <TerminalLine text="" delay={360} />
                  <TerminalLine text="HTTP/2 200" delay={520} color="hsl(0 0% 50%)" />
                  <TerminalLine text="{" delay={640} color="hsl(0 0% 60%)" />
                  <TerminalLine text='  "risk": "LOW",' delay={760} color={G} />
                  <TerminalLine text='  "score": 8,' delay={880} color={G} />
                  <TerminalLine text='  "flags": [],' delay={1000} color="hsl(0 0% 55%)" />
                  <TerminalLine text='  "tokens": 12,' delay={1120} color="hsl(0 0% 55%)" />
                  <TerminalLine text='  "approvals": 3' delay={1240} color={AM} />
                  <TerminalLine text="}" delay={1360} color="hsl(0 0% 60%)" />
                  <TerminalLine text="" delay={1480} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 1, transition: 'opacity 0.3s ease', transitionDelay: '1600ms', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: G, lineHeight: 1.8 }}>
                    <span>$ </span>
                    <span className="cursor-blink" style={{ width: 7, height: 13, background: G, display: 'inline-block', marginLeft: 2 }} />
                  </div>
                </>)}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ SECURITY / POLICY ══════════════════════════════════ */}
      <section className="home-section" style={{ position: 'relative', zIndex: 1, padding: '72px 40px', background: 'hsl(0 0% 4%)', borderTop: '1px solid hsl(0 0% 8%)', borderBottom: '1px solid hsl(0 0% 8%)' }}>
        <div className="home-grid-2" style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>

          {/* Policy visual */}
          <Reveal direction="left">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Max spend per tx', value: '$5,000 USDC', icon: Shield, color: G, ok: true },
                { label: 'Daily limit', value: '$25,000', icon: Clock, color: C, ok: true },
                { label: 'Allowed tokens', value: 'USDC, WETH, WBTC', icon: Lock, color: G, ok: true },
                { label: 'Blocked: Uniswap V2', value: 'Protocol blacklisted', icon: AlertTriangle, color: 'hsl(0 100% 63%)', ok: false },
                { label: 'Manual approval required', value: 'Tx > $10K', icon: Eye, color: AM, ok: true },
              ].map((rule, i) => (
                <Reveal key={i} delay={i * 70}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: 'hsl(0 0% 5%)',
                    border: `1px solid ${rule.ok ? 'hsl(0 0% 10%)' : 'hsl(0 100% 63% / 0.2)'}`,
                    borderLeft: `2px solid ${rule.color}`,
                    borderRadius: 2,
                  }}>
                    <rule.icon size={12} style={{ color: rule.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11, color: 'hsl(0 0% 60%)' }}>{rule.label}</span>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                      color: rule.ok ? G : 'hsl(0 100% 63%)',
                    }}>{rule.value}</span>
                    <CheckCircle2 size={11} style={{ color: rule.ok ? G : 'hsl(0 100% 63%)', flexShrink: 0 }} />
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          {/* Copy */}
          <div>
            <Reveal delay={60}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', color: 'hsl(0 0% 30%)' }}>POLICY ENGINE</span>
                <div style={{ flex: 1, height: 1, background: 'hsl(0 0% 10%)' }} />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'hsl(0 0% 90%)', lineHeight: 1.2, marginBottom: 16 }}>
                Agents that operate<br />
                <span style={{ color: G }}>within your rules.</span>
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p style={{ fontSize: 12, color: 'hsl(0 0% 45%)', lineHeight: 1.8, marginBottom: 24 }}>
                Define exactly what each agent can and cannot do. Spend limits, token allowlists, protocol restrictions, and manual approval thresholds enforced at execution time — not as suggestions.
              </p>
            </Reveal>
            <Reveal delay={280}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Spend Limits', 'Token Allowlist', 'Protocol Whitelist', 'Daily Caps', 'Approval Thresholds', 'Emergency Stop'].map(tag => (
                  <span key={tag} style={{
                    fontSize: 10, padding: '4px 10px',
                    background: 'hsl(112 100% 54% / 0.06)',
                    border: '1px solid hsl(112 100% 54% / 0.18)',
                    color: G, borderRadius: 2, letterSpacing: '0.04em',
                  }}>{tag}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ AUTOMATION ════════════════════════════════════════ */}
      <section className="home-section" style={{ position: 'relative', zIndex: 1, padding: '72px 40px', maxWidth: 1040, margin: '0 auto' }}>
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', color: 'hsl(0 0% 30%)' }}>AUTOMATION</span>
            <div style={{ flex: 1, height: 1, background: 'hsl(0 0% 10%)' }} />
          </div>
        </Reveal>
        <div className="home-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: Repeat, title: 'Recurring Execution', body: 'Schedule DCA strategies, recurring payments, and portfolio rebalancing with cron-based scheduling.', accent: C, delay: 0 },
            { icon: Activity, title: 'Real-time Monitoring', body: 'Continuous scanning of wallet state, token prices, and onchain events — with instant alerts on anomalies.', accent: AM, delay: 100 },
            { icon: Cpu, title: 'Multi-Agent Orchestration', body: 'Run multiple agents in parallel with separate policies per wallet, per chain, per strategy.', accent: G, delay: 200 },
          ].map((item, i) => (
            <FeatureCard key={i} {...item} description={item.body} />
          ))}
        </div>
      </section>

      {/* ══ CTA ══════════════════════════════════════════════ */}
      <section className="home-section" style={{ position: 'relative', zIndex: 1, padding: '80px 40px', textAlign: 'center', background: 'hsl(0 0% 4%)', borderTop: '1px solid hsl(0 0% 8%)' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at center, ${G}0A 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />
        <Reveal>
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', color: 'hsl(0 0% 92%)', marginBottom: 14 }}>
              Ready to run your first agent?
            </h2>
            <p style={{ fontSize: 13, color: 'hsl(0 0% 45%)', marginBottom: 32 }}>
              Non-custodial · Verifiable · Auditable · No minimum deposit
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={`${basePath}/whitepaper`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                fontSize: 12, fontWeight: 600, color: 'hsl(0 0% 3%)', textDecoration: 'none',
                padding: '11px 28px', background: G, borderRadius: 2,
                boxShadow: `0 0 32px ${G}45`,
                transition: 'background 150ms, box-shadow 150ms',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'hsl(112 100% 46%)'; el.style.boxShadow = `0 0 48px ${G}65`; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = G; el.style.boxShadow = `0 0 32px ${G}45`; }}
              >
                Whitepaper <ArrowRight size={13} />
              </Link>
              <Link href={`${basePath}/sign-in`} style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: 12, color: 'hsl(0 0% 55%)', textDecoration: 'none',
                padding: '11px 24px', border: '1px solid hsl(0 0% 14%)', borderRadius: 2,
                transition: 'color 150ms, border-color 150ms',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#fff'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'hsl(0 0% 30%)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'hsl(0 0% 55%)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'hsl(0 0% 14%)'; }}
              >
                Sign In
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════ */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid hsl(0 0% 8%)',
        padding: '20px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        background: 'hsl(0 0% 3%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={`${basePath}/logo.png`} alt="Hermod" style={{ width: 16, height: 16, objectFit: 'contain', opacity: 0.7 }} />
          <span style={{ fontSize: 10, color: 'hsl(0 0% 28%)', letterSpacing: '0.08em' }}>HERMOD · FINANCIAL AGENT CONSOLE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {['Non-custodial', 'Verifiable', 'Auditable'].map(t => (
            <span key={t} style={{ fontSize: 10, color: 'hsl(0 0% 22%)', letterSpacing: '0.06em' }}>{t}</span>
          ))}
          <a
            href="https://x.com/HermodAgent"
            target="_blank"
            rel="noopener noreferrer"
            title="@HermodAgent on X"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 10, color: 'hsl(0 0% 35%)', textDecoration: 'none',
              padding: '4px 10px',
              border: '1px solid hsl(0 0% 12%)',
              borderRadius: 2,
              transition: 'color 150ms, border-color 150ms',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = '#fff'; el.style.borderColor = 'hsl(0 0% 28%)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = 'hsl(0 0% 35%)'; el.style.borderColor = 'hsl(0 0% 12%)'; }}
          >
            {/* X (Twitter) icon */}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            @HermodAgent
          </a>
          <a
            href="https://t.me/hermodagent"
            target="_blank"
            rel="noopener noreferrer"
            title="Hermod on Telegram"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 10, color: 'hsl(0 0% 35%)', textDecoration: 'none',
              padding: '4px 10px',
              border: '1px solid hsl(0 0% 12%)',
              borderRadius: 2,
              transition: 'color 150ms, border-color 150ms',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = '#fff'; el.style.borderColor = 'hsl(0 0% 28%)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = 'hsl(0 0% 35%)'; el.style.borderColor = 'hsl(0 0% 12%)'; }}
          >
            {/* Telegram icon */}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Telegram
          </a>
        </div>
      </footer>
    </div>
  );
}
