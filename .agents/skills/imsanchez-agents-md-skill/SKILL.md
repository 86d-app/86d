---
name: imsanchez/agents-md-skill
description: >
  Autonomously reads, writes, and maintains AGENTS.md and CLAUDE.md files
  that capture project knowledge for future AI agent sessions. Use this skill
  whenever the user mentions agents.md, claude.md, agent configuration, agent
  memory, project documentation for AI, or wants to capture session learnings.
  Also use proactively when the user has just completed significant work
  (new features, bug fixes, architectural changes, workflow discoveries) and
  the learnings should be preserved for future agents. If the user says
  "update the docs", "remember this for next time", "add this to the agent
  instructions", or anything about improving how agents work on this project,
  this skill applies.
---

# AGENTS.md / CLAUDE.md Maintenance Skill

You maintain the project's AGENTS.md and CLAUDE.md files — the institutional
memory that makes every future agent session more effective. These files are
the single highest-leverage artifact in an AI-assisted codebase: a well-written
one saves hours of re-discovery across hundreds of sessions.

## Workflow

Every invocation follows this sequence:

### 1. Read existing state

Find and read the current agent instruction files. Check for both filenames
since projects use one or the other (or both):

- **Root files**: `./AGENTS.md` and/or `./CLAUDE.md` at the repository root
- **Nearest files**: If the user is working in a subdirectory, check for
  `AGENTS.md` or `CLAUDE.md` in that directory and its parents up to the root.
  Subdirectory files handle context specific to that part of the codebase.

If no files exist yet, that's fine — you'll create them.

### 2. Fetch current best practices

Fetch these two URLs to stay current on the latest conventions:

1. **https://agents.md/** — The canonical spec for the AGENTS.md format.
   Extract: supported sections, file placement rules, nesting behavior.
2. **https://www.humanlayer.dev/blog/writing-a-good-claude-md** — Practical
   advice on writing effective agent instructions. Extract: the WHAT/WHY/HOW
   framework, progressive disclosure, conciseness guidelines.

If fetching fails (offline, rate-limited), proceed with the principles
summarized in the reference file at `references/best-practices.md`.

### 3. Decide what to update

Look at the current conversation and recent work. Identify new knowledge that
future agents would benefit from:

- **Architecture decisions** — "We chose Prisma over Drizzle because..."
- **Build & test commands** — Especially non-obvious ones (`bun test --bail`)
- **Workflow patterns** — "Always run migrations before seeding"
- **Gotchas & pitfalls** — "The Redis connection pool leaks if you don't..."
- **File/directory purposes** — "src/adapters/ wraps third-party APIs"
- **Tool preferences** — "Use bun, not npm" or "Use biome, not eslint"
- **Conventions** — Naming patterns, error handling approaches, import order

Ask yourself: "If a brand new agent started a session on this codebase
tomorrow with zero context, what would save it the most time?"

### 4. Write the update

Apply these principles when writing or updating the files:

**Keep it lean.** The root file should be under 300 lines. Every line costs
attention across every future session — earn its place. If you're approaching
the limit, move detailed reference material into separate docs and link to
them from the root file (progressive disclosure).

**Use the WHAT / WHY / HOW framework:**
- **WHAT** — Project structure, tech stack, key directories
- **WHY** — What the project does, what each component is for
- **HOW** — Commands to build, test, lint, deploy. Workflow steps.

**Don't duplicate what tools already enforce.** Linting rules belong in
eslint/biome config, not in prose. Type conventions belong in tsconfig.
Only document things that can't be expressed as deterministic tooling config.

**Be specific and actionable.** "Be careful with the database" is useless.
"Always wrap DB writes in a transaction — the billing table has no
soft-delete" is useful.

**Preserve what's already there.** Don't rewrite sections that are fine.
Add to them, refine them, or leave them alone. Respect previous authors'
decisions unless the user explicitly wants changes.

**Use standard Markdown.** No custom frontmatter or special syntax.
Headings, lists, code blocks — that's the format.

### 5. Handle monorepo / subdirectory files

If the project is a monorepo or has distinct subsections:

- The **root file** covers project-wide context: overall architecture,
  shared tooling, cross-cutting conventions.
- **Subdirectory files** cover context specific to that area: "This package
  uses a different test runner" or "This service talks to the payments API."
- Keep subdirectory files focused. Don't repeat what the root file says.
  Agents read both — the nearest file plus the root.

### 6. Confirm with the user

Before writing changes, show the user a brief summary of what you plan to
add or modify. Something like:

> I'd like to add the following to AGENTS.md:
> - Build command: `bun run build` (under HOW)
> - Note about the Redis connection pool gotcha (under Architecture)
> - New section for the `packages/auth` subdirectory
>
> Does this look right?

Then apply the changes after confirmation.

## What NOT to include

- **Secrets or credentials** — Never write API keys, tokens, or passwords
- **Session-specific state** — Don't log "today I fixed bug #123"
- **Code style rules** — Use linters and formatters instead
- **Obvious things** — Don't write "run npm install to install dependencies"
- **Speculative content** — Only document confirmed patterns and decisions

## File naming

- Prefer `AGENTS.md` for new projects (it's the emerging cross-tool standard)
- If the project already has a `CLAUDE.md`, use that instead — don't create
  a competing file
- If the user has a preference, follow it

## Example structure

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
