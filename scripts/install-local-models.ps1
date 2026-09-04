$ErrorActionPreference = 'Stop'

$models = @(
  'qwen3:0.6b-q4_K_M',
  'gemma3:1b',
  'llama3.2:1b'
)

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  throw 'Ollama wurde nicht gefunden. Installiere Ollama und starte den Ollama-Dienst zuerst.'
}

try {
  Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -Method Get | Out-Null
} catch {
  throw 'Ollama läuft nicht auf http://127.0.0.1:11434. Starte Ollama und führe das Skript erneut aus.'
}

foreach ($model in $models) {
  Write-Host "Lade $model ..."
  & ollama pull $model
  if ($LASTEXITCODE -ne 0) { throw "Download fehlgeschlagen: $model" }
}

Write-Host ''
Write-Host 'Alle lokalen Ai2-Testmodelle sind vorhanden.'
Write-Host 'Für den kleinsten Start: LLM_PROVIDER=ollama und OLLAMA_MODEL=qwen3:0.6b-q4_K_M'
