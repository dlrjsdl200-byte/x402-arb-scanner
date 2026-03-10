/**
 * 개인용 아비트라지 알림 봇
 * GitHub Actions cron으로 주기적 실행
 * 스캐너 로직 직접 호출 → 조건 충족 시 텔레그램 전송
 */

import { scanKimchiPremium } from "../src/services/kimchi/scanner.js";
import { scanDexArbitrage } from "../src/services/dex/scanner.js";
import { scanPredictionArbitrage } from "../src/services/prediction/scanner.js";

// ── 설정 ──

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

// 알림 임계값
const THRESHOLDS = {
  kimchi_official_pct: 3.0,   // 공식환율 기준 프리미엄 ±3% 이상
  kimchi_effective_pct: 2.0,  // 실효환율 기준 프리미엄 ±2% 이상
  dex_spread_pct: 0.3,       // DEX 스프레드 0.3% 이상
  prediction_spread_pct: 0.5, // 예측시장 스프레드 0.5% 이상
};

// ── 텔레그램 전송 ──

async function sendTelegram(message: string): Promise<void> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Telegram error: ${res.status} ${err}`);
  }
}

// ── 스캔 & 알림 ──

async function checkKimchi(): Promise<string[]> {
  const alerts: string[] = [];

  try {
    const result = await scanKimchiPremium();

    for (const [asset, data] of Object.entries(result.premiums)) {
      const official = data.official_fx.premium_pct;
      const effective = data.effective_fx.premium_pct;

      if (Math.abs(official) >= THRESHOLDS.kimchi_official_pct) {
        const direction = official > 0 ? "📈" : "📉";
        alerts.push(
          `${direction} *${asset} 김치프리미엄* ${official > 0 ? "+" : ""}${official}%\n` +
          `  KRW: ₩${data.official_fx.krw_price.toLocaleString()}\n` +
          `  Global: $${data.official_fx.global_usd.toLocaleString()}\n` +
          `  환율: ${result.fx.official_usd_krw} (ECB, ${result.fx.rate_date})`
        );
      }

      if (Math.abs(effective) >= THRESHOLDS.kimchi_effective_pct) {
        const direction = effective > 0 ? "📈" : "📉";
        alerts.push(
          `${direction} *${asset} 실효프리미엄 (Upbit USDT/KRW)* ${effective > 0 ? "+" : ""}${effective}%\n` +
          `  USDT/KRW: ${data.effective_fx.usdt_krw}`
        );
      }
    }

    // 소스 정보 추가
    if (alerts.length > 0) {
      alerts.push(`\n_소스: ${result.meta.global_price_source} | ${result.fx.source}_`);
    }
  } catch (err) {
    console.error("Kimchi scan failed:", err);
  }

  return alerts;
}

async function checkDex(): Promise<string[]> {
  const alerts: string[] = [];

  try {
    const result = await scanDexArbitrage();

    for (const opp of result.opportunities) {
      if (opp.spread_pct >= THRESHOLDS.dex_spread_pct) {
        alerts.push(
          `💱 *DEX 아비트라지: ${opp.pair}*\n` +
          `  Buy: ${opp.buy.dex} (${opp.buy.chain}) $${opp.buy.price}\n` +
          `  Sell: ${opp.sell.dex} (${opp.sell.chain}) $${opp.sell.price}\n` +
          `  스프레드: ${opp.spread_pct}% | 예상수익: $${opp.estimated_profit_per_unit_usd}/unit\n` +
          `  볼륨: $${opp.executable_volume_usd.toLocaleString()} | 신뢰도: ${opp.confidence}`
        );
      }
    }
  } catch (err) {
    console.error("DEX scan failed:", err);
  }

  return alerts;
}

async function checkPrediction(): Promise<string[]> {
  const alerts: string[] = [];

  try {
    const result = await scanPredictionArbitrage();

    for (const opp of result.opportunities) {
      if (opp.spread_pct >= THRESHOLDS.prediction_spread_pct) {
        alerts.push(
          `🎯 *예측시장: ${opp.event}*\n` +
          `  ${opp.outcome} | 타입: ${opp.type}\n` +
          `  스프레드: ${opp.spread_pct}% | 확률합: ${opp.implied_probability_sum}\n` +
          `  카테고리: ${opp.category}`
        );
      }
    }
  } catch (err) {
    console.error("Prediction scan failed:", err);
  }

  return alerts;
}

// ── 메인 ──

async function main() {
  console.log(`[${new Date().toISOString()}] 스캔 시작...`);

  const [kimchiAlerts, dexAlerts, predictionAlerts] = await Promise.all([
    checkKimchi(),
    checkDex(),
    checkPrediction(),
  ]);

  const allAlerts = [...kimchiAlerts, ...dexAlerts, ...predictionAlerts];

  if (allAlerts.length === 0) {
    console.log("알림 없음 — 모든 지표 정상 범위");
    return;
  }

  const header = `🚨 *아비트라지 알림* (${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })})\n\n`;
  const message = header + allAlerts.join("\n\n");

  console.log(`알림 ${allAlerts.length}건 발송`);
  await sendTelegram(message);
}

main().catch(console.error);
