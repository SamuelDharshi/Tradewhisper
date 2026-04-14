import { TradeChat } from "@/components/trade/TradeChat";

type TradePageProps = {
  searchParams?: Promise<{
    connectWallet?: string;
  }>;
};

export default async function TradePage({ searchParams }: TradePageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const autoConnect = resolvedParams?.connectWallet === "1";

  return (
    <main className="relative min-h-screen overflow-x-hidden px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-300">
        <TradeChat autoConnectWallet={autoConnect} />
      </div>
    </main>
  );
}
