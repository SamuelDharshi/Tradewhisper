# TradeWhisper

TradeWhisper is an AI-powered OTC trading protocol on HashKey testnet. Users send a natural language trade intent, autonomous agents quote and evaluate on-chain offers, and settlement executes atomically on EVM contracts.

## Repositories In This Workspace

- Root project: smart contracts + backend agent/API runtime
- TradeWhisperFrontend: Next.js app used for demo and user interaction

## Stack

- Chain: HashKey testnet (`chainId: 133`)
- Contracts: `TradeRouter`, `AtomicSwap`, `ReputationRegistry`, `MockUSDC`, `MockPriceOracle`
- Backend: Node.js + TypeScript + Express + ethers + Hardhat
- Frontend: Next.js 16 + React 19 + ethers v6

## Trade Lifecycle

1. User submits a chat intent (`sell 10 USDC for HSK, min 33 HSK`).
2. Backend parses the intent into structured trade params.
3. Frontend sends `requestTrade` to `TradeRouter`.
4. Market agent detects request and posts a signed quote.
5. Evaluator policy decides accept/reject automatically.
6. Accepted offers execute atomically through `executeTradeFor` / `executeTrade`.
7. Trade and reputation events are visible on the HashKey explorer.

## Local Setup

### 1) Install dependencies

```bash
npm install
cd TradeWhisperFrontend
npm install
cd ..
```

### 2) Configure environment

- Backend: copy `.env.example` to `.env`, then fill RPC, keys, and deployed addresses.
- Frontend: use `TradeWhisperFrontend/.env.local.example` as template for local values.

### 3) Compile and deploy contracts

```bash
npm run compile
npm run deploy:testnet
```

### 4) Start backend (port 3000)

```bash
npm run dev
```

Health endpoint:

```bash
curl http://localhost:3000/health
```

### 5) Start frontend (port 3001)

```bash
cd TradeWhisperFrontend
npm run dev
```

App routes:

- `http://localhost:3001/`
- `http://localhost:3001/trade`
- `http://localhost:3001/history`
- `http://localhost:3001/leaderboard`
- `http://localhost:3001/docs`

## Notes

- Backend port is intentionally decoupled from generic `PORT` and defaults to `3000`.
- If LLM parsing is unavailable, backend falls back to local parser logic.
- Keep secrets out of source control.
- Frontend-specific details are documented in `TradeWhisperFrontend/README.md`.
