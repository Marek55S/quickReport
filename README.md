# QuickReport – HackYeah 2026 (SMART CITY)

One-snap city issue reporting: a resident takes a photo, AI classifies the problem and drafts a formal report, and duplicate reports from the same spot are clustered into one prioritized ticket for city officials.

Features: one-photo report with AI category, formal letter, and danger level (Gemini); clustering of duplicates; approximate address (OpenStreetMap Nominatim); location from phone, photo EXIF, or map pin; resident app in Polish, English, and Ukrainian; "Moje zgłoszenia" with status timeline and before/after photos (per device, or across devices after a simulated mObywatel sign-in); letter to the responsible city unit as a PDF, sent by an official (e-mail via SMTP or simulated delivery with a receipt number); official dashboard with filters, search, map, after-repair photo, and statistics.

Jury guide (PL): [docs/submission/INSTRUKCJA.md](docs/submission/INSTRUKCJA.md). Planned features: [docs/ROADMAP.md](docs/ROADMAP.md). Third-party material: [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md).

## Running locally

Requires Node.js 24 and pnpm.

```bash
pnpm install
cp .env.example .env.local   # AI_MOCK=1 works without Google Cloud
pnpm dev                     # http://localhost:3000 (resident), /admin (official)
```

For real Google Cloud services, run `gcloud auth application-default login`, set `AI_MOCK=0` in `.env.local`, and use:

- `pnpm seed`: replace the demo tickets around Kraków (real reports are kept); photos from Wikimedia Commons, see [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)
- `pnpm check:clustering`: verify the clustering rules against Firestore (cleans up after itself)

Other commands: `pnpm build`, `pnpm lint`.
Camera and GPS on a phone require HTTPS (deployed URL or a tunnel).

Shared instructions, skills, specifications, and decision records are intended to stay in version control.

## Deploying to Cloud Run

The `Dockerfile` builds the Next.js standalone server; `gcloud run deploy --source .` builds it with Cloud Build.

One-time setup (runtime service account with the minimum roles):

```bash
PROJECT=quickreport-hy26
SA=quickreport-run@$PROJECT.iam.gserviceaccount.com
gcloud iam service-accounts create quickreport-run --display-name="QuickReport Cloud Run"
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/aiplatform.user
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/datastore.user
gcloud storage buckets add-iam-policy-binding gs://$PROJECT-report-images --member=serviceAccount:$SA --role=roles/storage.objectAdmin
```

Deploy (repeat after each change):

```bash
gcloud run deploy quickreport --source . --region=europe-central2 \
  --service-account=$SA --allow-unauthenticated \
  --memory=1Gi --max-instances=2 \
  --set-env-vars=GOOGLE_CLOUD_PROJECT=$PROJECT,GOOGLE_CLOUD_LOCATION=europe-west1,GCS_BUCKET=$PROJECT-report-images,GEMINI_MODEL=gemini-2.5-flash,AI_MOCK=0,ADMIN_PASSWORD=<dashboard password>,ADMIN_SESSION_SECRET=<random string, e.g. openssl rand -hex 32>
```

The command prints the HTTPS service URL.
The dashboard at `/admin` requires `ADMIN_PASSWORD`; without it the dashboard stays locked (and the simulated mObywatel sign-in for "Moje zgłoszenia" is disabled).
To deliver letters by e-mail, add `SMTP_URL` (e.g. `smtps://user%40gmail.com:app-password@smtp.gmail.com:465`), `SMTP_FROM`, and `DELIVERY_TEST_EMAIL`; without them the delivery is simulated and the PDF is still generated.
Environment variables are visible to anyone with view access to the Cloud Run service; use Secret Manager (`--update-secrets`) for a real deployment.

## Working with an agent

Start with [AGENTS.md](AGENTS.md), which links the repository rules, architecture map, and workflow.

| Request | Skill |
| --- | --- |
| Plan new work | `write-spec` |
| Refine an existing specification | `edit-spec` |
| Implement a specification task | `implement-task` |
| Prepare PR text or create a requested draft PR | `prepare-draft-pr` |

Use specifications for work that benefits from a shared plan.
Direct, bounded requests can be handled without creating one.
Existing user authorization remains valid across planning and implementation.

## Templates

- [Specification](.ai/specs/00-template.md): goals, task scope, dependencies, validation, and execution evidence.
- [Decision record](.ai/decisions/00-template.md): options, selected approach, consequences, and evidence.
- [Investigation](.ai/research/00-template.md): questions, findings, limitations, and next steps.
- [PR description](.ai/templates/pr-description.md): actual changes, validation, and relevant limitations.

[Architecture](.ai/ARCHITECTURE.md) describes only the template's current state.
Update it with real components, source paths, and run commands after the project direction is selected.
