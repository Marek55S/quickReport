# Project Agent Instructions

This repository is a hackathon template.
The challenge, product, technology stack, and deployment target have not been selected.
Do not treat an example or template field as an approved project decision.

Before project work, read `.ai/RULES.md`, `.ai/ARCHITECTURE.md`, and `.ai/WORKFLOW.md`.
For specification work, also read the relevant specification and requested tasks.

## Working conventions

- Follow the user's requested scope and existing authorization.
  Planning is useful for substantial work, but a specification is not required for every direct request.
- Write shared agent instructions, specifications, decision records, branch names, commit messages, and PR text in English unless the user requests otherwise.
  Conversation and product content may use the language appropriate to the user or audience.
- Preserve unrelated user changes and report actual evidence for completion.
- Keep the shared template files available in Git.
  Do not classify `AGENTS.md`, `.ai/`, or `.agents/` as private workstation state.
- Choose validation from the implemented stack and task requirements.
  Do not assume a framework, runtime, provider, dataset, or evaluation method.
- Respect existing authorization for Git and external actions; do not add mandatory approval steps to routine local work.

## Skill routing

- Plan work and define tasks: `write-spec`.
- Change an existing plan: `edit-spec`.
- Implement requested specification tasks: `implement-task`.
- Prepare PR text or create a requested draft PR: `prepare-draft-pr`.

Use the skills under `.agents/skills/` when the request fits them.
The workflow details and lifecycle are defined in `.ai/WORKFLOW.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
