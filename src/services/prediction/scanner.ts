import { fetchJson } from "../../lib/http.js";
import { TTLCache } from "../../lib/cache.js";
import type { PredictionArbResult, PredictionOpportunity } from "../../types/index.js";

// Polymarket Gamma API — free, no API key
interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  category: string;
  markets: PolymarketMarket[];
}

interface PolymarketMarket {
  id: string;
  question: string;
  outcomePrices: string; // JSON string like "[0.52, 0.48]"
  outcomes: string; // JSON string like '["Yes", "No"]'
  volume: string;
  active: boolean;
  closed: boolean;
}

// Thresholds
const SINGLE_MARKET_THRESHOLD = 0.005; // 0.5% deviation from 1.0
const MULTI_MARKET_THRESHOLD = 0.01;   // 1% for multi-outcome events

interface PredictionCacheData {
  opportunities: PredictionOpportunity[];
  eventsScanned: number;
}

async function fetchPolymarketOpportunities(): Promise<PredictionCacheData> {
  const opportunities: PredictionOpportunity[] = [];

  const events = await fetchJson<PolymarketEvent[]>(
    "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=50&order=volume&ascending=false",
    15_000,
  );

  for (const event of events) {
    if (!event.markets || event.markets.length === 0) continue;

    // Intra-market arb: check if outcome prices don't sum to ~1.0
    for (const market of event.markets) {
      if (market.closed || !market.active) continue;

      try {
        const prices: number[] = JSON.parse(market.outcomePrices || "[]");
        const outcomes: string[] = JSON.parse(market.outcomes || "[]");

        if (prices.length < 2) continue;

        const sum = prices.reduce((a, b) => a + b, 0);

        if (Math.abs(sum - 1.0) > SINGLE_MARKET_THRESHOLD) {
          const spreadPct = Math.abs(sum - 1.0) * 100;

          opportunities.push({
            event: event.title,
            outcome: outcomes.join(" / "),
            type: "intra_market",
            prices: outcomes.map((o, i) => ({
              market: "Polymarket",
              price: prices[i],
              volume_24h: parseFloat(market.volume) || 0,
            })),
            spread_pct: Math.round(spreadPct * 100) / 100,
            implied_probability_sum: Math.round(sum * 10000) / 10000,
            category: event.category || "unknown",
          });
        }
      } catch {
        // Skip malformed market data
      }
    }

    // Multi-market arb within same event
    if (event.markets.length >= 2) {
      const yesAcrossMarkets: Array<{ question: string; price: number; volume: number }> = [];

      for (const market of event.markets) {
        if (market.closed || !market.active) continue;
        try {
          const prices: number[] = JSON.parse(market.outcomePrices || "[]");
          if (prices.length >= 1) {
            yesAcrossMarkets.push({
              question: market.question,
              price: prices[0],
              volume: parseFloat(market.volume) || 0,
            });
          }
        } catch {
          // skip
        }
      }

      if (yesAcrossMarkets.length >= 2) {
        const sumYes = yesAcrossMarkets.reduce((a, b) => a + b.price, 0);
        if (Math.abs(sumYes - 1.0) > MULTI_MARKET_THRESHOLD && yesAcrossMarkets.length <= 10) {
          opportunities.push({
            event: event.title,
            outcome: `${yesAcrossMarkets.length} outcomes`,
            type: "intra_market",
            prices: yesAcrossMarkets.map((m) => ({
              market: "Polymarket",
              price: m.price,
              volume_24h: m.volume,
            })),
            spread_pct: Math.round(Math.abs(sumYes - 1.0) * 10000) / 100,
            implied_probability_sum: Math.round(sumYes * 10000) / 10000,
            category: event.category || "unknown",
          });
        }
      }
    }
  }

  return {
    opportunities: opportunities.sort((a, b) => b.spread_pct - a.spread_pct),
    eventsScanned: events.length,
  };
}

const predictionCache = new TTLCache(fetchPolymarketOpportunities, 30_000);

export async function scanPredictionArbitrage(): Promise<Omit<PredictionArbResult, "request_cost_usdc">> {
  const { opportunities, eventsScanned } = await predictionCache.get();

  return {
    success: true,
    timestamp: new Date().toISOString(),
    staleness_seconds: predictionCache.stalenessSeconds,
    estimated_ttl_seconds: 30,
    opportunities,
    total_events_scanned: eventsScanned,
    notice: opportunities.length === 0
      ? "No opportunities found above threshold. Market is currently efficient."
      : undefined,
    threshold: {
      single_market_pct: SINGLE_MARKET_THRESHOLD * 100,
      multi_market_pct: MULTI_MARKET_THRESHOLD * 100,
    },
    meta: {
      markets_scanned: ["Polymarket"],
      data_source: "Polymarket Gamma API (free, no key)",
    },
  };
}
