import { NextResponse } from "next/server";
import { CITIZEN_COOKIE } from "@/lib/auth";

// POST – ends the simulated mObywatel session
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(CITIZEN_COOKIE);
  return response;
}
