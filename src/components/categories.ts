import {
  Accessibility,
  Bus,
  CircleHelp,
  CircleParking,
  Construction,
  Droplets,
  ScanSearch,
  SprayCan,
  Trash,
  Trees,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/types";

export const CATEGORY_STYLE: Record<Category, { icon: LucideIcon; chip: string; color: string }> = {
  ROAD_DAMAGE: { icon: Construction, chip: "bg-amber-100 text-amber-800", color: "#d97706" },
  ACCESSIBILITY_BARRIER: { icon: Accessibility, chip: "bg-violet-100 text-violet-800", color: "#7c3aed" },
  INFRASTRUCTURE_FAILURE: { icon: Zap, chip: "bg-rose-100 text-rose-800", color: "#e11d48" },
  PUBLIC_TRANSPORT: { icon: Bus, chip: "bg-sky-100 text-sky-800", color: "#0284c7" },
  WASTE: { icon: Trash, chip: "bg-lime-100 text-lime-800", color: "#65a30d" },
  GREENERY: { icon: Trees, chip: "bg-emerald-100 text-emerald-800", color: "#059669" },
  WATER_SEWAGE: { icon: Droplets, chip: "bg-cyan-100 text-cyan-800", color: "#0891b2" },
  VANDALISM: { icon: SprayCan, chip: "bg-fuchsia-100 text-fuchsia-800", color: "#c026d3" },
  ILLEGAL_PARKING: { icon: CircleParking, chip: "bg-indigo-100 text-indigo-800", color: "#4f46e5" },
  OTHER: { icon: CircleHelp, chip: "bg-slate-200 text-slate-700", color: "#475569" },
  NOT_DETECTED: { icon: ScanSearch, chip: "bg-slate-100 text-slate-500", color: "#94a3b8" },
};
