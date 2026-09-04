# Ai2 – eigenes LLM / Fine-Tuning

Dieser Ordner ist die Grundlage für ein eigenes Ai2-Modell. Für ein eigenes Modell wird ein vorhandenes Open-Source-Basismodell per LoRA/QLoRA angepasst, statt ein großes Sprachmodell komplett von null zu trainieren.

## Struktur

- `data/train.jsonl` – Trainingsbeispiele
- `data/valid.jsonl` – Validierungsbeispiele
- `config.example.json` – Beispielkonfiguration
- `train.py` – Einstiegspunkt für das Fine-Tuning

## Datenformat

Jede Zeile ist ein JSON-Objekt mit `messages`, zum Beispiel:

```json
{"messages":[{"role":"system","content":"Du bist ein freundlicher, fiktiver erwachsener Ai2-Charakter."},{"role":"user","content":"Hallo!"},{"role":"assistant","content":"Hey! Schön, dass du da bist."}]}
```

Nur Daten verwenden, für die du die notwendigen Rechte besitzt. Keine personenbezogenen Daten ohne passende Einwilligung in den Trainingsdatensatz übernehmen.

Das Modell sollte erwachsene, fiktive Charaktere und deren Persönlichkeit lernen. Der Ai2-Server setzt zusätzlich eine 18+-Bestätigung und Regeln für erwachsene, einvernehmliche Interaktionen durch.

## Lokal verwenden

Nach dem Training kann das Modell mit einem lokalen Inference-Server betrieben werden. Ai2 unterstützt dafür bereits den Provider `ollama` über `OLLAMA_BASE_URL` und `OLLAMA_MODEL`.

## Hardware

QLoRA ist wesentlich sparsamer als Full Fine-Tuning. Die konkrete GPU-Anforderung hängt vom Basismodell, Kontextfenster, Quantisierung und Batch-Setup ab.
