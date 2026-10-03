import { listMyReports } from "@/lib/tickets";
import { ReporterIdSchema } from "@/lib/types";

// GET /api/my-reports?reporter=<uuid> – submissions from one device with current ticket status
export async function GET(request: Request) {
  const reporter = ReporterIdSchema.safeParse(new URL(request.url).searchParams.get("reporter"));
  if (!reporter.success) {
    return Response.json({ error: "Niepoprawny identyfikator" }, { status: 400 });
  }
  return Response.json(await listMyReports(reporter.data));
}
