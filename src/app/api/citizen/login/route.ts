import { NextResponse } from "next/server";
import { CITIZEN_COOKIE, CITIZEN_MAX_AGE_S, citizenLoginEnabled, createCitizenToken, DEMO_CITIZEN } from "@/lib/auth";
import { claimDeviceReports } from "@/lib/tickets";
import { ReporterIdSchema } from "@/lib/types";

// POST { reporter_id? } – simulated mObywatel login; attaches this device's reports to the citizen.
export async function POST(request: Request) {
  if (!citizenLoginEnabled()) {
    return NextResponse.json({ error: "Logowanie niedostępne" }, { status: 503 });
  }
  const body = await request.json().catch(() => null);
  const reporter = ReporterIdSchema.safeParse(body?.reporter_id);
  const claimed = reporter.success ? await claimDeviceReports(reporter.data, DEMO_CITIZEN.id) : 0;

  const response = NextResponse.json({ name: DEMO_CITIZEN.name, claimed });
  response.cookies.set(CITIZEN_COOKIE, createCitizenToken(DEMO_CITIZEN.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CITIZEN_MAX_AGE_S,
  });
  return response;
}
