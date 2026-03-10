import { Hono } from "hono";
import { scanKimchiPremium } from "../services/kimchi/scanner.js";

const kimchi = new Hono();

kimchi.get("/", async (c) => {
  const result = await scanKimchiPremium();
  return c.json({ ...result, request_cost_usdc: 0.001 });
});

export default kimchi;
