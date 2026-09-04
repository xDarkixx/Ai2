# Ai2

Self-hosted AI companion starter inspired by modern AI companion apps.

## Features

- Adult-only 18+ access gate
- Fictional adult characters
- Chat history and local memory
- Pluggable LLM providers
- Demo mode works without an API key
- Mobile-friendly web UI
- Automated Wan 2.5 text-to-video and image-to-video jobs
- Background job polling and media collection
- Optional native C++ bridge

## LLM providers

`LLM_PROVIDER` supports `demo`, `gemini`, `groq`, `openrouter`, `ollama`, `native`, and `custom` (OpenAI-compatible).

Do not put API keys in the repository.

## Wan 2.5 video

Set `WAN_API_KEY` in your local `.env` to enable the video studio. The integration uses the official asynchronous Wan 2.5 API: create a task, poll its status, then expose the resulting video URL. `wan2.5-t2v-preview` is used for text-to-video and `wan2.5-i2v-preview` when an image URL is supplied.

Wan provider requests are intentionally limited to non-graphic content. Ai2 does not implement an unrestricted explicit-pornography generator.

The provider result URL is temporary (24 hours according to the provider documentation). For permanent media storage, connect object storage such as OSS/S3.

## Run

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

## Adult mode

Ai2 is designed for adults 18+. Characters are explicitly fictional adults. The application supports romance, flirting and suggestive conversation, but not graphic sexual content. Never portray or sexualize minors.

For a real deployment, add server-side account authentication, robust age verification, rate limiting, logging/privacy controls, provider-specific content controls, and a database instead of relying only on browser localStorage.
