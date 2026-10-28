@echo off
rem Fecha o endereco temporario da API (o economae continua rodando no computador).
cd /d "%~dp0..\.."
if not exist .env (
  echo Esta pasta NAO e a do economae instalado: nao tem o arquivo .env.
  goto fim
)
docker compose --profile tunel stop tunel
docker compose --profile tunel rm -f tunel
echo Tunel fechado.

:fim
echo.
pause
