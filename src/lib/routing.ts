import type { Category } from "./types";

// Proposed routing of report categories to City of Kraków units (to be confirmed with the city).
// Only names are listed; real unit inboxes are not configured in the prototype.
export type Unit = { id: string; short: string; name: string };

export const UNITS = {
  ZDMK: { id: "ZDMK", short: "ZDMK", name: "Zarząd Dróg Miasta Krakowa" },
  ZZM: { id: "ZZM", short: "ZZM", name: "Zarząd Zieleni Miejskiej w Krakowie" },
  MPO: { id: "MPO", short: "MPO", name: "Miejskie Przedsiębiorstwo Oczyszczania w Krakowie" },
  WMK: { id: "WMK", short: "Wodociągi", name: "Wodociągi Miasta Krakowa" },
  SM: { id: "SM", short: "Straż Miejska", name: "Straż Miejska Miasta Krakowa" },
  UMK: { id: "UMK", short: "Urząd Miasta", name: "Urząd Miasta Krakowa" },
} satisfies Record<string, Unit>;

const ROUTES: Record<Category, Unit> = {
  ROAD_DAMAGE: UNITS.ZDMK,
  ACCESSIBILITY_BARRIER: UNITS.ZDMK,
  INFRASTRUCTURE_FAILURE: UNITS.ZDMK,
  PUBLIC_TRANSPORT: UNITS.ZDMK,
  WASTE: UNITS.MPO,
  GREENERY: UNITS.ZZM,
  WATER_SEWAGE: UNITS.WMK,
  VANDALISM: UNITS.SM,
  ILLEGAL_PARKING: UNITS.SM,
  OTHER: UNITS.UMK,
  NOT_DETECTED: UNITS.UMK,
};

export function routeCategory(category: Category): Unit {
  return ROUTES[category];
}
