# TradeWhisper

Just whisper your trade. The chain handles the rest.

TradeWhisper is an AI-powered OTC trading protocol on HashKey Chain testnet. A user writes a natural-language request like "sell 10 USDC for HSK, minimum 33 HSK", and the system handles parsing, offer generation, autonomous decisioning, and atomic settlement.

## Core Idea

- Replace confusing DeFi forms with a chat experience.
- Keep execution fully on-chain and verifiable.
- Use autonomous agents for market making and acceptance logic.
- Settle wallet-to-wallet in one atomic EVM transaction.

## One-Line Pitch

AI agents negotiate and execute OTC swaps directly between wallets, with full on-chain auditability.

## Architecture

- Smart contracts (HashKey testnet, chain ID 133):
	- TradeRouter: publishes trade requests and offers
	- AtomicSwap: validates signed offers and settles atomically
	- ReputationRegistry: tracks market-agent execution reputation
- Backend (Node.js + TypeScript):
	- Intent parser API (Groq, with local fallback parser)
	- MarketAgent listens for requests and submits signed offers
	- Evaluator agent accepts/rejects offers and triggers relayer execution
- Frontend (Next.js):
	- Trade chat interface
	- MetaMask connect + HashKey network switch
	- Upfront token approval + request submission

## Full Trade Flow

1. User types intent in chat.
2. Backend parses intent into structured trade data.
3. Frontend gets user token approval for AtomicSwap.
4. Frontend calls TradeRouter requestTrade.
5. MarketAgent receives on-chain request and submits offer.
6. Evaluator checks min-out and reputation policy.
7. If accepted, relayer calls executeTradeFor.
8. Trade settles atomically and reputation updates on-chain.

## Local Run (End-to-End)

### 1) Install dependencies

```bash
npm install
cd frontend && npm install
```

### 2) Configure environment

- Root env: copy .env.example to .env and fill keys, addresses, and policy values.
- Frontend env: set frontend/.env.local with backend URL and contract/token addresses.

### 3) Deploy contracts

```bash
npm run compile
npm run deploy:testnet
```

Update .env with deployed addresses.

### 4) Start backend API + agents

```bash
npm run dev
```

Backend health check:

```bash
curl http://localhost:3000/health
```

### 5) Start frontend chat

```bash
cd frontend
npm run dev
```

Open http://localhost:3001

## Explorer Monitoring

- HashKey testnet explorer: https://testnet-explorer.hsk.xyz/
- Verify request tx hash from chat
- Verify MarketAgent offer tx hash in backend logs
- Verify execution tx hash and final settlement events

## Notes

- If Groq is blocked in your network, local parser/evaluator fallback is used.
- User, market agent, and relayer wallets all need enough HSK gas.
- Keep secrets out of git. The root .gitignore already excludes .env.
