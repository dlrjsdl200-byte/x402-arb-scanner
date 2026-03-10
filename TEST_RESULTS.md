# x402 Arb Scanner — 실제 USDC 결제 테스트 결과

**테스트 일시**: 2026-03-10 08:15~08:19 UTC
**결제 지갑**: `0xEC3cAf9281a1b5371F76ee3A3eAb895fdECCe31e`
**API 도메인**: `https://api.arb.chain-ops.xyz`
**결제 네트워크**: Base (eip155:8453), USDC

---

## 1. `/scan/kimchi` — $0.001 USDC ✅

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

### 관찰 사항
- 5개 자산 모두 3-tier 프리미엄 계산 완료
- 공식환율(ECB): 1485.12 / 실효환율(USDT/KRW via Upbit): 1461
- 공식환율 기준 역프리미엄(-1.0~-1.5%) — 실효환율 기준 소폭 양의 프리미엄(0.1~0.5%)
- Binance 데이터 사용 (CoinGecko fallback 미발동)
- `staleness_seconds: 0` — 즉시 fetch

---

## 2. `/scan/dex` — $0.002 USDC ✅

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

### 관찰 사항
- 1건의 기회 발견: WBTC/USD Tokpie→Bitunix 0.85% 스프레드
- `chain_id: 0` — CoinGecko가 chain_id를 제공하지 않음 (개선 필요)
- `chain` 필드에 "tokpie", "bitunix" 같은 거래소 identifier가 들어감 (chain name이 아님)
- `volume_24h_usd: 9.71` — 매우 낮은 볼륨 (실제 실행 어려움)
- `total_pairs_scanned: 3` — WETH, WBTC, USDC만 스캔
- WETH, USDC에서는 기회 미발견

---

## 3. `/scan/prediction` — $0.002 USDC ✅

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

### 관찰 사항
- **기회 0건** — 현재 Polymarket에서 임계값(>1%) 초과 미스프라이싱 없음
- 단일 마켓(Polymarket)만 스캔 — cross-market 아비트라지 불가
- 50개 이벤트 스캔했으나 모든 마켓이 효율적으로 가격 형성됨
- 빈 배열 반환 시에도 $0.002 결제됨 — 가치 제공 여부 의문

---

## 4. `/scan/all` — $0.003 USDC ✅

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

### 관찰 사항
- 3개 스캐너 모두 병렬 실행, `errors: []` — 에러 없음
- `total_opportunities: 6` — kimchi 5개(자산별) + dex 1개 = 6
- prediction은 0건이지만 정상 응답
- kimchi `staleness_seconds: 1` — 이전 캐시 재사용

---

## 종합 피드백 포인트

### 잘 동작하는 것
- x402 결제 플로우 완벽 동작 (402 → 결제 → 200)
- kimchi 3-tier 프리미엄 계산 정확
- 캐시 + dedup 작동 (staleness_seconds 확인 가능)
- unified 엔드포인트 병렬 실행 + 부분 실패 허용

### 개선 필요
1. **DEX**: `chain_id: 0`, `chain: "tokpie"` — 실제 체인 정보가 아닌 거래소 식별자가 들어감
2. **DEX**: 볼륨 $9.71 같은 초소량 거래소가 결과에 포함됨 — 최소 볼륨 필터 필요
3. **DEX**: `total_pairs_scanned: 3` — 3개 토큰만 스캔, 더 많은 페어 필요
4. **Prediction**: 결과 0건에도 $0.002 결제 — 가치 제공 전략 필요
5. **Prediction**: Polymarket 단일 소스 — cross-market 비교 불가
6. **Kimchi**: Binance bid/ask가 동일 값 (`global_bid_usd === global_ask_usd`) — 스프레드 반영 안됨
7. **공통**: `chain_id` 필드가 유용한 정보를 제공하지 않음 (전부 0)
