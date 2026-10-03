# My Reports and Dashboard Login

- Status: `In Progress`
- Type: `feature`
- Branch: `None (user manages Git; work stays in the current working tree)`
- Created: `2026-10-03`
- Updated: `2026-10-03`
- Owner: `Marek55S`
- Authorization: `2026-10-03: user selected "„Moje zgłoszenia”" and "Logowanie do /admin" and will handle commits and deployment ("Sam to zrobię").`

## Goal

Close the communication loop for residents by showing the status of their reports, and protect the official dashboard from anonymous access.

## Design decisions

### My reports

- Resident identity: an anonymous random `reporter_id` (UUID) generated once per device and kept in `localStorage`.
  The mObywatel login is still a mock; in a real deployment the list would be tied to the verified identity.
- Each submission writes a `reports/{id}` document (`reporter_id`, `ticket_id`, title, category, image, location, `created_at`) in the same transaction as the clustering upsert.
  A top-level collection with an equality query avoids needing a collection-group index.
- `GET /api/my-reports?reporter=<uuid>` returns the resident's reports joined with the current ticket status, severity, and status timestamps.
- Status changes record `in_progress_at` and `resolved_at` on the ticket so the resident sees a timeline.
- UI: `/moje-zgloszenia` page with a status timeline per report; links from the home and confirmation screens.
- The `reporter_id` acts as a bearer token for that device's list; acceptable for the prototype and documented as a limitation.

### Dashboard login

- Single shared password from `ADMIN_PASSWORD`; sessions are an HMAC-signed, `httpOnly`, `SameSite=Lax` cookie with an 8-hour expiry, signed with `ADMIN_SESSION_SECRET` (falls back to the password).
- If `ADMIN_PASSWORD` is unset, login is impossible and admin routes stay closed.
- `src/proxy.ts` redirects unauthenticated `/admin` requests to `/admin/login` and returns 401 for admin APIs; the admin route handlers also verify the session (defense in depth, as the Next.js docs recommend).
- Protected: `/admin`, `GET /api/tickets`, `GET|PATCH /api/tickets/[id]`. Open: resident flow, `/api/analyze`, `/api/reports`, `/api/my-reports`, `/api/images` (unguessable object paths).
- Logout button in the dashboard header.

## Success criteria

- After submitting a report, `/moje-zgloszenia` lists it with its current status; changing the status in `/admin` is reflected there (timeline shows the date).
- A merged report shows the shared ticket's status and how many residents reported it.
- `/admin` without a session redirects to the login page; a wrong password is rejected; a correct one opens the dashboard; logout ends the session.
- `GET /api/tickets` and `PATCH /api/tickets/[id]` return 401 without a session.
- `pnpm build`, `pnpm lint`, and `pnpm check:clustering` pass.

## Out of scope

- Real identity (mObywatel), multiple admin accounts, roles, password reset, rate limiting of login attempts.
- Push or e-mail notifications about status changes.
- Showing reports created before this change in "Moje zgłoszenia" (they have no `reporter_id`).

## Risks and unknowns

- Clearing browser data loses the device's report list.
- Cloud Run needs `ADMIN_PASSWORD` (and preferably `ADMIN_SESSION_SECRET`) set at deploy time; without it the dashboard is locked. The user runs the deployment.

## Tasks

### Task 1: My reports

- [x] Complete
- Allowed files: `src/lib/tickets.ts`, `src/lib/types.ts`, `src/app/api/reports/route.ts`, `src/app/api/my-reports/`, `src/app/moje-zgloszenia/`, `src/components/resident/`, `scripts/check-clustering.ts`
- Done when: submission stores the report with `reporter_id`; the page shows reports with status timeline; status timestamps are recorded.
- Execution result:
  - Actual files: `src/lib/tickets.ts`, `src/lib/types.ts`, `src/app/api/reports/route.ts`, `src/app/api/my-reports/route.ts`, `src/app/moje-zgloszenia/page.tsx`, `src/components/resident/MyReports.tsx`, `src/components/resident/reporter.ts`, `src/components/resident/ReportFlow.tsx`, `scripts/check-clustering.ts`
  - Validation: Playwright (`pnpm dev`, real Firestore and Gemini): a fresh device shows the empty state; after submitting, "Moje zgłoszenia" listed one card; after an official set `IN_PROGRESS`, the card showed "Przyjęte 3 paź · W realizacji 3 paź · Rozwiązane" (pending) and "Zgłoszeń tego problemu: 2" because an earlier aborted test run had reported the same spot. `/api/my-reports?reporter=abc` → 400. `pnpm check:clustering` passed (cleanup extended to `reports`). Test ticket and its 2 submissions deleted.
  - Deviations: The page path is `/moje-zgloszenia`; it refreshes on window focus and via a button.

### Task 2: Dashboard login

- [x] Complete
- Allowed files: `src/lib/auth.ts`, `src/proxy.ts`, `src/app/admin/`, `src/app/api/admin/`, `src/app/api/tickets/`, `src/components/admin/`, `.env.example`, `README.md`
- Done when: the login success criteria pass locally.
- Execution result:
  - Actual files: `src/lib/auth.ts`, `src/proxy.ts`, `src/app/api/admin/login/route.ts`, `src/app/api/admin/logout/route.ts`, `src/app/admin/login/page.tsx`, `src/components/admin/LoginForm.tsx`, `src/components/admin/Dashboard.tsx`, `src/app/api/tickets/route.ts`, `src/app/api/tickets/[id]/route.ts`, `.env.example`; local `.env.local` got a generated `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (not committed).
  - Validation (curl): `/admin` without session → 307 to `/admin/login?next=%2Fadmin`; `GET /api/tickets` and `PATCH /api/tickets/x` → 401; wrong password → 401; correct → 200 with an `HttpOnly` cookie; with session `/api/tickets` and `/admin` → 200; cookie with a forged expiry → 401; logout → 200, then 401. Playwright: redirect to login, wrong password message, login, logout back to the login page. `pnpm build` (shows `Proxy (Middleware)`) and `pnpm lint` passed.
  - Deviations: None

### Task 3: Documentation

- [x] Complete
- Allowed files: `.ai/ARCHITECTURE.md`, `docs/ROADMAP.md`, `README.md`, this specification
- Done when: architecture and deploy instructions mention the new collection, page, env vars, and login.
- Execution result:
  - Actual files: `.ai/ARCHITECTURE.md`, `README.md` (deploy command with `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET`), `docs/ROADMAP.md`, this specification
  - Remaining work: User deploys with the new environment variables; physical phone test.
