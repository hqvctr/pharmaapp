@echo off
setlocal enabledelayedexpansion
rem Atualiza o projeto com o zip mais recente baixado em Downloads (o .env e os dados do banco sao mantidos) e religa tudo.
rem Antes: baixe o zip de https://github.com/hqvctr/pharmaapp/archive/refs/heads/claude/zen-gates-965k2e.zip (entre no GitHub se pedir).
cd /d "%~dp0..\.."

docker info >nul 2>&1
if errorlevel 1 (
  echo O Docker nao esta aberto. Abra o "Docker Desktop", espere ficar verde e tente de novo.
  goto fim
)

rem Seguranca: so roda na pasta onde o economae foi instalado (a que tem o .env). Em outra pasta o Docker criaria um banco novo e vazio.
if not exist .env (
  echo Esta pasta NAO e a do economae instalado: nao tem o arquivo .env.
  echo Abra a pasta onde voce rodou o instalar.bat pela primeira vez e rode o atualizar.bat que esta la.
  goto fim
)

set ZIP=
for /f "delims=" %%f in ('dir /b /o-d "%USERPROFILE%\Downloads\pharmaapp*.zip" 2^>nul') do if not defined ZIP set "ZIP=%USERPROFILE%\Downloads\%%f"
if not defined ZIP (
  echo Nao achei nenhum arquivo pharmaapp*.zip na pasta Downloads.
  echo Baixe de: https://github.com/hqvctr/pharmaapp/archive/refs/heads/claude/zen-gates-965k2e.zip
  goto fim
)
echo Usando: %ZIP%

rmdir /s /q "%TEMP%\economae-atualizar" >nul 2>&1
powershell -NoProfile -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%TEMP%\economae-atualizar' -Force"
if errorlevel 1 goto erro
set ORIGEM=
for /d %%d in ("%TEMP%\economae-atualizar\*") do set "ORIGEM=%%d"
if not defined ORIGEM goto erro

rem Copia por cima. O .env nao vem no zip e este proprio arquivo e pulado (nao se troca um .bat que esta rodando).
robocopy "!ORIGEM!" "%CD%" /E /XF .env atualizar.bat /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto erro

echo.
echo Religando (a primeira vez depois de atualizar demora alguns minutos)...
docker compose up -d --build
if errorlevel 1 goto erro
echo.
echo Pronto. O projeto esta atualizado e rodando. Seus dados foram mantidos.
goto fim

:erro
echo.
echo Deu erro. Copie as mensagens acima e me envie.

:fim
echo.
pause
