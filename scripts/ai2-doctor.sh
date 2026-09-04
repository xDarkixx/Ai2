#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${AI2_INSTALL_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
FAIL=0

ok(){ printf 'OK   %s\n' "$1"; }
warn(){ printf 'WARN %s\n' "$1"; }
bad(){ printf 'FAIL %s\n' "$1"; FAIL=1; }

printf 'Ai2 Linux health check\n=======================\n'

if [[ "$(uname -s)" == "Linux" ]]; then ok "Linux kernel detected"; else bad "Ai2 requires Linux"; fi
if [[ -r /etc/os-release ]]; then . /etc/os-release; [[ "${ID:-}" == ubuntu ]] && ok "Ubuntu ${VERSION_ID}" || bad "Ubuntu required (detected ${ID:-unknown})"; else bad "Cannot read /etc/os-release"; fi

command -v node >/dev/null 2>&1 && ok "Node.js $(node --version)" || bad "Node.js missing"
command -v npm >/dev/null 2>&1 && ok "npm $(npm --version)" || bad "npm missing"
command -v cmake >/dev/null 2>&1 && ok "CMake available" || bad "CMake missing"
command -v python3 >/dev/null 2>&1 && ok "Python3 available" || bad "Python3 missing"
command -v nginx >/dev/null 2>&1 && ok "NGINX available" || warn "NGINX not installed"
command -v ollama >/dev/null 2>&1 && ok "Ollama available" || warn "Ollama not installed"

cd "$APP_DIR"
[[ -f package.json ]] && ok "package.json present" || bad "package.json missing"
[[ -f .env ]] && ok ".env present" || warn ".env missing"
[[ -x build/ai2_native ]] && ok "Native engine built" || warn "Native engine not built"

if [[ -f package.json ]] && command -v npm >/dev/null 2>&1; then
  npm run check >/tmp/ai2-doctor-check.log 2>&1 && ok "Node syntax checks" || { cat /tmp/ai2-doctor-check.log; bad "Node syntax checks failed"; }
fi

if [[ -x build/ai2_native ]]; then
  printf '%s\n' '{"op":"ping"}' | build/ai2_native --bridge >/tmp/ai2-doctor-native.log 2>&1 && ok "Native bridge ping" || { cat /tmp/ai2-doctor-native.log; bad "Native bridge failed"; }
fi

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files ai2.service >/dev/null 2>&1; then
  systemctl is-enabled ai2 >/dev/null 2>&1 && ok "Ai2 systemd service enabled" || warn "Ai2 systemd service is not enabled"
fi

if command -v curl >/dev/null 2>&1; then
  curl -fsS --max-time 3 http://127.0.0.1:3000/api/health >/dev/null 2>&1 && ok "Ai2 HTTP health endpoint" || warn "Ai2 HTTP service is not responding on port 3000"
fi

if [[ "$FAIL" -eq 0 ]]; then
  printf '\nAi2 health check passed.\n'
else
  printf '\nAi2 health check found blocking errors.\n' >&2
  exit 1
fi
