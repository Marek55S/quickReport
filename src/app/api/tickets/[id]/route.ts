import { z } from "zod";
import { isAdminRequest, unauthorized } from "@/lib/auth";
import { listTicketImages, setTicketStatus, TicketNotFoundError } from "@/lib/tickets";
import { REJECTION_NOTE_MAX_LENGTH, REJECTION_REASONS, STATUSES } from "@/lib/types";

// GET /api/tickets/:id – photo URLs of all reports merged into the ticket
export async function GET(request: Request, ctx: RouteContext<"/api/tickets/[id]">) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await ctx.params;
  return Response.json({ images: await listTicketImages(id) });
}

const PatchSchema = z
  .object({
    status: z.enum(STATUSES),
    rejection_reason: z.enum(REJECTION_REASONS).optional(),
    rejection_note: z.string().trim().max(REJECTION_NOTE_MAX_LENGTH).optional(),
  })
  // Rejecting requires a reason; "other" also requires an explanation for the resident.
  .refine((b) => b.status !== "REJECTED" || b.rejection_reason, { message: "Wybierz powód odrzucenia" })
  .refine((b) => b.rejection_reason !== "OTHER" || b.rejection_note, { message: "Opisz powód odrzucenia" });

// PATCH /api/tickets/:id { status, rejection_reason?, rejection_note? }
export async function PATCH(request: Request, ctx: RouteContext<"/api/tickets/[id]">) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await ctx.params;
  const body = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    const custom = body.error.issues.find((issue) => issue.code === "custom");
    return Response.json({ error: custom?.message ?? "Niepoprawny status" }, { status: 400 });
  }
  const { status, rejection_reason, rejection_note } = body.data;
  try {
    await setTicketStatus(
      id,
      status,
      undefined,
      rejection_reason ? { reason: rejection_reason, note: rejection_note || undefined } : undefined,
    );
  } catch (error) {
    if (error instanceof TicketNotFoundError) {
      return Response.json({ error: "Nie znaleziono zgłoszenia" }, { status: 404 });
    }
    throw error;
  }
  return Response.json({ id, status });
}
