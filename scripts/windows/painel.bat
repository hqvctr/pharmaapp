@echo off
rem Abre o painel do operador no navegador (a porta e a API_PORT do .env; o padrao e 3000).
cd /d "%~dp0..\.."
set PORTA=3000
if exist .env for /f "tokens=1,2 delims==" %%a in (.env) do if "%%a"=="API_PORT" set PORTA=%%b
echo Abrindo http://localhost:%PORTA%/operador/
echo Para entrar: digite o e-mail, depois rode "ver-codigo.bat" para ver o codigo de 6 digitos.
start "" "http://localhost:%PORTA%/operador/"
echo.
pause
