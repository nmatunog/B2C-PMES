#!/usr/bin/env bash
# One-command local PMES startup:
# - frees common dev ports (3000 backend, 5173 Vite, 3040 Next)
# - starts backend + Vite frontend together
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-3000}"
VITE_PORT="${VITE_PORT:-5173}"
NEXT_PORT="${NEXT_PORT:-3040}"

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "Freeing port $port (PID: $pids)"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 0.5
  fi

  pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "Force killing stuck listener on $port (PID: $pids)"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 0.2
  fi
}

cleanup() {
  echo ""
  echo "Stopping PMES local services..."
  [[ -n "${BACK_PID:-}" ]] && kill "$BACK_PID" 2>/dev/null || true
  [[ -n "${FRONT_PID:-}" ]] && kill "$FRONT_PID" 2>/dev/null || true
  exit 0
}

trap cleanup INT TERM

kill_port "$BACKEND_PORT"
kill_port "$VITE_PORT"
kill_port "$NEXT_PORT"

echo "Starting backend on :$BACKEND_PORT and PMES UI on :$VITE_PORT"
echo "PMES UI: http://localhost:$VITE_PORT"
echo "Backend: http://localhost:$BACKEND_PORT/health"
echo ""

(cd "$ROOT/backend" && npm run dev) &
BACK_PID=$!

(cd "$ROOT/frontend" && npm run vite:dev) &
FRONT_PID=$!

wait
