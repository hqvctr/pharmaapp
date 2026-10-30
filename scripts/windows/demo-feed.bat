@echo off
rem Cria alguns alertas de DEMONSTRACAO (marcados "DEMONSTRACAO" no app) em ofertas reais ja coletadas, para voce ver o feed funcionando
rem antes de haver o historico minimo (7 dias). O "preco de antes" e a queda sao inventados. Para apagar: demo-feed-remover.bat.
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
docker compose run --rm api node dist/pipeline/demo.js --tenant padrao --criar --quantidade 8

:fim
echo.
pause
