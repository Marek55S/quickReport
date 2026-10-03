import { citizenLoginEnabled, citizenProfile, readCitizen } from "@/lib/auth";
import { listMyReports } from "@/lib/tickets";
import { ReporterIdSchema } from "@/lib/types";

// GET /api/my-reports?reporter=<uuid> – this device's reports plus, with a citizen session, all of the citizen's
export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("reporter");
  const reporter = ReporterIdSchema.safeParse(param);
  if (param && !reporter.success) {
    return Response.json({ error: "Niepoprawny identyfikator" }, { status: 400 });
  }
  const citizen = readCitizen(request);
  const reports = await listMyReports(reporter.success ? reporter.data : null, citizen);
  return Response.json({
    reports,
    citizen: citizen ? citizenProfile(citizen) : null,
    login_available: citizenLoginEnabled(),
  });
}
