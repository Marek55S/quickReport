import { isAdminRequest, unauthorized } from "@/lib/auth";
import { computeStats } from "@/lib/tickets";

// GET /api/stats – aggregates for the dashboard statistics view
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  return Response.json(await computeStats());
}
