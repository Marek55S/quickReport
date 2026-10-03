import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

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
// Production would take the subject identifier from login.gov.pl. The prototype gives every browser its own
// fictional person: a random citizen id kept in a signed session, with a stable made-up name and masked PESEL.
export const CITIZEN_COOKIE = "qr_citizen";
export const CITIZEN_MAX_AGE_S = 30 * 24 * 60 * 60;

export type CitizenProfile = { name: string; pesel: string };

export function citizenLoginEnabled(): boolean {
  return Boolean(secret());
}

export function newCitizenId(): string {
  return `c-${randomUUID()}`;
}

export function createCitizenToken(citizenId: string): string {
  const expires = String(Date.now() + CITIZEN_MAX_AGE_S * 1000);
  const payload = `${citizenId}.${expires}`;
  return `${payload}.${sign(`citizen:${payload}`)}`;
}

/** Citizen id from a signed token; `allowExpired` lets the same browser get its person back after the session ends. */
export function verifyCitizenToken(token: string | undefined, allowExpired = false): string | null {
  if (!token || !secret()) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, expires, signature] = parts;
  if (!safeEqual(signature, sign(`citizen:${id}.${expires}`))) return null;
  if (!allowExpired && Number(expires) <= Date.now()) return null;
  return id;
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
  return verifyCitizenToken(cookieValue(request, CITIZEN_COOKIE));
}

const FIRST = {
  f: ["Anna", "Maria", "Katarzyna", "Agnieszka", "Magdalena", "Joanna", "Zofia", "Natalia", "Ewa", "Julia",
      "Aleksandra", "Barbara", "Karolina", "Monika", "Paulina", "Weronika", "Hanna", "Oliwia", "Dorota", "Marta"],
  m: ["Piotr", "Jan", "Tomasz", "Paweł", "Michał", "Krzysztof", "Jakub", "Marcin", "Andrzej", "Mateusz",
      "Adam", "Bartosz", "Dawid", "Grzegorz", "Kamil", "Łukasz", "Marek", "Szymon", "Wojciech", "Antoni"],
};
const LAST = {
  f: ["Nowak", "Kowalska", "Wiśniewska", "Wójcik", "Kamińska", "Lewandowska", "Zielińska", "Szymańska", "Woźniak", "Dąbrowska",
      "Kozłowska", "Jankowska", "Mazur", "Kwiatkowska", "Krawczyk", "Piotrowska", "Grabowska", "Nowakowska", "Pawłowska", "Michalska"],
  m: ["Nowak", "Kowalski", "Wiśniewski", "Wójcik", "Kamiński", "Lewandowski", "Zieliński", "Szymański", "Woźniak", "Dąbrowski",
      "Kozłowski", "Jankowski", "Mazur", "Kwiatkowski", "Krawczyk", "Piotrowski", "Grabowski", "Nowakowski", "Pawłowski", "Michalski"],
};

/** Stable fictional personal data derived from the citizen id (never real data). */
export function citizenProfile(citizenId: string): CitizenProfile {
  const h = createHash("sha256").update(citizenId).digest();
  const g = h[0] % 2 ? "f" : "m";
  const digits = String(h.readUInt16BE(3) % 10000).padStart(4, "0");
  return { name: `${FIRST[g][h[1] % FIRST[g].length]} ${LAST[g][h[2] % LAST[g].length]}`, pesel: `•••••••${digits}` };
}
