#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${AI2_COMFYUI_ROOT:-/opt/ai2-comfyui}"
REPO_URL="https://github.com/Comfy-Org/ComfyUI.git"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Ai2 ComfyUI requires Linux." >&2
  exit 1
fi
if [[ -r /etc/os-release ]]; then
  . /etc/os-release
  [[ "${ID:-}" == "ubuntu" ]] || { echo "Ubuntu is required (detected ${ID:-unknown})." >&2; exit 1; }
else
  echo "Cannot determine operating system." >&2
  exit 1
fi

command -v python3 >/dev/null 2>&1 || { echo "python3 is required." >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git is required." >&2; exit 1; }

mkdir -p "$(dirname "$ROOT")"
if [[ -d "$ROOT/.git" ]]; then
  git -C "$ROOT" fetch --depth=1 origin main
  git -C "$ROOT" reset --hard origin/main
elif [[ -e "$ROOT" ]]; then
  echo "Refusing to overwrite existing non-ComfyUI directory: $ROOT" >&2
  exit 1
else
  git clone --depth=1 "$REPO_URL" "$ROOT"
fi

python3 -m venv "$ROOT/venv"
"$ROOT/venv/bin/python" -m pip install --upgrade pip
"$ROOT/venv/bin/pip" install -r "$ROOT/requirements.txt"

mkdir -p "$ROOT/models/checkpoints" "$ROOT/models/vae" "$ROOT/models/loras" "$ROOT/output" "$ROOT/input"
cat > "$ROOT/AI2-COMFYUI.md" <<'EOF'
# Ai2 ComfyUI runtime

This directory is managed by Ai2 on Ubuntu/Linux. Model weights are intentionally not stored in the Ai2 Git repository.
EOF

echo "ComfyUI installed at $ROOT"
echo "Start with: $ROOT/../Ai2/comfyui/start-linux.sh (or use the systemd service)."
