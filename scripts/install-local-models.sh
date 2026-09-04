#!/usr/bin/env bash
set -euo pipefail

models=(
  'qwen3:0.6b-q4_K_M'
  'gemma3:1b'
  'llama3.2:1b'
)

if ! command -v ollama >/dev/null 2>&1; then
  echo 'Ollama wurde nicht gefunden. Installiere Ollama und starte den Ollama-Dienst zuerst.' >&2
  exit 1
fi

if ! curl -fsS http://127.0.0.1:11434/api/tags >/dev/null; then
  echo 'Ollama läuft nicht auf http://127.0.0.1:11434. Starte Ollama und führe das Skript erneut aus.' >&2
  exit 1
fi

for model in "${models[@]}"; do
  echo "Lade $model ..."
  ollama pull "$model"
done

echo
echo 'Alle lokalen Ai2-Testmodelle sind vorhanden.'
echo 'Für den kleinsten Start: LLM_PROVIDER=ollama und OLLAMA_MODEL=qwen3:0.6b-q4_K_M'
