export type TradeHistoryRecord = {
  requestId: string;
  txHash: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  minAmountOut: number | null;
  createdAt: number;
};

const STORAGE_KEY = "tradewhisper_history_v1";

export function loadTradeHistory(): TradeHistoryRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as TradeHistoryRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

export function saveTradeHistoryRecord(record: TradeHistoryRecord): void {
  if (typeof window === "undefined") {
    return;
  }

  const existing = loadTradeHistory();
  const next = [record, ...existing.filter((entry) => entry.txHash !== record.txHash)].slice(0, 100);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
