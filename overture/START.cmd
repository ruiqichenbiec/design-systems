@echo off
cd /d "%~dp0"
if not exist "dist\index.html" node tools\build.mjs
start "" "http://127.0.0.1:4198/?motion=full"
node tools\serve.mjs
pause
