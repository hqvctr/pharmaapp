import { describe, expect, it } from 'vitest';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import { triarNbcal } from './nbcal.js';

const { nbcal } = await carregarConfigTenant('economae');

describe('triarNbcal', () => {
  it.each([
    'Fórmula Infantil Marca N 1 800g',
    'Mamadeira Anticólica Marca W 260ml',
    'Kit 2 Chupetas Silicone 0-6 meses',
    'Protetor de Mamilo Marca Q Tamanho M',
    'Aptamil Profutura 1 800g',
    'NAN SUPREME 2 Lata 800g',
  ])('veda: %s', (titulo) => {
    expect(triarNbcal(titulo, null, nbcal.termosVedados).vedado).toBe(true);
  });

  it.each([
    'Fralda Marca Z G 36 Unidades',
    'Papinha de Banana Marca P 120g',
    'Shampoo Infantil Marca Y 400ml',
    'Creme Antiestrias Gestante Marca K 200ml',
  ])('libera: %s', (titulo) => {
    expect(triarNbcal(titulo, null, nbcal.termosVedados).vedado).toBe(false);
  });

  it('olha também a descrição', () => {
    expect(triarNbcal('Kit Enxoval Bebê', 'acompanha mamadeira de 150ml', nbcal.termosVedados).termo).toBe('mamadeira');
  });
});
