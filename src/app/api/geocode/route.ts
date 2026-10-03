import { reverseGeocode } from "@/lib/geocode";
import { CoordinatesSchema } from "@/lib/types";

// GET /api/geocode?lat=..&lng=.. – approximate address for the review screen
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const coords = CoordinatesSchema.safeParse({ lat: params.get("lat"), lng: params.get("lng") });
  if (!coords.success) {
    return Response.json({ error: "Niepoprawne współrzędne" }, { status: 400 });
  }
  return Response.json({ address: await reverseGeocode(coords.data.lat, coords.data.lng) });
}
