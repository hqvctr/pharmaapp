@echo off
rem Mostra como esta a coleta de precos.
cd /d "%~dp0..\.."

docker info >nul 2>&1
if errorlevel 1 (
  echo O Docker nao esta aberto. Abra o "Docker Desktop" e tente de novo.
  goto fim
)
echo.
echo == Como esta a coleta
docker compose exec -T coletor node dist/pipeline/status.js
if errorlevel 1 echo O coletor nao esta ligado. Rode "instalar.bat" para ligar.
echo.
echo == Ultimas mensagens do coletor
docker compose logs --tail 8 coletor

:fim
echo.
pause
