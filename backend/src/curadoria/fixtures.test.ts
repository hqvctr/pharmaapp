// Roda o motor contra os fixtures versionados em fixtures/. Cada arquivo é um caso auditável.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validarConfigCobertura, validarConfigCuradoria } from './config.js';
import { verificarCobertura, type LocalUsuario, type LojaCobertura } from './cobertura.js';
import { avaliarOferta } from './motor.js';
import type { CodigoReprovacao, Condicao, Embalagem, EntradaAvaliacao, Frete } from './tipos.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIA_MS = 86_400_000;

// Casos que a regra 5 torna obrigatórios. Se algum sumir dos fixtures, a suíte falha.
const TAGS_OBRIGATORIAS = [
  'desconto_de_mentira',
  'sem_historico',
  'oferta_condicional',
  'embalagem_diferente',
  'oferta_vencida',
  'loja_fora_de_cobertura',
];

const configTenant = JSON.parse(readFileSync(path.join(RAIZ, 'config/tenants/padrao.json'), 'utf8'));
const configCuradoria = validarConfigCuradoria(configTenant.curadoria);
const configCobertura = validarConfigCobertura(configTenant.cobertura);

function carregar<T>(dir: string): Array<{ arquivo: string; dados: T }> {
  const abs = path.join(RAIZ, 'fixtures', dir);
  return readdirSync(abs)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((arquivo) => ({ arquivo, dados: JSON.parse(readFileSync(path.join(abs, arquivo), 'utf8')) as T }));
}

type SerieFixture =
  | { deDiasAtras: number; ateDiasAtras: number; aCadaDias: number; precoCentavos: number; embalagem?: Embalagem }
  | { diasAtras: number; precoCentavos: number; embalagem?: Embalagem };

interface FixtureCuradoria {
  caso: string;
  tags: string[];
  agora: string;
  oferta: {
    categoria: string;
    precoCentavos: number;
    embalagem: Embalagem;
    condicao: Condicao | null;
    frete: Frete;
    disponivel: boolean;
    validaDe: string | null;
    validaAte: string | null;
    observadaEm: string;
  };
  historico: SerieFixture[];
  loja: EntradaAvaliacao['loja'];
  fonte: EntradaAvaliacao['fonte'];
  esperado: {
    decisao: string;
    reprovacoes: CodigoReprovacao[];
    score?: number | null;
    rotuloCondicao?: string | null;
    entregaAConfirmar?: boolean;
    motivoContem?: string[];
  };
}

interface FixtureCobertura {
  caso: string;
  tags: string[];
  loja: LojaCobertura;
  usuario: LocalUsuario;
  economiaCentavos: number;
  esperado: {
    coberto: boolean;
    codigo?: string;
    modo?: string;
    prazoDias?: number;
    distanciaKm?: number;
    custoDeslocamentoCentavos?: number;
  };
}

function montarEntrada(f: FixtureCuradoria): EntradaAvaliacao {
  const agora = Date.parse(f.agora);
  const historico = f.historico.flatMap((s) => {
    const embalagem = s.embalagem ?? f.oferta.embalagem;
    const dias =
      'diasAtras' in s
        ? [s.diasAtras]
        : Array.from(
            { length: Math.floor((s.deDiasAtras - s.ateDiasAtras) / s.aCadaDias) + 1 },
            (_, i) => s.deDiasAtras - i * s.aCadaDias,
          );
    return dias.map((d) => ({ observadoEm: new Date(agora - d * DIA_MS), precoCentavos: s.precoCentavos, embalagem }));
  });
  return {
    oferta: {
      ...f.oferta,
      validaDe: f.oferta.validaDe === null ? null : new Date(f.oferta.validaDe),
      validaAte: f.oferta.validaAte === null ? null : new Date(f.oferta.validaAte),
      observadaEm: new Date(f.oferta.observadaEm),
    },
    historico,
    loja: f.loja,
    fonte: f.fonte,
  };
}

const casosCuradoria = carregar<FixtureCuradoria>('curadoria');
const casosCobertura = carregar<FixtureCobertura>('cobertura');

describe('fixtures obrigatórios', () => {
  it.each(TAGS_OBRIGATORIAS)('existe ao menos um caso com a tag %s', (tag) => {
    const todas = [...casosCuradoria, ...casosCobertura].flatMap((c) => c.dados.tags);
    expect(todas).toContain(tag);
  });
});

describe('motor de curadoria', () => {
  it.each(casosCuradoria.map((c) => [c.arquivo, c.dados] as const))('%s', (_arquivo, f) => {
    const resultado = avaliarOferta(montarEntrada(f), configCuradoria, new Date(f.agora));
    const e = f.esperado;

    expect(resultado.decisao).toBe(e.decisao);
    expect(resultado.reprovacoes.map((r) => r.codigo).sort()).toEqual([...e.reprovacoes].sort());
    if (e.score !== undefined) expect(resultado.score).toBe(e.score);
    if (e.rotuloCondicao !== undefined) expect(resultado.rotuloCondicao).toBe(e.rotuloCondicao);
    if (e.entregaAConfirmar !== undefined) expect(resultado.entregaAConfirmar).toBe(e.entregaAConfirmar);
    for (const trecho of e.motivoContem ?? []) expect(resultado.motivo).toContain(trecho);

    // Invariantes que valem para todo caso.
    expect(resultado.motivo.length).toBeGreaterThan(0);
    if (resultado.decisao === 'descartar') expect(resultado.reprovacoes.length).toBeGreaterThan(0);
    if (resultado.decisao === 'notificar') expect(resultado.score!).toBeGreaterThanOrEqual(configCuradoria.scoreMinimoNotificar);
    if (f.oferta.condicao !== null) expect(resultado.rotuloCondicao).not.toBeNull();
  });

  it('é determinístico: mesma entrada, mesmo resultado', () => {
    const f = casosCuradoria[0]!.dados;
    const a = avaliarOferta(montarEntrada(f), configCuradoria, new Date(f.agora));
    const b = avaliarOferta(montarEntrada(f), configCuradoria, new Date(f.agora));
    expect(a).toEqual(b);
  });
});

describe('cobertura por CEP e distância', () => {
  it.each(casosCobertura.map((c) => [c.arquivo, c.dados] as const))('%s', (_arquivo, f) => {
    const r = verificarCobertura(f.loja, f.usuario, f.economiaCentavos, configCobertura);
    const e = f.esperado;
    expect(r.coberto).toBe(e.coberto);
    if (!r.coberto) {
      expect(r.codigo).toBe(e.codigo);
      return;
    }
    expect(r.modo).toBe(e.modo);
    if (e.prazoDias !== undefined && r.modo === 'entrega_por_cep') expect(r.prazoDias).toBe(e.prazoDias);
    if (e.distanciaKm !== undefined && r.modo !== 'entrega_por_cep') expect(r.distanciaKm).toBeCloseTo(e.distanciaKm, 1);
    if (e.custoDeslocamentoCentavos !== undefined && r.modo === 'retirada_na_loja') {
      expect(r.custoDeslocamentoCentavos).toBe(e.custoDeslocamentoCentavos);
    }
  });
});
