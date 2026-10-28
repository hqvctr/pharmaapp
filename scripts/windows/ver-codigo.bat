@echo off
rem Mostra os ultimos codigos de login gerados (modo de teste). Cada linha diz para qual e-mail foi. O codigo vale 10 minutos.
cd /d "%~dp0..\.."
echo Codigos recentes (o mais novo e o ultimo):
echo.
docker compose logs --tail 300 api 2>&1 | findstr /i "DESENVOLVIMENTO"
echo.
echo Se nao apareceu nada: peca o codigo no app de novo (espere 1 minuto entre pedidos) e rode este arquivo outra vez.
echo.
pause
