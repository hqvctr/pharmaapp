@echo off
rem Apaga os alertas de DEMONSTRACAO criados por demo-feed.bat (os alertas de verdade nao sao tocados).
cd /d "%~dp0..\.."
if not exist .env (
  echo Esta pasta NAO e a do economae instalado: nao tem o arquivo .env.
  goto fim
)
docker info >nul 2>&1
if errorlevel 1 (
  echo O Docker nao esta aberto. Abra o "Docker Desktop" e tente de novo.
  goto fim
)
docker compose run --rm api node dist/pipeline/demo.js --tenant padrao --remover

:fim
echo.
pause
