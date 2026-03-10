import { scanKimchiPremium } from "../kimchi/scanner.js";
import { scanDexArbitrage } from "../dex/scanner.js";
import { scanPredictionArbitrage } from "../prediction/scanner.js";
import type { UnifiedScanResult } from "../../types/index.js";

export async function scanAll(): Promise<UnifiedScanResult> {
  const errors: string[] = [];

  const [kimchi, dex, prediction] = await Promise.allSettled([
    scanKimchiPremium(),
    scanDexArbitrage(),
    scanPredictionArbitrage(),
  ]);

  const kimchiResult = kimchi.status === "fulfilled" ? kimchi.value : null;
  const dexResult = dex.status === "fulfilled" ? dex.value : null;
  const predictionResult = prediction.status === "fulfilled" ? prediction.value : null;

  if (kimchi.status === "rejected") errors.push(`kimchi: ${kimchi.reason}`);
  if (dex.status === "rejected") errors.push(`dex: ${dex.reason}`);
  if (prediction.status === "rejected") errors.push(`prediction: ${prediction.reason}`);

  const totalOpportunities =
    (dexResult?.opportunities.length ?? 0) +
    (predictionResult?.opportunities.length ?? 0) +
    Object.keys(kimchiResult?.premiums ?? {}).length;

  return {
    success: true,
    timestamp: new Date().toISOString(),
    kimchi: kimchiResult
      ? { premiums: kimchiResult.premiums, staleness_seconds: kimchiResult.staleness_seconds }
      : null,
    dex: dexResult
      ? { opportunities: dexResult.opportunities, staleness_seconds: dexResult.staleness_seconds }
      : null,
    prediction: predictionResult
      ? { opportunities: predictionResult.opportunities, staleness_seconds: predictionResult.staleness_seconds }
      : null,
    total_opportunities: totalOpportunities,
    errors,
  };
}
