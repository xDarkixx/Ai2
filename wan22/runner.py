#!/usr/bin/env python3
"""Ai2 adapter for the official Wan2.2 repository.

This wrapper deliberately delegates inference to an existing Wan2.2 checkout
instead of copying the large model weights into Ai2.
"""
import argparse
import json
import os
import subprocess
import sys


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--root', required=True, help='Path to a Wan2.2 checkout')
    p.add_argument('--ckpt', required=True, help='Wan2.2 checkpoint directory')
    p.add_argument('--prompt', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--image')
    p.add_argument('--size', default='1280*704')
    p.add_argument('--seed', type=int, default=-1)
    args = p.parse_args()

    blocked = ('explicit porn', 'pornographic', 'graphic sexual', 'sex act',
               'sexual intercourse', 'penetration', 'genitals', 'nude sex', 'hardcore')
    if any(x in args.prompt.lower() for x in blocked):
        print(json.dumps({'ok': False, 'error': 'Graphic sexual media generation is not supported.'}), flush=True)
        return 2

    task = 'ti2v-5B'
    cmd = [sys.executable, os.path.join(args.root, 'generate.py'),
           '--task', task, '--size', args.size, '--ckpt_dir', args.ckpt,
           '--offload_model', 'True', '--convert_model_dtype', '--t5_cpu',
           '--prompt', args.prompt, '--save_file', args.output]
    if args.image:
        cmd += ['--image', args.image]
    if args.seed >= 0:
        cmd += ['--base_seed', str(args.seed)]

    proc = subprocess.run(cmd, cwd=args.root, text=True)
    if proc.returncode != 0:
        print(json.dumps({'ok': False, 'error': f'Wan2.2 exited with code {proc.returncode}'}), flush=True)
        return proc.returncode
    print(json.dumps({'ok': True, 'provider': 'wan2.2', 'output': os.path.abspath(args.output)}), flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
