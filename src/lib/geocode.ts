// Approximate street address from GPS via OpenStreetMap Nominatim.
// Usage policy: identifying User-Agent, at most 1 request per second, cache results.
const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "QuickReport/0.1 (HackYeah 2026 prototype; https://quickreport-875960213491.europe-central2.run.app)";
const TIMEOUT_MS = 4000;

const cache = new Map<string, string | null>();
let queue: Promise<unknown> = Promise.resolve();

type NominatimAddress = Record<string, string | undefined>;

function format(a: NominatimAddress): string | null {
  const street = a.road ?? a.pedestrian ?? a.footway ?? a.square ?? a.path;
  const place = street ? [street, a.house_number].filter(Boolean).join(" ") : (a.amenity ?? a.neighbourhood);
  const area = a.suburb ?? a.quarter ?? a.city_district ?? a.neighbourhood;
  const city = a.city ?? a.town ?? a.village;
  const parts = [place, area !== place ? area : undefined, city].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Returns e.g. "Długa 12, Stare Miasto, Kraków", or null when unavailable. Never throws. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (cache.has(key)) return cache.get(key)!;

  // Serialise requests and space them by ≥ 1 s.
  const run = queue.then(async () => {
    try {
      const url = `${ENDPOINT}?format=jsonv2&zoom=18&addressdetails=1&accept-language=pl&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) return null;
      const data = (await res.json()) as { address?: NominatimAddress };
      return data.address ? format(data.address) : null;
    } catch {
      return null;
    }
  });
  queue = run.then(() => new Promise((resolve) => setTimeout(resolve, 1000)));
  const address = await run;
  cache.set(key, address);
  return address;
}
