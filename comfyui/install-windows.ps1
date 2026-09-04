$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$target=Join-Path $root 'ComfyUI'
if(Test-Path (Join-Path $target '.git')){ Write-Host 'ComfyUI checkout already exists.'; exit 0 }
if(Test-Path $target){ throw "Target exists but is not a ComfyUI git checkout: $target" }
if(-not (Get-Command git -ErrorAction SilentlyContinue)){ throw 'Git is required.' }
Write-Host 'Cloning official ComfyUI repository...'
git clone https://github.com/Comfy-Org/ComfyUI.git $target
Write-Host 'Checkout complete. Install the dependencies described by the current ComfyUI documentation before starting.'
