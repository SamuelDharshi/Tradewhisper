Here is the structured Product Requirements Document (PRD) for TradeWhisper, based on the provided materials. 

# [cite_start]TradeWhisper: Product Requirements Document [cite: 1, 2]

[cite_start]**"Just whisper your trade. The chain handles the rest."** [cite: 3, 62]

* [cite_start]**Recommended Track:** AI (Primary) + DeFi (Secondary) [cite: 4, 6]
* **Prize Pool:** 40,000 USDT | [cite_start]Apr 22-23, 2026 [cite: 5, 6]

### Project Metadata
| Field | Value |
| :--- | :--- |
| **Project Name** | [cite_start]TradeWhisper [cite: 7] |
| **Version** | [cite_start]1.0 Hackathon Submission Edition [cite: 7] |
| **Date** | [cite_start]April 2026 [cite: 7] |
| **Blockchain** | [cite_start]HashKey Chain Testnet (Chain ID: 133) → Mainnet [cite: 7] |
| [cite_start]**RPC Endpoint** | [https://testnet.hsk.xyz](https://testnet.hsk.xyz) [cite: 7] |
| [cite_start]**Block Explorer** | [https://testnet-explorer.hsk.xyz](https://testnet-explorer.hsk.xyz) [cite: 7] |
| **Gas Token** | [cite_start]HSK (native) - faucet.hsk.xyz [cite: 7] |
| **AI Engine** | [cite_start]OpenAI GPT-4o (intent parser + pricing agent) [cite: 7] |
| **Settlement** | [cite_start]AtomicSwap.sol - single EVM transaction, zero partial fills [cite: 7] |
| **Reputation Layer** | [cite_start]ReputationRegistry.sol - on-chain agent scoring [cite: 7] |
| **Hackathon Platform** | [cite_start]DoraHacks - dorahacks.io/hackathon/2045 [cite: 7] |
| **Status** | [cite_start]Ready for Demo Submission (testnet deployed) [cite: 7] |

---

## [cite_start]1. Executive Summary [cite: 9]
[cite_start]TradeWhisper is a conversational AI-powered OTC (over-the-counter) trading protocol built natively on HashKey Chain[cite: 10]. [cite_start]Users simply chat with the AI agent in plain language (e.g., "I want to sell 10 USDC for HSK"), and the system handles intent parsing, on-chain price discovery, wallet-to-wallet atomic settlement, and reputation tracking[cite: 11]. [cite_start]There are no order books, no AMM mechanics to learn, and no counterparty risk, with every trade settling live on the HashKey Chain Testnet[cite: 12].

### [cite_start]1.1 The Problem [cite: 13]
* [cite_start]Existing DEXs force users to understand AMMs, slippage tolerance, and liquidity pools, creating a massive UX barrier[cite: 15, 16].
* [cite_start]Large OTC trades currently happen via Telegram/Discord, which is opaque, off-chain, and trust-dependent[cite: 17].
* [cite_start]No compliant, on-chain, atomic OTC settlement protocol exists today on HashKey Chain[cite: 18].
* [cite_start]Market makers have no standardized reputation system on HashKey Chain, lacking fundamental trust primitives[cite: 19, 20].

### [cite_start]1.2 The TradeWhisper Solution [cite: 21]
* [cite_start]**Chat Interface:** The user types natural language, and the AI agent parses intent in real time[cite: 22].
* [cite_start]**On-Chain Requests:** Trade requests are published to HashKey Chain, ensuring full auditability and compliance[cite: 23].
* [cite_start]**MarketAgent AI:** Evaluates live HSK/USDC price from an oracle, computes offers, and responds on-chain[cite: 24].
* [cite_start]**Atomic Settlement:** A one-click accept utilizes `AtomicSwap.sol` to settle both token legs in a single EVM transaction[cite: 25].
* [cite_start]**Reputation Registry:** The market agent's score is incremented on-chain after every successful trade[cite: 26].
* [cite_start]**100% Testnet:** Every trade executes on the testnet and is verifiable on the block explorer[cite: 27].

---

## [cite_start]2. Track Recommendation & Winning Strategy [cite: 28]

* [cite_start]**HashKey Chain Horizon Hackathon Theme:** "Technology Empowers Finance, Innovation Reconstructs Ecosystem"[cite: 30].

### [cite_start]2.1 Why AI Track is Your Winning Track [cite: 31]
* [cite_start]The hackathon explicitly lists "AI-driven intelligent trading strategies" and "AI-automated operation and maintenance for DeFi protocols" as key themes[cite: 32].
* [cite_start]TradeWhisper fits this perfectly; the AI is the entire UX layer and the price engine, not just an add-on[cite: 33].

| Component | Description | Track Alignment |
| :--- | :--- | :--- |
| **AI Intent Parser** | [cite_start]GPT-4o converts plain English into structured `TRADE_REQUEST` JSON [cite: 38] | [cite_start]Core AI Feature [cite: 38] |
| **AI MarketAgent Architecture** | [cite_start]Autonomous on-chain agent computes live offer prices from HSK oracle; multi-agent system design [cite: 38] | [cite_start]Core AI Feature [cite: 38] |
| **Natural Language UI** | [cite_start]The chat interface itself is the AI product—zero DeFi knowledge needed [cite: 38] | [cite_start]UX Differentiator [cite: 38] |

### [cite_start]2.2 Why DeFi Track Compounds the Win [cite: 39]
[cite_start]The `AtomicSwap` smart contract and `ReputationRegistry` are novel DeFi primitives that reward on-chain financial infrastructure that is compliant, auditable, and institutional-grade[cite: 40]. 

| Track | TradeWhisper Coverage | Score |
| :--- | :--- | :--- |
| **AI Track** | [cite_start]GPT-4o intent parser + agentic live pricing engine + multi-agent system [cite: 43] | [cite_start]***** Perfect Fit [cite: 43] |
| **DeFi Track** | [cite_start]AtomicSwap contract + Reputation Registry + live testnet settlement [cite: 43] | [cite_start]***** Strong Fit [cite: 43] |
| **PayFi Track** | [cite_start]USDC to HSK large-value compliant payments angle [cite: 43] | [cite_start]*** Partial Fit [cite: 43] |
| **ZKID Track** | [cite_start]ZK proof of trade validity (V2 roadmap item) [cite: 43] | [cite_start]** Future Scope [cite: 43] |

### [cite_start]2.3 Why TradeWhisper Wins First Prize [cite: 44]
1.  [cite_start]**LIVE testnet:** Not a mockup; it utilizes real wallet-to-wallet settlement via smart contract[cite: 45, 49].
2.  [cite_start]**End-to-end verifiable:** Every trade is verifiable on the testnet explorer[cite: 47, 48].
3.  [cite_start]**HashKey-native:** Built specifically for HSK/USDC pairs using the HSK testnet RPC[cite: 50, 53].
4.  [cite_start]**AI is the product:** Fully aligns with HashKey's 'AI meets DeFi' theme[cite: 51, 54].
5.  [cite_start]**Compliance-ready:** Full on-chain trade history, auditable by compliance partners[cite: 52, 56].
6.  [cite_start]**Post-hackathon viable:** Includes a protocol fee model, market maker ecosystem, and institutional DeFi use case[cite: 55, 57].

---

## [cite_start]3. Project Name & Branding [cite: 58]

* **Ticker/Protocol:** TW | [cite_start]**Domain suggestion:** tradewhisper.xyz [cite: 63]

### [cite_start]3.1 Name Rationale [cite: 64]
* [cite_start]**Trade:** Represents the core action of peer-to-peer token exchange, OTC price discovery, and atomic settlement[cite: 65, 67].
* [cite_start]**Whisper:** Represents the AI interface layer where you "whisper" natural language instructions[cite: 67, 68].
* [cite_start]**Combined:** Evokes simplicity, intelligence, and trust, signaling an intelligent trading system rather than a standard DEX[cite: 69, 71].

### [cite_start]3.2 Alternate Names Considered [cite: 73]
| Name | Assessment |
| :--- | :--- |
| **SwapSense** | Considered, but 'Sense' is too generic. [cite_start]'Whisper' better captures the conversational AI angle. [cite: 72] |
| **ChatSwap** | Too literal. [cite_start]Sounds like a Telegram bot, not a financial infrastructure protocol. [cite: 72] |
| **TalkDEX** | Functional but not evocative. [cite_start]Lacks brand resonance for institutional audiences. [cite: 72] |
| **TradeWhisper** | [cite_start]✔ Selected: balances technical credibility with memorable brand identity. [cite: 72] |

---

## [cite_start]4. Product Overview [cite: 74]

### [cite_start]4.1 Vision Statement [cite: 75]
TradeWhisper makes on-chain OTC trading as natural as texting. [cite_start]By replacing form-based DeFi UIs with a conversational AI agent connected to a live atomic swap contract on HashKey Chain, it eliminates every barrier between intent and settlement[cite: 77].

### [cite_start]4.2 Target Users [cite: 78]
| Segment | Description |
| :--- | :--- |
| **Crypto-native Traders** | [cite_start]Hold large token positions, want OTC execution without CEX KYC or DEX slippage. [cite: 79] |
| **DeFi Newcomers** | [cite_start]Non-technical users who do not understand AMMs; the chat removes DeFi complexity. [cite: 83] |
| **Institutional / Whale Wallets** | [cite_start]Entities executing large trades needing an on-chain audit trail for compliance. [cite: 83] |
| **Market Makers** | [cite_start]Liquidity providers wanting a standardized on-chain RFQ protocol on HashKey Chain. [cite: 83] |
| **DeFi Developers** | [cite_start]Teams building on HashKey Chain who need a composable atomic OTC settlement primitive. [cite: 83] |

### [cite_start]4.3 Core Value Propositions [cite: 84]
* [cite_start]**Zero DeFi knowledge required:** Trade with plain English while the AI handles the complexity[cite: 85].
* [cite_start]**100% live testnet:** No mocked data; trades are real on-chain transactions verifiable by anyone[cite: 87].
* [cite_start]**Atomic settlement:** Both token legs settle in one EVM transaction, or neither does[cite: 88].
* [cite_start]**Transparent price discovery:** All offers are published on-chain, eliminating off-chain negotiation[cite: 89].
* [cite_start]**Verifiable trust:** Market agent reputation scores are public, on-chain, and immutable[cite: 90].
* [cite_start]**Compliance-first:** Provides a full immutable trade history aligned with HashKey Chain's regulated finance mandate[cite: 90].

---

## [cite_start]5. AI Chat Interface - Full Specification [cite: 91]
The AI agent is the product. [cite_start]The entire trade lifecycle occurs in a single chat window—no forms, no slippage settings, and no pool selection[cite: 92, 93].

### [cite_start]5.1 Chat Flow (Complete User Journey) [cite: 94, 95]
1.  **User Opens /trade:** Chat window opens. [cite_start]AI agent greets the user[cite: 96].
2.  [cite_start]**User Types Trade Intent:** e.g., "I want to sell 10 USDC for HSK" in plain language[cite: 96].
3.  [cite_start]**GPT-4o Parses Intent:** Structured JSON extracted and AI confirms in chat[cite: 96].
4.  [cite_start]**Wallet Connect Prompt:** MetaMask pop-up with HashKey Testnet RPC if not connected[cite: 96].
5.  [cite_start]**TRADE_REQUEST Published:** Encrypted payload emitted as an on-chain event, and TX hash is shown in chat[cite: 96].
6.  [cite_start]**MarketAgent Responds:** AI reads on-chain events, computes prices, and publishes a `TRADE_OFFER` on-chain[cite: 96].
7.  [cite_start]**Offer Shown in Chat:** e.g., "10 USDC -> 33.7 HSK... Accept?"[cite: 100].
8.  [cite_start]**User Clicks Accept:** `AtomicSwap.executeTrade()` is called to settle tokens atomically[cite: 100].
9.  [cite_start]**Confirmation in Chat:** TX hash, block number, and amounts are displayed[cite: 100].
10. [cite_start]**Reputation Updated:** Agent score is incremented and shown in chat[cite: 100].

### [cite_start]5.2 Example Chat Messages [cite: 101]
* [cite_start]"I want to sell 10 USDC for HSK" [cite: 103]
* [cite_start]"Buy 50 HSK with USDC" [cite: 104]
* [cite_start]"Swap 5 USDC to HashKey token" [cite: 105]
* [cite_start]"Exchange 100 USDC for as much HSK as possible" [cite: 106]
* [cite_start]"Trade 25 USDC, I want at least 80 HSK" [cite: 107]
* [cite_start]"Cancel my last trade request" [cite: 108]

### [cite_start]5.4 GPT-4o System Prompt (Production) [cite: 115]
```json
{
  "intent": "TRADE" | "CANCEL" | "STATUS" | "UNKNOWN",
  "tokenIn": "USDC" | "HSK" | null,
  "amountIn": number | null,
  "tokenOut": "USDC" | "HSK" | null,
  "minAmountOut": number | null,
  "userMessage": "friendly confirmation message to show the user",
  "needsClarification": boolean,
  "clarificationQuestion": "ask this if needsClarification is true"
}
```
[cite_start]*Note: Evaluates "sell X USDC for HSK" as tokenIn=USDC, tokenOut=HSK, amountIn=X* [cite: 141-144].

### [cite_start]5.5 MarketAgent AI Pricing Prompt [cite: 151]
* [cite_start]**Pricing Rule:** Computes fair offer prices using a 0.3% spread (e.g., `offeredAmountOut = rawOut * (1 - 0.003)`)[cite: 153, 166, 169].
* [cite_start]Must sign offers with the MarketAgent private key and reject requests older than 60 seconds[cite: 174].

---

## [cite_start]6. System Architecture [cite: 177]

### [cite_start]6.1 Full Trade Lifecycle [cite: 178]
| Step | Action | Description |
| :--- | :--- | :--- |
| **1** | User Chat Input | [cite_start]User types trade request into the chat interface. [cite: 179] |
| **2** | GPT-4o Intent Parse | [cite_start]Frontend calls OpenAI API for structured JSON. [cite: 179] |
| **3** | Wallet Connect Check | [cite_start]MetaMask popup with HashKey Testnet (Chain ID: 133). [cite: 179] |
| **4** | TRADE_REQUEST On-Chain | Frontend emits event on HSK Testnet; [cite_start]TX hash returned. [cite: 179] |
| **5** | MarketAgent Listens | [cite_start]Node.js agent detects `TRADE_REQUEST` and validates it. [cite: 179] |
| **6** | Price Computation | [cite_start]Fetches price from oracle, applies 0.3% spread. [cite: 179] |
| **7** | TRADE_OFFER On-Chain | [cite_start]Agent calls `submitOffer()` with EIP-712 signature. [cite: 179] |
| **8** | UI Displays Offer | [cite_start]Frontend shows offer details and expiry. [cite: 179] |
| **9** | User Accepts | [cite_start]User clicks Accept to trigger the atomic swap. [cite: 179] |
| **10** | Atomic EVM Settlement | [cite_start]`AtomicSwap.executeTrade()` pulls/pushes tokens atomically. [cite: 179] |
| **11** | Reputation Increment | [cite_start]Agent score updated on-chain automatically. [cite: 179] |
| **12** | TRADE_EXECUTED Event | [cite_start]Chat confirms the transaction with an explorer link. [cite: 179] |

### [cite_start]6.2 Component Architecture [cite: 180]
| Component | Responsibility |
| :--- | :--- |
| **Frontend (Next.js)** | [cite_start]React chat UI, wallet connect, offer display, and GPT-4o calls. [cite: 181] |
| **TradeRouter.sol** | [cite_start]Solidity contract emitting `TRADE_REQUEST` and `TRADE_OFFER` events. [cite: 184] |
| **MarketAgent (Node.js)** | [cite_start]Backend service subscribing to HSK Testnet RPC for pricing and offers. [cite: 184] |
| **AtomicSwap.sol** | [cite_start]Core settlement contract verifying signatures and executing atomic trades. [cite: 184] |
| **ReputationRegistry.sol** | [cite_start]Tracks market agent reputation scores, queried for trust signals. [cite: 184] |
| **MockUSDC.sol + Oracle** | [cite_start]Mintable USDC for testing and a spot price oracle. [cite: 184] |

---

## [cite_start]7. Smart Contract Specifications [cite: 186]

* [cite_start]**TradeRouter.sol:** Acts as the on-chain message bus, utilizing `TradeRequested`, `TradeOffered`, and `TradeExecuted` events[cite: 187, 191, 199, 205].
* [cite_start]**AtomicSwap.sol:** The settlement engine containing the `executeTrade` function, handling signature verification, transfers, and fallback safety via `withdrawEscrow` [cite: 216, 219, 229-236, 240].
* [cite_start]**MockUSDC.sol:** A standard ERC-20 contract with a public mint for hackathon demos[cite: 241, 242, 245].
* [cite_start]**ReputationRegistry.sol:** Manages an on-chain mapping of reputation scores, incremented exclusively by the `AtomicSwap` contract [cite: 249-254].

---

## [cite_start]8. Technology Stack [cite: 258]

| Layer | Technology |
| :--- | :--- |
| **Blockchain** | [cite_start]HashKey Chain Testnet (Chain ID: 133) [cite: 259] |
| **Smart Contracts** | [cite_start]Solidity ^0.8.20, Hardhat, Chai (>= 90% coverage) [cite: 259] |
| **AI Intent Engine** | [cite_start]OpenAI GPT-4o with structured JSON function calling [cite: 259] |
| **AI Pricing Agent** | [cite_start]Node.js + TypeScript autonomous agent [cite: 259] |
| **Frontend** | [cite_start]Next.js 14, React, TailwindCSS, ethers.js v6 [cite: 259] |
| **Wallet** | [cite_start]MetaMask, WalletConnect v2 [cite: 259] |
| **Deployment** | [cite_start]Vercel (frontend) + Railway (MarketAgent backend) [cite: 259] |

---

## [cite_start]9. Feature Specifications [cite: 262]

### [cite_start]9.1 MVP Features (Hackathon Demo Scope) [cite: 263, 264]
* [cite_start]**AI Chat Trade Interface:** Live GPT-4o natural language parsing[cite: 265].
* [cite_start]**Wallet Connect:** Live MetaMask auto-configuration for HashKey[cite: 265].
* [cite_start]**MarketAgent Auto-Pricing:** Live Node.js agent computing offers[cite: 265].
* [cite_start]**AtomicSwap Settlement:** Live single EVM transaction execution[cite: 265].
* [cite_start]**Reputation Registry:** Live score incrementing and display[cite: 265].
* [cite_start]**Test USDC Faucet Button:** Live 100 Test USDC minting[cite: 265].
* [cite_start]**Trade History & Cancels:** Live logs and command parsing[cite: 265].

### [cite_start]9.2 Post-Hackathon V2 Roadmap [cite: 266]
* [cite_start]**Multi-agent bidding:** Best of N competitive offers[cite: 267].
* [cite_start]**ZK proof of trade validity:** For ZKID track compliance[cite: 268].
* [cite_start]**RWA asset legs:** Tokenized bonds and equities[cite: 269].
* [cite_start]**Mobile app:** Biometric confirmation[cite: 270].
* [cite_start]**Chainlink CCIP integration:** Cross-chain atomic swaps[cite: 271].
* [cite_start]**DAO governance:** Market agent whitelisting controlled by token holders[cite: 272].

---

## [cite_start]10. HashKey Chain Testnet Integration [cite: 315]

### [cite_start]11.1 Network Configuration [cite: 316]
* [cite_start]**Network Name:** HashKey Chain Testnet [cite: 322]
* [cite_start]**RPC URL:** [https://testnet.hsk.xyz](https://testnet.hsk.xyz) [cite: 323]
* [cite_start]**Chain ID:** 133 [cite: 324]
* [cite_start]**Currency:** HSK [cite: 325]
* [cite_start]**Block Explorer:** [https://testnet-explorer.hsk.xyz](https://testnet-explorer.hsk.xyz) [cite: 326]
* [cite_start]**Faucet:** [https://faucet.hsk.xyz](https://faucet.hsk.xyz) (1 HSK per 24h) [cite: 327]

### [cite_start]11.2 Why Testnet (Not Mocked Data) [cite: 328]
[cite_start]Every trade executes a real on-chain transaction on HashKey Chain Testnet, allowing judges to copy the TX hash and verify it live during the pitch, serving as a critical differentiator[cite: 333, 334, 335].

---

## [cite_start]11. Risks & Mitigations [cite: 345]

| Risk | Scenario | Mitigation |
| :--- | :--- | :--- |
| **Price Oracle Manipulation** | [cite_start]MarketAgent uses manipulated price to offer bad rates. [cite: 346] | Mock oracle controlled by deployer. [cite_start]Enforced min-out parameters. [cite: 346] |
| **GPT-4o Ambiguity** | [cite_start]AI misparses unknown tokens. [cite: 346] | Strict JSON validation. [cite_start]Prompts clarification before on-chain actions. [cite: 346] |
| **MarketAgent Downtime** | [cite_start]No agent online -> user gets no offer. [cite: 346] | Persistent agent on Railway. [cite_start]Friendly fallback UI message if no offer in 30s. [cite: 346] |
| **Smart Contract Bug** | [cite_start]Funds locked in AtomicSwap. [cite: 350] | Full Hardhat test suite. [cite_start]`withdrawEscrow()` emergency exit for agents. [cite: 350] |

---

## [cite_start]12. Judging Criteria Alignment [cite: 351]

| Criterion | TradeWhisper Positioning |
| :--- | :--- |
| **Innovation & Uniqueness** | [cite_start]First conversational AI OTC trading protocol on HashKey Chain with a chat-native execution[cite: 354]. |
| **Technical Execution** | [cite_start]5 deployed Solidity contracts, GPT-4o structured outputs, EIP-712 signatures, end-to-end tested[cite: 354]. |
| **Ecosystem Fit** | [cite_start]Built 100% for HashKey Chain, aligning with AI-driven DeFi themes[cite: 354]. |
| **User Experience** | Simplest UI possible (one chat box); [cite_start]AI handles complex crypto UX in natural language[cite: 354]. |
| **Live Demo Quality** | [cite_start]Every trade is real and verifiable live on the testnet explorer[cite: 354]. |

## [cite_start]13. Success Metrics [cite: 358]
* [cite_start]**Live Trades in Demo:** >= 5 end-to-end trades on HSK Testnet[cite: 359].
* [cite_start]**Contract Test Coverage:** >= 90% line coverage[cite: 359].
* [cite_start]**Intent Parse Accuracy:** >= 95% correct parsing[cite: 359].
* [cite_start]**Settlement Latency:** < 15 seconds from "Accept" to on-chain confirmation[cite: 359].
* [cite_start]**Chat to Trade Time:** < 60 seconds for a first-time user[cite: 359].
* [cite_start]**Hackathon Outcome:** 1st Prize - AI Track + Recognition in DeFi Track[cite: 359].