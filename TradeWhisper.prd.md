# TradeWhisper Product Requirement Document

Version: 2.0
Date: April 2026
Track Focus: AI (Primary), DeFi (Secondary)
Network: HashKey Chain Testnet (Chain ID 133)

## 1. Product Overview

### 1.1 What is the system?
TradeWhisper is a conversational OTC trading protocol where users type natural language trade intent and complete real on-chain settlement on HashKey Chain.

### 1.2 Purpose of the product
The product simplifies DeFi trading UX while preserving on-chain transparency, atomic execution, and auditability.

### 1.3 Who will use it?
- Retail users who prefer chat UX over complex DeFi forms
- Crypto-native traders handling medium/large swaps
- Market makers providing quotes
- Judges/compliance stakeholders who need verifiable transaction trails

## 2. Objectives / Goals

### 2.1 Problem statements
- Current DeFi UX is too complex for non-experts
- OTC trading often happens in unstructured off-chain channels
- Users need trust-minimized and auditable execution

### 2.2 Product goals
- Convert plain language into structured trade intent
- Publish trade lifecycle events on-chain
- Execute accepted offers atomically in one transaction
- Maintain verifiable market-maker reputation on-chain

### 2.3 Success targets
- End-to-end live testnet flow with explorer-verifiable hashes
- Stable user flow from chat message to settled trade
- Fast and understandable judge demo experience

## 3. Users / Stakeholders

### 3.1 Primary users
- Trader: submits intent, approves token spend, initiates request
- Market Agent Operator: runs quoting agent logic

### 3.2 Secondary stakeholders
- Protocol Admin/Developer: deploys and configures contracts/services
- Judge/Reviewer: validates real execution on explorer

## 4. Functional Requirements

### 4.1 User-facing functions
- Connect wallet on HashKey testnet
- Submit natural language trade request
- Parse intent into structured fields
- Approve token spend for settlement contract
- Post trade request on-chain
- View request status and lifecycle updates
- Access history and leaderboard pages

### 4.2 Backend and agent functions
- Expose health endpoint
- Expose parse-intent endpoint
- Listen for new trade requests on-chain
- Compute and submit signed offers
- Evaluate offers against policy thresholds
- Trigger execution path for accepted offers
- Update user-visible lifecycle statuses

### 4.3 Smart contract functions
- Request publication and offer publication
- Cancel request (when valid)
- Execute atomic swap for accepted offers
- Increment market-maker reputation score after settlement

## 5. Non-Functional Requirements (FURPS)

### 5.1 Functionality
- Correct mapping of user intent fields (tokenIn, tokenOut, amountIn, minOut)
- Signature verification for settlement path

### 5.2 Usability
- Clear chat-first interface
- Minimal steps: intent -> approve -> on-chain request
- Visible transaction links for verification

### 5.3 Reliability
- Agent recovers and continues listening after transient failures
- Deterministic fallback parsing/evaluation when AI endpoint is unavailable

### 5.4 Performance
- Fast UI response for parse request
- Timely on-chain request detection and offer submission

### 5.5 Supportability/Security
- Secrets managed through environment variables
- Contract addresses configurable per environment
- Environment files excluded from git tracking

## 6. System Behavior / Workflow

1. User opens trade page and connects wallet.
2. User enters intent in natural language.
3. Frontend sends message to backend parse endpoint.
4. Parsed intent is shown and validated in chat.
5. User approves token allowance.
6. Frontend calls requestTrade on TradeRouter.
7. Market agent detects TradeRequested event.
8. Agent computes quote and submits signed offer.
9. Offer is evaluated against policy constraints.
10. Accepted path executes atomic settlement.
11. Final status and transaction links are shown to user.

## 7. Constraints

- Network constraint: currently optimized for HashKey testnet flow
- Wallet dependency: MetaMask/injected wallet required for approvals and tx signing
- Liquidity constraint: offer quality depends on agent and configured policy
- Demo scope constraint: protocol currently focused on core HSK/USDC style path

## 8. UI Requirements

- Interface must remain simple and conversational
- Navigation should provide quick access to Home, Trade, History, Leaderboard, Docs
- Status messages must be human-readable and non-ambiguous
- On-chain proof links should be visible for each key lifecycle step

## 9. System Scope

### 9.1 In Scope (MVP)
- Conversational intent parsing
- On-chain request/offer/execute lifecycle
- Atomic settlement with reputation update
- Trade history and leaderboard views
- Deployed frontend and backend URLs for judge demo

### 9.2 Out of Scope (Current MVP)
- Multi-agent auction routing
- Cross-chain settlement
- Fiat rails and custodial integrations
- Mobile-native app distribution

## 10. Architecture Summary

### 10.1 Frontend
- Next.js app with pages for trade, history, leaderboard, docs
- Wallet connect and transaction initiation

### 10.2 Backend/Agents
- Node.js + TypeScript API and event-driven market agent
- Intent parser endpoint and health endpoint

### 10.3 Protocol Contracts
- TradeRouter for request/offer lifecycle
- AtomicSwap for settlement
- ReputationRegistry for scoring
- Test assets for demo liquidity and pricing inputs

## 11. Deployment Summary

- Frontend deployment: Vercel
- Backend deployment: Render
- Blockchain: HashKey testnet

## 12. Risk and Mitigation Summary

- AI parse ambiguity: strict schema + clarification/fallback behavior
- Agent downtime: persistent deployment + health monitoring
- User confusion during demo: explicit lifecycle text and tx links
- Secret leakage risk: .env ignored, template-only env example tracked

## 13. Acceptance Criteria

- User can submit valid natural language trade intent
- Backend parse endpoint returns structured result
- Trade request is posted on-chain with visible tx hash
- Agent submits offer and settlement path can complete
- History/leaderboard routes accessible and functional
- Health endpoint reports service as live
