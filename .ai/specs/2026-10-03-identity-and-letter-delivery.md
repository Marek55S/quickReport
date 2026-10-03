# Resident Identity and Letter Delivery

- Status: `Implemented`
- Type: `feature`
- Branch: `None (user manages Git; work stays in the current working tree)`
- Created: `2026-10-03`
- Updated: `2026-10-03`
- Owner: `Marek55S`
- Authorization: `2026-10-03: user asked to implement the simulated mObywatel identity for "Moje zgłoszenia" and the letter-delivery skeleton (routing, PDF, e-mail, simulated receipt) ("zrób to i te rzeczy z poprzedniej wiadomości"). Open choices were not answered; defaults below follow the recommendation.`

## Decisions (defaults chosen by Claude, revisable)

- **Identity:** the mObywatel step is still simulated. Confirming creates an HMAC-signed `qr_citizen` cookie for a demo identity and attaches the device's earlier reports to it. Reports store `owner_id` (citizen) next to `reporter_id` (device). "Moje zgłoszenia" shows device reports, and after a simulated login also reports from other devices. Signing uses `ADMIN_SESSION_SECRET` (fallback `ADMIN_PASSWORD`); without a secret the citizen login is disabled and the list stays per device.
- **Routing:** a category → Kraków unit table (ZDMK, Zarząd Zieleni Miejskiej, MPO, MPK, Straż Miejska, Wodociągi Miasta Krakowa, Urząd Miasta as fallback). Unit names only; real unit e-mail addresses are not filled in.
- **When to send:** an official sends the letter from the dashboard ("Wyślij pismo do …"), acting as a check on AI mistakes. Re-sending with an update is allowed when new reports arrived after the last dispatch.
- **Letter:** server-generated PDF (pdf-lib, embedded Lato for Polish characters): addressee, reference number, date, formal text, number of residents, approximate address, GPS with an OpenStreetMap link, AI danger level, up to 4 photos. Stored in the bucket under `letters/`.
- **Channel:** e-mail via any SMTP server configured with `SMTP_URL`, always to `DELIVERY_TEST_EMAIL` in the prototype (the real unit address is printed in the letter header only as a name). Without `SMTP_URL` the delivery is simulated. Each dispatch gets a receipt number (`UPO-…`) and is recorded on the ticket.
- **Residents:** the timeline becomes Przyjęte → Wysłane do <unit> → W realizacji → Rozwiązane.

## Out of scope

- Real login.gov.pl / mObywatel, ePUAP, e-Doręczenia, Open311 integrations (described as the production path).
- Real unit e-mail addresses, notifications to residents.

## Execution result

- Actual files: `src/lib/auth.ts`, `src/app/api/citizen/login/route.ts`, `src/app/api/citizen/logout/route.ts`, `src/lib/tickets.ts`, `src/lib/types.ts`, `src/app/api/my-reports/route.ts`, `src/app/api/reports/route.ts`, `src/lib/format.ts`, `src/lib/routing.ts`, `src/lib/letter.ts`, `src/lib/dispatch.ts`, `src/lib/storage.ts`, `src/app/api/tickets/[id]/dispatch/route.ts`, `src/app/api/tickets/[id]/letter/route.ts`, `src/components/admin/Dashboard.tsx`, `src/components/resident/{ReportFlow,MyReports}.tsx`, `src/components/resident/{reporter,i18n}.ts`, `src/components/ui.tsx`, `public/fonts/` (Lato, SIL OFL), `.env.example`, `README.md`, `.ai/ARCHITECTURE.md`, `docs/ROADMAP.md`, `package.json` (`pdf-lib`, `@pdf-lib/fontkit`, `nodemailer`)
- Validation (on `next start`, real Firestore and Gemini; SMTP via a local Mailpit container):
  - Identity: an anonymous report was visible on its device (1) and not on another (0); simulated mObywatel login claimed 1 report; with the citizen cookie the other device saw it; a cookie with a forged expiry saw 0.
  - Letter: preview without session → 401; preview PDF (1 page) contains "Zarząd Dróg Miasta Krakowa", "Dotyczy", report count, AI danger, letter text, photo; dispatch returned channel `email` and `UPO-20261003-…`; Mailpit received "[QuickReport] ZGŁ-…: … – do: Zarząd Dróg Miasta Krakowa" with 1 PDF attachment; the stored letter downloaded via `?sent=1`; the ticket and the resident's report carry the dispatch.
  - Playwright: after submitting from a phone the resident is signed in; the dashboard window showed "Wysłano …", the receipt, "Otwórz wysłane pismo", and "Wyślij uzupełnienie" when a new report merged after dispatch; a laptop showed the device-only banner, then all of the citizen's reports with the four-stage timeline after sign-in; the phone's device view shows "Pismo wysłane do: Zarząd Dróg Miasta Krakowa".
  - Fixed during testing: an overflowing map URL in the PDF (long tokens now wrap; shorter link), Polish plural for new reports since dispatch.
  - `pnpm build` and `pnpm lint` passed. Test tickets, submissions, and stored letters removed; Mailpit stopped.
- Not verified: delivery through a real SMTP provider (only Mailpit), behaviour on Cloud Run, physical phone.
