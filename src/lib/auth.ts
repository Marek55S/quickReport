import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Shared-password login for the official dashboard (prototype; no per-user accounts).
export const SESSION_COOKIE = "qr_admin";
export const SESSION_MAX_AGE_S = 8 * 60 * 60;

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  // Hash first so inputs of different length compare in constant time.
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/** False when ADMIN_PASSWORD is not configured, so the dashboard stays closed. */
export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && safeEqual(password, expected!);
}

/** Session token: "<expiry ms>.<HMAC of expiry>". */
export function createSessionToken(): string {
  const expires = String(Date.now() + SESSION_MAX_AGE_S * 1000);
  return `${expires}.${sign(expires)}`;
}

export function isValidSession(token: string | undefined): boolean {
  if (!token || !secret()) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !safeEqual(signature, sign(expires))) return false;
  return Number(expires) > Date.now();
}

export function isAdminRequest(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === SESSION_COOKIE)?.[1];
  return isValidSession(token && decodeURIComponent(token));
}

export function unauthorized(): Response {
  return Response.json({ error: "Wymagane logowanie" }, { status: 401 });
}
