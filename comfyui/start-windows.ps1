$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$comfy=Join-Path $root 'ComfyUI'
if(-not (Test-Path $comfy)){ throw 'ComfyUI is not installed. Run install-windows.ps1 first.' }
Set-Location $comfy
$python=if($env:COMFYUI_PYTHON){$env:COMFYUI_PYTHON}else{'python'}
$hostName=if($env:COMFYUI_HOST){$env:COMFYUI_HOST}else{'127.0.0.1'}
$port=if($env:COMFYUI_PORT){$env:COMFYUI_PORT}else{'8188'}
& $python main.py --listen $hostName --port $port
