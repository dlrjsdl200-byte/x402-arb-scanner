import { Hono } from "hono";
import { scanAll } from "../services/unified/scanner.js";

const unified = new Hono();

unified.get("/", async (c) => {
  const result = await scanAll();
  return c.json(result);
});

export default unified;
