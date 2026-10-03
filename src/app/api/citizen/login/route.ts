import { NextResponse } from "next/server";
import {
  CITIZEN_COOKIE,
  CITIZEN_MAX_AGE_S,
  citizenLoginEnabled,
  citizenProfile,
  createCitizenToken,
  newCitizenId,
  readCitizen,
  verifyCitizenToken,
} from "@/lib/auth";
import { claimDeviceReports } from "@/lib/tickets";
import { ReporterIdSchema } from "@/lib/types";

// POST { reporter_id?, previous?: token } – simulated mObywatel login.
// Reuses the person of this browser (session or remembered token), otherwise creates a new fictional one,
// and attaches this device's anonymous reports to it.
export async function POST(request: Request) {
  if (!citizenLoginEnabled()) {
    return NextResponse.json({ error: "Logowanie niedostępne" }, { status: 503 });
  }
  const body = await request.json().catch(() => null);
  const citizenId =
    readCitizen(request) ?? verifyCitizenToken(typeof body?.previous === "string" ? body.previous : undefined, true) ?? newCitizenId();
  const reporter = ReporterIdSchema.safeParse(body?.reporter_id);
  const claimed = reporter.success ? await claimDeviceReports(reporter.data, citizenId) : 0;

  const token = createCitizenToken(citizenId);
  const response = NextResponse.json({ profile: citizenProfile(citizenId), claimed, token });
  response.cookies.set(CITIZEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CITIZEN_MAX_AGE_S,
  });
  return response;
}
