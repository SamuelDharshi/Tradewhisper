# TradeWhisperFrontend

Frontend app for TradeWhisper OTC flows on HashKey testnet.

## Overview

This Next.js app provides the user-facing trade experience:

- Landing page with protocol sections
- Trade chat flow (`/trade`)
- Trade history (`/history`)
- Reputation leaderboard (`/leaderboard`)
- Protocol docs (`/docs`)

The app talks to the backend API (default `http://localhost:3000`) for intent parsing and lifecycle status, and sends wallet transactions to deployed contracts on HashKey testnet.

## Requirements

- Node.js 18+
- MetaMask-compatible wallet
- HashKey testnet configured in wallet (`chainId 133`)

## Environment

Create `.env.local` from `.env.local.example` and set values:

- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_EXPLORER_URL`
- `NEXT_PUBLIC_TRADE_ROUTER`
- `NEXT_PUBLIC_ATOMIC_SWAP`
- `NEXT_PUBLIC_REPUTATION_REGISTRY`
- `NEXT_PUBLIC_BASE_TOKEN`
- `NEXT_PUBLIC_QUOTE_TOKEN`

## Run Locally

```bash
npm install
npm run dev
```

Default development URL: `http://localhost:3001`

## Build

```bash
npm run build
npm run start
```

## Notes

- `npm run dev` includes a predev script that frees port `3001` when possible.
- Trading flow is backend-driven after request publication: manual accept/reject is intentionally removed in UI.
- Explorer links are shown in chat/history for judge-friendly verification.
