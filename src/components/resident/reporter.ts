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
