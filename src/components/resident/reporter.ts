// Anonymous per-device identity for "Moje zgłoszenia" (mObywatel login is only simulated).
const KEY = "quickreport.reporterId";

/** Returns this device's reporter id, creating it on first use; null when storage is unavailable. */
export function getReporterId(): string | null {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export type CitizenProfile = { name: string; pesel: string };

// Signed token of this browser's simulated person, so signing in again returns the same person.
const CITIZEN_KEY = "quickreport.citizen";

function readHint(): string | null {
  try {
    return localStorage.getItem(CITIZEN_KEY);
  } catch {
    return null;
  }
}

/** Simulated mObywatel login: returns this browser's person and attaches the device's anonymous reports. */
export async function signInCitizen(): Promise<CitizenProfile | null> {
  const res = await fetch("/api/citizen/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter_id: getReporterId(), previous: readHint() }),
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = (await res.json()) as { profile: CitizenProfile; token: string };
  try {
    localStorage.setItem(CITIZEN_KEY, data.token);
  } catch {
    // Without storage the session cookie still works until it expires.
  }
  return data.profile;
}

export async function currentCitizen(): Promise<{ profile: CitizenProfile | null; available: boolean }> {
  const res = await fetch("/api/citizen/me", { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return { profile: null, available: false };
  const data = await res.json();
  return { profile: data.profile, available: data.login_available };
}

/** "Nie Ty?" – ends the session and forgets the person, so the next login creates a different one. */
export async function signOutCitizen(): Promise<void> {
  await fetch("/api/citizen/logout", { method: "POST" }).catch(() => null);
  try {
    localStorage.removeItem(CITIZEN_KEY);
  } catch {
    // Nothing stored.
  }
}
