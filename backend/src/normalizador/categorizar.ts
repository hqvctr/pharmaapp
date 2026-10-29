// Categoria e subcategoria do app (Gestação, Mamãe, Bebê, Infantil e suas subcategorias) a partir do que a fonte informa.
// A fonte não conhece as nossas categorias: manda categorias genéricas em inglês (kids_clothing, games_hobby...) e o título.
// Ordem de decisão: 1) regras de texto do título (a primeira que casar); 2) categoria da fonte; 3) padrão da marca/loja.
// Nada casou: a oferta fica de fora (categoria ignorada), como antes. Medicamento NÃO passa por aqui (a triagem decide).
import { normalizarTexto } from './medicamentos.js';

export interface DestinoCategoria {
  categoria: string;
  subcategoria?: string;
}

export interface RegraTexto extends DestinoCategoria {
  /** Palavras (sem acento, minúsculas). Casam por palavra inteira; `termo*` casa pelo começo da palavra. */
  termos: string[];
  /** Se informado, a oferta também precisa ter uma destas categorias da fonte (normalizadas). */
  fonte?: string[];
}

export interface RegrasCategorizacao {
  regrasTexto: RegraTexto[];
  /** Categoria da fonte (normalizada) → destino. */
  porCategoriaFonte: Record<string, DestinoCategoria>;
  /** Id da loja na fonte (organização da Lomadee) → destino padrão quando nada mais casou. */
  porMarca: Record<string, DestinoCategoria>;
}

export interface Classificacao {
  categoria: string;
  subcategoria: string | null;
}

interface TermoCompilado {
  prefixo: boolean;
  texto: string;
}

const compilar = (t: string): TermoCompilado => (t.endsWith('*') ? { prefixo: true, texto: normalizarTexto(t.slice(0, -1)) } : { prefixo: false, texto: normalizarTexto(t) });

/** Palavras do título já normalizadas (sem acento, minúsculas, só letras e números). */
function palavras(titulo: string): string[] {
  return normalizarTexto(titulo).split(/[^a-z0-9]+/).filter((p) => p.length > 0);
}

function casa(termo: TermoCompilado, ps: readonly string[], junto: string): boolean {
  // Termo com mais de uma palavra ("lenco umedecido") casa como sequência; com uma palavra, por palavra inteira ou prefixo.
  if (termo.texto.includes(' ')) {
    const alvo = ` ${termo.texto} `;
    const base = ` ${junto} `;
    return termo.prefixo ? base.includes(alvo.trimEnd()) : base.includes(alvo);
  }
  return ps.some((p) => (termo.prefixo ? p.startsWith(termo.texto) : p === termo.texto));
}

export function categorizar(oferta: { titulo: string; categoriaFonte: string; lojaIdExterno: string }, regras: RegrasCategorizacao): Classificacao | null {
  const ps = palavras(oferta.titulo);
  const junto = ps.join(' ');
  const fonte = normalizarTexto(oferta.categoriaFonte);
  const para = (d: DestinoCategoria): Classificacao => ({ categoria: d.categoria, subcategoria: d.subcategoria ?? null });
  for (const r of regras.regrasTexto) {
    if (r.fonte !== undefined && !r.fonte.map(normalizarTexto).includes(fonte)) continue;
    if (r.termos.some((t) => casa(compilar(t), ps, junto))) return para(r);
  }
  const daFonte = regras.porCategoriaFonte[fonte];
  if (daFonte !== undefined) return para(daFonte);
  const daMarca = regras.porMarca[oferta.lojaIdExterno];
  return daMarca !== undefined ? para(daMarca) : null;
}

const SLUG = /^[a-z0-9_]+$/;

/** Valida o bloco `categorizacao` de uma fonte. `categoriasValidas` = categoria do app → subcategorias que ela aceita. */
export function validarCategorizacao(bruto: unknown, onde: string, categoriasValidas: ReadonlyMap<string, ReadonlySet<string>>): RegrasCategorizacao {
  const inv = (m: string): never => {
    throw new Error(`Config inválida: ${onde}.${m}`);
  };
  if (bruto === null || typeof bruto !== 'object' || Array.isArray(bruto)) return inv('(bloco)');
  const b = bruto as Record<string, any>;
  const destino = (d: any, caminho: string): DestinoCategoria => {
    if (d === null || typeof d !== 'object' || typeof d.categoria !== 'string' || !SLUG.test(d.categoria)) return inv(`${caminho}.categoria`);
    const subs = categoriasValidas.get(d.categoria);
    if (subs === undefined) return inv(`${caminho}.categoria ("${d.categoria}" não é categoria do app)`);
    if (d.subcategoria !== undefined && (typeof d.subcategoria !== 'string' || !subs.has(d.subcategoria))) return inv(`${caminho}.subcategoria ("${d.subcategoria}" não existe em "${d.categoria}")`);
    return d.subcategoria === undefined ? { categoria: d.categoria } : { categoria: d.categoria, subcategoria: d.subcategoria };
  };
  const regrasTexto = (Array.isArray(b.regrasTexto) ? b.regrasTexto : inv('regrasTexto')).map((r: any, i: number): RegraTexto => {
    const d = destino(r, `regrasTexto[${i}]`);
    if (!Array.isArray(r.termos) || r.termos.length === 0 || r.termos.some((t: unknown) => typeof t !== 'string' || normalizarTexto(t.replace(/\*$/, '')).trim() === '')) inv(`regrasTexto[${i}].termos`);
    if (r.fonte !== undefined && (!Array.isArray(r.fonte) || r.fonte.length === 0 || r.fonte.some((f: unknown) => typeof f !== 'string'))) inv(`regrasTexto[${i}].fonte`);
    return { ...d, termos: r.termos, ...(r.fonte !== undefined ? { fonte: r.fonte } : {}) };
  });
  const mapa = (v: unknown, nome: string, normalizarChave: boolean): Record<string, DestinoCategoria> => {
    if (v === undefined) return {};
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return inv(nome);
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, d]) => [normalizarChave ? normalizarTexto(k) : k, destino(d, `${nome}.${k}`)]));
  };
  return { regrasTexto, porCategoriaFonte: mapa(b.porCategoriaFonte, 'porCategoriaFonte', true), porMarca: mapa(b.porMarca, 'porMarca', false) };
}
