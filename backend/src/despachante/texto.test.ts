import { describe, expect, it } from 'vitest';
import { emSilencio, horaLocal } from './enviar.js';
import { montarMensagem, reais, type AvisoParaTexto } from './texto.js';

const FUSO = 'America/Sao_Paulo';
const base: AvisoParaTexto = {
  id: 'a1', tipo: 'promocao_excepcional', product_id: 'p1', alert_id: 'al1', nome: 'Fralda Pampers G 60 unidades',
  loja_nome: 'Drogasmil', preco_centavos: 5990, queda: 0.3344, valida_ate: null,
};

describe('texto do push', () => {
  it('cada tipo tem o seu título; o corpo traz produto, preço da embalagem e loja', () => {
    expect(montarMensagem(base, FUSO, 600)).toEqual({
      titulo: 'Promoção excepcional',
      corpo: 'Fralda Pampers G 60 unidades por R$ 59,90 na Drogasmil (33% abaixo do normal)',
      dados: { aviso_id: 'a1', tipo: 'promocao_excepcional', produto_id: 'p1', alerta_id: 'al1' },
      colapso: 'p1',
      ttlSegundos: 600,
    });
    expect(montarMensagem({ ...base, tipo: 'queda_percentual', queda: 0.12, alert_id: null }, FUSO, 60)).toMatchObject({
      titulo: 'Baixou 12%', corpo: 'Fralda Pampers G 60 unidades por R$ 59,90 na Drogasmil', dados: { aviso_id: 'a1', tipo: 'queda_percentual', produto_id: 'p1' },
    });
    expect(montarMensagem({ ...base, tipo: 'voltou_estoque', queda: null }, FUSO, 60).titulo).toBe('Voltou ao estoque');
    expect(montarMensagem({ ...base, tipo: 'menor_preco_180d', queda: null }, FUSO, 60).titulo).toBe('Menor preço em 180 dias');
  });

  it('promoção acabando diz até quando, na hora do tenant', () => {
    const m = montarMensagem({ ...base, tipo: 'promocao_acabando', queda: null, valida_ate: new Date('2026-11-02T02:30:00Z') }, FUSO, 60);
    expect(m).toMatchObject({ titulo: 'Promoção acabando', corpo: 'Fralda Pampers G 60 unidades por R$ 59,90 na Drogasmil, até 01/11 às 23:30' });
  });

  it('nome longo é cortado; preço com milhar e centavos', () => {
    const m = montarMensagem({ ...base, nome: `Kit ${'enxoval '.repeat(20)}`, preco_centavos: 123456, queda: null }, FUSO, 60);
    expect(m.corpo.startsWith('Kit enxoval')).toBe(true);
    expect(m.corpo).toContain('… por R$ 1.234,56 na Drogasmil');
    expect(reais(5)).toBe('R$ 0,05');
  });
});

describe('horário de silêncio', () => {
  it('hora local do tenant', () => {
    expect(horaLocal(new Date('2026-11-01T12:00:00Z'), FUSO)).toBe('09:00');
    expect(horaLocal(new Date('2026-11-01T03:05:00Z'), FUSO)).toBe('00:05');
  });
  it('janela no mesmo dia e janela que cruza a meia-noite; o fim não está dentro', () => {
    expect([emSilencio('12:59', '13:00', '15:00'), emSilencio('13:00', '13:00', '15:00'), emSilencio('15:00', '13:00', '15:00')]).toEqual([false, true, false]);
    expect([emSilencio('21:59', '22:00', '07:00'), emSilencio('23:30', '22:00', '07:00'), emSilencio('06:59', '22:00', '07:00'), emSilencio('07:00', '22:00', '07:00')]).toEqual([false, true, true, false]);
  });
});
