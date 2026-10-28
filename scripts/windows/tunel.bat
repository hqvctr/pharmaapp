@echo off
rem Abre um endereco de internet temporario para a API, para o celular alcancar o economae fora de casa.
rem O endereco (https://....trycloudflare.com) muda toda vez que o tunel sobe. Para fechar: tunel-parar.bat
cd /d "%~dp0..\.."

docker info >nul 2>&1
if errorlevel 1 (
  echo O Docker nao esta aberto. Abra o "Docker Desktop" e tente de novo.
  goto fim
)
if not exist .env (
  echo Esta pasta NAO e a do economae instalado: nao tem o arquivo .env. Rode este arquivo na pasta onde voce rodou o instalar.bat.
  goto fim
)
rem Atras do tunel a API precisa confiar no cabecalho do proxy para limitar por IP certo.
findstr /b /c:"TRUST_PROXY=" .env >nul 2>&1
if errorlevel 1 echo TRUST_PROXY=1>>.env
docker compose --profile tunel up -d api tunel
if errorlevel 1 goto fim
echo Esperando o endereco aparecer...
timeout /t 12 /nobreak >nul
echo.
echo Seu endereco (copie o que termina em trycloudflare.com):
docker compose logs tunel 2>&1 | findstr /i "trycloudflare.com"
echo.
echo Se nao apareceu nada, espere mais 10 segundos e de dois cliques neste arquivo de novo.

:fim
echo.
pause
