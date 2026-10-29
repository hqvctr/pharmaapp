@echo off
rem Cadastra uma pessoa como operador (quem pode entrar no painel). Rode na pasta onde o economae esta instalado.
cd /d "%~dp0..\.."

docker info >nul 2>&1
if errorlevel 1 (
  echo O Docker nao esta aberto. Abra o "Docker Desktop" e tente de novo.
  goto fim
)
if not exist .env (
  echo Esta pasta NAO e a do economae instalado: nao tem o arquivo .env.
  goto fim
)
echo.
set /p EMAIL=E-mail do operador (o mesmo em que vai receber o codigo): 
set /p NOME=Nome do operador: 
if "%EMAIL%"=="" goto fim
if "%NOME%"=="" goto fim
docker compose run --rm api node dist/api/operador.js --tenant padrao --email "%EMAIL%" --nome "%NOME%"

:fim
echo.
pause
