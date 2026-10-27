# Prompt: consultoria jurídica sobre a Anvisa (comparador de preços de medicamento com afiliado)

Cole o bloco abaixo inteiro numa conversa nova, de preferência numa ferramenta com acesso à internet e
capaz de abrir o DOU e o portal da Anvisa. Depois cole aqui a resposta, que deve vir como **um único
documento Markdown**, dentro de um bloco de código de quatro crases.

Anexos úteis, se a ferramenta aceitar: `docs/juridico/parecer-rdc96.md` (resposta anterior, só a
pergunta 9 e a seção "Pendências" interessam) e `docs/juridico/consulta-anvisa-minuta.md`.

---

Você é consultor jurídico sênior, especialista em direito sanitário, regulação da Anvisa e comércio
eletrônico de medicamentos no Brasil. Vai dar um parecer técnico para a equipe de produto de um app. A
pergunta central é regulatória e precisa ser respondida com **fontes primárias** (Diário Oficial da União,
portal da Anvisa, sites oficiais do Planalto e da Câmara). Escreva em português claro.

## O app (fatos; não presuma nada além disto)
- Nome provisório "economae". App de celular (Android; iPhone depois), estado de São Paulo, pessoa física
  maior de idade como usuária.
- **Não vende, não recebe pedido, não recebe pagamento e não é farmácia.** Reúne ofertas de farmácias e
  drogarias licenciadas (hoje Drogasil e Droga Raia), obtidas por uma rede de afiliados (Lomadee).
- O botão da oferta leva a pessoa ao **site da própria farmácia**, por link de afiliado. O app ganha
  **comissão** da rede sobre a venda concluída no site da farmácia e avisa isso na tela.
- Mostra preço atual, histórico de preço do produto na mesma loja e avisos de queda (feed, notificação e
  central de avisos). Pode ter anúncios de terceiros no plano grátis.
- **Não dá orientação de uso, dose ou indicação.**
- Medicamento está **desligado** no app. Nada é divulgado até esta consulta e a revisão de um advogado.
  Já bloqueamos: medicamento de prescrição, controle especial, promoção por quantidade, brinde e sorteio.

## O que já se sabe (confira tudo; algo pode estar errado)
Um consultor anterior, lendo parte em fonte secundária, afirmou:
- RDC Anvisa 44, de 17/08/2009, art. 53, § 2º: "É vedada a oferta de medicamentos na internet em sítio
  eletrônico que não pertença a farmácias ou drogarias autorizadas e licenciadas pelos órgãos de
  vigilância sanitária competentes." Art. 53, caput: o pedido pela internet é feito pelo sítio do
  estabelecimento ou da rede, em domínio ".com.br", com razão social, CNPJ, farmacêutico responsável,
  licença sanitária e AFE na página principal. Art. 52: só farmácias e drogarias abertas ao público, com
  farmacêutico presente, dispensam medicamento pedido por meio remoto.
- Lei 15.357, de 20/03/2026 (DOU 23/03/2026), teria acrescentado o § 6º ao art. 6º da Lei 5.991/1973:
  farmácias licenciadas "poderão contratar canais digitais e plataformas de comércio eletrônico" para
  logística e entrega, cumprida a regulamentação sanitária.
- Em 2026 a Anvisa teria: revogado medidas preventivas contra plataformas (ressalvando que isso não
  autoriza venda livre); aberto em 19/08/2026 processo para regulamentar o tema; notificado um marketplace
  em 29/09/2026; iniciado a revisão da RDC 96/2008 para redes sociais, comércio eletrônico e influenciadores.
- Nada disso foi conferido no DOU nem no portal da Anvisa.

## Perguntas (responda todas)
1. **Texto vigente.** Qual é o texto vigente da RDC 44/2009, arts. 51 a 54 (com todas as alterações)? A
   norma foi alterada ou revogada em parte? Cite as alterações com número e data.
2. **Lei 15.357/2026.** Ela existe? Qual é o texto exato do dispositivo sobre canais digitais e plataformas?
   Ela autoriza, restringe ou deixa de tratar a **divulgação de ofertas por terceiros** que não contratam a
   entrega? Há regulamentação prevista, e com que prazo?
3. **Ações da Anvisa em 2026.** Confirme, com a fonte oficial (portaria, nota, edital, consulta pública,
   processo SEI, página do portal), cada uma das ações listadas acima. Diga o que **não** conseguiu
   confirmar. Há consulta pública aberta? Qual o prazo e como contribuir?
4. **O comparador "oferta" medicamento?** Um aplicativo que (a) não vende nem recebe pedido, (b) mostra
   preço de medicamento de farmácias licenciadas e (c) leva a pessoa ao site da farmácia por link de
   afiliado, comissionado, está sujeito à vedação do art. 53, § 2º da RDC 44/2009? Responda separadamente
   para: (i) preço em lista, sem destaque; (ii) preço com percentual de desconto; (iii) aviso por
   notificação ou central; (iv) link de afiliado com comissão.
5. **Prática e precedentes.** Há decisão, nota técnica, resposta a consulta, termo de ajustamento,
   processo administrativo ou judicial sobre **comparadores de preço, agregadores, cupons e programas de
   afiliados** de medicamento? Como a Anvisa ou as vigilâncias sanitárias trataram? Só cite o que puder
   identificar (órgão, número, data); sem isso, diga que não encontrou.
6. **Enquadramento.** O app seria "estabelecimento", "intermediário", "divulgador", "plataforma de
   comércio eletrônico" ou outra figura, na legislação sanitária vigente? Precisa de alguma licença, AFE,
   autorização, contrato com a farmácia ou aviso? A **comissão** muda esse enquadramento?
7. **Outros órgãos.** Vigilância sanitária estadual de SP e municipal, conselho de farmácia (CRF-SP),
   Procon e Senacon têm competência concorrente sobre o app? Há norma estadual ou municipal em SP que
   restrinja a divulgação ou o comércio eletrônico de medicamentos?
8. **Caminhos de menor risco.** Descreva, em ordem do mais seguro ao mais arriscado, os desenhos de produto
   que o app poderia adotar. Exemplos a avaliar: medicamento fora do app; só lista de preços de OTC; só
   OTC com link para o site da farmácia; parceria formal com a farmácia (a farmácia contrata o app, que
   passa a ser seu canal de divulgação); contratação do app pela farmácia como "canal digital"; busca de
   preço sem link de compra. Diga o que muda em cada um.
9. **Consulta formal.** Vale a pena protocolar a consulta à Anvisa? Qual o **canal correto** (protocolo
   eletrônico, SEI, Fale Conosco, Ouvidoria, consulta à Gerência-Geral competente), quem assina, o prazo
   de resposta usual e o valor jurídico da resposta (vincula a agência ou é só orientação)? Quais riscos de
   chamar a atenção da fiscalização ao consultar?
10. **Plano B de prazo.** Se a resposta da Anvisa demorar meses, o que o app pode fazer sem
    medicamento, e o que **não** pode, enquanto isso (por exemplo, anunciar "em breve", coletar interesse,
    manter a pesquisa de produtos de farmácia não medicamentos)? Cosméticos, higiene e produtos para bebê
    de farmácia (fraldas, lenços, protetor solar) são afetados por alguma regra do mesmo tipo?

## Como responder
Para **cada** pergunta, nesta ordem:
- **Resposta curta** (sim, não ou depende, em até duas frases).
- **Fundamento**: norma, artigo, inciso e trecho literal curto, com **link da fonte primária** e a data em
  que você abriu. Diferencie lei, decreto, resolução, nota técnica e matéria jornalística.
- **Grau de certeza**: alto, médio ou baixo, e por quê.
- **Leitura contrária**: a interpretação divergente mais forte.
- **Regra para o app**: o que o produto faz ou deixa de fazer, escrito para um programador e para o
  responsável decidirem sem interpretar.
- **Pendente**: o que exige advogado inscrito na OAB, consulta formal ou norma que você não conseguiu abrir.

## Formato da entrega (obrigatório)
Devolva **um único documento em Markdown**, dentro de um bloco de código de quatro crases. Nada de texto
fora do bloco. Esqueleto:

1. `# Parecer técnico: a Anvisa e o comparador de preços de medicamento do app economae`, com a data da
   consulta e a lista de **cada fonte primária aberta** (URL e data de acesso) e de **cada fonte que não
   abriu** (e por quê).
2. `## Resumo em dez linhas`: a conclusão e a recomendação de caminho.
3. `## Respostas`: uma seção por pergunta (1 a 10).
4. `## Matriz de desenhos de produto`: uma linha por desenho da pergunta 8, com **risco regulatório**
   (baixo, médio, alto), **o que o app faz**, **o que precisa existir antes** e **fundamento**.
5. `## Consulta formal pronta`: o texto final da consulta à Anvisa, revisado (corrija a minuta anexa se
   houver erro), com os campos que faltam entre colchetes, e a **lista de documentos a anexar**.
6. `## Passo a passo do protocolo`: canal, quem assina, como acompanhar, prazo esperado.
7. `## Riscos que permanecem`, do maior para o menor.
8. `## Pendências`: o que depende de advogado, da Anvisa ou de leitura de norma, com o motivo.
9. `## Normas e documentos citados`: número, data, situação (vigente, revogada, em consulta, não
   confirmada) e se foi lida em fonte primária.

## Regras
- **Não invente** artigo, número de norma, decisão, processo, nota técnica, multa ou data. Se não abrir a
  fonte primária, escreva "não confirmado" e explique. Fonte secundária (imprensa, escritório de advocacia,
  blog) só entra marcada como tal e nunca sustenta sozinha uma conclusão de grau "alto".
- Não responda "consulte um advogado" no lugar da análise: faça a análise e marque o que precisa de
  revisão humana.
- Não amplie o escopo para advertências, forma de propaganda ou LGPD (há consultas separadas para isso).
- Na dúvida entre duas leituras, diga qual é a mais segura e qual é a mais provável; não as confunda.
- Este parecer orienta a equipe e será revisado por advogado inscrito na OAB antes de qualquer protocolo
  ou publicação; diga explicitamente onde essa revisão é indispensável.
