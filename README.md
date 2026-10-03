# HackYeah2026

A reusable hackathon repository template with an agent workflow.
The challenge, product scope, technology stack, and deployment target are not selected yet.

Shared instructions, skills, specifications, and decision records are intended to stay in version control.

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
