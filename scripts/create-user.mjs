import { existsSync, readFileSync } from "node:fs";
import { randomBytes, webcrypto } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

loadDotEnvLocal();

const [username, password, fullName = ""] = process.argv.slice(2);

if (!username || !password) {
  console.error("Usage: node scripts/create-user.mjs <username> <password> [full name]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const iterations = 210_000;
const salt = encodeBase64Url(randomBytes(16));
const passwordHash = await hashPassword(password, salt, iterations);
const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const { error } = await supabase.from("app_users").upsert(
  {
    username: username.trim().toLowerCase(),
    full_name: fullName || null,
    password_hash: passwordHash,
    password_salt: salt,
    password_iterations: iterations,
    is_active: true
  },
  { onConflict: "username" }
);

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Saved user: ${username.trim().toLowerCase()}`);

async function hashPassword(value, saltValue, iterationCount) {
  const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(value), "PBKDF2", false, ["deriveBits"]);
  const bits = await webcrypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: decodeBase64Url(saltValue),
      iterations: iterationCount
    },
    key,
    256
  );
  return encodeBase64Url(new Uint8Array(bits));
}

function encodeBase64Url(bytes) {
  const buffer = typeof bytes === "string" ? Buffer.from(bytes) : Buffer.from(bytes);
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function loadDotEnvLocal() {
  if (!existsSync(".env.local")) return;
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
