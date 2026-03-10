import { Hono } from "hono";
import { scanDexArbitrage } from "../services/dex/scanner.js";

const dex = new Hono();

dex.get("/", async (c) => {
  const minSpread = parseFloat(c.req.query("min_spread") ?? "0");
  const result = await scanDexArbitrage(isNaN(minSpread) ? 0 : minSpread);
  return c.json({ ...result, request_cost_usdc: 0.002 });
});

export default dex;
