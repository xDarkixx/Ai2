# Ai2

Self-hosted AI companion starter inspired by modern AI companion apps.

## Features

- Adult-only 18+ access gate
- Fictional adult characters
- Chat history and local memory
- Pluggable LLM providers
- Demo mode works without an API key
- Mobile-friendly web UI

## LLM providers

`LLM_PROVIDER` supports `demo`, `gemini`, `groq`, `openrouter`, and `custom` (OpenAI-compatible).

Free access is provider-dependent and rate-limited. Google documents a free Gemini API tier; Hugging Face also provides limited monthly credits through Inference Providers. Do not put API keys in the repository.

## Run

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

## Adult mode

Ai2 is designed for adults 18+. Characters are explicitly fictional adults. The application supports romance, flirting and suggestive conversation. It does not implement an unrestricted explicit-pornography mode.

For a real deployment, add server-side account authentication, robust age verification, rate limiting, logging/privacy controls, provider-specific content controls, and a database instead of relying only on browser localStorage.
