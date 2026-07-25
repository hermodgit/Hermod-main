<div align="center">

<img src="https://img.shields.io/badge/HERMOD-v1.0-22c55e?style=flat-square&labelColor=0a0a0a" alt="Hermod" />

# ⬡ HERMOD

**Verifiable Financial Agents for Onchain Finance**

A production-grade operating console for AI agents managing real onchain assets —
with policy enforcement, risk detection, and full audit trail.

<br/>

<a href="https://hermod.ink"><img src="https://img.shields.io/badge/⬡_hermod.ink-LIVE-22c55e?style=flat-square&labelColor=0a0a0a" alt="Live" /></a>
<img src="https://img.shields.io/badge/mainnet-ready-22c55e?style=flat-square&labelColor=0a0a0a" alt="Mainnet" />
<img src="https://img.shields.io/badge/execution-supervised-3b82f6?style=flat-square&labelColor=0a0a0a" alt="Supervised" />
<img src="https://img.shields.io/badge/custody-non--custodial-a855f7?style=flat-square&labelColor=0a0a0a" alt="Non-custodial" />

<br/><br/>

<a href="https://x.com/HermodAgent"><img src="https://img.shields.io/badge/@HermodAgent-000000?style=flat-square&logo=x&logoColor=white" alt="X" /></a>
&nbsp;
<a href="https://t.me/hermodagent"><img src="https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white" alt="Telegram" /></a>
&nbsp;
<a href="https://hermod.ink/whitepaper"><img src="https://img.shields.io/badge/Whitepaper-0a0a0a?style=flat-square&logo=readthedocs&logoColor=22c55e" alt="Whitepaper" /></a>

</div>

## Overview

**Hermod** is an operating console where AI financial agents manage real onchain assets under strict human supervision. Every action an agent takes passes through a deterministic policy engine, is risk-scored in real time, and is recorded in an immutable audit log. Nothing executes without your wallet signature — Hermod is fully **non-custodial** and never touches private keys.

| | |
|---|---|
| **Live Console** | [hermod.ink](https://hermod.ink) |
| **Primary Network** | Robinhood Chain (chainId `4663`) |
| **Execution Model** | 🔒 Supervised — wallet signature required for every transaction |
| **Custody** | Non-custodial. No private keys. Read-only chain state. |

---

## Core Modules

| Module | Description |
|---|---|
| **Risk Detection** | Real-time wallet & token risk analysis with verifiable onchain data. Blacklist detection, honeypot scanning, rugpull indicators. |
| **Portfolio Analysis** | Track balances, PnL, and composition across all chains and wallets. Live USD valuation. Historical snapshots with on-demand refresh. |
| **Approval Manager** | Discover, review, and revoke token approvals across all connected wallets. Infinite-approval detection and risk scoring. |
| **Transaction Engine** | Prepare, simulate, review, and execute transactions with full policy enforcement and approval flows. |
| **AI Agent Control** | Deploy and manage AI financial agents with spend limits, allowed-token lists, and manual override capability. |
| **Audit & Compliance** | Immutable event log of every agent action, approval decision, and system event. Exportable for compliance reporting. |

---

## How It Works

```
 STEP 01                    STEP 02                    STEP 03
 ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
 │ CONNECT WALLETS  │  ───▶ │ CONFIGURE        │  ───▶ │ DEPLOY & MONITOR │
 │                  │       │ POLICIES         │       │                  │
 │ Any EVM wallet.  │       │ Spend limits,    │       │ Agents execute   │
 │ Read-only chain  │       │ token allowlists │       │ within policy    │
 │ state. No keys.  │       │ approval gates   │       │ bounds. Logged.  │
 └──────────────────┘       └──────────────────┘       └──────────────────┘
```

---

## Architecture

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                        HERMOD CONSOLE (Web)                     │
 │        React · Vite · TailwindCSS · wagmi · TanStack Query      │
 └───────────────────────────────┬─────────────────────────────────┘
                                 │ REST / JSON
 ┌───────────────────────────────▼─────────────────────────────────┐
 │                          API GATEWAY                            │
 │     Express · Auth Middleware · Rate Limiting · CORS Policy     │
 ├──────────────┬──────────────┬──────────────┬────────────────────┤
 │ Policy       │ Risk         │ AI Intent    │ Audit              │
 │ Engine       │ Scoring     │ Parser        │ Trail              │
 ├──────────────┴──────────────┴──────────────┴────────────────────┤
 │              PostgreSQL (Drizzle ORM) · Structured Logs         │
 └───────────────────────────────┬─────────────────────────────────┘
                                 │ JSON-RPC (read-only)
 ┌───────────────────────────────▼─────────────────────────────────┐
 │        EVM NETWORKS — Robinhood Chain · Ethereum · L2s          │
 └─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" height="20"/> <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" height="20"/> <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" height="20"/> <img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" height="20"/> <img src="https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radixui&logoColor=white" height="20"/> |
| **Web3** | <img src="https://img.shields.io/badge/wagmi-1C1B1F?style=flat-square&logo=wagmi&logoColor=white" height="20"/> <img src="https://img.shields.io/badge/viem-1C1B1F?style=flat-square&logo=ethereum&logoColor=white" height="20"/> |
| **Backend** | <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" height="20"/> <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" height="20"/> <img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white" height="20"/> <img src="https://img.shields.io/badge/Pino-687634?style=flat-square&logo=pino&logoColor=white" height="20"/> |
| **Database** | <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" height="20"/> <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat-square&logo=drizzle&logoColor=black" height="20"/> |
| **Tooling** | <img src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white" height="20"/> <img src="https://img.shields.io/badge/esbuild-FFCF00?style=flat-square&logo=esbuild&logoColor=black" height="20"/> |

---

## Integrations

| Integration | Purpose | Link |
|---|---|---|
| <img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white" height="20"/> | Natural-language intent parsing & transaction planning for the AI assistant | [openai.com](https://openai.com) |
| <img src="https://img.shields.io/badge/Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white" height="20"/> | Authentication — email/password & Google SSO with branded consent screens | [clerk.com](https://clerk.com) |
| <img src="https://img.shields.io/badge/CoinGecko-8DC63F?style=flat-square&logo=coingecko&logoColor=white" height="20"/> | Live token prices & USD portfolio valuation across networks | [coingecko.com](https://coingecko.com) |
| <img src="https://img.shields.io/badge/MetaMask-FF7139?style=flat-square&logo=metamask&logoColor=white" height="20"/> | Wallet connection & supervised transaction signing | [metamask.io](https://metamask.io) |
| <img src="https://img.shields.io/badge/WalletConnect-3B99FC?style=flat-square&logo=walletconnect&logoColor=white" height="20"/> | Multi-wallet connectivity for any EVM-compatible wallet | [walletconnect.network](https://walletconnect.network) |
| <img src="https://img.shields.io/badge/Ethereum-3C3C3D?style=flat-square&logo=ethereum&logoColor=white" height="20"/> | JSON-RPC read-only chain state across all supported EVM networks | [ethereum.org](https://ethereum.org) |
| <img src="https://img.shields.io/badge/Uniswap-FF007A?style=flat-square&logo=uniswap&logoColor=white" height="20"/> | Onchain swap routing & quote simulation | [uniswap.org](https://uniswap.org) |

---

## Supported Networks

| Network | Chain ID | Status |
|---|---|---|
| ⬡ **Robinhood Chain** | `4663` | 🟢 Primary |
| Ethereum Mainnet | `1` | 🟢 Live |
| + 10 additional EVM networks | — | 🟢 Live |

---

## Policy Engine

Agents operate within your rules — enforced at execution time, not as suggestions.

| Policy Control | Example |
|---|---|
| Max spend per transaction | `$5,000 USDC` |
| Daily limit | `$25,000` |
| Allowed tokens | `USDC, WETH, WBTC` |
| Protocol blacklist | Blocked protocols rejected pre-flight |
| Manual approval threshold | `Tx > $10K` requires explicit confirmation |
| Emergency stop | Kill-switch for any agent, any time |

---

## AI Assistant

The console ships with a supervised AI assistant that parses natural-language intents into structured, policy-checked transaction plans.

| Intent Class | Status |
|---|---|
| Token transfer, swap, recurring execution | 🟢 Live |
| Portfolio query, risk analysis, approval review | 🟢 Live |
| Lending, borrowing, staking | 🟣 Recognized — execution coming soon |
| Liquidity provision, rewards claim, bridging | 🟣 Recognized — execution coming soon |

Every generated plan displays: 🔒 *Supervised execution — your wallet signature is required.*

---

## Developer API

Every feature is available via a REST API secured by API keys.

```bash
curl https://api.hermod.io/v1/wallets/analyze \
  -H "Authorization: Bearer hmd_key_xxx" \
  -d '{"address":"0x1234...5678","chain":1}'
```

- ⚡ Sub-200ms response time on all endpoints
- 🌐 REST API with OpenAPI spec + codegen
- 🔑 Per-key scopes, rate limits, and audit trail
- 📡 Webhook events for agent actions and alerts

---

## Project Structure

```
.
├── artifacts/
│   ├── hermod/            # Web console — React + Vite + TailwindCSS
│   │   └── src/
│   │       ├── pages/     # Dashboard, Wallets, AI Assistant, Whitepaper…
│   │       ├── components/
│   │       └── lib/       # chains.ts, tokens.ts, shared utilities
│   └── api-server/        # REST API — Express + Drizzle + Policy Engine
│       └── src/
│           ├── routes/    # portfolio, swap, ai, wallets, transactions…
│           └── middlewares/
└── packages/              # Shared workspace libraries (zod schemas, db)
```

---

## Getting Started

```bash
# install dependencies
pnpm install

# start the web console
pnpm --filter @workspace/hermod run dev

# start the API server
pnpm --filter @workspace/api-server run dev
```

Then open the console, connect any EVM-compatible wallet, and configure your first agent policy.

---

## Security Model

| Principle | Implementation |
|---|---|
| **Non-custodial** | Private keys never leave your wallet. All chain reads are RPC read-only. |
| **Supervised execution** | No transaction executes without an explicit wallet signature. |
| **Deterministic policy** | Limits enforced server-side at execution time — not advisory. |
| **Immutable audit** | Every agent action and approval decision is logged and exportable. |
| **Rate limiting** | Global API rate limits + per-key scoping. |
| **Strict CORS** | Origin allowlist — unknown origins denied. |

---

## Roadmap

| Quarter | Milestone | Status |
|---|---|---|
| Q3 2025 | Core console: swap, transfer, recurring execution, approvals, risk engine, agents fleet, mobile console, developer API | 🟢 LIVE |
| Q4 2025 | DeFi execution: lending, staking, liquidity provision, cross-chain bridging | 🟣 PLANNED |
| 2026 | Autonomous strategy vaults, institutional compliance suite | ⚪ RESEARCH |

---

## Community

<div align="center">

<a href="https://hermod.ink"><img src="https://img.shields.io/badge/⬡_Console-hermod.ink-22c55e?style=flat-square&labelColor=0a0a0a" alt="Console" /></a>
&nbsp;
<a href="https://x.com/HermodAgent"><img src="https://img.shields.io/badge/X-@HermodAgent-000000?style=flat-square&logo=x&logoColor=white" alt="X" /></a>
&nbsp;
<a href="https://t.me/hermodagent"><img src="https://img.shields.io/badge/Telegram-hermodagent-26A5E4?style=flat-square&logo=telegram&logoColor=white" alt="Telegram" /></a>
&nbsp;
<a href="https://hermod.ink/whitepaper"><img src="https://img.shields.io/badge/Docs-Whitepaper-0a0a0a?style=flat-square&logo=readthedocs&logoColor=22c55e" alt="Whitepaper" /></a>

<br/><br/>

⬡

**HERMOD** — Verifiable Financial Agents for Onchain Finance

*Built for those who demand proof, not promises.*

</div>
