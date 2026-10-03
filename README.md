# QuickReport – HackYeah 2026 (SMART CITY)

One-snap city issue reporting: a resident takes a photo, AI classifies the problem and drafts a formal report, and duplicate reports from the same spot are clustered into one prioritized ticket for city officials.

## Running locally

Requires Node.js 24 and pnpm.

```bash
pnpm install
cp .env.example .env.local   # AI_MOCK=1 works without Google Cloud
pnpm dev                     # http://localhost:3000 (resident), /admin (official)
```

For real Google Cloud services, run `gcloud auth application-default login`, set `AI_MOCK=0` in `.env.local`, and use:

- `pnpm seed`: reset Firestore and load demo tickets around Kraków
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
  --set-env-vars=GOOGLE_CLOUD_PROJECT=$PROJECT,GOOGLE_CLOUD_LOCATION=europe-west1,GCS_BUCKET=$PROJECT-report-images,GEMINI_MODEL=gemini-2.5-flash,AI_MOCK=0
```

The command prints the HTTPS service URL. `/admin` has no authentication in this prototype.

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
