# ComfyUI integration test

This directory contains a deterministic, GPU-free test for the Ai2 ComfyUI workflow layer.
It validates prompt safety, workflow construction, queue payload shape, and gateway configuration without downloading model weights.

For a real image-generation smoke test, run ComfyUI locally with a small compatible checkpoint and use the test workflow through the gateway.
