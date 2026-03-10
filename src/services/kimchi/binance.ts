import { fetchJson } from "../../lib/http.js";
import { TTLCache } from "../../lib/cache.js";

// Binance ticker format (used as our internal type regardless of source)
export interface GlobalTickerData {
  symbol: string;
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  volume: string;
}

export interface BinanceData {
  tickers: Record<string, GlobalTickerData>;
  source: string;
  fetchedAt: number;
}

const ASSETS = ["BTC", "ETH", "XRP", "SOL", "DOGE"];

// Primary: Binance (may fail from US IPs / Vercel)
interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  volume: string;
  quoteVolume: string;
}

async function fetchFromBinance(): Promise<BinanceData> {
  const symbols = ASSETS.map((a) => `"${a}USDT"`).join(",");
  const tickers = await fetchJson<BinanceTicker[]>(
    `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`,
  );

  const tickerMap: Record<string, GlobalTickerData> = {};
  for (const t of tickers) {
    const asset = t.symbol.replace("USDT", "");
    tickerMap[asset] = t;
  }

  return { tickers: tickerMap, source: "Binance", fetchedAt: Date.now() };
}

// Fallback: CoinGecko (works globally, no API key needed)
interface CoinGeckoSimplePrice {
  [id: string]: { usd: number };
}

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XRP: "ripple",
  SOL: "solana",
  DOGE: "dogecoin",
};

async function fetchFromCoinGecko(): Promise<BinanceData> {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const data = await fetchJson<CoinGeckoSimplePrice>(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
  );

  const idToAsset = Object.fromEntries(
    Object.entries(COINGECKO_IDS).map(([asset, id]) => [id, asset]),
  );

  const tickerMap: Record<string, GlobalTickerData> = {};
  for (const [id, priceData] of Object.entries(data)) {
    const asset = idToAsset[id];
    if (!asset) continue;
    const price = priceData.usd.toString();
    tickerMap[asset] = {
      symbol: `${asset}USDT`,
      lastPrice: price,
      bidPrice: price, // CoinGecko doesn't provide bid/ask
      askPrice: price,
      volume: "0",
    };
  }

  return { tickers: tickerMap, source: "CoinGecko", fetchedAt: Date.now() };
}

async function fetchGlobalPrices(): Promise<BinanceData> {
  try {
    return await fetchFromBinance();
  } catch {
    // Binance blocked (451 from US IPs) — fall back to CoinGecko
    return await fetchFromCoinGecko();
  }
}

export const binanceCache = new TTLCache(fetchGlobalPrices, 5_000); // 5s TTL
