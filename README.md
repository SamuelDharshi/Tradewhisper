# TradeWhisper Backend (Testnet Live)

This backend implements the PRD backend stack on HashKey Chain testnet (Chain ID 133):

- `TradeRouter.sol`: on-chain RFQ request + offer events
- `AtomicSwap.sol`: EIP-712 verified atomic settlement in one transaction
- `ReputationRegistry.sol`: on-chain market agent score updates
- `MarketAgent` (Node.js): listens to live `TradeRequested`, reads live oracle price, signs offer, submits on-chain
- `UserAgent Evaluator` (Node.js): listens to `TradeOffered`, evaluates offer against user minimum and agent reputation, auto-executes via relayer when accepted
- `Intent API`: `POST /parse-intent` using Groq LLM strict JSON output format

No mocked execution path is used for settlement. Trades settle through live testnet transactions.

## 1) Install

```bash
npm install
```

## 2) Configure environment

Copy `.env.example` to `.env` and fill all values:

- private keys
- relayer key (`RELAYER_PRIVATE_KEY`) for autonomous `executeTradeFor`
- Groq API key (`GROQ_API_KEY`)
- deployed contract addresses
- **live** USDC/HSK/oracle addresses on HashKey testnet

## 3) Compile and deploy contracts

```bash
npm run compile
npm run deploy:testnet
```

Update `.env` with deployed `REPUTATION_REGISTRY_ADDRESS`, `TRADE_ROUTER_ADDRESS`, and `ATOMIC_SWAP_ADDRESS`.

## 4) Run MarketAgent + API

```bash
npm run agent:dev
```

API:

- `GET /health`
- `POST /parse-intent` with body `{ "message": "I want to sell 10 USDC for HSK" }`

## 5) Required approvals before accepting a trade

For settlement to succeed in `AtomicSwap.executeTrade()`:

- Requesting user must approve `AtomicSwap` to spend `tokenIn`
- MarketAgent wallet must approve `AtomicSwap` to spend `tokenOut`
- Relayer wallet must have HSK gas to submit autonomous settlement transactions

## 6) Production notes

- Keep MarketAgent online continuously to respond within 60 seconds
- Use secure key management (never plain `.env` in production)
- Use reliable RPC endpoints with failover
