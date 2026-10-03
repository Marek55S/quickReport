import { citizenLoginEnabled, citizenProfile, readCitizen } from "@/lib/auth";

// GET – the signed-in (simulated mObywatel) person of this browser, or null
export async function GET(request: Request) {
  const citizen = readCitizen(request);
  return Response.json({ profile: citizen ? citizenProfile(citizen) : null, login_available: citizenLoginEnabled() });
}
