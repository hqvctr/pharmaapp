# Coletar preços no seu computador (Windows 11)

**Para que serve:** o app só pode avisar de uma promoção depois de acompanhar o preço do produto por 14 dias. Este
passo liga a coleta de preços no seu computador, sozinha, a cada 2 horas, para esses 14 dias começarem a contar.

**O que precisa:** computador com Windows 11, sempre ligado e com internet; a chave da Lomadee; cerca de 30 minutos
na primeira vez. Depois disso, quase nada a fazer.

> Aviso honesto: estes passos foram escritos e conferidos por partes (o coletor, o banco e os comandos funcionam
> em teste), mas **o instalador do Windows ainda não foi rodado num Windows de verdade**. Se alguma tela não for
> igual à descrita, tire uma foto/captura e mande para o Claude.

## Passo 1. Instalar o Docker Desktop (uma vez só)

1. Abra https://www.docker.com/products/docker-desktop/ e baixe a versão para Windows.
2. Instale com as opções que já vêm marcadas (deixe marcada a que usa o "WSL 2"). Reinicie o computador se pedir.
3. Abra o **Docker Desktop**, aceite os termos e espere o ícone da baleia ficar verde ("Engine running").
4. Dentro do Docker Desktop, abra a engrenagem (Settings) → **General** e marque **"Start Docker Desktop when you sign in to your computer"**. Clique em "Apply".

## Passo 2. Deixar o computador sempre acordado

Configurações do Windows → Sistema → Energia → "Tela e suspensão": coloque **Suspender = Nunca** (na tomada).
Se o computador dormir, a coleta para.

## Passo 3. Baixar o projeto

1. Abra este endereço no navegador (entre no GitHub com a sua conta se pedir):
   https://github.com/hqvctr/pharmaapp/archive/refs/heads/claude/vibrant-bardeen-jssxce.zip
2. Quando o arquivo baixar, clique com o botão direito → **Extrair tudo**. Escolha uma pasta fácil, por exemplo `C:\economae`.
3. Dentro da pasta extraída, abra `scripts` → `windows`.

## Passo 4. Rodar o instalador

1. Dê dois cliques em **`instalar.bat`**. Se o Windows avisar "O Windows protegeu o computador", clique em "Mais informações" → "Executar assim mesmo" (o arquivo é só uma lista de comandos; você pode abri-lo no Bloco de Notas para ver).
2. Uma janela preta vai mostrar os passos. **A primeira vez demora vários minutos** (baixa e monta tudo). Não feche.
3. Quando aparecer "Cole a chave da Lomadee e aperte Enter", cole a chave (botão direito do mouse cola) e aperte Enter. **Nada aparece na tela enquanto você cola. Isso é normal e é para a sua segurança.**
4. No fim aparece "Pronto". Aperte qualquer tecla para fechar.

O instalador cria um arquivo `.env` na pasta do projeto, com senhas geradas sozinhas. **Guarde uma cópia desse arquivo** num pen drive ou no seu e-mail: sem ele você teria de digitar a chave da Lomadee de novo.

## Passo 5. Conferir se está funcionando

Dê dois cliques em **`status.bat`** (na mesma pasta). Ele mostra, em português:
- quantos dias de histórico já existem (a meta é 14);
- quantos produtos e preços foram guardados;
- se a última coleta foi recente.

Na primeira vez, espere uns 10 minutos para a primeira coleta terminar. O primeiro ciclo também baixa a lista oficial de medicamentos (para barrar remédios); isso demora um pouco mais.

## No dia a dia

- Deixe o computador ligado e o Docker Desktop aberto. Se o Windows reiniciar sozinho (atualização), entre na sua conta: o Docker abre e a coleta volta sozinha.
- Para ver como está, use `status.bat` quando quiser. A mensagem "ATENÇÃO: está demorando" significa que a coleta parou: confira o computador e o Docker.
- Os alertas só começam depois de 14 dias; o `status.bat` conta isso para você.

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| "O Docker não está funcionando" | Abra o Docker Desktop, espere ficar verde e rode o `instalar.bat` de novo. |
| Qualquer erro vermelho | Tire uma foto da janela e mande para o Claude. Rodar `instalar.bat` de novo é seguro. |
| Quer trocar a chave da Lomadee | Abra um terminal na pasta do projeto e rode: `docker compose run --rm coletor node dist/pipeline/credencial.js --tenant padrao --fonte lomadee --pedir` e depois `docker compose restart coletor`. |
| Quer parar a coleta | `docker compose stop` na pasta do projeto. Para voltar: `docker compose start`. |

## Mais tarde: Google Cloud

Os mesmos arquivos (`docker-compose.yml` e a pasta do projeto) funcionam num servidor. Quando for a hora, o banco
atual pode ser copiado para lá (o histórico de preços não se perde). Isso é uma decisão para depois.

## Para quem for técnico

- Serviços (perfil `coleta`, ligado por `COMPOSE_PROFILES=coleta` no `.env`): `provisionar` (cria fonte e lojas a partir de `backend/config/vinculos/<tenant>.json`, sem alterar o que já existe) e `coletor` (`pipeline/ciclo.js`: a cada `INTERVALO_COLETA_MIN` minutos coleta todas as fontes ativas; atualiza a lista da CMED se tiver mais de `LISTA_MAX_DIAS` dias; se um ciclo nem chega a coletar, repete em 15 min).
- Banco, Redis e API só escutam em `127.0.0.1`. A chave que cifra credenciais (`CREDENTIALS_KEY`) fica só no `.env`.
- Estado do último ciclo: `/app/data/ultimo-ciclo.json` (volume `dados`); o healthcheck do coletor exige que ele tenha menos de 6 horas.
- Conferido em teste (Postgres de verdade): provisão idempotente, coleta real da Drogasmil e PromoFarma (1.739 itens), status, ciclo com erro claro e parada limpa (`scripts/pronto-fase3.sh`, passo 3c). **Não conferido:** `docker compose up` de verdade (o ambiente de desenvolvimento não tem o motor do Docker) e os arquivos `.bat` num Windows.
