# ============================================================================
# 86d Store — Multi-stage Docker Build
# ============================================================================
# Usage:
#   docker build -t 86d-store .
#   docker compose up
# ============================================================================

# ── Stage 1: Install dependencies ──────────────────────────────────────────
FROM oven/bun:1.3.6 AS deps
WORKDIR /app

# Store image: manifests for the store app, generate-modules (@86d-app/registry),
# @86d-app/runtime (api-registry / ModuleRegistry), and other workspace deps. Omit CLI only.
COPY package.json bun.lock ./
COPY apps/store/package.json apps/store/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/auth/package.json packages/auth/
COPY packages/env/package.json packages/env/
COPY packages/utils/package.json packages/utils/
COPY packages/lib/package.json packages/lib/
COPY packages/emails/package.json packages/emails/
COPY packages/registry/package.json packages/registry/
COPY packages/runtime/package.json packages/runtime/
COPY packages/sdk/package.json packages/sdk/
COPY packages/storage/package.json packages/storage/

# Copy only module package.json files (not source code) for better layer caching
COPY modules/ /tmp/all-modules/
RUN mkdir -p modules && \
    for dir in /tmp/all-modules/*/; do \
      name=$(basename "$dir"); \
      mkdir -p "modules/$name" && \
      cp "$dir/package.json" "modules/$name/package.json" 2>/dev/null || true; \
    done && \
    rm -rf /tmp/all-modules

# Install all dependencies
RUN bun install --ignore-scripts

# ── Stage 2: Build ─────────────────────────────────────────────────────────
FROM oven/bun:1.3.6 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN cd packages/core && bunx prisma generate --schema prisma

# Generate module imports (run directly with bun — tsx has CJS issues under bun on Linux)
RUN bun scripts/generate-modules.ts

# Build the store app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DOCKER_BUILD=true
RUN bun run build:store

# ── Stage 3: Install Prisma CLI for runtime migrations ─────────────────────
# Separate stage so we can copy node_modules/prisma into the slim runner
FROM oven/bun:1.3.6 AS prisma-installer
WORKDIR /app
# prisma: runtime migrations. pg: used by seed.ts via raw SQL.
RUN echo '{"dependencies":{"prisma":"7.3.0","pg":"8.20.0"}}' > package.json && \
    bun install --ignore-scripts

# ── Stage 4: Production runtime ────────────────────────────────────────────
FROM oven/bun:1.3.6-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV STORAGE_PROVIDER=local
ENV STORAGE_LOCAL_DIR=/app/uploads
ENV STORAGE_LOCAL_BASE_URL=/uploads

# Create non-root user (bun:slim is Debian-based, use groupadd/useradd)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy built artifacts
COPY --from=builder /app/apps/store/.next/standalone ./
COPY --from=builder /app/apps/store/.next/static ./apps/store/.next/static
COPY --from=builder /app/apps/store/public ./apps/store/public

# Copy templates — MDX files are resolved at runtime and not traced by standalone
COPY --from=builder /app/templates ./templates

# Copy Prisma schema + config for runtime migrations
# prisma.config.ts is required by Prisma 7 (defines datasource URL + schema path)
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db/prisma.config.ts ./packages/db/prisma.config.ts
COPY --from=builder /app/packages/core/prisma ./packages/core/prisma
COPY --from=builder /app/packages/core/src/prisma ./packages/core/src/prisma

# Merge prisma-installer into standalone node_modules (Prisma 7 needs valibot, @prisma/*, etc.).
# A single `COPY ... node_modules` fails when standalone has node_modules/pg as a non-directory.
COPY --from=prisma-installer /app/node_modules /tmp/prisma-only
RUN set -e; \
    for pkg in /tmp/prisma-only/*; do \
      [ -e "$pkg" ] || continue; \
      base=$(basename "$pkg"); \
      rm -rf "./node_modules/$base" 2>/dev/null || true; \
      cp -a "$pkg" ./node_modules/; \
    done && \
    rm -rf /tmp/prisma-only

# Copy seed script and its dependencies
COPY --from=builder /app/scripts/seed.ts ./scripts/seed.ts
COPY --from=builder /app/package.json ./package.json

# Copy entrypoint
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Create uploads directory for local storage
# Prisma downloads engine binaries into node_modules at runtime — needs write access
RUN mkdir -p /app/uploads && \
    chown -R nextjs:nodejs /app/uploads && \
    chown -R nextjs:nodejs /app/node_modules

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]
