#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${AI2_INSTALL_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
FAIL=0

check_http() {
  local label="$1" url="$2"
  if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
    printf 'OK   %s (%s)\n' "$label" "$url"
  else
    printf 'FAIL %s (%s)\n' "$label" "$url"
    FAIL=1
  fi
}

printf 'Ai2 service status\n==================\n'

if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet ai2; then printf 'OK   systemd ai2 active\n'; else printf 'FAIL systemd ai2 inactive\n'; FAIL=1; fi
  if systemctl is-active --quiet nginx; then printf 'OK   nginx active\n'; else printf 'WARN nginx inactive/not installed\n'; fi
  if command -v ollama >/dev/null 2>&1; then
    if systemctl is-active --quiet ollama; then printf 'OK   ollama active\n'; else printf 'WARN ollama installed but inactive\n'; fi
  fi
fi

if command -v curl >/dev/null 2>&1; then
  check_http 'Ai2 web/API' 'http://127.0.0.1:3000/api/health'
  check_http 'Ai2 native engine' 'http://127.0.0.1:3000/api/native/health'
  check_http 'Ai2 payments' 'http://127.0.0.1:3020/health'
  if command -v ollama >/dev/null 2>&1; then
    check_http 'Ollama API' 'http://127.0.0.1:11434/api/tags'
  fi
fi

cd "$APP_DIR"
if [[ -f package.json ]] && command -v npm >/dev/null 2>&1; then
  npm run check >/dev/null && printf 'OK   Node syntax checks\n' || { printf 'FAIL Node syntax checks\n'; FAIL=1; }
fi

if (( FAIL == 0 )); then
  printf '\nAi2 status: healthy\n'
else
  printf '\nAi2 status: one or more checks failed\n' >&2
  exit 1
fi
