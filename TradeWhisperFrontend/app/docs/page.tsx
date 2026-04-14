export default function DocsPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden px-6 py-20 lg:px-12">
      <section className="mx-auto max-w-300 space-y-6 rounded-3xl border border-foreground/10 bg-background/60 p-6 sm:p-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">TradeWhisper / Docs</p>
          <h1 className="text-3xl font-display tracking-tight sm:text-4xl">Protocol Documentation</h1>
          <p className="text-sm text-muted-foreground">Product capabilities, trade flow, testnet setup, integrations, and security model.</p>
        </header>

        <section className="space-y-2 rounded-2xl border border-foreground/10 bg-background/40 p-4">
          <h2 className="text-sm font-semibold">Capabilities</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Natural-language OTC intent parsing and request submission.</li>
            <li>Wallet-first flow with HashKey Testnet network switching.</li>
            <li>On-chain request publication through TradeRouter and AtomicSwap settlement.</li>
            <li>Reputation-based market-maker ranking via ReputationRegistry.</li>
          </ul>
        </section>

        <section className="space-y-2 rounded-2xl border border-foreground/10 bg-background/40 p-4">
          <h2 className="text-sm font-semibold">Flow</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>User opens landing page and clicks Connect wallet.</li>
            <li>Trade page connects wallet, parses intent, and requests token approval if needed.</li>
            <li>TradeRouter records request and market agents respond.</li>
            <li>AtomicSwap executes settlement and updates agent reputation.</li>
            <li>History page shows request logs and explorer-verifiable settlements.</li>
          </ol>
        </section>

        <section className="space-y-2 rounded-2xl border border-foreground/10 bg-background/40 p-4">
          <h2 className="text-sm font-semibold">Testnet</h2>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Network: HashKey Chain Testnet (chainId 133)</p>
            <p>RPC: https://testnet.hsk.xyz</p>
            <p>Explorer: https://testnet-explorer.hsk.xyz</p>
            <a className="underline" href="https://testnet-explorer.hsk.xyz" target="_blank" rel="noreferrer">Open Explorer</a>
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border border-foreground/10 bg-background/40 p-4">
          <h2 className="text-sm font-semibold">Integrations</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>MetaMask wallet connection and chain switching.</li>
            <li>Backend parser and market-agent services on localhost:3000.</li>
            <li>Smart contracts: TradeRouter, AtomicSwap, ReputationRegistry.</li>
          </ul>
        </section>

        <section className="space-y-2 rounded-2xl border border-foreground/10 bg-background/40 p-4">
          <h2 className="text-sm font-semibold">Security</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Atomic settlement execution in a dedicated swap contract.</li>
            <li>EIP-712 signature verification for maker offers.</li>
            <li>Requester minAmountOut and offer deadline protections.</li>
            <li>On-chain auditability through explorer-linked transaction history.</li>
          </ul>
        </section>

        <footer className="flex flex-wrap gap-2 pt-2">
          <a href="/" className="rounded-xl border border-foreground/20 px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5">Home</a>
          <a href="/trade" className="rounded-xl border border-foreground/20 px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5">Trade</a>
          <a href="/history" className="rounded-xl border border-foreground/20 px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5">History</a>
          <a href="/leaderboard" className="rounded-xl border border-foreground/20 px-3 py-2 text-xs font-semibold transition hover:bg-foreground/5">Leaderboard</a>
        </footer>
      </section>
    </main>
  );
}
