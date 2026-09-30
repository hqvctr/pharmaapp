# Textos da interface — economae

Fonte de verdade de todo texto. As telas Android leem de `android/app/src/main/res/values/strings.xml`
(chave entre crases) e o protótipo usa os mesmos textos. `{chave}` = valor preenchido pelo app.

**Regras de redação**
1. Frase curta, ordem direta, palavra do dia a dia. Teste: quem nunca usou o app entende na
   primeira leitura. [Inaf 2024: 29% analfabetismo funcional]
2. Proibido na interface: mediana, piso, score, feed, push, notificação push, R$/l, R$/kg, SKU,
   curadoria, algoritmo, "ops", "oops", pontos de exclamação, emojis.
3. Dinheiro sempre `R$ 1.234,56`; datas `12/09`; horas `14:10`. Nada de "R$ 39,9" ou "39.90".
4. "A gente" e "nós" alternam naturalmente; nunca "o sistema".
5. Nunca prometer o que o dado não sustenta: "em 6 meses" só com 180 dias medidos.
6. Quando há dúvida legítima de tom, duas variações: **A (recomendada)** e **B**. A variação B é a
   candidata ao teste de MEDICAO.md.

---

## 1. Notificação

| Chave | Texto | Limite | Observação |
|---|---|---|---|
| `canal_ofertas_nome` | Ofertas excepcionais | — | Nome do canal nas configurações do sistema |
| `canal_ofertas_descricao` | Avisos de promoção de verdade nas categorias que você segue. No máximo {n} por dia. | — | |
| `canal_app_nome` | Avisos do app | — | Só conta e assinatura |
| `notif_titulo` | {preço} · {nome curto} | 30 | Nome cortado com "…"; preço nunca |
| `notif_titulo_condicao_leve` | {total} por {leve} · {nome curto} | 30 | Leve-pague: o valor que sai do bolso |
| `notif_texto_menor_meses` | Menor preço em 6 meses: {economia} a menos | 40 | 1ª opção |
| `notif_texto_menor_dias` | Menor preço em {n} dias: {economia} a menos | 40 | Histórico < 180 dias |
| `notif_texto_menor_curto` | Menor em 6 meses: {economia} a menos | 40 | 2ª opção |
| `notif_texto_abaixo_normal` | {economia} abaixo do normal da loja | 40 | 3ª opção |
| `notif_texto_quase_menor` | Quase o menor em 6 meses: {economia} a menos | 40 | Se não couber, cai na 3ª opção |
| `notif_texto_leve_pague` | Leve {leve}, pague {pague} · economia de {economia} | 40 | |
| `notif_texto_cartao` | Com cartão {programa} · {economia} a menos | 40 | |
| `notif_texto_cartao_curto` | Só com cartão da loja · {economia} a menos | 40 | Programa com nome longo |
| `notif_texto_app_loja` | Só no app da {loja} · {economia} a menos | 40 | |
| `notif_texto_quantidade` | Comprando {n} · economia de {economia} | 40 | |
| `notif_texto_caiu_mais` | Caiu mais: era {preço anterior} no último aviso | 40 | Deduplicação liberou por queda adicional [U13] |
| `notif_texto_retirada` | Retire a {distância} · {economia} a menos | 40 | |
| `notif_expandido_normal` | Preço normal nesta loja: {preço normal}. | — | |
| `notif_expandido_menor_meses` | Menor preço dos últimos 6 meses. | — | |
| `notif_expandido_menor_dias` | Menor preço em {n} dias de medição. | — | |
| `notif_expandido_quase` | Perto do menor preço dos últimos 6 meses. | — | |
| `notif_expandido_entrega` | Entrega no seu CEP em até {n} dias. | — | |
| `notif_expandido_entrega_confirmar` | Entrega no seu CEP. Frete a confirmar na loja. | — | |
| `notif_expandido_retirada` | Retire na loja a {distância}. | — | |
| `notif_expandido_rodape` | Conferido às {hora}. Você segue {categoria}. | — | Explica o porquê [R11] |
| `notif_acao_loja` | Ver na loja | — | |
| `notif_acao_ajustar` | Ajustar avisos | — | |
| `notif_grupo_titulo` | {n} ofertas excepcionais | — | InboxStyle |

## 2. Primeiro uso

| Chave | Texto A (recomendada) | Texto B |
|---|---|---|
| `boas_vindas_titulo` | Só avisamos quando a promoção é de verdade. | Chega de promoção de mentira. |
| `boas_vindas_texto` | Comparamos com o preço que a própria loja cobrou nos últimos meses. Se não for o menor, a gente não avisa. | A gente acompanha o preço de cada produto todo dia. Só avisa quando ele chega no menor valor dos últimos meses. |
| `boas_vindas_acao` | Começar | — |
| `boas_vindas_como` | Como a gente confere | — |
| `categorias_titulo` | O que você costuma comprar? | — |
| `categorias_texto` | Escolha uma ou mais. Só avisamos sobre o que você escolher. | — |
| `categorias_acao` | Continuar | — |
| `categorias_acao_contagem` | Continuar com {n} | — |
| `categorias_nenhuma` | Escolha pelo menos uma | — |
| `cep_titulo` | Qual é o seu CEP? | — |
| `cep_texto` | Serve só para saber quais lojas entregam para você. Não pedimos endereço nem localização. | — |
| `cep_rotulo` | CEP | — |
| `cep_exemplo` | 00000-000 | — |
| `cep_nao_sei` | Não sei meu CEP | — | Abre a busca dos Correios no navegador |
| `cep_erro_incompleto` | O CEP tem 8 números. | — |
| `cep_fora_regiao_titulo` | Ainda não chegamos aí | — |
| `cep_fora_regiao_texto` | Começamos pelo estado de São Paulo. Guardamos seu CEP e avisamos quando chegar na sua região. | — |
| `cep_fora_regiao_acao` | Me avise quando chegar | — |
| `cep_acao` | Continuar | — |
| `permissao_titulo` | Quer receber o aviso quando aparecer? | Posso te avisar? |
| `permissao_texto` | No máximo 3 por dia, nunca de madrugada, nunca propaganda. Você muda isso quando quiser. | — |
| `permissao_exemplo_rotulo` | Um aviso é assim: | — |
| `permissao_aceitar` | Quero receber avisos | Pode avisar |
| `permissao_depois` | Agora não | — |
| `permissao_negada_texto` | Tudo bem. As ofertas continuam aqui no app. Se mudar de ideia, é só ir em Ajustes. | — |

## 3. Prova (selo, régua, detalhe)

| Chave | Texto |
|---|---|
| `selo_menor_meses` | Menor preço em 6 meses |
| `selo_menor_dias` | Menor preço em {n} dias de medição |
| `selo_quase_meses` | Quase o menor preço em 6 meses |
| `selo_quase_dias` | Quase o menor preço em {n} dias |
| `preco_normal` | Preço normal nesta loja: {preço} |
| `preco_cada` | cada |
| `economia_chip` | {valor} a menos |
| `economia_chip_levando` | {valor} a menos levando {n} |
| `economia_chip_percentual` | {valor} a menos ({percentual}) |
| `regua_hoje` | hoje |
| `regua_normal` | normal |
| `regua_maior` | maior |
| `regua_descricao` | Nos últimos {período}, o preço foi de {mínimo} a {máximo}. O normal é {normal}. Hoje está {hoje}. |
| `prova_titulo` | Por que é promoção de verdade |
| `prova_check_abaixo` | Está {economia} abaixo do preço normal desta loja, que é a média do que ela cobrou nos últimos 30 dias. |
| `prova_check_abaixo_cada` | Cada uma sai {economia} abaixo do preço normal desta loja, que é a média do que ela cobrou nos últimos 30 dias. |
| `prova_check_menor` | É o menor preço desta loja em {período}. |
| `prova_check_quase` | Está a {percentual} do menor preço desta loja em {período}. |
| `prova_check_sem_aumento` | A loja não aumentou o preço antes da promoção. |
| `prova_grafico_titulo` | Preço nesta loja, últimos 90 dias |
| `prova_ver_dias` | Ver preços dia a dia |
| `prova_como` | Como a gente confere |
| `como_titulo` | Como a gente confere uma promoção |
| `como_1` | Todo dia, anotamos o preço de cada produto em cada loja. |
| `como_2` | Só avisamos quando o preço está pelo menos 25% abaixo do normal da loja. Para comida que estraga, 35%. |
| `como_3` | O preço precisa ser o menor dos últimos 6 meses, ou bem perto dele. |
| `como_4` | Se a loja aumentou o preço pouco antes para depois "baixar", a gente descarta. |
| `como_5` | Se o frete come a economia, a gente descarta. |
| `como_6` | Precisamos de pelo menos 14 dias de preço de um produto para saber se ele está barato. |
| `unidade_por_100ml` | {preço} por 100 ml |
| `unidade_por_100g` | {preço} por 100 g |
| `unidade_por_un` | {preço} por unidade |
| `unidade_por_un_fralda` | {preço} cada fralda | 

Os números do texto `como_2` e `como_6` vêm da configuração do tenant (`padrao.json`), não são
fixos no texto.

## 4. Condição (faixa acima do preço)

| Tipo (`Condicao.tipo`) | Chave | Texto |
|---|---|---|
| `leve_pague` | `condicao_leve_pague` | Leve {leve}, pague {pague} — {total} levando {leve} |
| `quantidade_minima` | `condicao_quantidade` | Preço comprando {n} — {total} no total |
| `cartao_fidelidade` | `condicao_cartao` | Só com o cartão {programa} |
| `app_da_rede` | `condicao_app` | Só no app da {loja} |

Substitui `preco.ts:46` ("Preço exclusivo no app da rede") na interface [U08]; o texto interno do
motor continua servindo à auditoria.

## 5. Detalhe da oferta

| Chave | Texto |
|---|---|
| `detalhe_ver_loja` | Ver na {loja} |
| `detalhe_ver_loja_descricao` | Abre o site da {loja} |
| `detalhe_conferido` | Conferido às {hora}. O preço e o estoque podem mudar na loja. |
| `detalhe_conferido_ontem` | Conferido ontem às {hora}. O preço e o estoque podem mudar na loja. |
| `detalhe_embalagem` | Embalagem: {quantidade} |
| `detalhe_afiliado` | O economae pode ganhar uma comissão se você comprar por este link. Isso não muda o preço nem a escolha das ofertas. |
| `detalhe_encerrada_titulo` | Esta oferta acabou |
| `detalhe_encerrada_texto` | Acabou em {data} às {hora}. O preço voltou para {preço}. |
| `detalhe_encerrada_acao` | Ver ofertas de hoje |
| `detalhe_mudou` | O preço mudou para {preço} às {hora}. |
| `detalhe_compartilhar` | Compartilhar |
| `detalhe_voltar` | Voltar |
| `retorno_titulo` | O preço na loja bateu? |
| `retorno_sim` | Sim |
| `retorno_nao` | Não |
| `retorno_nao_comprei` | Não comprei |
| `retorno_obrigado` | Obrigado. Isso ajuda a conferir as próximas. |
| `remedio_advertencia` | SE PERSISTIREM OS SINTOMAS, O MÉDICO DEVERÁ SER CONSULTADO. |
| `remedio_secao` | Remédios sem receita |
| `remedio_secao_texto` | Lista de preços. Remédio não recebe aviso. |

## 6. Ofertas (feed) e seus estados

| Chave | Texto A (recomendada) | Texto B |
|---|---|---|
| `ofertas_titulo` | Ofertas | — |
| `ofertas_cep` | CEP {cep} | — |
| `ofertas_resumo` | Hoje conferimos {n} preços nas suas categorias. {m} passaram no teste. | — |
| `ofertas_resumo_um` | Hoje conferimos {n} preços nas suas categorias. 1 passou no teste. | — |
| `secao_excepcionais` | Excepcionais | — |
| `secao_excepcionais_texto` | Menor preço dos últimos meses. Estas a gente avisa. | — |
| `secao_boas` | Boas ofertas | — |
| `secao_boas_texto` | Também conferidas, mas não tão fortes para avisar. | — |
| `etiqueta_excepcional` | Excepcional | — |
| `anuncio_rotulo` | Anúncio | — |
| `anuncio_descricao` | Anúncio pago. Não passou pela nossa conferência. | — |
| `vazio_hoje_titulo` | Nada passou no teste hoje | Hoje não tem promoção de verdade |
| `vazio_hoje_texto` | Conferimos {n} preços nas suas categorias. Nenhum era o menor dos últimos meses. Quando for, a gente avisa. | Olhamos {n} preços hoje e nenhum estava baixo de verdade. Melhor não avisar do que avisar à toa. |
| `medindo_titulo` | Começando a medir | — |
| `medindo_texto` | Para saber se um preço está baixo de verdade, precisamos de pelo menos {total} dias de preço de cada produto. Faltam {faltam} dias. | — |
| `medindo_progresso` | {feitos} de {total} dias | — |
| `sem_categoria_titulo` | Você não segue nenhuma categoria | — |
| `sem_categoria_acao` | Escolher categorias | — |
| `sem_cep_titulo` | Falta o seu CEP | — |
| `erro_titulo` | Não deu para carregar as ofertas | — |
| `erro_texto` | Pode ser a internet. Tente de novo em instantes. | — |
| `erro_acao` | Tentar de novo | — |
| `salvas_desde` | Mostrando as ofertas das {hora} | — |
| `offline_faixa` | Sem internet. Mostrando as ofertas das {hora}. | — |
| `avisos_desligados_faixa` | Os avisos estão desligados. Você só vê as ofertas abrindo o app. | — |
| `avisos_desligados_acao` | Ligar avisos | — |
| `avisos_desligados_sistema` | Toque em Notificações e ative. | — |
| `carregando_descricao` | Carregando ofertas | — |

## 7. Categorias (rótulos de exibição)

| Chave interna (`padrao.json`) | Rótulo | Exemplo abaixo do rótulo |
|---|---|---|
| `mercearia` | Mercearia | Arroz, café, óleo |
| `pereciveis` | Frios e hortifrúti | Queijo, frutas, carne |
| `higiene_intima` | Higiene íntima | Absorvente, sabonete íntimo |
| `maquiagem` | Maquiagem | Base, batom, rímel |
| `higiene_bebe` | Bebê | Fralda, lenço, pomada |
| `limpeza` | Limpeza | Sabão, detergente, desinfetante |
| `cuidados_pessoais` | Cuidados pessoais | Protetor solar, shampoo, hidratante |
| `medicamentos_isentos` | Remédios sem receita | Analgésico, antiácido (sem aviso) |

## 8. Avisos (histórico)

| Chave | Texto |
|---|---|
| `avisos_titulo` | Avisos |
| `avisos_hoje` | Hoje |
| `avisos_ontem` | Ontem |
| `avisos_ativa` | Ativa |
| `avisos_encerrada` | Encerrada |
| `avisos_vazio_titulo` | Nenhum aviso ainda |
| `avisos_vazio_texto` | Quando algo excepcional aparecer, fica guardado aqui. |
| `avisos_erro` | Não deu para carregar seus avisos. |

## 9. Ajustes

| Chave | Texto |
|---|---|
| `ajustes_titulo` | Ajustes |
| `ajustes_categorias` | Categorias que você segue |
| `ajustes_cep` | Seu CEP |
| `ajustes_cep_adicionar` | Adicionar outro CEP |
| `ajustes_avisos` | Avisos |
| `ajustes_limite` | Máximo de avisos por dia |
| `ajustes_limite_opcao` | {n} por dia |
| `ajustes_limite_sem` | Sem limite |
| `ajustes_silencio` | Não avisar entre |
| `ajustes_silencio_valor` | {início} e {fim} |
| `ajustes_silencio_texto` | Avisos desse horário chegam às {fim}, os melhores primeiro. |
| `ajustes_sistema` | Avisos no celular |
| `ajustes_sistema_ligado` | Ligados |
| `ajustes_sistema_desligado` | Desligados. Toque para ligar. |
| `ajustes_conta` | Conta |
| `ajustes_sem_conta` | Suas escolhas ficam só neste celular. Entre para não perder se trocar de aparelho. |
| `ajustes_entrar` | Entrar com Google |
| `ajustes_entrar_email` | Entrar com e-mail |
| `ajustes_premium` | Premium |
| `ajustes_como` | Como a gente confere |
| `ajustes_termos` | Termos de uso |
| `ajustes_privacidade` | Privacidade |
| `ajustes_apagar` | Apagar meus dados |
| `apagar_titulo` | Apagar seus dados? |
| `apagar_texto` | Vamos apagar suas categorias, seus CEPs, seus avisos e sua conta, se tiver. Isso não pode ser desfeito. |
| `apagar_confirmar` | Apagar |
| `apagar_cancelar` | Cancelar |
| `apagado` | Seus dados foram apagados. |
| `salvar_erro` | Não deu para salvar. Deixamos como estava. |

## 10. Premium (segundo CEP)

| Chave | Texto |
|---|---|
| `premium_titulo` | Acompanhe até 3 CEPs |
| `premium_texto` | Para quem compra para casa, para o trabalho ou para a família em outro endereço. |
| `premium_preco` | {preço} por {período} |
| `premium_renovacao` | Renova sozinho. Cancele quando quiser na Google Play. |
| `premium_acao` | Assinar por {preço} |
| `premium_ativo` | Premium ativo até {data} |
| `premium_pendente` | Pagamento em análise pela Google Play |
| `premium_expirado` | Seu premium acabou. Seu primeiro CEP continua valendo. |

O preço **sempre** vem da Google Play Billing (formatado por ela). Nunca fixo no texto [S-11].

## 11. Acessibilidade (descrições lidas pelo leitor de tela)

| Chave | Texto |
|---|---|
| `a11y_cartao` | {condição}. {produto}, na {loja}. {preço}. Preço normal nesta loja: {normal}. Economia de {economia}. {selo}. {cobertura}. Conferido às {hora}. |
| `a11y_cartao_excepcional` | Excepcional. {a11y_cartao} |
| `a11y_anuncio` | Anúncio. {texto} |
| `a11y_categoria_selecionada` | {categoria}, selecionada |
| `a11y_categoria_nao_selecionada` | {categoria}, não selecionada |
| `a11y_abrir_loja` | Ver na {loja}. Abre fora do app. |
| `a11y_voltar` | Voltar |
| `a11y_cep_trocar` | CEP {cep}. Toque para trocar. |

## 12. Versão 2 (2026-09-30): textos novos das fases 3 e 4

Estes textos estão no protótipo. O `strings.xml` do módulo `android/` desta branch ainda é o da versão 1; o app real (branch `claude/awesome-noether-jruv6b`) tem os seus.

| Onde | Texto |
|---|---|
| Boas-vindas, texto | De fralda a papinha, da gestação aos primeiros anos. Comparamos com o preço que a própria loja cobrou nos últimos meses. Se não for o menor, a gente não avisa. |
| Entrar, título | Entre para receber os avisos |
| Entrar, texto | Mandamos um código de 6 números para o seu e-mail. Não tem senha. |
| Entrar, campo | Seu e-mail |
| Entrar, erro | Confira o e-mail. Falta o final, como .com ou .com.br. |
| Entrar, botões | Receber código por e-mail · Entrar com Google |
| Entrar, cota do dia | Não conseguimos mandar o e-mail agora. Entre com Google, ou tente de novo daqui a algumas horas. |
| Código, título | Confira seu e-mail |
| Código, texto | Enviamos um código de 6 números para {e-mail}. Ele vale por 10 minutos. |
| Código, erros | Código errado. Você ainda tem {n} tentativas. · Este código venceu. Peça outro. |
| Código, ajuda | Não chegou? Veja a caixa de spam ou promoções. |
| Código, botões | Entrar · Enviar outro código · Usar outro e-mail |
| Termos, título | Antes de começar · (versão nova) Os termos mudaram |
| Termos, resumo | Mostramos promoções de lojas parceiras. Não vendemos nada: preço, estoque e entrega são da loja. · Quando você compra por um link nosso, podemos receber comissão. O preço para você é o mesmo. · Pedimos só e-mail e CEP. Nunca endereço, localização ou dados do bebê. |
| Termos, versão nova | Leia a versão nova e aceite de novo para continuar. Suas escolhas continuam salvas. |
| Termos, aceite | Tenho 18 anos ou mais e aceito os termos de uso. |
| Termos, botão | Marque para continuar (desabilitado) · Continuar |
| Categorias (rótulos do tenant) | Fraldas e lenços · Higiene e cuidados do bebê · Alimentação infantil · Gestação e pós-parto |
| Filtro do feed (curto) | Fraldas · Higiene · Alimentação · Gestação |
| Nota, alimentação infantil | Fórmula infantil, mamadeira, bico e chupeta não aparecem: a lei proíbe promoção desses produtos (NBCAL). |
| Nota, gestação | Esta escolha fica só na sua conta. Com o celular bloqueado, o aviso não mostra o produto. |
| Tamanho, título | Qual tamanho de fralda? |
| Tamanho, texto | Opcional. Marque um ou dois, se estiver trocando. Sem escolha, chegam promoções de todos os tamanhos. |
| Tamanho, apoio | Lenço e fralda sem tamanho no anúncio aparecem sempre. |
| Tamanho, botão | Continuar · Continuar com todos os tamanhos |
| Etiqueta | Tamanho {G} |
| Aviso da NBCAL (fixo, `economae.json › nbcal.aviso`) | O Ministério da Saúde informa: o aleitamento materno evita infecções e alergias e é recomendado até os 2 (dois) anos de idade ou mais. |
| Notificação N9, versão pública | Nova oferta excepcional · Desbloqueie o celular para ver |
| Feed, filtro vazio | Nada nesta categoria hoje · Quando o preço cair de verdade, a gente avisa. |
| Detalhe, 404 | Esta oferta não existe mais · A loja tirou o produto do ar. Veja as ofertas de hoje. |
| Ajustes, conta | Entrou com e-mail. A sessão dura 90 dias sem uso. · Sair · Os avisos param neste celular. |
| Ajustes, limite | {n} por dia · 3 por dia (padrão), com opções 1, 3, 5, 10 |
| Excluir conta | Excluir a conta? · Apagamos seu e-mail, CEPs, preferências e histórico de avisos. Não tem volta. · Cancelar · Excluir |
| Premium | Para quem compra para casa, para a casa da avó ou para a creche. |

