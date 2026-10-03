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

// Categories are identified by icon and label only; colour is reserved for severity and status.
export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  ROAD_DAMAGE: Construction,
  ACCESSIBILITY_BARRIER: Accessibility,
  INFRASTRUCTURE_FAILURE: Zap,
  PUBLIC_TRANSPORT: Bus,
  WASTE: Trash,
  GREENERY: Trees,
  WATER_SEWAGE: Droplets,
  VANDALISM: SprayCan,
  ILLEGAL_PARKING: CircleParking,
  OTHER: CircleHelp,
  NOT_DETECTED: ScanSearch,
};
