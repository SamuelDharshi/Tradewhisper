"use client";

import { useEffect, useMemo, useState } from "react";
import { Contract, JsonRpcProvider } from "ethers";

const HASHKEY_RPC = "https://testnet.hsk.xyz";
const EXPLORER_ADDR = "https://testnet-explorer.hsk.xyz/address/";
const REPUTATION_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS || "0x7C5e03ea5185bF4A6E4DDc6fd6B7Fba75b760471";

const REPUTATION_ABI = [
  "event ReputationIncremented(address indexed agent, uint256 newScore)",
  "function score(address agent) view returns (uint256)"
] as const;

type Row = {
  agent: string;
  score: number;
};

export default function LeaderboardPage() {
  const provider = useMemo(() => new JsonRpcProvider(HASHKEY_RPC), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLeaderboard(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const registry = new Contract(REPUTATION_ADDRESS, REPUTATION_ABI, provider);
      const logs = await registry.queryFilter(registry.filters.ReputationIncremented(), 0, "latest");

      const uniqueAgents = Array.from(
        new Set(
          logs
            .filter((log): log is typeof logs[number] & { args: Record<string, unknown> } => "args" in log)
            .map((log) => String(log.args.agent))
        )
      );
      const scored = await Promise.all(
        uniqueAgents.map(async (agent) => {
          const scoreBigInt = (await registry.score(agent)) as bigint;
          return { agent, score: Number(scoreBigInt) } satisfies Row;
        })
      );

      setRows(scored.sort((a, b) => b.score - a.score));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load leaderboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLeaderboard();
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden px-6 py-20 lg:px-12">
      <section className="mx-auto max-w-300 space-y-6 rounded-3xl border border-foreground/10 bg-background/60 p-6 sm:p-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">TradeWhisper / Reputation</p>
            <h1 className="text-3xl font-display tracking-tight sm:text-4xl">Market Maker Leaderboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Live rankings from on-chain ReputationRegistry scores.</p>
          </div>
          <div className="flex gap-2">
            <a href="/trade" className="rounded-xl border border-foreground/20 px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5">Trade</a>
            <a href="/history" className="rounded-xl border border-foreground/20 px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5">History</a>
            <button
              type="button"
              onClick={() => void loadLeaderboard()}
              className="rounded-xl border border-foreground/20 bg-background px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5"
            >
              Refresh
            </button>
          </div>
        </header>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading leaderboard...</p> : null}

        {!loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scored agents yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <article key={row.agent} className="flex items-center justify-between rounded-xl border border-foreground/10 p-3 text-sm">
                <div>
                  <p className="font-semibold">#{index + 1} {row.agent.slice(0, 6)}...{row.agent.slice(-4)}</p>
                  <a className="text-xs underline" href={`${EXPLORER_ADDR}${row.agent}`} target="_blank" rel="noreferrer">View address</a>
                </div>
                <p className="font-display text-lg">{row.score}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
