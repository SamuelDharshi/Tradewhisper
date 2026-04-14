import * as dotenv from "dotenv";
import cors from "cors";
import express from "express";
import OpenAI from "openai";
import { Contract, JsonRpcProvider, Wallet, formatUnits } from "ethers";
import { atomicSwapAbi, erc20Abi, reputationRegistryAbi, tradeRouterAbi } from "./abi";
import { config } from "./config";
import { evaluateOffer, parseIntent } from "./intent";
import { computeAmountOut } from "./pricing";

dotenv.config();

const provider = new JsonRpcProvider(config.rpcUrl, 133);
const marketAgentWallet = new Wallet(config.marketAgentPrivateKey, provider);
const relayerWallet = new Wallet(config.relayerPrivateKey, provider);
const router = new Contract(config.tradeRouterAddress, tradeRouterAbi, marketAgentWallet);
const atomicSwap = new Contract(config.atomicSwapAddress, atomicSwapAbi, relayerWallet);
const reputation = new Contract(config.reputationRegistryAddress, reputationRegistryAbi, provider);
const groqClient = new OpenAI({
  apiKey: config.groqApiKey,
  baseURL: config.groqBaseUrl
});
const seen = new Set<string>();
const settled = new Set<string>();
const evaluating = new Set<string>();

const OFFER_TYPES = {
  Offer: [
    { name: "requestId", type: "bytes32" },
    { name: "requester", type: "address" },
    { name: "tokenIn", type: "address" },
    { name: "tokenOut", type: "address" },
    { name: "amountIn", type: "uint256" },
    { name: "minAmountOut", type: "uint256" },
    { name: "amountOut", type: "uint256" },
    { name: "offerDeadline", type: "uint256" }
  ]
};

const domain = {
  name: "TradeWhisperAtomicSwap",
  version: "1",
  chainId: 133,
  verifyingContract: config.atomicSwapAddress
};

async function handleTradeRequested(
  requestId: string,
  requester: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  minAmountOut: bigint,
  requestDeadline: bigint
): Promise<void> {
  if (seen.has(requestId)) {
    return;
  }
  seen.add(requestId);

  try {
    const now = Math.floor(Date.now() / 1000);
    const requestDeadlineSec = Number(requestDeadline);
    if (requestDeadlineSec <= now) {
      return;
    }

    const req = await router.getRequest(requestId);
    const createdAt = Number(req.createdAt);
    if (now - createdAt > config.maxRequestAgeSec) {
      return;
    }

    const amountOut = await computeAmountOut(provider, { tokenIn, tokenOut, amountIn });
    const offerDeadline = BigInt(now + 60);

    const typedValue = {
      requestId,
      requester,
      tokenIn,
      tokenOut,
      amountIn,
      minAmountOut,
      amountOut,
      offerDeadline
    };

    const signature = await marketAgentWallet.signTypedData(domain, OFFER_TYPES, typedValue);

    const tx = await router.submitOffer(requestId, amountOut, offerDeadline, signature);
    const receipt = await tx.wait();

    console.log(`[MarketAgent] Offer submitted ${requestId} tx=${receipt?.hash}`);

    // Evaluate immediately after offer is mined instead of waiting on event timing.
    await handleTradeOffered(requestId, marketAgentWallet.address, amountOut, offerDeadline, signature);
  } catch (error) {
    console.error(`[MarketAgent] Failed to process request ${requestId}`, error);
  }
}

async function handleTradeOffered(
  requestId: string,
  agent: string,
  amountOut: bigint,
  offerDeadline: bigint,
  signature: string
): Promise<void> {
  if (settled.has(requestId) || evaluating.has(requestId)) {
    return;
  }
  evaluating.add(requestId);

  try {
    const req = await router.getRequest(requestId);
    if (!req.active) {
      return;
    }

    const tokenOutMeta = new Contract(req.tokenOut, erc20Abi, provider);
    const [tokenOutDecimals, agentRep] = await Promise.all([
      tokenOutMeta.decimals() as Promise<number>,
      reputation.score(agent) as Promise<bigint>
    ]);

    const tokenInSymbol = req.tokenIn.toLowerCase() === config.usdcAddress.toLowerCase() ? "USDC" : "HSK";
    const tokenOutSymbol = req.tokenOut.toLowerCase() === config.usdcAddress.toLowerCase() ? "USDC" : "HSK";

    const decision = await evaluateOffer(groqClient, config.evaluatorModel, {
      tokenIn: tokenInSymbol,
      amountIn: Number(formatUnits(req.amountIn, tokenInSymbol === "USDC" ? 6 : 18)),
      tokenOut: tokenOutSymbol,
      targetMinOut: Number(formatUnits(req.minAmountOut, tokenOutDecimals)),
      offeredAmountOut: Number(formatUnits(amountOut, tokenOutDecimals)),
      offerExpiry: Number(offerDeadline),
      agentReputation: Number(agentRep),
      minAgentReputation: config.minAgentReputation
    });

    if (decision.decision === "REJECT") {
      console.log(`[UserAgent] REJECT ${requestId}: ${decision.reason}`);
      return;
    }

    const tokenInContract = new Contract(req.tokenIn, erc20Abi, provider);
    const tokenOutContract = new Contract(req.tokenOut, erc20Abi, provider);
    const [userAllowance, agentAllowance] = await Promise.all([
      tokenInContract.allowance(req.requester, config.atomicSwapAddress) as Promise<bigint>,
      tokenOutContract.allowance(agent, config.atomicSwapAddress) as Promise<bigint>
    ]);

    if (userAllowance < req.amountIn) {
      console.log(`[UserAgent] REJECT ${requestId}: requester allowance too low`);
      return;
    }
    if (agentAllowance < amountOut) {
      console.log(`[UserAgent] REJECT ${requestId}: market agent allowance too low`);
      return;
    }

    const tx = await atomicSwap.executeTradeFor(requestId, req.requester, amountOut, offerDeadline, agent, signature);
    const receipt = await tx.wait();
    settled.add(requestId);
    console.log(`[UserAgent] ACCEPT ${requestId}: tx=${receipt?.hash}`);
    console.log(`[UserAgent] ${decision.chatMessageToUser}`);
  } catch (error) {
    console.error(`[UserAgent] Failed to evaluate/execute offer ${requestId}`, error);
  } finally {
    evaluating.delete(requestId);
  }
}

async function startAgent(): Promise<void> {
  if (!process.env.RELAYER_PRIVATE_KEY && process.env.DEPLOYER_PRIVATE_KEY) {
    console.log("[Relayer] RELAYER_PRIVATE_KEY missing, using DEPLOYER_PRIVATE_KEY as fallback.");
  }
  console.log(`[MarketAgent] Running as ${marketAgentWallet.address}`);
  console.log(`[Relayer] Running as ${relayerWallet.address}`);
  console.log(`[MarketAgent] Router ${config.tradeRouterAddress}`);
  console.log(`[MarketAgent] Oracle ${config.oracleAddress}`);
  console.log(`[Policy] MIN_AGENT_REPUTATION=${config.minAgentReputation} SPREAD_BPS=${config.spreadBps}`);

  router.on(
    "TradeRequested",
    async (
      requestId: string,
      requester: string,
      tokenIn: string,
      tokenOut: string,
      amountIn: bigint,
      minAmountOut: bigint,
      requestDeadline: bigint
    ) => {
      await handleTradeRequested(requestId, requester, tokenIn, tokenOut, amountIn, minAmountOut, requestDeadline);
    }
  );

  router.on(
    "TradeOffered",
    async (
      requestId: string,
      agent: string,
      amountOut: bigint,
      offerDeadline: bigint,
      signature: string
    ) => {
      await handleTradeOffered(requestId, agent, amountOut, offerDeadline, signature);
    }
  );
}

function startApi(): void {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      ok: true,
      service: "TradeWhisper backend",
      message: "Use /health for service status and /parse-intent for intent parsing."
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      chainId: 133,
      router: config.tradeRouterAddress,
      atomicSwap: config.atomicSwapAddress,
      reputation: config.reputationRegistryAddress,
      oracle: config.oracleAddress,
      agent: marketAgentWallet.address,
      relayer: relayerWallet.address,
      minAgentReputation: config.minAgentReputation,
      spreadBps: config.spreadBps
    });
  });

  app.post("/parse-intent", async (req, res) => {
    try {
      const message = String(req.body?.message || "").trim();
      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      const parsed = await parseIntent(groqClient, message, config.groqModel);
      return res.json(parsed);
    } catch (error) {
      console.error("Intent parse failed", error);
      return res.status(500).json({ error: "intent parser failed" });
    }
  });

  app.listen(config.port, () => {
    console.log(`[API] listening on port ${config.port}`);
  });
}

void startAgent();
startApi();
