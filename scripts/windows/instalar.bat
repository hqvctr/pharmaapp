@echo off
setlocal enabledelayedexpansion
rem Instala e liga a coleta de precos neste computador (Windows + Docker Desktop).
rem Pode rodar de novo quando quiser: o que ja existe e mantido.
cd /d "%~dp0..\.."

echo.
echo == 1. Conferindo se o Docker esta aberto
docker info >nul 2>&1
if errorlevel 1 (
  echo O Docker nao esta funcionando. Abra o programa "Docker Desktop", espere ele ficar verde e rode este arquivo de novo.
  goto fim
)

echo.
echo == 2. Criando o arquivo de configuracao (.env)
if exist .env (
  echo Ja existe. Mantido como esta.
) else (
  set SENHA=
  set CHAVE=
  for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$b=New-Object byte[] 24;[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b);[BitConverter]::ToString($b).Replace('-','')"`) do set SENHA=%%i
  for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$b=New-Object byte[] 32;[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b);[Convert]::ToBase64String($b)"`) do set CHAVE=%%i
  if "!SENHA!"=="" goto erro
  if "!CHAVE!"=="" goto erro
  (
    echo POSTGRES_DB=promo
    echo POSTGRES_USER=promo
    echo POSTGRES_PASSWORD=!SENHA!
    echo POSTGRES_PORT=5432
    echo REDIS_PORT=6379
    echo API_PORT=3000
    echo CREDENTIALS_KEY=!CHAVE!
    echo CREDENTIALS_KEY_VERSION=v1
    echo COMPOSE_PROFILES=coleta
    echo TENANT=padrao
    echo INTERVALO_COLETA_MIN=120
  ) > .env
  echo Criado. GUARDE UMA COPIA do arquivo ".env" desta pasta: ele tem a chave que protege a sua senha da Lomadee.
)

echo.
echo == 3. Ligando o banco de dados e o coletor (a primeira vez demora varios minutos)
docker compose up -d --build
if errorlevel 1 goto erro

echo.
echo == 4. Chave da Lomadee
docker compose run --rm -T coletor node dist/pipeline/credencial.js --tenant padrao --fonte lomadee --testar >nul 2>&1
if not errorlevel 1 (
  echo A chave da Lomadee esta guardada e a Lomadee aceitou.
  goto pronto
)
echo A chave da Lomadee ainda nao foi guardada, ou a Lomadee nao aceitou a que esta guardada.
echo Cole a chave da Lomadee e aperte Enter. Nada aparece na tela enquanto voce cola; isso e normal.
docker compose run --rm coletor node dist/pipeline/credencial.js --tenant padrao --fonte lomadee --pedir
if errorlevel 1 goto erro
docker compose run --rm -T coletor node dist/pipeline/credencial.js --tenant padrao --fonte lomadee --testar
if errorlevel 1 (
  echo.
  echo A Lomadee RECUSOU essa chave. Confira se copiou a chave certa e inteira, sem espacos, e de dois cliques em trocar-chave.bat para tentar de novo.
  goto fim
)
echo A Lomadee aceitou a chave. Reiniciando o coletor para ele comecar agora...
docker compose restart coletor

:pronto
echo.
echo == Pronto
echo A coleta esta rodando e vai repetir a cada 2 horas, sozinha.
echo Para ver como esta: de dois cliques em "status.bat" (mesma pasta deste arquivo).
echo Deixe o computador ligado e o Docker Desktop aberto.
goto fim

:erro
echo.
echo Algo deu errado. Copie as mensagens acima e mande para o Claude.

:fim
echo.
pause
