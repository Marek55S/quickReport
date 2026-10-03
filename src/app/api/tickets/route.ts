import { isAdminRequest, unauthorized } from "@/lib/auth";
import { listTickets } from "@/lib/tickets";
import { STATUSES, type TicketStatus } from "@/lib/types";

// GET /api/tickets?status=OPEN – tickets sorted by severity_score descending
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const status = new URL(request.url).searchParams.get("status") ?? "OPEN";
  if (!STATUSES.includes(status as TicketStatus)) {
    return Response.json({ error: "Nieznany status" }, { status: 400 });
  }
  return Response.json(await listTickets(status as TicketStatus));
}
