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
  mapaCategorias: tenant.fontes['lomadee']!.mapaCategorias,
  categorizacao: tenant.fontes['lomadee']!.categorizacao,
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
  categoriaFonte: 'hygiene',
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
    const r = normalizarOferta(oferta({ titulo: 'Fralda Marca Z G 36 Unidades', categoriaFonte: 'hygiene' }), listas, config);
    expect(r.tipo === 'ok' && r.produto.advertencias).toEqual([]);
  });
});

describe('normalizador com medicamento desligado e trava por substância (parecer da RDC 96/2008)', () => {
  it('o tenant padrão está desligado', () => {
    expect(tenant.medicamentos.modo).toBe('desligado');
  });

  it('isento com GTIN conhecido fica bloqueado e registrado como desligado', () => {
    const r = normalizarOferta(oferta({ titulo: 'Analgésico 500mg 10 comprimidos', gtin: '7891000000011', categoriaFonte: 'medicines' }), listas, config);
    expect(r).toMatchObject({ tipo: 'bloqueado', codigo: 'MEDICAMENTO_DESLIGADO', revisaoHumana: false });
  });

  it('remédio mal categorizado e sem GTIN não passa como produto comum', () => {
    const r = normalizarOferta(oferta({ titulo: 'Dipirona Sódica 500mg Gotas 20ml', categoriaFonte: 'hygiene' }), listas, config);
    expect(r).toMatchObject({ tipo: 'bloqueado', codigo: 'MEDICAMENTO_SEM_REFERENCIA', revisaoHumana: true });
  });

  it('remédio em categoria fora do mapa também fica registrado', () => {
    const r = normalizarOferta(oferta({ titulo: 'Paracetamol Infantil 100mg/ml', categoriaFonte: 'Mamãe e Bebê' }), listas, config);
    expect(r).toMatchObject({ tipo: 'bloqueado', codigo: 'MEDICAMENTO_SEM_REFERENCIA' });
  });

  it('produto comum segue normalmente', () => {
    const r = normalizarOferta(oferta({ titulo: 'Fralda Marca Z G 36 Unidades', categoriaFonte: 'hygiene' }), listas, config);
    expect(r.tipo).toBe('ok');
  });
});

describe('liberação do operador (D20)', () => {
  const liberando = (...codigos: string[]) => ({ ...config, liberados: new Set(codigos) });

  it('cautela da NBCAL liberada passa como produto comum, sem advertência', () => {
    const r = normalizarOferta(oferta({ titulo: 'Protetor de Mamilo Silicone' }), listas, liberando('NBCAL_CAUTELA'));
    expect(r.tipo).toBe('ok');
    if (r.tipo === 'ok') expect(r.produto.advertencias).toEqual([]);
  });

  it('filtro de texto de medicamento liberado passa, na categoria da fonte, e não como medicamento', () => {
    const r = normalizarOferta(oferta({ titulo: 'Shampoo infantil tarja preta' }), listas, liberando('TERMO_DE_VENDA_CONTROLADA'));
    expect(r.tipo).toBe('ok');
    if (r.tipo === 'ok') expect(r.produto.ehMedicamento).toBe(false);
  });

  it('liberar outro código não destrava: cada bloqueio tem o seu', () => {
    expect(normalizarOferta(oferta({ titulo: 'Protetor de Mamilo Silicone' }), listas, liberando('TERMO_DE_VENDA_CONTROLADA'))).toMatchObject({ tipo: 'bloqueado', codigo: 'NBCAL_CAUTELA' });
    expect(normalizarOferta(oferta({ titulo: 'Mamadeira tarja preta' }), listas, liberando('NBCAL_CAUTELA'))).toMatchObject({ tipo: 'bloqueado', codigo: 'TERMO_DE_VENDA_CONTROLADA' });
  });

  it('liberar o texto não livra da NBCAL: mamadeira com o termo liberado continua vedada', () => {
    expect(normalizarOferta(oferta({ titulo: 'Mamadeira tarja preta' }), listas, liberando('TERMO_DE_VENDA_CONTROLADA'))).toMatchObject({ tipo: 'bloqueado', codigo: 'NBCAL_VEDADO' });
  });

  it('medicamento sem referência na categoria de medicamentos (sem texto) nunca é destravado', () => {
    const r = normalizarOferta(oferta({ titulo: 'Analgésico Genérico 20 comprimidos', categoriaFonte: 'medicines' }), listas, liberando('MEDICAMENTO_SEM_REFERENCIA'));
    expect(r).toMatchObject({ tipo: 'bloqueado', codigo: 'MEDICAMENTO_SEM_REFERENCIA', revisaoHumana: false });
  });

  it('texto liberado numa oferta da categoria de medicamentos continua sendo tratado como medicamento', () => {
    const r = normalizarOferta(oferta({ titulo: 'Vitamina Zeta tarja preta', categoriaFonte: 'medicines' }), listas, liberando('TERMO_DE_VENDA_CONTROLADA'));
    expect(r.tipo).toBe('ok');
    if (r.tipo === 'ok') {
      expect(r.produto.ehMedicamento).toBe(true);
      expect(r.produto.categoria).toBe(config.categoriaMedicamentos);
    }
  });

  it('o que é vedado por lei nunca é destravado, mesmo que o código esteja na lista de liberados', () => {
    expect(normalizarOferta(oferta({ titulo: 'Mamadeira 240ml' }), listas, liberando('NBCAL_VEDADO', 'NBCAL_CAUTELA', 'TERMO_DE_VENDA_CONTROLADA'))).toMatchObject({ tipo: 'bloqueado', codigo: 'NBCAL_VEDADO' });
  });

  it('medicamento achado por GTIN na CMED nunca é destravado', () => {
    const comCmed = { ...listas, porGtin: new Map([['07891000000028'.padStart(14, '0'), { gtin: '7891000000028', isentoPrescricao: false, principioAtivo: 'x' }]]) } as unknown as typeof listas;
    const r = normalizarOferta(oferta({ titulo: 'Remédio qualquer', gtin: '7891000000028' }), comCmed, liberando('MEDICAMENTO_COM_PRESCRICAO', 'SUBSTANCIA_CONTROLADA', 'MEDICAMENTO_SEM_REFERENCIA'));
    expect(r).toMatchObject({ tipo: 'bloqueado', codigo: 'MEDICAMENTO_COM_PRESCRICAO' });
  });
});


describe('categoria e subcategoria do app', () => {
  it('o título decide a categoria e a subcategoria, e a foto da oferta segue no produto', () => {
    const r = normalizarOferta(oferta({ titulo: 'Fralda Pampers G 60 Unidades', categoriaFonte: 'health_beauty', imagemUrl: 'https://img.exemplo.test/f.jpg' }), listas, config);
    expect(r).toMatchObject({ tipo: 'ok', produto: { categoria: 'bebe', subcategoria: 'fraldas', imagemUrl: 'https://img.exemplo.test/f.jpg' } });
  });

  it('sem foto, imagemUrl é null; sem subcategoria da regra, subcategoria é null', () => {
    const r = normalizarOferta(oferta({ titulo: 'Fralda X G 40 Unidades', categoriaFonte: 'x', lojaIdExterno: 'b08af64e-f7bd-434c-b0ac-6baec265f9fc' }), listas, config);
    expect(r).toMatchObject({ tipo: 'ok', produto: { imagemUrl: null } });
    const marca = normalizarOferta(oferta({ titulo: 'Coisa sem regra', categoriaFonte: 'x', lojaIdExterno: 'b08af64e-f7bd-434c-b0ac-6baec265f9fc' }), listas, config);
    expect(marca).toMatchObject({ tipo: 'ok', produto: { categoria: 'bebe', subcategoria: null } });
  });

  it('oferta que nenhuma regra reconhece fica de fora', () => {
    const r = normalizarOferta(oferta({ titulo: 'Furadeira 500W', categoriaFonte: 'tools', lojaIdExterno: 'qualquer' }), listas, config);
    expect(r).toMatchObject({ tipo: 'categoria_ignorada', categoriaFonte: 'tools' });
  });

  it('medicamento não passa pela categorização do app: usa a categoria da fonte', () => {
    const r = normalizarOferta(oferta({ titulo: 'Dipirona 500mg', categoriaFonte: 'medicines' }), listas, config);
    expect(r.tipo === 'ok' ? r.produto.categoria : r.tipo).not.toBe('bebe');
  });
});

describe('categorização com a config do tenant (títulos reais da UP Kids e da Toymania)', () => {
  const cat = (titulo: string, categoriaFonte: string, lojaIdExterno = 'qualquer') => {
    const r = normalizarOferta(oferta({ titulo, categoriaFonte, lojaIdExterno }), listas, config);
    return r.tipo === 'ok' ? `${r.produto.categoria}/${r.produto.subcategoria}` : r.tipo;
  };

  it('bebê ganha da regra de infantil, e "Up Baby" (nome da marca) não faz roupa infantil virar de bebê', () => {
    expect(cat('Conjunto para Bebê Menino em Moletom (Verde) Três e Já', 'kids_clothing')).toBe('bebe/roupas');
    expect(cat('Body Manga Longa em Suedine Unissex para Bebê (Roxo) Up Baby', 'fashion_accessories')).toBe('bebe/roupas');
    expect(cat('Conjunto Infantil Masculino com Bata Xadrez (Branco) Up Baby', 'mens_clothing')).toBe('infantil/roupas');
    expect(cat('Conjunto com Regata e Short para Menina (Azul) Bee Loop', 'kids_clothing')).toBe('infantil/roupas');
  });

  it('roupa de adulto da mesma loja fica de fora', () => {
    expect(cat('Camiseta Manga Curta Masculina (Branco) Just Basic', 'mens_clothing')).toBe('categoria_ignorada');
    expect(cat('Vestido Regata Básico em Ribaninha (Preto) Just Basic', 'womens_clothing')).toBe('categoria_ignorada');
  });

  it('"botão" não é bota; "bota" é calçado', () => {
    expect(cat('Camisa com botão de pressão', 'kids_clothing')).toBe('infantil/roupas');
    expect(cat('Bota de chuva', 'kids_clothing')).toBe('infantil/calcados');
  });

  it('loja de brinquedos cai em brinquedos pelo padrão da marca, e pelo texto quando há', () => {
    const toymania = 'd9a040f8-bb54-40d2-804b-150f007305d0';
    expect(cat('Quebra-cabeça 100 peças', 'qualquer_coisa', toymania)).toBe('infantil/brinquedos');
    expect(cat('Fralda de pano', 'qualquer_coisa', toymania)).toBe('bebe/fraldas');
  });
});
