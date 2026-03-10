import { Hono } from "hono";
import { scanPredictionArbitrage } from "../services/prediction/scanner.js";

const prediction = new Hono();

prediction.get("/", async (c) => {
  const result = await scanPredictionArbitrage();
  return c.json({ ...result, request_cost_usdc: 0.002 });
});

export default prediction;
