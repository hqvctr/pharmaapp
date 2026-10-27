# Parecer técnico D33: NBCAL no economae

Minuta de 2026-10-27, escrita para a equipe de produto em resposta a [PROMPT_D33.md](PROMPT_D33.md), a
partir de [nbcal.md](nbcal.md). **Não é parecer de advogado.** Orienta o software até a revisão por
advogado inscrito na OAB, que é **indispensável** antes de publicar o app e nos pontos marcados
**[revisão OAB]**.

Convenções:
- "Decreto" = Decreto 9.579/2018 (arts. 3º a 28); "Lei" = Lei 11.265/2006. A numeração dos incisos
  segue o Decreto, art. 3º, parágrafo único (I a VII), como no prompt. A Lei usa outra ordem no art. 2º.
- "Vedado" = o produto não aparece em lugar nenhum do app (feed, pesquisa, página do produto, seguidos,
  central de avisos, push, compartilhamento, anúncio).
- "Advertência 2 anos" = art. 6º, I: "O Ministério da Saúde informa: o aleitamento materno evita
  infecções e alergias e é recomendado até os 2 (dois) anos de idade ou mais".
- "Advertência 6 meses" = art. 6º, II: "O Ministério da Saúde informa: após os 6 (seis) meses de idade,
  continue amamentando seu filho e ofereça novos alimentos".
- "Forma do art. 6º" = moldura, junto do produto, mesmo sentido do texto, CAIXA ALTA, negrito, altura
  ≥ 20% do maior caractere da peça e nunca menor que 2 mm (§§ 1º e 2º). Detalhe técnico na pergunta 6.

## Fatos novos apurados nesta rodada

1. **RDC Anvisa 908, de 19/09/2024** (DOU de 20/09/2024), "dispõe sobre os requisitos sanitários dos
   bicos, chupetas e mamadeiras", aplica-se "de maneira complementar à Lei nº 11.265 [...] e ao Decreto
   nº 9.579". O art. 12 **revoga a RDC 221/2002 e a RDC 222/2002** (e a RDC 10/1999 e a Portaria Anvisa
   151/2006). Não trata de promoção comercial nem de protetor de mamilo. Lido em cópia secundária
   (normasbrasil.com.br e PDF da vigilância de Jundiaí). O DOU não abriu daqui.
2. **Lei, art. 4º, parágrafo único, foi vetado.** A lista "descontos de preço, cupons..." existe só no
   Decreto (art. 5º, parágrafo único). Isso não muda a regra (ver pergunta 1, leitura contrária).
3. **Decreto 8.552/2015**, regulamento anterior da Lei, foi revogado pelo Decreto 9.579/2018 (art. 126,
   VIII; confirmado em fonte secundária). Fabricante que ainda cita o 8.552 está citando norma revogada.
4. O Decreto define (art. 4º): **leite modificado** (XXX) = "leite em forma líquida ou em pó, de
   composição modificada por meio de subtração ou adição de constituintes"; **similar de origem
   vegetal** (XL) = "alimento em forma líquida ou em pó que contenha proteína vegetal" (trecho inicial);
   **exposição especial** (XVI) e **apresentação especial** (V), ambas ligadas à promoção. Nem
   "composto lácteo" nem "protetor de mamilo" aparecem no Decreto ou na Lei.

---

## 1. O app faz "promoção comercial"?

**Resposta curta.** Provavelmente sim, em tudo que exibe preço com link de compra comissionado. O
enquadramento é certo em (a), (c) e (f), provável em (b) e (e) e fraco em (d).

**Fundamento.**
- Decreto, art. 4º, XXXVI: promoção comercial é o "conjunto de atividades informativas e de persuasão,
  procedente de empresas responsáveis pela produção, pela manipulação, pela distribuição ou pela
  comercialização dos produtos [...], incluída a divulgação, por meios audiovisuais, auditivos e visuais,
  com o objetivo de induzir a aquisição ou a venda de determinado produto". A Lei, art. 3º, XXVII, tem
  definição equivalente.
- Decreto, art. 4º, XV: distribuidor é quem esteja "envolvida direta ou indiretamente na
  comercialização". O app é remunerado por venda concluída (comissão de afiliado): está
  **indiretamente** envolvido na comercialização. É esse o elo que o traz para dentro da definição de
  promoção comercial ("procedente de empresas responsáveis [...] pela comercialização").
- Decreto, art. 5º, caput: a vedação vale "em quaisquer meios de comunicação, incluídas a publicidade
  indireta ou oculta e a divulgação por meios eletrônicos". O parágrafo único cita "descontos de preço".

Por recurso:

| Recurso | Enquadramento | Por quê |
|---|---|---|
| (a) feed e push de desconto | **sim**, certeza alta | seleção editorial do desconto, percentual em destaque, link comissionado: é o caso típico de "desconto de preço" |
| (b) pesquisa e página do produto, sem destaque de promoção | **provável**, certeza média | ainda há preço, comparação entre lojas, ordenação por menor preço e link comissionado. A finalidade de induzir a compra está presente, só é menos explícita |
| (c) aviso de produto seguido ("caiu 20%") | **sim**, certeza alta | é um aviso de desconto. O pedido prévio do usuário não tira o caráter de promoção: a norma não tem exceção para comunicação solicitada |
| (d) histórico de preço | **possível**, certeza baixa | sozinho é informação. Na página com botão "comprar" e selo "menor preço em 180 dias", passa a servir à persuasão |
| (e) compartilhamento pelo usuário | **sim para o conteúdo gerado pelo app**, certeza média | o usuário não é empresa, mas o texto, o preço e o link de afiliado foram montados pelo app. A peça é do app; o usuário só a transporta |
| (f) oferta cadastrada pelo operador a partir de encarte | **sim**, certeza alta | o operador age pelo app. Reproduzir encarte não transfere a responsabilidade: se o encarte da loja já era irregular, o app repete a infração |

**Grau de certeza.** Médio no enquadramento geral: não há norma nem decisão conhecida que trate
especificamente de app comparador com afiliado. Alto em (a), (c) e (f), se o enquadramento geral
prevalecer.

**Leitura contrária.** (1) O app seria um serviço de informação de preço, como um jornal que publica
uma pesquisa de preços, e não uma empresa da cadeia de produção e distribuição. A definição exige que a
atividade seja "procedente de empresas responsáveis" pela produção ou comercialização. (2) O Congresso
vetou o parágrafo único do art. 4º da Lei, que listava descontos e cupons, e o Decreto não poderia
ampliar a Lei. A leitura (1) perde força porque o app ganha por venda; a (2) é fraca, porque "desconto
de preço" já cabe na definição legal de promoção comercial e o Decreto está em vigor.

**Regra para o app.** Todo produto exibido com preço e link de compra é tratado como objeto de
promoção comercial em todos os recursos (a) a (f). As regras das perguntas 2 a 7 valem igualmente para
feed, pesquisa, página do produto, seguidos, central de avisos, push, texto de compartilhamento e
oferta manual. Não existe "superfície neutra" no app.

**Pendente.** **[revisão OAB]** confirmar o enquadramento. Uma consulta formal à Anvisa ou ao Centro de
Vigilância Sanitária de SP sobre "app de comparação de preços remunerado por afiliado" daria segurança
real. Enquanto não houver resposta, a regra acima é a mais segura e, a meu ver, também a mais provável.

---

## 2. Composto lácteo; leite condensado e leite aromatizado

**Resposta curta.** Composto lácteo: fora da letra da norma, mas o mais provável é que se aplique a
advertência 2 anos, e o mais seguro também. Se for indicado para menores de 1 ano, deve ser tratado
como vedado. Leite condensado e leite aromatizado: provavelmente inciso VI (leite modificado), com
advertência 2 anos. Bebida láctea e achocolatado em pó não são "leite".

**Fundamento.**
- Composto lácteo não é nomeado na Lei nem no Decreto. Caminhos de entrada:
  - inciso III, fórmula infantil de seguimento para crianças na primeira infância (art. 4º, XXV:
    "substituto do leite materno ou humano para crianças na primeira infância"), quando o composto é
    vendido como etapa seguinte à fórmula ("fases", "1 a 3 anos");
  - inciso VI, "leites modificados e similares";
  - inciso I, "outros alimentos ou bebidas à base de leite ou não, quando comercializados ou
    apresentados como apropriados para [...] crianças na primeira infância". Esse caminho levaria à
    advertência 6 meses.
- IBFAN e IDEC registraram em monitoramento o composto lácteo como o produto com mais infrações na
  internet, entre promoções proibidas e falta de advertência. A indústria sustenta que ele fica fora
  da NBCAL. Isso é posição das partes, não decisão.
- Leite condensado e aromatizado: o art. 14, § 2º, do Decreto veda "a indicação, por qualquer meio, de
  leites condensados e/ou aromatizados para lactentes e crianças na primeira infância". Essa regra está
  no capítulo de rotulagem, o que indica que o Decreto trata esses produtos como parte do universo do
  inciso VI. Leite condensado é leite com água subtraída e açúcar adicionado; leite aromatizado é leite
  com aroma ou cacau adicionado. Os dois cabem na definição de "leite modificado" (art. 4º, XXX).
- Bebida láctea (com soro de leite) e achocolatado em pó não são "leite" no sentido técnico. Ficam
  fora do inciso VI, salvo se apresentados como próprios para criança de até 6 anos (inciso I).

**Grau de certeza.** Composto lácteo: baixo. A lacuna é reconhecida e há projeto de lei para
resolvê-la (PL 3.828/2019; situação atual não confirmada). Leite condensado e aromatizado: médio.

**Leitura contrária.** Composto lácteo para criança de 1 a 3 anos cairia no inciso I (alimento à base
de leite apresentado para a primeira infância) e levaria a advertência 6 meses, não a de 2 anos. Para
leite condensado, o art. 14, § 2º, já seria o tratamento completo: o Decreto só proíbe indicá-lo para
bebê, sem exigir advertência na promoção.

**Mais segura × mais provável.** Composto lácteo: a advertência 2 anos é a mais provável e também a
mais segura, porque o texto 6 meses não fala de leite. Leite condensado e aromatizado: o mais seguro é
aplicar a advertência 2 anos; o mais provável também, com certeza menor. O custo de errar para o lado
seguro é só exibir um texto a mais.

**Regra para o app.**
- `composto lacteo` no título ou na descrição → **advertência 2 anos**, sem push (pergunta 6).
- Composto lácteo com idade indicada abaixo de 12 meses ("0 a 6 meses", "6 a 12 meses", "lactente")
  → **vedado**.
- `leite condensado`, `leite aromatizado`, `leite com chocolate`, `leite achocolatado` (o produto é
  leite) → **advertência 2 anos**.
- `bebida lactea`, `achocolatado em po`, `achocolatado` sem "leite" → **livre**. Vira **advertência
  6 meses** se o título ou a descrição o apresentar para bebê ou criança de até 6 anos (termos "bebê",
  "infantil" junto de idade ≤ 6 anos, "kids" junto de idade ≤ 6 anos, "a partir de X meses").
- Fora do inciso VI e **livres**: creme de leite, doce de leite, iogurte, queijo, manteiga, requeijão,
  soro de leite. Ressalva: viram advertência 6 meses se apresentados para criança de até 6 anos.
- Texto do próprio app nunca associa leite condensado ou aromatizado a bebê ou criança pequena (art. 14,
  § 2º): nada de "ideal para a papinha" ou "para a lancheira do bebê".

**Pendente.** **[revisão OAB]** e consulta à Anvisa sobre composto lácteo. Ler a norma do MAPA que
define composto lácteo (citada em fontes secundárias como IN MAPA 28/2007; número e vigência **não
confirmados**).

---

## 3. Protetor de mamilo

**Resposta curta.** Pela norma vigente que consegui confirmar, **não é vedado** e não exige
advertência. O app deve mantê-lo bloqueado por cautela até a revisão.

**Fundamento.**
- O termo não aparece na Lei nem no Decreto. A Lei só menciona mamilo no art. 16, III, para proibir
  que embalagens de mamadeira, bico e chupeta sugiram "semelhança desses produtos com a mama ou o
  mamilo".
- A vedação antiga vinha da Portaria MS 2.051/2001 e da RDC 221/2002, que regulamentava "chupetas,
  bicos, mamadeiras e protetores de mamilo". A **RDC 221/2002 foi revogada pela RDC 908/2024**
  (art. 12, II), cujo escopo é só "bicos, chupetas e mamadeiras" (art. 1º).
- A Portaria MS 2.051/2001: vigência **não confirmada**. Ainda que vigente, é anterior à Lei e ao
  Decreto e não poderia criar vedação que a Lei não prevê.

**Grau de certeza.** Médio. A revogação da RDC 221 foi lida em cópia secundária, e a situação da
Portaria 2.051 não foi confirmada.

**Leitura contrária.** Protetor de mamilo seria um "bico" (inciso VII): uma peça de silicone em
formato de bico sobre a qual o bebê suga. É uma leitura possível, mas o produto é aplicado à mama da
mãe para viabilizar a amamentação, e não para substituí-la.

**Regra para o app.** Termos `protetor de mamilo`, `protetor de seio`, `bico de silicone para seio` →
**vedado por cautela**. No código, registrar o motivo como `cautela_sem_norma`, distinto de
`vedado_nbcal`, para que o bloqueio seja revisto quando houver resposta. Pomada e concha para mamilo
**não** são protetor de mamilo e ficam livres (são produtos de cuidado; se a pomada for medicamento,
vale o parecer da RDC 96/2008).

**Pendente.** Abrir a RDC 908/2024 no DOU e a Portaria 2.051/2001 na base do Ministério da Saúde
(links no fim). **[revisão OAB]** antes de liberar.

---

## 4. Fórmula infantil para necessidades dietoterápicas específicas (inciso V)

**Resposta curta.** Pela letra do Decreto, a promoção **não é vedada e não exige advertência**: o
inciso V não está nem no art. 5º nem no art. 6º. Mesmo assim, o app deve **vedar em tudo**, porque não
consegue separar com segurança uma fórmula do inciso V de uma do inciso IV.

**Fundamento.**
- Art. 5º (vedação): incisos II, IV e VII. Art. 6º (advertência): incisos I, III e VI. O inciso V fica
  fora dos dois; o Decreto só trata do rótulo dele (art. 13).
- Art. 4º, XXIII: "produto cuja composição tenha sido alterada para atender às necessidades específicas
  [...]". Na prática, fórmula sem lactose, antirregurgitação, hidrolisada ou de aminoácidos para 0 a 12
  meses é, ao mesmo tempo, fórmula infantil para lactentes. Um título de oferta como "Fórmula Infantil
  Sem Lactose 400g" não permite distinguir V de IV.

**Grau de certeza.** Alto quanto à letra; médio quanto ao risco prático de erro de classificação.

**Leitura contrária.** A ausência de restrição seria intencional (produto de uso sob orientação, sem
apelo de massa) e bloquear seria excesso. É verdade, mas bloquear não viola nada, e liberar por engano
uma fórmula para lactentes viola o art. 5º.

**Mais segura × mais provável.** Mais provável: liberado sem advertência. Mais segura: vedado. Recomendo
a mais segura. Há ainda um ponto de produto: desconto em produto usado por prescrição para criança
doente incentiva troca ou compra sem orientação, o que é ruim para a reputação do app.

**Regra para o app.** Toda `formula infantil` (e `formula` + `lactente`, `bebe`, `meses`) → **vedado em
tudo**, inclusive as de seguimento para crianças na primeira infância **se** o texto mencionar
"sem lactose", "AR", "antirregurgitação", "hidrolisada", "aminoácidos", "soja" ou "HA". Exceção única
(pergunta 7 e tabela): fórmula de seguimento para crianças na primeira infância sem marcador
dietoterápico, com idade inicial ≥ 12 meses explícita, que recebe advertência 2 anos.

**Pendente.** Nenhuma norma a mais é necessária para manter o bloqueio. Para liberar no futuro: consulta
à Anvisa e classificação pelo registro do produto (categoria no rótulo), não pelo título.

---

## 5. Produto vedado na pesquisa, na página e no histórico

**Resposta curta.** Sim, provavelmente ainda viola. Mostrar mamadeira ou fórmula para lactentes na
pesquisa, com preço e link comissionado, é "divulgação por meios eletrônicos" com objetivo de induzir a
compra, e o art. 5º inclui "publicidade indireta". O histórico de preço do mesmo produto também.

**Fundamento.** Decreto, art. 5º, caput ("em quaisquer meios de comunicação, incluídas a publicidade
indireta ou oculta e a divulgação por meios eletrônicos") e parágrafo único ("descontos de preço [...],
apresentações especiais"); art. 4º, XXXVI (a definição inclui atividades "informativas").

**Grau de certeza.** Médio.

**Leitura contrária (forte).** A própria loja mostra fórmula e mamadeira com preço no seu site, e isso
é venda, não promoção: a NBCAL veda a promoção, não a comercialização. Uma listagem neutra, sem
destaque, seria equivalente à gôndola. Para a loja, essa leitura é boa. Para o app, ela enfraquece:
o app não vende, e a única razão de listar o produto é levar o usuário à compra comissionada,
comparando preços. O histórico de 180 dias com "menor preço" é exatamente o tipo de destaque que
induz a compra.

**Mais segura × mais provável.** Mais segura: vedado em tudo. Mais provável: vedado em tudo também, com
certeza menor na pesquisa sem destaque. A receita perdida é pequena perto do risco: há monitoramento
ativo de infrações online (IBFAN/IDEC).

**Regra para o app.**
- Produto marcado `vedado_nbcal` ou `cautela_sem_norma` **não entra no índice de pesquisa**, não tem
  página, não pode ser seguido, não gera evento de preço visível e não aparece no histórico.
- O coletor continua gravando o preço internamente (auditoria e reclassificação), sem expor por API.
- Pesquisa cujo termo case com a lista vedada (ex.: "mamadeira", "nan 1", "aptamil") devolve estado
  vazio com texto fixo: "Este tipo de produto não é exibido no app por exigência da Lei 11.265/2006."
  Sem sugestão de produto alternativo e sem link.
- Se um produto já seguido for reclassificado como vedado: remover o seguimento, apagar avisos
  pendentes e mostrar na central, sem push, um aviso sem nome de marca: "Um produto que você seguia
  deixou de ser exibido por exigência legal."

**Pendente.** **[revisão OAB]**. Se a revisão aceitar a leitura contrária, o máximo a liberar seria a
pesquisa sem preço; não recomendo.

---

## 6. Push e central de avisos para produto com advertência

**Resposta curta.** A notificação do sistema não cumpre o art. 6º: não tem moldura, a fonte e o tamanho
são do sistema e o texto é cortado. Produto com advertência **não deve ter push que o identifique**. A
central de avisos, que é tela do app, cumpre a norma se usar a forma do art. 6º.

**Fundamento.** Decreto, art. 6º, § 1º ("legíveis e apresentados em moldura, próximos aos produtos") e
§ 2º ("caixa alta, em negrito [...] no mínimo, vinte por cento do tamanho do maior caractere [...] com
tamanho mínimo de dois milímetros"). O caput diz "observado o correspondente meio de divulgação", mas
o § 2º não abre exceção por meio escrito.

**Grau de certeza.** Médio-alto.

**Leitura contrária.** "Observado o correspondente meio de divulgação" permitiria adaptar a forma ao
meio: no push, bastaria o texto inteiro em caixa alta. Problemas: a tela de bloqueio, o relógio e o
resumo de notificações truncam o corpo; o negrito e o tamanho são controlados pelo sistema e pelo
usuário; e não há moldura. O fiscal veria a peça truncada.

**Regra para o app.**
- Push de produto com advertência (2 anos ou 6 meses): **proibido** nomear o produto, a marca, o preço,
  o percentual ou a categoria. Opção permitida: push agregado, só se o usuário tiver outros avisos, com
  texto fixo "Você tem novos avisos no economae", sem relação visível com o produto. O mais seguro é não
  disparar push nenhum quando o único aviso novo for de produto com advertência. Recomendo isso.
- Central de avisos, feed, página do produto e cartão de seguido: advertência em **cada** item, dentro
  do cartão, abaixo do preço, com:
  - moldura (borda de 1 dp ou mais, cor de texto), texto inteiro, nunca truncado nem colapsável;
  - CAIXA ALTA e negrito;
  - altura medida da letra maiúscula ≥ 20% da altura da maior letra ou algarismo do cartão (em geral
    o preço ou o selo "-33%") **e** ≥ 2 mm físicos na tela. No Android: `capHeightPx ≥ 2 × ydpi / 25,4`,
    com `ydpi` de `DisplayMetrics` e a altura obtida por `Paint.getTextBounds("E")`. Na prática, isso
    dá fonte de cerca de 18 sp e 5 a 6 linhas. O cartão precisa ser desenhado para isso;
  - o tamanho mínimo vale com qualquer escala de fonte do usuário (aplicar o máximo entre a escala do
    sistema e o mínimo calculado).
- Texto de compartilhamento (pergunta 1, e) de produto com advertência: incluir o texto da advertência
  em caixa alta numa linha própria, antes do link. Texto puro não tem moldura nem negrito, então o
  compartilhamento cumpre só em parte. Por isso, a regra recomendada é **sem botão de compartilhar**
  para esses produtos (mais segura). Alternativa, com risco médio: compartilhar com a advertência no
  texto.

**Pendente.** **[revisão OAB]** sobre o push agregado e sobre o compartilhamento. A medição de 2 mm deve
ser testada em aparelho real antes do lançamento.

---

## 7. Leite comum (UHT, em pó, desnatado, bebidas vegetais) em mercearia

**Resposta curta.** Sim: a promoção exige a **advertência 2 anos** (art. 6º, I), embora o leite não
tenha relação com bebê.

**Fundamento.** Decreto, art. 3º, VI: "leites fluidos ou em pó, leites modificados e similares de origem
vegetal", sem condicionar o produto à alimentação infantil. Compare com o inciso I, que só alcança
alimentos "quando comercializados ou apresentados como apropriados" para crianças. O art. 6º, I, aplica
a advertência 2 anos aos incisos III e VI. A Lei, art. 2º, III, e art. 5º, I, dizem o mesmo.

**Prática dos encartes.** Em encartes de supermercado, a frase do Ministério da Saúde costuma aparecer
junto das ofertas de leite. A equipe deve conferir em encartes atuais de duas ou três redes de SP e
guardar cópia como referência de mercado. Não confirmei casos específicos e não os cito.

**Grau de certeza.** Médio-alto.

**Leitura contrária.** A seção do Decreto trata de "alimentos para lactentes e crianças na primeira
infância", e o inciso VI deveria ser lido nesse contexto: só leite apresentado para criança. É uma
leitura sistemática razoável, mas a letra não faz essa ressalva, e a prática do mercado segue a letra.

**Mais segura × mais provável.** As duas coincidem: aplicar a advertência.

**Regra para o app.** A triagem roda em **todo produto, em qualquer categoria** (como a de medicamento,
DECISIONS 24), sobre título e descrição:
- `leite` + (`uht`, `integral`, `desnatado`, `semidesnatado`, `em po`, `longa vida`, `zero lactose`)
  → advertência 2 anos, salvo as exclusões abaixo;
- bebidas vegetais: `bebida de soja`, `bebida vegetal`, `leite de` + (`soja`, `aveia`, `amendoa`, `coco`,
  `arroz`, `castanha`) → advertência 2 anos. Leite de coco culinário (para cozinhar) → **livre**, porque
  não é bebida substituta do leite; identificar por `leite de coco` com volume ≤ 500 ml e sem a palavra
  `bebida`;
- exclusões (livres): `leite fermentado`, `iogurte`, `doce de leite`, `creme de leite`, `leite de
  rosas`, cosméticos com "leite" (`leite hidratante`, `leite de limpeza`, `leite corporal`), alimentos
  "ao leite" (`chocolate ao leite`, `biscoito`);
- sem push (pergunta 6).

**Pendente.** **[revisão OAB]** sobre a leitura sistemática. A lista de exclusões deve ser revisada com
amostra real do catálogo antes do lançamento.

---

## 8. Anúncios de terceiros

**Resposta curta.** Responderiam o anunciante (fabricante ou loja), a rede de anúncios e o app, que é o
meio de divulgação. Sim, o app precisa bloquear essas categorias e documentar que bloqueou.

**Fundamento.**
- Decreto, art. 5º: a vedação vale "em quaisquer meios de comunicação". A infração é a promoção, e quem
  a veicula participa dela. A Lei 6.437/1977 tipifica como infração "fazer propaganda" de produto sob
  vigilância sanitária contrariando a legislação (art. 10, V; usado pela Anvisa em autuações de
  propaganda; texto vigente não conferido no Planalto).
- CDC, art. 38: o ônus de provar a veracidade e a correção da publicidade é de quem a patrocina.
- Autorregulação (CONAR, Código Brasileiro de Autorregulamentação Publicitária): a responsabilidade
  pela observância do Código é do anunciante, da agência e do **veículo** (artigo não confirmado,
  provavelmente o 45). CONAR não multa; recomenda sustação ou alteração.

**Grau de certeza.** Médio quanto à responsabilidade do app como veículo; alto quanto à necessidade
prática de bloquear.

**Leitura contrária.** O app não escolhe o anúncio, que vem de leilão automático, e não teria dolo nem
culpa. Isso pode reduzir a pena (atenuante), mas não afasta o dever de prevenir quando o risco é
conhecido, e agora é.

**Regra para o app.**
- Só contratar rede de anúncios que permita bloquear por categoria **e** por anunciante/domínio. Antes
  de escolher (D28), verificar se a rede tem categoria sensível para "alimentos infantis" ou "produtos
  para bebê".
- Bloquear: categoria de bebê e alimentação infantil inteira; anunciantes e domínios dos fabricantes de
  fórmula, mamadeira e chupeta (lista mantida em config); palavras-chave da lista vedada.
- Anúncios de leite, composto lácteo e papinha não podem ser exibidos (não há como garantir a
  advertência na peça de terceiro): bloquear também.
- Botão "denunciar anúncio" em todo anúncio, com resposta e bloqueio do anunciante em até 48 h.
  Registrar print, data, rede e anunciante.
- Nenhum dado de produtos seguidos ou de categorias de bebê vai para a rede de anúncios (pergunta 10,
  LGPD).
- Cláusula no contrato com a rede: ela se obriga a respeitar os bloqueios e a legislação brasileira.

**Pendente.** **[revisão OAB]** do contrato com a rede de anúncios.

---

## 9. Responsabilidade, órgãos e sanções

**Resposta curta.** Podem ser autuados o app (como veículo, distribuidor ou promotor), a loja (pela
oferta e pelos dados que fornece) e, possivelmente, a rede de afiliados (se fornecer a peça ou o
destaque). A NBCAL é fiscalizada pela vigilância sanitária. O CDC, pelos Procons e pela Senacon.
Concorrentes, cidadãos, IBFAN e IDEC podem denunciar.

**Fundamento.**
- Decreto, art. 27: infração "sujeita o infrator às penalidades previstas na Lei nº 6.437, de 20 de
  agosto de 1977", sem prejuízo do CDC e do ECA. Lei, art. 28: idem.
- Decreto, art. 28: fiscalização por órgãos federais, estaduais, distritais e municipais, com a
  sociedade civil, sob orientação do Ministério da Saúde e da Anvisa. Em SP: vigilância sanitária
  municipal do local da sede da empresa, Centro de Vigilância Sanitária do Estado e Anvisa, em caso de
  alcance nacional.
- Lei 6.437/1977, art. 2º: penas que incluem advertência, multa, apreensão, interdição, proibição de
  propaganda, suspensão de venda, imposição de mensagem retificadora e suspensão de propaganda. § 1º,
  na redação dada pela MP 2.190-34/2001, segundo fontes secundárias (Planalto não abriu): leve
  **R$ 2.000 a R$ 75.000**; grave **R$ 75.000 a R$ 200.000**; gravíssima **R$ 200.000 a
  R$ 1.500.000**. Reincidência dobra a multa (§ 2º). A capacidade econômica do infrator é considerada
  (§ 3º). A gravidade depende de atenuantes e agravantes (art. 4º).
- CDC (Lei 8.078/1990), arts. 55 a 57: sanções administrativas aplicadas por Procon ou Senacon. A
  multa vai de 200 a 3 milhões de vezes a Ufir ou índice que a substitua (art. 57, parágrafo único;
  conferir redação vigente).
- Ação civil pública (Lei 7.347/1985): o Ministério Público e associações de defesa do consumidor
  constituídas há mais de um ano (caso do IDEC) podem pedir em juízo a retirada do conteúdo e
  indenização por dano moral coletivo.
- CONAR: qualquer consumidor ou concorrente pode representar contra a peça.

**Grau de certeza.** Alto quanto aos órgãos e às penas. Valores de multa: médio (só fonte secundária).

**Leitura contrária.** A vigilância sanitária costuma mirar o fabricante e o varejista, não o
intermediário. É uma tendência, não uma regra: monitoramentos recentes da sociedade civil olham
justamente para a internet.

**Regra para o app.** Guardar, por 5 anos, para cada exibição de produto com advertência ou vedado
(o bloqueio também): a classificação, o termo que a disparou, a versão da regra e a data. Isso é a
defesa em caso de autuação. Ter uma página "Como tratamos produtos infantis", que explique a regra
publicamente.

**Pendente.** **[revisão OAB]** quanto ao responsável legal (CNPJ) que vai operar o app e seu enquadramento.

---

## 10. Outros pontos que a equipe não perguntou

1. **Preço de referência (CDC, art. 37, § 1º, e art. 31).** "33% abaixo do preço normal" é publicidade
   enganosa se a referência não for verdadeira ou não for explicada. Regra: toda oferta com percentual
   traz link "como calculamos", com o texto "comparado à mediana do preço nesta loja nos últimos 30
   dias". O cálculo fica auditável (DECISIONS 31 já guarda a cópia). Certeza alta.
2. **Oferta e preço desatualizado (CDC, art. 30).** A oferta suficientemente precisa vincula o
   fornecedor. Se o app mostra preço que a loja não pratica mais, o consumidor reclama do app. Regra:
   mostrar "preço visto às HH:MM de DD/MM" em todo preço; não exibir oferta com coleta mais velha que o
   limite em config. Certeza alta. Ver também art. 7º, parágrafo único, e art. 34 (solidariedade na
   cadeia de fornecimento): **[revisão OAB]** sobre se o app responde solidariamente.
3. **Identificação da publicidade (CDC, art. 36; CONAR).** O link de afiliado é relação comercial e deve
   ser identificado onde aparece: no feed, na página e no texto compartilhado ("link de afiliado:
   o economae recebe comissão"). Se um dia houver destaque pago por loja, ele leva o selo "patrocinado".
   Certeza alta.
4. **Publicidade abusiva (CDC, art. 37, § 2º).** O público é adulto, mas texto que explore o medo ou a
   culpa dos pais ("não deixe seu bebê sem") é arriscado em produto infantil. Regra: textos de push e
   feed são modelos fixos, sem apelo emocional, nunca gerados livremente para categorias de bebê. E nada
   no texto do app recomenda mamadeira, bico, chupeta ou substituto do leite materno (Decreto, art. 20,
   § 1º, aplicado por analogia). Certeza média.
5. **LGPD (Lei 13.709/2018).** Seguir fórmula sem lactose, produto para prematuro ou papinha revela que
   há bebê na casa e, às vezes, uma condição de saúde da criança. Dado referente à saúde é dado pessoal
   sensível (art. 5º, II), e dados de criança exigem o melhor interesse (art. 14). Regra: não usar
   seguidos ou categorias de bebê para perfilar, segmentar anúncio ou enviar à rede de anúncios ou a
   terceiros; retenção mínima; incluir no relatório de impacto. Certeza média. **[revisão OAB]**
   junto com os termos e a política de privacidade.
6. **Comércio eletrônico (Decreto 7.962/2013).** Exige identificação do fornecedor (nome, CNPJ,
   endereço) em sites e apps de oferta. Provavelmente se aplica ao app, por ser meio de oferta. Regra:
   razão social, CNPJ e contato na tela "sobre" e na loja de apps. Certeza média.
7. **ECA (Lei 8.069/1990).** Não encontrei dispositivo que mude a regra para um app voltado a adultos.
   O ECA só entra como lei aplicável na sanção (Decreto, art. 27).
8. **Cruzamento com medicamento.** Pomada para assadura, vitamina e antitérmico infantil podem ser
   medicamento: valem a triagem de medicamento e o parecer da RDC 96/2008. A NBCAL não se aplica a
   eles. Fórmula dietoterápica é alimento, não medicamento: não passa pela RDC 96.
9. **Oferta manual do operador (TIPO E).** A tela do operador deve rodar a mesma triagem e **impedir**
   o cadastro de produto vedado, não só esconder depois. O operador não pode escolher manualmente a
   advertência: ela vem da triagem, e ele só pode marcar um produto como "mais restrito".

---

## Tabela final: tipo de produto → tratamento no app

"Sem push" vale para toda linha com advertência (pergunta 6). "Feed" inclui pesquisa, página do
produto, seguidos e central, sempre com a advertência na forma do art. 6º.

| Produto | Tratamento | Base | Certeza |
|---|---|---|---|
| Fórmula infantil para lactentes (0 a 6 meses) | **vedado em tudo** | Decreto, arts. 3º, IV, e 5º | alta |
| Fórmula de seguimento para lactentes (6 a 12 meses) | **vedado em tudo** | arts. 3º, IV, e 5º | alta |
| Fórmula para recém-nascido de alto risco | **vedado em tudo** | arts. 3º, II, 5º e 16, § 4º | alta |
| Mamadeira, bico, chupeta | **vedado em tudo** | arts. 3º, VII, e 5º | alta |
| Kit que contenha qualquer item acima | **vedado em tudo** | art. 5º, parágrafo único (apresentação especial, venda vinculada) | alta |
| Acessório com o nome do produto vedado (prendedor de chupeta, esterilizador de mamadeira, copo com bico) | **vedado em tudo** (cautela) | publicidade indireta, art. 5º | baixa |
| Protetor de mamilo | **vedado em tudo** (cautela, `cautela_sem_norma`) | nenhuma norma vigente confirmada; RDC 221/2002 revogada | média |
| Fórmula para necessidades dietoterápicas específicas | **vedado em tudo** (cautela) | art. 3º, V, sem restrição na letra; risco de confusão com IV | alta (letra) / média (risco) |
| Composto lácteo indicado para menor de 12 meses | **vedado em tudo** | equiparação ao inciso IV | média |
| Fórmula de seguimento para crianças na primeira infância (≥ 12 meses, sem marcador dietoterápico) | **feed com advertência "2 anos"**, sem push | arts. 3º, III, e 6º, I | alta |
| Composto lácteo (≥ 1 ano ou sem idade) | **feed com advertência "2 anos"**, sem push | lacuna; inciso III ou VI | baixa |
| Leite UHT, integral, desnatado, em pó, zero lactose | **feed com advertência "2 anos"**, sem push | arts. 3º, VI, e 6º, I | média-alta |
| Bebida vegetal (soja, aveia, amêndoa, arroz, castanha, coco para beber) | **feed com advertência "2 anos"**, sem push | arts. 3º, VI ("similares de origem vegetal"), e 6º, I | média-alta |
| Leite condensado | **feed com advertência "2 anos"**, sem push; nunca associado a bebê | arts. 3º, VI, 6º, I, e 14, § 2º | média |
| Leite aromatizado / com chocolate (o produto é leite) | **feed com advertência "2 anos"**, sem push; nunca associado a bebê | arts. 3º, VI, 6º, I, e 14, § 2º | média |
| Papinha, cereal infantil, mingau infantil | **feed com advertência "6 meses"**, sem push | arts. 3º, I, e 6º, II | alta |
| Qualquer alimento ou bebida apresentado para criança de até 6 anos (suco, biscoito, bebida láctea "kids" com idade) | **feed com advertência "6 meses"**, sem push | arts. 3º, I, e 6º, II | média |
| Bebida láctea, achocolatado em pó, iogurte, creme de leite, doce de leite, queijo (sem apresentação infantil) | **livre** | fora do art. 3º | média |
| Leite de coco culinário | **livre** | não é bebida substituta | média |
| Higiene e cuidados do bebê (fralda, lenço, sabonete, xampu), bomba tira-leite, pomada e concha para mamilo | **livre** | fora da NBCAL | alta |
| Medicamento isento de prescrição infantil | **regra de medicamento** (parecer RDC 96/2008) | fora da NBCAL | alta |

Ordem de precedência na triagem: vedado > cautela > advertência 6 meses > advertência 2 anos > livre.
Produto que case com mais de uma advertência (ex.: bebida láctea "kids" com leite): exibir as duas,
cada uma na forma do art. 6º. Na dúvida entre livre e advertência, aplicar a advertência; na dúvida
entre advertência e vedado, vedar.

## Riscos que continuam mesmo seguindo as recomendações (do maior para o menor)

1. **Falso negativo na triagem por texto.** Uma fórmula para lactentes com título incompleto ("NAN 400g",
   "Aptamil Premium") escapa da lista de termos e aparece com desconto. É a infração mais grave e a mais
   provável de acontecer. Mitigação: lista de marcas e linhas em config, revisão humana de toda oferta
   nova nas categorias de bebê e mercearia antes do primeiro push ou da entrada no feed, e alerta
   interno quando aparecer termo de bebê em produto classificado como livre.
2. **Enquadramento do app inteiro como promoção comercial** (pergunta 1) somado a uma advertência fora
   da forma (tamanho errado num aparelho, texto cortado num tablet). Mitigação: teste em aparelhos
   reais, captura de tela automática de cada versão.
3. **Anúncio de terceiro irregular** que passe pelo bloqueio da rede. Mitigação: botão de denúncia,
   auditoria periódica, registro.
4. **Composto lácteo**: a autoridade pode entender que a advertência certa é a de 6 meses, ou que a
   promoção é vedada.
5. **Encarte de loja irregular** reproduzido pelo operador. Mitigação: triagem obrigatória na tela do
   operador.
6. **Reclamação de CDC sobre preço de referência ou preço desatualizado**: risco mais frequente,
   menor por caso.
7. **Compartilhamento editado pelo usuário** (ele apaga a advertência). Mitigação: sem botão de
   compartilhar nesses produtos.
8. **LGPD**: vazamento ou uso indevido de seguidos de bebê como inferência de saúde ou de família.

## Normas citadas

| Norma | Data | Situação |
|---|---|---|
| Lei 11.265 (NBCAL) | 03/01/2006 | vigente; lida no texto atualizado da Câmara; Planalto não abriu daqui |
| Decreto 9.579 (arts. 3º a 28) | 22/11/2018 | vigente; lido na Câmara; alterações posteriores não atingem os arts. 3º a 28 (segundo a Câmara) |
| Decreto 8.552 | 03/11/2015 | **revogado** pelo Decreto 9.579/2018, art. 126, VIII (fonte secundária) |
| Lei 6.437 (infrações sanitárias) | 20/08/1977 | vigente; faixas de multa da MP 2.190-34/2001 **confirmadas só em fonte secundária** |
| MP 2.190-34 | 2001 | altera a Lei 6.437; data exata e vigência pela EC 32/2001 **não confirmadas** |
| RDC Anvisa 908 (bicos, chupetas, mamadeiras) | 19/09/2024, DOU 20/09/2024 | vigente; **lida em cópia secundária**, DOU não abriu |
| RDC Anvisa 221 (chupetas, bicos, mamadeiras e protetores de mamilo) | 05/08/2002 | **revogada** pela RDC 908/2024, art. 12, II (fonte secundária) |
| RDC Anvisa 222 (promoção comercial de alimentos infantis) | 05/08/2002 | **revogada** pela RDC 908/2024, art. 12, III (fonte secundária) |
| Portaria MS 2.051 | 08/11/2001 | **vigência não confirmada** |
| Lei 8.078 (CDC), arts. 7º, 30, 31, 34, 36, 37, 38, 55 a 57 | 11/09/1990 | vigente; artigos citados de memória, **não relidos** nesta rodada |
| Lei 7.347 (ação civil pública) | 24/07/1985 | vigente; **não relida** |
| Lei 13.709 (LGPD), arts. 5º, II, 11 e 14 | 14/08/2018 | vigente; **não relida** |
| Lei 8.069 (ECA) | 13/07/1990 | vigente |
| Decreto 7.962 (comércio eletrônico) | 15/03/2013 | vigente; **não relido** |
| Código Brasileiro de Autorregulamentação Publicitária (CONAR) | 1980, com revisões | autorregulação, não é lei; número do artigo sobre responsabilidade do veículo **não confirmado** |
| IN MAPA 28 (composto lácteo) | 2007 | **não confirmada** (número, data e vigência) |
| PL 3.828/2019 (composto lácteo na NBCAL) | 2019 | projeto, não é norma; situação **não confirmada** |

## Para abrir no navegador (não abriram daqui)

O ambiente deste trabalho é bloqueado pelo Planalto e não conseguiu abrir o DOU. Conferir:

- Lei 11.265/2006, Planalto: https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11265.htm
- Decreto 9.579/2018, Planalto: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9579.htm
- Lei 6.437/1977, Planalto (art. 2º, § 1º, e art. 10, V): https://www.planalto.gov.br/ccivil_03/leis/l6437.htm
- RDC 908/2024, busca no DOU: https://www.in.gov.br/consulta/-/buscar/dou?q=%22RDC+n%C2%BA+908%22
  (cópia secundária usada: https://www.normasbrasil.com.br/norma/resolucao-908-2024_464705.html e
  https://visa.jundiai.sp.gov.br/wp-content/uploads/2024/11/RDC_908_2024-requisitos-sanitarios-dos-bicos-chupetas-e-mamadeiras.pdf)
- Base de atos da Anvisa (situação das RDCs 221 e 222/2002): https://anvisalegis.datalegis.net/
- Portaria MS 2.051/2001: https://bvsms.saude.gov.br/bvs/saudelegis/gm/2001/prt2051_08_11_2001.html
- CDC, Planalto: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- Decreto 7.962/2013, Planalto: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm
- Código do CONAR: http://www.conar.org.br/codigo/
- PL 3.828/2019, consulta pública no Senado: https://www12.senado.leg.br/ecidadania/visualizacaomateria?id=137513
- IN MAPA 28/2007, busca no DOU: https://www.in.gov.br/consulta/-/buscar/dou?q=%22composto+l%C3%A1cteo%22

## Onde a revisão por advogado é indispensável

1. Enquadramento do app como promoção comercial e como distribuidor (pergunta 1).
2. Composto lácteo e protetor de mamilo (perguntas 2 e 3), de preferência com consulta formal à Anvisa.
3. Push agregado e compartilhamento (pergunta 6).
4. Responsabilidade solidária do app no CDC e contrato com a rede de anúncios (perguntas 8 e 10).
5. Termos de uso e política de privacidade, inclusive o tratamento de seguidos de bebê (LGPD).
