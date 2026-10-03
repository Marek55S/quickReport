// End-to-end check of the clustering rules against the configured Firestore.
// Run: pnpm check:clustering  (creates test tickets far from any city and deletes them)
import assert from "node:assert/strict";
import { db } from "../src/lib/firestore";
import { setTicketStatus, submitReport } from "../src/lib/tickets";

const base = {
  title: "Test clustering",
  formal_report: "Automatyczny test klastrowania zgłoszeń – do usunięcia.",
  imagePath: "test/none.jpg",
};
// Point in the Baltic Sea, so test data never mixes with demo data.
const spot = { lat: 55.000001, lng: 18.000001 };
const created = new Set<string>();

async function main() {
  const first = await submitReport({ ...base, ...spot, category: "ROAD_DAMAGE" });
  created.add(first.ticketId);
  assert.equal(first.merged, false);
  assert.equal(first.severity_score, 1);

  const second = await submitReport({ ...base, lat: spot.lat + 0.00002, lng: spot.lng, category: "ROAD_DAMAGE" });
  assert.equal(second.ticketId, first.ticketId, "same cell + category must merge");
  assert.equal(second.merged, true);
  assert.equal(second.severity_score, 2);

  const images = await db.collection("tickets").doc(first.ticketId).collection("images").get();
  assert.equal(images.size, 2, "merged report attaches its image");

  // Same category one cell away (8-char cells are ~19 m tall) still joins the ticket.
  const neighbour = await submitReport({ ...base, lat: spot.lat + 0.0002, lng: spot.lng, category: "ROAD_DAMAGE" });
  assert.equal(neighbour.ticketId, first.ticketId, "neighbouring cell must merge");
  assert.equal(neighbour.severity_score, 3);

  const far = await submitReport({ ...base, lat: spot.lat + 0.002, lng: spot.lng, category: "ROAD_DAMAGE" });
  created.add(far.ticketId);
  assert.notEqual(far.ticketId, first.ticketId, "report ~220 m away must not merge");

  const other = await submitReport({ ...base, ...spot, category: "ACCESSIBILITY_BARRIER" });
  created.add(other.ticketId);
  assert.notEqual(other.ticketId, first.ticketId, "different category must not merge");

  const concurrent = await Promise.all(
    [1, 2, 3].map(() => submitReport({ ...base, ...spot, category: "INFRASTRUCTURE_FAILURE" })),
  );
  concurrent.forEach((r) => created.add(r.ticketId));
  assert.equal(new Set(concurrent.map((r) => r.ticketId)).size, 1, "concurrent reports must merge");
  const merged = await db.collection("tickets").doc(concurrent[0].ticketId).get();
  assert.equal(merged.get("severity_score"), 3);

  await setTicketStatus(first.ticketId, "RESOLVED");
  await setTicketStatus(far.ticketId, "RESOLVED");
  const fresh = await submitReport({ ...base, ...spot, category: "ROAD_DAMAGE" });
  created.add(fresh.ticketId);
  assert.notEqual(fresh.ticketId, first.ticketId, "resolved ticket must not absorb new reports");
  assert.equal(fresh.severity_score, 1);

  console.log("Clustering checks passed");
}

async function cleanup() {
  for (const id of created) {
    const ref = db.collection("tickets").doc(id);
    const ticket = await ref.get();
    if (ticket.exists) {
      await db.collection("open_clusters").doc(`${ticket.get("geohash")}_${ticket.get("category")}`).delete();
    }
    await db.recursiveDelete(ref);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(cleanup);
