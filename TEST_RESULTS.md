# x402 Arb Scanner — 실제 USDC 결제 테스트 결과

## v1.0 테스트 (2026-03-10 08:15~08:19 UTC)

**결제 지갑**: `0xEC3cAf9281a1b5371F76ee3A3eAb895fdECCe31e`
**API 도메인**: `https://api.arb.chain-ops.xyz`
**결제 네트워크**: Base (eip155:8453), USDC

### 주요 발견사항
- DEX 스캐너가 CoinGecko를 사용하여 CEX 데이터(Tokpie, Bybit)가 포함됨
- chain_id가 전부 0, chain 필드에 거래소 이름이 들어감
- Binance bid/ask 동일값 (스프레드 미반영)
- Prediction 결과 0건에도 결제됨

→ **v1.1에서 수정 완료**

---

## v1.1 테스트 (2026-03-10 09:24~09:25 UTC)

**결제 지갑**: `0xEC3cAf9281a1b5371F76ee3A3eAb895fdECCe31e`
**API 도메인**: `https://api.arb.chain-ops.xyz`
**결제 네트워크**: Base (eip155:8453), USDC

### v1.1 변경사항
1. DEX 스캐너를 CoinGecko → DexScreener로 교체 (DEX-only)
2. Kraken 폴백 추가 (Binance → Kraken → CoinGecko)
3. `request_cost_usdc` 모든 응답에 추가
4. `data_degraded` 플래그 (CoinGecko 사용 시만)
5. FX `rate_date`, `global_price_source` 메타 추가
6. Prediction 임계값 하향 + `notice`, `threshold` 필드 추가

---

### 1. `/scan/kimchi` — $0.001 USDC ✅

```json
{
  "success": true,
  "timestamp": "2026-03-10T09:24:47.596Z",
  "staleness_seconds": 0,
  "estimated_ttl_seconds": 3,
  "premiums": {
    "BTC": {
      "official_fx": { "premium_pct": -1.5901, "krw_price": 103976000, "global_usd": 71143.1, "global_krw_equivalent": 105656040.672 },
      "effective_fx": { "premium_pct": -0.0339, "usdt_krw": 1462 },
      "executable": { "bid_premium_pct": -1.5992, "ask_premium_pct": -1.5862, "kr_bid": 103976000, "kr_ask": 103980000, "global_bid_usd": 71143, "global_ask_usd": 71149.7 }
    },
    "ETH": {
      "official_fx": { "premium_pct": -1.5625, "krw_price": 3024000, "global_usd": 2068.52, "global_krw_equivalent": 3072000.4224 },
      "effective_fx": { "premium_pct": -0.0058, "usdt_krw": 1462 },
      "executable": { "bid_premium_pct": -1.5854, "ask_premium_pct": -1.5438, "kr_bid": 3024000, "kr_ask": 3025000, "global_bid_usd": 2068.81, "global_ask_usd": 2069 }
    },
    "XRP": {
      "official_fx": { "premium_pct": -1.6658, "krw_price": 2064, "global_usd": 1.41333, "global_krw_equivalent": 2098.9646 },
      "effective_fx": { "premium_pct": -0.1108, "usdt_krw": 1462 },
      "executable": { "bid_premium_pct": -1.6818, "ask_premium_pct": -1.5858, "kr_bid": 2064, "kr_ask": 2066, "global_bid_usd": 1.41355, "global_ask_usd": 1.41356 }
    },
    "SOL": {
      "official_fx": { "premium_pct": -1.5819, "krw_price": 127600, "global_usd": 87.3, "global_krw_equivalent": 129650.976 },
      "effective_fx": { "premium_pct": -0.0255, "usdt_krw": 1462 },
      "executable": { "bid_premium_pct": -1.5932, "ask_premium_pct": -1.5048, "kr_bid": 127600, "kr_ask": 127700, "global_bid_usd": 87.3, "global_ask_usd": 87.31 }
    },
    "DOGE": {
      "official_fx": { "premium_pct": -2.2134, "krw_price": 137, "global_usd": 0.0943365, "global_krw_equivalent": 140.101 },
      "effective_fx": { "premium_pct": -0.667, "usdt_krw": 1462 },
      "executable": { "bid_premium_pct": -2.2745, "ask_premium_pct": -1.5151, "kr_bid": 137, "kr_ask": 138, "global_bid_usd": 0.0943513, "global_ask_usd": 0.0943955 }
    }
  },
  "fx": {
    "official_usd_krw": 1485.12,
    "effective_usd_krw": 1462,
    "source": "ECB via Frankfurter (daily update)",
    "rate_date": "2026-03-09"
  },
  "meta": {
    "exchange_kr": "Upbit",
    "exchange_global": "Multiple",
    "global_price_source": "Kraken",
    "assets_tracked": ["BTC", "ETH", "XRP", "SOL", "DOGE"],
    "calculation_method": "3-tier (official FX, effective FX via USDT/KRW, executable bid/ask)"
  },
  "request_cost_usdc": 0.001
}
```

#### v1.1 개선 확인
- ✅ `global_price_source: "Kraken"` — 폴백 동작 (Binance 451 → Kraken)
- ✅ `rate_date: "2026-03-09"` — FX 날짜 표시
- ✅ `request_cost_usdc: 0.001` — 비용 투명성
- ✅ `global_bid_usd ≠ global_ask_usd` — Kraken이 실제 bid/ask 제공 (v1에서는 동일값이었음)
- ✅ `data_degraded` 미표시 — Kraken은 실제 호가 데이터 제공하므로 정상

---

### 2. `/scan/dex` — $0.002 USDC ✅

```json
{
  "success": true,
  "timestamp": "2026-03-10T09:25:00.088Z",
  "staleness_seconds": 0,
  "estimated_ttl_seconds": 15,
  "opportunities": [],
  "total_pairs_scanned": 2,
  "min_spread_pct": 0,
  "meta": {
    "dexes_scanned": ["None matched filters"],
    "chains_scanned": ["Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "BNB Chain", "Avalanche"],
    "data_source": "DexScreener API (free, DEX-only, no key)"
  },
  "request_cost_usdc": 0.002
}
```

#### v1.1 개선 확인
- ✅ `data_source: "DexScreener API"` — CoinGecko에서 교체 완료
- ✅ CEX 데이터(Tokpie, Bybit) 제거됨
- ✅ chain_id 0 문제 해결 (기회 없어서 표시 안 됨, 구조적으로 수정됨)
- ⚠️ 기회 0건 — DEX 간 가격 차이가 0.05% 미만 (시장 효율적)
- ⚠️ `total_pairs_scanned: 2` — WETH, WBTC만 스캔 (토큰 추가 고려)

---

### 3. `/scan/prediction` — $0.002 USDC ✅

```json
{
  "success": true,
  "timestamp": "2026-03-10T09:25:05.699Z",
  "staleness_seconds": 0,
  "estimated_ttl_seconds": 30,
  "opportunities": [],
  "total_events_scanned": 50,
  "notice": "No opportunities found above threshold. Market is currently efficient.",
  "threshold": { "single_market_pct": 0.5, "multi_market_pct": 1 },
  "meta": {
    "markets_scanned": ["Polymarket"],
    "data_source": "Polymarket Gamma API (free, no key)"
  },
  "request_cost_usdc": 0.002
}
```

#### v1.1 개선 확인
- ✅ `notice` 필드 추가 — 기회 없을 때 설명 제공
- ✅ `threshold` 필드 — 사용된 임계값 투명 공개
- ✅ `total_events_scanned: 50` — 동적 계산 (v1에서는 하드코딩)
- ✅ `request_cost_usdc: 0.002` — 비용 투명성
- ⚠️ 여전히 Polymarket 단일 소스

---

### 4. `/scan/all` — $0.003 USDC ✅

```json
{
  "success": true,
  "timestamp": "2026-03-10T09:25:14.486Z",
  "kimchi": { "premiums": { "BTC": { ... }, "ETH": { ... }, "XRP": { ... }, "SOL": { ... }, "DOGE": { ... } }, "staleness_seconds": 0 },
  "dex": { "opportunities": [], "staleness_seconds": 14 },
  "prediction": { "opportunities": [], "staleness_seconds": 8 },
  "total_opportunities": 5,
  "errors": [],
  "request_cost_usdc": 0.003
}
```

#### v1.1 개선 확인
- ✅ 3개 스캐너 병렬 실행, `errors: []`
- ✅ `request_cost_usdc: 0.003`
- ✅ `total_opportunities: 5` — kimchi 5개 자산 (DEX/prediction 0건)
- ✅ 캐시 재사용 확인: dex `staleness_seconds: 14`, prediction `staleness_seconds: 8`

---

## v1.0 → v1.1 비교 요약

| 항목 | v1.0 | v1.1 |
|------|------|------|
| 글로벌 가격 소스 | Binance (또는 CoinGecko) | Binance → Kraken → CoinGecko |
| DEX 데이터 소스 | CoinGecko (CEX 포함) | DexScreener (DEX-only) |
| bid/ask 정확도 | 동일값 (스프레드 0) | 실제 bid/ask (Kraken) |
| 비용 투명성 | 없음 | `request_cost_usdc` 포함 |
| FX 날짜 | 없음 | `rate_date` 포함 |
| 데이터 품질 표시 | 없음 | `data_degraded` (CoinGecko시) |
| Prediction 투명성 | 빈 배열만 | `notice` + `threshold` |
| 이벤트 수 | 하드코딩 50 | 동적 계산 |
