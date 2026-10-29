import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  compilarTriagemPorNome,
  gtin14,
  normalizarTexto,
  triarMedicamento,
  type ListasMedicamentos,
  type ProdutoEmTriagem,
} from './medicamentos.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bruto = JSON.parse(readFileSync(path.join(RAIZ, 'fixtures/medicamentos/listas_teste.json'), 'utf8'));
const listas: ListasMedicamentos = {
  versao: bruto.versao,
  porGtin: new Map(bruto.referencia.map((r: { gtin: string }) => [gtin14(r.gtin), r])),
  substanciasControladas: new Set(bruto.substanciasControladas.map(normalizarTexto)),
  termosBloqueados: bruto.termosBloqueados,
};
const CAT = 'medicamentos_isentos';

const produto = (p: Partial<ProdutoEmTriagem>): ProdutoEmTriagem => ({
  gtin: null,
  titulo: 'Produto',
  descricao: null,
  categoria: 'mamae',
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
    const r = triarMedicamento(produto({ gtin: '7891000000011', categoria: 'mamae' }), listas, CAT);
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

describe('trava por nome de substância (RF-12 do parecer da RDC 96/2008)', () => {
  const triagemPorNome = compilarTriagemPorNome({
    substancias: ['Dipirona', 'paracetamol', 'nicotina', 'butilbrometo de escopolamina'],
    substanciasAmbiguas: ['vitamina C', 'Bicarbonato de sódio'],
    ignorarSeTitulo: ['serum', 'shampoo', 'culinario'],
  });
  const triar = (p: Partial<ProdutoEmTriagem>, extra = {}) => triarMedicamento(produto(p), listas, CAT, { triagemPorNome, ...extra });

  it.each([
    ['substância no título, sem GTIN, categoria comum', { titulo: 'Dipirona Sódica 500mg 10 comprimidos' }],
    ['maiúsculas e acento', { titulo: 'PARACETAMOL INFANTIL gotas' }],
    ['substância composta', { titulo: 'Butilbrometo de Escopolamina 10mg' }],
    ['ambígua sem marcador de outro uso', { titulo: 'Vitamina C 500 mg 30 comprimidos' }],
  ])('bloqueia: %s', (_c, p) => {
    expect(triar(p)).toMatchObject({ liberado: false, codigo: 'MEDICAMENTO_SEM_REFERENCIA', revisaoHumana: true });
  });

  it.each([
    ['palavra inteira: nicotinamida não é nicotina', { titulo: 'Sérum de Nicotinamida 10%' }],
    ['ambígua com marcador de cosmético', { titulo: 'Sérum Facial Vitamina C 30 ml' }],
    ['ambígua com marcador culinário', { titulo: 'Bicarbonato de Sódio 200 g uso culinário' }],
    ['produto comum', { titulo: 'Shampoo Infantil 400 ml' }],
  ])('libera: %s', (_c, p) => {
    expect(triar(p)).toMatchObject({ liberado: true, ehMedicamento: false });
  });

  it('marcador não salva substância firme', () => {
    expect(triar({ titulo: 'Shampoo com Dipirona' })).toMatchObject({ liberado: false });
  });

  it('GTIN conhecido não passa por esta trava', () => {
    expect(triar({ gtin: '7891000000011', categoria: CAT, titulo: 'Dipirona 500 mg' })).toMatchObject({ liberado: true, ehMedicamento: true });
  });

  it('sem a opção, o comportamento antigo se mantém', () => {
    expect(triarMedicamento(produto({ titulo: 'Dipirona 500 mg' }), listas, CAT)).toMatchObject({ liberado: true });
  });

  it('modo desligado bloqueia o isento que passaria', () => {
    expect(triar({ gtin: '7891000000011', categoria: CAT }, { modo: 'desligado' })).toMatchObject({
      liberado: false,
      codigo: 'MEDICAMENTO_DESLIGADO',
    });
  });

  it('modo desligado não esconde bloqueios mais específicos', () => {
    expect(triar({ gtin: '7891000000035', categoria: CAT }, { modo: 'desligado' })).toMatchObject({ codigo: 'MEDICAMENTO_COM_PRESCRICAO' });
  });

  it.each([
    ['sem objeto', null],
    ['sem substâncias firmes', { substancias: [], substanciasAmbiguas: [], ignorarSeTitulo: [] }],
    ['termo vazio', { substancias: ['  '], substanciasAmbiguas: [], ignorarSeTitulo: [] }],
    ['lista que não é lista', { substancias: ['dipirona'], substanciasAmbiguas: 'x', ignorarSeTitulo: [] }],
  ])('config inválida (%s) falha fechada', (_c, bruto) => {
    expect(() => compilarTriagemPorNome(bruto)).toThrow(/Config inválida/);
  });
});

describe('GTIN de tamanhos diferentes', () => {
  it('gtin14 completa com zeros à esquerda', () => {
    expect(gtin14('7891000000011')).toBe('07891000000011');
    expect(gtin14('07891000000011')).toBe('07891000000011');
    expect(gtin14('123456789012')).toBe('00123456789012');
  });
  it('produto com GTIN-14 acha a referência cadastrada em EAN-13 (e vice-versa)', () => {
    expect(triarMedicamento(produto({ gtin: '07891000000035', categoria: CAT }), listas, CAT)).toMatchObject({ codigo: 'MEDICAMENTO_COM_PRESCRICAO' });
    expect(triarMedicamento(produto({ gtin: '7891000000035', categoria: CAT }), listas, CAT)).toMatchObject({ codigo: 'MEDICAMENTO_COM_PRESCRICAO' });
  });
});

