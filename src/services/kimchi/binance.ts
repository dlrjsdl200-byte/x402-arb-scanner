import { fetchJson } from "../../lib/http.js";
import { TTLCache } from "../../lib/cache.js";

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

// ── Primary: Binance (may 451 from US IPs) ──

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

// ── Secondary: Kraken (US accessible, has bid/ask) ──

interface KrakenResponse {
  error: string[];
  result: Record<string, {
    a: [string, string, string]; // ask [price, wholeLotVol, lotVol]
    b: [string, string, string]; // bid
    c: [string, string];         // last trade [price, vol]
    v: [string, string];         // volume
  }>;
}

const KRAKEN_PAIRS: Record<string, string> = {
  BTC: "XBTUSD",
  ETH: "ETHUSD",
  XRP: "XRPUSD",
  SOL: "SOLUSD",
  DOGE: "DOGEUSD",
};

const KRAKEN_RESULT_KEYS: Record<string, string> = {
  BTC: "XXBTZUSD",
  ETH: "XETHZUSD",
  XRP: "XXRPZUSD",
  SOL: "SOLUSD",
  DOGE: "XDGUSD",
};

async function fetchFromKraken(): Promise<BinanceData> {
  const pairs = Object.values(KRAKEN_PAIRS).join(",");
  const data = await fetchJson<KrakenResponse>(
    `https://api.kraken.com/0/public/Ticker?pair=${pairs}`,
  );

  if (data.error?.length > 0) throw new Error(data.error[0]);

  const tickerMap: Record<string, GlobalTickerData> = {};
  for (const [asset, resultKey] of Object.entries(KRAKEN_RESULT_KEYS)) {
    const ticker = data.result[resultKey];
    if (!ticker) continue;
    tickerMap[asset] = {
      symbol: `${asset}USDT`,
      lastPrice: ticker.c[0],
      bidPrice: ticker.b[0],
      askPrice: ticker.a[0],
      volume: ticker.v[0],
    };
  }

  return { tickers: tickerMap, source: "Kraken", fetchedAt: Date.now() };
}

// ── Tertiary: CoinGecko (no bid/ask) ──

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
      bidPrice: price, // CoinGecko has no bid/ask
      askPrice: price,
      volume: "0",
    };
  }

  return { tickers: tickerMap, source: "CoinGecko", fetchedAt: Date.now() };
}

// ── 3-tier fallback: Binance → Kraken → CoinGecko ──

async function fetchGlobalPrices(): Promise<BinanceData> {
  try {
    return await fetchFromBinance();
  } catch {
    try {
      return await fetchFromKraken();
    } catch {
      return await fetchFromCoinGecko();
    }
  }
}

export const binanceCache = new TTLCache(fetchGlobalPrices, 5_000);
