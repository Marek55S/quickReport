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

/** Simulated mObywatel login: sets the citizen session cookie and attaches this device's reports. */
export async function signInCitizen(): Promise<boolean> {
  const res = await fetch("/api/citizen/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter_id: getReporterId() }),
  }).catch(() => null);
  return Boolean(res?.ok);
}

export async function signOutCitizen(): Promise<void> {
  await fetch("/api/citizen/logout", { method: "POST" }).catch(() => null);
}
