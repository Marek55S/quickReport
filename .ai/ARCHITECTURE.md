# Repository Architecture

## Current state

The project is **QuickReport**, a one-snap city issue reporting system for the HackYeah 2026 SMART CITY challenge.
Plan and task status: [`.ai/specs/2026-10-03-one-snap-reporting-mvp.md`](specs/2026-10-03-one-snap-reporting-mvp.md).

| Area | Current decision |
| --- | --- |
| Challenge and intended users | SMART CITY; residents reporting issues and city officials triaging them |
| Product scope and demo scenario | See the specification |
| Application components and stack | Next.js 16 (App Router, TypeScript) + Tailwind CSS 4 + lucide-react, one app: resident PWA at `/`, official dashboard at `/admin` (react-leaflet map) |
| Data sources and external integrations | Google Cloud project `quickreport-hy26`: Gemini `gemini-2.5-flash` on Vertex AI (`europe-west1`), Firestore Native (`eur3`), private Cloud Storage bucket `quickreport-hy26-report-images` (`europe-central2`); OpenStreetMap tiles for the map |
| Persistence and identity | Firestore collections `tickets` (+ `images` subcollection) and `open_clusters`; auth via Application Default Credentials; mObywatel login planned as a mock; no admin auth |
| Hosting and deployment | Proposed: Cloud Run (`output: "standalone"` is configured); not deployed |
| Build, test, and run commands | `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm check:clustering`, `pnpm seed` |

## Existing repository map

| Path | Purpose |
| --- | --- |
| `README.md` | Project overview and workflow entry points |
| `AGENTS.md` | Repository instructions and skill routing |
| `.agents/skills/` | Reusable planning, implementation, and PR skills |
| `.ai/RULES.md` | Scope, evidence, validation, and sharing conventions |
| `.ai/WORKFLOW.md` | Specification lifecycle and task execution |
| `.ai/specs/` | Specification template and future work plans |
| `.ai/decisions/` | Decision template and future durable decisions |
| `.ai/research/` | Investigation template and future evidence notes |
| `.ai/templates/` | Reusable PR description template |
| `src/components/resident/` | Resident flow: camera or gallery photo, location source (device / EXIF / map pin), AI review with optional notes, mObywatel mock, confirmation |
| `src/components/admin/` | Dashboard: severity map, prioritized list, status changes, 10 s polling |
| `src/app/api/reports/`, `src/app/api/tickets/` | Report submission (upload + clustering), ticket listing, photos, status updates |
| `src/app/manifest.ts`, `src/app/icon.svg` | PWA manifest and app icon |
| `src/lib/tickets.ts` | Clustering upsert (`submitReport`: geohash-8 cell + 8 neighbours, same category, Firestore transaction), status changes, listing |
| `src/lib/ai.ts`, `src/app/api/analyze/route.ts` | Gemini analysis of photo + optional notes (11 categories incl. default `NOT_DETECTED`) with structured JSON output and mock fallback |
| `src/lib/storage.ts`, `src/app/api/images/` | Photo upload to the private bucket and proxy for serving photos |
| `scripts/` | Clustering check and demo seed against the configured project |
| `next.config.ts` | Next.js config with standalone output for Cloud Run |
| `.env.example` | Required environment variables |
| `docs/ROADMAP.md` | Proposed features after the MVP |
| `docs/submission/` | Submission assets (cover image) |
| `Details - SMART CITY.pdf` | Challenge description, judging criteria, submission requirements |

## Updating this map

Once a challenge and implementation approach are chosen, replace the undecided entries with verified decisions.
Describe the actual components, entry points, important data flows, external dependencies, and run or validation commands.
Link to relevant source paths and decision records.
Keep proposed components clearly labeled until implemented, and remove outdated descriptions as the code changes.
