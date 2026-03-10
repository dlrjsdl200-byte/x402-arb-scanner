import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { createCdpFacilitatorConfig } from "./lib/cdp-auth.js";
import { env, hasPaymentConfig } from "./config/env.js";
import { allRoutes, PRICES } from "./config/pricing.js";
import { cors } from "./middleware/cors.js";
import kimchiRouter from "./routes/kimchi.js";
import dexRouter from "./routes/dex.js";
import predictionRouter from "./routes/prediction.js";
import unifiedRouter from "./routes/unified.js";

const app = new Hono();

// Global middleware
app.use("*", cors);

// ── Public routes ──

app.get("/", (c) =>
  c.json({
    name: "Arbitrage Opportunity Scanner",
    version: "1.0.0",
    protocol: "x402",
    endpoints: {
      "/scan/kimchi": `Kimchi premium tracker — ${PRICES.kimchi} USDC/call`,
      "/scan/dex": `DEX arbitrage scanner — ${PRICES.dex} USDC/call`,
      "/scan/prediction": `Prediction market arbitrage — ${PRICES.prediction} USDC/call`,
      "/scan/all": `Unified scanner (all types) — ${PRICES.unified} USDC/call`,
      "/health": "Health check",
      "/llms.txt": "AI discovery file",
    },
    payment: {
      protocol: "x402 (HTTP 402 Payment Required)",
      currency: "USDC",
      network: "Base (eip155:8453)",
      how: "GET endpoint → 402 response → sign with x402-axios → resend with X-PAYMENT header",
    },
  }),
);

app.get("/health", (c) =>
  c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    payment_configured: hasPaymentConfig(),
  }),
);

app.get("/llms.txt", (c) => {
  const content = `# Arbitrage Opportunity Scanner
> x402 pay-per-call API for real-time arbitrage opportunity detection

## Endpoints (all require x402 USDC payment on Base)

### /scan/kimchi — ${PRICES.kimchi} USDC
Kimchi premium tracker. 3-tier calculation (official FX, effective FX via USDT/KRW, executable bid/ask).
Tracks BTC, ETH, XRP, SOL, DOGE across Upbit (KR) vs Binance (global).

### /scan/dex — ${PRICES.dex} USDC
DEX arbitrage scanner. Cross-exchange price discrepancy detection.
Query params: ?min_spread=0.1 (minimum spread % to filter)

### /scan/prediction — ${PRICES.prediction} USDC
Prediction market arbitrage. Intra-market probability mispricing on Polymarket.
Detects when outcome prices don't sum to 1.0.

### /scan/all — ${PRICES.unified} USDC
Unified scanner. All arbitrage types in one call.

## Payment
All paid endpoints use x402 protocol. Send GET request, receive 402 with payment details,
sign USDC payment on Base network, resend with X-PAYMENT header.
`;
  return c.text(content);
});

// ── Paid routes (x402) ──

if (hasPaymentConfig()) {
  const facilitatorClient = new HTTPFacilitatorClient(
    createCdpFacilitatorConfig(env.CDP_API_KEY_ID, env.CDP_API_KEY_SECRET),
  );
  const server = new x402ResourceServer(facilitatorClient);
  server.register("eip155:8453", new ExactEvmScheme());

  app.use("/scan/*", paymentMiddleware(allRoutes(), server));

  app.route("/scan/kimchi", kimchiRouter);
  app.route("/scan/dex", dexRouter);
  app.route("/scan/prediction", predictionRouter);
  app.route("/scan/all", unifiedRouter);
} else {
  const noPayment = new Hono();
  noPayment.all("*", (c) =>
    c.json(
      { error: "Payment not configured. Set WALLET_ADDRESS, CDP_API_KEY_ID, CDP_API_KEY_SECRET." },
      503,
    ),
  );
  app.route("/scan/kimchi", noPayment);
  app.route("/scan/dex", noPayment);
  app.route("/scan/prediction", noPayment);
  app.route("/scan/all", noPayment);
}

// Error handler
app.onError((err, c) => {
  console.error("[ERROR]", err.message);
  return c.json({ error: "Internal server error" }, 500);
});

// 404
app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
