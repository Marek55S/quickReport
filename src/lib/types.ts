import { z } from "zod";

export const CATEGORIES = [
  "ROAD_DAMAGE",
  "ACCESSIBILITY_BARRIER",
  "INFRASTRUCTURE_FAILURE",
  "PUBLIC_TRANSPORT",
  "WASTE",
  "GREENERY",
  "WATER_SEWAGE",
  "VANDALISM",
  "ILLEGAL_PARKING",
  "OTHER",
  "NOT_DETECTED",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Default when neither the photo nor the notes show a city issue; cannot be submitted. */
export const DEFAULT_CATEGORY: Category = "NOT_DETECTED";
export const REPORTABLE_CATEGORIES = CATEGORIES.filter((c) => c !== DEFAULT_CATEGORY);

export const CATEGORY_LABELS: Record<Category, string> = {
  ROAD_DAMAGE: "Uszkodzenie drogi lub chodnika",
  ACCESSIBILITY_BARRIER: "Bariera architektoniczna",
  INFRASTRUCTURE_FAILURE: "Awaria infrastruktury",
  PUBLIC_TRANSPORT: "Przystanek i komunikacja",
  WASTE: "Odpady i zanieczyszczenia",
  GREENERY: "Zieleń miejska",
  WATER_SEWAGE: "Woda i kanalizacja",
  VANDALISM: "Wandalizm i graffiti",
  ILLEGAL_PARKING: "Nieprawidłowe parkowanie",
  OTHER: "Inny problem",
  NOT_DETECTED: "Nie rozpoznano problemu",
};

export const LOCATION_SOURCES = ["device", "exif", "map", "demo"] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

export const LOCATION_SOURCE_LABELS: Record<LocationSource, string> = {
  device: "lokalizacja telefonu",
  exif: "metadane zdjęcia",
  map: "wskazana na mapie",
  demo: "lokalizacja demonstracyjna",
};

export const NOTES_MAX_LENGTH = 1000;

export const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"] as const;
export type TicketStatus = (typeof STATUSES)[number];

/** Why an official closed a ticket without action; shown to residents in "Moje zgłoszenia". */
export const REJECTION_REASONS = [
  "FALSE_REPORT",
  "DUPLICATE",
  "NOT_CITY_MATTER",
  "ALREADY_FIXED",
  "INSUFFICIENT_INFO",
  "INAPPROPRIATE",
  "OTHER",
] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

export const REJECTION_LABELS: Record<RejectionReason, string> = {
  FALSE_REPORT: "Fałszywe zgłoszenie",
  DUPLICATE: "Duplikat innego zgłoszenia",
  NOT_CITY_MATTER: "Poza kompetencjami miasta",
  ALREADY_FIXED: "Problem został już usunięty",
  INSUFFICIENT_INFO: "Za mało informacji, by podjąć działanie",
  INAPPROPRIATE: "Treść nieodpowiednia lub spam",
  OTHER: "Inny powód",
};

export const REJECTION_NOTE_MAX_LENGTH = 500;

export const DANGER_LEVELS = [1, 2, 3, 4, 5] as const;
export const DANGER_LABELS: Record<number, string> = {
  1: "Minimalne",
  2: "Niskie",
  3: "Umiarkowane",
  4: "Wysokie",
  5: "Krytyczne",
};

export const AnalysisSchema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().min(3).max(120),
  formal_report: z.string().min(20).max(4000),
  // AI-assessed danger, a second priority factor next to the report count (dashboard only).
  danger_level: z.number().int().min(1).max(5),
  danger_reason: z.string().max(300),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export const ReportSchema = AnalysisSchema.extend({
  category: z.enum(REPORTABLE_CATEGORIES as [Category, ...Category[]]),
  location_source: z.enum(LOCATION_SOURCES),
});

export const CoordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export type Dispatch = {
  unit_id: string;
  unit_name: string;
  channel: "email" | "simulated";
  receipt: string;
  reports_at_dispatch: number;
  sent_at: string;
};

export type Ticket = {
  id: string;
  dispatch?: Dispatch;
  camera?: string;
  client_device?: string;
  geohash: string;
  address?: string;
  danger_level: number;
  danger_reason?: string;
  resolution_image_url?: string;
  resolved_note?: string;
  rejection_reason?: RejectionReason;
  rejection_note?: string;
  rejected_at?: string;
  category: Category;
  title: string;
  formal_report: string;
  gps_lat: number;
  gps_lng: number;
  status: TicketStatus;
  severity_score: number;
  location_source?: LocationSource;
  in_progress_at?: string;
  resolved_at?: string;
  image_url: string;
  created_at: string;
  updated_at: string;
};

/** A resident's own submission with the current state of the ticket it belongs to. */
export type MyReport = {
  id: string;
  formal_report: string;
  gps_lat: number;
  gps_lng: number;
  dispatch_receipt?: string;
  dispatched_at?: string;
  dispatch_unit?: string;
  ticket_id: string;
  address?: string;
  resolution_image_url?: string;
  resolved_note?: string;
  rejection_reason?: RejectionReason;
  rejection_note?: string;
  rejected_at?: string;
  title: string;
  category: Category;
  image_url: string;
  created_at: string;
  status: TicketStatus;
  severity_score: number;
  in_progress_at?: string;
  resolved_at?: string;
};

export const ReporterIdSchema = z.uuid();

export type SubmitResult = {
  ticketId: string;
  merged: boolean;
  severity_score: number;
};

/** Aggregates for the dashboard statistics view. */
export type Stats = {
  by_status: Record<TicketStatus, number>;
  by_category: { category: Category; tickets: number; reports: number }[];
  daily_reports: { date: string; count: number }[];
  avg_resolution_hours: number | null;
  resolved_count: number;
  total_reports: number;
  top_danger: { id: string; title: string; danger_level: number; severity_score: number; address?: string }[];
};
