export const AUTH_COOKIE_NAME = "mango_procurement_session";

const SESSION_TTL_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  uid: string;
  exp: number;
};

export async function createSessionCookieValue(userId: string) {
  const payload = encodeBase64Url(
    JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })
  );
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export async function verifySessionCookie(value: string | undefined) {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;

  const expected = await sign(payload);
  if (signature !== expected) return false;

  try {
    const session = JSON.parse(decodeBase64Url(payload)) as SessionPayload;
    return Boolean(session.uid) && typeof session.exp === "number" && session.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  };
}

export function hasLoginConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && getAuthSecret());
}

function getAuthSecret() {
  return process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function sign(payload: string) {
  const secret = getAuthSecret();
  if (!secret) return "";

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return encodeBase64Url(String.fromCharCode(...new Uint8Array(signature)));
}

function encodeBase64Url(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}
