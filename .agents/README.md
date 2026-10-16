# Agent guidance layout

`AGENTS.md` at the repository root is the shared instruction entry point. `CLAUDE.md` imports it so Claude uses the same baseline instead of maintaining a second set of project rules.

## Where guidance lives

- `skills/<name>/SKILL.md` — reusable task-specific methods and standards.
- `rules/` — detailed project coding standards.
- `workflows/` — step-by-step procedures for cross-layer features, pagination, secure writes, and Better Auth.
- `../packages/backend/.agents/skills/` — backend-scoped Convex skills managed for agents that read AGENTS skill folders.
- `../packages/backend/.claude/skills/` — matching Claude skill entries installed by Convex tooling.

Read the relevant skill and workflow before editing; the root `AGENTS.md` maps tasks to the right files. Keep the shared ECU skills in `.agents/skills/` and avoid copying them into a second root skill folder. Leave Convex's package-scoped skill installs in place so each agent can discover them in its supported format.

## Shared ECU skills

- `skills/clean-code/SKILL.md`
- `skills/component-reusability/SKILL.md`
- `skills/convex-type-safety/SKILL.md`
- `skills/form-standards/SKILL.md`
- `skills/refactoring-playbook/SKILL.md`
