import { z } from "zod";
import { isAdminRequest, unauthorized } from "@/lib/auth";
import { listTicketImages, setTicketStatus, TicketNotFoundError } from "@/lib/tickets";
import { STATUSES } from "@/lib/types";

// GET /api/tickets/:id – photo URLs of all reports merged into the ticket
export async function GET(request: Request, ctx: RouteContext<"/api/tickets/[id]">) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await ctx.params;
  return Response.json({ images: await listTicketImages(id) });
}

const PatchSchema = z.object({ status: z.enum(STATUSES) });

// PATCH /api/tickets/:id { status }
export async function PATCH(request: Request, ctx: RouteContext<"/api/tickets/[id]">) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await ctx.params;
  const body = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Niepoprawny status" }, { status: 400 });
  }
  try {
    await setTicketStatus(id, body.data.status);
  } catch (error) {
    if (error instanceof TicketNotFoundError) {
      return Response.json({ error: "Nie znaleziono zgłoszenia" }, { status: 404 });
    }
    throw error;
  }
  return Response.json({ id, status: body.data.status });
}
