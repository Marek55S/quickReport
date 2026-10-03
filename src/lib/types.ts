import { z } from "zod";

export const CATEGORIES = [
  "ROAD_DAMAGE",
  "ACCESSIBILITY_BARRIER",
  "INFRASTRUCTURE_FAILURE",
  "OTHER",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  ROAD_DAMAGE: "Uszkodzenie drogi lub chodnika",
  ACCESSIBILITY_BARRIER: "Bariera architektoniczna",
  INFRASTRUCTURE_FAILURE: "Awaria infrastruktury",
  OTHER: "Inny problem",
};

export const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
export type TicketStatus = (typeof STATUSES)[number];

export const AnalysisSchema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().min(3).max(120),
  formal_report: z.string().min(20).max(4000),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

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
  image_url: string;
  created_at: string;
  updated_at: string;
};

export type SubmitResult = {
  ticketId: string;
  merged: boolean;
  severity_score: number;
};
