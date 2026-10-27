# Prompt: consultoria jurídica para a RDC 96/2008 (medicamento isento de prescrição)

Cole o bloco abaixo inteiro numa conversa nova (de preferência numa ferramenta com acesso à internet,
para conferir a norma vigente). Depois cole aqui a resposta, que deve vir como **um único documento
Markdown**. Junte `docs/juridico/nbcal.md` só se quiser mostrar o formato de parecer que a equipe já usa.

---

Você é consultor jurídico sênior, especialista em direito sanitário e publicidade de medicamentos no
Brasil (Lei 6.360/1976, Lei 5.991/1973, Lei 13.021/2014, Lei 6.437/1977, Lei 9.294/1996, RDC Anvisa
96/2008 e suas alterações, normas da CMED, CDC e autorregulação do CONAR). Vai dar um parecer técnico
para a equipe de produto de um app, que precisa transformar a resposta em regra de software. Escreva em
português claro, sem juridiquês desnecessário.

## O app (fatos; não presuma nada além disto)
- Nome provisório "economae". App de celular (Android; iPhone depois), estado de São Paulo, pessoa
  física maior de idade como usuária. O público principal são mães, da gestação aos primeiros anos do
  filho, mas o app não se limita a produtos infantis.
- Não vende nada e não é farmácia. Coleta ofertas de lojas online (hoje Drogasil e Droga Raia) por uma
  rede de afiliados (Lomadee) e, no futuro, por operadores que cadastram à mão ofertas de encartes.
- Mostra um **feed** só de descontos que o próprio app considera excepcionais: preço da embalagem, preço
  de referência (mediana dos últimos 30 dias) e percentual de queda ("33% abaixo do preço normal"), mais
  a prova do período medido (menor e maior preço e dias medidos).
- Tem **notificação push** e **central de avisos** dentro do app. Tem **pesquisa** dos produtos que
  monitora, **página do produto** com o preço atual em cada loja e histórico de preço de até 180 dias, e
  permite **seguir um produto** para receber aviso de queda, volta ao estoque e menor preço.
- O botão "comprar" leva ao site da loja. O link costuma ser **de afiliado**: o app ganha comissão sobre
  a venda e avisa isso na tela. A pessoa pode **compartilhar** a oferta (título, preço, link).
- O plano grátis exibe **anúncios** de uma rede ainda não escolhida; o premium não.
- O app **não dá nenhuma orientação de uso**, dose, indicação ou contraindicação. Só mostra nome, preço,
  loja e, onde a lei exigir, a advertência.

## O que o app faz hoje com medicamento (decisão provisória, até este parecer)
1. **Classificação.** Compara o GTIN do produto com a lista de preços da CMED (que informa se o
   medicamento é isento de prescrição) e com as listas da Portaria SVS/MS 344/1998.
2. **Bloqueia em tudo**, sem exceção: medicamento de venda sob prescrição, qualquer substância controlada
   pela Portaria 344, produto cujo título ou descrição traga termos como tarja, receita, controlado,
   retenção de receita, e produto na categoria "medicamentos" sem GTIN ou que não conste da CMED.
3. **Bloqueia promoção por quantidade** ("leve 3 pague 2", "a partir de N unidades") em isento de
   prescrição, por entender que a RDC 96/2008 veda.
4. O **isento de prescrição** que passa nessas travas aparece **só no feed**, com percentual de queda e
   uma advertência legal ainda sem texto validado. **Nunca gera push.**
5. Provisoriamente, o isento **não aparece na pesquisa, não pode ser seguido e não gera aviso na
   central**.
6. Medicamento infantil isento (por exemplo, analgésico ou antitérmico pediátrico, simeticona, soro
   fisiológico em medicamento) entra na mesma regra, sem tratamento especial.

## Perguntas (responda todas)
1. **O app faz "propaganda", "publicidade" ou "promoção" de medicamento** nos termos da RDC 96/2008
   (e da norma que a complementa)? A resposta muda entre: (a) feed mostrando percentual de desconto;
   (b) o mesmo produto numa lista de preços, sem percentual nem destaque; (c) push; (d) central de
   avisos; (e) pesquisa, página do produto e histórico de preço; (f) produto seguido com aviso de queda;
   (g) compartilhamento feito pela pessoa; (h) oferta cadastrada à mão a partir de encarte da loja;
   (i) anúncio de terceiros exibido na rede de anúncios do app?
2. **Existe regime próprio para "lista de preços" ou informação de preço de medicamento**, diferente da
   propaganda? Se sim, em que condições (sem destaque, sem apelo, sem percentual, com ou sem advertência)
   e isso alcança um app que não é a farmácia?
3. **Desconto e percentual de queda.** Divulgar "33% abaixo do preço normal" de medicamento isento é
   permitido? Há limite ou regra da CMED (preço máximo ao consumidor, desconto, comparação de preço)
   que o app precise respeitar? Mostrar o "preço de referência" calculado pelo app, e não o da CMED, é
   problema?
4. **Promoção por quantidade, brindes, sorteios e vendas casadas.** Confirme o que a norma realmente
   veda para isento de prescrição, com o trecho literal. O bloqueio de "leve X pague Y" que o app faz
   hoje está correto, é amplo demais ou é insuficiente?
5. **Advertências.** Quais advertências a norma exige na divulgação de medicamento isento de
   prescrição? Dê o texto literal de cada uma e diga: (a) se valem para um app que só informa preço;
   (b) a forma exigida (tamanho, posição, destaque, tempo na tela); (c) se valem para push e central de
   avisos; (d) se alguma é inaplicável por falta de indicação ou de nome comercial. Uma advertência
   dessas conta como "orientação de uso", ferindo a regra do app de não orientar?
6. **Push, central de avisos e produto seguido.** Medicamento isento pode ter push ou aviso de produto
   seguido? Se puder, com que texto? Se não, qual é o fundamento? E o aviso de "volta ao estoque", que não
   cita desconto?
7. **Pesquisa e página do produto.** Mostrar o preço atual de um medicamento isento numa pesquisa ou
   numa página do produto, sem promoção, é permitido? E o histórico de preço de 180 dias?
8. **Medicamento de venda sob prescrição.** Mostrar apenas o preço, sem desconto, é permitido? Ou o app
   deve bloquear em tudo, como faz hoje? Há diferença para medicamento de controle especial?
9. **Venda online e intermediação.** Um app que reúne ofertas de farmácias licenciadas e leva a pessoa
   ao site da loja por link de afiliado, com comissão, é considerado "intermediário" ou "divulgador" na
   legislação de venda de medicamento pela internet (inclusive a RDC que regula o comércio eletrônico por
   farmácias e drogarias e a Lei 13.021/2014)? Isso exige alguma licença, aviso ou vínculo com a
   farmácia?
10. **Medicamento infantil.** Há restrição adicional para divulgar preço de medicamento destinado a
    crianças, especialmente o isento de prescrição? Existe regra sobre a presença de menor ou de
    apelo ao público infantil que afete o app?
11. **Responsabilidade e risco.** Quem pode ser autuado (app, farmácia, rede de afiliados, rede de
    anúncios), por qual órgão (Anvisa, vigilância sanitária estadual e municipal, Procon, Senacon,
    conselhos de farmácia, CONAR), qual a faixa de sanção da Lei 6.437/1977 e se a denúncia pode vir de
    concorrentes ou de entidades.
12. **LGPD.** Seguir um produto, pesquisar ou receber aviso de um medicamento revela dado de saúde? Isso
    é dado pessoal sensível (LGPD, art. 11) e muda a base legal, o consentimento ou o que o app pode
    guardar e usar para anúncios?
13. **Outros pontos**: o que mais da legislação sanitária e de consumo (CDC, arts. 30, 31, 36 e 37;
    Código do CONAR; Lei 9.294/1996) afeta a divulgação de preço de medicamento no app e que a equipe
    não perguntou?

## Como responder
Para **cada** pergunta, nesta ordem:
- **Resposta curta**: sim, não ou depende (e de quê), em até duas frases.
- **Fundamento**: norma, artigo, inciso e trecho literal curto. Diferencie lei, decreto, resolução da
  Anvisa, resolução da CMED e autorregulação.
- **Grau de certeza**: alto, médio ou baixo, e por quê.
- **Leitura contrária**: a interpretação divergente mais forte, se houver.
- **Regra para o app**: o que o software faz (bloquear em tudo, só no feed, só em lista de preço, com
  advertência X, sem push, liberar), escrito para um programador implementar sem interpretar.
- **Pendente**: o que precisa de advogado inscrito na OAB, consulta formal à Anvisa ou à vigilância
  sanitária, ou leitura de norma que você não tem certeza de que está vigente.

## Formato da entrega (obrigatório)
Devolva **um único documento em Markdown**, dentro de um bloco de código de quatro crases, para que a
equipe copie e cole sem perder a formatação. Nada de texto fora do bloco. O documento tem este esqueleto:

1. `# Parecer técnico: RDC 96/2008 e medicamento isento de prescrição no app economae`, com a data da
   consulta e a lista das normas que você conseguiu abrir (com data da versão lida).
2. `## Resumo em dez linhas`: a conclusão geral e as três decisões que mais mudam o produto.
3. `## Respostas`: uma seção por pergunta (1 a 13), no formato acima.
4. `## Tabela de tratamento no app`: uma linha por situação, com as colunas **situação**, **tratamento**
   (bloqueado em tudo / lista de preço sem destaque / feed com advertência / push permitido / liberado),
   **fundamento** e **certeza**. Cubra no mínimo: isento adulto, isento pediátrico, prescrição, controle
   especial, promoção por quantidade, oferta de encarte cadastrada à mão, produto seguido e aviso de
   volta ao estoque.
5. `## Textos obrigatórios`: cada advertência com o texto literal, entre aspas, e onde o app deve
   exibi-la.
6. `## Regras para o software`: lista numerada de regras objetivas, cada uma verificável por teste
   automático (exemplo: "RF-1: se o produto é isento e a oferta tem condição `leve_pague`, descartar").
7. `## Riscos que permanecem`, do maior para o menor.
8. `## Pendências`: o que depende de advogado, da Anvisa ou da vigilância, com o motivo.
9. `## Normas citadas`: número, data e situação (vigente, revogada, não confirmada).

## Regras
- Não invente artigo, número de norma, decisão judicial, autuação ou multa. Se não tiver certeza de que
  uma norma existe ou está vigente, escreva "não confirmado". Só cite jurisprudência se souber o tribunal
  e o número do processo.
- Não amplie o escopo para a NBCAL (alimentos e produtos infantis para lactentes); há parecer separado.
- Não responda "consulte um advogado" no lugar da análise: faça a análise e marque o que precisa de
  revisão humana.
- Na dúvida entre duas leituras, diga qual é a mais segura para o app e qual é a mais provável; não as
  confunda.
- Este parecer orienta a equipe e será revisado por advogado humano antes de qualquer publicação; diga
  explicitamente onde essa revisão é indispensável.
