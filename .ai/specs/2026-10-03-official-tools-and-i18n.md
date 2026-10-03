# Official Tools, AI Danger Level, Address, Languages, Demo Photos

- Status: `Implemented`
- Type: `feature`
- Branch: `None (user manages Git; work stays in the current working tree)`
- Created: `2026-10-03`
- Updated: `2026-10-03`
- Owner: `Marek55S`
- Authorization: `2026-10-03: user approved: after-repair photo, language versions, admin filters/search, statistics, real demo photos, AI danger level as a second factor that admins can see and filter by, and an approximate address shown in addition to GPS.`

## Design decisions

- **AI danger level:** Gemini also returns `danger_level` (1–5) and a one-sentence `danger_reason` (Polish). It is a second factor next to the report count, not merged into it. Stored on the ticket; on a merge the ticket keeps the higher level. Shown and filterable in the dashboard only (not to residents).
- **Approximate address:** reverse geocoding with OpenStreetMap Nominatim on the server (`/api/geocode`, in-memory cache, identifying User-Agent, ≤ 1 request/s per its usage policy). Shown on the review screen as "ok. <street number, district>"; stored with each ticket and submission at submit time; shown in the dashboard and "Moje zgłoszenia". GPS stays visible. Failure leaves the address empty.
- **After-repair photo:** when resolving, an official can attach a photo (`POST /api/tickets/[id]/resolution`, multipart). Stored as `resolution_image_path` and `resolved_note` (optional). Residents see before/after in "Moje zgłoszenia"; officials see it in ticket details.
- **Dashboard filters:** client-side over the loaded status tab: text search (title, address, ticket number), category, danger level (≥ value), sort by reports (default), danger level, or newest.
- **Statistics:** dashboard "Statystyki" view backed by `GET /api/stats` (admin only): totals per status, reports per category, average time to resolution, daily reports for the last 14 days, top danger tickets. Charts follow the `dataviz` skill.
- **Languages:** resident app in Polish, English, and Ukrainian with a language switcher (stored per device). The letter to the city office stays in Polish (the office's language); the UI says so. Category labels are translated. Dashboard stays Polish. No new i18n dependency; a typed dictionary module.
- **Real demo photos:** seed uses freely licensed photos from Wikimedia Commons, downloaded into the bucket, with author/licence attribution recorded in `scripts/seed.ts` and `docs/ATTRIBUTION.md`.

## Tasks

1. Backend: danger level, address (geocode endpoint, storage), resolution endpoint, stats endpoint, types.
2. Dashboard: danger badge, address, filters/search/sort, resolution photo upload, statistics view.
3. Resident: address on review, before/after in "Moje zgłoszenia", language switcher and translations.
4. Demo data: Commons photos with attribution; seed with danger levels and addresses.
5. Docs: architecture, README, roadmap.

## Success criteria

- A new report gets a danger level and reason from Gemini and an approximate address; both appear in the dashboard.
- Dashboard search, category, danger, and sort controls change the list; statistics view renders from real data.
- Resolving with a photo shows before/after to the resident.
- Switching language changes all resident UI text (PL/EN/UK).
- `pnpm build`, `pnpm lint`, `pnpm check:clustering` pass; screens captured at mobile and desktop sizes.

## Out of scope

- Departments routing, notifications, real identity, heatmap layer.

## Execution result

- Actual files: `src/lib/types.ts`, `src/lib/ai.ts`, `src/lib/tickets.ts`, `src/lib/geocode.ts`, `src/app/api/geocode/route.ts`, `src/app/api/stats/route.ts`, `src/app/api/tickets/[id]/resolution/route.ts`, `src/app/api/reports/route.ts`, `src/proxy.ts`, `src/components/admin/Dashboard.tsx`, `src/components/admin/StatsView.tsx`, `src/components/admin/severity.ts`, `src/components/resident/ReportFlow.tsx`, `src/components/resident/MyReports.tsx`, `src/components/resident/i18n.ts`, `scripts/seed.ts`, `scripts/check-clustering.ts`, `scripts/seed-images/*`, `docs/ATTRIBUTION.md`, `README.md`, `.ai/ARCHITECTURE.md`, `docs/ROADMAP.md`
- Validation:
  - `pnpm check:clustering` passed, including a new case: a merged report with a higher danger level raises the ticket's level.
  - `pnpm seed` created 7 demo tickets with Commons photos, danger levels, Nominatim addresses (e.g. "Grodzka 41, Stare Miasto, Kraków"), one in progress and one resolved with before/after photos; it now deletes only demo tickets, so real reports are kept.
  - API on `next start`: `/api/geocode` returned "Rynek Główny 3, Stare Miasto, Kraków" (invalid input → 400); `/api/stats` 401 without session, aggregates with session; real Gemini returned danger 4 with a reason for a pothole and 1 for a blank wall.
  - Playwright: language switch sets `<html lang>`; EN review shows "approx. Zamek Wawel, Stare Miasto, Kraków" and the Polish-letter note; danger ≥ 4 filter left 2 tickets; resolving via the form with a photo and note made "Moje zgłoszenia" show before/after in EN and UK; statistics rendered on desktop and mobile. One fix pass: cramped search field, chart maximum gridline misaligned with bars (bars were scaled to 88 %), truncated category labels, crowded phone header, browser-locale dates.
  - `pnpm build` and `pnpm lint` passed. Test tickets removed.
- Deviations: no accessibility-barrier demo photo with a free licence was found; a fallen street-name sign is used instead. The danger level is sent by the client with the AI result (not re-derived on the server), so a modified client could alter it; acceptable for the prototype.
- Not verified: physical phone, keyboard-only walkthrough, Nominatim behaviour under load.

## Follow-up: photo viewer and large ticket window (2026-10-03)

- Request: open photos and open a larger window for a specific ticket.
- Changes: `src/components/Lightbox.tsx` (full-screen viewer on a native `<dialog>`: Esc closes, arrow keys and buttons switch photos, counter and captions, translated labels for residents); dashboard ticket details have "Otwórz w dużym oknie" opening a wide dialog with a large main photo, thumbnails, focused map, danger reason, letter, details, after-repair photo, and actions; every photo in the dashboard and in "Moje zgłoszenia" (before/after) opens the viewer. `TicketMap` gained a `focus` mode and no longer fits bounds while its container has no size.
- Validation (Playwright on `next start`): the dialog opened for "Głęboka wyrwa w jezdni"; viewer showed "1 z 7", ArrowRight → "2 z 7"; first Esc closed only the viewer, second Esc the ticket window; mobile ticket window rendered; resident viewer showed "2 of 2" with "After repair". Fixed during testing: a NaN map error (fitting a zero-size map inside the opening dialog) that prevented the window from opening, and Esc closing both dialogs because React propagated the inner `close` event. `pnpm build` and `pnpm lint` passed; test ticket removed.

