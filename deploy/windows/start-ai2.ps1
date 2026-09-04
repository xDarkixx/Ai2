$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $Root

Write-Host '=== Ai2 Windows Launcher ==='

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js is not installed or not in PATH.'
}

if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
  Write-Host 'Installing npm dependencies...'
  npm install
}

$env:PORT = if ($env:PORT) { $env:PORT } else { '3000' }
$server = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $Root -PassThru
Write-Host "Ai2 backend started (PID $($server.Id)) on http://127.0.0.1:$($env:PORT)"

$nginx = $env:NGINX_EXE
if (-not $nginx) { $nginx = 'C:\nginx\nginx.exe' }

if (Test-Path $nginx) {
  $nginxRoot = Split-Path -Parent $nginx
  $conf = Join-Path $Root 'deploy\nginx\nginx.conf'
  Write-Host 'Starting NGINX reverse proxy on http://localhost ...'
  & $nginx -t -p "$nginxRoot\" -c $conf
  if ($LASTEXITCODE -ne 0) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    throw 'NGINX configuration test failed.'
  }
  Start-Process -FilePath $nginx -WorkingDirectory $nginxRoot -ArgumentList '-p', "$nginxRoot\", '-c', $conf
  Write-Host 'Ai2 is available through NGINX at http://localhost/'
} else {
  Write-Warning "NGINX not found at $nginx. Ai2 is still available at http://127.0.0.1:$($env:PORT)/"
}

Write-Host 'Press Ctrl+C to stop this launcher. The Node process can be stopped with: Stop-Process -Id ' $server.Id
try { Wait-Process -Id $server.Id } catch { }
