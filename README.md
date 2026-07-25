<div align="center">

<img src="https://img.shields.io/badge/HERMOD-v1.0-22c55e?style=flat-square&labelColor=0a0a0a" alt="Hermod" />

<h3>⬡ HERMOD</h3>

<sub><b>VERIFIABLE FINANCIAL AGENTS FOR ONCHAIN FINANCE</b></sub>

<br/><br/>

<sub>A production-grade operating console for AI agents managing real onchain assets —<br/>with policy enforcement, risk detection, and full audit trail.</sub>

<br/><br/>

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

<br/>

---

<sub><b>◈ TABLE OF CONTENTS</b></sub>

<sub>

1. [Overview](#-overview)
2. [Core Modules](#-core-modules)
3. [How It Works](#-how-it-works)
4. [Architecture](#-architecture)
5. [Tech Stack](#-tech-stack)
6. [Integrations](#-integrations)
7. [Supported Networks](#-supported-networks)
8. [Policy Engine](#-policy-engine)
9. [AI Assistant](#-ai-assistant)
10. [Developer API](#-developer-api)
11. [Project Structure](#-project-structure)
12. [Getting Started](#-getting-started)
13. [Security Model](#-security-model)
14. [Roadmap](#-roadmap)
15. [Community](#-community)

</sub>

---

### ◈ Overview

<sub>

**Hermod** is an operating console where AI financial agents manage real onchain assets under strict human supervision. Every action an agent takes passes through a deterministic policy engine, is risk-scored in real time, and is recorded in an immutable audit log. Nothing executes without your wallet signature — Hermod is fully **non-custodial** and never touches private keys.

</sub>

<sub>

| | |
|---|---|
| <sub>**Live Console**</sub> | <sub>[hermod.ink](https://hermod.ink)</sub> |
| <sub>**Primary Network**</sub> | <sub>Robinhood Chain (chainId `4663`)</sub> |
| <sub>**Execution Model**</sub> | <sub>🔒 Supervised — wallet signature required for every transaction</sub> |
| <sub>**Custody**</sub> | <sub>Non-custodial. No private keys. Read-only chain state.</sub> |

</sub>

---

### ◈ Core Modules

<sub>

| Module | Description |
|---|---|
| <sub>🛡 **Risk Detection**</sub> | <sub>Real-time wallet & token risk analysis with verifiable onchain data. Blacklist detection, honeypot scanning, rugpull indicators.</sub> |
| <sub>📈 **Portfolio Analysis**</sub> | <sub>Track balances, PnL, and composition across all chains and wallets. Live USD valuation. Historical snapshots with on-demand refresh.</sub> |
| <sub>🔑 **Approval Manager**</sub> | <sub>Discover, review, and revoke token approvals across all connected wallets. Infinite-approval detection and risk scoring.</sub> |
| <sub>⚙ **Transaction Engine**</sub> | <sub>Prepare, simulate, review, and execute transactions with full policy enforcement and approval flows.</sub> |
| <sub>🤖 **AI Agent Control**</sub> | <sub>Deploy and manage AI financial agents with spend limits, allowed-token lists, and manual override capability.</sub> |
| <sub>📋 **Audit & Compliance**</sub> | <sub>Immutable event log of every agent action, approval decision, and system event. Exportable for compliance reporting.</sub> |

</sub>

---

### ◈ How It Works

<sub>

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

</sub>

---

### ◈ Architecture

<sub>

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
 │ Engine       │ Scoring      │ Parser       │ Trail              │
 ├──────────────┴──────────────┴──────────────┴────────────────────┤
 │              PostgreSQL (Drizzle ORM) · Structured Logs         │
 └───────────────────────────────┬─────────────────────────────────┘
                                 │ JSON-RPC (read-only)
 ┌───────────────────────────────▼─────────────────────────────────┐
 │        EVM NETWORKS — Robinhood Chain · Ethereum · L2s          │
 └─────────────────────────────────────────────────────────────────┘
```

</sub>

---

### ◈ Tech Stack

<sub>

| Layer | Technologies |
|---|---|
| <sub>**Frontend**</sub> | <sub><img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" height="18"/> <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" height="18"/> <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" height="18"/> <img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" height="18"/> <img src="https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radixui&logoColor=white" height="18"/></sub> |
| <sub>**Web3**</sub> | <sub><img src="https://img.shields.io/badge/wagmi-1C1B1F?style=flat-square&logo=wagmi&logoColor=white" height="18"/> <img src="https://img.shields.io/badge/viem-1C1B1F?style=flat-square&logo=ethereum&logoColor=white" height="18"/></sub> |
| <sub>**Backend**</sub> | <sub><img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" height="18"/> <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" height="18"/> <img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white" height="18"/> <img src="https://img.shields.io/badge/Pino-687634?style=flat-square&logo=pino&logoColor=white" height="18"/></sub> |
| <sub>**Database**</sub> | <sub><img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" height="18"/> <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat-square&logo=drizzle&logoColor=black" height="18"/></sub> |
| <sub>**Tooling**</sub> | <sub><img src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white" height="18"/> <img src="https://img.shields.io/badge/esbuild-FFCF00?style=flat-square&logo=esbuild&logoColor=black" height="18"/></sub> |

</sub>

---

### ◈ Integrations

<sub>

| Integration | Purpose | Link |
|---|---|---|
| <sub><img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white" height="18"/></sub> | <sub>Natural-language intent parsing & transaction planning for the AI assistant</sub> | <sub>[openai.com](https://openai.com)</sub> |
| <sub><img src="https://img.shields.io/badge/Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white" height="18"/></sub> | <sub>Authentication — email/password & Google SSO with branded consent screens</sub> | <sub>[clerk.com](https://clerk.com)</sub> |
| <sub><img src="https://img.shields.io/badge/CoinGecko-8DC63F?style=flat-square&logo=coingecko&logoColor=white" height="18"/></sub> | <sub>Live token prices & USD portfolio valuation across networks</sub> | <sub>[coingecko.com](https://coingecko.com)</sub> |
| <sub><img src="https://img.shields.io/badge/MetaMask-FF7139?style=flat-square&logo=metamask&logoColor=white" height="18"/></sub> | <sub>Wallet connection & supervised transaction signing</sub> | <sub>[metamask.io](https://metamask.io)</sub> |
| <sub><img src="https://img.shields.io/badge/WalletConnect-3B99FC?style=flat-square&logo=walletconnect&logoColor=white" height="18"/></sub> | <sub>Multi-wallet connectivity for any EVM-compatible wallet</sub> | <sub>[walletconnect.network](https://walletconnect.network)</sub> |
| <sub><img src="https://img.shields.io/badge/Ethereum-3C3C3D?style=flat-square&logo=ethereum&logoColor=white" height="18"/></sub> | <sub>JSON-RPC read-only chain state across all supported EVM networks</sub> | <sub>[ethereum.org](https://ethereum.org)</sub> |
| <sub><img src="https://img.shields.io/badge/Uniswap-FF007A?style=flat-square&logo=uniswap&logoColor=white" height="18"/></sub> | <sub>Onchain swap routing & quote simulation</sub> | <sub>[uniswap.org](https://uniswap.org)</sub> |

</sub>

---

### ◈ Supported Networks

<sub>

| Network | Chain ID | Status |
|---|---|---|
| <sub>⬡ **Robinhood Chain**</sub> | <sub>`4663`</sub> | <sub>🟢 Primary</sub> |
| <sub>Ethereum Mainnet</sub> | <sub>`1`</sub> | <sub>🟢 Live</sub> |
| <sub>+ 10 additional EVM networks</sub> | <sub>—</sub> | <sub>🟢 Live</sub> |

</sub>

---

### ◈ Policy Engine

<sub>Agents operate within your rules — enforced at execution time, not as suggestions.</sub>

<sub>

| Policy Control | Example |
|---|---|
| <sub>🛡 Max spend per transaction</sub> | <sub>`$5,000 USDC`</sub> |
| <sub>🕐 Daily limit</sub> | <sub>`$25,000`</sub> |
| <sub>🔒 Allowed tokens</sub> | <sub>`USDC, WETH, WBTC`</sub> |
| <sub>⛔ Protocol blacklist</sub> | <sub>Blocked protocols rejected pre-flight</sub> |
| <sub>👁 Manual approval threshold</sub> | <sub>`Tx > $10K` requires explicit confirmation</sub> |
| <sub>🚨 Emergency stop</sub> | <sub>Kill-switch for any agent, any time</sub> |

</sub>

---

### ◈ AI Assistant

<sub>The console ships with a supervised AI assistant that parses natural-language intents into structured, policy-checked transaction plans.</sub>

<sub>

| Intent Class | Status |
|---|---|
| <sub>Token transfer, swap, recurring execution</sub> | <sub>🟢 Live</sub> |
| <sub>Portfolio query, risk analysis, approval review</sub> | <sub>🟢 Live</sub> |
| <sub>Lending, borrowing, staking</sub> | <sub>🟣 Recognized — execution coming soon</sub> |
| <sub>Liquidity provision, rewards claim, bridging</sub> | <sub>🟣 Recognized — execution coming soon</sub> |

</sub>

<sub>Every generated plan displays: 🔒 <i>Supervised execution — your wallet signature is required.</i></sub>

---

### ◈ Developer API

<sub>Every feature is available via a REST API secured by API keys.</sub>

```bash
curl https://api.hermod.io/v1/wallets/analyze \
  -H "Authorization: Bearer hmd_key_xxx" \
  -d '{"address":"0x1234...5678","chain":1}'
```

<sub>

- ⚡ Sub-200ms response time on all endpoints
- 🌐 REST API with OpenAPI spec + codegen
- 🔑 Per-key scopes, rate limits, and audit trail
- 📡 Webhook events for agent actions and alerts

</sub>

---

### ◈ Project Structure

<sub>

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

</sub>

---

### ◈ Getting Started

<sub>

```bash
# install dependencies
pnpm install

# start the web console
pnpm --filter @workspace/hermod run dev

# start the API server
pnpm --filter @workspace/api-server run dev
```

</sub>

<sub>Then open the console, connect any EVM-compatible wallet, and configure your first agent policy.</sub>

---

### ◈ Security Model

<sub>

| Principle | Implementation |
|---|---|
| <sub>**Non-custodial**</sub> | <sub>Private keys never leave your wallet. All chain reads are RPC read-only.</sub> |
| <sub>**Supervised execution**</sub> | <sub>No transaction executes without an explicit wallet signature.</sub> |
| <sub>**Deterministic policy**</sub> | <sub>Limits enforced server-side at execution time — not advisory.</sub> |
| <sub>**Immutable audit**</sub> | <sub>Every agent action and approval decision is logged and exportable.</sub> |
| <sub>**Rate limiting**</sub> | <sub>Global API rate limits + per-key scoping.</sub> |
| <sub>**Strict CORS**</sub> | <sub>Origin allowlist — unknown origins denied.</sub> |

</sub>

---

### ◈ Roadmap

<sub>

| Quarter | Milestone | Status |
|---|---|---|
| <sub>Q3 2025</sub> | <sub>Core console: swap, transfer, recurring execution, approvals, risk engine, agents fleet, mobile console, developer API</sub> | <sub>🟢 LIVE</sub> |
| <sub>Q4 2025</sub> | <sub>DeFi execution: lending, staking, liquidity provision, cross-chain bridging</sub> | <sub>🟣 PLANNED</sub> |
| <sub>2026</sub> | <sub>Autonomous strategy vaults, institutional compliance suite</sub> | <sub>⚪ RESEARCH</sub> |

</sub>

---

### ◈ Community

<div align="center">

<br/>

<a href="https://hermod.ink"><img src="https://img.shields.io/badge/⬡_Console-hermod.ink-22c55e?style=flat-square&labelColor=0a0a0a" alt="Console" /></a>
&nbsp;
<a href="https://x.com/HermodAgent"><img src="https://img.shields.io/badge/X-@HermodAgent-000000?style=flat-square&logo=x&logoColor=white" alt="X" /></a>
&nbsp;
<a href="https://t.me/hermodagent"><img src="https://img.shields.io/badge/Telegram-hermodagent-26A5E4?style=flat-square&logo=telegram&logoColor=white" alt="Telegram" /></a>
&nbsp;
<a href="https://hermod.ink/whitepaper"><img src="https://img.shields.io/badge/Docs-Whitepaper-0a0a0a?style=flat-square&logo=readthedocs&logoColor=22c55e" alt="Whitepaper" /></a>

<br/><br/>

<sub>⬡</sub>

<sub><b>HERMOD</b> — Verifiable Financial Agents for Onchain Finance</sub>

<sub><i>Built for those who demand proof, not promises.</i></sub>

<br/>

</div>
