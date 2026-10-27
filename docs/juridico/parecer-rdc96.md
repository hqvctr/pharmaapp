> **Status (2026-10-27).** Minuta técnica recebida do consultor e colada pelo responsável, sem edição.
> Não é parecer de advogado. **Nenhuma regra abaixo está aprovada**: as recomendações dependem da decisão
> do responsável (DECISIONS 57) e da revisão por advogado inscrito na OAB. O prompt que gerou esta
> resposta está em [PROMPT_RDC96.md](PROMPT_RDC96.md). Fontes secundárias e normas "não relidas" estão
> marcadas pelo próprio consultor; a equipe não conferiu o DOU.

# Parecer técnico: RDC 96/2008 e medicamento isento de prescrição no app economae

Consulta de 27/10/2026. **Minuta técnica, não é parecer de advogado.** Orienta a equipe de produto. A
revisão por advogado inscrito na OAB é **indispensável** antes de publicar o app e nos pontos marcados
**[revisão OAB]**.

**Normas e documentos que consegui abrir (versão lida):**
- RDC Anvisa 96, de 17/12/2008, texto do Saúde Legis (bvsms.saude.gov.br). Esse texto **não incorpora**
  as alterações da RDC 23/2009, que li à parte.
- RDC Anvisa 23, de 20/05/2009 (Anvisalegis). Altera os arts. 3º, 9º, 12, 13, 15, 17, 22, 25, 26, 31,
  33, 41 e 47 da RDC 96. Não muda os arts. 18, 23 e 24.
- "Perguntas e Respostas — RDC 96/2008 e IN 05/2009", publicação da Anvisa (PDF hospedado pelo CRF-MT;
  data da edição não confirmada). É orientação da agência, não norma.
- RDC Anvisa 44, de 17/08/2009 (boas práticas farmacêuticas), arts. 52 a 54, PDF do Saúde Legis.
- Notícia oficial do STJ sobre o REsp 2.035.645 (Primeira Turma, rel. min. Regina Helena Costa,
  acórdão publicado em 15/08/2024, segundo a notícia de 26/08/2024).
- Lei 15.357/2026 e a atuação da Anvisa em 2026: **só fontes secundárias** (artigo do escritório BMA,
  imprensa). Não abri o DOU.

**Não abri (citadas de memória, marcadas "não relida"):** Leis 5.991/1973, 6.360/1976, 6.437/1977,
9.294/1996, 10.742/2003, 13.021/2014, 13.709/2018 (LGPD) e 8.078/1990 (CDC), resoluções da CMED e
Código do CONAR. O site do Planalto recusa acesso automatizado deste ambiente.

---

## Resumo em dez linhas

1. Para a RDC 96/2008, o app é "empresa" que faz propaganda de medicamento. A definição de EMPRESA
   inclui quem exerce a "divulgação de medicamentos", e a norma alcança "quaisquer que sejam as formas
   e meios". Feed, push, avisos, página e compartilhamento são divulgação.
2. A RDC 96 tem dois regimes. **Lista de preços** (art. 18): seis dados e nenhum argumento
   publicitário, sem advertência. **Divulgação com argumento publicitário** (percentual, destaque,
   seleção, push): os seis dados, mais a advertência por substância (art. 23 ou art. 17) e a frase "SE
   PERSISTIREM OS SINTOMAS..." (art. 22, VII). Na internet, a advertência fica num quadro permanente
   que ocupa 20% do espaço.
3. O maior risco não é a RDC 96, e sim a **RDC 44/2009, art. 53, § 2º**: "É vedada a oferta de
   medicamentos na internet em sítio eletrônico que não pertença a farmácias ou drogarias autorizadas".
   A Lei 15.357/2026 e o processo aberto pela Anvisa em agosto de 2026 deixam esse ponto em transição.
4. **Decisão 1:** o isento só aparece com percentual se a tela mostrar o "preço integral praticado"
   pela loja antes do desconto (art. 11, § 4º), os seis dados da CMED e a advertência no quadro de 20%.
   Sem esses elementos, ele vira lista de preço, sem percentual e sem destaque.
5. **Decisão 2:** nenhum push nomeia medicamento. A notificação do sistema não cumpre o quadro de 20%,
   e na tela de bloqueio ela expõe um dado de saúde. A central de avisos dentro do app pode ser usada,
   com a advertência.
6. **Decisão 3:** medicamento de prescrição e de controle especial continuam bloqueados em tudo. O
   bloqueio por quantidade está certo (é a leitura da própria Anvisa), mas é insuficiente: precisa
   cobrir "2ª unidade", brinde, "compre e ganhe" e pontos.
7. Seguir medicamento e pesquisar medicamento geram dado sensível de saúde (LGPD, art. 11). Isso exige
   consentimento específico, e o dado não vai para anúncios nem para o link de afiliado.
8. Há um ponto aberto: a RDC 96 exige "as indicações" (art. 22, V) na propaganda de isento, e o app
   não as mostra. A orientação da Anvisa sobre preço com argumento publicitário não as cita.
   **[revisão OAB]**
9. O STJ declarou ilegais partes da RDC 96 (REsp 2.035.645), com efeito provável só entre as partes.
   A RDC continua vigente e em revisão pela Anvisa.
10. Lomadee não envia GTIN, e por isso hoje quase nenhum isento passa pela triagem. Medicamento sem
    GTIN fora da categoria "medicamentos" pode escapar sem advertência: é preciso uma trava pelo nome da
    substância.

---

## Respostas

### 1. O app faz propaganda, publicidade ou promoção de medicamento?

**Resposta curta.** Sim, em todos os recursos que mostram medicamento com preço e link comissionado. A
intensidade muda: (a), (c), (d), (f), (g), (h) e (i) são propaganda; (b) e (e), sem destaque, podem ser
enquadrados como lista de preços.

**Fundamento.**
- RDC 96/2008, Regulamento, art. 1º: aplica-se "à propaganda, publicidade, informação e outras práticas
  cujo objetivo seja a divulgação ou promoção comercial de medicamentos [...] quaisquer que sejam as
  formas e meios de sua veiculação".
- RDC 96, art. 2º: EMPRESA é a "pessoa jurídica [...] que exerça como atividade principal ou
  subsidiária a produção, manipulação, comércio, fornecimento, distribuição e divulgação de
  medicamentos". Propaganda/publicidade é o conjunto de técnicas de "informação e persuasão" para
  divulgar e induzir à "aquisição e utilização".
- RDC 96, art. 4º: veda a propaganda "indireta".

| Recurso | Enquadramento | Por quê |
|---|---|---|
| (a) feed com percentual | propaganda | seleção editorial, destaque e percentual são argumento publicitário |
| (b) lista de preços sem percentual nem destaque | lista de preços (art. 18) | é o caso que a própria norma prevê, desde que sem argumento publicitário (art. 47, na redação da RDC 23/2009) |
| (c) push | propaganda | comunicação ativa, não pedida no momento, para induzir a compra |
| (d) central de avisos | propaganda | mesmo conteúdo do push, dentro do app |
| (e) pesquisa, página e histórico | lista de preços, se neutros; propaganda, se houver destaque ("menor preço em 180 dias") | depende da apresentação |
| (f) produto seguido com aviso de queda | propaganda | aviso de desconto; o pedido prévio não tira o caráter persuasivo |
| (g) compartilhamento | propaganda do app | o texto, o preço e o link de afiliado são montados pelo app |
| (h) oferta manual de encarte | propaganda do app | o operador age pelo app; reproduzir o encarte não transfere a responsabilidade |
| (i) anúncio de terceiros | propaganda do anunciante, veiculada pelo app | o app é o meio; ver pergunta 11 |

**Grau de certeza.** Alto para (a), (c), (d), (f) e (g); médio para (b) e (e).

**Leitura contrária.** O app seria um comparador de preços neutro, como um jornal que publica uma
pesquisa de preços. A comissão por venda e a curadoria de descontos enfraquecem muito essa leitura.

**Regra para o app.** Toda tela, texto ou notificação que mostre medicamento com preço segue um de dois
modos:
- `lista`: só os seis dados do art. 18 e o preço, sem percentual, selo, cor de destaque, ordenação por
  desconto ou imagem promocional;
- `propaganda`: os seis dados, a advertência e o preço integral (perguntas 3 e 5).

Não há terceiro modo.

**Pendente.** **[revisão OAB]** do enquadramento de (b) e (e) como lista de preços.

---

### 2. Existe regime próprio para lista de preços?

**Resposta curta.** Sim. A lista de preços, sem argumento publicitário, exige só seis dados e dispensa
advertências e indicações. Ela alcança qualquer divulgador, não só a farmácia, mas não afasta o risco
da RDC 44/2009 (pergunta 9).

**Fundamento.**
- RDC 96, art. 18: "Os preços dos medicamentos, quando informados ao público em geral, devem ser
  indicados por meio de listas nas quais devem constar somente o nome comercial do produto; a
  substância ativa, segundo a DCB/DCI; a apresentação, incluindo a concentração, forma farmacêutica e a
  quantidade; o número de registro na Agência Nacional de Vigilância Sanitária; o nome do detentor do
  registro; e o preço dos medicamentos listados."
- Art. 18, parágrafo único: para isentos, "ficam permitidas outras formas de comunicação, que não sejam
  as listas, desde que incluam as demais informações exigidas por este Regulamento".
- Art. 47, na redação da RDC 23/2009: os materiais do art. 18 "não poderão utilizar designações,
  símbolos, figuras, imagens, desenhos, marcas figurativas ou mistas, slogans" nem argumentos
  publicitários.
- Perguntas e Respostas da Anvisa: "Somente nos casos de lista de preços que não apresentam quaisquer
  argumentos de cunho publicitário é que algumas informações ficam dispensadas". No isento, ficam
  dispensadas as indicações, as advertências dos arts. 17 e 23 e a frase "SE PERSISTIREM...".

**Grau de certeza.** Alto quanto ao regime; médio quanto à aplicação ao app.

**Leitura contrária.** O art. 18 teria sido pensado para a farmácia, que vende o produto. Mas o texto
diz "quando informados ao público em geral", sem limitar quem informa.

**Regra para o app.** No modo `lista`, cada item mostra exatamente: nome comercial, substância (DCB),
apresentação, registro na Anvisa, detentor do registro e preço. Os cinco primeiros vêm da lista da CMED
pelo GTIN. Não pode haver percentual, selo, ícone, cor de destaque, imagem da embalagem nem frase de
venda. O link para a loja pode existir, com texto neutro ("Ver na loja X").

**Pendente.** Nenhum, além do risco da pergunta 9.

---

### 3. Desconto, percentual de queda e preço de referência

**Resposta curta.** Divulgar desconto de isento é permitido, mas quem informa o percentual precisa
informar também o "preço integral praticado" pela farmácia. A mediana de 30 dias calculada pelo app,
apresentada como "preço normal", não cumpre isso com segurança.

**Fundamento.**
- RDC 96, art. 11, § 4º: "Quando informado um valor porcentual do desconto e/ou o preço promocional do
  medicamento, o preço integral praticado pela farmácia ou drogaria também deve ser informado."
  Exemplo da Anvisa: "Medicamento x, de R$ YY,YY (preço sem o desconto) por R$ ZZ,ZZ (preço
  promocional)".
- Art. 11, caput: a comparação de preços para o consumidor só pode ser feita entre medicamentos
  "intercambiáveis" (Lei 9.787/1999). Art. 15: comparações entre medicamentos exigem estudos.
- CMED (Lei 10.742/2003, não relida): fixa o preço máximo ao consumidor (PMC). A farmácia pode vender
  abaixo do PMC, e a RDC 96 só exige citar o PMC em peça dirigida a profissional (art. 20). Não
  encontrei regra da CMED que proíba o desconto ou obrigue um divulgador a mostrar o PMC (resoluções da
  CMED **não lidas**).
- CDC, art. 37, § 1º (não relido): "preço normal" que não corresponda a um preço praticado é
  publicidade enganosa.

**Grau de certeza.** Alto quanto à exigência do preço integral; médio quanto à aceitação de outra
referência.

**Leitura contrária.** A mediana dos preços que a própria loja praticou nos últimos 30 dias seria um
"preço praticado" e serviria como preço integral. É defensável, se o rótulo for exato, mas a norma pensa
no preço imediatamente anterior ao desconto.

**Mais segura × mais provável.** Mais segura: "de" igual ao último preço praticado pela loja antes da
queda atual, com o percentual calculado sobre ele. Mais provável de ser aceita: a mediana rotulada como
"mediana desta loja em 30 dias". Recomendo a mais segura no destaque e a mediana como informação
secundária.

**Regra para o app.**
- Para medicamento, o percentual em destaque é `(preço_anterior − preço_atual) / preço_anterior`, onde
  `preço_anterior` é o último preço diferente do atual observado na mesma loja nos 30 dias anteriores.
  A tela mostra "de R$ [preço_anterior] por R$ [preço_atual]".
- A mediana de 30 dias pode aparecer abaixo, com o rótulo literal "mediana desta loja nos últimos 30
  dias". Nunca usar "preço normal" para medicamento.
- Sem `preço_anterior`, a oferta não vai para o feed: só aparece no modo `lista`.
- Nunca comparar preço entre medicamentos diferentes (outro registro ou outra substância). Histórico e
  comparação só dentro do mesmo registro na Anvisa.

**Pendente.** Ler as resoluções da CMED sobre desconto e programas de benefício (ver art. 46).
**[revisão OAB]** sobre o uso da mediana.

---

### 4. Promoção por quantidade, brindes, sorteios e venda casada

**Resposta curta.** A RDC 96 não escreve "leve X pague Y", mas a Anvisa entende que esse tipo de
promoção é vedado, com base no art. 8º, I. Brinde ao público e uso de medicamento em programa de pontos
ou sorteio são vedados expressamente. O bloqueio atual está certo, mas é insuficiente.

**Fundamento.**
- RDC 96, art. 8º, I: veda "estimular e/ou induzir o uso indiscriminado de medicamentos".
- Perguntas e Respostas da Anvisa: "Anunciar promoções como 'leve 3 pague 2' para medicamentos é
  permitido? Não. [...] o usuário é induzido a adquirir medicamentos em quantidades superiores àquelas
  necessárias" (ref. art. 8º, I).
- Art. 5º: as empresas não podem "outorgar, oferecer, prometer ou distribuir brindes, benefícios e
  vantagens [...] ao público em geral".
- Art. 10: programas de fidelização "não podem ter medicamentos como objeto de pontuação, troca,
  sorteios ou prêmios".
- Art. 46: redução de preço condicionada a "cupons, cartões" ou a dados que identifiquem o paciente
  "fica sob regulamentação da Câmara de Regulação de Medicamentos" (CMED).
- CDC, art. 39, I (não relido): veda a venda casada.

**Grau de certeza.** Alto quanto a "leve X pague Y" e similares (é a posição publicada da Anvisa);
médio quanto ao preço com cartão ou cadastro (depende da CMED).

**Leitura contrária.** A norma não proíbe literalmente a promoção por quantidade, e o STJ já declarou
ilegais restrições da RDC 96 sem base em lei (pergunta 13). Para o app, não vale correr esse risco.

**Regra para o app.** Medicamento é descartado se:
- a condição for `leve_pague` ou `quantidade_minima`; ou
- o título, a descrição ou o rótulo da condição contiverem: "leve", "pague", "2ª unidade", "segunda
  unidade", "a partir de", "unidades por", "compre e ganhe", "ganhe", "brinde", "grátis", "sorteio",
  "pontos", "cashback", "kit" com mais de uma unidade do mesmo medicamento, ou "na compra de".

Condição `cartao_fidelidade` ou `app_da_rede`: permitida, com o rótulo da condição sempre visível.

**Pendente.** Resolução da CMED sobre desconto condicionado a cartão ou cadastro (art. 46), **não
confirmada**. **[revisão OAB]** sobre o preço com CPF ou cartão.

---

### 5. Advertências

**Resposta curta.** Na divulgação com argumento publicitário, o isento exige: a advertência da
substância (Anexo III) ou, na falta dela, a advertência padrão (art. 23), ou ainda a de sedação
(art. 17), que substitui a do art. 23; a frase "SE PERSISTIREM OS SINTOMAS, O MÉDICO DEVERÁ SER
CONSULTADO" (art. 22, VII); e, no genérico, a frase do art. 16. Na lista de preços pura, nenhuma
advertência é exigida.

**Fundamento.** Arts. 16, 17, 22, VII, 23, 24 e Anexo III da RDC 96 (textos literais na seção "Textos
obrigatórios").

**(a) Valem para um app que só informa preço?** No modo `lista`, não (dispensa confirmada pela Anvisa).
No modo `propaganda` (feed, avisos), sim.

**(b) Forma.**
- Art. 6º: cores que contrastem com o fundo, no sentido predominante de leitura, com imediata
  visualização.
- Art. 24, caput (impresso): "no mínimo, 35% do tamanho da maior fonte utilizada".
- Art. 24, III (internet): "exibida permanentemente e de forma visível, inserida em retângulo de fundo
  branco, emoldurada por filete interno, em letras de cor preta, padrão Humanist 777 Bold ou Frutiger
  55 Bold, caixa alta, respeitando a proporção de dois décimos do total do espaço da propaganda".
- O app é "internet": vale o inciso III. Por cautela, aplicar também o mínimo de 35% da maior fonte.

**(c) Push e central.** Valem para os dois. O push não comporta o quadro, a fonte nem a permanência,
então não pode nomear medicamento (pergunta 6). A central de avisos comporta e deve mostrar a
advertência.

**(d) Inaplicáveis.**
- Medicamento sem nome comercial (genérico): a advertência padrão usa a substância ativa no lugar do
  nome.
- Associação que não está no Anexo III: usa a padrão. É o exemplo da própria Anvisa (orfenadrina,
  dipirona e cafeína).
- O art. 22, V ("as indicações") não tem como ser cumprido pelo app sem dar indicação de uso: ver
  "Leitura contrária".

**É "orientação de uso"?** Não. É texto legal obrigatório, fixo, reproduzido sem adaptação. Não ensina
dose nem uso e não fere a regra de produto de não orientar. A política do app deve dizer: "o app só
reproduz advertências legais obrigatórias".

**Grau de certeza.** Alto quanto aos textos e à forma na internet. Médio quanto à exigência das
indicações.

**Leitura contrária.** A propaganda de isento exige também as indicações (art. 22, V). Se essa leitura
prevalecer, o feed com percentual exigiria indicação, o que o app não faz, e o isento só poderia
aparecer como lista. A orientação da Anvisa para preço com argumento publicitário pede os seis dados e a
advertência da substância, sem citar indicações.

**Mais segura × mais provável.** Mais provável: feed com seis dados, advertências e preço integral.
Mais segura: só lista. **[revisão OAB]** decide. O software deve ter as duas opções por configuração
(RF-1).

**Regra para o app.**
- No modo `propaganda`, cada cartão de medicamento tem um quadro de advertência: fundo branco, filete
  interno preto, letras pretas, caixa alta, fonte Humanist 777 Bold ou Frutiger 55 Bold, área ≥ 20% da
  área do cartão, sempre visível (nunca recolhido, cortado ou rolado para fora do cartão).
- Conteúdo do quadro, nesta ordem: advertência do art. 17, ou do Anexo III, ou padrão do art. 23; a
  frase do art. 22, VII; a frase do art. 16, se for genérico.
- **Licenciar a fonte** Humanist 777 ou Frutiger 55 para uso embarcado no app.

**Pendente.** **[revisão OAB]** sobre as indicações. Um farmacêutico deve listar quais isentos têm
sedação ou sonolência na bula (art. 17), porque a CMED não informa isso.

---

### 6. Push, central de avisos e produto seguido

**Resposta curta.** Push que nomeie medicamento: não. Central de avisos e aviso de produto seguido:
sim, com a advertência. Push genérico, sem nome, preço nem categoria: sim. O aviso de "volta ao
estoque" segue a mesma regra.

**Fundamento.**
- Art. 24, III: a advertência deve ser exibida "permanentemente", em quadro com 20% do espaço. A
  notificação do sistema não tem quadro nem fonte controlada e é truncada.
- Art. 8º, I: estímulo ao uso indiscriminado.
- LGPD, art. 5º, II, e art. 11: o nome do medicamento na tela de bloqueio expõe dado de saúde a
  terceiros (pergunta 12).
- "Volta ao estoque" não cita desconto, mas continua sendo divulgação para induzir a compra (art. 1º).

**Grau de certeza.** Médio-alto.

**Leitura contrária.** Um push só com o nome e o preço, sem percentual, seria "lista de preços" e
dispensaria a advertência. Mas o push é seleção ativa e enviada: tem natureza de argumento publicitário.

**Regra para o app.**
- Push nunca contém nome comercial, substância, marca, preço, percentual nem categoria de medicamento.
- Se o único aviso novo for de medicamento, o push só pode ter o texto fixo "Você tem novos avisos no
  economae". Mais seguro: não mandar push nenhum nesse caso.
- Central de avisos: o aviso de medicamento (queda, volta ao estoque, menor preço) usa o modo
  `propaganda`, com seis dados e quadro de advertência. Sem `preço_anterior`, o aviso de queda não é
  gerado; o de volta ao estoque usa o modo `lista`.
- Seguir medicamento só com o consentimento da pergunta 12.

**Pendente.** **[revisão OAB]** sobre o push genérico. Até lá, manter o comportamento de hoje (nenhum
aviso na central, nenhum seguir), por configuração.

---

### 7. Pesquisa e página do produto

**Resposta curta.** Sim, no modo `lista`: preço atual por loja, com os seis dados, sem destaque. O
histórico de 180 dias é permitido como gráfico neutro. Se a página destacar "menor preço em 180 dias" ou
mostrar percentual, vira propaganda e exige a advertência.

**Fundamento.** RDC 96, arts. 18 e 47 (lista sem argumento publicitário); art. 11, § 4º (percentual
exige preço integral).

**Grau de certeza.** Médio.

**Leitura contrária.** Para a autoridade, o app inteiro tem finalidade promocional (link comissionado,
foco em desconto), e nenhuma tela dele seria "lista neutra". Nesse caso, toda tela precisaria da
advertência. O custo de mostrar a advertência também na página é baixo.

**Mais segura × mais provável.** Mais segura: página e pesquisa sempre no modo `propaganda`, com
advertência, mesmo sem percentual. Mais provável: o modo `lista` basta. Recomendo a mais segura na
página (que tem botão de compra) e o modo `lista` no resultado da pesquisa.

**Regra para o app.**
- Pesquisa: item de medicamento no modo `lista`. Ordenação por relevância ou por preço é permitida;
  ordenação por percentual de desconto, não.
- Página do produto: seis dados, preço por loja, histórico em gráfico sem selo nem frase, e o quadro de
  advertência.
- Mínimo e máximo do período: permitidos como números.

**Pendente.** Liberar a pesquisa e a página (hoje fechadas) só depois da **[revisão OAB]** da
pergunta 9.

---

### 8. Medicamento de venda sob prescrição e de controle especial

**Resposta curta.** Prescrição: a RDC 96 admitiria lista de preços neutra, mas o somatório da RDC 96 e
da RDC 44/2009 recomenda bloquear em tudo, como já se faz. Controle especial: bloquear em tudo, sem
dúvida.

**Fundamento.**
- RDC 96, art. 27: a propaganda de medicamento sob prescrição "fica restrita aos meios de comunicação
  destinados exclusivamente aos profissionais de saúde".
- Art. 18: a lista de preços vale para todo medicamento.
- Art. 32: medicamento sob controle especial, "com notificação de receita ou retenção de receita", só
  em "revistas de conteúdo exclusivamente técnico".
- RDC 44/2009, art. 52, § 2º: "É vedada a comercialização de medicamentos sujeitos a controle especial
  solicitados por meio remoto". Art. 54: no site da própria farmácia, o medicamento sob prescrição só
  aparece em lista, sem imagem nem propaganda.

**Grau de certeza.** Alto para controle especial; médio-alto para prescrição.

**Leitura contrária.** A lista neutra de preço de medicamento sob prescrição seria lícita pelo art. 18
e útil ao consumidor. Mas o app curado, com comissão, dificilmente seria visto como lista neutra, e a
RDC 44, art. 53, § 2º, pesa contra.

**Regra para o app.** Manter o bloqueio em tudo:
- prescrição, pela CMED;
- substância da Portaria SVS/MS 344/1998;
- retenção de receita (antimicrobianos incluídos);
- termos de venda controlada.

Isso vale para feed, pesquisa, página, seguir, avisos, push, compartilhamento, oferta manual e anúncios.

**Pendente.** Nenhum para manter o bloqueio. Liberar a lista de preço de medicamento sob prescrição só
com consulta formal à Anvisa.

---

### 9. Venda online e intermediação

**Resposta curta.** O app não dispensa nem intermedeia a venda (não recebe pedido nem pagamento), mas
divulga a oferta e ganha comissão. O risco é a RDC 44/2009 vedar a "oferta de medicamentos na
internet" fora do site da farmácia. Nenhuma licença sanitária cabe ao app, que não é farmácia, mas o
enquadramento como "oferta" está aberto.

**Fundamento.**
- RDC 44/2009, art. 52: só farmácias e drogarias abertas ao público, com farmacêutico presente, podem
  dispensar medicamento pedido por meio remoto.
- Art. 53: "O pedido pela internet deve ser feito por meio do sítio eletrônico do estabelecimento ou da
  respectiva rede", em domínio ".com.br", com razão social, CNPJ, farmacêutico responsável, licença
  sanitária e AFE na página principal.
- Art. 53, § 2º: "É vedada a oferta de medicamentos na internet em sítio eletrônico que não pertença a
  farmácias ou drogarias autorizadas e licenciadas pelos órgãos de vigilância sanitária competentes."
- Lei 15.357, de 20/03/2026 (fonte secundária): acrescentou o § 6º ao art. 6º da Lei 5.991/1973.
  Farmácias licenciadas "poderão contratar canais digitais e plataformas de comércio eletrônico" para
  logística e entrega, cumprida a regulamentação sanitária. Não trata de divulgação por terceiros.
- Anvisa, 2026 (fontes secundárias):
  - revogou medidas preventivas contra plataformas, ressalvando que isso não autoriza a venda livre;
  - em 19/08/2026 abriu processo para regulamentar o tema;
  - em 29/09/2026 notificou um marketplace;
  - iniciou a revisão da própria RDC 96 para redes sociais, comércio eletrônico e influenciadores.
- Lei 13.021/2014 (não relida): define farmácia como unidade de assistência farmacêutica. O app não se
  enquadra e não pratica nenhum ato privativo de farmácia.

**Grau de certeza.** Médio-baixo. É o ponto de maior incerteza do parecer.

**Leitura contrária.** "Oferta", no art. 53, é a oferta de venda com pedido no próprio site (o contexto
é a "solicitação remota"). Um comparador que manda a pessoa ao site da farmácia não oferta nem vende.
Essa leitura é plausível, mas a Anvisa já agiu contra a divulgação em plataformas.

**Mais segura × mais provável.** Mais segura: medicamento fora do app até a norma nova. Mais provável:
divulgação permitida se o pedido acontece só no site da farmácia, sem nenhuma etapa de compra no app.

**Regra para o app.**
- O botão leva **só** ao site próprio da farmácia (domínio `.com.br` da rede), nunca a marketplace.
  Isso vale também para o link de afiliado.
- Loja só recebe oferta de medicamento se o cadastro tiver razão social, CNPJ, número da AFE e licença
  sanitária, conferidos por operador, com data da conferência.
- O cartão de medicamento mostra "Vendido pela [razão social], CNPJ [n]".
- Nenhuma etapa de compra, carrinho, receita ou pagamento no app.
- Flag de configuração para desligar todo medicamento num único passo (RF-1), caso a Anvisa decida
  contra.

**Pendente.** **[revisão OAB]** e, de preferência, **consulta formal à Anvisa** sobre comparador de
preços com afiliado. Acompanhar o processo aberto em 19/08/2026 e a revisão da RDC 96.

---

### 10. Medicamento infantil

**Resposta curta.** Não há regra que proíba divulgar o preço de isento pediátrico para adultos. Há
vedações de conteúdo: nada dirigido a criança e nada que sugira sabor agradável. As advertências do
Anexo III já trazem as restrições de idade.

**Fundamento.**
- RDC 96, art. 26, VII: veda "incluir mensagens, símbolos e imagens de qualquer natureza dirigidas a
  crianças ou adolescentes".
- Art. 8º, VI: veda sugerir sabor agradável ("saboroso", "gostoso", "delicioso"). Art. 9º, II: permite
  informar o sabor.
- Art. 8º, II: veda "sugerir ou estimular diagnósticos ao público em geral".
- Art. 25 (redação da RDC 23/2009): veda propaganda de medicamento na TV em intervalos de programas
  infantis. Não se aplica ao app.
- Anexo III: dipirona ("crianças menores de três meses"); cânfora, ambroxol e dropropizina ("menores
  de dois anos"); mebendazol ("menores de um ano"); carvão vegetal ("crianças com diarréia aguda").

**Grau de certeza.** Alto.

**Leitura contrária.** Nenhuma relevante.

**Regra para o app.**
- Medicamento infantil não ganha seção, ícone, cor, mascote ou emoji infantil, e não aparece misturado
  a produtos de bebê com imagem infantil.
- Imagem da embalagem de medicamento: não exibir quando o título tiver "infantil", "pediátrico",
  "kids", "bebê" ou "criança". Usar ícone neutro (a embalagem pode ter personagem infantil).
- Nenhum texto do app sugere sintoma ou diagnóstico ("seu bebê com febre?"). Categorias de medicamento
  com nome neutro ("Medicamentos isentos de prescrição"), não por sintoma.
- Sabor: só como aparece no nome registrado do produto, sem adjetivo.

**Pendente.** Nenhum.

---

### 11. Responsabilidade e risco

**Resposta curta.** Podem ser autuados:
- o app, como "empresa" divulgadora (RDC 96, art. 2º) e veículo;
- a farmácia, pela oferta e pelo preço;
- a rede de afiliados, se produzir ou distribuir a peça;
- a rede de anúncios e o anunciante, por anúncio de terceiros.

A Anvisa e as vigilâncias sanitárias aplicam a Lei 6.437/1977; Procon e Senacon, o CDC. O conselho de
farmácia alcança o farmacêutico e a farmácia, não o app. O CONAR só recomenda.

**Fundamento.**
- Lei 6.437/1977 (não relida): art. 10, V (propaganda em desacordo com a legislação sanitária; usado
  pela Anvisa junto com a Lei 6.360/1976, art. 59). Art. 2º: penas que incluem advertência, multa,
  proibição de propaganda e imposição de mensagem retificadora. Faixas de multa do art. 2º, § 1º, na
  redação da MP 2.190-34/2001 (confirmadas só em fonte secundária): leve **R$ 2.000 a R$ 75.000**,
  grave **R$ 75.000 a R$ 200.000**, gravíssima **R$ 200.000 a R$ 1.500.000**; dobra na reincidência.
- RDC 96, arts. 49 a 51: mensagem retificadora, inclusive na internet, e suspensão cautelar da
  veiculação.
- CDC, arts. 55 a 57 (não relidos): sanções do Procon e da Senacon.
- Denúncia: qualquer pessoa pode denunciar à vigilância sanitária; concorrentes e consumidores podem
  representar ao CONAR; Ministério Público e associações podem propor ação civil pública (Lei
  7.347/1985, não relida).

**Grau de certeza.** Alto quanto a órgãos e penas; médio quanto aos valores (fonte secundária).

**Leitura contrária.** A fiscalização costuma mirar fabricante e farmácia. A Anvisa, porém, já atuou
contra plataformas digitais em 2026.

**Regra para o app.** Registrar, por 5 anos, cada exibição de medicamento: modo, advertência usada,
versão da regra, data, loja e preço. Bloquear medicamento na rede de anúncios (pergunta 13). Ter uma
página pública "Como tratamos medicamentos".

**Pendente.** **[revisão OAB]** sobre o responsável legal (CNPJ) e o seguro de responsabilidade.

---

### 12. LGPD

**Resposta curta.** Sim. Seguir, pesquisar e receber aviso de um medicamento revela dado referente à
saúde da pessoa ou da família, que é dado pessoal sensível. Isso exige consentimento específico e
destacado, proíbe o uso para anúncio e restringe o compartilhamento.

**Fundamento** (LGPD não relida nesta rodada):
- art. 5º, II: dado sensível inclui "dado referente à saúde";
- art. 11, I: consentimento "de forma específica e destacada, para finalidades específicas". Execução
  de contrato não está entre as bases do art. 11;
- art. 11, § 4º (redação da Lei 13.853/2019, não relida): veda a comunicação ou o uso compartilhado de
  dados sensíveis de saúde entre controladores "com objetivo de obter vantagem econômica", salvo
  exceções que não cobrem anúncio.

**Grau de certeza.** Médio-alto.

**Leitura contrária.** A pesquisa de preço de um medicamento comum (analgésico) não revelaria condição
de saúde. Pode ser verdade caso a caso, mas o app não sabe distinguir.

**Regra para o app.**
- Primeiro "seguir" de medicamento: tela de consentimento própria, separada dos termos, revogável. Sem
  consentimento, não segue.
- Pesquisas com termo de medicamento: não gravar com o identificador da pessoa. Métricas só agregadas.
- Nenhum dado de medicamento (página vista, seguir, pesquisa, clique) vai para a rede de anúncios, para
  ferramentas de marketing ou para segmentação.
- Link de afiliado de medicamento sem identificador da pessoa (sem `subid` com id do usuário).
- Push sem nome de medicamento (pergunta 6).
- Exportação e exclusão da conta incluem esses dados.

**Pendente.** **[revisão OAB]** junto com a política de privacidade e o relatório de impacto.

---

### 13. Outros pontos

1. **Imperativos (RDC 96, art. 8º, VII).** Ficam vedados "tenha", "tome", "use", "experimente" e
   similares. No cartão de medicamento, o botão não diz "Comprar" nem "Aproveite": usar "Ver na loja".
   Copy de feed e avisos sem "corra", "não perca", "garanta".
2. **Medicamento regularizado (art. 3º).** Só medicamento com registro válido. A lista da CMED garante
   isso; produto de notificação simplificada (fora da CMED) continua bloqueado, porque o app não teria
   como preencher a frase do art. 22, IV.
3. **Propaganda indireta (art. 4º).** Nada de conteúdo editorial ou "dica" que mencione marca de
   medicamento.
4. **Lei 9.294/1996, art. 7º (não relido).** Admite anunciar ao público "os medicamentos anódinos e de
   venda livre", "com as advertências quanto ao seu abuso". É a base legal da RDC 96 para isentos.
5. **STJ, REsp 2.035.645** (Primeira Turma, acórdão publicado em 15/08/2024). Declarou ilegais
   disposições da RDC 96 que criam obrigações sem base na Lei 9.294: propaganda indireta em
   espetáculos, imagem de pessoa usando o medicamento, advertência de sedação e restrição a expressões
   em isentos. Efeito provável só entre as partes; a RDC não foi revogada. O app não deve se apoiar na
   decisão.
6. **CDC, arts. 30, 31, 36 e 37 (não relidos).** O preço exibido vincula: mostrar "preço visto às
   HH:MM". A informação deve ser correta e clara: o rótulo da mediana deve ser exato. A comissão de
   afiliado deve estar identificada.
7. **CONAR.** O Código tem anexo próprio para produtos farmacêuticos isentos de prescrição (letra do
   anexo **não confirmada**). É autorregulação: não multa, mas recomenda sustação.
8. **Anúncios de terceiros.** Bloquear na rede toda a categoria de medicamentos e farmácia. O app não
   controla a advertência da peça e responde como veículo.
9. **Triagem sem GTIN.** A Lomadee não envia GTIN (DECISIONS 32). Medicamento fora da categoria
   "medicamentos" e sem GTIN escapa da CMED, aparece como produto comum e pode gerar push. É preciso uma
   trava por nome de substância (RF-12).

---

## Tabela de tratamento no app

| Situação | Tratamento | Fundamento | Certeza |
|---|---|---|---|
| Isento adulto, com preço anterior e dados da CMED | **feed com advertência** (modo `propaganda`); sem push | RDC 96, arts. 11, § 4º, 18, 22, 23 e 24, III | média |
| Isento adulto, sem preço anterior | **lista de preço sem destaque** | RDC 96, arts. 11, § 4º, 18 e 47 | alta |
| Isento pediátrico | igual ao adulto, sem imagem da embalagem e sem elemento infantil | RDC 96, arts. 8º, VI, e 26, VII | alta |
| Isento com sedação na bula | feed com advertência do art. 17 no lugar da do art. 23 | RDC 96, art. 17 | média (art. 17 discutido no STJ) |
| Isento genérico | feed com advertência e a frase do art. 16 | RDC 96, art. 16 | alta |
| Isento de notificação simplificada (fora da CMED) | **bloqueado em tudo** | RDC 96, art. 22, IV (o app não tem os dados) | média |
| Venda sob prescrição | **bloqueado em tudo** | RDC 96, art. 27; RDC 44/2009, arts. 53, § 2º, e 54 | média-alta |
| Controle especial (Portaria 344) ou retenção de receita | **bloqueado em tudo** | RDC 96, art. 32; RDC 44/2009, art. 52, § 2º | alta |
| Promoção por quantidade ("leve X pague Y", "2ª unidade", "a partir de N") | **bloqueado em tudo** | RDC 96, art. 8º, I, e orientação da Anvisa | alta |
| Brinde, "compre e ganhe", sorteio, pontos em medicamento | **bloqueado em tudo** | RDC 96, arts. 5º e 10 | alta |
| Preço com cartão fidelidade, cadastro ou app da rede | feed com advertência e rótulo da condição | RDC 96, art. 46 (CMED) | baixa |
| Oferta de encarte cadastrada à mão | mesmas regras; exige GTIN na CMED e preço anterior informado pelo operador com prova (foto do encarte) | RDC 96, arts. 11, § 4º, e 18 | média |
| Produto seguido (aviso de queda na central) | permitido na central, com advertência e consentimento LGPD; **sem push** com nome | RDC 96, art. 24, III; LGPD, art. 11 | média |
| Aviso de volta ao estoque | central no modo `lista`; **sem push** com nome | RDC 96, art. 18; LGPD, art. 11 | média |
| Push | **só genérico** ("Você tem novos avisos no economae") ou nenhum | RDC 96, art. 24, III; LGPD | média-alta |
| Pesquisa | **lista de preço sem destaque** | RDC 96, arts. 18 e 47 | média |
| Página do produto e histórico | feed com advertência (quadro sempre presente); gráfico sem selo | RDC 96, arts. 18, 23 e 24 | média |
| Compartilhamento | **bloqueado** (sem botão) | RDC 96, art. 24, III (texto puro sem quadro) | média |
| Anúncio de terceiros de medicamento ou farmácia | **bloqueado** na rede | RDC 96, art. 1º; Lei 6.437, art. 10, V | média |
| Medicamento sem GTIN detectado pelo nome da substância | **bloqueado em tudo** até revisão humana | RDC 96, art. 3º (não dá para verificar registro) | alta |

---

## Textos obrigatórios

Exibidos em CAIXA ALTA, no quadro do art. 24, III, dentro do cartão ou página, sempre que o modo for
`propaganda` (feed, página do produto, central de avisos). Não são exibidos no modo `lista`.

**1. Frase geral (RDC 96, art. 22, VII), em todo isento:**
"SE PERSISTIREM OS SINTOMAS, O MÉDICO DEVERÁ SER CONSULTADO"

**2. Advertência padrão (art. 23, parágrafo único).** Quando a substância (ou a associação) não está
no Anexo III e não há sedação:
"(nome comercial do medicamento ou, no caso dos medicamentos genéricos, a substância ativa) É UM
MEDICAMENTO. SEU USO PODE TRAZER RISCOS. PROCURE O MÉDICO E O FARMACÊUTICO. LEIA A BULA"

**3. Sedação ou sonolência (art. 17).** Substitui a do art. 23:
"(nome comercial do medicamento ou, no caso dos medicamentos genéricos, a substância ativa) é um
medicamento. Durante seu uso, não dirija veículos ou opere máquinas, pois sua agilidade e atenção podem
estar prejudicadas."

**4. Genérico (art. 16):**
"Medicamento Genérico - Lei nº 9.787/99"

**5. Por substância (art. 23 e Anexo III).** Só quando o produto tem **uma única** substância ativa e
ela está na tabela:

| Substância | Texto |
|---|---|
| Ácido acetilsalicílico | "Não use este medicamento em caso de gravidez, gastrite ou úlcera do estômago e suspeita de dengue ou catapora." |
| Ácido ascórbico (vitamina C) | "Não use este medicamento em caso de doença grave dos rins." |
| Bicarbonato de sódio | "Não use este medicamento se você tem restrição ao consumo de sal, insuficiência dos rins, do coração ou do fígado." |
| Bisacodil | "Não use este medicamento em caso de doenças intestinais graves." |
| Cânfora | "Não use este medicamento em crianças menores de dois anos de idade." |
| Carbonato de cálcio | "Não use este medicamento em caso de doença dos rins." |
| Carvão vegetal | "Não use este medicamento em crianças com diarréia aguda e persistente." |
| Cloridrato de ambroxol | "Não use este medicamento em crianças menores de dois anos de idade." |
| Cloridrato de fenilefrina | "Não use este medicamento em caso de doenças do coração, pressão alta e glaucoma." |
| Dipirona sódica | "Não use este medicamento durante a gravidez e em crianças menores de três meses de idade." |
| Dropropizina | "Não use este medicamento em caso de tosse com secreção e em crianças menores de dois anos de idade." |
| Hidróxido de alumínio | "Não use este medicamento em caso de doença dos rins e dor abdominal aguda." |
| Hidróxido de magnésio | "Não use este medicamento em caso de doença dos rins." |
| Ibuprofeno | "Não use este medicamento em casos de úlcera, gastrite, doença dos rins ou se você já teve reação alérgica a antiinflamatórios." |
| Mebendazol | "Não use este medicamento em crianças menores de um ano de idade." |
| Naproxeno | "Não use este medicamento em casos de úlcera, gastrite, doença dos rins ou se você já teve reação alérgica a antiinflamatórios." |
| Nicotina | "Não use este medicamento se você é fumante com problemas cardíacos." |
| Paracetamol | "Não use junto com outros medicamentos que contenham paracetamol, com álcool, ou em caso de doença grave do fígado." |
| Picossulfato de sódio | "Não use este medicamento em caso de doenças intestinais graves." |
| Plantago ovata Forsk | "Não use este medicamento em caso de doenças intestinais graves." |
| Sulfato ferroso | "Não use este medicamento se você tem problemas gastrointestinais." |

Fonte: Anexo III no texto do Saúde Legis. Conferir no DOU a grafia oficial antes de publicar (o Saúde
Legis traz "Naproxeno" colado ao texto e espaçamentos irregulares).

**6. Dados obrigatórios do art. 18**, em todo modo (`lista` e `propaganda`): nome comercial; substância
ativa (DCB), com no mínimo 50% do tamanho do nome comercial no modo `propaganda` (art. 22, II; 30% com
2 a 4 substâncias, pela RDC 23/2009); apresentação (concentração, forma farmacêutica, quantidade);
número de registro na Anvisa (no mínimo 9 dígitos); detentor do registro; preço.

---

## Regras para o software

- **RF-1.** Config do tenant `medicamentos.modo` ∈ {`desligado`, `lista`, `propaganda`}.
  - `desligado`: nenhum medicamento aparece em lugar nenhum.
  - `lista`: só o modo lista.
  - `propaganda`: feed com advertência.
  - Valor inicial: o atual (`propaganda` só no feed), até a revisão OAB.
- **RF-2.** Produto sem GTIN na lista da CMED, ou com GTIN de medicamento sob prescrição, ou com
  substância da Portaria 344, ou com retenção de receita → bloqueado em tudo (comportamento atual
  mantido).
- **RF-3.** Isento com condição `leve_pague` ou `quantidade_minima` → descartar.
- **RF-4.** Isento cujo título, descrição ou rótulo de condição contenha (sem acento, palavra inteira)
  algum destes termos → descartar: "leve", "pague", "2a unidade", "segunda unidade", "a partir de",
  "compre e ganhe", "ganhe", "brinde", "gratis", "sorteio", "pontos", "cashback", "na compra de".
- **RF-5.** Isento no feed exige `preço_anterior` (último preço diferente do atual, mesma loja, até
  30 dias antes). Sem ele → a oferta não entra no feed (só lista). Com ele → o cartão mostra "de R$
  [preço_anterior] por R$ [preço_atual]", e o percentual em destaque é calculado sobre `preço_anterior`.
- **RF-6.** Cartão de medicamento nunca contém as strings "preço normal", "compre", "aproveite",
  "corra", "não perca", "garanta", "tome", "use", "experimente", "saboroso", "gostoso", "delicioso".
  Teste: varrer os templates.
- **RF-7.** Todo item de medicamento, em qualquer modo, mostra os seis dados do art. 18 vindos da CMED.
  Faltou um → não exibir.
- **RF-8.** No modo `propaganda`, o quadro de advertência tem área ≥ 20% da área do cartão, fundo
  branco, filete interno, texto preto em caixa alta, fonte Humanist 777 Bold ou Frutiger 55 Bold, e
  nunca é truncado. Teste de UI mede a área renderizada.
- **RF-9.** Escolha da advertência:
  - substância na lista `sedacao` (config, preenchida por farmacêutico) → texto do art. 17;
  - senão, exatamente uma substância e ela está no Anexo III → texto do Anexo;
  - senão → padrão do art. 23.
  - Sempre acrescentar a frase do art. 22, VII, e a do art. 16 se a CMED marcar genérico.
- **RF-10.** Push nunca contém nome comercial, substância, marca, preço, percentual ou categoria de
  medicamento. Teste: gerar push a partir de um alerta de medicamento e verificar o texto.
- **RF-11.** Nenhum botão de compartilhar em medicamento. Anúncio da rede: categorias de medicamento e
  farmácia bloqueadas na configuração da rede (lista em config, verificada no teste de integração da
  rede).
- **RF-12.** Trava por substância: se o título contiver o nome de uma substância da lista da CMED
  (normalizada, palavra inteira) e o produto não tiver GTIN reconhecido → bloquear com
  `MEDICAMENTO_SEM_REFERENCIA` e revisão humana, em qualquer categoria. Exceções em config para
  cosméticos óbvios (ex.: "vitamina C" em sérum facial), revisadas por humano.
- **RF-13.** Isento com "infantil", "pediátrico", "kids", "bebê" ou "criança" no título → não exibir
  imagem da embalagem; não aparecer em seção, carrossel ou tela de bebê.
- **RF-14.** Link de compra de medicamento só para domínio cadastrado como site próprio da farmácia
  (`.com.br`). Loja sem CNPJ, AFE e licença conferidos → nenhuma oferta de medicamento dela é exibida.
- **RF-15.** Seguir medicamento exige consentimento LGPD específico registrado (data, versão do texto).
  Sem registro → a rota recusa.
- **RF-16.** Eventos de analytics e de anúncios não carregam id de produto de medicamento. O link de
  afiliado de medicamento não leva identificador da pessoa.
- **RF-17.** Comparação e histórico de medicamento só entre ofertas com o mesmo número de registro na
  Anvisa (não por família de título).
- **RF-18.** Toda exibição de medicamento registra modo, advertência, versão da regra, loja, preço e
  data, para auditoria (retenção de 5 anos).

---

## Riscos que permanecem (do maior para o menor)

1. **RDC 44/2009, art. 53, § 2º**: a autoridade pode entender que o app "oferta medicamento na
   internet" sem ser farmácia, num momento de mudança regulatória (Lei 15.357/2026 e o processo da
   Anvisa).
2. **Medicamento escapando da triagem** por falta de GTIN (Lomadee): aparece como produto comum, sem
   advertência e com push. A RF-12 reduz, mas não elimina.
3. **Exigência das indicações** (art. 22, V) no modo `propaganda`: se a autoridade exigir, o feed de
   isento fica irregular.
4. **Advertência fora da forma** em algum aparelho (quadro menor que 20%, fonte errada, texto cortado).
5. **Preço integral**: o "de" do app, montado pelo histórico, pode divergir do que a farmácia
   considera seu preço cheio.
6. **LGPD**: vazamento ou uso indevido de seguidos e pesquisas de medicamento.
7. **Anúncio de terceiros** que passe pelo bloqueio da rede.
8. **Programas de desconto com cadastro ou cartão** (art. 46), sem a regra da CMED lida.

---

## Pendências

| Pendência | Com quem | Motivo |
|---|---|---|
| Enquadramento do comparador com afiliado diante da RDC 44/2009, art. 53, § 2º, e da Lei 15.357/2026 | advogado e consulta formal à Anvisa | maior risco do produto; norma em transição |
| Exigência de "indicações" no feed (art. 22, V) | advogado; se possível, Anvisa | define se o feed de isento é viável |
| Efeito do REsp 2.035.645 e situação atual da revisão da RDC 96 | advogado | partes da norma foram declaradas ilegais entre as partes |
| Uso do histórico como "preço integral" | advogado | art. 11, § 4º |
| Resoluções da CMED sobre desconto e programas de benefício (art. 46) | advogado e leitura das resoluções | não lidas |
| Lista de isentos com sedação ou sonolência na bula (art. 17) | farmacêutico | a CMED não informa |
| Licença da fonte Humanist 777 ou Frutiger 55 para app | jurídico e compras | a fonte é exigida pelo art. 24, III, e é comercial |
| Consentimento e relatório de impacto para dados de medicamento | advogado (LGPD) | dado sensível |
| Conferir no DOU a RDC 96 consolidada, o Anexo III e a Lei 15.357/2026 | equipe | lidos em fontes não oficiais ou secundárias |
| Letra e texto do anexo do CONAR para medicamentos | equipe | não confirmado |

---

## Normas citadas

| Norma | Data | Situação |
|---|---|---|
| RDC Anvisa 96 (propaganda de medicamentos) | 17/12/2008 | vigente, com alterações da RDC 23/2009; em revisão pela Anvisa (2026, não confirmado em fonte oficial); partes declaradas ilegais no REsp 2.035.645 (efeito entre as partes, provável) |
| RDC Anvisa 23 (altera a RDC 96) | 20/05/2009 | vigente |
| Perguntas e Respostas da Anvisa sobre a RDC 96 e a IN 05/2009 | data da edição não confirmada | orientação, não norma |
| Instrução Normativa Anvisa 05 | 20/05/2009 | citada no título do guia; conteúdo **não lido** |
| RDC Anvisa 44 (boas práticas farmacêuticas; solicitação remota) | 17/08/2009 | vigente segundo fonte secundária de 2026; em revisão (processo aberto em 19/08/2026, não confirmado em fonte oficial) |
| RDC Anvisa 812 (entrega de medicamentos controlados) | 2023 | **não confirmada** (citada por fonte secundária) |
| Portaria SVS/MS 344 (substâncias controladas) | 12/05/1998 | vigente; **não relida** |
| Lei 15.357 (altera a Lei 5.991/1973, art. 6º, § 6º) | 20/03/2026 (DOU 23/03/2026) | vigente segundo fontes secundárias; **não lida no DOU** |
| Lei 5.991 (comércio de medicamentos) | 17/12/1973 | vigente; **não relida** |
| Lei 6.360 (vigilância sanitária de medicamentos), arts. 58 e 59 | 23/09/1976 | vigente; **não relida** |
| Lei 6.437 (infrações sanitárias), arts. 2º, 4º e 10, V | 20/08/1977 | vigente; faixas de multa da MP 2.190-34/2001 **confirmadas só em fonte secundária** |
| Lei 9.294 (restrições à propaganda), art. 7º | 15/07/1996 | vigente; **não relida** |
| Lei 9.787 (genéricos) | 10/02/1999 | vigente; **não relida** |
| Lei 10.742 (CMED e regulação de preços) | 06/10/2003 | vigente; **não relida** |
| Resoluções da CMED sobre PMC e descontos | — | **não confirmadas** (número e conteúdo) |
| Lei 13.021 (exercício da atividade farmacêutica) | 08/08/2014 | vigente; **não relida** |
| Lei 8.078 (CDC), arts. 30, 31, 36, 37, 39 e 55 a 57 | 11/09/1990 | vigente; **não relida** |
| Lei 13.709 (LGPD), arts. 5º, II, e 11, § 4º | 14/08/2018 (§ 4º com redação da Lei 13.853/2019) | vigente; **não relida** |
| Lei 7.347 (ação civil pública) | 24/07/1985 | vigente; **não relida** |
| Código Brasileiro de Autorregulamentação Publicitária (CONAR), anexo de medicamentos isentos | 1980, com revisões | autorregulação; letra e texto do anexo **não confirmados** |
| STJ, REsp 2.035.645, Primeira Turma, rel. min. Regina Helena Costa | acórdão publicado em 15/08/2024 (segundo a notícia do STJ) | decisão judicial; alcance além das partes **não confirmado** |
