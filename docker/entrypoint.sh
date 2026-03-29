#!/bin/sh
set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║  86d Store — Starting...                         ║"
echo "╚══════════════════════════════════════════════════╝"

# ── Wait for database ─────────────────────────────────────────────────────
if [ -n "$DATABASE_URL" ]; then
  echo "→ Waiting for database..."
  MAX_RETRIES=30
  RETRY=0
  # Extract host:port from DATABASE_URL
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  DB_PORT=${DB_PORT:-5432}

  until bun -e "const net = require('net'); const s = net.createConnection({host:'$DB_HOST',port:$DB_PORT}); s.on('connect',()=>{s.end();process.exit(0)}); s.on('error',()=>process.exit(1))" 2>/dev/null; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
      echo "✗ Database not reachable after ${MAX_RETRIES} attempts"
      exit 1
    fi
    echo "  Waiting for database... (attempt $RETRY/$MAX_RETRIES)"
    sleep 2
  done
  echo "✓ Database is ready"
fi

# ── Run migrations ────────────────────────────────────────────────────────
if [ "$SKIP_MIGRATIONS" != "true" ] && [ -d "packages/db/prisma" ]; then
  echo "→ Running database migrations..."
  cd packages/db
  if [ -d "prisma/migrations" ]; then
    # Production: use migrate deploy when migration files exist
    deploy_out=$(bunx prisma migrate deploy --schema prisma 2>&1) || deploy_ok=1
    if [ -n "${deploy_ok:-}" ]; then
      printf '%s\n' "$deploy_out"
      # init.sql (nanoid, extensions) leaves public non-empty; migrate deploy then returns P3005
      if printf '%s' "$deploy_out" | grep -q 'P3005'; then
        echo "→ Baseline conflict (P3005); syncing schema with db push"
        bunx prisma db push --schema prisma --accept-data-loss 2>&1 || {
          echo "✗ db push failed"
          exit 1
        }
      else
        echo "✗ Migration failed"
        exit 1
      fi
    else
      printf '%s\n' "$deploy_out"
    fi
  else
    # Development: use db push when no migration files exist
    # --accept-data-loss is safe here: Docker starts with an empty database
    bunx prisma db push --schema prisma --accept-data-loss 2>&1 || {
      echo "✗ Schema push failed"
      exit 1
    }
  fi
  # Migration files may only ship SQL helpers (e.g. nanoid); ORM models still need db push.
  # --accept-data-loss: Prisma may warn on constraint changes over an already-migrated DB (Docker dev).
  echo "→ Syncing Prisma schema to database..."
  bunx prisma db push --schema prisma --accept-data-loss 2>&1 || {
    echo "✗ db push failed"
    exit 1
  }
  cd /app
  echo "✓ Migrations complete"
fi

# ── Seed database (only on first run) ─────────────────────────────────────
if [ "$AUTO_SEED" = "true" ] && [ -f "scripts/seed.ts" ]; then
  echo "→ Seeding database..."
  if ! bun run scripts/seed.ts 2>&1; then
    echo "✗ Seed failed"
    exit 1
  fi
  echo "✓ Seed complete"
fi

# ── Start the application ─────────────────────────────────────────────────
echo "→ Starting 86d store on port ${PORT:-3000}..."
exec bun run apps/store/server.js
