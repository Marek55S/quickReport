import { isAdminRequest, unauthorized } from "@/lib/auth";
import { dispatchLetter } from "@/lib/dispatch";
import { TicketNotFoundError } from "@/lib/tickets";

// POST – generate the letter PDF, deliver it (e-mail or simulated), and record the dispatch on the ticket
export async function POST(request: Request, ctx: RouteContext<"/api/tickets/[id]/dispatch">) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await ctx.params;
  try {
    return Response.json(await dispatchLetter(id));
  } catch (error) {
    if (error instanceof TicketNotFoundError) {
      return Response.json({ error: "Nie znaleziono zgłoszenia" }, { status: 404 });
    }
    console.error("Dispatch failed", error);
    return Response.json({ error: "Nie udało się wysłać pisma" }, { status: 502 });
  }
}
