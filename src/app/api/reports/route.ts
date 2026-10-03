import { uploadImage } from "@/lib/storage";
import { submitReport } from "@/lib/tickets";
import { AnalysisSchema, CoordinatesSchema } from "@/lib/types";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// POST multipart/form-data: image (file), lat, lng, category, title, formal_report
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File) || !IMAGE_TYPES.includes(image.type) || image.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "Brak poprawnego zdjęcia" }, { status: 400 });
  }

  const coords = CoordinatesSchema.safeParse({ lat: form?.get("lat"), lng: form?.get("lng") });
  const analysis = AnalysisSchema.safeParse({
    category: form?.get("category"),
    title: form?.get("title"),
    formal_report: form?.get("formal_report"),
  });
  if (!coords.success || !analysis.success) {
    return Response.json({ error: "Niepoprawne dane zgłoszenia" }, { status: 400 });
  }

  const imagePath = await uploadImage(Buffer.from(await image.arrayBuffer()), image.type);
  const result = await submitReport({ ...analysis.data, ...coords.data, imagePath });
  return Response.json(result, { status: result.merged ? 200 : 201 });
}
