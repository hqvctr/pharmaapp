# NBCAL: Lei 11.265/2006 e Decreto 9.579/2018

Referência para o app. Não é parecer jurídico. As conclusões marcadas **(a validar)** dependem da
assessoria jurídica antes de virar regra.

## Fontes
- Lei nº 11.265, de 3 de janeiro de 2006, texto atualizado da Câmara dos Deputados:
  https://www2.camara.leg.br/legin/fed/lei/2006/lei-11265-3-janeiro-2006-540144-normaatualizada-pl.html
  (alterada pela Lei 11.474/2007 nos avisos de rótulo dos arts. 10, 11 e 13; prazo do art. 26 prorrogado
  pela Lei 11.460/2007).
- Decreto nº 9.579, de 22 de novembro de 2018, Título II, Capítulo I, Seção I (arts. 3º a 28), que
  regulamenta a lei. Texto atualizado da Câmara:
  https://www2.camara.leg.br/legin/fed/decret/2018/decreto-9579-22-novembro-2018-787359-normaatualizada-pe.html
  O texto consolidado não anota nenhuma alteração nos arts. 3º a 28. As alterações registradas no
  decreto (Decretos 10.003/2019, 11.061/2022, 11.074/2022, 11.473/2023 e 11.479/2023) estão em outros
  títulos.
- Lidos em 2026-10-27. O Planalto (planalto.gov.br) recusa acesso automatizado deste ambiente; conferir
  lá antes de publicar.
- Não lidos: RDC 221/2002 e RDC 908/2024 da Anvisa (requisitos de bicos, chupetas e mamadeiras), citadas
  por material secundário.

## O que a norma diz (trechos literais)

**Produtos abrangidos** (Decreto, art. 3º, parágrafo único; a lei, art. 2º, tem lista equivalente):
> I - alimentos de transição e alimentos à base de cereais, indicados para lactentes ou crianças na
> primeira infância, e outros alimentos ou bebidas à base de leite ou não, quando comercializados ou
> apresentados como apropriados para a alimentação de lactentes e crianças na primeira infância;
> II - fórmulas de nutrientes apresentadas ou indicadas para recém-nascidos de alto risco;
> III - fórmulas infantis de seguimento para crianças na primeira infância;
> IV - fórmulas infantis para lactentes e fórmulas infantis de seguimento para lactentes;
> V - fórmulas infantis para necessidades dietoterápicas específicas;
> VI - leites fluidos ou em pó, leites modificados e similares de origem vegetal; e
> VII - mamadeiras, bicos e chupetas.

Definições que mudam o alcance (Decreto, art. 4º): lactente = até 11 meses e 29 dias; criança na
primeira infância = "criança de até seis anos de idade completos" (a lei dizia 12 meses a 3 anos);
promoção comercial inclui "a divulgação, por meios audiovisuais, auditivos e visuais, com o objetivo
de induzir a aquisição ou a venda de determinado produto"; kit = conjunto de produtos na mesma
embalagem.

**Promoção vedada** (Decreto, art. 5º; Lei, art. 4º):
> Art. 5º É vedada a promoção comercial dos produtos referidos nos incisos II, IV e VII do caput do
> art. 3º em quaisquer meios de comunicação, incluídas a publicidade indireta ou oculta e a divulgação
> por meios eletrônicos, escritos, auditivos e visuais. Parágrafo único. A vedação à promoção comercial
> referida no caput aplica-se a estratégias promocionais, como exposições especiais e de descontos de
> preço, cupons de descontos, prêmios, brindes, vendas vinculadas a produtos não sujeitos ao disposto
> neste Capítulo, apresentações especiais ou outras estratégias estabelecidas em regulamentação da Anvisa.

**Promoção permitida com destaque obrigatório** (Decreto, art. 6º; Lei, art. 5º):
> Art. 6º A promoção comercial dos alimentos infantis referidos nos incisos I, III e VI do caput do
> art. 3º incluirá, com destaque visual ou auditivo, observado o correspondente meio de divulgação, os
> seguintes dizeres:
> I - para produtos referidos nos incisos III e VI do caput do art. 3º - "O Ministério da Saúde informa:
> o aleitamento materno evita infecções e alergias e é recomendado até os 2 (dois) anos de idade ou
> mais"; e
> II - para produtos referidos no inciso I do caput do art. 3º - "O Ministério da Saúde informa: após os
> 6 (seis) meses de idade, continue amamentando seu filho e ofereça novos alimentos".
> § 1º Os dizeres veiculados por escrito serão legíveis e apresentados em moldura, próximos aos
> produtos, no mesmo sentido espacial de outros textos informativos, quando presentes.
> § 2º Os caracteres de que trata o § 1º serão apresentados em caixa alta, em negrito e ter, no mínimo,
> vinte por cento do tamanho do maior caractere presente na promoção comercial, com tamanho mínimo de
> dois milímetros.
> § 3º Os destaques auditivos serão apresentados de forma pausada, clara e audível.

O inciso V (fórmula para necessidades dietoterápicas específicas) não está nem no art. 5º nem no
art. 6º; o decreto só trata do rótulo dela (art. 13). Os arts. 11 a 17 tratam de rótulo e embalagem,
obrigação do fabricante. A fórmula de nutrientes para recém-nascido de alto risco é de uso hospitalar
exclusivo, "vedada sua comercialização fora do âmbito dos serviços de saúde" (art. 16, § 4º).
Penalidades: Lei 6.437/1977, mais o Código de Defesa do Consumidor e o ECA, no que couber (art. 27).

## O que isso significa para o app (a validar)
Premissa: um app que avisa desconto e ganha comissão por link de afiliado faz "divulgação por meios
eletrônicos" com objetivo de induzir a compra; na dúvida, trata-se como promoção comercial (falha
fechada).

1. **Nunca mostrar, em lugar nenhum** (feed, pesquisa, página do produto, seguidos, central de avisos,
   push, compartilhamento): fórmula infantil para lactentes (0 a 6 meses), fórmula infantil de
   seguimento para lactentes (6 a 12 meses), fórmula de nutrientes para recém-nascido de alto risco,
   mamadeira, bico e chupeta, e kit que contenha qualquer um deles. O parágrafo único do art. 5º cita
   expressamente desconto de preço e cupom.
2. **Mostrar só com a advertência certa**, com o texto exato:
   - texto "aleitamento até os 2 anos": fórmula infantil de seguimento para crianças na primeira
     infância e **todo leite fluido ou em pó, leite modificado e bebida vegetal** (leite UHT,
     desnatado, leite em pó, bebida de soja, aveia, amêndoa). Isso atinge a categoria `mercearia` deste
     tenant, não só produto de bebê;
   - texto "após os 6 meses": papinha, cereal infantil, mingau infantil e qualquer alimento ou bebida
     apresentado como próprio para criança de até 6 anos.
3. **Forma da advertência na tela** (art. 6º, §§ 1º e 2º): em moldura, junto do produto, mesmo sentido do
   texto, CAIXA ALTA, negrito, com pelo menos 20% da altura do maior caractere da promoção (no app, o
   preço) e nunca menos de 2 mm. Texto inteiro, sem cortar.
4. **Push**: notificação do sistema não tem moldura, negrito nem controle de tamanho. Recomendação: sem
   push para produto que exige advertência; ele aparece só no feed, como medicamento.
5. A advertência depende do **tipo do produto**, não da categoria do app: leite está em `mercearia`,
   papinha pode estar em qualquer categoria de bebê. A triagem precisa olhar título e descrição de todo
   produto, como a de medicamento (DECISIONS 24).
6. Textos próprios do app (onboarding, central, e-mail do código) não podem recomendar nem induzir o
   uso de mamadeira, bico, chupeta ou substituto do leite materno (art. 20, § 1º, por analogia).

## Comparação com o que a linha paralela implementou
Fonte: `claude/awesome-noether-jruv6b`, `backend/src/normalizador/nbcal.ts` e `config/tenants/economae.json`
(decisão 46 de lá, "validada pela assessoria jurídica 2026-09-28").

| Ponto | Linha paralela | O que a norma diz |
|-------|----------------|-------------------|
| Advertência de papinha (`alimentacao_infantil`) | texto "aleitamento até os 2 anos" | **errado**: alimento de transição leva o texto "após os 6 meses" (art. 6º, II) |
| Leite comum e bebida vegetal | sem advertência (categoria fora do escopo de lá) | advertência "até os 2 anos" (art. 6º, I) |
| "fórmula de seguimento" | bloqueia toda | só a de seguimento **para lactentes** é vedada; a para crianças na primeira infância pode, com advertência. Bloquear tudo é mais restritivo, mas não é ilegal |
| Protetor de mamilo | bloqueado | não aparece nem na lei nem no decreto (busca no texto inteiro); talvez venha da RDC 221/2002, não lida |
| Forma da advertência | texto corrido, sem regra de exibição | moldura, caixa alta, negrito, ≥ 20% do maior caractere, mín. 2 mm |
| Advertência no push | texto inteiro no corpo da notificação | sem como cumprir o § 2º no push do sistema |
| Kit com mamadeira | bloqueado pela descrição | correto (apresentação especial e kit) |

## Perguntas para a assessoria jurídica
1. Um app de alertas de preço com link de afiliado é "promoção comercial" para a NBCAL?
2. Composto lácteo e leite condensado ou aromatizado entram no inciso VI (exigem advertência)?
3. Protetor de mamilo é vedado? Qual norma?
4. Fórmula para necessidades dietoterápicas específicas pode aparecer com desconto?
5. Push com advertência atende ao art. 6º, ou o produto não pode ter push?
6. Na pesquisa e na página do produto (preço sem "promoção"), a vedação do art. 5º também vale?
