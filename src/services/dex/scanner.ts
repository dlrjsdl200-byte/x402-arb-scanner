import { fetchJson } from "../../lib/http.js";
import { TTLCache } from "../../lib/cache.js";
import type { DexArbResult, DexOpportunity } from "../../types/index.js";

// DexScreener API — free, no API key, DEX-only data
// 300 req/min rate limit

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd: string;
  volume: { h24: number; h1: number };
  liquidity: { usd: number };
}

interface DexScreenerResponse {
  pairs: DexScreenerPair[] | null;
}

// Token addresses per chain for DexScreener queries
const TOKENS: Record<string, Record<string, string>> = {
  WETH: {
    ethereum: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    base: "0x4200000000000000000000000000000000000006",
    arbitrum: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    optimism: "0x4200000000000000000000000000000000000006",
  },
  WBTC: {
    ethereum: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    arbitrum: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
  },
};

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  optimism: 10,
  polygon: 137,
  bsc: 56,
  avalanche: 43114,
};

const CHAIN_NAMES: Record<string, string> = {
  ethereum: "Ethereum",
  base: "Base",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  polygon: "Polygon",
  bsc: "BNB Chain",
  avalanche: "Avalanche",
};

const MIN_LIQUIDITY_USD = 10_000; // Filter out illiquid pools
const MIN_VOLUME_24H_USD = 1_000; // Filter out dead pools

async function fetchDexPrices(): Promise<DexOpportunity[]> {
  const opportunities: DexOpportunity[] = [];

  for (const [symbol, chains] of Object.entries(TOKENS)) {
    // Fetch pairs for each chain
    const pairsByChain: Array<{ chain: string; pair: DexScreenerPair }> = [];

    const fetchPromises = Object.entries(chains).map(async ([chain, address]) => {
      try {
        const data = await fetchJson<DexScreenerResponse>(
          `https://api.dexscreener.com/token-pairs/v1/${chain}/${address}`,
          10_000,
        );

        if (!data.pairs) return;

        // Filter: only USDC/USDT quote pairs with decent liquidity
        const validPairs = data.pairs.filter(
          (p) =>
            (p.quoteToken.symbol === "USDC" || p.quoteToken.symbol === "USDT") &&
            p.liquidity?.usd >= MIN_LIQUIDITY_USD &&
            p.volume?.h24 >= MIN_VOLUME_24H_USD &&
            parseFloat(p.priceUsd) > 0,
        );

        for (const pair of validPairs) {
          pairsByChain.push({ chain, pair });
        }
      } catch {
        // Skip chain on error
      }
    });

    await Promise.all(fetchPromises);

    if (pairsByChain.length < 2) continue;

    // Sort by price to find cheapest and most expensive
    const sorted = [...pairsByChain].sort(
      (a, b) => parseFloat(a.pair.priceUsd) - parseFloat(b.pair.priceUsd),
    );

    const cheapest = sorted[0];
    const expensive = sorted[sorted.length - 1];

    const buyPrice = parseFloat(cheapest.pair.priceUsd);
    const sellPrice = parseFloat(expensive.pair.priceUsd);
    const spread = ((sellPrice - buyPrice) / buyPrice) * 100;

    if (spread > 0.05) {
      const executableVolume = Math.min(
        cheapest.pair.volume.h24,
        expensive.pair.volume.h24,
      );

      opportunities.push({
        pair: `${symbol}/USD`,
        buy: {
          dex: cheapest.pair.dexId,
          chain: CHAIN_NAMES[cheapest.chain] ?? cheapest.chain,
          chain_id: CHAIN_IDS[cheapest.chain] ?? 0,
          price: buyPrice,
        },
        sell: {
          dex: expensive.pair.dexId,
          chain: CHAIN_NAMES[expensive.chain] ?? expensive.chain,
          chain_id: CHAIN_IDS[expensive.chain] ?? 0,
          price: sellPrice,
        },
        spread_pct: Math.round(spread * 10000) / 10000,
        estimated_profit_per_unit_usd: Math.round((sellPrice - buyPrice) * 100) / 100,
        executable_volume_usd: Math.round(executableVolume),
        confidence:
          spread > 1 && executableVolume > 100_000
            ? "high"
            : spread > 0.3 && executableVolume > 10_000
              ? "medium"
              : "low",
      });
    }
  }

  return opportunities.sort((a, b) => b.spread_pct - a.spread_pct);
}

const dexCache = new TTLCache(fetchDexPrices, 15_000); // 15s TTL

export async function scanDexArbitrage(minSpreadPct = 0): Promise<Omit<DexArbResult, "request_cost_usdc">> {
  const opportunities = await dexCache.get();

  const filtered = minSpreadPct > 0
    ? opportunities.filter((o) => o.spread_pct >= minSpreadPct)
    : opportunities;

  // Dynamic metadata from actual results
  const dexes = [...new Set(filtered.flatMap((o) => [o.buy.dex, o.sell.dex]))];
  const chains = [...new Set(filtered.flatMap((o) => [o.buy.chain, o.sell.chain]))];

  return {
    success: true,
    timestamp: new Date().toISOString(),
    staleness_seconds: dexCache.stalenessSeconds,
    estimated_ttl_seconds: 15,
    opportunities: filtered,
    total_pairs_scanned: Object.keys(TOKENS).length,
    min_spread_pct: minSpreadPct,
    meta: {
      dexes_scanned: dexes.length > 0 ? dexes : ["None matched filters"],
      chains_scanned: chains.length > 0 ? chains : Object.values(CHAIN_NAMES),
      data_source: "DexScreener API (free, DEX-only, no key)",
    },
  };
}
