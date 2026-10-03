# One-Snap Reporting MVP (SMART CITY)

- Status: `In Progress`
- Type: `feature`
- Branch: `feature/one-snap-mvp`
- Created: `2026-10-03`
- Updated: `2026-10-03`
- Owner: `Marek55S`
- Authorization: `2026-10-03: user approved the Google Cloud stack and Task 1 ("zacznij stawiać szkielet"). After Google Cloud setup ("gotowe") the user approved continuing with Tasks 2 and 3. After the user's commit ("zacommitowałem, rób dalej") Tasks 4–6 were approved. Task 7 deployment was run by the user; Claude granted the missing `roles/datastore.user` from the documented setup.`

## Goal

Deliver a working, demo-ready prototype of an AI-assisted city issue reporting system within about 4 hours, suitable for the SMART CITY category submission.
Residents report an issue with a single photo; officials receive deduplicated, prioritized tickets on a map.

## Context

User requirements (from the provided PRD):

- Resident app: mobile-first PWA. Flow: "Report a problem" → take photo → capture GPS → AI analysis → summary screen (category, title, formal report) → confirm with a simulated mObywatel login.
- AI: multimodal vision model returns strict JSON with `category` (enum: `ROAD_DAMAGE`, `ACCESSIBILITY_BARRIER`, `INFRASTRUCTURE_FAILURE`, `OTHER`), `title`, and `formal_report` (formal Polish administrative language).
- Backend: Supabase (PostgreSQL). Compute an 8-character geohash (~38 m × 19 m cell) from GPS. The database choice is replaced by Firestore under the Google Cloud constraint (see Proposed stack).
- Clustering upsert: if an `OPEN` ticket with the same `geohash` and `category` exists, increment `severity_score` and attach the new image in `ticket_images`; otherwise create a ticket with `severity_score = 1`.
- Official dashboard: list of `OPEN` tickets sorted by `severity_score` descending, Leaflet map with marker size/color by severity, buttons to set `IN_PROGRESS` or `RESOLVED`.
- External APIs and AI models are allowed.

Current repository: template only, no application code (see `.ai/ARCHITECTURE.md`).
Verified local tooling: Node.js v24.14.1, npm, pnpm, Docker.

## Proposed stack (pending user confirmation)

User constraint (2026-10-03): every component must be free or payable with the user's Google Cloud credits; the vision model comes from Google Cloud.

- One Next.js (App Router, TypeScript) app with Tailwind CSS hosting both frontends: `/` resident PWA, `/admin` official dashboard.
- Next.js Route Handlers as the backend; credentials never reach the browser.
- AI: Gemini Flash on Vertex AI via the `@google/genai` SDK, using `responseSchema` structured output with the category enum, plus server-side `zod` validation.
  The exact model version is confirmed in Task 3 against what the project has enabled.
- Database: Firestore (Native mode). Atomic clustering uses a transaction over a lock document `open_clusters/{geohash}_{category}` that points to the current `OPEN` ticket.
- Photos: Cloud Storage bucket.
- Geohash: computed in the route handler with the `ngeohash` package.
- Map: Leaflet via `react-leaflet` with OpenStreetMap tiles (free, no key).
- Hosting: Cloud Run (container built from source by Cloud Build), which provides HTTPS required for camera and geolocation on phones.
- Auth to Google services: Application Default Credentials. On Cloud Run the attached service account is used, so no key file is needed; locally use `gcloud auth application-default login`.

Alternatives considered:
- Cloud SQL for PostgreSQL: allows a SQL `INSERT ... ON CONFLICT` upsert, but costs credits continuously and needs instance provisioning and connector setup; slower for a 4-hour build.
- Supabase free tier and Vercel Hobby: free and fast to set up, but outside Google Cloud and do not use the credits.

## Success criteria

- On a phone over HTTPS, a user can take a photo, grant location, see an AI-generated category, title, and formal report in Polish, confirm via a mock mObywatel screen, and get a confirmation with a ticket ID.
- Submitting two reports with the same category from the same spot (same 8-char geohash) results in one `OPEN` ticket with `severity_score = 2` and two images.
- Submitting a different category at the same spot creates a separate ticket.
- All services run in the user's Google Cloud project (or free OpenStreetMap tiles); no other paid accounts are required.
- `/admin` shows `OPEN` tickets in a table sorted by `severity_score` descending and as map markers whose size/color reflect severity.
- Changing a ticket's status in `/admin` persists in Firestore and removes it from the `OPEN` list; a new report at that spot then creates a fresh ticket.
- If the AI call fails or no key is configured, the app falls back to a deterministic mock response so the demo never blocks.

## Evidence and references

- PRD supplied by the user in the conversation on 2026-10-03.
- `.ai/ARCHITECTURE.md`: no existing implementation.

## Constraints

- Time box: about 4 hours to a submittable prototype.
- Camera and geolocation browser APIs require a secure context (HTTPS or localhost).
- Secrets stay server-side and in `.env.local` (already ignored by `.gitignore`); provide `.env.example`.
- Paid components must be payable from Google Cloud credits; everything else must be free.

## Out of scope

- Real mObywatel / Login.gov.pl integration (a mock screen only).
- Real user accounts and admin authentication (the `/admin` route is open for the demo).
- Offline queueing, push notifications, and full service-worker caching (PWA manifest and installability only).
- Routing tickets to specific city departments, SLA tracking, and notifications to residents.
- Automated test suites beyond a minimal clustering check.

## Risks and unknowns

- Google Cloud setup: a project with billing (credits) and enabled APIs (Vertex AI, Firestore, Cloud Storage, Cloud Run, Cloud Build, Artifact Registry). `gcloud` CLI is not installed on this workstation (verified 2026-10-03). Resolution: user installs `gcloud`, runs `gcloud auth login` and `gcloud auth application-default login`, and provides the project ID and region.
- Gemini model availability in the chosen region. Resolution: confirm in Task 3; mock fallback covers missing access.
- Submission requirements (verified in `Details - SMART CITY.pdf`): required project title, team name, members, description, and a PDF presentation of at most 10 slides; optional snapshots, repo, demo links. Significant use of AI tools, external models, and APIs must be disclosed. Judging: idea 30%, category fit 20%, usability 20%, design 20%, completeness 10%.
- Geohash cell edges: observed during seeding (3 reports 1–3 m apart split into separate tickets). Resolved in Task 2 by also checking the 8 neighbouring cells; the effective merge radius is about one to two cells (~20–75 m).
- Concurrent duplicate reports could race. Mitigated by a Firestore transaction that reads and writes the `open_clusters/{geohash}_{category}` document.
- Cost control: Firestore and Cloud Storage free tiers cover the demo; Cloud Run can scale to zero; Gemini calls are billed per request to credits. Resolution: set a budget alert in the project.
- Photo size from phone cameras: downscale client-side (e.g. max 1280 px, JPEG) before upload to keep AI latency and storage low.
- Indoor GPS inaccuracy during the demo: allow a manual map pin or fixed demo location as fallback.

## Tasks

Suggested time budget is in brackets; Tasks 3 and 6 can run in parallel with Task 4 once Task 1 is done.
If time runs short, cut in this order: PWA manifest polish, attaching extra images to merged tickets, Cloud Run deploy (demo on a tunnel instead).

### Task 1: Scaffold the app [30 min]

- [x] Complete
- Goal: Running Next.js + Tailwind app with routes `/` and `/admin`, env template, and updated architecture map.
- Allowed files:
  - `package.json`, lockfile, Next.js/Tailwind/TypeScript config files, `src/`, `public/`
  - `.env.example`, `.gitignore` (add `node_modules/`, `.next/`)
  - `.ai/ARCHITECTURE.md`, `README.md` (run commands)
- Do not touch:
  - `.agents/`, other `.ai/` templates
- Evidence and references:
  - None
- Concrete steps:
  1. `pnpm create next-app` with TypeScript, Tailwind, App Router, `src/` directory; set `output: 'standalone'` for Cloud Run.
  2. Add placeholder pages `src/app/page.tsx` (resident) and `src/app/admin/page.tsx`.
  3. Add `public/manifest.webmanifest` and icons; link the manifest in the root layout with mobile viewport/theme color.
  4. Create `.env.example` with `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GCS_BUCKET`, `GEMINI_MODEL`, `AI_MOCK`.
  5. Update `.ai/ARCHITECTURE.md` and `README.md` with the chosen stack and commands.
- Tests or validation:
  - `pnpm build` succeeds; `pnpm dev` serves `/` and `/admin`.
- External actions or long-running commands:
  - Package installation from npm.
- Done when:
  - Both routes render locally and the build passes.
- Dependencies:
  - User confirmation of the proposed stack.
- Execution result:
  - Actual files: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/{layout.tsx,page.tsx,globals.css,manifest.ts,icon.svg}`, `src/app/admin/page.tsx`, `public/icon.svg`, `.env.example`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `.ai/ARCHITECTURE.md`
  - Commits: `Not created`
  - Validation: `pnpm build` passed (routes /, /admin, /manifest.webmanifest, /icon.svg); `pnpm lint` passed with no output; `pnpm dev` returned HTTP 200 for /, /admin, /manifest.webmanifest.
  - Deviations: Scaffolded with create-next-app (Next.js 16.3.8, Tailwind 4) in a scratch directory and copied in, since the repo was not empty. Manifest uses `src/app/manifest.ts` instead of `public/manifest.webmanifest`, and one SVG icon instead of PNG sizes. Appended the Next.js agent-rules block that `next dev` writes to `AGENTS.md`, plus `CLAUDE.md` importing it. Runtime dependencies for later tasks are already installed (`zod`, `ngeohash`, `@google/genai`, `@google-cloud/firestore`, `@google-cloud/storage`, `leaflet`, `react-leaflet`).
  - Remaining work: None
  - Next step: Task 2 after Google Cloud project setup; Tasks 3 (mock mode), 5, and 6 UI can start now.

### Task 2: Data model and clustering logic [30 min]

- [x] Complete
- Goal: Firestore data model, Cloud Storage bucket, and an atomic `submitReport` function implementing the clustering upsert.
- Allowed files:
  - `src/lib/firestore.ts`, `src/lib/storage.ts`, `src/lib/tickets.ts`, `src/lib/types.ts`
  - `firestore.indexes.json`, `scripts/seed.ts`, `scripts/check-clustering.ts`, `src/app/api/images/`
- Do not touch:
  - UI files
- Evidence and references:
  - PRD section 5.
- Concrete steps:
  1. Collection `tickets`: `geohash`, `category`, `title`, `formal_report`, `gps_lat`, `gps_lng`, `status` (`OPEN`, `IN_PROGRESS`, `RESOLVED`), `severity_score`, `image_url`, `created_at`, `updated_at`.
  2. Subcollection `tickets/{id}/images`: `image_url`, `gps_lat`, `gps_lng`, `created_at` (equivalent of the PRD's `ticket_images`).
  3. Collection `open_clusters` with document ID `{geohash}_{category}` and field `ticket_id`.
  4. `submitReport()` in a Firestore transaction: read the cluster document; if present, increment the ticket's `severity_score` and add an image; otherwise create the ticket with `severity_score = 1`, its first image, and the cluster document. Return the ticket and a `merged` flag.
  5. When a ticket leaves `OPEN`, delete its cluster document in the same transaction, so a new report at that spot creates a fresh ticket.
  6. Composite index `status ASC, severity_score DESC` for the dashboard query.
  7. Create the Cloud Storage bucket for photos (public read for the demo, or signed URLs).
  8. Seed script with several demo tickets in one city area with varied severity.
- Tests or validation:
  - A script calling `submitReport` twice with the same geohash/category yields one ticket with `severity_score = 2` and two images; a different category yields a new ticket; resolving then reporting again yields a new ticket.
- External actions or long-running commands:
  - Creating the Firestore database, bucket, and index in the user's Google Cloud project.
- Done when:
  - The validation script produces the expected documents.
- Dependencies:
  - Google Cloud project access (see Risks).
- Execution result:
  - Actual files: `src/lib/types.ts`, `src/lib/firestore.ts`, `src/lib/storage.ts`, `src/lib/tickets.ts`, `src/app/api/images/[...path]/route.ts`, `scripts/check-clustering.ts`, `scripts/seed.ts`, `next.config.ts` (`serverExternalPackages`), `package.json` (`tsx`, scripts `check:clustering`, `seed`)
  - Commits: `Not created`
  - Validation: `pnpm check:clustering` passed against Firestore `quickreport-hy26` (same cell merges to severity 2 with 2 images; neighbouring cell merges; ~220 m away does not; different category does not; 3 concurrent reports merge into one ticket with severity 3; resolved ticket does not absorb new reports); afterwards 0 tickets and 0 clusters remained. Cloud Storage upload/download round trip verified. `pnpm seed` created 6 Kraków demo tickets with severities 7, 4, 3, 2, 1, 1. `/api/images/seed/...` returned 200; a path-traversal request returned 404.
  - Deviations: Neighbouring-cell clustering added (was a stretch goal) after seeding showed cell-edge splits. No composite index: dashboard query uses an equality filter and sorts by severity in memory. Photos stay in a private bucket and are served through `/api/images/[...path]` instead of a public bucket (privacy, and signed URLs do not work with user ADC locally). Seed images are generated SVG placeholders.
  - Remaining work: None
  - Next step: Task 4 (`POST /api/reports`)

### Task 3: AI image analysis endpoint [40 min]

- [x] Complete
- Goal: `POST /api/analyze` accepts an image and returns validated `{ category, title, formal_report }`.
- Allowed files:
  - `src/app/api/analyze/route.ts`, `src/lib/ai.ts`, `src/lib/types.ts`
- Do not touch:
  - Database schema
- Evidence and references:
  - PRD section 4.
- Concrete steps:
  1. Define the category enum and response type in `src/lib/types.ts`; validate with `zod`.
  2. Implement the vision call with a system prompt in Polish: classify into the enum, short title, formal administrative report addressed to the city office (include placeholders for address/location provided by the server).
  3. Call Gemini with the image as inline data and `responseMimeType: application/json` + `responseSchema` (category as enum); coerce invalid categories to `OTHER`.
  4. Return a deterministic mock response when `AI_MOCK=1`, no key is set, or the call fails/times out.
- Tests or validation:
  - `curl` with a sample pothole photo returns valid JSON with `ROAD_DAMAGE`; with `AI_MOCK=1` returns the mock.
- External actions or long-running commands:
  - Paid AI API calls (small cost per request).
- Done when:
  - Real and mock modes both return schema-valid responses.
- Dependencies:
  - Task 1; Vertex AI access for real mode.
- Execution result:
  - Actual files: `src/lib/ai.ts`, `src/app/api/analyze/route.ts`
  - Commits: `Not created`
  - Validation: Probed Vertex AI: `gemini-2.5-flash` works in `europe-west1`; `gemini-3-flash-preview` only in `global`. `curl -F image=@pothole.jpg` (Wikimedia Commons photo "Pothole in Villeray, Montréal") returned `ROAD_DAMAGE`, title "Duża dziura w nawierzchni jezdni", and a formal Polish report with GPS and date, in 6.4 s. Request without an image returned 400. `pnpm build` and `pnpm lint` passed.
  - Deviations: Uses `responseJsonSchema` with a hand-written JSON schema; the model's output is re-validated with zod and unknown categories fall back to `OTHER`. Mock mode is used when `AI_MOCK=1`, the project is unset, or the call fails/times out (25 s); the response includes `source: "ai" | "mock"`. Mock mode was not exercised over HTTP in this run.
  - Remaining work: None
  - Next step: Task 5 resident flow

### Task 4: Report submission endpoint [25 min]

- [x] Complete
- Goal: `POST /api/reports` stores the photo, computes the geohash, and calls `submitReport`.
- Allowed files:
  - `src/app/api/reports/route.ts`, `src/lib/geohash.ts`
- Do not touch:
  - UI files
- Evidence and references:
  - PRD section 5.
- Concrete steps:
  1. Accept image, `lat`, `lng`, and the AI result (re-validate with `zod`).
  2. Compute `ngeohash.encode(lat, lng, 8)`.
  3. Upload the image to the Cloud Storage bucket; get its URL.
  4. Call `submitReport`; return `{ ticketId, merged, severity_score }`.
- Tests or validation:
  - Two `curl` submissions with identical coordinates and category return the same `ticketId`, `merged: true`, and `severity_score: 2`.
- External actions or long-running commands:
  - Writes to Firestore and Cloud Storage.
- Done when:
  - Clustering behaves per the success criteria via the API.
- Dependencies:
  - Tasks 1 and 2.
- Execution result:
  - Actual files: `src/app/api/reports/route.ts`
  - Commits: `Not created`
  - Validation: `curl` against `pnpm dev`: report next to the seeded pothole ticket returned `merged: true`, severity 8, HTTP 200; report at a new spot returned `merged: false`, severity 1, HTTP 201; request without an image returned 400.
  - Deviations: Geohash is computed inside `submitReport` (Task 2) instead of a separate `src/lib/geohash.ts`.
  - Remaining work: None
  - Next step: None

### Task 5: Resident mobile flow [45 min]

- [x] Complete
- Goal: Mobile-first UI implementing the full resident flow.
- Allowed files:
  - `src/app/page.tsx`, `src/app/report/`, `src/components/resident/`
- Do not touch:
  - `src/app/admin/`
- Evidence and references:
  - PRD section 3.
- Concrete steps:
  1. Home screen with a large "Zgłoś problem" button.
  2. Photo capture via `<input type="file" accept="image/*" capture="environment">`; downscale on a canvas before upload.
  3. Get location with `navigator.geolocation`; show a fallback (fixed demo location) when denied or unavailable.
  4. Call `/api/analyze` with a loading state; show category, title, and editable formal report.
  5. Mock mObywatel confirmation screen (styled login step, no real integration), then call `/api/reports`.
  6. Success screen: ticket ID and a message when the report joined an existing ticket ("Twoje zgłoszenie dołączono do istniejącego — X osób zgłosiło ten problem").
- Tests or validation:
  - Manual run on a phone over HTTPS (deployed URL or tunnel) through the full flow.
- External actions or long-running commands:
  - None
- Done when:
  - The full flow works on a phone and creates or merges a ticket.
- Dependencies:
  - Tasks 3 and 4.
- Execution result:
  - Actual files: `src/app/page.tsx`, `src/components/resident/ReportFlow.tsx`, `src/components/resident/media.ts`, `src/components/categories.ts`, `src/app/globals.css`, `package.json` (`lucide-react`)
  - Commits: `Not created`
  - Validation: Playwright (playwright-core in the scratch directory, system Chrome, 390×844 mobile viewport, mocked geolocation) drove the flow: photo selection → "Analizuję zdjęcie" → review with real Gemini output and GPS ±8 m → mObywatel mock → "Zgłoszenie wysłane" with a merged message ("zgłosiło już 9 osób"). Screenshots reviewed manually. Not yet tested on a physical phone over HTTPS.
  - Deviations: Location is requested when "Zgłoś problem" is tapped, in parallel with taking the photo; denial or timeout falls back to a Kraków demo location shown as "Lokalizacja demonstracyjna". Category, title, and report are editable before sending.
  - Remaining work: Physical phone test over HTTPS (Task 7).
  - Next step: Task 7

### Task 6: Official dashboard [45 min]

- [x] Complete
- Goal: `/admin` with a prioritized table, severity map, and status changes.
- Allowed files:
  - `src/app/admin/`, `src/components/admin/`, `src/app/api/tickets/`
- Do not touch:
  - Resident flow files
- Evidence and references:
  - PRD section 6.
- Concrete steps:
  1. `GET /api/tickets?status=OPEN` ordered by `severity_score desc`.
  2. Table: title, category, severity, report count, created time, thumbnail.
  3. `react-leaflet` map loaded with `next/dynamic` (`ssr: false`); `CircleMarker` radius and color scale with severity; popup with photo and formal report.
  4. `PATCH /api/tickets/[id]` to set `IN_PROGRESS` or `RESOLVED`; buttons in the table and popup.
  5. Periodic refresh (e.g. every 10 s) so new reports appear live during the demo.
- Tests or validation:
  - With seed data, the table order matches severity, markers differ by severity, and a status change persists after reload.
- External actions or long-running commands:
  - None
- Done when:
  - All dashboard success criteria pass manually.
- Dependencies:
  - Task 2 (seed data); Task 1.
- Execution result:
  - Actual files: `src/app/admin/page.tsx`, `src/components/admin/Dashboard.tsx`, `src/components/admin/TicketMap.tsx`, `src/components/admin/severity.ts`, `src/app/api/tickets/route.ts`, `src/app/api/tickets/[id]/route.ts`
  - Commits: `Not created`
  - Validation: `GET /api/tickets?status=OPEN` returned tickets ordered 8, 4, 3, 2, 1, 1, 1; `PATCH` to `RESOLVED` returned 200 and the ticket moved to `?status=RESOLVED`; invalid status 400; unknown ID 404. Headless Chrome screenshot at 1440×900 showed the map with severity-sized and coloured markers, stat tiles, tabs, and the sorted list. `pnpm build` and `pnpm lint` passed.
  - Deviations: Added tabs for `IN_PROGRESS` and `RESOLVED`, summary tiles, and an expandable row with all merged photos and the formal report. Status buttons live in the expanded row rather than a map popup; clicking a marker selects the row.
  - Remaining work: None
  - Next step: Task 7

### Task 7: Deploy and submission package [30 min]

- [ ] Complete
- Goal: Public HTTPS demo and material for the category submission.
- Allowed files:
  - `README.md`, `.ai/ARCHITECTURE.md`, deployment config if needed
- Do not touch:
  - Application logic, except fixes found during the demo run
- Evidence and references:
  - Hackathon submission rules (unknown; see Risks).
- Concrete steps:
  1. Deploy to Cloud Run with `gcloud run deploy --source .` in the chosen region, with environment variables set and a service account granted Vertex AI User, Cloud Datastore User, and Storage Object Admin roles.
  2. Run the end-to-end demo scenario on a phone: report a pothole twice from one spot, show merge, change status in `/admin`.
  3. Update `README.md`: problem, solution, architecture diagram, demo link, setup steps, and stretch goals.
  4. Prepare the required submission items: title, team, description, and a PDF deck of at most 10 slides; add screenshots and demo link; disclose AI tools, Gemini, and libraries used.
- Tests or validation:
  - Deployed URL passes the end-to-end scenario on a phone.
- External actions or long-running commands:
  - Cloud Run deployment and publishing the repository; require user authorization.
- Done when:
  - Demo URL works and the submission material is ready.
- Dependencies:
  - Tasks 5 and 6; submission rules.
- Execution result:
  - Actual files: `Dockerfile`, `.dockerignore`, `.gcloudignore`, `README.md` (deployment section)
  - Commits: `Not created`
  - Validation: Local `docker build` succeeded and the container served `/`, `/admin`, `/icon.svg` with 200. User deployed with `gcloud run deploy --source .`: revision `quickreport-00001-xvk` at https://quickreport-875960213491.europe-central2.run.app. `/`, `/admin`, manifest 200; `/api/analyze` returned a Gemini result via the service account; `/api/tickets` returned 500 until `roles/datastore.user` was granted to `quickreport-run` (the setup step had not applied), then 200; `POST /api/reports` merged into the seeded ticket (severity 8). Demo data reseeded afterwards.
  - Deviations: A first deploy attempt was started from the home directory and was cancelled before upload; the source bucket was verified empty.
  - Remaining work: Physical phone test over HTTPS; README project description and AI/library disclosure; PDF deck (max 10 slides).
  - Next step: Phone test and submission material

### Stretch goals (only after Task 7)

Moved to [`docs/ROADMAP.md`](../../docs/ROADMAP.md).

## Handoff

- Actual change summary: `Not started`
- Remaining decisions or actions: `Confirm stack; provide Google Cloud project ID and region with gcloud set up; check submission requirements`
- PR: `Not created`
