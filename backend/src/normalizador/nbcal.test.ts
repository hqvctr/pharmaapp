import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compilarRegrasNbcal, triarNbcal, TEXTOS_ADVERTENCIA } from './nbcal.js';

// Testa a config real do tenant: a tabela do parecer D33 vale para o que vai para produção.
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const brutoTenant = JSON.parse(readFileSync(path.join(RAIZ, 'config/tenants/padrao.json'), 'utf8'));
const regras = compilarRegrasNbcal(brutoTenant.nbcal);

function classe(titulo: string, descricao: string | null = null): string {
  const r = triarNbcal(titulo, descricao, regras);
  return r.tipo === 'advertencia' ? r.advertencias.join('+') : r.tipo;
}

const DOIS = 'nbcal_aleitamento_2_anos';
const SEIS = 'nbcal_apos_6_meses';

describe('triagem NBCAL: tabela do parecer D33', () => {
  it.each([
    // vedado em tudo
    ['fórmula para lactentes', 'Fórmula Infantil para Lactentes Marca A 0 a 6 meses 800g', 'vedado'],
    ['fórmula de seguimento para lactentes', 'Fórmula Infantil de Seguimento para Lactentes 6 a 12 meses 400g', 'vedado'],
    ['fórmula só com a marca', 'NAN Supreme Pro 1 800g', 'vedado'],
    ['fórmula sem idade explícita', 'Fórmula Infantil Marca B 800g', 'vedado'],
    ['fórmula para recém-nascido de alto risco', 'Fortificante de Leite Materno FM 85 1g', 'vedado'],
    ['fórmula para prematuro', 'Fórmula para Prematuros Marca C 400g', 'vedado'],
    ['fórmula sem "infantil" com idade de lactente', 'Fórmula Láctea Marca F 0 a 6 meses', 'vedado'],
    ['fórmula genérica para recém-nascido', 'Fórmula Nutricional para Recém-Nascidos 400g', 'vedado'],
    ['mamadeira', 'Mamadeira Anticólica 260ml', 'vedado'],
    ['chupeta', 'Chupeta Silicone Tamanho 2', 'vedado'],
    ['bico de mamadeira', 'Bico Ortodôntico Fluxo Lento', 'vedado'],
    ['kit com mamadeira na descrição', 'Kit Presente Bebê 5 Peças', 'vedado', 'Contém mamadeira, escova e toalha'],
    ['acessório com nome vedado', 'Prendedor de Chupeta Ursinho', 'vedado'],
    ['copo com bico', 'Copo de Transição com Bico de Silicone', 'vedado'],
    ['composto lácteo para menor de 1 ano', 'Composto Lácteo Marca D 6 a 12 meses', 'vedado'],
    // cautela
    ['protetor de mamilo', 'Protetor de Mamilo Silicone Tamanho M', 'cautela'],
    ['fórmula dietoterápica de primeira infância', 'Fórmula Infantil Sem Lactose para crianças de primeira infância 800g', 'cautela'],
    // advertência 2 anos
    ['fórmula de seguimento para primeira infância', 'Fórmula Infantil de Seguimento para Crianças de Primeira Infância 800g', DOIS],
    ['composto lácteo sem idade', 'Composto Lácteo Ninho Fases 1+ 800g', DOIS],
    ['leite UHT', 'Leite UHT Integral Marca E 1L', DOIS],
    ['leite em pó', 'Leite em Pó Desnatado 300g', DOIS],
    ['leite zero lactose', 'Leite Semidesnatado Zero Lactose 1L', DOIS],
    ['leite de soja', 'Leite de Soja Original 1L', DOIS],
    ['bebida de aveia', 'Bebida de Aveia Barista 1L', DOIS],
    ['bebida vegetal de amêndoa', 'Bebida Vegetal Amêndoa sem Açúcar 1L', DOIS],
    ['leite condensado', 'Leite Condensado Integral 395g', DOIS],
    ['leite com chocolate', 'Leite com Chocolate UHT 200ml', DOIS],
    // advertência 6 meses
    ['papinha', 'Papinha de Maçã e Banana 120g', SEIS],
    ['cereal infantil', 'Mucilon Arroz e Aveia 230g', SEIS],
    ['biscoito para bebê', 'Biscoito para Bebê de Arroz 40g', SEIS],
    ['suco infantil com idade', 'Suco Kids Uva a partir de 3 anos 200ml', SEIS],
    // livre
    ['bebida láctea', 'Bebida Láctea Sabor Morango 900g', 'livre'],
    ['achocolatado em pó', 'Achocolatado em Pó 400g', 'livre'],
    ['creme de leite', 'Creme de Leite 200g', 'livre'],
    ['doce de leite', 'Doce de Leite Pastoso 400g', 'livre'],
    ['chocolate ao leite', 'Chocolate ao Leite 90g', 'livre'],
    ['leite de coco culinário', 'Leite de Coco 200ml', 'livre'],
    ['cosmético com leite', 'Leite Hidratante Corporal 200ml', 'livre'],
    ['iogurte', 'Iogurte Natural 170g', 'livre'],
    ['fralda', 'Fralda Marca Z G 36 Unidades', 'livre'],
    ['shampoo infantil', 'Shampoo Infantil a partir de 6 meses 200ml', 'livre'],
    ['pomada para mamilo', 'Pomada para Mamilos Lanolina 30g', 'livre'],
    ['biscoito kids sem idade', 'Biscoito Kids Chocolate 100g', 'livre'],
    ['palavra contida em outra', 'Banana Prata 1kg', 'livre'],
    ['nova fórmula em cosmético', 'Shampoo Nova Fórmula 400ml', 'livre'],
    ['bico dosador', 'Desinfetante 1L com Bico Dosador', 'livre'],
    ['cosmético com fórmula para recém-nascido', 'Sabonete Líquido Fórmula Suave Recém-Nascido 200ml', 'livre'],
    ['fralda para prematuro', 'Fralda Prematuro 20 Unidades', 'livre'],
  ])('%s', (_caso, titulo, esperado, descricao?: string) => {
    expect(classe(titulo, descricao ?? null)).toBe(esperado);
  });

  it('leite na descrição não dá advertência (regra só no título)', () => {
    expect(classe('Achocolatado em Pó 400g', 'Prepare com leite gelado')).toBe('livre');
  });

  it('produto com duas advertências recebe as duas', () => {
    expect(classe('Leite Integral para Bebê 1L')).toBe(`${DOIS}+${SEIS}`);
  });

  it('bloqueio informa regra, termo e fundamento', () => {
    expect(triarNbcal('Mamadeira 150ml', null, regras)).toEqual({
      tipo: 'vedado',
      regra: 'mamadeira_chupeta',
      termo: 'mamadeira',
      base: 'Decreto 9.579/2018, arts. 3º, VII, e 5º',
    });
  });

  it('nenhum termo de fórmula sai livre, com qualquer marcador de idade (falha fechada)', () => {
    const marcadores = ['', ...brutoTenant.nbcal.listas.lactente, ...brutoTenant.nbcal.listas.primeira_infancia,
      ...brutoTenant.nbcal.listas.dietoterapico];
    for (const formula of brutoTenant.nbcal.listas.formula as string[]) {
      for (const m of marcadores) {
        const r = classe(`${formula} ${m} 800g`);
        expect(['vedado', 'cautela', DOIS], `${formula} ${m}`).toContain(r);
      }
    }
  });

  it('textos das advertências são os do Decreto 9.579/2018, art. 6º', () => {
    expect(TEXTOS_ADVERTENCIA.nbcal_aleitamento_2_anos).toBe(
      'O Ministério da Saúde informa: o aleitamento materno evita infecções e alergias e é recomendado até os 2 (dois) anos de idade ou mais',
    );
    expect(TEXTOS_ADVERTENCIA.nbcal_apos_6_meses).toBe(
      'O Ministério da Saúde informa: após os 6 (seis) meses de idade, continue amamentando seu filho e ofereça novos alimentos',
    );
  });
});

describe('config NBCAL', () => {
  const base = {
    versao: 'v1',
    notificarComAdvertencia: false,
    listas: { x: ['mamadeira'] },
    regras: [{ id: 'm', classe: 'vedado', base: 'art. 5º', termos: ['@x'] }],
  };

  it('aceita config mínima e expande listas', () => {
    expect(triarNbcal('Mamadeira', null, compilarRegrasNbcal(base))).toMatchObject({ tipo: 'vedado', regra: 'm' });
  });

  it.each([
    ['ausente', undefined],
    ['sem versão', { ...base, versao: '' }],
    ['notificar não booleano', { ...base, notificarComAdvertencia: 'nao' }],
    ['lista inexistente', { ...base, regras: [{ ...base.regras[0], termos: ['@y'] }] }],
    ['classe desconhecida', { ...base, regras: [{ ...base.regras[0], classe: 'liberado' }] }],
    ['advertência sem código', { ...base, regras: [...base.regras, { id: 'a', classe: 'advertencia', base: 'x', termos: ['leite'] }] }],
    ['código de advertência inventado', {
      ...base,
      regras: [...base.regras, { id: 'a', classe: 'advertencia', advertencia: 'nbcal_outra', base: 'x', termos: ['leite'] }],
    }],
    ['id repetido', { ...base, regras: [...base.regras, ...base.regras] }],
    ['sem regra vedado', { ...base, regras: [{ id: 'a', classe: 'cautela', base: 'x', termos: ['y'] }] }],
  ])('recusa: %s', (_caso, bruto) => {
    expect(() => compilarRegrasNbcal(bruto)).toThrow(/Config inválida: nbcal/);
  });
});
