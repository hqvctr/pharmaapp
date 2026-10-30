@echo off
rem Liga o push (fase 4, docs/operacao/push.md). Antes: o JSON da conta de servico do Firebase salvo em
rem segredos\firebase-conta-servico.json, dentro desta pasta do economae. Este arquivo NAO abre nem mostra o .env nem o JSON:
rem so acrescenta a linha FCM_CONTA_SERVICO ao .env (se ainda nao existir) e religa o coletor.
cd /d "%~dp0..\.."
if not exist .env (
  echo Esta pasta NAO e a do economae instalado: nao tem o arquivo .env.
  goto fim
)
if not exist segredos\firebase-conta-servico.json (
  echo Nao achei segredos\firebase-conta-servico.json nesta pasta.
  echo Salve o JSON da conta de servico do Firebase com esse nome, dentro da pasta "segredos", e rode de novo.
  goto fim
)
docker info >nul 2>&1
if errorlevel 1 (
  echo O Docker nao esta aberto. Abra o "Docker Desktop", espere ficar verde e tente de novo.
  goto fim
)
findstr /b /c:"FCM_CONTA_SERVICO=" .env >nul
if errorlevel 1 (
  >>.env echo.
  >>.env echo FCM_CONTA_SERVICO=/segredos/firebase-conta-servico.json
  echo Linha FCM_CONTA_SERVICO acrescentada ao .env.
) else (
  echo O .env ja tinha FCM_CONTA_SERVICO; nada foi mudado nele.
)
echo Religando o coletor...
docker compose up -d coletor
if errorlevel 1 goto erro
rem Espera o coletor subir e mostra so a linha que diz se o push ligou (nunca mostra a chave).
timeout /t 20 /nobreak >nul
docker compose logs --tail 200 coletor | findstr /c:"push ligado" /c:"push desligado" /c:"FCM_CONTA_SERVICO" /c:"ERRO no FCM"
echo.
echo Se apareceu "push ligado", o push esta ligado. Se apareceu "FCM_CONTA_SERVICO: ...", o arquivo esta errado: copie a mensagem e me envie.
goto fim

:erro
echo.
echo Deu erro. Copie as mensagens acima e me envie.

:fim
echo.
pause
