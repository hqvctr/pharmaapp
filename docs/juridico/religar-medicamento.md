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
| 1 | Consulta formal à Anvisa sobre comparador de preços com afiliado (RDC 44/2009, art. 53, § 2º; Lei 15.357/2026). Minuta: [consulta-anvisa-minuta.md](consulta-anvisa-minuta.md) | responsável ou advogado | minuta pronta, não enviada; prompt para o consultor revisar e refinar: [PROMPT_ANVISA.md](PROMPT_ANVISA.md) |
| 2 | Advogado inscrito na OAB revisa o parecer: pendências em [resumo-advogado-rdc96.md](resumo-advogado-rdc96.md) | responsável | resumo pronto |
| 3 | Conferir no DOU a RDC 96 consolidada, o Anexo III e a Lei 15.357/2026 (o consultor leu fontes secundárias) | equipe | aberto |
| 4 | Fonte com GTIN (a Lomadee não envia) ou outra forma de identificar o registro na Anvisa de cada produto | responsável | aberto |
| 5 | Baixar a lista de preços da CMED e a Portaria SVS/MS 344/1998 (este ambiente bloqueia gov.br) e carregar com `carregarListasMedicamentos` | responsável | aberto |
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
