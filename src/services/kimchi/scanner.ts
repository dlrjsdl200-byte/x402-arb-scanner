import { upbitCache } from "./upbit.js";
import { binanceCache } from "./binance.js";
import { fxCache } from "./fx.js";
import type { KimchiPremiumResult, KimchiAssetPremium } from "../../types/index.js";

const ASSETS = ["BTC", "ETH", "XRP", "SOL", "DOGE"];

export async function scanKimchiPremium(): Promise<KimchiPremiumResult> {
  const [upbit, binance, fx] = await Promise.all([
    upbitCache.get(),
    binanceCache.get(),
    fxCache.get(),
  ]);

  const premiums: Record<string, KimchiAssetPremium> = {};

  for (const asset of ASSETS) {
    const upbitTicker = upbit.tickers[asset];
    const binanceTicker = binance.tickers[asset];

    if (!upbitTicker || !binanceTicker) continue;

    const krwPrice = upbitTicker.trade_price;
    const globalUsd = parseFloat(binanceTicker.lastPrice);
    const officialKrw = fx.officialUsdKrw;
    const effectiveKrw = upbit.usdtKrw; // USDT/KRW from Upbit

    // Tier 1: Official FX rate premium
    const globalKrwEquivalent = globalUsd * officialKrw;
    const officialPremium = ((krwPrice - globalKrwEquivalent) / globalKrwEquivalent) * 100;

    // Tier 2: Effective FX rate premium (using USDT/KRW)
    const effectiveGlobalKrw = globalUsd * effectiveKrw;
    const effectivePremium = effectiveKrw > 0
      ? ((krwPrice - effectiveGlobalKrw) / effectiveGlobalKrw) * 100
      : 0;

    // Tier 3: Executable premium (bid/ask based)
    const ob = upbit.orderbooks[asset];
    const krBid = ob?.orderbook_units?.[0]?.bid_price ?? krwPrice;
    const krAsk = ob?.orderbook_units?.[0]?.ask_price ?? krwPrice;
    const globalBid = parseFloat(binanceTicker.bidPrice);
    const globalAsk = parseFloat(binanceTicker.askPrice);

    const bidPremium = officialKrw > 0
      ? ((krBid - globalAsk * officialKrw) / (globalAsk * officialKrw)) * 100
      : 0;
    const askPremium = officialKrw > 0
      ? ((krAsk - globalBid * officialKrw) / (globalBid * officialKrw)) * 100
      : 0;

    premiums[asset] = {
      official_fx: {
        premium_pct: round(officialPremium),
        krw_price: krwPrice,
        global_usd: globalUsd,
        global_krw_equivalent: round(globalKrwEquivalent),
      },
      effective_fx: {
        premium_pct: round(effectivePremium),
        usdt_krw: effectiveKrw,
      },
      executable: {
        bid_premium_pct: round(bidPremium),
        ask_premium_pct: round(askPremium),
        kr_bid: krBid,
        kr_ask: krAsk,
        global_bid_usd: globalBid,
        global_ask_usd: globalAsk,
      },
    };
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    staleness_seconds: Math.max(upbitCache.stalenessSeconds, binanceCache.stalenessSeconds),
    estimated_ttl_seconds: 3,
    premiums,
    fx: {
      official_usd_krw: fx.officialUsdKrw,
      effective_usd_krw: upbit.usdtKrw,
      source: fx.source,
    },
    meta: {
      exchange_kr: "Upbit",
      exchange_global: "Binance",
      assets_tracked: ASSETS,
      calculation_method: "3-tier (official FX, effective FX via USDT/KRW, executable bid/ask)",
    },
  };
}

function round(n: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
