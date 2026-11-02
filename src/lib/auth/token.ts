import { jwtVerify, SignJWT } from "jose";

/**
 * Signs and verifies session JWTs.
 * proxy.ts imports this too, so it avoids next/headers and "server-only".
 */

export const SESSION_COOKIE_NAME = "dopyu_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const ISSUER = "dopyu";
const AUDIENCE = "dopyu:web";
const DEV_FALLBACK_SECRET = "dopyu-development-only-secret-do-not-use-in-production";

let cachedKey: Uint8Array | null = null;
let warned = false;

function getSecretKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) {
    cachedKey = new TextEncoder().encode(secret);
    return cachedKey;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is missing or shorter than 32 characters. Set it in .env (see .env.example).",
    );
  }
  if (!warned) {
    warned = true;
    console.warn("[dopyu] AUTH_SECRET is not set; using the fixed development key.");
  }
  cachedKey = new TextEncoder().encode(DEV_FALLBACK_SECRET);
  return cachedKey;
}

export type SessionPayload = {
  userId: string;
};

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * Returns null when the token is invalid or expired.
 * Missing configuration (no AUTH_SECRET in production) is a real error, so it throws.
 */
export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const key = getSecretKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return typeof payload.sub === "string" && payload.sub.length > 0
      ? { userId: payload.sub }
      : null;
  } catch {
    return null;
  }
}
