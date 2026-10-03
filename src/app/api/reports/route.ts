import { readCitizen } from "@/lib/auth";
import { reverseGeocode } from "@/lib/geocode";
import { uploadImage } from "@/lib/storage";
import { submitReport } from "@/lib/tickets";
import { CoordinatesSchema, LOCATION_SOURCE_LABELS, ReportSchema, ReporterIdSchema } from "@/lib/types";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// POST multipart/form-data: image (file), lat, lng, location_source, category, title, formal_report,
// reporter_id (optional anonymous device id for "Moje zgłoszenia")
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File) || !IMAGE_TYPES.includes(image.type) || image.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "Brak poprawnego zdjęcia" }, { status: 400 });
  }

  const coords = CoordinatesSchema.safeParse({ lat: form?.get("lat"), lng: form?.get("lng") });
  const report = ReportSchema.safeParse({
    category: form?.get("category"),
    title: form?.get("title"),
    formal_report: form?.get("formal_report"),
    danger_level: Number(form?.get("danger_level")),
    danger_reason: form?.get("danger_reason") ?? "",
    location_source: form?.get("location_source"),
  });
  const reporter = ReporterIdSchema.safeParse(form?.get("reporter_id"));
  if (!coords.success || !report.success) {
    return Response.json({ error: "Niepoprawne dane zgłoszenia" }, { status: 400 });
  }

  const { lat, lng } = coords.data;
  const date = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
  // Location and date come from the system, not the AI, so they always match the chosen point.
  const placeLabel = (address: string | null) =>
    `${address ? `ok. ${address}, ` : ""}GPS ${lat.toFixed(6)}, ${lng.toFixed(6)} (${LOCATION_SOURCE_LABELS[report.data.location_source]})`;

  const [imagePath, address] = await Promise.all([
    uploadImage(Buffer.from(await image.arrayBuffer()), image.type),
    reverseGeocode(lat, lng),
  ]);
  const result = await submitReport({
    ...report.data,
    formal_report: `${report.data.formal_report.trim()}\n\nLokalizacja: ${placeLabel(address)}. Data zgłoszenia: ${date}.`,
    lat,
    lng,
    locationSource: report.data.location_source,
    imagePath,
    reporterId: reporter.success ? reporter.data : undefined,
    ownerId: readCitizen(request),
    address,
  });
  return Response.json(result, { status: result.merged ? 200 : 201 });
}
