#!/usr/bin/env bash
# Start Postgres (Docker), apply migrations, smoke-check API. Requires Docker Desktop running.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

echo "==> Starting Postgres (docker compose)"
docker compose up -d

echo "==> Waiting for Postgres (5s)"
sleep 5

echo "==> prisma migrate deploy"
npx prisma migrate deploy

echo "==> prisma generate"
npx prisma generate

echo ""
echo "OK. Start the API in another terminal:"
echo "  cd backend && npm run dev"
echo "Then:"
echo "  curl -sSf http://localhost:3000/health"
echo ""
