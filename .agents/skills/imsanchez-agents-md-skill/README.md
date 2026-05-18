# AGENTS.md / CLAUDE.md Maintenance Skill

A skill that teaches AI coding agents how to write and maintain `AGENTS.md` and `CLAUDE.md` files — the institutional memory that makes every future agent session more effective.

## Why

I found myself asking agents to update the AGENTS.md. Without guidance, agents tend to produce bloated files full of obvious instructions and linter-style rules. This skill solves that by teaching agents the principles from [agents.md](https://agents.md/) and [Writing a Good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md), then applying them automatically.

## Install

```sh
npx skills add imsanchez/agents-md-skill
```

## What it does

When triggered, the skill follows a consistent workflow:

1. **Reads** the existing `AGENTS.md` or `CLAUDE.md` (root + nearest subdirectory file)
2. **Fetches** the latest best practices from [agents.md](https://agents.md/) and [HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
3. **Identifies** new knowledge from the current session worth preserving (architecture decisions, commands, gotchas, conventions)
4. **Writes** a concise, actionable update following the WHAT/WHY/HOW framework
5. **Confirms** with the user before applying changes

## When it triggers

- "Update the AGENTS.md" / "update the claude.md"
- "Remember this for next time"
- "Add this to the agent instructions"
- After significant work (new features, bug fixes, architectural changes)
- Any mention of agent configuration, agent memory, or project documentation for AI

## Principles

The skill enforces these writing principles so agents produce useful docs instead of bloat:

- **Keep it under 300 lines** — every line costs attention across every future session
- **Be specific and actionable** — "Always wrap DB writes in a transaction" not "be careful with the database"
- **Don't duplicate tooling** — linting rules belong in eslint/biome config, not prose
- **No filler** — skip "run npm install to install dependencies"
- **Progressive disclosure** — link to separate docs for detailed reference material
- **Respect existing content** — add and refine, don't rewrite

## Example output

```markdown
# [Project Name]

Monorepo for a React + TypeScript platform. Uses pnpm workspaces and Turborepo.

## Project overview

- `packages/` — shared libraries and feature packages
- `packages/ui/` — shared React component library
- `apps/` — distributable applications
- `apps/web/` — brand website (Next.js)
- `apps/dashboard/` — internal admin dashboard (Vite + React)
- `apps/api/` — Express REST API

## Development

- Use `pnpm dlx turbo run where <project_name>` to jump to a package instead of scanning with `ls`.
- Run `pnpm install --filter <project_name>` to add the package to your workspace so Vite, ESLint, and TypeScript can see it.
- Use `pnpm create vite@latest <project_name> -- --template react-ts` to spin up a new React + Vite package with TypeScript checks ready.
- Check the name field inside each package's package.json to confirm the right name—skip the top-level one.

## Code style guidelines

- After moving files or changing imports, run
  `pnpm lint --filter <project_name>` to be sure ESLint and TypeScript
  rules still pass
- Always run `pnpm lint` and `pnpm test` before committing
- Follow `pull_request_template.md` if one exists.
- PR title format: `[<project_name>] <Title>`

## Testing

- Find the CI plan in the `.github/workflows` folder
- Run `pnpm turbo run test --filter <project_name>` to run every check defined for that package.
- From the package root you can just call `pnpm test`. The commit should pass all tests before you merge.
- To focus on one step, add the Vitest pattern: `pnpm vitest run -t "<test name>"`.
- Fix any test or type errors until the whole suite succeeds.
- After moving files or changing imports, run `pnpm lint --filter <project_name>` to be sure ESLint and TypeScript rules still pass.
- Add or update tests for the code you change, even if nobody asked.

## Security considerations

- Environment config lives in `src/config/env.ts` — never read `process.env`
  directly
- Database writes use transactions — the `users` table has a trigger that
  syncs to `search_index`, so always use Prisma (direct SQL bypasses it)
```

## Monorepo support

The skill handles monorepos by maintaining separate files at each level:

- **Root file** — project-wide architecture, shared tooling, cross-cutting conventions
- **Subdirectory files** — context specific to that package or service
- Respects existing naming (`CLAUDE.md` vs `AGENTS.md`) — won't create competing files

## References

- [agents.md](https://agents.md/) — The AGENTS.md specification
- [Writing a Good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md) — HumanLayer's guide to effective agent instructions
