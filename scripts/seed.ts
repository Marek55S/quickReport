// Seeds demo tickets around Kraków city centre through the real clustering logic.
// Run: pnpm seed  (deletes all existing tickets first)
import { Storage } from "@google-cloud/storage";
import { deleteAllTickets, submitReport } from "../src/lib/tickets";
import { CATEGORY_LABELS, type Category } from "../src/lib/types";

const COLORS: Record<Category, string> = {
  ROAD_DAMAGE: "#b45309",
  ACCESSIBILITY_BARRIER: "#7c3aed",
  INFRASTRUCTURE_FAILURE: "#dc2626",
  OTHER: "#475569",
};

const DEMO: { category: Category; title: string; lat: number; lng: number; reports: number; report: string }[] = [
  { category: "ROAD_DAMAGE", title: "Głęboka wyrwa w jezdni", lat: 50.06465, lng: 19.94498, reports: 7,
    report: "Uprzejmie informuję o głębokiej wyrwie w nawierzchni jezdni, stanowiącej zagrożenie dla bezpieczeństwa ruchu drogowego. Wnoszę o pilne zabezpieczenie miejsca i naprawę nawierzchni." },
  { category: "ACCESSIBILITY_BARRIER", title: "Brak obniżenia krawężnika przy przejściu", lat: 50.06171, lng: 19.93736, reports: 4,
    report: "Zgłaszam brak obniżenia krawężnika przy przejściu dla pieszych, co uniemożliwia bezpieczne przejście osobom poruszającym się na wózkach oraz z wózkami dziecięcymi. Wnoszę o dostosowanie przejścia do potrzeb osób z niepełnosprawnościami." },
  { category: "INFRASTRUCTURE_FAILURE", title: "Niedziałająca latarnia uliczna", lat: 50.05795, lng: 19.93812, reports: 3,
    report: "Informuję o niedziałającym oświetleniu ulicznym, co w porze wieczornej obniża bezpieczeństwo pieszych. Proszę o naprawę latarni." },
  { category: "ROAD_DAMAGE", title: "Zapadnięte płyty chodnikowe", lat: 50.06802, lng: 19.94733, reports: 2,
    report: "Zgłaszam zapadnięte i obluzowane płyty chodnikowe, grożące potknięciem i upadkiem pieszych. Wnoszę o naprawę nawierzchni chodnika." },
  { category: "OTHER", title: "Nielegalne wysypisko odpadów", lat: 50.05301, lng: 19.94402, reports: 1,
    report: "Informuję o nielegalnie porzuconych odpadach wielkogabarytowych na terenie publicznym. Proszę o ich usunięcie." },
  { category: "INFRASTRUCTURE_FAILURE", title: "Uszkodzona wiata przystankowa", lat: 50.06633, lng: 19.92991, reports: 1,
    report: "Zgłaszam uszkodzoną wiatę przystankową (rozbita szyba), stwarzającą ryzyko skaleczenia pasażerów. Wnoszę o zabezpieczenie i naprawę." },
];

function placeholder(category: Category, title: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="${COLORS[category]}"/>
  <text x="320" y="225" font-family="sans-serif" font-size="30" fill="#fff" text-anchor="middle">${title}</text>
  <text x="320" y="270" font-family="sans-serif" font-size="20" fill="#fff" opacity="0.8" text-anchor="middle">${CATEGORY_LABELS[category]} · zdjęcie demo</text>
</svg>`;
}

async function main() {
  await deleteAllTickets();
  const bucket = new Storage().bucket(process.env.GCS_BUCKET!);
  for (const item of DEMO) {
    const imagePath = `seed/${item.category.toLowerCase()}-${item.lat}-${item.lng}.svg`;
    await bucket.file(imagePath).save(placeholder(item.category, item.title), { contentType: "image/svg+xml" });
    let result;
    for (let i = 0; i < item.reports; i++) {
      // A few metres of jitter, as real phones would report.
      result = await submitReport({
        category: item.category,
        title: item.title,
        formal_report: item.report,
        lat: item.lat + i * 0.000005,
        lng: item.lng + i * 0.000005,
        imagePath,
      });
    }
    console.log(`${item.title}: ticket ${result!.ticketId}, severity ${result!.severity_score}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
