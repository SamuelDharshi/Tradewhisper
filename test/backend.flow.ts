import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre as any;

describe("TradeWhisper Backend Flow", function () {
  it("executes request -> offer -> atomic settlement -> reputation increment", async function () {
    const [owner, user, agent, relayer] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockUSDC");
    const usdc = await Token.deploy("MockUSDC", "USDC", 6);
    const hsk = await Token.deploy("MockHashKey", "HSK", 18);

    const Router = await ethers.getContractFactory("TradeRouter");
    const router = await Router.deploy(owner.address);

    const Reputation = await ethers.getContractFactory("ReputationRegistry");
    const reputation = await Reputation.deploy(owner.address);

    const Atomic = await ethers.getContractFactory("AtomicSwap");
    const atomic = await Atomic.deploy(await router.getAddress(), await reputation.getAddress(), owner.address, relayer.address);

    await router.connect(owner).setAtomicSwap(await atomic.getAddress());
    await reputation.connect(owner).setAtomicSwap(await atomic.getAddress());

    const amountIn = 10n * 10n ** 6n;
    const amountOut = 33n * 10n ** 18n;
    const minAmountOut = 30n * 10n ** 18n;

    await usdc.mint(user.address, amountIn);
    await hsk.mint(agent.address, amountOut);

    await usdc.connect(user).approve(await atomic.getAddress(), amountIn);
    await hsk.connect(agent).approve(await atomic.getAddress(), amountOut);

    const now = Math.floor(Date.now() / 1000);
    const requestDeadline = BigInt(now + 300);
    const nonce = 1n;

    const requestTx = await router
      .connect(user)
      .requestTrade(await usdc.getAddress(), await hsk.getAddress(), amountIn, minAmountOut, requestDeadline, nonce);

    const requestReceipt = await requestTx.wait();
    const requestEvent = requestReceipt?.logs
      .map((log: any) => {
        try {
          return router.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((evt: any) => evt?.name === "TradeRequested");

    expect(requestEvent).to.not.equal(undefined);
    const requestId = requestEvent!.args.requestId;

    const offerDeadline = BigInt(now + 120);

    const domain = {
      name: "TradeWhisperAtomicSwap",
      version: "1",
      chainId: 31337,
      verifyingContract: await atomic.getAddress()
    };

    const types = {
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

    const value = {
      requestId,
      requester: user.address,
      tokenIn: await usdc.getAddress(),
      tokenOut: await hsk.getAddress(),
      amountIn,
      minAmountOut,
      amountOut,
      offerDeadline
    };

    const signature = await agent.signTypedData(domain, types, value);

    await router.connect(agent).submitOffer(requestId, amountOut, offerDeadline, signature);

    const executeTx = await atomic
      .connect(relayer)
      .executeTradeFor(requestId, user.address, amountOut, offerDeadline, agent.address, signature);
    const executeReceipt = await executeTx.wait();
    const settledEvent = executeReceipt?.logs
      .map((log: any) => {
        try {
          return atomic.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((evt: any) => evt?.name === "TradeSettled");

    expect(settledEvent).to.not.equal(undefined);

    expect(await usdc.balanceOf(agent.address)).to.equal(amountIn);
    expect(await hsk.balanceOf(user.address)).to.equal(amountOut);
    expect(await reputation.score(agent.address)).to.equal(1n);

    const req = await router.getRequest(requestId);
    expect(req.active).to.equal(false);
  });

  it("allows cancel by requester", async function () {
    const [owner, user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockUSDC");
    const usdc = await Token.deploy("MockUSDC", "USDC", 6);
    const hsk = await Token.deploy("MockHashKey", "HSK", 18);

    const Router = await ethers.getContractFactory("TradeRouter");
    const router = await Router.deploy(owner.address);

    const now = Math.floor(Date.now() / 1000);
    const requestDeadline = BigInt(now + 300);

    const tx = await router
      .connect(user)
      .requestTrade(await usdc.getAddress(), await hsk.getAddress(), 1_000_000n, 1n, requestDeadline, 77n);
    const receipt = await tx.wait();
    const event = receipt?.logs
      .map((log: any) => {
        try {
          return router.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((evt: any) => evt?.name === "TradeRequested");

    const requestId = event!.args.requestId;

    await router.connect(user).cancelTrade(requestId);
    const req = await router.getRequest(requestId);
    expect(req.active).to.equal(false);
  });
});
