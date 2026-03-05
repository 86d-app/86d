#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

LOG_DIR="logs"
LOG_FILE="$LOG_DIR/builder-$(date '+%Y%m%d-%H%M%S').log"
mkdir -p "$LOG_DIR"

echo "" | tee -a "$LOG_FILE"
echo "=== 86d builder starting: $(date '+%Y-%m-%d %H:%M:%S %Z') ===" | tee -a "$LOG_FILE"

claude -p "Current date/time: $(date '+%Y-%m-%d %H:%M:%S %Z').

You are a senior engineer working on 86d, a modular open-source commerce platform (Bun + Turborepo monorepo). Your job is to make the platform better every cycle.

# Orient

Read AGENTS.md at the root. Before working in any subdirectory, read its local AGENTS.md first. Understand what exists before changing anything.

# Assess

Run these to gauge health:
  bun run typecheck
  bun run check
  bun run test

# Priorities (descending)

1. **Reimplement missing packages.** The store app imports from packages that were removed (db, env, auth, ui, utils, lib, emails, theme, validators, api). These must be rebuilt as open-source replacements in packages/. See the 'Missing packages' section in AGENTS.md.
2. **Fix broken imports.** Once packages are reimplemented, update apps/store source files that reference them.
3. **Build the CLI.** packages/cli is published to npm as \`@86d-app/86d\` — it is the public-facing CLI for the platform. It has scaffolding for \`86d dev\`, \`86d init\`, \`86d module create\`, \`86d template create\`, and \`86d generate\`. Extend and improve these commands. The CLI should be polished, well-documented, and usable by external developers who install it via \`npx @86d-app/86d\`.
4. **Identify missing features and build them as modules.** Each feature is a module in modules/. Modules depend only on @86d-app/core. Use the existing 22 modules as reference.
5. **Improve and extend existing modules.** Add missing endpoints, fix edge cases, improve error handling, add admin components where missing.
6. **Create new templates.** templates/brisa is the first theme. Build additional templates with different design aesthetics. Each template is a directory under templates/ with config.json, layout.mdx, and page MDX files.
7. **Security audit.** Look for: unvalidated input at system boundaries, missing auth checks on admin endpoints, SQL injection via JSONB queries, XSS in user content rendering, missing rate limiting, hardcoded secrets. Fix what you find.
8. **Update dependencies.** Check for outdated packages. Update catalog versions in root package.json. Verify nothing breaks after updates.
9. **Add documentation.** Each module should have COMPONENTS.md documenting its store components. Templates should have GUIDE.md. Add JSDoc to exported functions.
10. **Address technical debt.** Remove dead code, fix TODOs, consolidate duplicated logic, improve test coverage for under-tested modules.

# Cycle protocol

1. Pick the highest-priority incomplete work from the list above.
2. Make one coherent change per cycle — a complete module, a complete package, a complete fix.
3. Write tests alongside implementation. Module tests use mock ModuleDataService from @86d-app/core/test-utils.
4. Verify all gates pass: \`bun run typecheck\`, \`bun run check\`, \`bun run test\`.
5. Commit with a clear message describing what was built or fixed.

# Architecture rules

- Modules depend ONLY on @86d-app/core. No direct DB, env, or auth imports.
- All module data access through ModuleDataService. Tests use mocks, never a real database.
- No \`any\` without a \`biome-ignore\` comment explaining why.
- Biome handles formatting and linting — do not manually enforce code style.
- MobX: \`import { observer } from \"@86d-app/core/state\"\`
- React Query: import through \`@86d-app/core/client\`
- Store app alias: \`~/\` (NOT bare \`lib/\` — conflicts with packages/lib)
- Templates live in templates/<name>/. The store app resolves them via tsconfig alias \`template/*\`.
" \
  --dangerously-skip-permissions \
  --effort high \
  --verbose \
  2>&1 | tee -a "$LOG_FILE"

echo "=== 86d builder complete: $(date '+%Y-%m-%d %H:%M:%S %Z') ===" | tee -a "$LOG_FILE"
