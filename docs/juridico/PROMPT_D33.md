# Prompt: consultoria jurídica para a D33 (NBCAL)

Cole o bloco abaixo inteiro numa conversa nova. Junte o arquivo `docs/juridico/nbcal.md` se a
ferramenta aceitar anexo.

---

Você é consultor jurídico sênior, especialista em direito do consumidor, publicidade e regulação
sanitária de alimentos no Brasil (Lei 11.265/2006, Decreto 9.579/2018, CDC, normas da Anvisa e
autorregulação do CONAR). Vai dar um parecer técnico para a equipe de produto de um app, que precisa
transformar a resposta em regra de software. Escreva em português claro, sem juridiquês desnecessário.

## O app (fatos; não presuma nada além disto)
- Nome provisório "economae". App de celular (Android; iPhone depois), estado de São Paulo, pessoa física
  maior de idade como usuária.
- Não vende nada. Coleta ofertas de lojas online (hoje farmácias como Drogasil e Droga Raia) por uma rede
  de afiliados (Lomadee) e, no futuro, por operadores que cadastram à mão ofertas de encartes.
- Mostra um **feed** só de descontos considerados excepcionais pelo próprio app: preço da embalagem,
  preço de referência dos últimos 30 dias e percentual de queda ("33% abaixo do preço normal").
- Manda **notificação push** dessas promoções e tem uma **central de avisos** dentro do app.
- Tem **pesquisa** dos produtos que monitora e **página do produto** com o preço atual em cada loja e o
  histórico de preço de até 180 dias, mesmo sem promoção.
- A pessoa pode **seguir um produto** e pedir aviso de queda acima de X%, volta ao estoque, menor preço
  em 180 dias e promoção acabando.
- O botão "comprar" leva ao site da loja. O link costuma ser **de afiliado**: o app ganha comissão sobre
  a venda e avisa isso na tela.
- A pessoa pode **compartilhar** a oferta (título, preço, link) pela folha de compartilhamento do celular.
- O plano grátis exibe **anúncios** de uma rede de anúncios ainda não escolhida; o premium não exibe.
- Categorias atuais incluem mercearia, higiene e cuidados do bebê, cuidados pessoais e medicamentos
  isentos de prescrição.

## Norma já levantada (texto atualizado da Câmara, lido em 2026-10-27; confira se houve mudança)
- Decreto 9.579/2018, art. 3º, parágrafo único: produtos abrangidos. I alimentos de transição e à base de
  cereais e outros alimentos ou bebidas apresentados como apropriados para lactentes e crianças na
  primeira infância; II fórmulas para recém-nascidos de alto risco; III fórmulas de seguimento para
  crianças na primeira infância; IV fórmulas infantis para lactentes e de seguimento para lactentes;
  V fórmulas para necessidades dietoterápicas específicas; VI leites fluidos ou em pó, leites
  modificados e similares de origem vegetal; VII mamadeiras, bicos e chupetas.
- Art. 4º: XV distribuidor = quem esteja "envolvida direta ou indiretamente na comercialização";
  XXXVI promoção comercial = "conjunto de atividades informativas e de persuasão, procedente de empresas
  responsáveis pela produção, pela manipulação, pela distribuição ou pela comercialização dos produtos
  [...], incluída a divulgação, por meios audiovisuais, auditivos e visuais, com o objetivo de induzir a
  aquisição ou a venda de determinado produto"; XI criança na primeira infância = até seis anos completos.
- Art. 5º: vedada a promoção comercial dos incisos II, IV e VII "em quaisquer meios de comunicação,
  incluídas a publicidade indireta ou oculta e a divulgação por meios eletrônicos"; parágrafo único:
  aplica-se a "descontos de preço, cupons de descontos, prêmios, brindes, vendas vinculadas [...],
  apresentações especiais".
- Art. 6º: a promoção dos incisos I, III e VI exige destaque com os dizeres "O Ministério da Saúde
  informa: o aleitamento materno evita infecções e alergias e é recomendado até os 2 (dois) anos de
  idade ou mais" (III e VI) ou "O Ministério da Saúde informa: após os 6 (seis) meses de idade, continue
  amamentando seu filho e ofereça novos alimentos" (I); por escrito, em moldura, próximo ao produto,
  caixa alta, negrito, no mínimo 20% do maior caractere, mínimo 2 mm.
- Art. 14, § 2º: vedada a indicação, por qualquer meio, de leites condensados e/ou aromatizados para
  lactentes e crianças na primeira infância. Art. 16, § 4º: fórmula para recém-nascido de alto risco tem
  comercialização vedada fora dos serviços de saúde. Art. 27: penalidades da Lei 6.437/1977, mais CDC e
  ECA no que couber.
- "Protetor de mamilo" não aparece nem na Lei 11.265 nem no Decreto 9.579. Material secundário cita a
  RDC Anvisa 221/2002 e a RDC 908/2024 (não lidas pela equipe).

## Perguntas (responda todas)
1. **O app faz "promoção comercial"?** Considerando que não vende, mas divulga desconto com percentual,
   notifica, ganha comissão de afiliado e exibe anúncios, ele se enquadra no art. 4º, XXXVI (e é
   "distribuidor", XV)? A resposta muda entre: (a) feed e push de desconto; (b) pesquisa e página do
   produto mostrando preço sem destaque de promoção; (c) aviso de produto seguido ("caiu 20%");
   (d) histórico de preço; (e) compartilhamento feito pelo usuário; (f) oferta cadastrada à mão pelo
   operador a partir de encarte da loja?
2. **Composto lácteo** entra no inciso VI (exige advertência), no inciso IV (vedado) ou fora da NBCAL?
   E **leite condensado e leite aromatizado** (achocolatado pronto, por exemplo): exigem a advertência do
   art. 6º só por serem "leite", ou ficam só sob o art. 14, § 2º?
3. **Protetor de mamilo**: a promoção é vedada? Por qual norma vigente? Se não for vedada, há outra
   restrição?
4. **Fórmula infantil para necessidades dietoterápicas específicas** (inciso V): pode aparecer com
   desconto? Com advertência? Considere que é usada sob prescrição.
5. **Vedação na pesquisa e na página do produto**: se um produto vedado (mamadeira, fórmula para
   lactentes) só aparecesse na pesquisa, com o preço atual, sem "promoção", percentual ou push, isso
   ainda violaria o art. 5º? E o histórico de preço dele?
6. **Push e central de avisos** para produto que exige a advertência do art. 6º: notificação do sistema
   não tem moldura, negrito nem controle de tamanho. Dá para cumprir o art. 6º no push (por exemplo, com o
   texto em caixa alta no corpo), ou o produto não deve ter push?
7. **Leite comum** (UHT integral, desnatado, em pó, bebida vegetal de soja, aveia, amêndoa) vendido em
   mercearia, sem nenhuma relação com bebê: o desconto dele no app exige a advertência do art. 6º, I?
   Como fazem os encartes de supermercado?
8. **Anúncios**: se a rede de anúncios exibir no app propaganda de fórmula, mamadeira ou chupeta, quem
   responde? O app precisa bloquear essas categorias na rede de anúncios?
9. **Responsabilidade e risco**: quem pode ser autuado (app, loja, rede de afiliados), por qual órgão
   (Vigilância Sanitária, Procon, Senacon, Anvisa), qual a faixa de sanção da Lei 6.437/1977, e se a
   denúncia pode vir de concorrentes ou de entidades como IBFAN/IDEC.
10. **Outros pontos**: o que mais da legislação comercial e de consumo (CDC, arts. 30, 31, 36 e 37;
    Código do CONAR; ECA; LGPD, se couber) afeta a divulgação de desconto de produtos infantis no app e
    que a equipe não perguntou?

## Como responder
Para **cada** pergunta, nesta ordem:
- **Resposta curta**: sim, não ou depende (e de quê), em até duas frases.
- **Fundamento**: norma, artigo e inciso, com trecho literal curto. Diferencie lei, decreto, resolução
  da Anvisa e autorregulação.
- **Grau de certeza**: alto, médio ou baixo, e por quê.
- **Leitura contrária**: a interpretação divergente mais forte, se houver.
- **Regra para o app**: o que o software faz (bloquear em tudo, só no feed, com advertência X, sem
  push, liberar), escrito de forma que um programador implemente sem interpretar.
- **Pendente**: o que precisa de advogado inscrito na OAB, consulta formal à Anvisa ou à vigilância
  sanitária, ou leitura de norma que você não tem certeza de que está vigente.

Feche com:
1. Uma tabela "tipo de produto → tratamento no app" (vedado em tudo / feed com advertência "2 anos" /
   feed com advertência "6 meses" / livre), cobrindo todos os produtos citados acima.
2. Os riscos que continuam mesmo seguindo as recomendações, do maior para o menor.
3. A lista de normas que você citou, com número e data, marcando as que não conseguiu confirmar como
   vigentes.

## Regras
- Não invente artigo, número de norma, decisão judicial, autuação ou multa. Se não tiver certeza de que
  uma norma existe ou está vigente, diga "não confirmado". Só cite jurisprudência se souber o tribunal e o
  número do processo; senão, não cite.
- Não amplie o escopo para medicamentos (há parecer separado sobre a RDC 96/2008), salvo onde a NBCAL e a
  regra de medicamento se cruzam.
- Na dúvida entre duas leituras, diga qual é a mais segura para o app e qual é a mais provável;
  não as confunda.
- Este parecer orienta a equipe e será revisado por advogado humano antes de qualquer publicação; diga
  explicitamente onde essa revisão é indispensável.
