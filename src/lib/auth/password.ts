const DEFAULT_ITERATIONS = 210_000;

export async function verifyPassword({
  password,
  salt,
  hash,
  iterations
}: {
  password: string;
  salt: string;
  hash: string;
  iterations: number;
}) {
  const candidate = await hashPassword(password, salt, iterations);
  return timingSafeEqual(candidate, hash);
}

export async function hashPassword(password: string, salt: string, iterations = DEFAULT_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: decodeBase64Url(salt),
      iterations
    },
    key,
    256
  );
  return encodeBase64Url(new Uint8Array(bits));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

function encodeBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}
