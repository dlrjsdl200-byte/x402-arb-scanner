# Arbitrage Opportunity Scanner - Research Document

> x402 기반 아비트라지 기회 스캐너 API 구축을 위한 종합 리서치
> 작성일: 2026-03-10

---

## 목차

1. [엔드포인트 1: DEX Arbitrage](#1-dex-arbitrage)
2. [엔드포인트 2: Prediction Market Arbitrage](#2-prediction-market-arbitrage)
3. [엔드포인트 3: Kimchi Premium (김치프리미엄)](#3-kimchi-premium-김치프리미엄)
4. [x402 프로토콜 생태계 현황](#4-x402-프로토콜-생태계-현황)
5. [경쟁사 및 벤치마킹](#5-경쟁사-및-벤치마킹)
6. [시장 갭 분석 및 차별화 전략](#6-시장-갭-분석-및-차별화-전략)

---

## 1. DEX Arbitrage

### 1.1 아비트라지 유형

| 유형 | 설명 | 최소 수익 기준 |
|------|------|---------------|
| **Cross-DEX** | 동일 토큰의 DEX 간 가격 차이 (Uniswap ↔ SushiSwap ↔ Curve) | 0.3-0.5% after fees |
| **DEX ↔ CEX** | 온체인 DEX vs 중앙화 거래소 가격 차이 | 0.5%+ (가스비 고려) |
| **Triangular** | 단일 DEX 내 3개 토큰 순환 (USDC→ETH→LINK→USDC) | 0.3%+ |
| **Cross-Chain** | 체인 간 동일 토큰 가격 차이 (Ethereum vs Arbitrum vs BSC) | 0.3-0.5% (브릿지 비용 포함) |

### 1.2 데이터 소스 및 API

#### The Graph (Subgraphs) - 온체인 DEX 데이터

```
Base URL: https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/<SUBGRAPH_ID>
```

| DEX | Subgraph | 비고 |
|-----|----------|------|
| Uniswap V3 (ETH) | `5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV` | 공식 |
| SushiSwap | `github.com/croco-finance/sushiswap-subgraph` | 커뮤니티 |
| PancakeSwap | `developer.pancakeswap.finance/apis/subgraph` | V2/V3/StableSwap |
| Balancer | `docs.balancer.fi/data-and-analytics/` | 공식 |
| Curve | `github.com/protofire/curve-subgraph` | 커뮤니티 |

- **무료**: 100,000 쿼리/월
- **유료**: GRT 토큰으로 결제, 쿼리당 비용 매우 저렴
- **한계**: 5-30초 지연 → 실시간 실행이 아닌 스캐닝 용도에 적합

#### DEX Aggregator APIs - 최적 가격 라우팅

| 서비스 | 특징 | 체인 |
|--------|------|------|
| **1inch** (`api.1inch.dev`) | 150+ 유동성 소스, Fusion 모드 | ETH, BSC, Polygon, Arbitrum+ |
| **0x** (`0x.org`) | 150+ 소스, 72% 최적가 제공 | 16+ 체인 |
| **ParaSwap** | Augustus 라우터, 개발자 수수료 부과 가능 | ETH, BSC, Polygon+ |
| **Jupiter** (`dev.jup.ag`) | Solana 지배적 애그리게이터 | Solana |
| **DexPaprika** | 29+ 체인, 15M+ 토큰, **완전 무료** | 멀티체인 |

#### 가격 피드 소스

| 소스 | 가격 | 레이턴시 | Rate Limit |
|------|------|----------|------------|
| CoinGecko | 무료~$129+/월 | 20초-5분 캐시 | 30/분 (무료) |
| DeFi Llama | 무료+Pro | 중간 | 관대함 |
| CryptoCompare | 무료~$200/월 | 실시간 WebSocket | 100K/월 (무료) |
| Binance WebSocket | 무료 | ~100ms | Rate limit 없음 |

#### 실시간 접근 방식

| 접근법 | 레이턴시 | 용도 |
|--------|----------|------|
| WebSocket (RPC 노드) | ~100-500ms | 멤풀 모니터링, 블록 레벨 |
| Direct contract call (eth_call) | ~200-1000ms | 스왑 출력 시뮬레이션 |
| The Graph subgraph | 5-30초 | 풀 탐색, 히스토리 |
| CoinGecko / DeFi Llama | 20초-5분 | 광범위 시장 스캔 |
| 거래소 WebSocket | ~50-100ms | CEX-DEX 비교 |

### 1.3 핵심 산출 메트릭

```
# 가격 스프레드
spread_pct = ((price_high - price_low) / price_low) * 100

# 슬리피지 (Uniswap V2 AMM)
output = (reserve_out * amount_in * (1 - fee)) / (reserve_in + amount_in * (1 - fee))
price_impact = 1 - (output / (amount_in * (reserve_out / reserve_in)))

# 순이익
total_cost = gas_cost_usd + dex_fee_1 + dex_fee_2 + bridge_fee + slippage_cost
net_profit = gross_spread_usd - total_cost
```

- DEX 스왑 수수료: 0.01% (스테이블코인), 0.05%, 0.3%, 1% (풀 티어별)
- 가스비: `eth_gasPrice` / `eth_feeHistory`로 추정 (단일 스왑 ~150K-300K gas)

### 1.4 기술적 고려사항

- **MEV**: 2025년 MEV 관련 손실 $1.2B 초과. Solana 블록스페이스의 40% 점유
- **프론트러닝 방지**: Flashbots Protect (`rpc.flashbots.net`) - 프라이빗 멤풀, 90% MEV 환불
- **플래시론**: Aave V3 (0.05% 수수료, $7B+ TVL) - 무자본 아비트라지 가능
- **스캐너 API 관점**: 실행 봇이 아닌 정보 제공이므로 10-30초 갱신 주기면 충분

---

## 2. Prediction Market Arbitrage

### 2.1 주요 예측시장 플랫폼

| 플랫폼 | 유형 | 체인/방식 | 수수료 | API |
|--------|------|-----------|--------|-----|
| **Polymarket** (글로벌) | CLOB | Polygon (USDC) | 0% (2025년까지) | REST + WebSocket |
| **Polymarket US** | CLOB | 규제 DCM | Taker 0.10%, Maker -0.10% | REST + WebSocket |
| **Kalshi** | CLOB | 중앙화, CFTC 규제 | ~1.2% 평균 | REST + WebSocket + FIX |
| **Manifold** | AMM | 플레이머니 | N/A | REST (500/분) |
| **PredictIt** | CLOB | 중앙화 | 10% 수익 + 5% 출금 | 읽기전용 (1/분) |
| **Augur** | AMM | Ethereum | 변동 | 온체인 |
| **Azuro** | vAMM | EVM 멀티체인 | 변동 | SDK + WebSocket |

#### 신규 진입자 (2025-2026)
- **Robinhood**: 가장 빠른 성장 (~$300M ARR). MIAXdx 인수 (2026.1)
- **Coinbase**: Kalshi 기반 예측시장 (2025.12 론칭)
- **DraftKings, FanDuel**: CME 파트너십으로 진출

### 2.2 아비트라지 유형

| 유형 | 설명 | 실현 가능성 |
|------|------|------------|
| **Cross-Platform** | 동일 이벤트, 다른 플랫폼 가격 차이. YES_A + NO_B < $1.00이면 차익 | ★★★★★ |
| **Intra-Platform** | 멀티 아웃컴 시장에서 전체 가격 합 ≠ $1.00 | ★★★☆☆ |
| **Correlated Market** | 상관관계 있는 시장 간 가격 괴리 | ★★☆☆☆ |
| **Market Making** | 양방향 유동성 제공, 스프레드 수익 | ★★★★☆ |
| **전통시장 헤지** | 예측시장 ↔ 옵션/선물 가격 차이 | ★★★☆☆ |

### 2.3 API 상세

#### Polymarket API
```
Gamma API (시장 데이터): https://gamma-api.polymarket.com  (Public, 인증 불필요)
CLOB API (트레이딩):     https://clob.polymarket.com       (Public + Auth)
```

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /price` | 현재 토큰 가격 |
| `GET /book` | 전체 오더북 |
| `GET /midpoint` | 중간 가격 |
| `POST /order` | 주문 (인증 필요) |

- WebSocket: WSS 채널로 실시간 주문/거래/시장 업데이트
- Python 클라이언트: `py-clob-client`

#### Kalshi API
```
Base URL: https://api.kalshi.com
OpenAPI spec: https://docs.kalshi.com/openapi.yaml
```

- 엔드포인트: Events, Markets, Portfolio, Orders, Series
- WebSocket: 실시간 시장 데이터
- FIX: Premier/Prime 티어에서 사용 가능
- Rate limit 티어: Basic → Advanced → Premier (3.75% 거래량) → Prime (7.5% 거래량)

#### 통합 API
- **FinFeedAPI** (`finfeedapi.com`): Polymarket, Kalshi, Manifold, Myriad 통합 REST API. OHLCV, 오더북, 활동 데이터. $25 무료 크레딧.

### 2.4 핵심 메트릭

```
# Cross-Platform Arbitrage Spread
Spread = 1.00 - (Price_YES_A + Price_NO_B)
# Spread > 합산 수수료 → 아비트라지 존재

# 예: Polymarket YES = 0.45, Kalshi NO = 0.48
# Spread = 1.00 - (0.45 + 0.48) = 0.07 (7센트 차익)
```

- 일반적 실행 가능 스프레드: 24시간 이내 만기 이벤트에서 4-6센트
- 학술 연구: 2024.4-2025.4 Polymarket에서만 $40M+ 아비트라지 수익 추출됨

### 2.5 핵심 기술 과제

1. **이벤트 매칭**: 플랫폼마다 다른 이벤트 명칭/해석 → NLP/LLM 기반 시맨틱 매칭 필요
2. **해석 불일치 리스크**: 동일 이벤트가 플랫폼별로 다르게 정산될 수 있음 (진정한 무위험이 아님)
3. **자본 잠금**: 정산까지 자금 동결 → 장기 시장은 기회비용 고려 필수
4. **규제**: Kalshi(US), Polymarket Global(US 제외), Polymarket US(US) → 교차 접근 시 법적 고려
5. **실행 실패율**: 저유동성 시장에서 78% 실패 (2025년 연구)

---

## 3. Kimchi Premium (김치프리미엄)

### 3.1 개요

한국 거래소에서 글로벌 대비 높은 가격에 암호화폐가 거래되는 현상.

```
Premium(%) = ((한국_가격_KRW / KRW_USD_환율) - 글로벌_가격_USD) / 글로벌_가격_USD × 100
```

#### 발생 원인
- 자본 통제: 한국의 해외 송금 제한 ($50,000/년)
- 수요 불균형: 한국 개인투자자의 높은 암호화폐 열기
- 폐쇄형 시장: 실명 한국 은행 계좌 + 한국 전화번호 필수

#### 역사적 프리미엄 범위

| 기간 | 프리미엄 | 비고 |
|------|----------|------|
| 2018.1 (ATH) | **~54.48%** | 2017-18 불마켓 피크 |
| 2018-19 | 0-5% | 규제 단속 후 안정 |
| 2020-21 | 8-10% | COVID 시기 |
| 2024 | ~5% 평균 | 빗썸 상장 효과 |
| 2025 | -3% ~ +5% | 역대 첫 **마이너스 프리미엄** 출현 |

#### 코인별 프리미엄 (2025년 중반 스냅샷)

| 코인 | 프리미엄 범위 |
|------|--------------|
| BTC | 0.52% - 1.04% |
| ETH | 0.54% - 0.99% |
| XRP | 0.44% - 0.94% |
| SOL | ~0.50% |
| ZIL | ~2.40% (소형 토큰) |

→ 신규 상장 알트코인 & 저유동성 토큰이 가장 높은 프리미엄 경향

### 3.2 한국 거래소 API

#### Upbit (업비트) - 국내 최대
```
REST: https://api.upbit.com/v1/
WebSocket: 지원 (ticker, trades, orderbook)
```

| 엔드포인트 | 설명 |
|-----------|------|
| `/v1/market/all` | 전체 마켓 목록 |
| `/v1/ticker?markets=KRW-BTC` | 현재가 |
| `/v1/orderbook?markets=KRW-BTC` | 호가 |
| `/v1/trades/ticks` | 최근 체결 |
| `/v1/candles/minutes/{unit}` | 분봉 (1,3,5,10,15,30,60,240) |

- Rate Limit: 호가 API 10 req/sec, WebSocket 5 req/sec
- 인증: JWT 기반 (API 키)

#### Bithumb (빗썸) - 국내 2위
```
Public: https://api.bithumb.com/public/
WebSocket: wss://global-api.bithumb.pro/message/realtime
```

| 엔드포인트 | 설명 |
|-----------|------|
| `/public/ticker/BTC_KRW` | BTC 현재가 |
| `/public/orderbook/BTC_KRW` | 호가 |
| `/public/transaction_history/BTC_KRW` | 거래 내역 |

- Rate Limit: Public 135 req/sec, Private 15 req/sec
- 특이사항: Kimpga와 제휴하여 앱 내 김프 추적 기능 내장

#### Korbit (코빗)
```
Base: https://api.korbit.co.kr/
```
- `/v1/ticker/detailed` - 상세 시세 (bid/ask/volume)
- 인증: HMAC-SHA256 또는 ED25519

#### Coinone (코인원)
```
Base: https://api.coinone.co.kr/
```
- `/v2/ticker` - 시세
- `/v2/orderbook` - 호가

### 3.3 글로벌 거래소 API (비교 대상)

| 거래소 | Ticker API | WebSocket | Rate Limit |
|--------|-----------|-----------|------------|
| **Binance** | `GET /api/v3/ticker/price?symbol=BTCUSDT` | `wss://stream.binance.com:9443/ws/btcusdt@ticker` | 6,000 weight/분 |
| **Coinbase** | `GET /v2/prices/BTC-USD/spot` | 지원 | ~10 req/sec |
| **Kraken** | `GET /0/public/Ticker?pair=XBTUSD` | `wss://ws.kraken.com` | ~1 req/sec |
| **OKX** | `GET /api/v5/market/ticker?instId=BTC-USDT` | `wss://ws.okx.com:8443/ws/v5/public` | 20 req/2sec |
| **Bybit** | `GET /v5/market/tickers?category=spot&symbol=BTCUSDT` | Push 50ms 주기 (매우 빠름) | WebSocket 무제한 |

### 3.4 환율 데이터 소스 (KRW/USD)

| 소스 | 업데이트 주기 | 비용 | 비고 |
|------|-------------|------|------|
| **한국수출입은행** (`oapi.koreaexim.go.kr`) | 1일 1회 (~10am KST) | 무료 (API 키 필요) | 공식 매매기준율 |
| **한국은행 ECOS** (`ecos.bok.or.kr/api/`) | 일별 | 무료 | 역사적 데이터 |
| **ExchangeRatesAPI.io** | 시간별 | 무료 티어 | 170+ 통화 |
| **Fixer.io** | 60초 | 프리미엄 | 170 통화 |
| **Twelve Data** | 1분 | 유료 | KRW/USD 지원 |
| **USDT/KRW (업비트)** | 실시간 | 무료 | 암호화폐 시장 실효 환율 (가장 실용적) |

> **추천**: USDT/KRW 가격을 업비트에서 직접 가져오는 것이 가장 실용적. 실제 크립토 시장의 실효 환율을 반영.

### 3.5 실질적 아비트라지 제약

| 제약 | 상세 |
|------|------|
| **외국인 계좌 개설** | 한국 전화번호 + 외국인등록증 + 한국 은행 계좌 필수 |
| **실명 은행 연동** | 업비트=케이뱅크, 빗썸=NH, 코빗=신한, 코인원=농협 |
| **송금 제한** | 해외 송금 $50,000/년 (초과 시 특별 서류) |
| **규제 리스크** | 2022년 김프 관련 $3.4B 불법 외환거래 수사 (33명 검거) |
| **은행 수수료** | 국제 송금 $20-50 + FX 스프레드 1-2% |
| **송금 시간** | 국제 송금 1-3 영업일, 암호화폐 입금 대기 (BTC 6확인=~60분) |
| **입금 중단** | 고프리미엄 시 한국 거래소가 암호화폐 입금 지연/중단하는 사례 빈번 |

> **현실**: 2025년 프리미엄 0-3%, 총 마찰비용 2-4% → 순수 법정화폐 기반 아비트라지는 대부분 비수익적. 스테이블코인 전송 + 양쪽 자본 배치 + 3-5% 스파이크 시 알고리즘 실행이 현실적.

### 3.6 기존 김치프리미엄 트래커

| 서비스 | 설명 |
|--------|------|
| **Kimpga** (`kimpga.com`) | 한국 1위 실시간 김프 추적. 빗썸 앱 내장. 2024 Korea Crypto Awards 3위 |
| **KimchiPremium.info** | 다국어 실시간 아비트라지 추적 (한/중/일/영) |
| **CryptoQuant Korea Premium Index** | `cryptoquant.com` - VWAP 기반 김프 인덱스, 분석가 다수 인용 |
| **CoinAPI** | 멀티 거래소 집계로 초당 김프 계산 가능 |
| **CCXT** | 오픈소스, 109+ 거래소 통합 라이브러리 (한국 거래소 포함) |

---

## 4. x402 프로토콜 생태계 현황

### 4.1 x402 개요

Coinbase가 개발한 HTTP 402 "Payment Required" 기반 오픈 결제 프로토콜. 2025년 5월 론칭, **1억 건 이상 결제 처리**.

- 공식 저장소: [github.com/coinbase/x402](https://github.com/coinbase/x402)
- 공식 사이트: [x402.org](https://www.x402.org/)
- Cloudflare와 공동으로 **x402 Foundation** 설립 (2025년 말)

### 4.2 결제 흐름 (핵심)

```
1. Client → Resource Server: HTTP Request
2. Server → Client: 402 + PaymentRequirements (가격, 토큰, 네트워크, facilitator URL)
3. Client: PaymentPayload 생성 (EIP-3009 서명)
4. Client → Server: 재요청 + PAYMENT-SIGNATURE 헤더
5. Server → Facilitator: /verify 로 검증
6. Server → Facilitator: /settle 로 정산
7. Server → Client: 200 OK + 데이터

전체 왕복: ~200ms
```

### 4.3 지원 블록체인

| 네트워크 | 상태 | 비고 |
|---------|------|------|
| **Base** | 프로덕션 (메인) | Coinbase facilitator 통해 수수료 무료 |
| **Solana** | 프로덕션 | Coinbase facilitator + PayAI |
| **Ethereum** | 커뮤니티 | 가스비 높음 |
| **Polygon** | 커뮤니티 | 커뮤니티 facilitator |
| **Arbitrum** | 커뮤니티 | Sperax USDs 통합 |
| **Starknet** | 커뮤니티 | Daydreams facilitator |

- **결제 최소 금액**: 요청당 $0.001부터 가능
- **CoinGecko x402**: $0.01 USDC/요청

### 4.4 SDK 현황

**공식 (Coinbase)**:
- TypeScript: `@x402/core`, `@x402/fetch`, `@x402/express`, `@x402/hono`, `@x402/next`
- Python: `pip install x402`
- Go: `go get github.com/coinbase/x402/go`

**커뮤니티**:
- Rust: `qntx/r402`
- .NET: `michielpost/x402-dotnet`
- Ruby: `quiknode-labs/x402-payments`
- Elixir: `cardotrejos/x402`

### 4.5 기존 x402 아비트라지 관련 프로젝트

| 프로젝트 | 설명 |
|---------|------|
| **kindzhon/x402-arbitrage-api** | x402 결제 기반 아비트라지 데이터 API |
| **rekon307/x402** | 12개 거래소 펀딩레이트 + 아비트라지 분석 DeFi API |
| **jorshimayor/ArbAgent-X** | AI 기반 플래시론 아비트라지 + x402 수익 정산 |
| **Abraham12611/ArbitrageX** | Celo 기반 자율 스테이블코인 아비트라지 에이전트 |
| **alsk1992/CloddsBot** | 1000+ 시장 (Polymarket, Kalshi, Binance, Hyperliquid) AI 트레이딩 에이전트 |
| **Slymeofthemonth/nba-odds-agent** | NBA 배당 아비트라지 x402 유료 API |

### 4.6 유사 프로토콜 비교

| 프로토콜 | 기반 | 장점 | 단점 |
|---------|------|------|------|
| **x402** | USDC/스테이블코인 | 안정적 가치, 멀티체인, AI 에이전트 친화 | Coinbase 의존도 |
| **L402 (LSAT)** | Bitcoin Lightning | 성숙한 생태계, 초저비용 | BTC 전용, 채널 관리 필요 |
| **EVMAuth** | ERC-1155 | 세분화된 접근 제어 | 결제보다 인증 중심 |
| **Google AP2** | A2A 프로토콜 | Google 생태계 | x402를 결제 레일로 사용 |

### 4.7 x402 주요 통합 서비스

| 서비스 | 역할 |
|--------|------|
| **Cloudflare** | 1일 **10억+** HTTP 402 응답 처리 |
| **CoinGecko** | 크립토 시장 데이터 ($0.01/요청) |
| **Chainstack** | 블록체인 RPC 인프라 |
| **QuickNode** | x402 인프라 지원 |
| **x402-api.fly.dev** | DeFi 데이터 (yield, risk, gas) $0.0005-$0.002/요청 |

---

## 5. 경쟁사 및 벤치마킹

### 5.1 아비트라지 스캐닝 서비스

| 서비스 | 커버리지 | 가격 | API 제공 | 갱신 주기 |
|--------|---------|------|----------|----------|
| **ArbitrageScanner.io** | 75+ CEX, 25+ DEX, 크로스체인 | $69-$795/월 | ★ B2B API 있음 | 2초 |
| **Bitsgap** | 15+ 거래소 | $28-$146/월 | ✗ 대시보드만 | 실시간 |
| **Cryptohopper** | 다수 거래소 | $0-$107.50/월 | ✗ | 준실시간 |
| **3Commas** | 다수 거래소 | $99/월~ | ✗ | 실시간 |
| **HaasOnline** | 24 거래소 | $9-$99/월 | ✗ HaasScript | 실시간 |
| **Pionex** | 자체 거래소 | 무료 (0.05% 수수료) | ✗ | 실시간 |

### 5.2 예측시장 아비트라지 도구

| 도구 | 설명 |
|------|------|
| **Oddpool** (`oddpool.com/arb-dashboard`) | Polymarket, Kalshi, CME 크로스 스프레드 대시보드 |
| **Eventarb** (`getarbitragebets.com`) | Polymarket, Kalshi, Robinhood 무료 아비트라지 알림 |
| **PredictOS** (오픈소스) | AI 기반 Polymarket↔Kalshi 교차 아비트라지 탐지 |
| **FinFeedAPI** | Polymarket, Kalshi, Manifold 통합 REST API |
| **Forcazt** | AI 기반 예측시장 분석/애그리게이터 |

### 5.3 데이터 제공업체 (업스트림)

| 제공업체 | 전문 분야 | 가격 |
|---------|----------|------|
| **CoinGecko** | 최광범위 CEX+DEX | 무료~$999+/월 |
| **CoinMarketCap** | 랭킹, 시세, 글로벌 통계 | 무료~$699/월 |
| **CryptoCompare** | 316 거래소, WebSocket | 무료~$200/월 |
| **Kaiko** | 기관급, 100+ 거래소 | $9,500-$55,000/년 |
| **Amberdata** | CEX+DeFi 하이브리드 | ~$1K+/월 |
| **The Graph** | 온체인 DEX 인덱싱 | GRT 토큰 (저렴) |

### 5.4 오픈소스 프레임워크

| 프로젝트 | Stars | 언어 | 설명 |
|---------|-------|------|------|
| **ccxt/ccxt** | ~35K | JS/Python/Go | 109+ 거래소 통합 API. 아비트라지 봇의 기반 |
| **hummingbot/hummingbot** | ~14K | Python | 풀 트레이딩 봇 프레임워크, DeFi Gateway, $34B+ 거래량 |
| **BowTiedDevil/degenbot** | ~500+ | Python | Uniswap V2/V3/V4, Curve 아비트라지 헬퍼 |

---

## 6. 시장 갭 분석 및 차별화 전략

### 6.1 식별된 시장 갭

| # | 갭 | 현재 상황 | x402 기회 |
|---|-----|----------|----------|
| 1 | **Pay-per-Query 아비트라지 API 부재** | 모든 서비스가 월정액 ($9-$795) | 요청당 $0.01 과금으로 진입장벽 대폭 낮춤 |
| 2 | **통합 CEX+DEX+Cross-Chain API 부재** | ArbitrageScanner가 가장 근접하나 대시보드 중심 | 단일 REST API에서 구조화된 기회 데이터 반환 |
| 3 | **AI 에이전트 네이티브 데이터 부재** | 기존 스캐너는 인간 UI 중심 | x402로 AI 에이전트가 자율적으로 발견/결제/실행 |
| 4 | **실시간 스트리밍 마이크로페이먼트 부재** | 무료(느림) vs 기관급(비쌈) 양극화 | WebSocket 피드 + 메시지당 과금 |
| 5 | **수수료/슬리피지 반영 순이익 부재** | 대부분 raw 스프레드만 표시 | 가스비, 브릿지비, 슬리피지 반영 순이익 산출 |
| 6 | **오픈소스 데이터 + 유료 인텔리전스 부재** | 원시 데이터는 무료로 존재하나 인텔리전스 레이어 없음 | 기회 식별, 리스크 조정 수익률 순위 등 부가가치 API |
| 7 | **크로스 프로토콜 합성 부재** | DEX 애그리게이터 + CEX 오더북 + 브릿지 가격을 통합하는 서비스 없음 | 멀티소스 합성이 가장 수익성 높은 기회 발굴 |

### 6.2 우리의 차별화 전략

```
┌─────────────────────────────────────────────────────────┐
│              x402 Arbitrage Opportunity Scanner          │
│                                                         │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   DEX   │  │  Prediction  │  │    Kimchi     │       │
│  │  Arb    │  │   Market     │  │   Premium    │       │
│  │  Scan   │  │   Arb Scan   │  │   Tracker    │       │
│  └────┬────┘  └──────┬───────┘  └──────┬───────┘       │
│       │              │                 │                │
│       └──────────────┼─────────────────┘                │
│                      │                                  │
│              ┌───────▼────────┐                         │
│              │  Intelligence  │ ← 순이익 계산, 리스크 평가│
│              │     Layer      │   실행 가능성 스코어링    │
│              └───────┬────────┘                         │
│                      │                                  │
│              ┌───────▼────────┐                         │
│              │   x402 API    │ ← $0.001-$0.01/요청     │
│              │   Gateway     │   API 키 불필요           │
│              └───────────────┘   AI 에이전트 자동 소비    │
└─────────────────────────────────────────────────────────┘
```

### 6.3 핵심 차별점 요약

1. **마이크로페이먼트**: 월정액 대신 요청당 $0.001-$0.01 (x402)
2. **API-First**: 대시보드가 아닌 구조화된 JSON 반환
3. **순이익 시그널**: 가스비, 수수료, 슬리피지 반영한 실제 수익성
4. **3대 시장 통합**: DEX + 예측시장 + 김치프리미엄을 단일 API
5. **AI 에이전트 호환**: x402 HTTP 네이티브 → 에이전트 자율 소비

### 6.4 추천 기술 스택

| 레이어 | 기술 | 이유 |
|--------|------|------|
| **런타임** | Node.js (TypeScript) | x402 공식 SDK 지원 최우선 |
| **프레임워크** | Express 또는 Hono | `@x402/express` / `@x402/hono` 미들웨어 |
| **DEX 데이터** | The Graph + DexPaprika + 1inch | 온체인 + 무료 멀티체인 + 최적가 |
| **CEX 데이터** | CCXT | 109+ 거래소 통합 |
| **예측시장** | Polymarket API + Kalshi API | 직접 연동 |
| **김치프리미엄** | Upbit WebSocket + Binance WebSocket | 최저 레이턴시 |
| **환율** | Upbit USDT/KRW + 한국수출입은행 | 실시간 + 공식 |
| **x402 결제** | `@x402/express` + Coinbase Facilitator | 공식 지원 |
| **블록체인** | Base (Coinbase L2) | 수수료 무료, 가장 안정적 |

### 6.5 엔드포인트 설계 초안

```
# DEX Arbitrage Opportunities
GET /api/v1/dex/opportunities
→ 402 Payment Required ($0.005 USDC)
→ Returns: [{pair, dex_a, dex_b, spread_pct, gas_cost, net_profit, chain, liquidity}]

# Prediction Market Arbitrage
GET /api/v1/prediction/opportunities
→ 402 Payment Required ($0.005 USDC)
→ Returns: [{event, platform_a, platform_b, yes_price_a, no_price_b, spread, fees, net_profit}]

# Kimchi Premium
GET /api/v1/kimchi/premium
→ 402 Payment Required ($0.003 USDC)
→ Returns: [{coin, kr_price_krw, global_price_usd, fx_rate, premium_pct, volume_kr, volume_global}]

# 통합 스캔
GET /api/v1/scan/all
→ 402 Payment Required ($0.01 USDC)
→ Returns: {dex: [...], prediction: [...], kimchi: [...]}
```

---

## 7. 에이전트(소비자) 관점 분석

> 이 API를 실제로 소비할 주체는 AI 트레이딩 에이전트 또는 아비트라지 봇이다.
> 그 관점에서 "무엇이 필요하고, 무엇이 불필요한지"를 정리한다.

### 7.1 기회별 유효 수명과 데이터 신선도

API 설계의 근본적 전제: **각 시장 유형마다 기회의 수명이 전혀 다르다.**

| 시장 유형 | 기회 수명 | 데이터 최대 허용 지연 | 권장 폴링 주기 | estimated_ttl |
|----------|----------|---------------------|---------------|---------------|
| DEX arbitrage | 초~2분 | 10-30초 | 10-15초 | 15-60초 |
| Prediction market | 분~시간 | 1-5분 | 30-60초 | 300-3,600초 |
| Kimchi premium | 시간~일 | 1-10분 | 30-60초 | 1,800-86,400초 |

**핵심 시사점**: 우리 API는 밀리초 레벨 레이턴시 아비트라지 피드가 아니다. 10-30초 스탈니스의 "스캐닝 등급" 서비스다. 이 포지셔닝이 맞다 — 속도 경쟁은 Flashbots/MEV 봇의 영역이고, 우리의 가치는 **인텔리전스 레이어**(순이익 계산, 멀티소스 합성, 리스크 스코어링)에 있다.

그러나 시간이 10-30초 걸리면 아비트라지봇이 사용할 이유가 없는것 아닌가??
시간을 단축할수있는 무언가가 있거나 / 시간이 실제로 10-30초 걸리는게 아닌어야 할것 같다.

### 7.2 필수 vs 부가 데이터 필드 정의

에이전트가 **거래 결정**을 내리려면 최소한 아래 데이터가 필요하다.

#### DEX Arbitrage — 필수 필드

```json
{
  "pair": "WETH/USDC",
  "chain": "ethereum",
  "buy_venue": "sushiswap_v2",
  "sell_venue": "uniswap_v3",
  "buy_price": 3245.12,
  "sell_price": 3261.87,
  "spread_pct": 0.52,
  "gas_cost_usd": 4.20,
  "dex_fees_usd": 9.78,
  "slippage_cost_usd": 2.10,
  "net_profit_usd": 18.45,
  "liquidity_usd": 125000,
  "max_trade_size_usd": 50000,
  "buy_token_address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "sell_token_address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "buy_pool_address": "0x...",
  "sell_pool_address": "0x...",
  "suggested_route": ["WETH", "USDC"],
  "execution_complexity": 2,
  "mev_risk": "medium",
  "confidence": 0.85,
  "data_timestamp_ms": 1741600000000,
  "staleness_seconds": 8,
  "estimated_ttl_seconds": 30
}
```

#### Prediction Market Arbitrage — 필수 필드

```json
{
  "event_title": "Will BTC exceed $100k by April 2026?",
  "category": "crypto",
  "platform_a": "polymarket",
  "platform_b": "kalshi",
  "platform_a_market_id": "0x1234...abc",
  "platform_b_market_id": "KXBTC-26APR01",
  "action_a": "BUY_YES",
  "action_b": "BUY_NO",
  "price_a": 0.62,
  "price_b": 0.31,
  "spread_cents": 7,
  "fees_a_pct": 0.0,
  "fees_b_pct": 1.2,
  "net_profit_per_contract_usd": 0.048,
  "liquidity_a_usd": 85000,
  "liquidity_b_usd": 42000,
  "resolution_date": "2026-04-01T00:00:00Z",
  "capital_lockup_days": 22,
  "annualized_return_pct": 79.6,
  "resolution_source_match": true,
  "confidence": 0.72,
  "data_timestamp_ms": 1741600000000,
  "staleness_seconds": 45,
  "estimated_ttl_seconds": 1800
}
```

#### Kimchi Premium — 필수 필드

```json
{
  "symbol": "BTC",
  "kr_exchange": "upbit",
  "global_exchange": "binance",
  "kr_price_krw": 142500000,
  "global_price_usd": 97250.00,
  "fx_rate_official": 1452.30,
  "fx_rate_effective": 1465.12,
  "premium_pct_official": 1.23,
  "premium_pct_effective": 0.35,
  "kr_bid_krw": 142480000,
  "global_ask_usd": 97260.00,
  "executable_premium_pct": 0.28,
  "kr_volume_24h_krw": 89500000000,
  "global_volume_24h_usd": 2450000000,
  "kr_pair_symbol": "KRW-BTC",
  "global_pair_symbol": "BTCUSDT",
  "premium_trend_1h": "rising",
  "avg_premium_24h_pct": 0.95,
  "data_timestamp_ms": 1741600000000,
  "staleness_seconds": 12,
  "estimated_ttl_seconds": 3600
}
```

#### 필수 vs 부가 판별 기준

| 구분 | 판별 기준 | 예시 |
|------|----------|------|
| **필수 (Essential)** | 이것 없으면 거래 결정 불가 | `net_profit_usd`, `gas_cost_usd`, `liquidity_usd`, 마켓 ID |
| **부가 (Nice-to-Have)** | 의사결정 보조, 없어도 봇 자체 계산 가능 | `confidence`, `mev_risk`, `suggested_route`, `premium_trend` |
| **불필요 (Exclude)** | 스캐너 역할 범위 초과 | `execution_calldata`, `signed_transaction`, 히스토리 차트 |

**핵심 원칙**: 스캐너는 "기회 탐지 + 실행 가능성 평가"까지만. 실제 트랜잭션 구성/전송은 에이전트의 몫.

### 7.3 Actionable Identifiers — 빠진 핵심 요소

리서치 원본에서 가장 큰 누락: **플랫폼별 실행에 필요한 식별자**.

에이전트가 기회를 발견한 후 즉시 실행하려면:

| 시장 | 필요한 식별자 | 형식 |
|------|------------|------|
| **DEX** | 토큰 컨트랙트 주소, 풀/라우터 주소, 체인 ID | `0x...` (EVM), mint address (Solana) |
| **Prediction Market** | Polymarket `tokenID`, Kalshi `ticker` | 플랫폼별 고유 ID |
| **Kimchi Premium** | 거래소별 거래쌍 심볼 | Upbit: `KRW-BTC`, Binance: `BTCUSDT` |

이것이 없으면 기회는 "정보"일 뿐 "실행 가능"하지 않다. 경쟁사 대부분이 이 식별자를 제공하지 않는 점이 우리의 차별점이 될 수 있다.

### 7.4 환율 이중 계산 — 김치프리미엄 고유 문제

리서치 원본에서 발견한 중요한 뉘앙스:

```
공식 환율 기준 프리미엄 ≠ 실효 환율 기준 프리미엄
```

- **공식 환율** (한국수출입은행 매매기준율): 하루 1회 업데이트, 은행 거래에 사용
- **실효 환율** (업비트 USDT/KRW): 실시간, 암호화폐 시장의 실제 교환 비율

예를 들어:
- 공식 환율 기준: 프리미엄 1.23% (눈에 보이는 프리미엄)
- 실효 환율 기준: 프리미엄 0.35% (실제 실행 가능한 프리미엄)

→ **반드시 두 가지 프리미엄을 모두 제공**해야 에이전트가 실제 수익성을 판단 가능.
→ 추가로 **executable_premium** (한국 bid - 글로벌 ask 기준)을 별도 산출해야 실행 가능한 프리미엄을 정확히 반영.

### 7.5 리스크 메트릭 정의

에이전트가 기회를 **필터링**하는 데 사용할 리스크 지표:

| 리스크 메트릭 | 적용 시장 | 의미 | 형식 |
|-------------|----------|------|------|
| `confidence` | 전체 | 시그널 신뢰도 (데이터 품질, 일관성) | 0.0-1.0 |
| `mev_risk` | DEX | 프론트러닝/샌드위치 공격 가능성 | `high/medium/low` |
| `execution_complexity` | DEX | 필요한 트랜잭션 수 | Integer (1=단순 스왑, 3=플래시론+2스왑) |
| `liquidity_usd` | 전체 | 호가 기준 가용 유동성 (얇은 쪽 기준) | Number |
| `max_trade_size_usd` | DEX, Kimchi | 순이익이 0이 되는 거래 규모 | Number |
| `resolution_source_match` | 예측시장 | 양 플랫폼의 정산 기준이 동일한지 | Boolean |
| `capital_lockup_days` | 예측시장 | 정산까지 자본 잠금 기간 | Integer |
| `annualized_return_pct` | 예측시장 | 자본 잠금 고려한 연환산 수익률 | Number |
| `platform_risk` | 전체 | 거래상대방/스마트컨트랙트 리스크 | `high/medium/low` |
| `premium_trend_1h` | 김치 | 최근 1시간 프리미엄 추세 | `rising/stable/falling` |

### 7.6 쿼리 파라미터 설계

에이전트가 API를 호출할 때 사용할 필터링 옵션:

#### MUST HAVE (필수)

| 파라미터 | 타입 | 설명 | 예시 |
|---------|------|------|------|
| `min_profit_usd` | number | 최소 순이익 | `?min_profit_usd=5` |
| `min_spread_pct` | number | 최소 스프레드 | `?min_spread_pct=0.5` |
| `chain` | string | 블록체인 필터 (DEX) | `?chain=ethereum` |
| `limit` | number | 반환 건수 (기본 20, 최대 100) | `?limit=10` |
| `sort_by` | enum | 정렬 기준 | `?sort_by=net_profit` |

#### SHOULD HAVE (권장)

| 파라미터 | 타입 | 설명 | 예시 |
|---------|------|------|------|
| `token` | string | 특정 토큰 필터 | `?token=ETH` |
| `min_liquidity_usd` | number | 최소 유동성 | `?min_liquidity_usd=10000` |
| `platform` | string | 플랫폼 필터 (예측시장) | `?platform=polymarket` |
| `exchange` | string | 거래소 필터 (김치) | `?exchange=upbit` |

#### 정렬 옵션

`sort_by` 허용 값: `net_profit` (기본) | `spread` | `freshness` | `liquidity` | `annualized_return`

#### 페이지네이션 vs 풀 덤프

**풀 덤프 + limit 방식 채택.** 이유: x402 pay-per-call 모델에서 페이지네이션은 추가 비용 발생. 에이전트는 한 번의 호출로 모든 관련 기회를 받아야 한다. 100개 이상이면 필터를 좁히도록 유도.

### 7.7 응답 포맷 설계 원칙

#### 원칙 1: 플랫 구조 (Flat Objects)

CCXT의 unified ticker 패턴 (`{symbol, bid, ask, last, volume, timestamp}`)을 따른다. 깊은 중첩은 에이전트 파싱 복잡도를 높인다.

```json
{
  "opportunities": [ /* flat objects의 배열 */ ],
  "meta": {
    "endpoint": "dex",
    "data_timestamp_ms": 1741600000000,
    "response_timestamp_ms": 1741600008500,
    "staleness_seconds": 8,
    "count": 5,
    "filters_applied": { "min_profit_usd": 5, "chain": "ethereum" }
  }
}
```

#### 원칙 2: 프리컴퓨팅

에이전트가 계산해야 하는 것을 서버에서 미리 계산해서 제공:
- `net_profit_usd` = gross spread - gas - fees - slippage (이미 계산됨)
- `staleness_seconds` = response_timestamp - data_timestamp (편의성)
- `executable_premium_pct` = bid/ask 기반 실행 가능 프리미엄 (midpoint 아닌 호가 기준)
- `annualized_return_pct` = 자본 잠금 기간 고려 연환산 (예측시장)

#### 원칙 3: 자기 설명적 메타데이터

매 응답에 `estimated_ttl_seconds` 포함 → 에이전트가 다음 폴링 시점을 자동 결정.

### 7.8 비용-편익 분석

#### 에이전트의 API 사용 비용

| 시나리오 | DEX (15초) | 예측 (60초) | 김프 (60초) | 일일 비용 |
|---------|-----------|------------|-----------|----------|
| 보수적 | 240회/시간 | 60회/시간 | 60회/시간 | **$43.20** |
| 균형적 | 120회/시간 | 60회/시간 | 60회/시간 | **$28.80** |
| 절약형 | 60회/시간 | 30회/시간 | 30회/시간 | **$14.40** |
| `/scan/all` 통합 | 120회/시간 | (포함) | (포함) | **$28.80** |

@$0.005/DEX, $0.005/예측, $0.003/김프, $0.01/통합

#### 손익분기점

- 일일 데이터 비용 $15-$45 → 에이전트가 **일일 $50+ 아비트라지 수익**을 내면 충분히 정당화
- 맥락: Polymarket 아비트라지만으로 1년간 $40M+ 추출됨 (연구)
- 소규모 봇도 $100-$500/일 수익 가능 → API 비용은 매출의 5-10%

### 7.9 알파 디케이 (Alpha Decay) 문제

**문제**: 100개 에이전트가 동일 기회를 동시에 보면 → 모두 실행 시도 → 기회 소멸

**v1 접근**: 과도한 엔지니어링 하지 않는다.
- x402 결제 자체가 노이즈 봇 필터 (무료 API 대비 경쟁자 수 제한)
- 10-30초 스탈니스의 "스캐닝 등급" 데이터는 본질적으로 밀리초 경쟁이 아님
- `estimated_ttl_seconds`로 에이전트가 경쟁 리스크를 자체 판단
- 예측시장/김치프리미엄은 기회 수명이 길어 알파 디케이 문제가 상대적으로 적음

**v2 고려 (향후)**:
- 응답 내 기회 순서 랜덤화 → 에이전트마다 다른 기회 우선 시도
- 월렛 주소 기반 속도 제한 (N 요청/분)
- 고가치 독점 시그널 경매 (sealed-bid)

### 7.10 에이전트 통합 패턴

#### AI 프레임워크 통합

| 프레임워크 | 통합 방식 | 비고 |
|-----------|----------|------|
| **LangChain** | `Tool` 객체로 래핑 (name, description, args_schema) | description이 LLM의 도구 선택 결정 |
| **CrewAI** | `@tool` 데코레이터 또는 `BaseTool` | `cache_function`으로 TTL 기반 캐싱 가능 |
| **AutoGPT** | MCP Registry 통한 외부 도구 등록 | 블록 기반 워크플로우 |

#### MCP (Model Context Protocol) 통합

우리 API를 MCP 서버로 노출 시:

```
Transport: Streamable HTTP (원격 서버)

Tools:
  - scan_dex_arbitrage
    description: "Find current DEX arbitrage opportunities across
                  Ethereum, Base, and Arbitrum. Returns profitable
                  cross-DEX price discrepancies with net profit
                  after gas and fees."
    inputSchema: { min_profit_usd: number, chain: string, ... }

  - scan_prediction_arb
    description: "Find cross-platform prediction market arbitrage
                  between Polymarket and Kalshi. Returns events
                  with pricing discrepancies and net profit per
                  contract."
    inputSchema: { min_spread_cents: number, platform: string, ... }

  - scan_kimchi_premium
    description: "Track real-time crypto price premiums on Korean
                  exchanges vs global exchanges. Returns premium
                  percentage with both official and effective FX rates."
    inputSchema: { symbol: string, exchange: string, ... }
```

**MCP tool description이 핵심**: LLM 기반 에이전트는 이 설명을 읽고 어떤 도구를 언제 호출할지 결정한다. 명확하고 구체적이어야 한다.

#### x402 + MCP 조합

상호 보완적:
- **x402**: 결제 처리 (HTTP 402 → 결제 → 데이터)
- **MCP**: 도구 발견 및 호출 (`tools/list` → `tools/call`)

에이전트 흐름:
```
1. MCP로 도구 발견 (tools/list)
2. MCP로 도구 호출 (tools/call → HTTP 요청)
3. HTTP 402 응답 수신
4. x402 클라이언트 라이브러리가 자동 결제
5. 200 OK + 데이터 수신
6. MCP를 통해 에이전트에 결과 전달
```

#### x402 Bazaar 등록

x402 Bazaar (서비스 디스커버리 레이어)에 등록하면 AI 에이전트가 자율적으로 우리 서비스를 발견할 수 있다. `PAYMENT-REQUIRED` 응답 헤더에 가격, 토큰, 네트워크, 설명이 포함되어 있어 에이전트가 엔드포인트에 접근하는 것만으로 서비스 정보를 자동 파악.

### 7.11 리서치 검토 결과 — 수정/보완 사항 요약

| # | 원본 리서치 이슈 | 보완 내용 |
|---|---------------|----------|
| 1 | 응답 포맷 미정의 | 플랫 JSON + meta 구조 확정 |
| 2 | 실행 식별자 (주소, ID) 누락 | 컨트랙트 주소, 마켓 ID, 거래쌍 심볼 필수 포함 |
| 3 | 김프 환율 단일 기준 | 공식/실효/실행가능 3중 프리미엄 체계 |
| 4 | 리스크 메트릭 미정의 | confidence, mev_risk, execution_complexity 등 정의 |
| 5 | 쿼리 파라미터 미정의 | min_profit, chain, sort_by 등 구체화 |
| 6 | 데이터 신선도 메타데이터 없음 | staleness_seconds, estimated_ttl_seconds 추가 |
| 7 | 알파 디케이 미고려 | v1 수용 + v2 전략 수립 |
| 8 | AI 에이전트 통합 패턴 미정리 | LangChain, CrewAI, MCP 통합 방식 정의 |
| 9 | 비용-편익 분석 없음 | 에이전트 일일 비용 $15-$45, 손익분기 $50+/일 |
| 10 | 예측시장 연환산 수익률 없음 | capital_lockup 고려한 annualized_return_pct 추가 |

---

## 8. 경쟁사 상세 분석 (엔드포인트별 3사)

### 8.1 DEX Arbitrage 경쟁사

#### 8.1.1 ArbitrageScanner.io

**제품 유형**: 웹 대시보드 + Telegram 봇 + B2B API. 자동 실행 없음 — "수동 봇"으로 기회 알림만 제공.

**핵심 아키텍처**:
- 사용자가 코인 페어, 거래소, 최소 스프레드 설정 → 4초 간격 알림 수신 → 수동 실행
- API 키/월렛 연결 불필요 (보안 장점)
- B2B API: `b2b.arbitragescanner.io` (X-API-Key 인증)

**B2B API 구조** (7개 카테고리):
| 카테고리 | 주요 엔드포인트 |
|---------|---------------|
| Arbitrage | `Get Perp Funding`, `Create Spot Spread Hook`, `Create Perpetuals Spread Hook` |
| Wallets Analysis | 주소 잔고, 트랜잭션, AI 유사 월렛 탐색 |
| Onchain Indexed Data | EVM+Solana: 주소/토큰/풀 정보, 가격, 유동성 |
| OI Stream (WebSocket) | Swaps, Transfers, New Pools, New Contracts 구독 |
| AI Assistant | 챗 기반 분석 |

**데이터 커버리지**:
- **90+ 체인**, 500+ DEX, 50+ CEX
- 동시 1,000+ 스프레드 처리
- 입출금 상태 확인 포함 (실제 실행 가능성 판단에 핵심)
- 스프레드 생존 시간 추적

**기회 데이터 필드**: 매수/매도 거래소, 스프레드 %, 가용 볼륨, 네트워크별 전송 수수료, 스프레드 수명, 입출금 상태, 네트워크 호환성, 펀딩레이트

**가격**:

| 소비자 대시보드 | B2B API |
|--------------|---------|
| Start $99/월 (15 스캐너) | Pro $99/월 (10K 크레딧) |
| Business $195/월 (30 스캐너) | Expert $249/월 (25K 크레딧) |
| Platinum $397/월 (50 스캐너) | Unicorn $499/월 (50K 크레딧) |
| Enterprise $795/월 (무제한) | Enterprise $999/월 (200K+) |

**vs 우리 x402 ($0.005/call)**: Enterprise API가 $999/200K = $0.005/크레딧으로 동일 가격대. 하지만 우리는 월정액 커밋 없이 순수 pay-per-use.

**강점**: 최광범위 커버리지, 입출금 상태 확인, 스프레드 수명 추적
**약점**: 자동 실행 없음, 학습 곡선 높음, API 문서 페이월 뒤, 크레딧 체계 불투명

---

#### 8.1.2 1inch API

**제품 유형**: 순수 개발자 API 플랫폼. 아비트라지 스캐너가 아닌 DEX 애그리게이터.

**핵심 아키텍처**:
- Pathfinder 알고리즘: 멀티홉, 멀티프로토콜 최적 스왑 경로 탐색
- Spot Price Aggregator: 온체인 스마트 컨트랙트로 유동성 가중 평균가 추출
- 응답 시간 <400ms

**API 구조** (15+ 카테고리):

| 핵심 트레이딩 | 데이터 API |
|-------------|----------|
| Classic Swap (`/swap/v6.0/{chainId}/quote`) | Spot Price (실시간 토큰 가격) |
| Fusion (가스리스 인텐트 스왑) | Gas Price (체인별 실시간 가스비) |
| Fusion+ (크로스체인) | Balance, Portfolio, History |
| Orderbook | Token Details, Charts |

**스왑 견적 응답 예시**:
```json
{
  "dst_amount": "1850000000",
  "src_token": { "address": "0xEeee...", "symbol": "ETH", "decimals": 18 },
  "dst_token": { "address": "0xdAC1...", "symbol": "USDT", "decimals": 6 },
  "protocols": [
    { "name": "UNISWAP_V3", "part": 60, "fromTokenAddress": "...", "toTokenAddress": "..." },
    { "name": "CURVE", "part": 40, "fromTokenAddress": "...", "toTokenAddress": "..." }
  ]
}
```

**데이터 커버리지**: 13 체인, 체인당 100+ 유동성 소스 (ETH만 100+)

**가격**:
| 티어 | 월가 | 호출/월 | Rate Limit |
|------|------|---------|------------|
| Dev (무료) | $0 | 100K | 60 req/min |
| Startup | $149-199 | 1M | 10 req/s |
| Professional | $299-399 | 3M | 20 req/s |
| Business | $599-799 | 7M | 40 req/s |

**vs 우리 x402**: 1inch는 콜당 $0.0001-0.0002로 훨씬 저렴하지만, **원시 데이터만 제공**. 하나의 아비트라지 기회를 찾으려면 수십 번의 호출이 필요. 우리는 한 번의 호출로 사전 계산된 기회를 제공.

**강점**: 최고 수준 라우팅, 대규모 유동성 집계, 빠른 응답, 가스 추정 내장
**약점**: 아비트라지 탐지 기능 없음, DEX 간 가격 비교 엔드포인트 없음, 사용자가 스캐닝 로직 직접 구축 필요

---

#### 8.1.3 DEX Screener (dexscreener.com)

**제품 유형**: 무료 웹 대시보드 + 모바일 앱 + 공개 API. 실시간 DEX 페어 트래커.

**핵심 아키텍처**:
- 자체 커스텀 인덱서로 온체인 이벤트 로그 파싱 (subgraph 미사용)
- Factory 컨트랙트 모니터링으로 새 풀 자동 감지
- React SPA + TradingView 스타일 차트
- 수익 모델: 토큰 프로젝트의 Enhanced Token Info ($299) 및 Token Boost 판매

**공개 API 엔드포인트**:
| 엔드포인트 | 설명 | Rate Limit |
|-----------|------|------------|
| `GET /latest/dex/pairs/{chainId}/{pairId}` | 페어 데이터 | 300/분 |
| `GET /latest/dex/search?q={query}` | 페어 검색 | 300/분 |
| `GET /token-pairs/v1/{chainId}/{tokenAddress}` | 토큰별 전체 페어 | 300/분 |
| `GET /tokens/v1/{chainId}/{tokenAddresses}` | 토큰 데이터 | 300/분 |

**페어 응답 구조** (주요 필드):
```json
{
  "chainId": "ethereum",
  "dexId": "uniswap",
  "pairAddress": "0xabcdef...",
  "baseToken": { "address": "0x1234...", "symbol": "TKN" },
  "quoteToken": { "address": "0xC02a...", "symbol": "WETH" },
  "priceUsd": "1.23",
  "txns": { "h24": { "buys": 1523, "sells": 892 } },
  "volume": { "h24": 4500000, "h1": 180000, "m5": 15000 },
  "liquidity": { "usd": 850000 },
  "priceChange": { "h24": -2.5, "h1": -0.3 }
}
```

**데이터 커버리지**: 100+ 체인, 모든 주요 AMM, 수백만 페어 인덱싱, 블록별 실시간 갱신

**가격**: **완전 무료** (인증 불필요). 하지만 원시 페어 데이터만 — 아비트라지 탐지/비교/수익 계산 없음.

**강점**: 최광범위 체인 커버리지, 무료, 빠른 데이터, 깔끔한 UI
**약점**: 크로스 DEX 비교 불가, 가스 추정 없음, 슬리피지 추정 없음, 오더북 없음, 8개 엔드포인트만

---

#### DEX 경쟁사 비교표

| 차원 | ArbitrageScanner | 1inch API | DEX Screener | **우리 (x402)** |
|------|-----------------|-----------|-------------|----------------|
| 아비트라지 탐지 | **YES** | NO | NO | **YES** |
| API 제공 | YES (B2B) | YES (핵심 제품) | YES (무료) | **YES (x402)** |
| 체인 | 90+ | 13 | 100+ | TBD |
| 사전계산 순이익 | YES (스프레드%) | NO | NO | **YES** |
| 가스 추정 | 부분적 | YES | NO | **YES** |
| 컨트랙트 주소 | 미확인 | YES | YES | **YES** |
| 무료 티어 | 없음 ($99~) | 100K/월 | 무제한 | **없음 (pay-per-call)** |
| 가격 모델 | 월정액 | 월정액 | 무료 | **$0.005/call** |
| CEX 포함 | YES (50+) | NO | NO | NO (v1) |
| 입출금 상태 | YES | NO | NO | NO (v1) |

**핵심 차별점**: ArbitrageScanner만이 유일한 직접 경쟁자이나, 월정액 $99+. 1inch와 DEX Screener는 원시 데이터만 제공하여 사용자가 직접 스캐닝 로직을 구축해야 함. 우리는 **사전 계산된 기회 + pay-per-call + 컨트랙트 주소 포함**으로 차별화.

---

### 8.2 Prediction Market Arbitrage 경쟁사

#### 8.2.1 Oddpool (oddpool.com)

**제품 유형**: SaaS 웹 대시보드 ("예측시장의 Bloomberg"). Next.js 프론트 + Flask(Python) 백엔드.

**핵심 아키텍처**:
- Kalshi + Polymarket API를 동시 쿼리 → 단일 포맷 정규화 → 이벤트 매칭
- 40+ 큐레이팅된 이벤트 대시보드 + 800+ 시장 스캐너
- 아비트라지 스캐너: **30초 간격** 갱신
- 2026.2에 Opinion을 세 번째 플랫폼으로 추가

**이벤트 매칭 방식**: **파이프라인 기반 자동 정규화 + 수동 큐레이션**. 문자열 정규화 + 퍼지 매칭. LLM 미사용.

**아비트라지 대시보드 표시 필드**: 이벤트, 아웃컴, 플랫폼별 YES/NO 가격, 순이익 (센트, 수수료 차감 후), ROI%

**API 현황**:
- 공개 API는 **Whale Tracking만** (`api.oddpool.com`, X-API-Key 인증, 100 req/min)
- **아비트라지 데이터는 API로 미제공** — 대시보드 전용 ← 핵심 갭

**가격**:
| 티어 | 가격 | 핵심 기능 |
|------|------|----------|
| Free | $0 | 40+ 대시보드, 검색, 기본 고래 데이터 |
| Pro Monthly | $30/월 | 아비트라지 스캐너, 마켓 차이, 볼륨, 고래 추적+알림, API |
| Pro Annual | $200/년 | Pro와 동일 |
| Enterprise | 커스텀 | 히스토리컬 데이터, 오더북, REST/WS/CSV/FIX |

**강점**: 깔끔한 UI, 수수료 차감 순이익 계산, 고래 추적, 빠른 성장
**약점**: 3개 플랫폼만, **아비트라지 API 미제공**, 30초 갱신 느림, 소규모 트래픽, 1인 개발자 프로젝트

---

#### 8.2.2 PredictOS (오픈소스)

**제품 유형**: MIT 라이선스 오픈소스 프레임워크. 자체 호스팅 필요.

**기술 스택**: Next.js 14 + Supabase Edge Functions (Deno) + xAI Grok/OpenAI GPT

**핵심 아키텍처** (12개 Supabase Edge Function):
- `arbitrage-finder`: URL 입력 → 플랫폼 감지 → 데이터 수집 → LLM 매칭 → 결과
- `bookmaker-agent`, `mapper-agent`, `event-analysis-agent` 등 멀티에이전트

**이벤트 매칭 방식**: **2단계 LLM 기반** (핵심 차별점)

```
Stage 1 — 검색 쿼리 생성 (searchQueryGenerator.ts):
  "Will Bitcoin reach $100k by end of 2025?" → "Bitcoin" (1-2 단어)

Stage 2 — 아비트라지 분석 (arbitrageAnalysis.ts):
  소스 마켓 + 검색 결과 → LLM이 동일 이벤트 여부 판정
  confidence >= 80% 이상에서만 아비트라지 보고
  보수적 매칭: "확실하지 않으면 다른 마켓으로 판정"
```

**응답 구조**:
```typescript
{
  success: boolean,
  data: {
    isSameMarket: boolean,
    sameMarketConfidence: number,  // 0-100
    polymarketData: { name, yesPrice, noPrice, volume, liquidity, url },
    kalshiData: { name, yesPrice, noPrice, volume, liquidity, url },
    arbitrage: {
      hasArbitrage: boolean,
      profitPercent: number,
      strategy: { buyYesOn, buyYesPrice, buyNoOn, buyNoPrice, totalCost, netProfit }
    },
    risks: string[],
    recommendation: string
  }
}
```

**플랫폼**: Polymarket + Kalshi (2개만)
**스캐닝 방식**: **온디맨드 단건** — URL 하나 붙여넣으면 분석. 연속 스캐닝 없음.
**비용**: 무료 (오픈소스) + LLM API 비용 $0.01-0.05/쿼리 + 자체 호스팅 비용

**강점**: LLM 매칭 정확도, 오픈소스, Polymarket 주문 실행 가능, x402 통합
**약점**: 대량 스캐닝 불가, 느림 (LLM 2-5초), 비쌈 (LLM 비용), 2개 플랫폼만, 수수료 미반영

---

#### 8.2.3 FinFeedAPI (finfeedapi.com)

**제품 유형**: 순수 데이터 API (REST + WebSocket). UI/대시보드 없음. 예측시장을 금융 상품처럼 정규화.

**핵심 아키텍처**:
- 4개 플랫폼 데이터를 통합 스키마로 정규화
- 예측시장을 금융 도구로 취급: 티커, 견적, OHLCV, 오더북
- JSON + MsgPack (바이너리) 응답 포맷
- WebSocket 밀리초 타임스탬프 스트리밍

**플랫폼**: Polymarket, Kalshi, Manifold, Myriad (4개 — 가장 넓은 커버리지)

**핵심 데이터 타입**:
| 타입 | 설명 |
|------|------|
| Market metadata | 티커, 제목, 설명, 정산 기준 |
| OHLCV | 1초~5년 간격 캔들 |
| Order book | 아웃컴별 bid/ask 배열 |
| Quotes | 최신 bid/ask/last |
| Trades | 개별 거래 기록 |

**가격**: 100 데이터 포인트 = 1 크레딧 (올림). 신규 계정 $25 무료 크레딧. 사용량 기반 과금.

**핵심 한계**: **이벤트 매칭/아비트라지 탐지 기능 없음**. 정규화된 원시 데이터만 제공. 사용자가 직접 교차 매칭 및 아비트라지 로직 구축 필요.

**강점**: 가장 넓은 플랫폼 커버리지 (4개), 금융급 API 설계, WebSocket, MsgPack
**약점**: 아비트라지 탐지 없음, 문서 403 보호, 가격 불투명, 커뮤니티 부재

---

#### 예측시장 경쟁사 비교표

| 차원 | Oddpool | PredictOS | FinFeedAPI | **우리 (x402)** |
|------|---------|-----------|------------|----------------|
| 아비트라지 탐지 | **YES** (대시보드) | **YES** (온디맨드) | NO | **YES (API)** |
| API로 아비트라지 | **NO** | YES (자체호스팅) | NO | **YES** |
| 플랫폼 수 | 3 | 2 | 4 | TBD (3+) |
| 이벤트 매칭 | 파이프라인+큐레이션 | LLM 2단계 | 없음 | 하이브리드 |
| 수수료 반영 | **YES** | NO | N/A | **YES** |
| 실시간 스캐닝 | 30초 | 없음 (온디맨드) | WebSocket | 30-60초 |
| 마켓 ID 포함 | YES (링크) | YES (slug/ticker) | YES | **YES** |
| 가격 | $30/월 | 무료+LLM비용 | 크레딧 기반 | **$0.005/call** |

**핵심 차별점**: **아비트라지 데이터를 API로 제공하는 서비스가 없다.** Oddpool은 대시보드 전용, PredictOS는 자체호스팅 필요, FinFeedAPI는 원시 데이터만. 우리가 유일한 **호스팅된 아비트라지 API**.

---

### 8.3 Kimchi Premium 경쟁사

#### 8.3.1 Kimpga (kimpga.com / 김프가)

**제품 유형**: 무료 웹 플랫폼. Next.js + WebSocket 실시간 스트리밍. 한국 크립토 커뮤니티 1위.

**핵심 아키텍처**:
- 한국 거래소(업비트, 빗썸, 코인원) + 글로벌(바이낸스 외 5개) 실시간 가격 수집
- 사용자가 국내/해외 거래소 조합 선택 → 프리미엄 즉시 재계산
- USDT/KRW 가격을 상단에 표시 (실효 환율 프록시)
- **KIMPUP**: 별도 유료 서비스로 업비트+바이낸스 API 연결하여 헤지 아비트라지 자동 실행 (베타)

**데이터 커버리지**:
| 구분 | 내용 |
|------|------|
| 한국 거래소 | 업비트, 빗썸, 코인원 (3개, 코빗 미지원) |
| 글로벌 거래소 | 바이낸스, OKX, 바이비트, 비트겟, 게이트io, 후오비 |
| 추적 코인 | 선택된 한국 거래소 전체 목록 (200+) |
| 갱신 주기 | WebSocket 실시간 (서브초) |
| 특수 기능 | **금 김치프리미엄** (금 김프) 별도 탭 |

**프리미엄 계산**:
- **환율**: 한국 거래소의 USDT/KRW 가격 (크립토 시장 실효 환율)
- **가격 유형**: 최종 거래가 (mid-market). Bid/ask 미사용
- **수수료 미반영**: 경쟁사 RealKimp가 "실제 호가+수수료 기반 프리미엄"으로 차별화한 것이 이를 반증

**UI 구성**:
- 상단: USDT(Tether) 가격 + 변동률 (환율 프록시)
- 메인 테이블: 코인명, 현재가, 김프%, 전일 대비, 52주 고/저 비교, 거래량
- 거래소 선택기: 드롭다운
- 추가 탭: 선물 롱/숏 비율, 트렌딩 코인, 고래 알림, KimpChat (커뮤니티 채팅)

**가격**: **완전 무료**. KIMPUP은 별도 유료 (가격 미공개).
**API**: **미제공**
**모바일**: 앱 없음 (서드파티 "김프" 앱 존재: iOS 3.5/5, Google Play 4.6/5)

**생태계**: 빗썸 공식 파트너십 (2024.4), 2024 Korea Crypto Awards 3위

**강점**: 최대 사용자 기반, 광범위 코인/거래소, 빗썸 파트너십, 커뮤니티
**약점**: bid/ask 미사용, 수수료 미반영, API 없음, 코빗 미지원, 한국어 전용

---

#### 8.3.2 CryptoQuant Korea Premium Index

**제품 유형**: 전문 온체인 분석 플랫폼의 일부 메트릭. TradingView 스타일 차트.

**핵심 아키텍처**:
- 한국 4대 거래소 VWAP + 글로벌 500+ 거래소 VWAP의 차이를 지수화
- 공식: `Korea Premium Index = ((Korean VWAP - Global VWAP) / Global VWAP) × 100%`
- **VWAP 기반** — 단순 last price가 아닌 거래량 가중 평균가 (가장 정교한 방법론)

**데이터 커버리지**:
| 구분 | 내용 |
|------|------|
| 한국 거래소 | 업비트, 빗썸, 코인원, **코빗** (4개 — 유일하게 코빗 포함) |
| 글로벌 거래소 | 500+ 거래소 집계 VWAP |
| 추적 코인 | **BTC, ETH만** (알트코인 미지원) |
| 갱신 주기 | 실시간 (유료), 지연 (무료) |
| 히스토리 | 수년간 전체 (분/시간/일별) |

**프리미엄 계산**:
- 환율: `BTC_KRW - (BTC_USDT × USD_KRW)` 공식 사용. FX 출처 미명시.
- 가격: **VWAP** (볼륨 가중 평균가) — 다른 경쟁사 대비 가장 정확
- 수수료/bid-ask: 미반영 (분석/센티멘트 도구)
- 핵심 인사이트: "김프 16% 초과 시 로컬 탑/FOMO 신호"

**가격**:
| 티어 | 월가 | API | 해상도 | 알림 |
|------|------|-----|-------|------|
| Free | $0 | NO | 24H 차트, 3년 히스토리 | 1개 |
| Advanced | $29-39 | NO | Pro 차트, 전체 히스토리 | 5개 |
| Professional | $99-109 | **YES (24H)** | API 접근 | 20개 |
| Premium | $699-799 | **YES (블록)** | 블록 레벨 해상도 | 100개 |

**생태계**: Bloomberg, CNBC, CoinDesk에서 인용. $3M 시드 펀딩 (2021).

**강점**: VWAP 방법론 (가장 정교), 코빗 포함, 전문가급 차트, API 제공, 기관 신뢰
**약점**: BTC/ETH만 지원, API $109+/월 (고가), 알트코인 김프 미추적, 실행 도구 아님

---

#### 8.3.3 KimchiPremium.info

**제품 유형**: 경량 단일 페이지 웹앱. 다국어 지원 (영/한/중/일).

**핵심 아키텍처**:
- 업비트(KRW) vs 코인베이스(USD) 단일 페어 비교
- 단일 USD/KRW 환율 사용 (출처 미명시)
- 내장 **아비트라지 수익 계산기** (유니크 기능)

**데이터 커버리지**:
| 구분 | 내용 |
|------|------|
| 한국 거래소 | 업비트 (1개만) |
| 글로벌 거래소 | 코인베이스 (1개만) |
| 추적 코인 | 6개: BTC, ETH, SOL, XRP, USDT, USDC |
| 갱신 주기 | 실시간 (자동 갱신 + 수동 새로고침 버튼) |
| 히스토리 | 2023.3 - 2024.8 (업데이트 중단 가능성) |

**아비트라지 계산기** (유니크 기능):
```
$10,000 투자, 프리미엄 2.0% 시:
- Gemini 매수 수수료: 0.40% ($40)
- 네트워크 가스비: $0.20 × 2 ($0.40)
- 업비트 매도 수수료: 0.05% ($5)
- 총 수수료: $45.40 (0.45%)
- 수익: $154.60, ROI: 1.55%
```

**가격**: **완전 무료**, 광고 없음, 로그인 불필요.
**API**: 미제공
**개발자**: 익명 개인 (passmail.net 이메일)

**강점**: 깔끔한 UX, 4개 언어, 아비트라지 계산기, 스테이블코인(USDT/USDC) 동시 추적
**약점**: 1:1 거래소만, 6개 코인만, 알림 없음, 커스터마이징 없음, 유지보수 불확실

---

#### 김치프리미엄 경쟁사 비교표

| 차원 | Kimpga | CryptoQuant | KimchiPremium.info | **우리 (x402)** |
|------|--------|-------------|-------------------|----------------|
| 한국 거래소 | 3 | **4 (코빗 포함)** | 1 | 2+ (업비트, 빗썸) |
| 글로벌 거래소 | 6+ | 500+ 집계 | 1 | 2+ (바이낸스+) |
| 추적 코인 | **200+** | BTC/ETH만 | 6 | **전체 겹치는 페어** |
| 계산 방식 | Last price | **VWAP** | Last price | **Bid/Ask 기반** |
| 수수료 반영 | NO | NO | 계산기만 | **YES** |
| Executable 프리미엄 | NO | NO | NO | **YES** |
| 이중 환율 | USDT/KRW만 | USD/KRW만 | USD/KRW만 | **공식+실효+실행** |
| API | **NO** | YES ($109+) | **NO** | **YES ($0.003/call)** |
| 언어 | 한국어 | 한/영 | **4개 언어** | 영어 |
| 가격 | 무료 | $0-$799 | 무료 | **$0.003/call** |

**핵심 차별점**:
1. **Executable premium** (bid/ask 기준 실행 가능 프리미엄) 제공하는 서비스가 없음
2. **3중 환율 체계** (공식/실효/실행) 제공하는 서비스가 없음
3. **수수료 반영 프리미엄을 API로** 제공하는 서비스가 없음
4. **알트코인 + VWAP + API**를 동시에 제공하는 서비스가 없음 (Kimpga는 알트코인만, CryptoQuant는 VWAP+API만)

---

### 8.4 전체 경쟁사 분석에서 도출된 전략적 시사점

#### 공통적으로 발견된 9개 시장 갭

| # | 갭 | 해당 시장 | 우리의 대응 |
|---|-----|----------|-----------|
| 1 | 아비트라지 데이터를 API로 제공하는 서비스 부재 | DEX, 예측시장 | x402 pay-per-call API |
| 2 | 수수료/가스/슬리피지 반영 순이익 미제공 | 전체 | 사전 계산된 net_profit_usd |
| 3 | Bid/Ask 기반 실행 가능 가격 미사용 | 김치프리미엄 | executable_premium_pct |
| 4 | 월정액만 존재, pay-per-call 없음 | 전체 | x402 마이크로페이먼트 |
| 5 | 컨트랙트 주소/마켓 ID 미포함 | DEX, 예측시장 | actionable identifiers |
| 6 | 이벤트 매칭이 불완전하거나 수동 | 예측시장 | 하이브리드 (사전매칭 + LLM 검증) |
| 7 | AI 에이전트용 설계 없음 (MCP, x402 Bazaar) | 전체 | MCP tool + x402 네이티브 |
| 8 | 데이터 신선도 메타데이터 없음 | 전체 | staleness_seconds, estimated_ttl |
| 9 | 3개 시장(DEX+예측+김프) 통합 API 없음 | 전체 | /scan/all 통합 엔드포인트 |

---

## 9. 엔드포인트 후보 전체 목록 (우선순위별)

> 시장 갭 분석, 경쟁사 약점, 에이전트 요구사항을 교차 분석하여 도출한 전체 엔드포인트 후보.
> 우선순위는 **시장 가치 × 기존 인프라 재활용도 × 구현 난이도** 의 종합 평가.

---

### ★ Priority 1 — Core (v1 론칭 필수)

#### EP-01. DEX Arbitrage Scanner
```
GET /api/v1/dex/opportunities
402 Payment Required — $0.005 USDC
```

**프로젝트명**: `DEX-SCAN`

**정의**: 멀티체인 DEX 간 동일 토큰의 가격 차이를 탐지하고, 가스비·수수료·슬리피지를 차감한 순이익을 사전 계산하여 제공.

**커버리지**:
- 체인: Ethereum, Base, Arbitrum, Polygon, BSC (v1), Solana (v2)
- DEX: Uniswap V2/V3, SushiSwap, Curve, PancakeSwap, Balancer, Aerodrome
- 유형: Cross-DEX, Triangular, DEX↔CEX (v2)

**데이터 소스**:
| 소스 | 용도 | 비용 |
|------|------|------|
| The Graph subgraphs | 풀 리저브, 가격 | 100K 무료/월, 이후 GRT |
| DexPaprika | 멀티체인 토큰 가격 | 무료 |
| 1inch Spot Price API | 최적가 참조 | 100K 무료/월 |
| RPC (eth_gasPrice) | 가스비 추정 | Alchemy/QuickNode 무료 티어 |

**응답 구조**:
```json
{
  "opportunities": [
    {
      "id": "dex-eth-001",
      "pair": "WETH/USDC",
      "chain": "ethereum",
      "buy_venue": "sushiswap_v2",
      "buy_venue_type": "dex",
      "sell_venue": "uniswap_v3",
      "sell_venue_type": "dex",
      "buy_price": 3245.12,
      "sell_price": 3261.87,
      "spread_pct": 0.52,
      "gas_cost_usd": 4.20,
      "dex_fees_usd": 9.78,
      "slippage_cost_usd": 2.10,
      "net_profit_usd": 18.45,
      "liquidity_usd": 125000,
      "max_trade_size_usd": 50000,
      "buy_token_address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "sell_token_address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "buy_pool_address": "0x...",
      "sell_pool_address": "0x...",
      "suggested_route": ["WETH", "USDC"],
      "execution_complexity": 2,
      "mev_risk": "medium",
      "confidence": 0.85,
      "data_timestamp_ms": 1741600000000,
      "staleness_seconds": 8,
      "estimated_ttl_seconds": 30
    }
  ],
  "meta": {
    "endpoint": "dex",
    "data_timestamp_ms": 1741600000000,
    "response_timestamp_ms": 1741600008500,
    "staleness_seconds": 8,
    "count": 5,
    "filters_applied": { "min_profit_usd": 5, "chain": "ethereum" }
  }
}
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `min_profit_usd` | number | 1 | 최소 순이익 |
| `min_spread_pct` | number | 0.1 | 최소 스프레드 |
| `chain` | string | all | 체인 필터 |
| `token` | string | all | 토큰 필터 |
| `sort_by` | enum | net_profit | 정렬 (net_profit, spread, freshness, liquidity) |
| `limit` | number | 20 | 반환 건수 (max 100) |
| `min_liquidity_usd` | number | 1000 | 최소 유동성 |

**갱신 주기**: 10-15초
**기회 TTL**: 15-60초
**직접 경쟁사**: ArbitrageScanner ($99+/월), 1inch (원시 데이터만), DEX Screener (원시 데이터만)
**차별점**: 사전 계산된 순이익 + 컨트랙트 주소 + pay-per-call

---

#### EP-02. Prediction Market Arbitrage Scanner
```
GET /api/v1/prediction/opportunities
402 Payment Required — $0.005 USDC
```

**프로젝트명**: `PREDICT-SCAN`

**정의**: Polymarket, Kalshi 등 예측시장 플랫폼 간 동일 이벤트의 가격 불일치를 탐지. 수수료 차감 순이익, 자본 잠금 기간 고려 연환산 수익률을 산출.

**커버리지**:
- 플랫폼: Polymarket (Gamma API) + Kalshi (REST API) (v1), Opinion (v2)
- 카테고리: 정치, 경제, 스포츠, 크립토, 문화
- 이벤트 매칭: 하이브리드 (사전 퍼지매칭 DB + LLM 검증 (edge case))

**데이터 소스**:
| 소스 | 용도 | 비용 |
|------|------|------|
| Polymarket Gamma API | 시장 가격, 볼륨, 유동성 | 무료 (Public) |
| Polymarket CLOB API | 오더북, 미드포인트 | 무료 (Public) |
| Kalshi API | 이벤트, 마켓, 오더북 | 무료 (Basic 티어) |
| 자체 이벤트 매칭 DB | 교차 플랫폼 이벤트 매핑 | 자체 구축 |

**응답 구조**:
```json
{
  "opportunities": [
    {
      "id": "pred-001",
      "event_title": "Will BTC exceed $100k by April 2026?",
      "category": "crypto",
      "platform_a": "polymarket",
      "platform_b": "kalshi",
      "platform_a_market_id": "0x1234...abc",
      "platform_a_token_id": "71321045...",
      "platform_a_url": "https://polymarket.com/event/...",
      "platform_b_market_id": "KXBTC-26APR01",
      "platform_b_url": "https://kalshi.com/markets/...",
      "action_a": "BUY_YES",
      "action_b": "BUY_NO",
      "price_a": 0.62,
      "price_b": 0.31,
      "spread_cents": 7,
      "fees_a_usd": 0.00,
      "fees_b_usd": 0.0037,
      "net_profit_per_contract_usd": 0.066,
      "liquidity_a_usd": 85000,
      "liquidity_b_usd": 42000,
      "resolution_date": "2026-04-01T00:00:00Z",
      "capital_lockup_days": 22,
      "annualized_return_pct": 79.6,
      "resolution_source_match": true,
      "event_match_confidence": 0.94,
      "confidence": 0.72,
      "data_timestamp_ms": 1741600000000,
      "staleness_seconds": 45,
      "estimated_ttl_seconds": 1800
    }
  ],
  "meta": { ... }
}
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `min_spread_cents` | number | 1 | 최소 스프레드 (센트) |
| `min_profit_usd` | number | 0.01 | 최소 순이익/계약 |
| `category` | string | all | 카테고리 필터 |
| `platform` | string | all | 플랫폼 필터 |
| `sort_by` | enum | annualized_return | 정렬 |
| `limit` | number | 20 | 반환 건수 (max 100) |
| `min_confidence` | number | 0.7 | 이벤트 매칭 최소 신뢰도 |
| `max_lockup_days` | number | 365 | 최대 자본 잠금 기간 |

**갱신 주기**: 30-60초
**기회 TTL**: 300-3,600초
**직접 경쟁사**: Oddpool (대시보드만, API 없음), PredictOS (자체호스팅), FinFeedAPI (원시 데이터만)
**차별점**: 유일한 호스팅된 아비트라지 API + 수수료 반영 + 연환산 수익률 + 마켓 ID 포함

---

#### EP-03. Kimchi Premium Tracker
```
GET /api/v1/kimchi/premium
402 Payment Required — $0.003 USDC
```

**프로젝트명**: `KIMCHI-TRACK`

**정의**: 한국 거래소와 글로벌 거래소 간 실시간 가격 프리미엄. 공식/실효/실행가능 3중 환율 체계로 산출. Bid/Ask 기반 executable premium 제공.

**커버리지**:
- 한국 거래소: Upbit (v1), Bithumb (v1), Coinone (v2)
- 글로벌 거래소: Binance (v1), Bybit (v2), OKX (v2)
- 코인: 양쪽 거래소에 동시 상장된 전체 페어

**데이터 소스**:
| 소스 | 용도 | 비용 |
|------|------|------|
| Upbit WebSocket | KRW 실시간 시세 + 호가 | 무료 |
| Upbit REST `/v1/ticker` | 배치 시세 조회 | 무료 (10 req/sec) |
| Binance WebSocket | USDT 실시간 시세 | 무료 |
| Upbit USDT/KRW | 실효 환율 | 무료 |
| 한국수출입은행 API | 공식 매매기준율 | 무료 (API 키) |

**응답 구조**:
```json
{
  "opportunities": [
    {
      "id": "kimchi-btc-001",
      "symbol": "BTC",
      "kr_exchange": "upbit",
      "global_exchange": "binance",
      "kr_price_krw": 142500000,
      "global_price_usd": 97250.00,
      "kr_bid_krw": 142480000,
      "kr_ask_krw": 142520000,
      "global_bid_usd": 97240.00,
      "global_ask_usd": 97260.00,
      "fx_rate_official": 1452.30,
      "fx_rate_effective": 1465.12,
      "premium_pct_official": 1.23,
      "premium_pct_effective": 0.35,
      "executable_premium_pct": 0.28,
      "kr_volume_24h_krw": 89500000000,
      "global_volume_24h_usd": 2450000000,
      "kr_pair_symbol": "KRW-BTC",
      "global_pair_symbol": "BTCUSDT",
      "premium_trend_1h": "rising",
      "avg_premium_24h_pct": 0.95,
      "data_timestamp_ms": 1741600000000,
      "staleness_seconds": 3,
      "estimated_ttl_seconds": 3600
    }
  ],
  "meta": { ... }
}
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `symbol` | string | all | 코인 필터 |
| `min_premium_pct` | number | 0 | 최소 프리미엄 |
| `exchange` | string | all | 한국 거래소 필터 |
| `sort_by` | enum | premium_pct_effective | 정렬 |
| `limit` | number | 50 | 반환 건수 (max 200) |
| `premium_type` | enum | effective | official / effective / executable |

**갱신 주기**: 10-30초
**기회 TTL**: 1,800-86,400초
**직접 경쟁사**: Kimpga (API 없음), CryptoQuant ($109+/월, BTC/ETH만), KimchiPremium.info (6코인만)
**차별점**: 3중 환율 + executable premium + 전체 알트코인 + API + $0.003/call

---

#### EP-04. Unified Scanner
```
GET /api/v1/scan/all
402 Payment Required — $0.01 USDC
```

**프로젝트명**: `UNI-SCAN`

**정의**: DEX + Prediction Market + Kimchi Premium 3개 엔드포인트를 단일 호출로 통합. 에이전트가 한 번의 결제로 전체 아비트라지 시장을 스캔.

**응답 구조**:
```json
{
  "dex": { "opportunities": [...], "count": 5 },
  "prediction": { "opportunities": [...], "count": 3 },
  "kimchi": { "opportunities": [...], "count": 12 },
  "meta": {
    "endpoint": "scan_all",
    "total_opportunities": 20,
    "data_timestamp_ms": 1741600000000,
    "response_timestamp_ms": 1741600012000,
    "staleness_seconds": 12
  }
}
```

**가격 합리성**: 개별 호출 시 $0.005 + $0.005 + $0.003 = $0.013. 통합은 $0.01 (23% 할인).

**에이전트 가치**: 3번 결제 대신 1번으로 전체 시장 조망. 폴링 비용 절감.

---

### ★ Priority 2 — Growth (v1.1 확장)

#### EP-05. Funding Rate Arbitrage Scanner
```
GET /api/v1/funding/opportunities
402 Payment Required — $0.003 USDC
```

**프로젝트명**: `FUND-SCAN`

**정의**: CEX 선물 시장의 펀딩레이트 차이를 탐지. 동일 페어가 거래소 A에서 양의 펀딩(롱이 숏에 지불), 거래소 B에서 음의 펀딩(숏이 롱에 지불)이면 양쪽에서 수익 가능.

**왜 Priority 2인가**:
- 크립토에서 **가장 보편적인 저위험 수익 전략** 중 하나 (마켓 뉴트럴)
- 기회 수명 **매우 김** (펀딩레이트는 보통 8시간 간격 정산)
- DEX arb와 **동일한 CCXT 인프라** 재활용 → 추가 구현 비용 최소
- 기존 x402 프로젝트(rekon307/x402)가 원시 펀딩레이트를 제공하지만 **아비트라지 기회로 가공하지 않음**

**커버리지**:
- 거래소: Binance Futures, Bybit, OKX, dYdX, Hyperliquid
- 페어: BTC, ETH, SOL, DOGE, XRP 등 주요 무기한 선물
- 정산 주기: 8시간 (대부분), 1시간 (일부)

**데이터 소스**:
| 소스 | 용도 | 비용 |
|------|------|------|
| CCXT (`fetchFundingRate()`) | 거래소별 현재/예측 펀딩레이트 | 무료 |
| Binance `GET /fapi/v1/fundingRate` | 펀딩레이트 히스토리 | 무료 |
| Bybit `GET /v5/market/funding/history` | 펀딩레이트 히스토리 | 무료 |
| CoinGlass API | 집계 펀딩레이트 (참조) | 유료 |

**응답 구조**:
```json
{
  "opportunities": [
    {
      "id": "fund-001",
      "pair": "BTC/USDT",
      "long_exchange": "bybit",
      "short_exchange": "binance",
      "long_funding_rate": -0.0012,
      "short_funding_rate": 0.0085,
      "funding_rate_spread": 0.0097,
      "annualized_yield_pct": 35.4,
      "next_settlement_utc": "2026-03-10T16:00:00Z",
      "hours_until_settlement": 3.5,
      "estimated_daily_profit_per_10k_usd": 2.66,
      "long_exchange_fee_pct": 0.02,
      "short_exchange_fee_pct": 0.02,
      "net_funding_spread": 0.0093,
      "long_open_interest_usd": 450000000,
      "short_open_interest_usd": 380000000,
      "risk_level": "low",
      "strategy": "long_bybit_short_binance",
      "confidence": 0.92,
      "data_timestamp_ms": 1741600000000,
      "staleness_seconds": 30,
      "estimated_ttl_seconds": 7200
    }
  ],
  "meta": { ... }
}
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `min_spread` | number | 0.001 | 최소 펀딩레이트 스프레드 |
| `min_annualized_yield` | number | 5 | 최소 연환산 수익률 (%) |
| `pair` | string | all | 페어 필터 |
| `exchange` | string | all | 거래소 필터 |
| `sort_by` | enum | annualized_yield | 정렬 |
| `limit` | number | 20 | 반환 건수 (max 100) |

**갱신 주기**: 60초 (펀딩레이트는 느리게 변동)
**기회 TTL**: 3,600-28,800초 (정산 주기까지)

**경쟁 상황**:
| 경쟁사 | 제공 내용 | 한계 |
|--------|---------|------|
| rekon307/x402 | 12개 거래소 원시 펀딩레이트 | 아비트라지 기회 미가공 |
| ArbitrageScanner | `Get Perp Funding` 엔드포인트 | 스프레드 기회 미가공, $99+/월 |
| CoinGlass | 펀딩레이트 대시보드 | API 고가, 아비트라지 미제공 |

**차별점**: 펀딩레이트를 **기회로 가공** (스프레드, 연환산 수익률, 일일 예상 수익) + pay-per-call

---

#### EP-06. CEX Deposit/Withdrawal Status
```
GET /api/v1/exchange/status
402 Payment Required — $0.002 USDC
```

**프로젝트명**: `STATUS-CHECK`

**정의**: 거래소별 토큰의 입출금 가능 여부, 네트워크별 상태, 예상 처리 시간을 제공. **다른 모든 엔드포인트의 실행 가능성을 검증**하는 보조 도구.

**왜 Priority 2인가**:
- ArbitrageScanner의 핵심 차별점이 바로 이 기능 — 검증된 시장 가치
- 아비트라지 기회가 존재해도 **입출금이 막혀있으면 실행 불가**
- 구현 난이도 낮음 (CCXT `fetchCurrencies()` / `fetchDepositWithdrawFees()`)
- EP-01(DEX), EP-03(김프)의 **필수 보조 데이터**

**커버리지**:
- 거래소: Binance, Bybit, OKX, Upbit, Bithumb, Coinbase, Kraken
- 정보: 입금/출금 가능 여부, 네트워크별 상태, 최소 입금/출금, 수수료, 예상 처리 시간

**데이터 소스**:
| 소스 | 용도 | 비용 |
|------|------|------|
| CCXT `fetchCurrencies()` | 입출금 상태, 네트워크, 한도 | 무료 |
| CCXT `fetchDepositWithdrawFees()` | 수수료 | 무료 |
| Binance `GET /sapi/v1/capital/config/getall` | 네트워크별 상세 | API 키 필요 |
| Upbit `GET /v1/status/wallet` | 월렛 상태 | API 키 필요 |

**응답 구조**:
```json
{
  "statuses": [
    {
      "exchange": "binance",
      "symbol": "ETH",
      "networks": [
        {
          "network": "ETH",
          "chain": "ethereum",
          "deposit_enabled": true,
          "withdraw_enabled": true,
          "withdraw_fee": 0.0012,
          "withdraw_fee_usd": 3.90,
          "min_withdraw": 0.01,
          "estimated_arrival_minutes": 12,
          "confirmations_required": 12
        },
        {
          "network": "ARBITRUM",
          "chain": "arbitrum",
          "deposit_enabled": true,
          "withdraw_enabled": false,
          "withdraw_suspended_reason": "maintenance",
          "estimated_resume_utc": "2026-03-10T18:00:00Z"
        }
      ],
      "data_timestamp_ms": 1741600000000
    }
  ],
  "meta": { ... }
}
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `exchange` | string | all | 거래소 필터 |
| `symbol` | string | **필수** | 토큰 심볼 |
| `network` | string | all | 네트워크 필터 |

**갱신 주기**: 60-300초 (입출금 상태는 느리게 변동)
**기회 TTL**: N/A (상태 정보)

**경쟁 상황**: ArbitrageScanner만 제공 (대시보드 통합). 독립 API로 제공하는 서비스 없음.
**차별점**: 독립 API로 제공 + 다른 엔드포인트와 조합 가능 + $0.002/call

---

#### EP-07. Cross-Chain Bridge Arbitrage Scanner
```
GET /api/v1/bridge/opportunities
402 Payment Required — $0.005 USDC
```

**프로젝트명**: `BRIDGE-SCAN`

**정의**: 동일 토큰의 체인 간 가격 차이를 탐지하고, 브릿지 비용(가스+프로토콜 수수료)과 전송 시간을 포함한 순이익을 산출.

**왜 Priority 2인가**:
- 시장 갭 #7 "크로스 프로토콜 합성 부재" 직접 해결
- DEX-SCAN(EP-01)의 자연스러운 확장
- 브릿지 비용 데이터 수집이 DEX 가격 수집보다 복잡

**커버리지**:
- 체인: Ethereum ↔ Arbitrum ↔ Base ↔ Polygon ↔ BSC ↔ Optimism
- 브릿지: Stargate, Wormhole, LayerZero, Across, Hop Protocol
- 토큰: USDC, USDT, ETH, WBTC 등 주요 브릿지 가능 토큰

**데이터 소스**:
| 소스 | 용도 | 비용 |
|------|------|------|
| DEX-SCAN 내부 데이터 | 체인별 토큰 가격 | 재활용 |
| Stargate API | 브릿지 견적, 수수료 | 무료 |
| Li.Fi API | 크로스체인 집계 견적 | 무료 티어 |
| Socket API | 브릿지 라우팅 + 비용 | 무료 티어 |

**응답 구조**:
```json
{
  "opportunities": [
    {
      "id": "bridge-001",
      "token": "USDC",
      "source_chain": "ethereum",
      "destination_chain": "arbitrum",
      "source_price_usd": 0.9998,
      "destination_price_usd": 1.0012,
      "price_spread_pct": 0.14,
      "bridge_protocol": "stargate",
      "bridge_fee_usd": 0.85,
      "source_gas_usd": 3.20,
      "destination_gas_usd": 0.08,
      "total_cost_usd": 4.13,
      "net_profit_per_1000_usd": 0.27,
      "estimated_transfer_minutes": 2,
      "max_bridge_amount_usd": 500000,
      "bridge_liquidity_usd": 12000000,
      "confidence": 0.78,
      "data_timestamp_ms": 1741600000000,
      "staleness_seconds": 15,
      "estimated_ttl_seconds": 300
    }
  ],
  "meta": { ... }
}
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `token` | string | all | 토큰 필터 |
| `source_chain` | string | all | 출발 체인 |
| `destination_chain` | string | all | 도착 체인 |
| `min_profit_per_1000` | number | 0.1 | $1,000당 최소 순이익 |
| `sort_by` | enum | net_profit | 정렬 |
| `limit` | number | 20 | 반환 건수 (max 100) |

**갱신 주기**: 30-60초
**기회 TTL**: 120-600초

**경쟁 상황**: ArbitrageScanner가 "크로스체인" 탐지를 주장하지만 브릿지 비용 상세 미제공. Li.Fi/Socket은 브릿지 견적만 제공하고 아비트라지 기회 미탐지.
**차별점**: 가격 차이 + 브릿지 비용 + 전송 시간을 통합한 순이익 산출

---

### ★ Priority 3 — Expansion (v2)

#### EP-08. Multi-Chain Gas Oracle
```
GET /api/v1/gas/prices
402 Payment Required — $0.001 USDC
```

**프로젝트명**: `GAS-ORACLE`

**정의**: 멀티체인 실시간 가스 가격 + DEX 스왑 트랜잭션 예상 비용 (USD 환산). 모든 온체인 아비트라지의 수익성 판단 기반.

**왜 Priority 3인가**:
- EP-01(DEX-SCAN)에 가스비가 이미 내장되어 있어 **독립 엔드포인트의 긴급성 낮음**
- 하지만 에이전트가 **자체 수익성 계산**을 하고 싶을 때 가치 있음
- x402-api.fly.dev가 이미 7개 EVM 체인 가스 오라클 제공 ($0.0005) — 직접 경쟁하기보다 보완적

**커버리지**: Ethereum, Base, Arbitrum, Polygon, BSC, Optimism, Avalanche, Solana

**응답 구조**:
```json
{
  "chains": [
    {
      "chain": "ethereum",
      "chain_id": 1,
      "gas_prices": {
        "slow": { "gwei": 12, "estimated_seconds": 120, "swap_cost_usd": 8.50 },
        "standard": { "gwei": 18, "estimated_seconds": 30, "swap_cost_usd": 12.80 },
        "fast": { "gwei": 25, "estimated_seconds": 12, "swap_cost_usd": 17.60 }
      },
      "base_fee_gwei": 14.2,
      "priority_fee_gwei": 1.5,
      "block_utilization_pct": 62,
      "native_token_price_usd": 3250.00,
      "estimated_swap_gas": 180000
    },
    {
      "chain": "base",
      "chain_id": 8453,
      "gas_prices": {
        "slow": { "gwei": 0.001, "estimated_seconds": 4, "swap_cost_usd": 0.003 },
        "standard": { "gwei": 0.002, "estimated_seconds": 2, "swap_cost_usd": 0.005 },
        "fast": { "gwei": 0.005, "estimated_seconds": 1, "swap_cost_usd": 0.012 }
      }
    }
  ],
  "meta": { "data_timestamp_ms": 1741600000000, "staleness_seconds": 5 }
}
```

**쿼리 파라미터**: `chain` (선택), `include_l1_fee` (boolean, L2 체인의 L1 데이터 포스팅 비용 포함)
**갱신 주기**: 12초 (블록 생성 주기)
**과금**: $0.001/call (경량 데이터)

---

#### EP-09. Stablecoin De-peg Monitor
```
GET /api/v1/stablecoin/depeg
402 Payment Required — $0.002 USDC
```

**프로젝트명**: `DEPEG-WATCH`

**정의**: USDT, USDC, DAI, FRAX 등 스테이블코인의 $1 이탈을 거래소/체인별로 모니터링. 디페그 발생 시 거대한 아비트라지 기회 탐지.

**왜 Priority 3인가**:
- 이벤트 기반 — 평상시에는 데이터 가치 낮음 (99%의 시간은 $0.999-$1.001)
- 하지만 디페그 발생 시 **극단적 가치** (2023.3 USDC 디페그: $0.87까지 하락, 수시간 내 회복 → 15% 수익 기회)
- 전용 API로 제공하는 서비스 **없음**

**커버리지**:
- 스테이블코인: USDT, USDC, DAI, FRAX, TUSD, USDD, crvUSD, GHO
- 모니터링: CEX 가격, DEX 풀 비율 (Curve 3pool), 발행/소각 이벤트

**응답 구조**:
```json
{
  "stablecoins": [
    {
      "symbol": "USDC",
      "peg_target": 1.0000,
      "status": "stable",
      "prices": {
        "binance": 0.9999,
        "coinbase": 1.0001,
        "uniswap_eth": 0.9998,
        "curve_3pool": 0.9997
      },
      "max_deviation_pct": 0.03,
      "curve_3pool_ratio": 0.334,
      "curve_3pool_ratio_normal": 0.333,
      "24h_mint_volume_usd": 45000000,
      "24h_burn_volume_usd": 38000000,
      "net_flow_24h_usd": 7000000,
      "depeg_risk": "low",
      "arbitrage_opportunity": null
    }
  ],
  "alerts": [],
  "meta": { ... }
}
```

디페그 발생 시 `arbitrage_opportunity` 필드가 활성화:
```json
{
  "arbitrage_opportunity": {
    "buy_venue": "curve_3pool",
    "buy_price": 0.9720,
    "sell_venue": "coinbase",
    "sell_price": 0.9980,
    "spread_pct": 2.67,
    "estimated_recovery_hours": 4,
    "confidence": 0.65,
    "risk_note": "Circle reserve uncertainty"
  }
}
```

**갱신 주기**: 30초 (평상시), 5초 (디페그 감지 시)
**과금**: $0.002/call

---

#### EP-10. Liquidation Opportunity Scanner
```
GET /api/v1/liquidation/opportunities
402 Payment Required — $0.005 USDC
```

**프로젝트명**: `LIQD-SCAN`

**정의**: Aave, Compound, MakerDAO 등 DeFi 렌딩 프로토콜에서 청산 가능한 포지션을 모니터링. 청산 보너스(인센티브)를 포함한 예상 수익 산출.

**왜 Priority 3인가**:
- 높은 잠재 가치 — 청산 보너스는 보통 담보의 5-10%
- 하지만 **구현 복잡도 높음**: 프로토콜별 온체인 데이터 인덱싱, Health Factor 계산, 가격 오라클 연동
- 경쟁이 치열한 영역 (MEV 봇이 밀리초 단위로 경쟁)
- 스캐닝 등급(10-30초)으로는 실행 경쟁력 제한적

**커버리지**:
- 프로토콜: Aave V3 (v1), Compound V3 (v1), MakerDAO (v2)
- 체인: Ethereum, Arbitrum, Base, Polygon
- 데이터: Health Factor < 1.05 포지션, 담보/부채 구성, 청산 보너스

**응답 구조**:
```json
{
  "opportunities": [
    {
      "id": "liq-001",
      "protocol": "aave_v3",
      "chain": "ethereum",
      "borrower_address": "0x...",
      "health_factor": 1.02,
      "total_collateral_usd": 125000,
      "total_debt_usd": 118000,
      "liquidation_threshold": 0.825,
      "collateral_assets": [
        { "symbol": "WETH", "amount": 38.5, "value_usd": 125000 }
      ],
      "debt_assets": [
        { "symbol": "USDC", "amount": 118000, "value_usd": 118000 }
      ],
      "max_liquidation_usd": 59000,
      "liquidation_bonus_pct": 5.0,
      "estimated_profit_usd": 2950,
      "gas_cost_usd": 45,
      "net_profit_usd": 2905,
      "flash_loan_available": true,
      "price_drop_to_liquidation_pct": 0.8,
      "confidence": 0.88,
      "data_timestamp_ms": 1741600000000,
      "staleness_seconds": 12,
      "estimated_ttl_seconds": 60
    }
  ],
  "meta": { ... }
}
```

**갱신 주기**: 12초 (블록 단위)
**과금**: $0.005/call

---

### ★ Priority 4 — Future (v3+)

#### EP-11. NFT Cross-Marketplace Arbitrage
```
GET /api/v1/nft/opportunities
402 Payment Required — $0.005 USDC
```

**프로젝트명**: `NFT-SCAN`

**정의**: OpenSea, Blur, LooksRare, Magic Eden 등 NFT 마켓플레이스 간 동일 NFT 컬렉션의 플로어 가격 차이 탐지.

**왜 Priority 4인가**:
- NFT 시장 유동성 극히 낮음 → 실행 가능한 기회 빈도 적음
- 대체 불가능 자산이라 "동일 아이템" 비교가 컬렉션 레벨로 제한
- NFT 시장 사이클 의존도 높음

---

#### EP-12. Options Volatility Arbitrage
```
GET /api/v1/options/opportunities
402 Payment Required — $0.005 USDC
```

**프로젝트명**: `VOL-SCAN`

**정의**: Deribit, OKX, Binance Options 간 동일 행사가/만기의 옵션 가격 차이 및 내재 변동성(IV) 괴리 탐지.

**왜 Priority 4인가**:
- 크립토 옵션 시장은 Deribit 독점 (~90% 시장 점유)
- 교차 거래소 기회가 상대적으로 적음
- 옵션 가격 모델링(Black-Scholes, Greeks) 복잡

---

#### EP-13. OTC/P2P Premium Tracker
```
GET /api/v1/otc/premium
402 Payment Required — $0.003 USDC
```

**프로젝트명**: `OTC-TRACK`

**정의**: Binance P2P, Paxful, LocalBitcoins 등 OTC/P2P 플랫폼에서의 법정화폐 대비 프리미엄 추적. 김치프리미엄의 글로벌 확장판 (아르헨티나, 나이지리아, 터키 등 자본 통제 국가).

**왜 Priority 4인가**:
- 김치프리미엄(EP-03)과 동일 개념의 글로벌 확장이지만, P2P 데이터 수집이 훨씬 복잡 (호가가 분산/비표준)
- 장기적으로 높은 가치 — "글로벌 크립토 프리미엄 맵"

---

### 전체 엔드포인트 로드맵 요약

```
v1 (Launch)
├── EP-01  DEX-SCAN          $0.005/call   ★ Core
├── EP-02  PREDICT-SCAN      $0.005/call   ★ Core
├── EP-03  KIMCHI-TRACK      $0.003/call   ★ Core
└── EP-04  UNI-SCAN          $0.010/call   ★ Core (통합)

v1.1 (Growth)
├── EP-05  FUND-SCAN         $0.003/call   ★★ 펀딩레이트 아비트라지
├── EP-06  STATUS-CHECK      $0.002/call   ★★ 입출금 상태 (보조)
└── EP-07  BRIDGE-SCAN       $0.005/call   ★★ 크로스체인 브릿지

v2 (Expansion)
├── EP-08  GAS-ORACLE        $0.001/call   ★★★ 멀티체인 가스
├── EP-09  DEPEG-WATCH       $0.002/call   ★★★ 스테이블코인 디페그
└── EP-10  LIQD-SCAN         $0.005/call   ★★★ 청산 기회

v3+ (Future)
├── EP-11  NFT-SCAN          $0.005/call   ★★★★ NFT 아비트라지
├── EP-12  VOL-SCAN          $0.005/call   ★★★★ 옵션 변동성
└── EP-13  OTC-TRACK         $0.003/call   ★★★★ 글로벌 OTC 프리미엄
```

### 가격 전략 요약

| 과금 등급 | 가격 | 해당 엔드포인트 | 근거 |
|----------|------|---------------|------|
| **Micro** | $0.001 | GAS-ORACLE | 경량 데이터, 높은 폴링 빈도 |
| **Light** | $0.002 | STATUS-CHECK, DEPEG-WATCH | 보조 데이터, 중간 폴링 |
| **Standard** | $0.003 | KIMCHI-TRACK, FUND-SCAN, OTC-TRACK | 중간 복잡도 |
| **Premium** | $0.005 | DEX-SCAN, PREDICT-SCAN, BRIDGE-SCAN, LIQD-SCAN, NFT-SCAN, VOL-SCAN | 높은 계산 복잡도 |
| **Bundle** | $0.010 | UNI-SCAN | 3개 Core 통합 (23% 할인) |

### 에이전트 일일 비용 시뮬레이션 (전체 엔드포인트 사용 시)

| 엔드포인트 | 폴링 주기 | 호출/일 | 단가 | 일일 비용 |
|-----------|----------|--------|------|----------|
| DEX-SCAN | 15초 | 5,760 | $0.005 | $28.80 |
| PREDICT-SCAN | 60초 | 1,440 | $0.005 | $7.20 |
| KIMCHI-TRACK | 30초 | 2,880 | $0.003 | $8.64 |
| FUND-SCAN | 60초 | 1,440 | $0.003 | $4.32 |
| STATUS-CHECK | 300초 | 288 | $0.002 | $0.58 |
| BRIDGE-SCAN | 60초 | 1,440 | $0.005 | $7.20 |
| GAS-ORACLE | 12초 | 7,200 | $0.001 | $7.20 |
| DEPEG-WATCH | 30초 | 2,880 | $0.002 | $5.76 |
| **합계** | | **23,328** | | **$69.70/일** |

또는 UNI-SCAN 통합 사용 시:

| 시나리오 | 구성 | 일일 비용 |
|---------|------|----------|
| 최소 (Core만) | UNI-SCAN 60초 | **$14.40** |
| 균형 (Core + Growth) | UNI-SCAN 60초 + FUND + STATUS | **$19.30** |
| 풀 (전체) | 개별 폴링 최적화 | **$69.70** |

---

## 참고 자료

### DEX
- [Uniswap Subgraph](https://docs.uniswap.org/api/subgraph/overview)
- [The Graph Billing](https://thegraph.com/docs/en/subgraphs/billing/)
- [DeFi Llama API](https://api-docs.defillama.com/)
- [CoinGecko DEX API](https://www.coingecko.com/en/api/dex)
- [Flashbots Protect](https://docs.flashbots.net/flashbots-protect/overview)
- [Aave Flash Loans](https://docs.aave.com/developers/guides/flash-loans)

### 예측시장
- [Polymarket CLOB API](https://docs.polymarket.com/developers/CLOB/introduction)
- [Kalshi API](https://docs.kalshi.com/welcome)
- [Manifold API](https://docs.manifold.markets/api)
- [FinFeedAPI](https://www.finfeedapi.com/products/prediction-markets-api)
- [Prediction Market Arbitrage 연구 (arXiv)](https://arxiv.org/html/2508.03474v1)

### 김치프리미엄
- [Upbit API](https://global-docs.upbit.com/)
- [Bithumb API](https://apidocs.bithumb.com/)
- [Korbit API](https://docs.korbit.co.kr/index_en.html)
- [CryptoQuant Korea Premium Index](https://cryptoquant.com/asset/btc/chart/market-data/korea-premium-index)
- [한국수출입은행 환율 API](https://www.data.go.kr/data/3068846/openapi.do)

### x402
- [x402 GitHub (Coinbase)](https://github.com/coinbase/x402)
- [x402.org](https://www.x402.org/)
- [Coinbase x402 Docs](https://docs.cdp.coinbase.com/x402/welcome)
- [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
- [awesome-x402](https://github.com/xpaysh/awesome-x402)

### 경쟁사
- [ArbitrageScanner.io](https://arbitragescanner.io/)
- [Bitsgap](https://bitsgap.com/)
- [CCXT](https://github.com/ccxt/ccxt)
- [Hummingbot](https://github.com/hummingbot/hummingbot)
- [Oddpool](https://www.oddpool.com/arb-dashboard)
- [PredictOS](https://github.com/PredictionXBT/PredictOS)
