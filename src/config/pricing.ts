import type { RoutesConfig } from "@x402/core/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { env } from "./env.js";

const NETWORK = "eip155:8453"; // Base

// ── Endpoint Pricing ──

export const PRICES = {
  kimchi: "$0.001",
  dex: "$0.002",
  prediction: "$0.002",
  unified: "$0.003",
} as const;

// ── Route Configs (x402) ──

function makeRoutes(
  path: string,
  price: string,
  description: string,
  exampleOutput: unknown,
): RoutesConfig {
  return {
    [`GET ${path}`]: {
      accepts: {
        scheme: "exact",
        price,
        network: NETWORK,
        payTo: env.WALLET_ADDRESS,
      },
      description,
      extensions: {
        ...declareDiscoveryExtension({
          output: { example: exampleOutput },
        }),
      },
    },
  };
}

export function allRoutes(): RoutesConfig {
  return {
    ...kimchiRoutes(),
    ...dexRoutes(),
    ...predictionRoutes(),
    ...unifiedRoutes(),
  };
}

export function kimchiRoutes(): RoutesConfig {
  return makeRoutes(
    "/scan/kimchi",
    PRICES.kimchi,
    "Kimchi Premium — KRW crypto premium tracking with 3-tier calculation (official FX, effective FX via USDT/KRW, executable bid/ask)",
    {
      success: true,
      request_cost_usdc: 0.001,
      timestamp: "2026-03-10T10:00:00.000Z",
      staleness_seconds: 0,
      premiums: {
        BTC: {
          official_fx: { premium_pct: -1.43, krw_price: 103635000, global_usd: 70794, global_krw_equivalent: 105137585 },
          effective_fx: { premium_pct: 0.20, usdt_krw: 1461, usdt_krw_source: "Upbit USDT/KRW" },
          executable: { bid_premium_pct: -1.43, ask_premium_pct: -1.43, kr_bid: 103635000, kr_ask: 103637000, global_bid_usd: 70794, global_ask_usd: 70800 },
        },
      },
      fx: { official_usd_krw: 1485.12, official_source: "ECB via Frankfurter (daily update)", effective_usd_krw: 1461, effective_source: "Upbit USDT/KRW", rate_date: "2026-03-10" },
      meta: { exchange_kr: "Upbit", exchange_global: "Binance", global_price_source: "Binance", assets_tracked: ["BTC", "ETH", "XRP", "SOL", "DOGE"] },
    },
  );
}

export function dexRoutes(): RoutesConfig {
  return makeRoutes(
    "/scan/dex",
    PRICES.dex,
    "DEX Arbitrage — Cross-DEX price discrepancy detection across Ethereum, Base, Arbitrum, Optimism (DEX-only, no CEX)",
    {
      success: true,
      request_cost_usdc: 0.002,
      timestamp: "2026-03-10T10:00:00.000Z",
      opportunities: [
        {
          pair: "WETH/USD",
          buy: { dex: "uniswap_v3", chain: "Ethereum", chain_id: 1, price: 2050.5 },
          sell: { dex: "aerodrome", chain: "Base", chain_id: 8453, price: 2058.1 },
          spread_pct: 0.37,
          estimated_profit_per_unit_usd: 7.6,
          executable_volume_usd: 500000,
          confidence: "medium",
        },
      ],
      total_pairs_scanned: 2,
      meta: { dexes_scanned: ["uniswap_v3", "aerodrome"], chains_scanned: ["Ethereum", "Base"], data_source: "DexScreener API (free, DEX-only, no key)" },
    },
  );
}

export function predictionRoutes(): RoutesConfig {
  return makeRoutes(
    "/scan/prediction",
    PRICES.prediction,
    "Prediction Market Arbitrage — Intra-market probability mispricing detection on Polymarket",
    {
      success: true,
      request_cost_usdc: 0.002,
      timestamp: "2026-03-10T10:00:00.000Z",
      opportunities: [
        {
          event: "2026 US Presidential Election",
          outcome: "Yes / No",
          type: "intra_market",
          prices: [{ market: "Polymarket", price: 0.52 }, { market: "Polymarket", price: 0.47 }],
          spread_pct: 1.0,
          implied_probability_sum: 0.99,
          category: "politics",
        },
      ],
      total_events_scanned: 42,
      threshold: { single_market_pct: 0.5, multi_market_pct: 1.0 },
      notice: "No opportunities found above threshold. Market is currently efficient.",
      meta: { markets_scanned: ["Polymarket"], data_source: "Polymarket Gamma API (free, no key)" },
    },
  );
}

export function unifiedRoutes(): RoutesConfig {
  return makeRoutes(
    "/scan/all",
    PRICES.unified,
    "Unified Scanner — All arbitrage types in one call (kimchi + DEX + prediction)",
    {
      success: true,
      request_cost_usdc: 0.003,
      timestamp: "2026-03-10T10:00:00.000Z",
      kimchi: { premiums: { BTC: { official_fx: { premium_pct: -1.43 } } }, staleness_seconds: 0 },
      dex: { opportunities: [{ pair: "WETH/USD", spread_pct: 0.37 }], staleness_seconds: 0 },
      prediction: { opportunities: [], staleness_seconds: 0 },
      total_opportunities: 6,
      errors: [],
    },
  );
}
