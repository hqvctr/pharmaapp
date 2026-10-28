import { describe, expect, it } from 'vitest';
import { converterCmed, limparGtin, versaoDaCmed } from './cmed.js';
import { gtin14, triarMedicamento, type ListasMedicamentos } from './medicamentos.js';

type Linha = Parameters<typeof converterCmed>[0][number];
const linha = (p: Partial<Linha>): Linha => ({ 'SUBSTÂNCIA': 'PARACETAMOL', REGISTRO: '1', 'EAN 1': '7891000000011', 'EAN 2': '    -     ', 'EAN 3': '    -     ', PRODUTO: 'X', TARJA: 'Tarja Sem Tarja', ...p });
/** A conversão recusa lista pequena; completa com linhas de enchimento sem EAN. */
const completar = (linhas: Linha[]): Linha[] => [...linhas, ...Array.from({ length: 10_000 }, () => linha({ 'EAN 1': '-', TARJA: 'Tarja Vermelha' }))];

describe('conversão da lista da CMED', () => {
  it('só "Tarja Sem Tarja" é isento; vermelha, sob restrição, preta e "- (*)" não são', () => {
    const { listas } = converterCmed(completar([
      linha({ 'EAN 1': '7891000000011', TARJA: 'Tarja Sem Tarja' }),
      linha({ 'EAN 1': '7891000000028', TARJA: 'Tarja Vermelha' }),
      linha({ 'EAN 1': '7891000000035', TARJA: 'Tarja Vermelha sob restrição' }),
      linha({ 'EAN 1': '7891000000042', TARJA: 'Tarja Preta' }),
      linha({ 'EAN 1': '7891000000059', TARJA: '- (*)' }),
    ]), 'cmed-teste');
    const isento = Object.fromEntries(listas.referencia.map((r) => [r.gtin, r.isentoPrescricao]));
    expect(isento).toEqual({ '7891000000011': true, '7891000000028': false, '7891000000035': false, '7891000000042': false, '7891000000059': false });
  });

  it('um produto vira uma referência por EAN válido (os três), ignorando o traço', () => {
    const { listas } = converterCmed(completar([linha({ 'EAN 1': '7891000000011', 'EAN 2': '7891000000028', 'EAN 3': '    -     ' })]), 'v');
    expect(listas.referencia.map((r) => r.gtin)).toEqual(['7891000000011', '7891000000028']);
  });

  it('substância controlada vem de Tarja Preta e de "sob restrição", sem acento e em minúsculas', () => {
    const { listas, relatorio } = converterCmed(completar([
      linha({ 'SUBSTÂNCIA': 'CODEÍNA;PARACETAMOL', TARJA: 'Tarja Preta', 'EAN 1': '7891000000042' }),
      linha({ 'SUBSTÂNCIA': 'AMOXICILINA', TARJA: 'Tarja Vermelha sob restrição', 'EAN 1': '7891000000035' }),
      linha({ 'SUBSTÂNCIA': 'IBUPROFENO', TARJA: 'Tarja Vermelha', 'EAN 1': '7891000000028' }),
    ]), 'v');
    expect(listas.substanciasControladas).toEqual(['amoxicilina', 'codeina', 'paracetamol']);
    expect(relatorio.substanciasControladas).toBe(3);
  });

  it('GTIN repetido com tarjas diferentes: vale o mais restritivo', () => {
    const { listas, relatorio } = converterCmed(completar([
      linha({ 'EAN 1': '7891000000011', TARJA: 'Tarja Sem Tarja' }),
      linha({ 'EAN 1': '7891000000011', TARJA: 'Tarja Vermelha' }),
    ]), 'v');
    expect(listas.referencia[0]!.isentoPrescricao).toBe(false);
    expect(relatorio.gtinsConflitantes).toBe(1);
  });

  it('tarja nova (desconhecida) fica não isenta e é contada no relatório', () => {
    const { listas, relatorio } = converterCmed(completar([linha({ TARJA: 'Tarja Azul' })]), 'v');
    expect(listas.referencia[0]!.isentoPrescricao).toBe(false);
    expect(relatorio.tarjasDesconhecidas).toEqual({ 'Tarja Azul': 1 });
  });

  it('lista pequena demais é recusada', () => {
    expect(() => converterCmed([linha({})], 'v')).toThrow(/arquivo incompleto/);
  });

  it('saída inclui termos de bloqueio, versão e fonte', () => {
    const { listas } = converterCmed(completar([linha({})]), 'cmed-2026-10-09');
    expect(listas.versao).toBe('cmed-2026-10-09');
    expect(listas.termosBloqueados).toContain('tarja preta');
    expect(listas.fonte).toMatch(/CMED/);
  });

  it('limparGtin aceita 8 a 14 dígitos e recusa o resto', () => {
    expect([limparGtin('7891000000011'), limparGtin(' 12345678 '), limparGtin('-'), limparGtin('123'), limparGtin('78910000000X1'), limparGtin(undefined)]).toEqual(['7891000000011', '12345678', null, null, null, null]);
  });

  it('versão pela data do cabeçalho, ou pelo nome do arquivo', () => {
    expect(versaoDaCmed('x.xlsx', 'Publicada em 09/10/2026 17h30min.')).toBe('cmed-2026-10-09');
    expect(versaoDaCmed('lista_pmc__20261009_115232672.xlsx', undefined)).toBe('cmed-2026-10-09');
    expect(() => versaoDaCmed('x.xlsx', undefined)).toThrow(/data de publicação/);
  });

  it('a referência convertida funciona na triagem: remédio de receita é bloqueado e isento só é liberado fora do modo desligado', () => {
    const { listas } = converterCmed(completar([
      linha({ 'EAN 1': '7891000000011', TARJA: 'Tarja Sem Tarja', 'SUBSTÂNCIA': 'DIPIRONA' }),
      linha({ 'EAN 1': '7891000000028', TARJA: 'Tarja Vermelha', 'SUBSTÂNCIA': 'AMOXICILINA' }),
      linha({ 'EAN 1': '7891000000042', TARJA: 'Tarja Preta', 'SUBSTÂNCIA': 'ALPRAZOLAM' }),
      linha({ 'EAN 1': '7891000000059', TARJA: 'Tarja Sem Tarja', 'SUBSTÂNCIA': 'CODEÍNA;PARACETAMOL' }),
      linha({ 'EAN 1': '7891000000066', TARJA: 'Tarja Preta', 'SUBSTÂNCIA': 'CODEÍNA' }),
    ]), 'v');
    const ls: ListasMedicamentos = { versao: listas.versao, porGtin: new Map(listas.referencia.map((r) => [gtin14(r.gtin), r])), substanciasControladas: new Set(listas.substanciasControladas), termosBloqueados: listas.termosBloqueados };
    const triar = (gtin: string, opcoes = {}) => triarMedicamento({ gtin, titulo: 'Produto', descricao: null, categoria: 'cuidados_pessoais', condicao: null }, ls, 'medicamentos_isentos', opcoes);
    expect(triar('7891000000011')).toMatchObject({ liberado: true, ehMedicamento: true });
    expect(triar('7891000000011', { modo: 'desligado' })).toMatchObject({ codigo: 'MEDICAMENTO_DESLIGADO' });
    expect(triar('7891000000028')).toMatchObject({ codigo: 'MEDICAMENTO_COM_PRESCRICAO' });
    expect(triar('7891000000042')).toMatchObject({ codigo: 'MEDICAMENTO_COM_PRESCRICAO' });
    expect(triar('07891000000028')).toMatchObject({ codigo: 'MEDICAMENTO_COM_PRESCRICAO' });
    // Isento que contém substância controlada (a codeína aparece em produto de tarja preta): bloqueado.
    expect(triar('7891000000059')).toMatchObject({ codigo: 'SUBSTANCIA_CONTROLADA' });
  });
});
