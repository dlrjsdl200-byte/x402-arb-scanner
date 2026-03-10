import { Hono } from "hono";
import { scanAll } from "../services/unified/scanner.js";

const unified = new Hono();

unified.get("/", async (c) => {
  const result = await scanAll();
  return c.json({ ...result, request_cost_usdc: 0.003 });
});

export default unified;
