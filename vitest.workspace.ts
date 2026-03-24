/**
 * Vitest workspace for monorepo.
 * Run: bun run test:coverage
 *
 * Individual packages still run via `turbo run test` (bun test).
 * This workspace enables root-level coverage reporting.
 */
export default [
	"apps/*",
	"packages/*",
	"modules/*",
];
