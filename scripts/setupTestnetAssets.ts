import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config();

function must(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  const marketAgentPk = must("MARKET_AGENT_PRIVATE_KEY");
  const marketAgent = new ethers.Wallet(marketAgentPk, ethers.provider);
  const enableAgentApproval = (process.env.ENABLE_AGENT_APPROVAL || "false").toLowerCase() === "true";

  const demoWalletAddress = process.env.DEMO_WALLET_ADDRESS || deployer.address;

  const MockToken = await ethers.getContractFactory("MockUSDC");
  const MockOracle = await ethers.getContractFactory("MockPriceOracle");

  const usdc = await MockToken.deploy("MockUSDC", "USDC", 6);
  await usdc.waitForDeployment();

  const hskToken = await MockToken.deploy("MockHSK", "HSK", 18);
  await hskToken.waitForDeployment();

  // 0.297 USDC per 1 HSK with 8 oracle decimals
  const oracleDecimals = 8;
  const initialPrice = 29_700_000;
  const oracle = await MockOracle.deploy(oracleDecimals, initialPrice);
  await oracle.waitForDeployment();

  // Mint demo balances
  const usdcToMint = 10_000n * 10n ** 6n;
  const hskToMintForAgent = 100_000n * 10n ** 18n;

  await (await usdc.mint(demoWalletAddress, usdcToMint)).wait();
  await (await hskToken.mint(marketAgent.address, hskToMintForAgent)).wait();

  // Optional approval for atomic settlement if AtomicSwap address is configured.
  const atomicSwapAddress = process.env.ATOMIC_SWAP_ADDRESS;
  if (enableAgentApproval && atomicSwapAddress && /^0x[a-fA-F0-9]{40}$/.test(atomicSwapAddress) && !/^0x0{40}$/.test(atomicSwapAddress)) {
    try {
      const hskTokenAsAgent = await ethers.getContractAt("MockUSDC", await hskToken.getAddress(), marketAgent);
      const approveTx = await hskTokenAsAgent.approve(atomicSwapAddress, hskToMintForAgent);
      await approveTx.wait();
      console.log(`Approved AtomicSwap for MarketAgent HSK: ${atomicSwapAddress}`);
    } catch (error) {
      console.log("Agent approval skipped due to failure (likely no HSK gas on MarketAgent wallet).");
      console.log(error);
    }
  } else {
    console.log("Agent approval disabled or AtomicSwap missing/zero; skipped agent approval.");
  }

  console.log("Testnet asset setup complete:");
  console.log(`MockUSDC:      ${await usdc.getAddress()}`);
  console.log(`MockHSK:       ${await hskToken.getAddress()}`);
  console.log(`MockOracle:    ${await oracle.getAddress()}`);
  console.log(`DemoWallet:    ${demoWalletAddress}`);
  console.log(`MarketAgent:   ${marketAgent.address}`);
  console.log(`OraclePrice:   0.297 (USDC_PER_HSK, decimals=8)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
