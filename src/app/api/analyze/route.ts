import { analyzeImage } from "@/lib/ai";
import { CoordinatesSchema } from "@/lib/types";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

// POST multipart/form-data: image (file), lat, lng (optional)
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File)) {
    return Response.json({ error: "Brak zdjęcia" }, { status: 400 });
  }
  if (!IMAGE_TYPES.includes(image.type) || image.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "Nieobsługiwany format lub zbyt duży plik" }, { status: 400 });
  }

  const coords = CoordinatesSchema.safeParse({ lat: form?.get("lat"), lng: form?.get("lng") });
  const result = await analyzeImage({
    image: Buffer.from(await image.arrayBuffer()),
    mimeType: image.type,
    ...(coords.success ? coords.data : {}),
  });
  return Response.json(result);
}
