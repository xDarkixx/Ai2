# Ai2 Native Engine

This directory contains the C++ integration point for running a local AI runtime alongside the Ai2 Node.js application.

`main.cpp` is a safe native runtime scaffold. It detects the host platform, reports optional AVX2/CUDA compilation features, and initializes model/tokenizer/media adapter stages.

The native binary does not contain an embedded model or generate graphic sexual media. A real local model/runtime can be connected through this adapter layer.

## Build

Requires CMake and a C++17 compiler.

```bash
cmake -S native -B build
cmake --build build --config Release
```

## Integration direction

The Ai2 web server remains the primary application process. The native engine is intended to become a local inference worker/adapter that can be invoked by the server through a documented IPC or HTTP boundary.
