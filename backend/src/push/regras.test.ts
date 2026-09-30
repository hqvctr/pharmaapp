import { describe, expect, it } from 'vitest';
import { emSilencio, horaLocal, limiteDoDia, MAX_CORPO, MAX_TITULO, montarMensagem, type ContextoPush, type OfertaParaPush } from './regras.js';

describe('silêncio e limite', () => {
  it('hora local em São Paulo', () => {
    expect(horaLocal(new Date('2026-09-30T01:30:00Z'), 'America/Sao_Paulo')).toBe('22:30');
  });

  it.each([
    ['22:30', '22:00', '07:00', true],
    ['06:59', '22:00', '07:00', true],
    ['07:00', '22:00', '07:00', false],
    ['12:00', '22:00', '07:00', false],
    ['13:30', '13:00', '15:00', true],
    ['15:00', '13:00', '15:00', false],
    ['03:00', null, null, false],
  ])('%s com silêncio %s–%s: %s', (hora, ini, fim, esperado) => {
    expect(emSilencio(hora, ini, fim)).toBe(esperado);
  });

  it('limite do dia: escolha da mãe, senão o padrão, nunca acima do máximo', () => {
    expect(limiteDoDia(null, 3, 10)).toBe(3);
    expect(limiteDoDia(1, 3, 10)).toBe(1);
    expect(limiteDoDia(50, 3, 10)).toBe(10);
  });
});

describe('montarMensagem', () => {
  const aviso = 'O Ministério da Saúde informa: o aleitamento materno evita infecções e alergias e é recomendado até os 2 (dois) anos de idade ou mais.';
  const base: OfertaParaPush = {
    ofertaId: 'o1',
    produto: { nome: 'Protetor Solar Infantil FPS 50', categoria: 'higiene_cuidados_bebe', tamanhoFralda: null },
    loja: { nome: 'Farmácia Teste A' },
    precoCentavos: 3990,
    precoEfetivoCentavos: 3990,
    precoReferenciaCentavos: 5990,
    queda: 0.3339,
    condicao: null,
    avisos: [],
    prova: { menorPrecoCentavos: 4290, maiorPrecoCentavos: 6490, diasMedidos: 180 },
  };
  const ctx: ContextoPush = { condicao: null, rotuloCategoria: 'Higiene e cuidados do bebê', privado: false };

  it('preço primeiro no título, prova no corpo, sem "referência" nem percentual', () => {
    const m = montarMensagem(base, 'e1', ctx);
    expect(m.titulo).toBe('R$ 39,90 · Protetor Solar…');
    expect(m.corpo).toBe('Menor preço em 6 meses: R$ 20,00 a menos');
    expect(m.expandido).toBe([
      'Menor preço em 6 meses: R$ 20,00 a menos',
      'Preço normal nesta loja: R$ 59,90.',
      'Menor preço dos últimos 6 meses.',
      'Você segue Higiene e cuidados do bebê.',
    ].join('\n'));
    expect(m.dados).toEqual({ tipo: 'oferta', ofertaId: 'o1', entregaId: 'e1', loja: 'Farmácia Teste A', privado: '0' });
    expect(`${m.titulo} ${m.expandido}`).not.toMatch(/referência|% abaixo/);
  });

  it('leve 3 pague 2: título com o que sai do bolso e tamanho da fralda; condição abre o corpo', () => {
    const fralda: OfertaParaPush = {
      ...base,
      produto: { nome: 'Fralda Bebê Seco', categoria: 'fraldas_lencos', tamanhoFralda: 'G' },
      precoCentavos: 8070, precoEfetivoCentavos: 5380, precoReferenciaCentavos: 7990,
      condicao: 'Leve 3, pague 2', prova: { menorPrecoCentavos: 6290, maiorPrecoCentavos: 8490, diasMedidos: 180 },
    };
    const m = montarMensagem(fralda, 'e1', { ...ctx, condicao: { tipo: 'leve_pague', leve: 3, pague: 2 }, rotuloCategoria: 'Fraldas e lenços' });
    expect(m.titulo).toBe('R$ 161,40 por 3 · Fralda Bebê…');
    expect(m.corpo).toBe('Leve 3, pague 2 · economia de R$ 78,30');
  });

  it('histórico curto não promete 6 meses; sem prova, só a economia', () => {
    expect(montarMensagem({ ...base, prova: { ...base.prova!, diasMedidos: 94 } }, 'e1', ctx).corpo).toBe('Menor preço em 94 dias: R$ 20,00 a menos');
    expect(montarMensagem({ ...base, prova: null }, 'e1', ctx).corpo).toBe('R$ 20,00 abaixo do normal da loja');
  });

  it('cartão com nome longo cai no texto genérico sem perder a condição', () => {
    const m = montarMensagem(base, 'e1', { ...ctx, condicao: { tipo: 'cartao_fidelidade', programa: 'Programa de Fidelidade Muito Comprido' } });
    expect(m.corpo).toBe('Só com cartão da loja · R$ 20,00 a menos');
  });

  it('o aviso da NBCAL vai inteiro no texto expandido', () => {
    const m = montarMensagem({ ...base, avisos: [aviso] }, 'e1', ctx);
    expect(m.expandido.endsWith(`\n${aviso}`)).toBe(true);
  });

  it('categoria privada marca a mensagem para o app esconder o produto na tela bloqueada', () => {
    expect(montarMensagem(base, 'e1', { ...ctx, privado: true }).dados.privado).toBe('1');
  });

  it('nunca passa de 30 no título nem de 40 no corpo', () => {
    for (const nome of ['x'.repeat(100), 'Fralda Descartável Premium Protect Plus Mega Pacote', 'A']) {
      for (const preco of [590, 3990, 123456]) {
        const m = montarMensagem({ ...base, produto: { ...base.produto, nome }, precoCentavos: preco, precoEfetivoCentavos: preco, precoReferenciaCentavos: preco * 2 }, 'e1', ctx);
        expect(m.titulo.length).toBeLessThanOrEqual(MAX_TITULO);
        expect(m.titulo.startsWith('R$')).toBe(true);
        expect(m.corpo.length).toBeLessThanOrEqual(MAX_CORPO);
      }
    }
  });
});
