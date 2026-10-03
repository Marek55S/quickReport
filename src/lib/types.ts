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

export const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
export type TicketStatus = (typeof STATUSES)[number];

export const AnalysisSchema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().min(3).max(120),
  formal_report: z.string().min(20).max(4000),
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

export type Ticket = {
  id: string;
  geohash: string;
  category: Category;
  title: string;
  formal_report: string;
  gps_lat: number;
  gps_lng: number;
  status: TicketStatus;
  severity_score: number;
  location_source?: LocationSource;
  image_url: string;
  created_at: string;
  updated_at: string;
};

export type SubmitResult = {
  ticketId: string;
  merged: boolean;
  severity_score: number;
};
