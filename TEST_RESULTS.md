# x402 Arb Scanner — 실제 USDC 결제 테스트 결과

**결제 지갑**: `0xEC3cAf9281a1b5371F76ee3A3eAb895fdECCe31e`
**API 도메인**: `https://api.arb.chain-ops.xyz`
**결제 네트워크**: Base (eip155:8453), USDC

---

## v1.0 테스트 (2026-03-10 08:15~08:19 UTC)

### 1. `/scan/kimchi` — $0.001 USDC ✅

```json
{
  "success": true,
  "timestamp": "2026-03-10T08:15:09.184Z",
  "staleness_seconds": 0,
  "estimated_ttl_seconds": 3,
  "premiums": {
    "BTC": {
      "official_fx": {
        "premium_pct": -1.4292,
        "krw_price": 103635000,
        "global_usd": 70794,
        "global_krw_equivalent": 105137585.28
      },
      "effective_fx": {
        "premium_pct": 0.1982,
        "usdt_krw": 1461
      },
      "executable": {
        "bid_premium_pct": -1.4292,
        "ask_premium_pct": -1.4273,
        "kr_bid": 103635000,
        "kr_ask": 103637000,
        "global_bid_usd": 70794,
        "global_ask_usd": 70794
      }
    },
    "ETH": {
      "official_fx": {
        "premium_pct": -1.4859,
        "krw_price": 3012000,
        "global_usd": 2058.71,
        "global_krw_equivalent": 3057431.3952
      },
      "effective_fx": {
        "premium_pct": 0.1405,
        "usdt_krw": 1461
      },
      "executable": {
        "bid_premium_pct": -1.4859,
        "ask_premium_pct": -1.4532,
        "kr_bid": 3012000,
        "kr_ask": 3013000,
        "global_bid_usd": 2058.71,
        "global_ask_usd": 2058.71
      }
    },
    "XRP": {
      "official_fx": {
        "premium_pct": -1.3233,
        "krw_price": 2037,
        "global_usd": 1.39,
        "global_krw_equivalent": 2064.3168
      },
      "effective_fx": {
        "premium_pct": 0.3058,
        "usdt_krw": 1461
      },
      "executable": {
        "bid_premium_pct": -1.3233,
        "ask_premium_pct": -1.2748,
        "kr_bid": 2037,
        "kr_ask": 2038,
        "global_bid_usd": 1.39,
        "global_ask_usd": 1.39
      }
    },
    "SOL": {
      "official_fx": {
        "premium_pct": -1.454,
        "krw_price": 127400,
        "global_usd": 87.05,
        "global_krw_equivalent": 129279.696
      },
      "effective_fx": {
        "premium_pct": 0.1729,
        "usdt_krw": 1461
      },
      "executable": {
        "bid_premium_pct": -1.5313,
        "ask_premium_pct": -1.454,
        "kr_bid": 127300,
        "kr_ask": 127400,
        "global_bid_usd": 87.05,
        "global_ask_usd": 87.05
      }
    },
    "DOGE": {
      "official_fx": {
        "premium_pct": -1.0929,
        "krw_price": 136,
        "global_usd": 0.092587,
        "global_krw_equivalent": 137.5028
      },
      "effective_fx": {
        "premium_pct": 0.54,
        "usdt_krw": 1461
      },
      "executable": {
        "bid_premium_pct": -1.8202,
        "ask_premium_pct": -1.0929,
        "kr_bid": 135,
        "kr_ask": 136,
        "global_bid_usd": 0.092587,
        "global_ask_usd": 0.092587
      }
    }
  },
  "fx": {
    "official_usd_krw": 1485.12,
    "effective_usd_krw": 1461,
    "source": "ECB via Frankfurter"
  },
  "meta": {
    "exchange_kr": "Upbit",
    "exchange_global": "Binance",
    "assets_tracked": ["BTC", "ETH", "XRP", "SOL", "DOGE"],
    "calculation_method": "3-tier (official FX, effective FX via USDT/KRW, executable bid/ask)"
  }
}
```

#### 관찰 사항
- 5개 자산 모두 3-tier 프리미엄 계산 완료
- 공식환율(ECB): 1485.12 / 실효환율(USDT/KRW via Upbit): 1461
- 공식환율 기준 역프리미엄(-1.0~-1.5%) — 실효환율 기준 소폭 양의 프리미엄(0.1~0.5%)
- Binance 데이터 사용 (CoinGecko fallback 미발동)
- `staleness_seconds: 0` — 즉시 fetch

---

### 2. `/scan/dex` — $0.002 USDC ✅

```json
{
  "success": true,
  "timestamp": "2026-03-10T08:16:34.994Z",
  "staleness_seconds": 0,
  "estimated_ttl_seconds": 15,
  "opportunities": [
    {
      "pair": "WBTC/USD",
      "buy": {
        "dex": "Tokpie",
        "chain": "tokpie",
        "chain_id": 0,
        "price": 70142
      },
      "sell": {
        "dex": "Bitunix",
        "chain": "bitunix",
        "chain_id": 0,
        "price": 70740
      },
      "spread_pct": 0.8526,
      "estimated_profit_usdc": 598,
      "volume_24h_usd": 9.7179565442,
      "confidence": "medium"
    }
  ],
  "total_pairs_scanned": 3,
  "min_spread_pct": 0,
  "meta": {
    "dexes_scanned": ["Multiple via CoinGecko aggregation"],
    "chains_scanned": ["Ethereum", "Optimism", "BNB Chain", "Polygon", "Base", "Arbitrum"],
    "data_source": "CoinGecko Tickers API (free, no key)"
  }
}
```

#### 관찰 사항
- 1건의 기회 발견: WBTC/USD Tokpie→Bitunix 0.85% 스프레드
- `chain_id: 0` — CoinGecko가 chain_id를 제공하지 않음 (개선 필요)
- `chain` 필드에 "tokpie", "bitunix" 같은 거래소 identifier가 들어감 (chain name이 아님)
- `volume_24h_usd: 9.71` — 매우 낮은 볼륨 (실제 실행 어려움)
- `total_pairs_scanned: 3` — WETH, WBTC, USDC만 스캔
- WETH, USDC에서는 기회 미발견

---

### 3. `/scan/prediction` — $0.002 USDC ✅

```json
{
  "success": true,
  "timestamp": "2026-03-10T08:18:44.627Z",
  "staleness_seconds": 0,
  "estimated_ttl_seconds": 30,
  "opportunities": [],
  "total_events_scanned": 50,
  "meta": {
    "markets_scanned": ["Polymarket"],
    "data_source": "Polymarket Gamma API (free, no key)"
  }
}
```

#### 관찰 사항
- **기회 0건** — 현재 Polymarket에서 임계값(>1%) 초과 미스프라이싱 없음
- 단일 마켓(Polymarket)만 스캔 — cross-market 아비트라지 불가
- 50개 이벤트 스캔했으나 모든 마켓이 효율적으로 가격 형성됨
- 빈 배열 반환 시에도 $0.002 결제됨 — 가치 제공 여부 의문

---

### 4. `/scan/all` — $0.003 USDC ✅

```json
{
  "success": true,
  "timestamp": "2026-03-10T08:19:33.853Z",
  "kimchi": {
    "premiums": {
      "BTC": {
        "official_fx": { "premium_pct": -1.4532, "krw_price": 103557000, "global_usd": 70758, "global_krw_equivalent": 105084120.96 },
        "effective_fx": { "premium_pct": 0.1052, "usdt_krw": 1462 },
        "executable": { "bid_premium_pct": -1.4532, "ask_premium_pct": -1.4466, "kr_bid": 103557000, "kr_ask": 103564000, "global_bid_usd": 70758, "global_ask_usd": 70758 }
      },
      "ETH": {
        "official_fx": { "premium_pct": -1.3393, "krw_price": 3016000, "global_usd": 2058.38, "global_krw_equivalent": 3056941.3056 },
        "effective_fx": { "premium_pct": 0.2209, "usdt_krw": 1462 },
        "executable": { "bid_premium_pct": -1.372, "ask_premium_pct": -1.3393, "kr_bid": 3015000, "kr_ask": 3016000, "global_bid_usd": 2058.38, "global_ask_usd": 2058.38 }
      },
      "XRP": {
        "official_fx": { "premium_pct": -1.2264, "krw_price": 2039, "global_usd": 1.39, "global_krw_equivalent": 2064.3168 },
        "effective_fx": { "premium_pct": 0.3356, "usdt_krw": 1462 },
        "executable": { "bid_premium_pct": -1.2264, "ask_premium_pct": -1.178, "kr_bid": 2039, "kr_ask": 2040, "global_bid_usd": 1.39, "global_ask_usd": 1.39 }
      },
      "SOL": {
        "official_fx": { "premium_pct": -1.386, "krw_price": 127400, "global_usd": 86.99, "global_krw_equivalent": 129190.5888 },
        "effective_fx": { "premium_pct": 0.1735, "usdt_krw": 1462 },
        "executable": { "bid_premium_pct": -1.4634, "ask_premium_pct": -1.386, "kr_bid": 127300, "kr_ask": 127400, "global_bid_usd": 86.99, "global_ask_usd": 86.99 }
      },
      "DOGE": {
        "official_fx": { "premium_pct": -1.9282, "krw_price": 135, "global_usd": 0.092689, "global_krw_equivalent": 137.6543 },
        "effective_fx": { "premium_pct": -0.3773, "usdt_krw": 1462 },
        "executable": { "bid_premium_pct": -1.9282, "ask_premium_pct": -1.2018, "kr_bid": 135, "kr_ask": 136, "global_bid_usd": 0.092689, "global_ask_usd": 0.092689 }
      }
    },
    "staleness_seconds": 1
  },
  "dex": {
    "opportunities": [
      {
        "pair": "WBTC/USD",
        "buy": { "dex": "Tokpie", "chain": "tokpie", "chain_id": 0, "price": 70156 },
        "sell": { "dex": "Bybit", "chain": "bybit_spot", "chain_id": 0, "price": 70742 },
        "spread_pct": 0.8353,
        "estimated_profit_usdc": 586,
        "volume_24h_usd": 9.7199519786,
        "confidence": "medium"
      }
    ],
    "staleness_seconds": 0
  },
  "prediction": {
    "opportunities": [],
    "staleness_seconds": 0
  },
  "total_opportunities": 6,
  "errors": []
}
```

#### 관찰 사항
- 3개 스캐너 모두 병렬 실행, `errors: []` — 에러 없음
- `total_opportunities: 6` — kimchi 5개(자산별) + dex 1개 = 6
- prediction은 0건이지만 정상 응답
- kimchi `staleness_seconds: 1` — 이전 캐시 재사용

---

### v1.0 종합 피드백 포인트

#### 잘 동작하는 것
- x402 결제 플로우 완벽 동작 (402 → 결제 → 200)
- kimchi 3-tier 프리미엄 계산 정확
- 캐시 + dedup 작동 (staleness_seconds 확인 가능)
- unified 엔드포인트 병렬 실행 + 부분 실패 허용

#### 개선 필요
1. **DEX**: `chain_id: 0`, `chain: "tokpie"` — 실제 체인 정보가 아닌 거래소 식별자가 들어감
2. **DEX**: 볼륨 $9.71 같은 초소량 거래소가 결과에 포함됨 — 최소 볼륨 필터 필요
3. **DEX**: `total_pairs_scanned: 3` — 3개 토큰만 스캔, 더 많은 페어 필요
4. **Prediction**: 결과 0건에도 $0.002 결제 — 가치 제공 전략 필요
5. **Prediction**: Polymarket 단일 소스 — cross-market 비교 불가
6. **Kimchi**: Binance bid/ask가 동일 값 (`global_bid_usd === global_ask_usd`) — 스프레드 반영 안됨
7. **공통**: `chain_id` 필드가 유용한 정보를 제공하지 않음 (전부 0)

---
---

## v1.1 테스트 (2026-03-10 09:24~09:25 UTC)

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
  "kimchi": {
    "premiums": {
      "BTC": {
        "official_fx": { "premium_pct": -1.5728, "krw_price": 104000000, "global_usd": 71147, "global_krw_equivalent": 105661832.64 },
        "effective_fx": { "premium_pct": -0.0846, "usdt_krw": 1463 },
        "executable": { "bid_premium_pct": -1.5887, "ask_premium_pct": -1.5716, "kr_bid": 103977000, "kr_ask": 103995000, "global_bid_usd": 71142.7, "global_ask_usd": 71142.8 }
      },
      "ETH": {
        "official_fx": { "premium_pct": -1.5479, "krw_price": 3026000, "global_usd": 2069.58, "global_krw_equivalent": 3073574.6496 },
        "effective_fx": { "premium_pct": -0.0593, "usdt_krw": 1463 },
        "executable": { "bid_premium_pct": -1.5799, "ask_premium_pct": -1.4939, "kr_bid": 3025000, "kr_ask": 3027000, "global_bid_usd": 2069.13, "global_ask_usd": 2069.57 }
      },
      "XRP": {
        "official_fx": { "premium_pct": -1.6061, "krw_price": 2068, "global_usd": 1.41521, "global_krw_equivalent": 2101.7567 },
        "effective_fx": { "premium_pct": -0.1184, "usdt_krw": 1463 },
        "executable": { "bid_premium_pct": -1.5932, "ask_premium_pct": -1.5358, "kr_bid": 2067, "kr_ask": 2068, "global_bid_usd": 1.4142, "global_ask_usd": 1.41434 }
      },
      "SOL": {
        "official_fx": { "premium_pct": -1.6833, "krw_price": 127600, "global_usd": 87.39, "global_krw_equivalent": 129784.6368 },
        "effective_fx": { "premium_pct": -0.1968, "usdt_krw": 1463 },
        "executable": { "bid_premium_pct": -1.6383, "ask_premium_pct": -1.4728, "kr_bid": 127600, "kr_ask": 127800, "global_bid_usd": 87.34, "global_ask_usd": 87.35 }
      },
      "DOGE": {
        "official_fx": { "premium_pct": -1.8052, "krw_price": 138, "global_usd": 0.09463, "global_krw_equivalent": 140.5369 },
        "effective_fx": { "premium_pct": -0.3205, "usdt_krw": 1463 },
        "executable": { "bid_premium_pct": -1.7345, "ask_premium_pct": -0.9955, "kr_bid": 138, "kr_ask": 139, "global_bid_usd": 0.0945362, "global_ask_usd": 0.094562 }
      }
    },
    "staleness_seconds": 0
  },
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

### v1.0 → v1.1 비교 요약

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
