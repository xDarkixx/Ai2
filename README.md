# Ai2 — AI Companion

Eine eigenständige, selbst hostbare Basis für eine KI-Companion-Plattform.

## Enthalten

- Charakter-Auswahl mit unterschiedlichen Persönlichkeiten
- Chat-Oberfläche für Desktop und Mobile
- lokales Memory im Browser
- Node.js/Express API
- Health-Endpoint für Deployment-Checks
- Provider-unabhängige Architektur als Basis für echte LLM-, TTS-, STT- und Bilddienste

## Start

```bash
npm install
npm start
```

Danach `http://localhost:3000` öffnen.

## Echte KI anschließen

Die Demo nutzt absichtlich keine eingebetteten API-Schlüssel. Für Produktion sollte `/api/chat` an einen eigenen oder externen LLM-Provider angebunden werden. Secrets gehören ausschließlich in Umgebungsvariablen.

## Nächste Module

1. Authentifizierung und Benutzerkonten
2. PostgreSQL/SQLite für Charaktere, Chats und Memories
3. echter LLM-Adapter
4. Bild- und Voice-Provider
5. Moderation, Alters-/Jugendschutz und Abuse-Prevention
6. Billing/Credits und Admin-Dashboard
7. Docker + CI Tests

Ai2 ist eine eigene Implementierung und verwendet nicht das Branding oder den Quellcode von Candy.ai.
