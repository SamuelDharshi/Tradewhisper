"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, Interface, JsonRpcSigner, parseUnits } from "ethers";

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

type EthereumProvider = {
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

type ChatRole = "user" | "agent";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

type ParsedIntent = {
  intent: "TRADE" | "CANCEL" | "STATUS" | "UNKNOWN";
  tokenIn: "USDC" | "HSK" | null;
  amountIn: number | null;
  tokenOut: "USDC" | "HSK" | null;
  minAmountOut: number | null;
  userMessage: string;
  needsClarification: boolean;
  clarificationQuestion: string | null;
};

const HASHKEY_CHAIN_ID_HEX = "0x85";
const HASHKEY_CHAIN_ID_DEC = 133;
const HASHKEY_RPC = "https://testnet.hsk.xyz";
const HASHKEY_EXPLORER = "https://testnet-explorer.hsk.xyz";

const ROUTER_ABI = [
  "function requestTrade(address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 requestDeadline,uint256 nonce) external returns (bytes32)",
  "event TradeRequested(bytes32 indexed requestId,address indexed requester,address indexed tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 requestDeadline,uint256 nonce)"
] as const;

const ERC20_ABI = [
  "function approve(address spender,uint256 amount) external returns (bool)",
  "function allowance(address owner,address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)"
] as const;

function toUnits(amount: number, decimals: number): bigint {
  return parseUnits(amount.toString(), decimals);
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function getMetaMaskProvider(): EthereumProvider | null {
  if (!window.ethereum) {
    return null;
  }

  if (Array.isArray(window.ethereum.providers) && window.ethereum.providers.length > 0) {
    const mm = window.ethereum.providers.find((p) => p.isMetaMask);
    return mm || window.ethereum.providers[0];
  }

  return window.ethereum;
}

export function TradeChat() {
  const [wallet, setWallet] = useState<string>("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "agent",
      text: "Whisper your trade. I will parse it, ensure approval, and publish an on-chain request on HashKey testnet."
    }
  ]);

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000", []);

  const routerAddress = useMemo(() => process.env.NEXT_PUBLIC_TRADE_ROUTER_ADDRESS || "", []);
  const atomicSwapAddress = useMemo(() => process.env.NEXT_PUBLIC_ATOMIC_SWAP_ADDRESS || "", []);
  const usdcAddress = useMemo(() => process.env.NEXT_PUBLIC_USDC_ADDRESS || "", []);
  const hskTokenAddress = useMemo(() => process.env.NEXT_PUBLIC_HSK_TOKEN_ADDRESS || "", []);

  useEffect(() => {
    async function detectConnectedWallet(): Promise<void> {
      const injected = getMetaMaskProvider();
      if (!injected) {
        return;
      }

      try {
        const provider = new BrowserProvider(injected);
        const accounts = (await provider.send("eth_accounts", [])) as string[];
        if (accounts.length > 0) {
          setWallet(accounts[0]);
        }
      } catch {
        // Ignore auto-detect errors; manual connect still works.
      }
    }

    void detectConnectedWallet();
  }, []);

  function push(role: ChatRole, text: string): void {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, text }]);
  }

  async function connectWallet(): Promise<JsonRpcSigner> {
    const injected = getMetaMaskProvider();
    if (!injected) {
      throw new Error("MetaMask is not available in this browser");
    }

    const provider = new BrowserProvider(injected);
    await withTimeout(
      injected.request({ method: "eth_requestAccounts" }),
      20000,
      "MetaMask request timed out. Open MetaMask, approve the connection popup, and try again."
    );

    const network = await provider.getNetwork();
    if (Number(network.chainId) !== HASHKEY_CHAIN_ID_DEC) {
      try {
        await injected.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: HASHKEY_CHAIN_ID_HEX }]
        });
      } catch {
        await injected.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: HASHKEY_CHAIN_ID_HEX,
              chainName: "HashKey Chain Testnet",
              rpcUrls: [HASHKEY_RPC],
              nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
              blockExplorerUrls: [HASHKEY_EXPLORER]
            }
          ]
        });
      }
    }

    const signer = await provider.getSigner();
    setWallet(await signer.getAddress());
    return signer;
  }

  async function onConnectWallet(): Promise<void> {
    if (connectingWallet || busy) {
      return;
    }

    setConnectingWallet(true);
    try {
      await connectWallet();
      push("agent", "Wallet connected on HashKey testnet.");
    } catch (error) {
      const err = error as { code?: number; message?: string };
      let messageText = error instanceof Error ? error.message : "Wallet connection failed";
      if (err?.code === 4001) {
        messageText = "Connection rejected in MetaMask.";
      } else if (err?.code === -32002) {
        messageText = "MetaMask already has a pending request. Open the MetaMask popup and confirm it.";
      }
      push("agent", `Could not connect wallet: ${messageText}`);
    } finally {
      setConnectingWallet(false);
    }
  }

  async function parseIntent(message: string): Promise<ParsedIntent> {
    const response = await fetch(`${apiBase}/parse-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Failed to parse intent");
    }

    return (await response.json()) as ParsedIntent;
  }

  async function ensureApproval(
    signer: JsonRpcSigner,
    tokenAddress: string,
    ownerAddress: string,
    amount: bigint
  ): Promise<void> {
    const token = new Contract(tokenAddress, ERC20_ABI, signer);
    const currentAllowance = (await token.allowance(ownerAddress, atomicSwapAddress)) as bigint;

    if (currentAllowance >= amount) {
      return;
    }

    push("agent", "Approval missing. Requesting one-time token approval in MetaMask...");
    const tx = await token.approve(atomicSwapAddress, amount);
    await tx.wait();
    push("agent", `Approval confirmed: ${tx.hash}`);
  }

  async function submitTradeRequest(intent: ParsedIntent, signer: JsonRpcSigner): Promise<void> {
    if (!routerAddress || !atomicSwapAddress || !usdcAddress || !hskTokenAddress) {
      throw new Error("Frontend env is incomplete. Add NEXT_PUBLIC router, swap, USDC and HSK token addresses.");
    }

    if (!intent.tokenIn || !intent.tokenOut || !intent.amountIn) {
      throw new Error("Trade intent is incomplete. Please specify both tokens and amount.");
    }

    const tokenInAddress = intent.tokenIn === "USDC" ? usdcAddress : hskTokenAddress;
    const tokenOutAddress = intent.tokenOut === "USDC" ? usdcAddress : hskTokenAddress;

    const tokenIn = new Contract(tokenInAddress, ERC20_ABI, signer);
    const tokenOut = new Contract(tokenOutAddress, ERC20_ABI, signer);

    const [tokenInDecimals, tokenOutDecimals, ownerAddress] = await Promise.all([
      tokenIn.decimals() as Promise<number>,
      tokenOut.decimals() as Promise<number>,
      signer.getAddress()
    ]);

    const amountIn = toUnits(intent.amountIn, tokenInDecimals);
    const minAmountOut = toUnits(intent.minAmountOut || 0, tokenOutDecimals);

    await ensureApproval(signer, tokenInAddress, ownerAddress, amountIn);

    const router = new Contract(routerAddress, ROUTER_ABI, signer);
    const requestDeadline = BigInt(nowSec() + 300);
    const nonce = BigInt(Date.now());

    push("agent", "Publishing your trade request on HashKey testnet...");
    const tx = await router.requestTrade(tokenInAddress, tokenOutAddress, amountIn, minAmountOut, requestDeadline, nonce);
    const receipt = await tx.wait();

    const iface = new Interface(ROUTER_ABI);
    let requestId = "";

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "TradeRequested") {
          requestId = String(parsed.args.requestId);
          break;
        }
      } catch {
        continue;
      }
    }

    push(
      "agent",
      `Trade request submitted. requestId=${requestId || "(parsed later)"}, tx=${tx.hash}. I am now monitoring for offers.`
    );
  }

  async function onSend(event: FormEvent): Promise<void> {
    event.preventDefault();

    const message = input.trim();
    if (!message || busy) {
      return;
    }

    setInput("");
    push("user", message);
    setBusy(true);

    try {
      const signer = await connectWallet();
      const parsed = await parseIntent(message);

      if (parsed.needsClarification) {
        push("agent", parsed.clarificationQuestion || "I need one more detail to proceed.");
        return;
      }

      push("agent", parsed.userMessage);

      if (parsed.intent !== "TRADE") {
        push("agent", "Only trade requests are currently connected to on-chain submission.");
        return;
      }

      await submitTradeRequest(parsed, signer);
      push("agent", "Request is live. If the offer meets your minimum and reputation threshold, auto-execution will happen in backend.");
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Unexpected error";
      push("agent", `Could not process trade: ${messageText}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass relative overflow-hidden rounded-3xl p-4 sm:p-8">
      <div className="pointer-events-none absolute -top-20 right-0 h-48 w-48 rounded-full bg-[#ef835433] blur-2xl" />
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#5b6b89]">TradeWhisper / HashKey Testnet</p>
          <h1 className="text-3xl font-bold text-[#14213d] sm:text-4xl">OTC Trade Chat</h1>
          <p className="mt-2 text-sm text-[#3f4f73]">Type your trade in plain English. Approval and request publication happen from this chat.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-[#e7ddca] bg-white/80 px-3 py-2 text-xs text-[#3f4f73]">
            Wallet: {wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "not connected"}
          </div>
          <button
            type="button"
            onClick={() => void onConnectWallet()}
            disabled={connectingWallet || busy}
            className="rounded-xl border border-[#d8c6a5] bg-white px-3 py-2 text-xs font-semibold text-[#223156] transition hover:bg-[#fff7eb] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {connectingWallet ? "Connecting..." : wallet ? "Reconnect" : "Connect Wallet"}
          </button>
        </div>
      </header>

      <div className="chat-scroll mb-4 h-[52vh] space-y-3 overflow-y-auto rounded-2xl border border-[#e7ddca] bg-white/70 p-3 sm:p-4">
        {messages.map((item) => (
          <article
            key={item.id}
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              item.role === "user"
                ? "ml-auto bg-[#14213d] text-[#f8f5ef]"
                : "bg-[#fff7eb] text-[#223156] border border-[#f3d8b4]"
            }`}
          >
            {item.text}
          </article>
        ))}
      </div>

      <form onSubmit={onSend} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Example: I want to sell 10 USDC for HSK and I want at least 33 HSK"
          className="min-h-12 flex-1 rounded-xl border border-[#d8c6a5] bg-white px-4 py-3 text-sm outline-none ring-[#ef8354] transition focus:ring-2"
        />
        <button
          disabled={busy}
          type="submit"
          className="rounded-xl bg-[#ef8354] px-5 py-3 font-semibold text-white transition hover:bg-[#dd7345] disabled:cursor-not-allowed disabled:bg-[#f7c59f]"
        >
          {busy ? "Processing..." : "Whisper Trade"}
        </button>
      </form>
    </section>
  );
}
