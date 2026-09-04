@echo off
setlocal
cd /d "%~dp0\..\.."
where node >nul 2>nul || (echo Node.js not found in PATH.& exit /b 1)
if not exist node_modules (echo Installing dependencies...& call npm install || exit /b 1)
if "%PORT%"=="" set PORT=3000
start "Ai2 Backend" /min cmd /c "node server.js"
set "NGINX_EXE=%NGINX_EXE%"
if "%NGINX_EXE%"=="" set "NGINX_EXE=C:\nginx\nginx.exe"
if exist "%NGINX_EXE%" (
  "%NGINX_EXE%" -t -p "C:\nginx\" -c "%CD%\deploy\nginx\nginx.conf"
  if errorlevel 1 exit /b 1
  start "Ai2 NGINX" /min "%NGINX_EXE%" -p "C:\nginx\" -c "%CD%\deploy\nginx\nginx.conf"
  echo Ai2: http://localhost/
) else (
  echo NGINX not found. Ai2: http://127.0.0.1:%PORT%/
)
endlocal
