import { isAdminRequest, unauthorized } from "@/lib/auth";
import { uploadImage } from "@/lib/storage";
import { setTicketStatus, TicketNotFoundError } from "@/lib/tickets";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// POST multipart/form-data: image (optional after-repair photo), note (optional) – marks the ticket RESOLVED
export async function POST(request: Request, ctx: RouteContext<"/api/tickets/[id]/resolution">) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await ctx.params;
  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  const note = String(form?.get("note") ?? "").trim().slice(0, 500);

  let imagePath: string | undefined;
  if (image instanceof File && image.size > 0) {
    if (!IMAGE_TYPES.includes(image.type) || image.size > MAX_IMAGE_BYTES) {
      return Response.json({ error: "Nieobsługiwany format lub zbyt duży plik" }, { status: 400 });
    }
    imagePath = await uploadImage(Buffer.from(await image.arrayBuffer()), image.type);
  }

  try {
    await setTicketStatus(id, "RESOLVED", { imagePath, note: note || undefined });
  } catch (error) {
    if (error instanceof TicketNotFoundError) {
      return Response.json({ error: "Nie znaleziono zgłoszenia" }, { status: 404 });
    }
    throw error;
  }
  return Response.json({ id, status: "RESOLVED" });
}
