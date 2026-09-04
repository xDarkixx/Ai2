# Ai2 ComfyUI integration

This directory keeps the local ComfyUI integration isolated from the Ai2 Node.js backend.

**Supported deployment target: Ubuntu/Linux.** Windows launchers are not part of the Ai2 deployment.

ComfyUI remains a separate runtime checkout. Model weights are never committed to this repository.

## Layout

- `client.js` — HTTP client for a local ComfyUI API.
- `gateway.js` — authenticated Ai2 gateway for image-generation jobs.
- `workflows/` — workflow templates used by Ai2.
- `install-linux.sh` — installs the official ComfyUI repository into a separate runtime directory and creates a Python virtual environment.
- `start-linux.sh` — starts ComfyUI locally on `127.0.0.1:8188`.
- `.gitignore` — keeps models, outputs, virtual environments and caches out of Ai2.

The installer uses the official ComfyUI repository from `Comfy-Org/ComfyUI`. ComfyUI dependencies are installed into its dedicated virtual environment; model weights must be installed separately into the ComfyUI model directories.

## Ubuntu installation

Install the base prerequisites first (`python3`, `python3-venv`, `git`), then run:

```bash
sudo AI2_COMFYUI_ROOT=/opt/ai2-comfyui ./comfyui/install-linux.sh
```

Start manually with:

```bash
AI2_COMFYUI_ROOT=/opt/ai2-comfyui ./comfyui/start-linux.sh
```

For production use, install `deploy/systemd/ai2-comfyui.service` and run ComfyUI as the dedicated Ai2 service user. Keep the ComfyUI API bound to `127.0.0.1`; Ai2's NGINX configuration does not expose ComfyUI directly to the public network.

Ai2 talks to ComfyUI through `COMFYUI_BASE_URL` (default `http://127.0.0.1:8188`). The Ai2 gateway listens separately on `COMFYUI_GATEWAY_PORT` (default `3030`) so it cannot collide with the payments service on port `3020`.

## Safety boundary

Ai2's existing media safety filter remains authoritative. This integration does not remove or bypass it.
