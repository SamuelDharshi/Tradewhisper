# TradeWhisper Frontend

Conversational OTC trading UI for TradeWhisper on HashKey Testnet.

This application is the user-facing layer of the TradeWhisper protocol. Users type trade intent in natural language, confirm wallet actions, and watch the full lifecycle move on-chain from request to settlement.

## What This Project Is

TradeWhisper combines AI + DeFi into a single workflow:

- AI converts natural-language user messages into structured trade intent.
- Smart contracts manage request publication, offer submission, and atomic settlement.
- A backend market agent listens to on-chain events and submits signed offers.
- The frontend shows transparent status updates and explorer links for every critical step.

## Product Goal

Make OTC trading approachable without sacrificing verifiability.

Users should be able to go from:

"Sell 10 USDC for HSK, minimum 33 HSK"

to:

- a real on-chain trade request,
- a real on-chain offer,
- and atomic settlement (or no settlement).

## High-Level Architecture

TradeWhisper has three runtime layers:

1. Frontend (this app)
2. Backend + Agents (Node.js/TypeScript service)
3. Smart Contracts (Solidity on HashKey Testnet)

### 1) Frontend Responsibilities

- Provide the chat-driven interface (`/trade`)
- Connect wallet and enforce HashKey chain selection (`chainId 133`)
- Call backend intent parsing endpoint (`POST /parse-intent`)
- Request token approvals via MetaMask
- Submit `requestTrade(...)` transaction to `TradeRouter`
- Poll on-chain events and display lifecycle status:
	- `REQUESTED`
	- `OFFERED`
	- `EXECUTED`
	- `CANCELLED`
- Display explorer links for request and subsequent action transactions

### 2) Backend + Agent Responsibilities

- Expose API endpoints:
	- `GET /`
	- `GET /health`
	- `POST /parse-intent`
- Parse user messages into structured schema
- Subscribe to `TradeRequested` events on `TradeRouter`
- Price and submit signed offers (`submitOffer`)
- Evaluate offers against policy constraints
- Execute settlement through `AtomicSwap.executeTradeFor(...)` when conditions pass

### 3) Contract Responsibilities

- `TradeRouter`
	- Stores trade requests
	- Emits request/offer/cancel/execute lifecycle events
	- Allows `AtomicSwap` to mark request execution
- `AtomicSwap`
	- Verifies EIP-712 signed offer
	- Enforces deadlines and `minAmountOut`
	- Executes token-for-token settlement atomically
	- Updates reputation via `ReputationRegistry`
- `ReputationRegistry`
	- Tracks market-agent execution performance score

## End-to-End Sequence Diagram

```mermaid
sequenceDiagram
	autonumber
	participant U as User
	participant F as Frontend (Next.js)
	participant MM as MetaMask
	participant B as Backend API
	participant MA as Market Agent
	participant TR as TradeRouter
	participant AS as AtomicSwap
	participant RR as ReputationRegistry
	participant EX as HashKey Explorer

	U->>F: Type natural-language trade intent
	F->>B: POST /parse-intent { message }
	B-->>F: Parsed intent (tokenIn, tokenOut, amountIn, minAmountOut)

	F->>MM: Request wallet connect + chain switch (133)
	MM-->>F: Connected signer

	F->>MM: Approve tokenIn allowance for AtomicSwap (if needed)
	MM-->>F: Approval tx hash
	F-->>EX: Approval transaction visible

	F->>TR: requestTrade(tokenIn, tokenOut, amountIn, minAmountOut, deadline, nonce)
	TR-->>EX: TradeRequested event + tx hash
	F-->>U: Request status = REQUESTED

	MA->>TR: Listen TradeRequested; compute quote; submitOffer(..., signedOffer)
	TR-->>EX: TradeOffered event + tx hash
	F-->>U: Request status = OFFERED

	MA->>AS: executeTradeFor(requestId, requester, amountOut, offerDeadline, agent, signature)
	AS->>TR: markExecuted(requestId, agent, amountOut)
	AS->>RR: increment(agent)
	AS-->>EX: TradeSettled tx hash
	TR-->>EX: TradeExecuted event
	F-->>U: Request status = EXECUTED + explorer links
```

## Main User Flow

1. User opens `/trade` and connects MetaMask.
2. User sends a natural-language trade message.
3. Frontend calls backend parser and receives structured intent.
4. Frontend requests token approval if allowance is insufficient.
5. Frontend publishes request with `TradeRouter.requestTrade(...)`.
6. Market agent detects request event and submits an on-chain offer.
7. Agent policy evaluates offer and either executes or rejects.
8. If accepted, `AtomicSwap` settles assets atomically and increments reputation.
9. Frontend detects status changes and surfaces explorer-verifiable links.

## Pages

- `/` Landing page
- `/trade` Conversational trade flow
- `/history` Local/user trade history view
- `/leaderboard` Reputation-oriented leaderboard
- `/docs` Protocol and usage notes

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- ethers v6
- Tailwind CSS
- MetaMask / injected wallet provider
- HashKey Testnet (EVM)

## Prerequisites

- Node.js 18+
- npm
- MetaMask-compatible browser wallet
- HashKey Testnet RPC support

## Environment Variables

Create `TradeWhisperFrontend/.env.local` with:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_TRADE_ROUTER_ADDRESS=0xEEb42D6F9E90Bc13BBb0077d9CAC972a48C59d24
NEXT_PUBLIC_ATOMIC_SWAP_ADDRESS=0x71e7763BB53AEf04CbC5Ee784A146e7Eb08A019b
NEXT_PUBLIC_USDC_ADDRESS=0xCA886ebef3d708fA61bD3b3606F31c904258ec3A
NEXT_PUBLIC_HSK_TOKEN_ADDRESS=0x55f11eD5DF8a2d78cC69a8e39464841e86F278a3
```

Notes:

- Backend default local port is `3000`.
- Frontend dev server runs on `3001`.

## Local Development

From `TradeWhisperFrontend`:

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3001`
- Trade page: `http://localhost:3001/trade`

## Build and Run Production Mode

```bash
npm run build
npm run start
```

## Backend Dependency for Full Flow

The frontend can render without backend, but full conversational trade lifecycle requires backend API + agent running.

From repository root:

```bash
npm install
npm run dev
```

Health check:

- `http://localhost:3000/health`

## Verification Checklist

To validate full project behavior:

1. Connect wallet on chain 133.
2. Submit intent: "Sell 10 USDC for HSK, minimum 33 HSK".
3. Confirm approval tx (if first run).
4. Confirm request tx and capture requestId.
5. Watch status move from `REQUESTED` to `OFFERED`.
6. Confirm final status `EXECUTED` and open explorer tx links.

## Project Scope Notes

- Current MVP focuses on HashKey testnet and core USDC/HSK path.
- Offer handling is agent-driven after request publication.
- Status and proof are optimized for clear judge/demo verification.
