// ── Kimchi Premium Types ──

export interface KimchiPremiumResult {
  success: boolean;
  timestamp: string;
  staleness_seconds: number;
  estimated_ttl_seconds: number;
  premiums: Record<string, KimchiAssetPremium>;
  fx: FxRates;
  meta: KimchiMeta;
}

export interface KimchiAssetPremium {
  official_fx: {
    premium_pct: number;
    krw_price: number;
    global_usd: number;
    global_krw_equivalent: number;
  };
  effective_fx: {
    premium_pct: number;
    usdt_krw: number;
  };
  executable: {
    bid_premium_pct: number;
    ask_premium_pct: number;
    kr_bid: number;
    kr_ask: number;
    global_bid_usd: number;
    global_ask_usd: number;
  };
}

export interface FxRates {
  official_usd_krw: number;
  effective_usd_krw: number;
  source: string;
}

export interface KimchiMeta {
  exchange_kr: string;
  exchange_global: string;
  assets_tracked: string[];
  calculation_method: string;
}

// ── DEX Arbitrage Types ──

export interface DexArbResult {
  success: boolean;
  timestamp: string;
  staleness_seconds: number;
  estimated_ttl_seconds: number;
  opportunities: DexOpportunity[];
  total_pairs_scanned: number;
  min_spread_pct: number;
  meta: DexMeta;
}

export interface DexOpportunity {
  pair: string;
  buy: { dex: string; chain: string; chain_id: number; price: number };
  sell: { dex: string; chain: string; chain_id: number; price: number };
  spread_pct: number;
  estimated_profit_usdc: number;
  volume_24h_usd: number;
  confidence: "high" | "medium" | "low";
}

export interface DexMeta {
  dexes_scanned: string[];
  chains_scanned: string[];
  data_source: string;
}

// ── Prediction Market Types ──

export interface PredictionArbResult {
  success: boolean;
  timestamp: string;
  staleness_seconds: number;
  estimated_ttl_seconds: number;
  opportunities: PredictionOpportunity[];
  total_events_scanned: number;
  meta: PredictionMeta;
}

export interface PredictionOpportunity {
  event: string;
  outcome: string;
  type: "intra_market" | "cross_market";
  prices: Array<{ market: string; price: number; volume_24h?: number }>;
  spread_pct: number;
  implied_probability_sum?: number;
  category: string;
}

export interface PredictionMeta {
  markets_scanned: string[];
  data_source: string;
}

// ── Unified Scanner Types ──

export interface UnifiedScanResult {
  success: boolean;
  timestamp: string;
  kimchi: { premiums: Record<string, KimchiAssetPremium>; staleness_seconds: number } | null;
  dex: { opportunities: DexOpportunity[]; staleness_seconds: number } | null;
  prediction: { opportunities: PredictionOpportunity[]; staleness_seconds: number } | null;
  total_opportunities: number;
  errors: string[];
}
