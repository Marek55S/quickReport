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

## Follow-up: event address and notes precedence (2026-10-03)

- Request: include the event address in the e-mail and the letter; when the resident's notes say the report is about something slightly different from the photo, update the report.
- Changes: the letter has a bold "Miejsce zdarzenia" line under "Dotyczy" and an "Adres (przybliżony)" row (GPS when unknown); the e-mail subject and first body lines carry the address, GPS, and map link; tickets without an address are geocoded at dispatch and updated. The Gemini prompt now gives the resident's notes precedence over the photo (title, text, and category follow the notes; the photo documents the place) and marks notes as unused only when they are not about a city problem at all. Leaving the notes field with changed notes regenerates automatically; the button remains.
- Files: `src/lib/ai.ts`, `src/lib/letter.ts`, `src/lib/dispatch.ts`, `src/components/resident/ReportFlow.tsx`
- Validation (real Gemini, Mailpit): pothole photo + "it's about the street lamp next to it" → `INFRASTRUCTURE_FAILURE`, "Niesprawne oświetlenie uliczne", notes used; + "it's the pavement by the tram stop" → title about the pavement by the stop; + weather question → not used. E-mail subject "… – ok. Bożego Ciała 26, Stare Miasto, Kraków – do: Zarząd Dróg Miasta Krakowa", body starts with "Miejsce zdarzenia: …" and GPS with map link; the PDF contains the same "Miejsce zdarzenia" line. Playwright: typing notes and tapping another field changed the title to "Niesprawna latarnia uliczna" and the category without pressing the button; typing then pressing the button sent one analysis request. `pnpm build` and `pnpm lint` passed; test ticket and letter removed.

## Follow-up: per-browser simulated identity and device metadata (2026-10-04)

- Request: keep mocking mObywatel from the resident's side but make it believable – not one shared account that shows everyone's reports; base it on the session or device metadata.
- Decision: identity comes from the browser session, not from photo metadata (EXIF holds only make/model, e.g. "Apple iPhone 13", shared by many people, and no serial number, so using it would show other people's reports). Device metadata is recorded for officials only.
- Changes: each browser gets its own random citizen id in a signed session; name and masked PESEL are fictional and derived from the id (800 combinations); a remembered signed token returns the same person in the same browser after the cookie expires; "Nie Ty? Zaloguj inną osobę" switches to a new person. The mObywatel step is now: sign in → "Łączenie z mObywatel…" → card with name, PESEL, device (from the user agent), camera (from EXIF) → confirm and send. Reports and tickets store `camera` and `client_device`; the dashboard shows "Urządzenie: aparat … · wysłane z …". The shared demo identity was removed.
- Files: `src/lib/auth.ts`, `src/app/api/citizen/{login,me}/route.ts`, `src/app/api/my-reports/route.ts`, `src/app/api/reports/route.ts`, `src/lib/{tickets,types}.ts`, `src/components/resident/{ReportFlow.tsx,MyReports.tsx,media.ts,reporter.ts,i18n.ts}`, `src/components/admin/Dashboard.tsx`
- Validation (Playwright, iPhone Safari user agent): two browsers got different people (different PESEL) and each saw only its own 1 report; after clearing cookies the same browser signed in as the same person; "Nie Ty?" changed the person; the card showed "iPhone · Safari" and "Apple iPhone 13" from a photo with EXIF Make/Model; the dashboard showed "aparat: Apple iPhone 13 · wysłane z: iPhone · Safari". 5000 generated profiles gave 797 distinct names. `pnpm build` and `pnpm lint` passed; test tickets removed.

## Follow-up: category list, location limit, report details (2026-10-04)

- Request: do not collapse the category list after choosing (users got lost); shorten the no-location wait (11 s was too long, 7–8 s wanted); make reports in "Moje zgłoszenia" expandable with details.
- Changes: choosing a category keeps the list open with the choice highlighted; "Zwiń" closes it. `getPosition` waits 6.5 s for the browser plus a 1 s hard margin (≈ 7.5 s). Each submission now stores its own letter text; "Moje zgłoszenia" rows have "Pokaż szczegóły" (`aria-expanded`) revealing photos (before/after, viewer), the office's note, the report text (with a note that it is in Polish for EN/UA), category, place with address, GPS and an OpenStreetMap link, report time, number of reporters, and the letter's unit, time, and receipt (or "not sent yet").
- Files: `src/components/resident/{ReportFlow.tsx,media.ts,MyReports.tsx,i18n.ts}`, `src/lib/{tickets,types}.ts`
- Validation (Playwright): after choosing "Przystanek i komunikacja" the list stayed open and the choice had `aria-pressed=true`; with location never answering the review appeared after 7.9 s; after an official dispatched and resolved the report with a photo and note, the expanded row showed photos before/after, "Informacja od urzędu", the text, place, report time, and the letter to Zarząd Dróg Miasta Krakowa with the `UPO-…` receipt; the English view rendered. `pnpm build` and `pnpm lint` passed; test tickets removed.

