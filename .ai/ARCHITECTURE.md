# Repository Architecture

## Current state

The repository currently contains a reusable agent workflow and a project README.
There is no product implementation, selected challenge, application runtime, or deployment configuration.

| Area | Current decision |
| --- | --- |
| Challenge and intended users | Not selected |
| Product scope and demo scenario | Not selected |
| Application components and stack | Not selected |
| Data sources and external integrations | Not selected |
| Persistence and identity | Not selected; may be unnecessary |
| Hosting and deployment | Not selected |
| Build, test, and run commands | Not configured |

These entries describe the template's current state, not requirements to introduce every component.

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

## Updating this map

Once a challenge and implementation approach are chosen, replace the undecided entries with verified decisions.
Describe the actual components, entry points, important data flows, external dependencies, and run or validation commands.
Link to relevant source paths and decision records.
Keep proposed components clearly labeled until implemented, and remove outdated descriptions as the code changes.
