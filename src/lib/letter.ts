import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { ticketNumber } from "./format";
import type { Unit } from "./routing";
import { CATEGORY_LABELS, DANGER_LABELS, type Category } from "./types";

// Letter to the responsible city unit, generated on the server as an A4 PDF.
// Lato (SIL OFL) is embedded because the standard PDF fonts lack Polish characters.

export type LetterInput = {
  ticketId: string;
  unit: Unit;
  title: string;
  category: Category;
  formalReport: string;
  address?: string | null;
  lat: number;
  lng: number;
  reports: number;
  dangerLevel: number;
  dangerReason?: string;
  firstReportedAt: string;
  photos: { data: Buffer; contentType: string }[];
};

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const INK = rgb(0.106, 0.153, 0.2);
const MUTED = rgb(0.353, 0.4, 0.451);
const BLUE = rgb(0, 0.392, 0.655);

let fonts: Promise<[Buffer, Buffer]> | null = null;
function loadFonts() {
  const dir = path.join(process.cwd(), "public", "fonts");
  fonts ??= Promise.all([readFile(path.join(dir, "Lato-Regular.ttf")), readFile(path.join(dir, "Lato-Bold.ttf"))]);
  return fonts;
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const token of paragraph.split(/\s+/).filter(Boolean)) {
      // Break tokens wider than the column (e.g. URLs) into chunks that fit.
      let word = token;
      while (font.widthOfTextAtSize(word, size) > width) {
        let cut = word.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > width) cut--;
        if (line) lines.push(line);
        lines.push(word.slice(0, cut));
        line = "";
        word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function buildLetterPdf(input: LetterInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await loadFonts();
  const regular = await doc.embedFont(regularBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  const number = ticketNumber(input.ticketId);
  doc.setTitle(`${number} – ${input.title}`);
  doc.setAuthor("QuickReport (prototyp)");
  doc.setSubject(`Zgłoszenie mieszkańców do: ${input.unit.name}`);

  let page: PDFPage = doc.addPage(A4);
  const width = A4[0] - 2 * MARGIN;
  let y = A4[1] - MARGIN;

  const ensure = (needed: number) => {
    if (y - needed < MARGIN + 30) {
      page = doc.addPage(A4);
      y = A4[1] - MARGIN;
    }
  };
  const text = (value: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const font = opts.font ?? regular;
    const size = opts.size ?? 10.5;
    for (const line of wrap(value, font, size, width)) {
      ensure(size * 1.45);
      page.drawText(line, { x: MARGIN, y: y - size, size, font, color: opts.color ?? INK });
      y -= size * 1.45;
    }
    y -= opts.gap ?? 0;
  };
  const row = (label: string, value: string) => {
    const size = 10;
    const labelWidth = 150;
    const lines = wrap(value, regular, size, width - labelWidth);
    ensure(lines.length * size * 1.45);
    page.drawText(label, { x: MARGIN, y: y - size, size, font: bold, color: MUTED });
    lines.forEach((line, i) => page.drawText(line, { x: MARGIN + labelWidth, y: y - size - i * size * 1.45, size, font: regular, color: INK }));
    y -= lines.length * size * 1.45 + 2;
  };

  // Header band
  page.drawRectangle({ x: 0, y: A4[1] - 8, width: A4[0], height: 8, color: BLUE });
  const date = new Date().toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" });
  page.drawText("QuickReport · zgłoszenie mieszkańców", { x: MARGIN, y: y - 9, size: 9, font: bold, color: BLUE });
  const right = `${number} · Kraków, ${date}`;
  page.drawText(right, { x: A4[0] - MARGIN - regular.widthOfTextAtSize(right, 9), y: y - 9, size: 9, font: regular, color: MUTED });
  y -= 36;

  text(input.unit.name, { font: bold, size: 13 });
  text("Adresat (proponowany przydział, do potwierdzenia przez urząd)", { size: 8.5, color: MUTED, gap: 14 });
  text(`Dotyczy: ${input.title}`, { font: bold, size: 15, gap: 10 });

  row("Numer zgłoszenia", number);
  row("Kategoria", CATEGORY_LABELS[input.category]);
  row("Lokalizacja", input.address ? `ok. ${input.address}` : "adres nieustalony");
  row("Współrzędne GPS", `${input.lat.toFixed(6)}, ${input.lng.toFixed(6)}`);
  row("Mapa", `https://osm.org/?mlat=${input.lat.toFixed(5)}&mlon=${input.lng.toFixed(5)}&zoom=18`);
  row("Liczba zgłaszających", `${input.reports} (zgłoszenia z tego miejsca połączone w jedno)`);
  row("Pierwsze zgłoszenie", new Date(input.firstReportedAt).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" }));
  row(
    "Ocena zagrożenia (AI)",
    `${input.dangerLevel}/5 – ${DANGER_LABELS[input.dangerLevel] ?? ""}${input.dangerReason ? `. ${input.dangerReason}` : ""}`,
  );
  y -= 12;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 0.6, color: rgb(0.85, 0.87, 0.9) });
  y -= 16;
  text(input.formalReport, { size: 11, gap: 14 });
  text(
    `Zgłaszający: ${input.reports} ${input.reports === 1 ? "mieszkaniec" : "mieszkańców"} – tożsamość potwierdzona przez mObywatel (w prototypie: symulacja).`,
    { size: 9.5, color: MUTED, gap: 18 },
  );

  // Photos: up to four, two per row.
  const images: PDFImage[] = [];
  for (const photo of input.photos.slice(0, 4)) {
    try {
      if (photo.contentType === "image/png") images.push(await doc.embedPng(photo.data));
      else if (photo.contentType === "image/jpeg") images.push(await doc.embedJpg(photo.data));
    } catch {
      // Skip unreadable images rather than failing the letter.
    }
  }
  if (images.length) {
    ensure(40);
    text(`Załączone zdjęcia (${images.length})`, { font: bold, size: 11, gap: 6 });
    const cellW = (width - 12) / 2;
    const cellH = cellW * 0.75;
    for (let i = 0; i < images.length; i += 2) {
      ensure(cellH + 12);
      images.slice(i, i + 2).forEach((img, j) => {
        const scale = Math.min(cellW / img.width, cellH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, { x: MARGIN + j * (cellW + 12) + (cellW - w) / 2, y: y - cellH + (cellH - h) / 2, width: w, height: h });
      });
      y -= cellH + 12;
    }
  }

  // Footer on every page
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const note = `Dokument wygenerowany automatycznie przez prototyp QuickReport (HackYeah 2026) · ${number} · strona ${i + 1}/${pages.length}`;
    p.drawText(note, { x: MARGIN, y: 30, size: 7.5, font: regular, color: MUTED });
  });

  return doc.save();
}
