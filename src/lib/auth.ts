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
  return isValidSession(cookieValue(request, SESSION_COOKIE));
}

export function unauthorized(): Response {
  return Response.json({ error: "Wymagane logowanie" }, { status: 401 });
}

// ---- Resident identity (simulated mObywatel) ----
// Production would take the subject identifier from login.gov.pl; the prototype uses one demo identity.
export const CITIZEN_COOKIE = "qr_citizen";
export const CITIZEN_MAX_AGE_S = 30 * 24 * 60 * 60;
export const DEMO_CITIZEN = { id: "demo-citizen-jan-kowalski", name: "Jan Kowalski" } as const;

export function citizenLoginEnabled(): boolean {
  return Boolean(secret());
}

export function createCitizenToken(citizenId: string): string {
  const expires = String(Date.now() + CITIZEN_MAX_AGE_S * 1000);
  const payload = `${citizenId}.${expires}`;
  return `${payload}.${sign(`citizen:${payload}`)}`;
}

function cookieValue(request: Request, name: string): string | undefined {
  const raw = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([key]) => key === name)?.[1];
  return raw && decodeURIComponent(raw);
}

/** Verified citizen id from the session cookie, or null. */
export function readCitizen(request: Request): string | null {
  const token = cookieValue(request, CITIZEN_COOKIE);
  if (!token || !secret()) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, expires, signature] = parts;
  if (!safeEqual(signature, sign(`citizen:${id}.${expires}`)) || Number(expires) <= Date.now()) return null;
  return id;
}
