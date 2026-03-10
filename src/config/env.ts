import "dotenv/config";

export const env = {
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || "",
  CDP_API_KEY_ID: process.env.CDP_API_KEY_ID || "",
  CDP_API_KEY_SECRET: process.env.CDP_API_KEY_SECRET || "",
} as const;

export function hasPaymentConfig(): boolean {
  return !!(env.WALLET_ADDRESS && env.CDP_API_KEY_ID && env.CDP_API_KEY_SECRET);
}
