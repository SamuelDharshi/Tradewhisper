"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, Interface, JsonRpcProvider, JsonRpcSigner, formatUnits, parseUnits } from "ethers";
import { saveTradeHistoryRecord } from "@/lib/trade-history";

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

type EthereumProvider = {
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
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
  "function cancelTrade(bytes32 requestId) external",
  "function requestTrade(address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 requestDeadline,uint256 nonce) external returns (bytes32)",
  "event TradeRequested(bytes32 indexed requestId,address indexed requester,address indexed tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 requestDeadline,uint256 nonce)",
  "event TradeOffered(bytes32 indexed requestId,address indexed agent,uint256 amountOut,uint256 offerDeadline,bytes signature)",
  "event TradeCancelled(bytes32 indexed requestId,address indexed requester)",
  "event TradeExecuted(bytes32 indexed requestId,address indexed requester,address indexed agent,uint256 amountIn,uint256 amountOut)"
] as const;

const ATOMIC_SWAP_ABI = [
  "function executeTrade(bytes32 requestId,uint256 amountOut,uint256 offerDeadline,address agent,bytes signature) external"
] as const;

const ERC20_ABI = [
  "function approve(address spender,uint256 amount) external returns (bool)",
  "function allowance(address owner,address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function mint(address to,uint256 amount) external"
] as const;

type SubmittedTrade = {
  requestId: string;
  txHash: string;
};

type RequestLifecycleStatus = "REQUESTED" | "OFFERED" | "EXECUTED" | "CANCELLED";

type OfferInfo = {
  agent: string;
  amountOut: bigint;
  offerDeadline: bigint;
  signature: string;
};

type PendingRequest = {
  requestId: string;
  txHash: string;
  tokenIn: "USDC" | "HSK";
  tokenOut: "USDC" | "HSK";
  amountIn: number;
  minAmountOut: number | null;
  status: RequestLifecycleStatus;
  offer: OfferInfo | null;
  lastActionTxHash?: string;
  lastActionLabel?: "OFFER" | "EXECUTED" | "CANCELLED";
};

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

type TradeChatProps = {
  autoConnectWallet?: boolean;
};

export function TradeChat({ autoConnectWallet = false }: TradeChatProps) {
  const [wallet, setWallet] = useState<string>("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [faucetBusy, setFaucetBusy] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [requestActionBusy, setRequestActionBusy] = useState<Record<string, boolean>>({});
  const autoConnectTried = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "agent",
      text: "Whisper your trade and I will parse intent, check approval, and post a live request on HashKey testnet."
    }
  ]);

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000", []);

  const routerAddress = useMemo(
    () => process.env.NEXT_PUBLIC_TRADE_ROUTER_ADDRESS || "0xEEb42D6F9E90Bc13BBb0077d9CAC972a48C59d24",
    []
  );
  const atomicSwapAddress = useMemo(
    () => process.env.NEXT_PUBLIC_ATOMIC_SWAP_ADDRESS || "0x71e7763BB53AEf04CbC5Ee784A146e7Eb08A019b",
    []
  );
  const usdcAddress = useMemo(
    () => process.env.NEXT_PUBLIC_USDC_ADDRESS || "0xCA886ebef3d708fA61bD3b3606F31c904258ec3A",
    []
  );
  const hskTokenAddress = useMemo(
    () => process.env.NEXT_PUBLIC_HSK_TOKEN_ADDRESS || "0x55f11eD5DF8a2d78cC69a8e39464841e86F278a3",
    []
  );

  const readProvider = useMemo(() => new JsonRpcProvider(HASHKEY_RPC), []);

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
        // Ignore auto-detect errors.
      }
    }

    void detectConnectedWallet();
  }, []);

  useEffect(() => {
    if (!autoConnectWallet || autoConnectTried.current || wallet || connectingWallet || busy) {
      return;
    }

    autoConnectTried.current = true;
    void onConnectWallet();
  }, [autoConnectWallet, wallet, connectingWallet, busy]);

  function push(role: ChatRole, text: string): void {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, text }]);
  }

  function trace(label: string, detail: string): void {
    console.log(`[JudgeTrace] ${label}: ${detail}`);
  }

  function upsertPendingRequest(update: PendingRequest): void {
    setPendingRequests((prev) => {
      const idx = prev.findIndex((row) => row.requestId === update.requestId);
      if (idx === -1) {
        return [update, ...prev];
      }

      const copy = [...prev];
      copy[idx] = update;
      return copy;
    });
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
      "MetaMask request timed out. Open MetaMask and approve the connection popup."
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
      // When already connected, ask permissions again so MetaMask can surface account selection.
      if (wallet) {
        try {
          const injected = getMetaMaskProvider();
          if (injected) {
            await injected.request({
              method: "wallet_requestPermissions",
              params: [{ eth_accounts: {} } as unknown as Record<string, unknown>]
            });
          }
        } catch {
          // Ignore permission prompt failures and continue with normal connect flow.
        }
      }

      await connectWallet();
      push("agent", "Wallet connected on HashKey testnet.");
      trace("WALLET_CONNECTED", "Wallet connected on HashKey testnet.");
    } catch (error) {
      const err = error as { code?: number; message?: string };
      let messageText = error instanceof Error ? error.message : "Wallet connection failed";
      if (err?.code === 4001) {
        messageText = "Connection rejected in MetaMask.";
      } else if (err?.code === -32002) {
        messageText = "MetaMask already has a pending request. Open MetaMask and confirm it.";
      }
      push("agent", `Could not connect wallet: ${messageText}`);
      trace("WALLET_CONNECT_ERROR", messageText);
    } finally {
      setConnectingWallet(false);
    }
  }

  function onDisconnectWallet(): void {
    setWallet("");
    push("agent", "Wallet disconnected in UI. Connect again to use another account.");
    trace("WALLET_DISCONNECTED", "Cleared connected wallet state in UI.");
  }

  async function parseIntent(message: string): Promise<ParsedIntent> {
    const response = await fetch(`${apiBase}/parse-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Failed to parse intent");
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

    push("agent", "Approval missing. Requesting token approval in MetaMask...");
    trace("APPROVAL_REQUIRED", `Allowance below required amount. Approving token ${tokenAddress}.`);
    const tx = await token.approve(atomicSwapAddress, amount);
    await tx.wait();
    push("agent", `Approval confirmed: ${tx.hash}`);
    trace("APPROVAL_CONFIRMED", `Approval tx=${tx.hash}`);
  }

  async function submitTradeRequest(intent: ParsedIntent, signer: JsonRpcSigner): Promise<SubmittedTrade> {
    if (!intent.tokenIn || !intent.tokenOut || !intent.amountIn) {
      throw new Error("Trade intent is incomplete. Specify both tokens and amount.");
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

    push("agent", "Publishing trade request on HashKey testnet...");
    trace("REQUEST_PUBLISHING", `Calling TradeRouter.requestTrade on ${routerAddress}.`);
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

    push("agent", `Trade request submitted. requestId=${requestId || "(parsed later)"}, tx=${tx.hash}`);
    trace("REQUEST_SUBMITTED", `requestId=${requestId || "N/A"}, requestTx=${tx.hash}, method=0x2f264644`);

    if (requestId) {
      upsertPendingRequest({
        requestId,
        txHash: tx.hash,
        tokenIn: intent.tokenIn,
        tokenOut: intent.tokenOut,
        amountIn: intent.amountIn,
        minAmountOut: intent.minAmountOut,
        status: "REQUESTED",
        offer: null
      });
    }

    return {
      requestId,
      txHash: tx.hash
    };
  }

  async function onFaucet(): Promise<void> {
    if (faucetBusy || busy) {
      return;
    }

    setFaucetBusy(true);

    try {
      const signer = await connectWallet();
      const address = await signer.getAddress();

      const usdc = new Contract(usdcAddress, ERC20_ABI, signer);
      const decimals = (await usdc.decimals()) as number;
      const tx = await usdc.mint(address, toUnits(100, decimals));
      await tx.wait();

      push("agent", `Faucet minted 100 test USDC. tx=${tx.hash}`);
      trace("FAUCET_MINT", `Minted 100 test USDC. tx=${tx.hash}`);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Faucet call failed";
      push("agent", `Could not mint test USDC: ${messageText}`);
      trace("FAUCET_ERROR", messageText);
    } finally {
      setFaucetBusy(false);
    }
  }

  async function refreshRequestStatusSilent(request: PendingRequest): Promise<void> {
    await refreshRequestStatusInternal(request);
  }

  async function refreshRequestStatusInternal(request: PendingRequest): Promise<void> {
    setRequestActionBusy((prev) => ({ ...prev, [request.requestId]: true }));

    try {
      const router = new Contract(routerAddress, ROUTER_ABI, readProvider);

      const offeredLogs = await router.queryFilter(router.filters.TradeOffered(request.requestId), 0, "latest");
      const cancelledLogs = await router.queryFilter(router.filters.TradeCancelled(request.requestId), 0, "latest");
      const executedLogs = await router.queryFilter(router.filters.TradeExecuted(request.requestId), 0, "latest");

      const offeredEvent = [...offeredLogs].reverse().find((log) => "args" in log);
      const cancelledEvent = [...cancelledLogs].reverse().find((log) => "args" in log);
      const executedEvent = [...executedLogs].reverse().find((log) => "args" in log);

      let status: RequestLifecycleStatus = "REQUESTED";
      if (executedEvent) {
        status = "EXECUTED";
      } else if (cancelledEvent) {
        status = "CANCELLED";
      } else if (offeredEvent) {
        status = "OFFERED";
      }

      const offer: OfferInfo | null = offeredEvent
        ? {
            agent: String(offeredEvent.args.agent),
            amountOut: offeredEvent.args.amountOut as bigint,
            offerDeadline: offeredEvent.args.offerDeadline as bigint,
            signature: String(offeredEvent.args.signature)
          }
        : null;

      const offerTxHash = offeredEvent ? offeredEvent.transactionHash : undefined;
      const executedTxHash = executedEvent ? executedEvent.transactionHash : undefined;
      const cancelledTxHash = cancelledEvent ? cancelledEvent.transactionHash : undefined;

      const lastActionTxHash = executedEvent
        ? executedEvent.transactionHash
        : cancelledEvent
          ? cancelledEvent.transactionHash
          : offeredEvent
            ? offeredEvent.transactionHash
            : request.lastActionTxHash;

      const lastActionLabel = executedEvent
        ? "EXECUTED"
        : cancelledEvent
          ? "CANCELLED"
          : offeredEvent
            ? "OFFER"
            : request.lastActionLabel;

      upsertPendingRequest({ ...request, status, offer, lastActionTxHash, lastActionLabel });

      const changed = status !== request.status;
      if (changed && status === "OFFERED" && offer) {
        push(
          "agent",
          `[MarketAgent] Offer submitted ${request.requestId} tx=${offerTxHash || "(pending)"}`
        );
        trace("OFFER_FOUND", `requestId=${request.requestId}, offerTx=${offerTxHash || "N/A"}`);
      }

      if (changed && status === "EXECUTED") {
        push("agent", `[UserAgent] ACCEPT ${request.requestId}: tx=${executedTxHash || "(pending)"}`);
        push(
          "agent",
          "[UserAgent] I accepted the offer automatically because it meets your configured trade constraints."
        );
        trace("REQUEST_EXECUTED", `requestId=${request.requestId} is EXECUTED.`);
      }

      if (changed && status === "CANCELLED") {
        push("agent", `[UserAgent] REJECT ${request.requestId}: tx=${cancelledTxHash || "(pending)"}`);
        push(
          "agent",
          "[UserAgent] I rejected the offer automatically because it did not meet your configured trade constraints."
        );
        trace("REQUEST_CANCELLED", `requestId=${request.requestId} is CANCELLED.`);
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Status refresh failed";
      trace("STATUS_REFRESH_WARNING", `requestId=${request.requestId}, error=${messageText}`);
    } finally {
      setRequestActionBusy((prev) => ({ ...prev, [request.requestId]: false }));
    }
  }

  useEffect(() => {
    if (pendingRequests.length === 0) {
      return;
    }

    const active = pendingRequests.filter((row) => row.status === "REQUESTED" || row.status === "OFFERED");
    if (active.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      active.forEach((request) => {
        if (!requestActionBusy[request.requestId]) {
          void refreshRequestStatusSilent(request);
        }
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [pendingRequests, requestActionBusy]);

  function statusHint(request: PendingRequest): string {
    if (request.status === "REQUESTED") {
      return "Request published on-chain. Waiting for a market-agent offer. Backend user-agent will decide automatically.";
    }

    if (request.status === "OFFERED") {
      return "Offer is live. Backend user-agent will auto-accept if constraints match, otherwise it will reject and continue.";
    }

    if (request.status === "EXECUTED") {
      return "Trade settled on-chain through AtomicSwap.";
    }

    return "Request cancelled on-chain through TradeRouter.";
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
      trace("INTENT_PARSED", `intent=${parsed.intent}, tokenIn=${parsed.tokenIn ?? "N/A"}, tokenOut=${parsed.tokenOut ?? "N/A"}, amountIn=${parsed.amountIn ?? "N/A"}, minAmountOut=${parsed.minAmountOut ?? "N/A"}`);

      if (parsed.needsClarification) {
        push("agent", parsed.clarificationQuestion || "I need one more detail to proceed.");
        return;
      }

      push("agent", parsed.userMessage);

      if (parsed.intent !== "TRADE") {
        push("agent", "Only TRADE intents are connected for on-chain request submission right now.");
        return;
      }

      const submitted = await submitTradeRequest(parsed, signer);

      push("agent", "Request is live. Backend market-agent will monitor and continue the lifecycle.");
      trace("FLOW_WAITING_OFFER", `requestId=${submitted.requestId || "N/A"}. Waiting for TradeOffered event.`);

      try {
        saveTradeHistoryRecord({
          requestId: submitted.requestId,
          txHash: submitted.txHash,
          tokenIn: parsed.tokenIn ?? "UNKNOWN",
          tokenOut: parsed.tokenOut ?? "UNKNOWN",
          amountIn: parsed.amountIn ?? 0,
          minAmountOut: parsed.minAmountOut,
          createdAt: Date.now()
        });
      } catch (historyError) {
        const detail = historyError instanceof Error ? historyError.message : "history save failed";
        trace("HISTORY_SAVE_WARNING", detail);
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Unexpected error";
      push("agent", `Could not process trade: ${messageText}`);
      trace("FLOW_ERROR", messageText);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-foreground/10 bg-background/60 p-4 sm:p-8">
      <div className="pointer-events-none absolute -top-20 right-0 h-48 w-48 rounded-full bg-[#eca8d633] blur-2xl" />

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">TradeWhisper / HashKey Testnet</p>
          <h1 className="text-3xl font-display tracking-tight sm:text-4xl">Conversational OTC Trade</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Type your trade in natural language. Approval and request publication happen from this chat.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <a href="/">Home</a>
            <a href="/trade">Trade</a>
            <a href="/history">History</a>
            <a href="/leaderboard">Leaderboard</a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => void onFaucet()}
            disabled={faucetBusy || busy}
            className="rounded-xl border border-foreground/20 bg-background px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {faucetBusy ? "Minting..." : "Get 100 Test USDC"}
          </button>
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => void onConnectWallet()}
            disabled={connectingWallet || busy}
            className="rounded-xl border border-foreground/20 bg-background px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {connectingWallet ? "Connecting..." : "Connect Wallet"}
          </button>
          {wallet ? (
            <button
              type="button"
              suppressHydrationWarning
              onClick={onDisconnectWallet}
              disabled={connectingWallet || busy}
              className="rounded-xl border border-foreground/20 bg-background px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Disconnect
            </button>
          ) : null}
        </div>
      </header>

      <div className="mb-4 h-[52vh] space-y-3 overflow-y-auto rounded-2xl border border-foreground/10 bg-background/40 p-3 sm:p-4">
        {messages.map((item) => (
          <article
            key={item.id}
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              item.role === "user"
                ? "ml-auto bg-foreground text-background"
                : "bg-foreground/5 text-foreground border border-foreground/10"
            }`}
          >
            {item.text}
          </article>
        ))}
      </div>

      {pendingRequests.length > 0 ? (
        <div className="mb-4 space-y-3 rounded-2xl border border-foreground/10 bg-background/40 p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Live Request Lifecycle</p>
          <p className="text-xs text-muted-foreground">
            Backend user-agent decides accept/reject. Method map for judges: requestTrade=0x2f264644, cancelTrade=0x7cfb41b8, executeTrade=0xd8236402.
          </p>
          {pendingRequests.map((request) => {
            const outDecimals = request.tokenOut === "USDC" ? 6 : 18;
            const offeredAmount = request.offer ? formatUnits(request.offer.amountOut, outDecimals) : null;
            const busyNow = Boolean(requestActionBusy[request.requestId]);

            return (
              <article key={request.requestId} className="rounded-xl border border-foreground/10 p-3 text-sm">
                <p className="font-semibold">{request.amountIn} {request.tokenIn} to {request.tokenOut}</p>
                <p className="mt-1 text-xs text-muted-foreground">requestId: {request.requestId}</p>
                <p className="mt-1 text-xs text-muted-foreground">status: {request.status}</p>
                <p className="mt-1 text-xs text-muted-foreground">{statusHint(request)}</p>
                {offeredAmount ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    offer: {offeredAmount} {request.tokenOut} from {request.offer?.agent.slice(0, 6)}...{request.offer?.agent.slice(-4)}
                  </p>
                ) : null}

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <a
                    href={`${HASHKEY_EXPLORER}/tx/${request.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Request tx
                  </a>

                  {busyNow ? <span className="text-muted-foreground">Updating...</span> : null}

                  {request.lastActionTxHash ? (
                    <a
                      href={`${HASHKEY_EXPLORER}/tx/${request.lastActionTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Action tx
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <form onSubmit={onSend} className="flex flex-col gap-3 sm:flex-row">
        <input
          suppressHydrationWarning
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Example: I want to sell 10 USDC for HSK and I want at least 33 HSK"
          className="min-h-12 flex-1 rounded-xl border border-foreground/20 bg-background px-4 py-3 text-sm outline-none ring-foreground transition focus:ring-2"
        />
        <button
          suppressHydrationWarning
          disabled={busy}
          type="submit"
          className="rounded-xl bg-foreground px-5 py-3 font-semibold text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy ? "Processing..." : "Whisper Trade"}
        </button>
      </form>
    </section>
  );
}
