import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizarTexto, triarMedicamento, type ListasMedicamentos, type ProdutoEmTriagem } from './medicamentos.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bruto = JSON.parse(readFileSync(path.join(RAIZ, 'fixtures/medicamentos/listas_teste.json'), 'utf8'));
const listas: ListasMedicamentos = {
  versao: bruto.versao,
  porGtin: new Map(bruto.referencia.map((r: { gtin: string }) => [r.gtin, r])),
  substanciasControladas: new Set(bruto.substanciasControladas.map(normalizarTexto)),
  termosBloqueados: bruto.termosBloqueados,
};
const CAT = 'medicamentos_isentos';

const produto = (p: Partial<ProdutoEmTriagem>): ProdutoEmTriagem => ({
  gtin: null,
  titulo: 'Produto',
  descricao: null,
  categoria: 'cuidados_pessoais',
  condicao: null,
  ...p,
});

describe('triagem de medicamento', () => {
  it.each([
    ['isento de prescrição, na categoria certa', produto({ gtin: '7891000000011', categoria: CAT }), 'liberado'],
    ['isento com dois princípios ativos, nenhum controlado', produto({ gtin: '7891000000028', categoria: CAT }), 'liberado'],
    ['cosmético sem GTIN fora da categoria de medicamentos', produto({ titulo: 'Shampoo 400 ml' }), 'liberado'],
    ['sob prescrição', produto({ gtin: '7891000000035', categoria: CAT }), 'MEDICAMENTO_COM_PRESCRICAO'],
    ['controlado cadastrado como cuidados pessoais', produto({ gtin: '7891000000042' }), 'MEDICAMENTO_COM_PRESCRICAO'],
    ['marcado como isento mas com substância controlada', produto({ gtin: '7891000000059', categoria: CAT }), 'SUBSTANCIA_CONTROLADA'],
    ['medicamento sem GTIN', produto({ categoria: CAT }), 'MEDICAMENTO_SEM_REFERENCIA'],
    ['GTIN fora da referência na categoria de medicamentos', produto({ gtin: '7890000000000', categoria: CAT }), 'MEDICAMENTO_SEM_REFERENCIA'],
    ['termo no título, sem GTIN, categoria errada', produto({ titulo: 'Remédio TARJA PRETA 30 cp' }), 'TERMO_DE_VENDA_CONTROLADA'],
    ['termo sem acento na descrição', produto({ descricao: 'exige retencao de receita' }), 'TERMO_DE_VENDA_CONTROLADA'],
    [
      'leve 3 pague 2 em isento de prescrição (RDC 96/2008)',
      produto({ gtin: '7891000000011', categoria: CAT, condicao: { tipo: 'leve_pague', leve: 3, pague: 2 } }),
      'PROMOCAO_PROIBIDA_PARA_MEDICAMENTO',
    ],
  ])('%s', (_caso, p, esperado) => {
    const r = triarMedicamento(p, listas, CAT);
    expect(r.liberado ? 'liberado' : r.codigo).toBe(esperado);
  });

  it('medicamento isento vindo em outra categoria é recategorizado', () => {
    const r = triarMedicamento(produto({ gtin: '7891000000011', categoria: 'cuidados_pessoais' }), listas, CAT);
    expect(r).toEqual({ liberado: true, ehMedicamento: true, categoria: CAT });
  });

  it('preço com cartão fidelidade continua permitido para isento', () => {
    const r = triarMedicamento(
      produto({ gtin: '7891000000011', categoria: CAT, condicao: { tipo: 'cartao_fidelidade', programa: 'X' } }),
      listas,
      CAT,
    );
    expect(r.liberado).toBe(true);
  });

  it('termo bloqueado manda para revisão humana', () => {
    const r = triarMedicamento(produto({ titulo: 'Receita controlada' }), listas, CAT);
    expect(r).toMatchObject({ liberado: false, revisaoHumana: true });
  });
});
