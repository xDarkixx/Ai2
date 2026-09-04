# Ai2 ComfyUI integration

This directory keeps the local ComfyUI integration isolated from the Ai2 Node.js backend.

ComfyUI itself remains a separate checkout/runtime. Do not commit model weights here.

## Layout

- `client.js` — small HTTP client for a local ComfyUI API.
- `workflows/` — safe, non-graphic workflow templates used by Ai2.
- `install-windows.ps1` — clones the official ComfyUI repository into `comfyui/ComfyUI`.
- `start-windows.ps1` — starts the local ComfyUI server on `127.0.0.1:8188`.
- `.gitignore` — keeps models, outputs, virtual environments and caches out of Ai2.

ComfyUI supports local installations and exposes API endpoints for application integration. See the official project documentation for current installation details.

## Windows

Run `powershell -ExecutionPolicy Bypass -File .\comfyui\install-windows.ps1`, install the required model files into the ComfyUI model directories, then run `start-windows.ps1`.

Ai2 talks to ComfyUI over `COMFYUI_BASE_URL` (default `http://127.0.0.1:8188`).

## Safety boundary

Ai2's existing media safety filter remains authoritative. This integration does not remove or bypass it. It is intended for ordinary image generation and non-graphic adult/romantic content only.
