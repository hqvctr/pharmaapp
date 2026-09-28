# design-tokens — economae

Fonte única de cor, tipografia, espaço, raio, elevação, alvo de toque, ícone, movimento e peso de
imagem. Tema claro e escuro.

| Arquivo | O que é |
|---|---|
| `tokens.json` | **Fonte da verdade.** Editar só aqui. |
| `gerar.mjs` | Gera os derivados e **falha se algum par de contraste ficar abaixo do mínimo**. |
| `build/tokens.css` | Variáveis CSS (usadas pelo `../prototipo.html`, que recebe uma cópia embutida). |
| `build/contraste.md` | Tabela de contraste calculada (a mesma abaixo). |
| `../../android/app/src/main/java/app/promocao/ui/theme/Tokens.kt` | Tema pronto para o app (Compose). |

```bash
node ux/design-tokens/gerar.mjs
```

## Regras

- **Marca separada do resto** (`marca`): é a única parte que muda por tenant (S-21).
- **Preço nunca em vermelho.** Vermelho puro tem 4,0:1 sobre branco e significa erro (AUDITORIA A01).
  O preço usa `texto` (17:1).
- **Nada comunicado só por cor.** Todo papel colorido (economia, prova, condição, erro, anúncio) tem
  ícone e texto junto.
- **Tipografia em sp** no app; no protótipo, em px com a escala da fonte do sistema aplicada dentro do
  quadro do celular. Para 130% e 200% o gerador usa uma **aproximação da curva não linear do
  Android 14+** (texto grande cresce menos que texto pequeno). A tabela foi escrita de memória a
  partir do comportamento documentado da `FontScaleConverter` do AOSP; não conferi o código-fonte
  nesta sessão (SUPOSICOES S-29). No app, quem aplica a curva é o próprio sistema.
- **Informação essencial ≥ 14 sp.** 12 sp só para o que se repete em outro lugar.
- **Ícones:** Material Symbols Rounded (Apache 2.0). Mapa por papel em `tokens.json › icone.mapa`.
- **Movimento:** nada depende de animação; "remover animações" / `prefers-reduced-motion` zera tudo.

## Contraste (gerado)

Fórmula WCAG 2.x (luminância relativa). Mínimos: 4,5:1 texto; 3:1 componente e borda.

<!-- contraste:inicio -->
| Par | Mínimo | Claro | Escuro | Resultado |
|---|---|---|---|---|
| `texto` sobre `superficie` | 4.5:1 | 16.29:1 | 14.49:1 | passa |
| `texto` sobre `superficieCartao` | 4.5:1 | 17.09:1 | 13.32:1 | passa |
| `texto` sobre `superficieContainer` | 4.5:1 | 14.75:1 | 12.32:1 | passa |
| `textoSecundario` sobre `superficie` | 4.5:1 | 8.93:1 | 10.94:1 | passa |
| `textoSecundario` sobre `superficieCartao` | 4.5:1 | 9.36:1 | 10.06:1 | passa |
| `textoSecundario` sobre `superficieContainer` | 4.5:1 | 8.08:1 | 9.30:1 | passa |
| `economia` sobre `superficieCartao` | 4.5:1 | 8.21:1 | 10.48:1 | passa |
| `sobreEconomiaContainer` sobre `economiaContainer` | 4.5:1 | 10.78:1 | 10.11:1 | passa |
| `prova` sobre `superficieCartao` | 4.5:1 | 8.11:1 | 9.94:1 | passa |
| `sobreProvaContainer` sobre `provaContainer` | 4.5:1 | 11.72:1 | 10.35:1 | passa |
| `sobreCondicaoContainer` sobre `condicaoContainer` | 4.5:1 | 9.95:1 | 9.21:1 | passa |
| `condicaoBorda` sobre `superficieCartao` | 3:1 | 5.65:1 | 7.86:1 | passa |
| `erro` sobre `superficieCartao` | 4.5:1 | 6.54:1 | 10.01:1 | passa |
| `sobreErroContainer` sobre `erroContainer` | 4.5:1 | 12.77:1 | 7.17:1 | passa |
| `sobreAnuncioContainer` sobre `anuncioContainer` | 4.5:1 | 8.06:1 | 9.01:1 | passa |
| `anuncioBorda` sobre `superficie` | 3:1 | 4.23:1 | 5.90:1 | passa |
| `contorno` sobre `superficieCartao` | 3:1 | 4.59:1 | 5.40:1 | passa |
| `provaRegua` sobre `superficieCartao` | 3:1 | 8.11:1 | 9.94:1 | passa |
| `marca.sobrePrimaria` sobre `marca.primaria` | 4.5:1 | 6.50:1 | 7.65:1 | passa |
| `marca.primaria` sobre `superficie` | 4.5:1 | 6.19:1 | 10.86:1 | passa |
| `marca.sobrePrimariaContainer` sobre `marca.primariaContainer` | 4.5:1 | 13.09:1 | 7.19:1 | passa |
<!-- contraste:fim -->
