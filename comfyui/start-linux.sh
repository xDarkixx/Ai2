#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${AI2_COMFYUI_ROOT:-/opt/ai2-comfyui}"
HOST="${COMFYUI_HOST:-127.0.0.1}"
PORT="${COMFYUI_PORT:-8188}"

[[ "$(uname -s)" == "Linux" ]] || { echo "Linux is required." >&2; exit 1; }
[[ -x "$ROOT/venv/bin/python" ]] || { echo "ComfyUI is not installed at $ROOT" >&2; exit 1; }

cd "$ROOT"
exec "$ROOT/venv/bin/python" main.py --listen "$HOST" --port "$PORT"
