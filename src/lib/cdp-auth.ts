import type { FacilitatorConfig } from "@x402/core/server";
import { SignJWT, importPKCS8 } from "jose";
import crypto from "node:crypto";

const FACILITATOR_URL = "https://api.cdp.coinbase.com/platform/v2/x402";
const FACILITATOR_HOST = "api.cdp.coinbase.com";

export function createCdpFacilitatorConfig(
  apiKeyId: string,
  apiKeySecret: string,
): FacilitatorConfig {
  return {
    url: FACILITATOR_URL,
    createAuthHeaders: createCdpAuthHeaders(apiKeyId, apiKeySecret),
  };
}

function createCdpAuthHeaders(apiKeyId: string, apiKeySecret: string) {
  return async () => {
    const headers = {} as {
      verify: Record<string, string>;
      settle: Record<string, string>;
      supported: Record<string, string>;
    };
    if (apiKeyId && apiKeySecret) {
      headers.verify = {
        Authorization: await createAuthHeader(apiKeyId, apiKeySecret, "POST", FACILITATOR_HOST, "/platform/v2/x402/verify"),
      };
      headers.settle = {
        Authorization: await createAuthHeader(apiKeyId, apiKeySecret, "POST", FACILITATOR_HOST, "/platform/v2/x402/settle"),
      };
      headers.supported = {
        Authorization: await createAuthHeader(apiKeyId, apiKeySecret, "GET", FACILITATOR_HOST, "/platform/v2/x402/supported"),
      };
    }
    return headers;
  };
}

async function createAuthHeader(
  apiKeyId: string,
  apiKeySecret: string,
  method: string,
  host: string,
  path: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString("hex");

  const claims = {
    sub: apiKeyId,
    iss: "cdp",
    uris: [`${method} ${host}${path}`],
  };

  let jwt: string;

  if (apiKeySecret.includes("BEGIN EC PRIVATE KEY")) {
    const key = await importPKCS8(apiKeySecret, "ES256");
    jwt = await new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256", kid: apiKeyId, nonce, typ: "JWT" })
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + 120)
      .sign(key);
  } else {
    // Ed25519 key (base64)
    const keyBytes = Buffer.from(apiKeySecret, "base64");
    const seed = keyBytes.length === 64 ? keyBytes.slice(0, 32) : keyBytes;
    const pkcs8 = Buffer.concat([
      Buffer.from("302e020100300506032b657004220420", "hex"),
      seed,
    ]);
    const key = await importPKCS8(
      `-----BEGIN PRIVATE KEY-----\n${pkcs8.toString("base64")}\n-----END PRIVATE KEY-----`,
      "EdDSA",
    );
    jwt = await new SignJWT(claims)
      .setProtectedHeader({ alg: "EdDSA", kid: apiKeyId, nonce, typ: "JWT" })
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + 120)
      .sign(key);
  }

  return `Bearer ${jwt}`;
}
