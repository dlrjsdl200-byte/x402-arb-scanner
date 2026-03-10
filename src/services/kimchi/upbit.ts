import { fetchJson } from "../../lib/http.js";
import { TTLCache } from "../../lib/cache.js";

interface UpbitTicker {
  market: string;
  trade_price: number;
  opening_price: number;
  high_price: number;
  low_price: number;
  prev_closing_price: number;
  acc_trade_volume_24h: number;
  timestamp: number;
}

interface UpbitOrderbook {
  market: string;
  orderbook_units: Array<{
    ask_price: number;
    bid_price: number;
    ask_size: number;
    bid_size: number;
  }>;
}

export interface UpbitData {
  tickers: Record<string, UpbitTicker>;
  orderbooks: Record<string, UpbitOrderbook>;
  usdtKrw: number; // USDT/KRW effective rate
  fetchedAt: number;
}

const ASSETS = ["BTC", "ETH", "XRP", "SOL", "DOGE"];
const TICKER_MARKETS = ASSETS.map((a) => `KRW-${a}`).join(",");
const ORDERBOOK_MARKETS = ASSETS.map((a) => `KRW-${a}`).join(",");

async function fetchUpbitData(): Promise<UpbitData> {
  const [tickers, orderbooks, usdtTicker] = await Promise.all([
    fetchJson<UpbitTicker[]>(
      `https://api.upbit.com/v1/ticker?markets=${TICKER_MARKETS}`,
    ),
    fetchJson<UpbitOrderbook[]>(
      `https://api.upbit.com/v1/orderbook?markets=${ORDERBOOK_MARKETS}`,
    ),
    fetchJson<UpbitTicker[]>(`https://api.upbit.com/v1/ticker?markets=KRW-USDT`),
  ]);

  const tickerMap: Record<string, UpbitTicker> = {};
  for (const t of tickers) {
    const asset = t.market.replace("KRW-", "");
    tickerMap[asset] = t;
  }

  const orderbookMap: Record<string, UpbitOrderbook> = {};
  for (const ob of orderbooks) {
    const asset = ob.market.replace("KRW-", "");
    orderbookMap[asset] = ob;
  }

  return {
    tickers: tickerMap,
    orderbooks: orderbookMap,
    usdtKrw: usdtTicker[0]?.trade_price ?? 0,
    fetchedAt: Date.now(),
  };
}

export const upbitCache = new TTLCache(fetchUpbitData, 3_000); // 3s TTL
