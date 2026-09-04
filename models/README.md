# Kostenlose lokale LLMs für Ai2

Ai2 kann mehrere kostenlose, lokal laufende Modelle über Ollama verwenden. Die Modellgewichte werden **nicht in Git eingecheckt**; das Repository enthält stattdessen reproduzierbare Installationsskripte. So bleibt das Repo klein und die Lizenzen der Modelle werden respektiert.

## Empfohlene Modelle

| Modell | Größe | Zweck |
|---|---:|---|
| `qwen3:0.6b-q4_K_M` | ca. 523 MB | sehr klein, schneller Test/leichte PCs |
| `gemma3:1b` | ca. 815 MB | kompakter allgemeiner Chat |
| `llama3.2:1b` | ca. 1.3 GB | multilingual, inklusive Deutsch |

Qwen3 0.6B Q4_K_M wird bei Ollama mit Apache-2.0 angegeben. Gemma 3 1B und Llama 3.2 1B sind ebenfalls kleine lokale Varianten; für diese gelten die jeweiligen Herstellerbedingungen. Ai2 übernimmt keine Modell-Lizenz.

## Installation

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-local-models.ps1
```

### Linux/macOS

```bash
bash ./scripts/install-local-models.sh
```

Die Skripte prüfen zuerst, ob Ollama erreichbar ist, und laden die kleinen Modelle mit `ollama pull` herunter. Danach kann in `.env` z. B. `LLM_PROVIDER=ollama` und `OLLAMA_MODEL=qwen3:0.6b-q4_K_M` gesetzt werden.

## Ohne Download testen

Für CI und Entwicklung bleibt `LLM_PROVIDER=test` verfügbar. Diese Test-LLM ist bewusst kein echtes neuronales Modell und benötigt weder Internet noch Modellgewichte.

## Quellen

- Ollama Qwen3: 0.6B Q4_K_M: https://ollama.com/library/qwen3:0.6b-q4_K_M
- Ollama Gemma 3: https://ollama.com/library/gemma3
- Ollama Llama 3.2: https://ollama.com/library/llama3.2
