@echo off
setlocal enabledelayedexpansion
rem Liga o login do app neste computador: cria a chave que protege os codigos e, enquanto a Brevo nao estiver configurada aqui,
rem deixa o codigo aparecer numa janela (ver-codigo.bat) em vez de ser enviado por e-mail. SO PARA TESTE.
cd /d "%~dp0..\.."

docker info >nul 2>&1
if errorlevel 1 (
  echo O Docker nao esta aberto. Abra o "Docker Desktop", espere ficar verde e tente de novo.
  goto fim
)
if not exist .env (
  echo Nao existe o arquivo .env. Rode instalar.bat primeiro.
  goto fim
)

findstr /b /c:"AUTH_HMAC_KEY=" .env >nul 2>&1
if errorlevel 1 (
  set CHAVE=
  for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$b=New-Object byte[] 32;[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b);[Convert]::ToBase64String($b)"`) do set CHAVE=%%i
  if "!CHAVE!"=="" goto erro
  (echo AUTH_HMAC_KEY=!CHAVE!)>>.env
  echo Chave de login criada.
) else (
  echo Chave de login ja existe. Mantida.
)

findstr /b /c:"BREVO_API_KEY=" .env >nul 2>&1
if errorlevel 1 (
  findstr /b /c:"AUTH_EMAIL_CONSOLE=" .env >nul 2>&1
  if errorlevel 1 (echo AUTH_EMAIL_CONSOLE=1)>>.env
  echo Modo de teste: o codigo de login aparece com ver-codigo.bat, nao chega por e-mail.
)

echo.
echo Religando a API com a configuracao nova...
docker compose up -d api
if errorlevel 1 goto erro
echo.
echo Pronto. Agora abra o app, entre com o seu e-mail, e de dois cliques em ver-codigo.bat para ler o codigo.
goto fim

:erro
echo.
echo Deu erro. Copie as mensagens acima e me envie.

:fim
echo.
pause
