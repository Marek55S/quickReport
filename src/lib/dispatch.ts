import { randomBytes } from "node:crypto";
import { FieldValue } from "@google-cloud/firestore";
import nodemailer from "nodemailer";
import { db } from "./firestore";
import { ticketNumber } from "./format";
import { buildLetterPdf } from "./letter";
import { routeCategory } from "./routing";
import { readImage, saveFile } from "./storage";
import { TicketNotFoundError } from "./tickets";

// Delivery of the letter to the responsible unit.
// Prototype channel: e-mail through any SMTP server (SMTP_URL) to DELIVERY_TEST_EMAIL; without SMTP the delivery
// is simulated. Production path: unit inbox, the city's ticket system (Open311/API), or e-Doręczenia/ePUAP.

export type DispatchResult = {
  unit: string;
  channel: "email" | "simulated";
  receipt: string;
  letter_path: string;
};

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_URL && process.env.DELIVERY_TEST_EMAIL);
}

async function loadTicketLetter(ticketId: string) {
  const ref = db.collection("tickets").doc(ticketId);
  const ticket = await ref.get();
  if (!ticket.exists) throw new TicketNotFoundError(ticketId);
  const images = await ref.collection("images").orderBy("created_at", "asc").limit(4).get();
  const photos = (
    await Promise.all(
      images.docs.map(async (d) => {
        try {
          const { contents, contentType } = await readImage(d.get("image_path"));
          return { data: contents, contentType };
        } catch {
          return null;
        }
      }),
    )
  ).filter((p): p is { data: Buffer; contentType: string } => p !== null);

  const t = ticket.data()!;
  const unit = routeCategory(t.category);
  const pdf = await buildLetterPdf({
    ticketId,
    unit,
    title: t.title,
    category: t.category,
    formalReport: t.formal_report,
    address: t.address,
    lat: t.gps_lat,
    lng: t.gps_lng,
    reports: t.severity_score,
    dangerLevel: t.danger_level ?? 1,
    dangerReason: t.danger_reason,
    firstReportedAt: t.created_at?.toDate?.().toISOString() ?? new Date().toISOString(),
    photos,
  });
  return { ref, ticket: t, unit, pdf };
}

/** PDF of the letter as it would be sent now (preview, not stored). */
export async function previewLetter(ticketId: string): Promise<Uint8Array> {
  return (await loadTicketLetter(ticketId)).pdf;
}

export async function dispatchLetter(ticketId: string): Promise<DispatchResult> {
  const { ref, ticket, unit, pdf } = await loadTicketLetter(ticketId);
  const number = ticketNumber(ticketId);
  const sentAt = new Date();
  const letterPath = `letters/${ticketId}/${sentAt.toISOString().replace(/[:.]/g, "-")}.pdf`;
  await saveFile(letterPath, pdf, "application/pdf");

  let channel: DispatchResult["channel"] = "simulated";
  if (emailConfigured()) {
    const transport = nodemailer.createTransport(process.env.SMTP_URL);
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.DELIVERY_TEST_EMAIL,
      to: process.env.DELIVERY_TEST_EMAIL,
      subject: `[QuickReport] ${number}: ${ticket.title} – do: ${unit.name}`,
      text: [
        `Adresat (prototyp – wysyłka na adres testowy): ${unit.name}`,
        `Zgłoszenie: ${number} – ${ticket.title}`,
        `Liczba zgłaszających: ${ticket.severity_score}`,
        ticket.address ? `Lokalizacja: ok. ${ticket.address}` : "",
        "",
        "Pismo w załączniku (PDF).",
      ]
        .filter((line) => line !== "")
        .join("\n"),
      attachments: [{ filename: `${number}.pdf`, content: Buffer.from(pdf), contentType: "application/pdf" }],
    });
    channel = "email";
  }

  // Receipt number standing in for an official proof of delivery (UPO) in production.
  const receipt = `UPO-${sentAt.toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const record = {
    unit_id: unit.id,
    unit_name: unit.name,
    channel,
    receipt,
    letter_path: letterPath,
    reports_at_dispatch: ticket.severity_score,
    sent_at: FieldValue.serverTimestamp(),
  };
  await Promise.all([
    ref.collection("dispatches").add(record),
    ref.update({
      dispatch: record,
      dispatch_count: FieldValue.increment(1),
      updated_at: FieldValue.serverTimestamp(),
    }),
  ]);
  return { unit: unit.name, channel, receipt, letter_path: letterPath };
}
