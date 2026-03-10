/**
 * 수동 상태 확인 — 조건 무관하게 현재 상태 전체 전송
 * GitHub Actions에서 수동 트리거(workflow_dispatch)로 실행
 */

import { scanKimchiPremium } from "../src/services/kimchi/scanner.js";
import { scanDexArbitrage } from "../src/services/dex/scanner.js";
import { scanPredictionArbitrage } from "../src/services/prediction/scanner.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

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

async function main() {
  const [kimchi, dex, prediction] = await Promise.allSettled([
    scanKimchiPremium(),
    scanDexArbitrage(),
    scanPredictionArbitrage(),
  ]);

  const lines: string[] = [];
  lines.push(`📊 *아비트라지 현황* (${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })})`);
  lines.push("");

  // 김치프리미엄
  if (kimchi.status === "fulfilled") {
    const k = kimchi.value;
    lines.push("*🇰🇷 김치프리미엄*");
    lines.push(`환율: 공식 ${k.fx.official_usd_krw} / 실효 ${k.fx.effective_usd_krw}`);
    lines.push(`소스: ${k.meta.global_price_source} | ${k.fx.rate_date}`);
    for (const [asset, data] of Object.entries(k.premiums)) {
      const o = data.official_fx.premium_pct;
      const e = data.effective_fx.premium_pct;
      lines.push(`  ${asset}: 공식 ${o > 0 ? "+" : ""}${o}% / 실효 ${e > 0 ? "+" : ""}${e}%`);
    }
  } else {
    lines.push("*🇰🇷 김치프리미엄* ❌ 실패");
  }

  lines.push("");

  // DEX
  if (dex.status === "fulfilled") {
    const d = dex.value;
    lines.push(`*💱 DEX 아비트라지* (${d.opportunities.length}건)`);
    if (d.opportunities.length === 0) {
      lines.push("  기회 없음");
    } else {
      for (const opp of d.opportunities.slice(0, 5)) {
        lines.push(`  ${opp.pair}: ${opp.spread_pct}% (${opp.buy.dex}→${opp.sell.dex})`);
      }
    }
  } else {
    lines.push("*💱 DEX 아비트라지* ❌ 실패");
  }

  lines.push("");

  // 예측시장
  if (prediction.status === "fulfilled") {
    const p = prediction.value;
    lines.push(`*🎯 예측시장* (${p.opportunities.length}건 / ${p.total_events_scanned}개 스캔)`);
    if (p.opportunities.length === 0) {
      lines.push("  기회 없음 — 시장 효율적");
    } else {
      for (const opp of p.opportunities.slice(0, 5)) {
        lines.push(`  ${opp.event}: ${opp.spread_pct}%`);
      }
    }
  } else {
    lines.push("*🎯 예측시장* ❌ 실패");
  }

  const message = lines.join("\n");
  console.log(message);
  await sendTelegram(message);
}

main().catch(console.error);
