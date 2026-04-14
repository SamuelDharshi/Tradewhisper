# TradeWhisper

Just whisper your trade. The chain handles the rest.

TradeWhisper is a conversational OTC protocol built for HashKey Chain. A user types a natural-language request like "sell 10 USDC for HSK", and the system turns that into a real on-chain request, autonomous market response, and atomic settlement.

## Project Summary (PRD Aligned)

- Primary track fit: AI
- Secondary track fit: DeFi
- Core idea: remove DeFi UX friction while keeping full on-chain verifiability
- Demo principle: no mocks, all important actions are explorer-verifiable

## Problem

- OTC trading today is often off-chain and trust-heavy
- DEX UX is too complex for many users (AMMs, slippage, LPs)
- HashKey testnet lacked a chat-native, atomic OTC flow with public reputation

## Solution

- Chat-first trading interface
- AI intent parsing to strict trade schema
- On-chain request and offer lifecycle
- Atomic settlement in a single transaction (or no trade)
- On-chain market-maker reputation tracking

## Architecture

### 1) Frontend Layer (Next.js)

- User-facing routes in [TradeWhisperFrontend/app/page.tsx](TradeWhisperFrontend/app/page.tsx), [TradeWhisperFrontend/app/trade/page.tsx](TradeWhisperFrontend/app/trade/page.tsx), [TradeWhisperFrontend/app/history/page.tsx](TradeWhisperFrontend/app/history/page.tsx), [TradeWhisperFrontend/app/leaderboard/page.tsx](TradeWhisperFrontend/app/leaderboard/page.tsx), [TradeWhisperFrontend/app/docs/page.tsx](TradeWhisperFrontend/app/docs/page.tsx)
- Chat and wallet logic in [TradeWhisperFrontend/components/trade/TradeChat.tsx](TradeWhisperFrontend/components/trade/TradeChat.tsx)

### 2) Backend Agent/API Layer (Node.js + TypeScript)

- Runtime entry: [src/agent/index.ts](src/agent/index.ts)
- Config and env loading: [src/agent/config.ts](src/agent/config.ts)
- Intent parser + evaluator logic: [src/agent/intent.ts](src/agent/intent.ts)
- Pricing logic: [src/agent/pricing.ts](src/agent/pricing.ts)
- HTTP endpoints include `/health` and `/parse-intent`
- Also runs long-lived on-chain listeners for trade request/offer events

### 3) Smart Contract Layer (HashKey testnet, chainId 133)

- TradeRouter: request and offer message bus
- AtomicSwap: signature verification and atomic execution
- ReputationRegistry: agent score state

## End-to-End Trade Flow

1. User sends trade intent in chat.
2. AI parser returns normalized trade fields.
3. Frontend publishes request on-chain via TradeRouter.
4. Market agent detects request and computes quote.
5. Agent submits signed offer on-chain.
6. Evaluator policy accepts or rejects by constraints/reputation.
7. AtomicSwap executes final settlement when accepted.
8. Reputation updates and all tx hashes are visible on explorer.

## Tech Stack

- Chain: HashKey testnet
- Contracts: Solidity + Hardhat
- Backend: Node.js, TypeScript, Express, ethers
- AI: OpenAI-compatible API interface (Groq endpoint configured)
- Frontend: Next.js, React, Tailwind, ethers v6
- Wallet: MetaMask (HashKey network)

## Local Run

### 1) Install

```bash
npm install
cd TradeWhisperFrontend
npm install
cd ..
```

### 2) Configure env

- Backend env template: [.env.example](.env.example)
- Frontend env template: [TradeWhisperFrontend/.env.local.example](TradeWhisperFrontend/.env.local.example)

### 3) Compile and deploy contracts

```bash
npm run compile
npm run deploy:testnet
```

### 4) Start backend

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

### 5) Start frontend

```bash
cd TradeWhisperFrontend
npm run dev
```

## Deployment

### Frontend (Vercel)

- Live URL: https://tradewhisper-frontend.vercel.app
- Vercel project is already linked in [TradeWhisperFrontend/.vercelignore](TradeWhisperFrontend/.vercelignore)

### Backend (Render)

- Blueprint file: [render.yaml](render.yaml)
- Build command: `npm install; npm run build`
- Start command: `npm run start`
- Health path: `/health`

Required secret env vars on Render:

- GROQ_API_KEY
- MARKET_AGENT_PRIVATE_KEY
- RELAYER_PRIVATE_KEY
- TRADE_ROUTER_ADDRESS
- ATOMIC_SWAP_ADDRESS
- REPUTATION_REGISTRY_ADDRESS
- USDC_ADDRESS
- HSK_TOKEN_ADDRESS
- PRICE_ORACLE_ADDRESS

## Success Metrics (from PRD)

- Live demo trades: >= 5
- Parse accuracy target: >= 95%
- Settlement latency target: < 15s
- First-time chat-to-trade target: < 60s

## Notes

- Backend supports `BACKEND_PORT`, `API_PORT`, and platform `PORT`.
- Keep private keys and API keys out of git.
- Frontend details are in [TradeWhisperFrontend/README.md](TradeWhisperFrontend/README.md).
