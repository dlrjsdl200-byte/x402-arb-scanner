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
    "Kimchi Premium — KRW crypto premium tracking with 3-tier calculation",
    {
      success: true,
      timestamp: "2026-03-10T10:00:00.000Z",
      staleness_seconds: 2,
      premiums: {
        BTC: {
          official_fx: { premium_pct: 3.2, krw_price: 138000000, global_usd: 97000 },
          effective_fx: { premium_pct: 2.8, usdt_krw: 1385.5 },
          executable: { bid_premium_pct: 2.6, ask_premium_pct: 3.0 },
        },
      },
      meta: { fx_source: "Bank of Korea", exchange_kr: "Upbit", exchange_global: "Binance" },
    },
  );
}

export function dexRoutes(): RoutesConfig {
  return makeRoutes(
    "/scan/dex",
    PRICES.dex,
    "DEX Arbitrage — Cross-DEX price discrepancy detection across chains",
    {
      success: true,
      timestamp: "2026-03-10T10:00:00.000Z",
      opportunities: [
        {
          pair: "WETH/USDC",
          buy: { dex: "Uniswap V3", chain: "Ethereum", price: 3498.5 },
          sell: { dex: "SushiSwap", chain: "Arbitrum", price: 3512.1 },
          spread_pct: 0.39,
          estimated_profit_usdc: 13.6,
        },
      ],
      total_pairs_scanned: 50,
      staleness_seconds: 5,
    },
  );
}

export function predictionRoutes(): RoutesConfig {
  return makeRoutes(
    "/scan/prediction",
    PRICES.prediction,
    "Prediction Market Arbitrage — Cross-market event pricing discrepancies",
    {
      success: true,
      timestamp: "2026-03-10T10:00:00.000Z",
      opportunities: [
        {
          event: "2026 US Presidential Election",
          outcome: "Democrat Win",
          prices: [
            { market: "Polymarket", price: 0.52 },
            { market: "Kalshi", price: 0.48 },
          ],
          spread_pct: 8.33,
          type: "cross_market",
        },
      ],
      staleness_seconds: 10,
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
      timestamp: "2026-03-10T10:00:00.000Z",
      kimchi: { top_premium: { asset: "BTC", premium_pct: 3.2 } },
      dex: { top_opportunity: { pair: "WETH/USDC", spread_pct: 0.39 } },
      prediction: { top_opportunity: { event: "US Election", spread_pct: 8.33 } },
      total_opportunities: 12,
    },
  );
}
