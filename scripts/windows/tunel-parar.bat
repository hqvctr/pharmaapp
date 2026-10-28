@echo off
rem Fecha o endereco temporario da API (o economae continua rodando no computador).
cd /d "%~dp0..\.."
docker compose --profile tunel stop tunel
docker compose --profile tunel rm -f tunel
echo Tunel fechado.
echo.
pause
