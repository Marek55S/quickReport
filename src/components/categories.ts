import { Accessibility, CircleHelp, Construction, Zap, type LucideIcon } from "lucide-react";
import type { Category } from "@/lib/types";

export const CATEGORY_STYLE: Record<Category, { icon: LucideIcon; chip: string; color: string }> = {
  ROAD_DAMAGE: { icon: Construction, chip: "bg-amber-100 text-amber-800", color: "#d97706" },
  ACCESSIBILITY_BARRIER: { icon: Accessibility, chip: "bg-violet-100 text-violet-800", color: "#7c3aed" },
  INFRASTRUCTURE_FAILURE: { icon: Zap, chip: "bg-rose-100 text-rose-800", color: "#e11d48" },
  OTHER: { icon: CircleHelp, chip: "bg-slate-200 text-slate-700", color: "#475569" },
};
