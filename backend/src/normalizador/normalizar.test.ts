import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { OfertaBruta } from '../fontes/contrato.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import { carregarListasMedicamentos } from './listas.js';
import { normalizarOferta, type ConfigNormalizacao } from './normalizar.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tenant = await carregarConfigTenant('padrao');
const listas = await carregarListasMedicamentos(path.join(RAIZ, 'fixtures/medicamentos/listas_teste.json'));
const config: ConfigNormalizacao = {
  mapaCategorias: tenant.fontes.lomadee!.mapaCategorias,
  categoriaMedicamentos: tenant.medicamentos.categoria,
  modoMedicamentos: tenant.medicamentos.modo,
  triagemPorNome: tenant.medicamentos.triagemPorNome,
  nbcal: tenant.nbcal,
};

const oferta = (o: Partial<OfertaBruta>): OfertaBruta => ({
  idExterno: '1',
  titulo: 'Produto 100g',
  descricao: null,
  gtin: null,
  marca: null,
  precoCentavos: 1000,
  condicao: null,
  categoriaFonte: 'Higiene do Bebê',
  lojaIdExterno: '9001',
  link: 'https://exemplo.test/p/1',
  linkAfiliado: true,
  disponivel: true,
  validaDe: null,
  validaAte: null,
  frete: { status: 'a_confirmar' },
  ...o,
});

describe('normalizador com triagem NBCAL', () => {
  it('produto vedado é bloqueado mesmo em categoria fora do mapa', () => {
    const r = normalizarOferta(oferta({ titulo: 'Mamadeira 240ml', categoriaFonte: 'Mamãe e Bebê' }), listas, config);
    expect(r).toMatchObject({ tipo: 'bloqueado', codigo: 'NBCAL_VEDADO', revisaoHumana: false });
    if (r.tipo === 'bloqueado') expect(r.detalhe).toContain('parecer-d33-2026-10-27');
  });

  it('cautela tem código próprio', () => {
    const r = normalizarOferta(oferta({ titulo: 'Protetor de Mamilo Silicone' }), listas, config);
    expect(r).toMatchObject({ tipo: 'bloqueado', codigo: 'NBCAL_CAUTELA' });
  });

  it('a triagem de medicamento roda antes', () => {
    const r = normalizarOferta(oferta({ titulo: 'Mamadeira tarja preta' }), listas, config);
    expect(r).toMatchObject({ tipo: 'bloqueado', codigo: 'TERMO_DE_VENDA_CONTROLADA' });
  });

  it('advertência vai no produto normalizado', () => {
    const r = normalizarOferta(oferta({ titulo: 'Papinha de Pera 120g' }), listas, config);
    expect(r.tipo === 'ok' && r.produto.advertencias).toEqual(['nbcal_apos_6_meses']);
  });

  it('produto livre sai sem advertência', () => {
    const r = normalizarOferta(oferta({ titulo: 'Fralda Marca Z G 36 Unidades', categoriaFonte: 'Fraldas' }), listas, config);
    expect(r.tipo === 'ok' && r.produto.advertencias).toEqual([]);
  });
});

describe('normalizador com medicamento desligado e trava por substância (parecer da RDC 96/2008)', () => {
  it('o tenant padrão está desligado', () => {
    expect(tenant.medicamentos.modo).toBe('desligado');
  });

  it('isento com GTIN conhecido fica bloqueado e registrado como desligado', () => {
    const r = normalizarOferta(oferta({ titulo: 'Analgésico 500mg 10 comprimidos', gtin: '7891000000011', categoriaFonte: 'Medicamentos' }), listas, config);
    expect(r).toMatchObject({ tipo: 'bloqueado', codigo: 'MEDICAMENTO_DESLIGADO', revisaoHumana: false });
  });

  it('remédio mal categorizado e sem GTIN não passa como produto comum', () => {
    const r = normalizarOferta(oferta({ titulo: 'Dipirona Sódica 500mg Gotas 20ml', categoriaFonte: 'Higiene do Bebê' }), listas, config);
    expect(r).toMatchObject({ tipo: 'bloqueado', codigo: 'MEDICAMENTO_SEM_REFERENCIA', revisaoHumana: true });
  });

  it('remédio em categoria fora do mapa também fica registrado', () => {
    const r = normalizarOferta(oferta({ titulo: 'Paracetamol Infantil 100mg/ml', categoriaFonte: 'Mamãe e Bebê' }), listas, config);
    expect(r).toMatchObject({ tipo: 'bloqueado', codigo: 'MEDICAMENTO_SEM_REFERENCIA' });
  });

  it('produto comum segue normalmente', () => {
    const r = normalizarOferta(oferta({ titulo: 'Fralda Marca Z G 36 Unidades', categoriaFonte: 'Fraldas' }), listas, config);
    expect(r.tipo).toBe('ok');
  });
});

