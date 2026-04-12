import * as dotenv from "dotenv";
import { getAddress } from "ethers";

dotenv.config();

function must(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export type OracleMode = "USDC_PER_HSK" | "HSK_PER_USDC";

const oracleMode = (process.env.ORACLE_MODE || "USDC_PER_HSK") as OracleMode;
if (oracleMode !== "USDC_PER_HSK" && oracleMode !== "HSK_PER_USDC") {
  throw new Error("ORACLE_MODE must be USDC_PER_HSK or HSK_PER_USDC");
}

const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
if (!relayerPrivateKey) {
  throw new Error("Missing required env var: RELAYER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY fallback)");
}

export const config = {
  port: Number(process.env.PORT || 3000),
  rpcUrl: process.env.HSK_RPC_URL || "https://testnet.hsk.xyz",
  groqApiKey: must("GROQ_API_KEY"),
  groqBaseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  evaluatorModel: process.env.EVALUATOR_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  marketAgentPrivateKey: must("MARKET_AGENT_PRIVATE_KEY"),
  relayerPrivateKey,
  tradeRouterAddress: getAddress(must("TRADE_ROUTER_ADDRESS")),
  atomicSwapAddress: getAddress(must("ATOMIC_SWAP_ADDRESS")),
  reputationRegistryAddress: getAddress(must("REPUTATION_REGISTRY_ADDRESS")),
  usdcAddress: getAddress(must("USDC_ADDRESS")),
  hskTokenAddress: getAddress(must("HSK_TOKEN_ADDRESS")),
  oracleAddress: getAddress(must("PRICE_ORACLE_ADDRESS")),
  oracleMode,
  spreadBps: Number(process.env.SPREAD_BPS || 30),
  maxRequestAgeSec: Number(process.env.MAX_REQUEST_AGE_SEC || 60),
  minAgentReputation: Number(process.env.MIN_AGENT_REPUTATION || 10)
};
