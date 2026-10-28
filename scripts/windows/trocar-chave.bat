@echo off
rem Troca a chave da Lomadee guardada e testa se a Lomadee aceita.
cd /d "%~dp0..\.."

docker info >nul 2>&1
if errorlevel 1 (
  echo O Docker nao esta aberto. Abra o "Docker Desktop" e tente de novo.
  goto fim
)
echo Cole a chave da Lomadee e aperte Enter. Nada aparece na tela enquanto voce cola; isso e normal.
docker compose run --rm coletor node dist/pipeline/credencial.js --tenant padrao --fonte lomadee --pedir
if errorlevel 1 goto fim
docker compose run --rm -T coletor node dist/pipeline/credencial.js --tenant padrao --fonte lomadee --testar
if errorlevel 1 (
  echo.
  echo A Lomadee RECUSOU essa chave. Confira se copiou a chave certa e inteira, sem espacos, e tente de novo.
  goto fim
)
echo A Lomadee aceitou a chave. Reiniciando o coletor para ele comecar agora...
docker compose restart coletor
echo Pronto. Espere uns 10 minutos e de dois cliques em status.bat.

:fim
echo.
pause
