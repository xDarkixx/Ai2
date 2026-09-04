# Ai2

Self-hosted AI companion platform with adult characters, chat, memory, media adapters and local AI backends.

## Features

- Adult-only 18+ access gate
- Fictional adult characters
- Chat history and local memory
- Pluggable LLM providers
- Demo mode without an API key
- Mobile-friendly web UI
- Wan 2.5 cloud text-to-video and image-to-video
- Wan2.2 local TI2V-5B backend adapter
- Automatic background jobs and polling
- Local media served back into the web UI
- Optional native C++ bridge

## LLM providers

`LLM_PROVIDER` supports `demo`, `gemini`, `groq`, `openrouter`, `ollama`, `native`, and `custom` (OpenAI-compatible).

Never put API keys in the repository.

## Wan 2.5

Set `WAN_API_KEY` in `.env` to enable the cloud video studio. Ai2 creates the asynchronous task, polls it automatically, and displays the completed video. Text-to-video uses `wan2.5-t2v-preview`; supplying an image URL selects the image-to-video model.

## Wan2.2 local

Ai2 integrates the official `Wan-Video/Wan2.2` repository through `wan22/runner.py`. The adapter uses the upstream `generate.py` entry point with the unified `ti2v-5B` model. Wan2.2 documents TI2V-5B as a 720P text-to-video/image-to-video model and notes that it can run on consumer GPUs such as an RTX 4090 with CPU offloading. The larger A14B models need much more VRAM. citehttps://github.com/Wan-Video/Wan2.2

The large Wan2.2 source tree and model weights are deliberately not copied into Ai2. Install Wan2.2 separately, download its checkpoint, then configure:

```text
WAN22_ENABLED=true
WAN22_ROOT=/path/to/Wan2.2
WAN22_CKPT=/path/to/Wan2.2-TI2V-5B
WAN22_PYTHON=python3
WAN22_DEFAULT_SIZE=1280*704
WAN22_TIMEOUT_MS=1800000
```

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
