import { fetchJson } from "../../lib/http.js";
import { TTLCache } from "../../lib/cache.js";

// Free FX rate source — frankfurter.app (ECB data, no API key)
interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface FxData {
  officialUsdKrw: number;
  rateDate: string;
  source: string;
  fetchedAt: number;
}

async function fetchFxRate(): Promise<FxData> {
  const data = await fetchJson<FrankfurterResponse>(
    "https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW",
  );

  return {
    officialUsdKrw: data.rates.KRW ?? 0,
    rateDate: data.date,
    source: "ECB via Frankfurter (daily update)",
    fetchedAt: Date.now(),
  };
}

// FX rate updates daily — 1 hour TTL is plenty
export const fxCache = new TTLCache(fetchFxRate, 3600_000);
