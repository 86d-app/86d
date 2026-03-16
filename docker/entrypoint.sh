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
  bunx prisma db push --schema prisma --skip-generate --accept-data-loss 2>&1 || {
    echo "✗ Migration failed"
    exit 1
  }
  cd /app
  echo "✓ Migrations complete"
fi

# ── Seed database (only on first run) ─────────────────────────────────────
if [ "$AUTO_SEED" = "true" ] && [ -f "scripts/seed.ts" ]; then
  echo "→ Seeding database..."
  bun run scripts/seed.ts 2>&1 || echo "⚠ Seed skipped (may already exist)"
  echo "✓ Seed complete"
fi

# ── Start the application ─────────────────────────────────────────────────
echo "→ Starting 86d store on port ${PORT:-3000}..."
exec bun run apps/store/server.js
