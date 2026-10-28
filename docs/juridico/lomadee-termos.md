# Lomadee: leitura dos termos de uso e da política de privacidade (2026-10-28)

Fonte: PDF baixado pelo responsável a partir da conta (texto em `docs/juridico/fontes/lomadee-termos-e-privacidade-2026-10-28.txt`).
O PDF traz o contrato do "Consultor" (afiliado) e a Política de Privacidade (vigente desde junho/2025). **Leitura técnica da
equipe de produto, sem revisão de advogado.** O contrato cita telas do endereço `beta.lomadee.com`, tem restos de outro nome
("SOCIASOUL") e não tem data nem versão: pode estar desatualizado. **Ele não trata da API de produtos.**

## O que o contrato diz e o que muda para o app

| Cláusula | O que diz | Regra para o app |
|---|---|---|
| 1.1 "aa" | O canal do consultor pode ser "aplicativos diversos, inclusive de celulares". | O app é canal válido. |
| 4.2 | Só maior de 18 anos ou emancipado. Pessoa física pode se cadastrar. | OK para o responsável. |
| 10.1 "h" | Não divulgar marcas, produtos ou serviços das marcas "por outro modo que não a Plataforma de consultores", sem autorização expressa. | **Todo botão que leva à loja precisa usar o link rastreado da Lomadee** (encurtador, ainda não ligado). Mostrar oferta com o link comum da loja pode contar como divulgar por fora. |
| 8.1 a 8.3 | Só vale clique espontâneo. É "geração artificial" oferecer vantagem ou troca de favores para clicar, ou induzir por mensagem (spam). | **Nada de prêmio, cashback, pontos ou sorteio por clicar.** Notificação só com consentimento (já é regra). Perguntar se notificação com link conta como clique espontâneo. |
| 16.1 | Enquanto a marca tiver relacionamento comercial com a Lomadee, o consultor não pode ter vínculo direto com ela sem a Lomadee. | **Atenção ao plano de parceria direta com farmácia e a outras redes:** se Drogasil ou Droga Raia forem clientes da Lomadee (mesmo fora da sua conta), entrar por outra rede ou direto pode violar. Perguntar. |
| 11.1 e 11.2 | Marcas, imagens, textos e dados das marcas são delas; o consultor só usa o que for autorizado, durante a vigência. | Imagem, nome de marca e descrição do produto no app precisam de autorização por escrito. **O que acontece com o histórico guardado se o contrato acabar não está dito.** Perguntar. |
| 4.5, 4.6, 18.1, 18.3 | A Lomadee cancela a afiliação quando entender que o canal não combina com a imagem dela ou das marcas; aviso de 10 dias úteis sem motivo; imediato por infração, com multa igual à última comissão mensal. | **Risco de dependência:** a conta pode ser cancelada de uma hora para outra. Não deixar toda a receita e todos os dados numa fonte só. |
| 13 | Os termos mudam a qualquer momento; 5 dias para recusar. | Reler os termos de tempos em tempos. |
| 12.2 e 4.7 | O consultor responde sozinho pelo conteúdo do canal e ressarce a Lomadee por processo. | O app responde pelo que mostrar. Reforça manter medicamento desligado até o advogado liberar. |
| 10.1 "l" e "i" | Regra quebrada: cancelamento das comissões da marca; fraude: multa de 3 vezes a comissão. | Cuidado com cliques gerados por automação ou incentivo. |
| 7.4 a 7.7 | Pagamento por depósito bancário, com RPA (pessoa física) ou nota fiscal (empresa), em nome da Plugone; taxa de R$ 3 por saque de pessoa jurídica; nota não emitida em 12 meses = perde o saldo. | Conferir com contador. O site diz Pix; o contrato diz depósito. Pessoa física paga imposto como autônomo via RPA: avaliar abrir CNPJ. |
| 21.1 | Foro: Comarca da Capital de São Paulo. | Informativo. |

## O que o contrato NÃO diz (silêncio não é permissão)
- Não fala de **guardar preços para formar histórico**, de **comparar preços**, de **notificar queda de preço** nem de **farmácia ou medicamento**.
- Não fala dos **dados da API** (limite de uso, cache, prazo para guardar).
- Esses pontos precisam de resposta por escrito da Lomadee.

## Política de privacidade (o que importa)
- Ela trata dos dados do **consultor** (nome, CPF, banco, etc.) e da **navegação de quem passa pelos links** (IP, dispositivo, geolocalização, cookies, "web beacons", softwares instalados). Pode guardar fora do Brasil e compartilhar de forma anonimizada com o grupo.
- **Regras para o app:** (1) a política de privacidade do app deve avisar que, ao tocar numa oferta, a pessoa passa pela Lomadee, que coleta dados de navegação; (2) **nunca pôr identificador da pessoa no link** (nem código de usuário, nem e-mail): evita ligar o que a pessoa segue em farmácia (dado de saúde, sensível pela LGPD) a ela; (3) incluir isso na consulta LGPD pendente.
- Contato do encarregado da Lomadee: privacidade@lomadee.com.

## Perguntas para a Lomadee, por escrito (para o suporte)
1. Um aplicativo de celular que compara preços de farmácias e avisa quedas, com histórico de preço, é um canal permitido?
2. Posso guardar os preços coletados pela API para formar histórico? Por quanto tempo, e o que acontece com o histórico se eu sair?
3. Posso exibir nome, imagem e descrição dos produtos das marcas? Preciso de autorização de cada marca?
4. Notificação push com link rastreado conta como clique espontâneo (cláusula 8.1)?
5. Drogasil e Droga Raia são clientes da Lomadee? Se forem, dá para liberar na minha conta? Se não forem, posso usar outra rede sem violar a cláusula 16.1?
6. A API de afiliados tem termos próprios? Onde estão?

## Decisão do projeto (DECISIONS 67)
- Continuar **coletando** (leitura pela API, reversível, sem exibir a ninguém).
- **Não mostrar preços de fonte da Lomadee a usuários** nem lançar alertas antes das respostas 1 a 4 e da revisão de um advogado.
- A fonte continua `em_observacao`.

## Atualização 2026-10-28: tipo de canal por marca
O painel mostra, em "Detalhes" de cada marca, os "Tipos de canais de divulgação permitidos", com o aviso "Divulgar nos canais não permitidos
pode cancelar suas comissões". O canal do economae é "Comparador de Preços": Drogasmil, PromoFarma e BioVittare aceitam; Drogaria Rosário e Beep Saúde
não. A regra está no código (`marcasPermitidasParaLink`, DECISIONS 72). Lista e comissões no relatório em `docs/juridico/fontes/lomadee-marcas-2026-10-28.md`.
