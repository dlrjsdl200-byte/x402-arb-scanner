import { serve } from "@hono/node-server";
import app from "./app.js";

const PORT = parseInt(process.env.PORT || "3001", 10);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\nArbitrage Scanner running on http://localhost:${PORT}`);
  console.log(`Kimchi:     http://localhost:${PORT}/scan/kimchi`);
  console.log(`DEX:        http://localhost:${PORT}/scan/dex`);
  console.log(`Prediction: http://localhost:${PORT}/scan/prediction`);
  console.log(`Unified:    http://localhost:${PORT}/scan/all`);
  console.log(`Health:     http://localhost:${PORT}/health\n`);
});
