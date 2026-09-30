import { describe, expect, it } from 'vitest';
import { emSilencio, horaLocal, limiteDoDia, montarMensagem, type OfertaParaPush } from './regras.js';

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
  const base: OfertaParaPush = {
    ofertaId: 'o1',
    produto: { nome: 'Fralda Marca Z G 36 Unidades' },
    loja: { nome: 'Farmácia Teste A' },
    precoEfetivoCentavos: 4990,
    precoReferenciaCentavos: 7290,
    queda: 0.3155,
    condicao: null,
    avisos: [],
  };

  it('preço por embalagem, referência, queda e loja; dados para abrir a oferta', () => {
    expect(montarMensagem(base, 'e1')).toEqual({
      titulo: 'Fralda Marca Z G 36 Unidades',
      corpo: 'R$ 49,90 (referência R$ 72,90, 32% abaixo) · Farmácia Teste A',
      dados: { tipo: 'oferta', ofertaId: 'o1', entregaId: 'e1' },
    });
  });

  it('condição vem primeiro e o aviso legal vai inteiro', () => {
    const aviso = 'O Ministério da Saúde informa: o aleitamento materno evita infecções e alergias e é recomendado até os 2 (dois) anos de idade ou mais.';
    const m = montarMensagem({ ...base, condicao: 'Leve 3, pague 2', avisos: [aviso] }, 'e1');
    expect(m.corpo.startsWith('Leve 3, pague 2 · R$ 49,90')).toBe(true);
    expect(m.corpo.endsWith(`\n${aviso}`)).toBe(true);
  });

  it('título longo é encurtado', () => {
    const m = montarMensagem({ ...base, produto: { nome: 'x'.repeat(100) } }, 'e1');
    expect(m.titulo).toHaveLength(65);
    expect(m.titulo.endsWith('…')).toBe(true);
  });
});
