import type { MiddlewareHandler } from "hono";

export const cors: MiddlewareHandler = async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-PAYMENT, Payment-Signature");

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  await next();
};
