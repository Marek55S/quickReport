// Seeds illustrative demo tickets around Kraków city centre through the real clustering logic.
// Photos: freely licensed Wikimedia Commons images in scripts/seed-images (see docs/ATTRIBUTION.md).
// Run: pnpm seed  (replaces previous demo tickets; real reports are kept)
import { readFileSync } from "node:fs";
import { Timestamp } from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";
import { db } from "../src/lib/firestore";
import { reverseGeocode } from "../src/lib/geocode";
import { deleteSeedTickets, setTicketStatus, submitReport } from "../src/lib/tickets";
import type { Category, TicketStatus } from "../src/lib/types";

type Demo = {
  category: Category;
  title: string;
  report: string;
  danger: [number, string];
  lat: number;
  lng: number;
  photos: string[];
  reports: number;
  /** Days ago the first report arrived. */
  age: number;
  status?: TicketStatus;
  resolution?: { photo: string; note: string; afterDays: number };
};

const DEMO: Demo[] = [
  {
    category: "ROAD_DAMAGE",
    title: "Głęboka wyrwa w jezdni",
    report:
      "Szanowni Państwo, uprzejmie informuję o głębokiej wyrwie w nawierzchni jezdni, stanowiącej zagrożenie dla bezpieczeństwa ruchu drogowego. Ubytek ma ostre krawędzie i znajduje się na pasie ruchu. Wnoszę o pilne zabezpieczenie miejsca i naprawę nawierzchni.",
    danger: [4, "Głęboka wyrwa na pasie ruchu grozi uszkodzeniem pojazdów i upadkiem rowerzystów."],
    lat: 50.06465,
    lng: 19.94498,
    photos: ["pothole-deep"],
    reports: 7,
    age: 9,
  },
  {
    category: "ROAD_DAMAGE",
    title: "Zapadnięte płyty chodnikowe",
    report:
      "Szanowni Państwo, zgłaszam zapadnięte i wypiętrzone płyty chodnikowe przy drzewie, grożące potknięciem i upadkiem pieszych, szczególnie po zmroku i w czasie opadów. Wnoszę o naprawę nawierzchni chodnika.",
    danger: [3, "Wystające krawędzie płyt na ciągu pieszym grożą potknięciem i upadkiem."],
    lat: 50.06681,
    lng: 19.93005,
    photos: ["pavement"],
    reports: 4,
    age: 12,
  },
  {
    category: "PUBLIC_TRANSPORT",
    title: "Wybita szyba w wiacie przystankowej",
    report:
      "Szanowni Państwo, informuję o wybitej szybie w wiacie przystankowej. Odłamki szkła leżą na chodniku i ławce, co stwarza ryzyko skaleczenia oczekujących pasażerów. Wnoszę o uprzątnięcie szkła i wymianę szyby.",
    danger: [3, "Odłamki szkła przy ławce grożą skaleczeniem pasażerów, w tym dzieci."],
    lat: 50.06633,
    lng: 19.92991,
    photos: ["shelter", "shelter-2"],
    reports: 3,
    age: 4,
  },
  {
    category: "INFRASTRUCTURE_FAILURE",
    title: "Uszkodzona oprawa latarni",
    report:
      "Szanowni Państwo, zgłaszam uszkodzoną, przekrzywioną oprawę latarni ulicznej. Element może odpaść, a oświetlenie ulicy jest niewystarczające. Proszę o zabezpieczenie i naprawę latarni.",
    danger: [2, "Przekrzywiona oprawa może spaść; ulica jest gorzej oświetlona."],
    lat: 50.05795,
    lng: 19.93812,
    photos: ["lamp"],
    reports: 2,
    age: 6,
    status: "IN_PROGRESS",
  },
  {
    category: "WASTE",
    title: "Dzikie wysypisko przy drodze",
    report:
      "Szanowni Państwo, informuję o nielegalnie porzuconych odpadach, w tym gruzie i workach ze śmieciami, na poboczu drogi. Proszę o ich usunięcie i rozważenie monitoringu miejsca.",
    danger: [2, "Odpady zawężają przejście i mogą zawierać materiały niebezpieczne."],
    lat: 50.05301,
    lng: 19.94402,
    photos: ["dumping"],
    reports: 1,
    age: 2,
  },
  {
    category: "INFRASTRUCTURE_FAILURE",
    title: "Przewrócona tablica z nazwą ulicy",
    report:
      "Szanowni Państwo, zgłaszam przewróconą tablicę z nazwą ulicy, która leży w zaroślach przy jezdni. Proszę o jej ponowne zamontowanie.",
    danger: [1, "Brak bezpośredniego zagrożenia; utrudniona orientacja w terenie."],
    lat: 50.0702,
    lng: 19.9468,
    photos: ["sign"],
    reports: 1,
    age: 1,
  },
  {
    category: "ROAD_DAMAGE",
    title: "Dziura w jezdni przy krawężniku",
    report:
      "Szanowni Państwo, zgłaszam ubytek w nawierzchni jezdni przy krawędzi drogi, w którym zbiera się woda. Wnoszę o uzupełnienie nawierzchni.",
    danger: [3, "Ubytek przy krawędzi jezdni grozi uszkodzeniem kół i wywrotką rowerzysty."],
    lat: 50.0611,
    lng: 19.9512,
    photos: ["pothole-small"],
    reports: 2,
    age: 13,
    status: "RESOLVED",
    resolution: { photo: "repaired", note: "Ubytek uzupełniony masą asfaltową.", afterDays: 3 },
  },
];

const daysAgo = (days: number) => Timestamp.fromMillis(Date.now() - days * 86_400_000);

async function main() {
  console.log(`Usunięto poprzednie zgłoszenia demo: ${await deleteSeedTickets()}`);
  const bucket = new Storage().bucket(process.env.GCS_BUCKET!);
  const uploaded = new Set<string>();
  const upload = async (name: string) => {
    const path = `seed/${name}.jpg`;
    if (!uploaded.has(name)) {
      await bucket.file(path).save(readFileSync(`scripts/seed-images/${name}.jpg`), { contentType: "image/jpeg" });
      uploaded.add(name);
    }
    return path;
  };

  for (const item of DEMO) {
    const address = await reverseGeocode(item.lat, item.lng);
    let ticketId = "";
    for (let i = 0; i < item.reports; i++) {
      const result = await submitReport({
        category: item.category,
        title: item.title,
        formal_report: item.report,
        danger_level: item.danger[0],
        danger_reason: item.danger[1],
        // A few metres of jitter, as real phones would report.
        lat: item.lat + i * 0.000005,
        lng: item.lng + i * 0.000005,
        locationSource: "device",
        imagePath: await upload(item.photos[i % item.photos.length]),
        address,
      });
      ticketId = result.ticketId;
    }

    // Spread report times over the past days so the statistics view has history (illustrative data).
    const ticketRef = db.collection("tickets").doc(ticketId);
    const submissions = await db.collection("reports").where("ticket_id", "==", ticketId).get();
    await Promise.all(
      submissions.docs.map((doc, i) =>
        doc.ref.update({ created_at: daysAgo(item.age - (i * item.age) / Math.max(item.reports, 1)) }),
      ),
    );
    await ticketRef.update({ created_at: daysAgo(item.age), updated_at: daysAgo(Math.max(item.age - 1, 0)) });

    if (item.status === "IN_PROGRESS") {
      await setTicketStatus(ticketId, "IN_PROGRESS");
      await ticketRef.update({ in_progress_at: daysAgo(Math.max(item.age - 2, 0)) });
    }
    if (item.status === "RESOLVED" && item.resolution) {
      await setTicketStatus(ticketId, "RESOLVED", {
        imagePath: await upload(item.resolution.photo),
        note: item.resolution.note,
      });
      await ticketRef.update({
        in_progress_at: daysAgo(item.age - 1),
        resolved_at: daysAgo(item.age - item.resolution.afterDays),
      });
    }
    console.log(`${item.title}: ${item.reports} zgł., zagrożenie ${item.danger[0]}, ${address ?? "brak adresu"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
