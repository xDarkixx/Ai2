$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$NginxDir = if ($env:NGINX_HOME) { $env:NGINX_HOME } else { 'C:\nginx' }
$NginxExe = Join-Path $NginxDir 'nginx.exe'

if (-not (Test-Path $NginxExe)) {
  Write-Host "NGINX is not installed at $NginxDir."
  Write-Host 'Download the current Windows package from the official NGINX download page, extract it, then set NGINX_HOME to that directory.'
  exit 1
}

$conf = Join-Path $Root 'deploy\nginx\nginx.conf'
& $NginxExe -t -p "$NginxDir\" -c $conf
if ($LASTEXITCODE -ne 0) { throw 'NGINX configuration validation failed.' }

Write-Host 'NGINX configuration is valid.'
Write-Host "Backend target: http://127.0.0.1:3000"
Write-Host 'Public URL: http://localhost/'
