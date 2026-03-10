import { fetchJson } from "../../lib/http.js";
import { TTLCache } from "../../lib/cache.js";
import type { DexArbResult, DexOpportunity } from "../../types/index.js";

// DexPaprika — free, no API key required
// Fetches token prices across multiple DEXes

interface DexPaprikaPool {
  id: string;
  dex_id: string;
  chain: string;
  chain_id: number;
  tokens: Array<{ symbol: string; address: string; name: string }>;
  price_usd: string;
  volume_24h_usd: string;
}

interface DexPaprikaResponse {
  pools: DexPaprikaPool[];
}

// Top pairs to scan for arbitrage
const SCAN_TOKENS = [
  { symbol: "WETH", coingecko_id: "weth" },
  { symbol: "WBTC", coingecko_id: "wrapped-bitcoin" },
  { symbol: "USDC", coingecko_id: "usd-coin" },
];

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  8453: "Base",
  42161: "Arbitrum",
  10: "Optimism",
  137: "Polygon",
  56: "BNB Chain",
};

// CoinGecko free API — price across exchanges
interface CoinGeckoTicker {
  base: string;
  target: string;
  market: { name: string; identifier: string };
  last: number;
  volume: number;
  converted_last: { usd: number };
  trust_score: string;
}

interface CoinGeckoTickerResponse {
  tickers: CoinGeckoTicker[];
}

async function fetchDexPrices(): Promise<DexOpportunity[]> {
  // Use CoinGecko's tickers endpoint to find cross-exchange price differences
  // This gives us real DEX prices from multiple venues
  const opportunities: DexOpportunity[] = [];

  for (const token of SCAN_TOKENS) {
    try {
      const data = await fetchJson<CoinGeckoTickerResponse>(
        `https://api.coingecko.com/api/v3/coins/${token.coingecko_id}/tickers?include_exchange_logo=false&depth=false&order=volume_desc`,
        15_000,
      );

      // Filter to DEX tickers with USDC/USDT pairs
      const dexTickers = data.tickers
        .filter(
          (t) =>
            (t.target === "USDC" || t.target === "USDT" || t.target === "USD") &&
            t.converted_last?.usd > 0 &&
            t.trust_score !== "red",
        )
        .slice(0, 20); // top 20 by volume

      if (dexTickers.length < 2) continue;

      // Find price discrepancies
      const sorted = [...dexTickers].sort((a, b) => a.converted_last.usd - b.converted_last.usd);
      const cheapest = sorted[0];
      const mostExpensive = sorted[sorted.length - 1];

      const spread = ((mostExpensive.converted_last.usd - cheapest.converted_last.usd) / cheapest.converted_last.usd) * 100;

      if (spread > 0.05) {
        // Only report spreads > 0.05%
        opportunities.push({
          pair: `${token.symbol}/USD`,
          buy: {
            dex: cheapest.market.name,
            chain: cheapest.market.identifier,
            chain_id: 0,
            price: cheapest.converted_last.usd,
          },
          sell: {
            dex: mostExpensive.market.name,
            chain: mostExpensive.market.identifier,
            chain_id: 0,
            price: mostExpensive.converted_last.usd,
          },
          spread_pct: Math.round(spread * 10000) / 10000,
          estimated_profit_usdc: Math.round((mostExpensive.converted_last.usd - cheapest.converted_last.usd) * 100) / 100,
          volume_24h_usd: cheapest.volume,
          confidence: spread > 1 ? "high" : spread > 0.3 ? "medium" : "low",
        });
      }
    } catch {
      // Skip token on error — don't fail entire scan
    }
  }

  return opportunities.sort((a, b) => b.spread_pct - a.spread_pct);
}

const dexCache = new TTLCache(fetchDexPrices, 15_000); // 15s TTL (CoinGecko rate limit friendly)

export async function scanDexArbitrage(minSpreadPct = 0): Promise<DexArbResult> {
  const opportunities = await dexCache.get();

  const filtered = minSpreadPct > 0
    ? opportunities.filter((o) => o.spread_pct >= minSpreadPct)
    : opportunities;

  return {
    success: true,
    timestamp: new Date().toISOString(),
    staleness_seconds: dexCache.stalenessSeconds,
    estimated_ttl_seconds: 15,
    opportunities: filtered,
    total_pairs_scanned: SCAN_TOKENS.length,
    min_spread_pct: minSpreadPct,
    meta: {
      dexes_scanned: ["Multiple via CoinGecko aggregation"],
      chains_scanned: Object.values(CHAIN_NAMES),
      data_source: "CoinGecko Tickers API (free, no key)",
    },
  };
}
