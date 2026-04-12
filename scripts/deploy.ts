import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config();

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with: ${deployer.address}`);

  const relayerAddress = process.env.RELAYER_ADDRESS || deployer.address;

  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputation = await ReputationRegistry.deploy(deployer.address);
  await reputation.waitForDeployment();

  const TradeRouter = await ethers.getContractFactory("TradeRouter");
  const router = await TradeRouter.deploy(deployer.address);
  await router.waitForDeployment();

  const AtomicSwap = await ethers.getContractFactory("AtomicSwap");
  const atomic = await AtomicSwap.deploy(
    await router.getAddress(),
    await reputation.getAddress(),
    deployer.address,
    relayerAddress
  );
  await atomic.waitForDeployment();

  const atomicAddress = await atomic.getAddress();
  await (await reputation.setAtomicSwap(atomicAddress)).wait();
  await (await router.setAtomicSwap(atomicAddress)).wait();

  console.log("Deployment complete:");
  console.log(`ReputationRegistry: ${await reputation.getAddress()}`);
  console.log(`TradeRouter:        ${await router.getAddress()}`);
  console.log(`AtomicSwap:         ${atomicAddress}`);
  console.log(`Relayer:            ${relayerAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
