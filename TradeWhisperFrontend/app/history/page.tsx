"use client";

import { useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatUnits } from "ethers";
import { loadTradeHistory, TradeHistoryRecord } from "@/lib/trade-history";

const HASHKEY_RPC = "https://testnet.hsk.xyz";
const EXPLORER_TX = "https://testnet-explorer.hsk.xyz/tx/";
const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_TRADE_ROUTER_ADDRESS || "0xEEb42D6F9E90Bc13BBb0077d9CAC972a48C59d24";
const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0xCA886ebef3d708fA61bD3b3606F31c904258ec3A").toLowerCase();

const ROUTER_ABI = [
  "event TradeExecuted(bytes32 indexed requestId,address indexed requester,address indexed agent,uint256 amountIn,uint256 amountOut)",
  "function getRequest(bytes32 requestId) view returns (tuple(address requester,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 requestDeadline,uint256 createdAt,uint256 nonce,bool active))"
] as const;

type ExecutedTrade = {
  requestId: string;
  txHash: string;
  requester: string;
  agent: string;
  amountIn: string;
  amountOut: string;
  tokenIn: string;
  tokenOut: string;
};

function getMetaMaskProvider() {
  const ethereum = (window as Window & { ethereum?: unknown }).ethereum as
    | {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        isMetaMask?: boolean;
        providers?: Array<{
          request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
          isMetaMask?: boolean;
        }>;
      }
    | undefined;

  if (!ethereum) {
    return null;
  }

  if (Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
    const mm = ethereum.providers.find((provider) => provider.isMetaMask);
    return mm || ethereum.providers[0];
  }

  return ethereum;
}

export default function HistoryPage() {
  const [wallet, setWallet] = useState("");
  const [localHistory, setLocalHistory] = useState<TradeHistoryRecord[]>([]);
  const [executed, setExecuted] = useState<ExecutedTrade[]>([]);
  const [loadingExecuted, setLoadingExecuted] = useState(false);
  const [error, setError] = useState("");

  const provider = useMemo(() => new JsonRpcProvider(HASHKEY_RPC), []);

  useEffect(() => {
    setLocalHistory(loadTradeHistory());
  }, []);

  async function connectWallet(): Promise<void> {
    const injected = getMetaMaskProvider();
    if (!injected) {
      setError("MetaMask is not available.");
      return;
    }

    try {
      const browserProvider = new BrowserProvider(injected);
      await injected.request({ method: "eth_requestAccounts" });
      const signer = await browserProvider.getSigner();
      setWallet(await signer.getAddress());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect wallet.");
    }
  }

  async function loadExecutedTrades(address: string): Promise<void> {
    setLoadingExecuted(true);
    setError("");

    try {
      const router = new Contract(ROUTER_ADDRESS, ROUTER_ABI, provider);
      const filter = router.filters.TradeExecuted(null, address, null);
      const logs = await router.queryFilter(filter, 0, "latest");

      const rows = await Promise.all(
        logs
          .filter((log): log is typeof logs[number] & { args: Record<string, unknown> } => "args" in log)
          .map(async (log) => {
          const requestId = String(log.args.requestId);
          const req = await router.getRequest(requestId);
          const tokenIn = String(req.tokenIn).toLowerCase() === USDC_ADDRESS ? "USDC" : "HSK";
          const tokenOut = String(req.tokenOut).toLowerCase() === USDC_ADDRESS ? "USDC" : "HSK";
          const tokenInDecimals = tokenIn === "USDC" ? 6 : 18;
          const tokenOutDecimals = tokenOut === "USDC" ? 6 : 18;

          return {
            requestId,
            txHash: log.transactionHash,
            requester: String(log.args.requester),
            agent: String(log.args.agent),
            amountIn: formatUnits(log.args.amountIn, tokenInDecimals),
            amountOut: formatUnits(log.args.amountOut, tokenOutDecimals),
            tokenIn,
            tokenOut
          } satisfies ExecutedTrade;
          })
      );

      setExecuted(rows.reverse());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load executed trades.");
    } finally {
      setLoadingExecuted(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden px-6 py-20 lg:px-12">
      <section className="mx-auto max-w-300 space-y-6 rounded-3xl border border-foreground/10 bg-background/60 p-6 sm:p-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">TradeWhisper / History</p>
            <h1 className="text-3xl font-display tracking-tight sm:text-4xl">Trade History</h1>
            <p className="mt-2 text-sm text-muted-foreground">Track submitted requests and verify settled trades on HashKey testnet explorer.</p>
          </div>
          <div className="flex gap-2">
            <a href="/trade" className="rounded-xl border border-foreground/20 px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5">Trade</a>
            <a href="/leaderboard" className="rounded-xl border border-foreground/20 px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5">Leaderboard</a>
            <button
              type="button"
              onClick={() => void connectWallet()}
              className="rounded-xl border border-foreground/20 bg-background px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5"
            >
              {wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "Connect Wallet"}
            </button>
          </div>
        </header>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <section className="space-y-3 rounded-2xl border border-foreground/10 bg-background/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Local Request Log</h2>
          </div>
          {localHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No local requests yet. Submit a trade from the chat to populate this log.</p>
          ) : (
            <div className="space-y-2">
              {localHistory.map((item) => (
                <article key={item.txHash} className="rounded-xl border border-foreground/10 p-3 text-sm">
                  <p className="font-semibold">{item.amountIn} {item.tokenIn} to {item.tokenOut}</p>
                  <p className="text-xs text-muted-foreground">requestId: {item.requestId || "pending parse"}</p>
                  <a className="text-xs underline" href={`${EXPLORER_TX}${item.txHash}`} target="_blank" rel="noreferrer">View transaction</a>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-foreground/10 bg-background/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">On-chain Settled Trades</h2>
            <button
              type="button"
              disabled={!wallet || loadingExecuted}
              onClick={() => void loadExecutedTrades(wallet)}
              className="rounded-xl border border-foreground/20 bg-background px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingExecuted ? "Loading..." : "Refresh"}
            </button>
          </div>
          {!wallet ? (
            <p className="text-sm text-muted-foreground">Connect wallet to fetch settled trades where you were the requester.</p>
          ) : executed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No settled trades found for this wallet yet.</p>
          ) : (
            <div className="space-y-2">
              {executed.map((item) => (
                <article key={item.txHash} className="rounded-xl border border-foreground/10 p-3 text-sm">
                  <p className="font-semibold">{item.amountIn} {item.tokenIn} swapped for {item.amountOut} {item.tokenOut}</p>
                  <p className="text-xs text-muted-foreground">agent: {item.agent}</p>
                  <a className="text-xs underline" href={`${EXPLORER_TX}${item.txHash}`} target="_blank" rel="noreferrer">View settlement</a>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
