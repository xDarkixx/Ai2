# Wan2.2 adapter

Ai2 can use the official [Wan-Video/Wan2.2](https://github.com/Wan-Video/Wan2.2) checkout as a local video-generation backend.

The adapter uses the upstream `generate.py` entry point and the `ti2v-5B` model. Wan2.2 documents TI2V-5B as a unified text-to-video/image-to-video model for 720P and notes that it can run on consumer GPUs such as an RTX 4090 with offloading. The larger A14B models require substantially more GPU memory.

## Configuration

Set these values in `.env`:

```text
WAN22_ENABLED=true
WAN22_ROOT=/path/to/Wan2.2
WAN22_CKPT=/path/to/Wan2.2-TI2V-5B
WAN22_PYTHON=python3
WAN22_DEFAULT_SIZE=1280*704
WAN22_TIMEOUT_MS=1800000
```

Ai2 does not store Wan model weights in this repository. Install the upstream dependencies and download the checkpoint separately.

## Example

```bash
python3 runner.py --root /path/to/Wan2.2 --ckpt /path/to/Wan2.2-TI2V-5B --prompt "A cinematic night city scene" --size 1280*704 --output ./output.mp4
```

The wrapper is intentionally restricted to non-graphic media prompts.
