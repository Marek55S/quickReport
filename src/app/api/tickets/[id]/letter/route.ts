import { isAdminRequest, unauthorized } from "@/lib/auth";
import { previewLetter } from "@/lib/dispatch";
import { db } from "@/lib/firestore";
import { ticketNumber } from "@/lib/format";
import { readImage } from "@/lib/storage";
import { TicketNotFoundError } from "@/lib/tickets";

// GET – the last sent letter (?sent=1) or a fresh preview of the letter as it would be sent now
export async function GET(request: Request, ctx: RouteContext<"/api/tickets/[id]/letter">) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await ctx.params;
  const sent = new URL(request.url).searchParams.get("sent") === "1";
  try {
    let pdf: Uint8Array;
    if (sent) {
      const ticket = await db.collection("tickets").doc(id).get();
      const letterPath = ticket.get("dispatch.letter_path");
      if (!letterPath) return Response.json({ error: "Pismo nie zostało jeszcze wysłane" }, { status: 404 });
      pdf = new Uint8Array((await readImage(letterPath)).contents);
    } else {
      pdf = await previewLetter(id);
    }
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${ticketNumber(id).replace("Ł", "L")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof TicketNotFoundError) {
      return Response.json({ error: "Nie znaleziono zgłoszenia" }, { status: 404 });
    }
    throw error;
  }
}
