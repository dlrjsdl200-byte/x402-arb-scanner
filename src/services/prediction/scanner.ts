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

async function fetchPolymarketOpportunities(): Promise<PredictionOpportunity[]> {
  const opportunities: PredictionOpportunity[] = [];

  // Fetch active events from Polymarket
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

        // If sum deviates from 1.0 by > 1%, there's an arb opportunity
        // sum < 1.0: buy all outcomes cheaply
        // sum > 1.0: overpriced — could short
        if (Math.abs(sum - 1.0) > 0.01) {
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

    // Multi-market arb within same event: if event has multiple binary markets
    // that are logically exclusive, check if their "Yes" prices sum to != 1.0
    if (event.markets.length >= 2) {
      const yesAcrossMarkets: Array<{ question: string; price: number; volume: number }> = [];

      for (const market of event.markets) {
        if (market.closed || !market.active) continue;
        try {
          const prices: number[] = JSON.parse(market.outcomePrices || "[]");
          if (prices.length >= 1) {
            yesAcrossMarkets.push({
              question: market.question,
              price: prices[0], // "Yes" price
              volume: parseFloat(market.volume) || 0,
            });
          }
        } catch {
          // skip
        }
      }

      if (yesAcrossMarkets.length >= 2) {
        const sumYes = yesAcrossMarkets.reduce((a, b) => a + b.price, 0);
        // For mutually exclusive outcomes, sum should be ~1.0
        if (Math.abs(sumYes - 1.0) > 0.02 && yesAcrossMarkets.length <= 10) {
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

  return opportunities.sort((a, b) => b.spread_pct - a.spread_pct);
}

const predictionCache = new TTLCache(fetchPolymarketOpportunities, 30_000); // 30s TTL

export async function scanPredictionArbitrage(): Promise<PredictionArbResult> {
  const opportunities = await predictionCache.get();

  return {
    success: true,
    timestamp: new Date().toISOString(),
    staleness_seconds: predictionCache.stalenessSeconds,
    estimated_ttl_seconds: 30,
    opportunities,
    total_events_scanned: 50,
    meta: {
      markets_scanned: ["Polymarket"],
      data_source: "Polymarket Gamma API (free, no key)",
    },
  };
}
