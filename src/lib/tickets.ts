import { FieldValue, Timestamp } from "@google-cloud/firestore";
import ngeohash from "ngeohash";
import { db } from "./firestore";
import { imageUrl } from "./storage";
import type { Analysis, LocationSource, MyReport, SubmitResult, Ticket, TicketStatus } from "./types";

// 8 characters ≈ 38 m × 19 m cell.
export const GEOHASH_PRECISION = 8;

const tickets = db.collection("tickets");
// One document per (geohash, category) pointing at the currently OPEN ticket created in that cell.
// Reading and writing it inside a transaction makes clustering race-free.
const openClusters = db.collection("open_clusters");
// One document per resident submission, linking the anonymous reporter to the ticket it joined.
const reports = db.collection("reports");

export type ReportInput = Analysis & {
  lat: number;
  lng: number;
  locationSource?: LocationSource;
  imagePath: string;
  reporterId?: string;
};

function clusterId(geohash: string, category: string) {
  return `${geohash}_${category}`;
}

export async function submitReport(input: ReportInput): Promise<SubmitResult> {
  const geohash = ngeohash.encode(input.lat, input.lng, GEOHASH_PRECISION);
  // GPS jitter easily crosses a cell edge, so also look at the 8 neighbouring cells.
  const cells = [geohash, ...ngeohash.neighbors(geohash)];
  const clusterRefs = cells.map((cell) => openClusters.doc(clusterId(cell, input.category)));
  const image = {
    image_path: input.imagePath,
    gps_lat: input.lat,
    gps_lng: input.lng,
    location_source: input.locationSource,
    created_at: FieldValue.serverTimestamp(),
  };

  const reportRef = reports.doc();
  const report = (ticketId: string) => ({
    reporter_id: input.reporterId ?? null,
    ticket_id: ticketId,
    title: input.title,
    category: input.category,
    image_path: input.imagePath,
    gps_lat: input.lat,
    gps_lng: input.lng,
    created_at: FieldValue.serverTimestamp(),
  });

  return db.runTransaction(async (tx) => {
    const clusters = (await tx.getAll(...clusterRefs)).filter((doc) => doc.exists);
    const candidates = clusters.length
      ? (await tx.getAll(...clusters.map((doc) => tickets.doc(doc.get("ticket_id"))))).filter(
          (doc) => doc.exists && doc.get("status") === "OPEN",
        )
      : [];

    if (candidates.length) {
      const nearest = candidates.reduce((best, doc) =>
        distanceSq(input, doc) < distanceSq(input, best) ? doc : best,
      );
      tx.update(nearest.ref, {
        severity_score: FieldValue.increment(1),
        updated_at: FieldValue.serverTimestamp(),
      });
      tx.create(nearest.ref.collection("images").doc(), image);
      tx.create(reportRef, report(nearest.id));
      return {
        ticketId: nearest.id,
        merged: true,
        severity_score: (nearest.get("severity_score") as number) + 1,
      };
    }

    const ticketRef = tickets.doc();
    tx.create(ticketRef, {
      geohash,
      category: input.category,
      title: input.title,
      formal_report: input.formal_report,
      gps_lat: input.lat,
      gps_lng: input.lng,
      location_source: input.locationSource,
      status: "OPEN",
      severity_score: 1,
      image_path: input.imagePath,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    tx.create(ticketRef.collection("images").doc(), image);
    tx.set(clusterRefs[0], { ticket_id: ticketRef.id, created_at: FieldValue.serverTimestamp() });
    tx.create(reportRef, report(ticketRef.id));
    return { ticketId: ticketRef.id, merged: false, severity_score: 1 };
  });
}

function distanceSq(point: { lat: number; lng: number }, doc: FirebaseFirestore.DocumentSnapshot) {
  return (doc.get("gps_lat") - point.lat) ** 2 + (doc.get("gps_lng") - point.lng) ** 2;
}

/** Moves a ticket out of (or within) the workflow; leaving OPEN releases its cluster. */
export async function setTicketStatus(id: string, status: TicketStatus): Promise<void> {
  const ticketRef = tickets.doc(id);
  await db.runTransaction(async (tx) => {
    const ticket = await tx.get(ticketRef);
    if (!ticket.exists) throw new TicketNotFoundError(id);
    const clusterRef = openClusters.doc(clusterId(ticket.get("geohash"), ticket.get("category")));
    const cluster = await tx.get(clusterRef);

    // Timestamps per stage let residents see when their problem was taken up and fixed.
    const stamp = status === "IN_PROGRESS" ? { in_progress_at: FieldValue.serverTimestamp() }
      : status === "RESOLVED" ? { resolved_at: FieldValue.serverTimestamp() }
      : {};
    tx.update(ticketRef, { status, ...stamp, updated_at: FieldValue.serverTimestamp() });
    if (status !== "OPEN" && cluster.get("ticket_id") === id) {
      tx.delete(clusterRef);
    }
  });
}

export async function listTickets(status: TicketStatus = "OPEN"): Promise<Ticket[]> {
  // Equality filter only (no composite index); sort by priority in memory.
  const snapshot = await tickets.where("status", "==", status).get();
  return snapshot.docs
    .map((doc) => toTicket(doc.id, doc.data()))
    .sort((a, b) => b.severity_score - a.severity_score || b.updated_at.localeCompare(a.updated_at));
}

/** Reports submitted from one device, newest first, with the current state of their tickets. */
export async function listMyReports(reporterId: string): Promise<MyReport[]> {
  // Equality filter only (no composite index); sort in memory.
  const snapshot = await reports.where("reporter_id", "==", reporterId).get();
  const docs = snapshot.docs.sort((a, b) => iso(b.get("created_at")).localeCompare(iso(a.get("created_at"))));
  const ticketIds = [...new Set(docs.map((d) => d.get("ticket_id") as string))];
  const ticketDocs = ticketIds.length ? await db.getAll(...ticketIds.map((id) => tickets.doc(id))) : [];
  const byId = new Map(ticketDocs.filter((d) => d.exists).map((d) => [d.id, d.data()!]));

  return docs.flatMap((doc) => {
    const ticket = byId.get(doc.get("ticket_id"));
    if (!ticket) return [];
    return [
      {
        id: doc.id,
        ticket_id: doc.get("ticket_id"),
        title: doc.get("title"),
        category: doc.get("category"),
        image_url: imageUrl(doc.get("image_path")),
        created_at: iso(doc.get("created_at")),
        status: ticket.status,
        severity_score: ticket.severity_score,
        in_progress_at: optionalIso(ticket.in_progress_at),
        resolved_at: optionalIso(ticket.resolved_at),
      },
    ];
  });
}

/** Removes all tickets, clusters, and submissions; used to reset demo data. */
export async function deleteAllTickets(): Promise<void> {
  await Promise.all([
    db.recursiveDelete(tickets),
    db.recursiveDelete(openClusters),
    db.recursiveDelete(reports),
  ]);
}

export async function listTicketImages(id: string): Promise<string[]> {
  const snapshot = await tickets.doc(id).collection("images").orderBy("created_at", "desc").get();
  return snapshot.docs.map((doc) => imageUrl(doc.get("image_path")));
}

export class TicketNotFoundError extends Error {
  constructor(id: string) {
    super(`Ticket ${id} not found`);
  }
}

function iso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}

function optionalIso(value: unknown): string | undefined {
  return value instanceof Timestamp ? value.toDate().toISOString() : undefined;
}

function toTicket(id: string, data: FirebaseFirestore.DocumentData): Ticket {
  return {
    id,
    geohash: data.geohash,
    category: data.category,
    title: data.title,
    formal_report: data.formal_report,
    gps_lat: data.gps_lat,
    gps_lng: data.gps_lng,
    status: data.status,
    severity_score: data.severity_score,
    location_source: data.location_source,
    in_progress_at: optionalIso(data.in_progress_at),
    resolved_at: optionalIso(data.resolved_at),
    image_url: imageUrl(data.image_path),
    created_at: iso(data.created_at),
    updated_at: iso(data.updated_at),
  };
}
