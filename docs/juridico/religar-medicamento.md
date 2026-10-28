# Como religar o medicamento

Estado atual (decisão 58): `medicamentos.modo = "desligado"` em `backend/config/tenants/padrao.json`. Nenhum
medicamento aparece em lugar nenhum. O código recusa carregar qualquer outro valor, de propósito: `lista` e
`propaganda` ainda não existem. Base: [parecer-rdc96.md](parecer-rdc96.md) (minuta, sem revisão de advogado).

O que o desligado faz hoje:
- isento de prescrição com GTIN conhecido: bloqueado e registrado como `MEDICAMENTO_DESLIGADO`;
- prescrição, controlado, termo de venda controlada, promoção por quantidade: bloqueios específicos de antes;
- remédio sem GTIN, mesmo mal categorizado: `MEDICAMENTO_SEM_REFERENCIA` com revisão humana, se o título
  citar uma substância de `medicamentos.triagemPorNome` (RF-12).

## Ordem para religar

| # | Passo | Quem | Estado |
|---|-------|------|--------|
| 1 | Consulta formal à Anvisa sobre comparador de preços com afiliado (RDC 44/2009, art. 53, § 2º; Lei 15.357/2026). Texto final proposto, com 7 perguntas, anexos e passo a passo (Fale Conosco, prazo de 20 dias corridos mais 10): [parecer-anvisa.md](parecer-anvisa.md), seção "Consulta formal pronta". Precisa de CNPJ, sede, nome da rede de afiliados, lojas com AFE e capturas de protótipo. A minuta antiga ([consulta-anvisa-minuta.md](consulta-anvisa-minuta.md)) fica superada | responsável ou advogado | texto pronto, **não enviado** |
| 2 | Advogado inscrito na OAB revisa o parecer: pendências em [resumo-advogado-rdc96.md](resumo-advogado-rdc96.md) | responsável | resumo pronto |
| 3 | Conferir no DOU a RDC 96 consolidada, o Anexo III e a Lei 15.357/2026 (o consultor leu fontes secundárias) | equipe | aberto |
| 4 | Fonte de ofertas com GTIN. **A documentação oficial da API de afiliados da Lomadee traz `ean` em cada opção de produto** (conferido em 2026-10-28; a leitura anterior, de uma API antiga, estava errada). Falta ver na primeira resposta real se o campo vem preenchido para as farmácias. Sem `ean`, o casamento por nome com a CMED continua só como trava, nunca como liberação | responsável / Claude | depende da primeira chamada real |
| 5 | Lista de preços da CMED: **acessível** (baixei em 2026-10-27 a lista PMC de 09/10/2026, 26.635 linhas, todas com EAN, e colunas SUBSTÂNCIA, REGISTRO, LABORATÓRIO, CNPJ, PRODUTO, APRESENTAÇÃO e TARJA). Falta um conversor para o formato de `carregarListasMedicamentos` (EAN 1/2/3 → gtin; SUBSTÂNCIA → principioAtivo; isento = TARJA "Tarja Sem Tarja", ainda a confirmar; 4.610 linhas sem tarja informada ficam como não isentas). Falta também a Portaria SVS/MS 344/1998 | Claude / responsável | meio caminho |
| 6 | Farmacêutico lista os isentos com sedação ou sonolência na bula (art. 17); entra em config | responsável | aberto |
| 7 | Cadastro das farmácias: razão social, CNPJ, AFE, licença sanitária e domínio `.com.br` conferidos por operador (RF-14) | operador | aberto |
| 8 | Licença da fonte Humanist 777 ou Frutiger 55 para o quadro de advertência | responsável | aberto |
| 9 | Código: modo `lista` (RF-2, RF-7, RF-13, RF-17), depois `propaganda` (RF-3 a RF-6, RF-8, RF-9, RF-18), contrato, tela de consentimento (RF-15) | Claude | não iniciado |
| 10 | Decisão final do responsável sobre o modo, com a resposta da Anvisa e do advogado em mãos | responsável | aberto |

Só depois do passo 9 o `modo` aceita outro valor, e a mudança é uma decisão registrada no DECISIONS.md.

## Regras já aprovadas (valem quando medicamento for ligado)
RF-10 (push nunca cita medicamento), RF-11 (sem compartilhar), RF-14 (link só para site próprio de farmácia) e
RF-15 (seguir exige consentimento LGPD específico). Ver DECISIONS 58.

## Lista inicial da trava por substância
`medicamentos.triagemPorNome` tem as substâncias do Anexo III e outras comuns, não exaustiva. Substâncias
comuns em alimento e cosmético (`substanciasAmbiguas`, como vitamina C) só bloqueiam se o título não tiver
uma palavra de `ignorarSeTitulo`. Quando a lista da CMED estiver carregada, o ideal é derivar as substâncias
dela; a lista manual fica como rede de proteção.

## Plano B enquanto medicamento está desligado (parecer da Anvisa, pergunta 10)
Pode: pesquisa, feed e avisos dos demais produtos de farmácia (cosmético, higiene, fralda, lenço, protetor
solar); texto genérico "Medicamentos isentos de prescrição: em avaliação regulatória", sem nome, marca,
preço, sintoma ou classe; lista de espera sem produto e com consentimento próprio.
Não pode: exibir qualquer medicamento, nem por engano; prometer desconto em medicamento; perguntar qual
remédio a pessoa quer acompanhar.
Quando existir pesquisa: termo de medicamento devolve estado vazio com o texto fixo "Medicamentos ainda não
estão disponíveis no economae".

## Desenho de menor risco para sair do zero (a decidir, só depois do advogado)
Busca de preço de isento **sem link de compra**, em lista (nome comercial, DCB, apresentação, registro,
detentor, preço por loja, "preço consultado em [data e hora] no site da loja"), sem percentual, destaque,
aviso, compartilhamento nem comissão. Exige GTIN e dados da CMED. Ordem completa dos 7 desenhos e riscos:
matriz em [parecer-anvisa.md](parecer-anvisa.md).

