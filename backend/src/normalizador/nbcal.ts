// Triagem NBCAL (Lei 11.265/2006; Decreto 9.579/2018, arts. 3º a 28) no normalizador.
// Classifica pelo tipo do produto, em qualquer categoria, a partir de título e descrição:
// vedado > cautela > advertência > livre (docs/juridico/parecer-d33-nbcal.md).
// As regras e os termos vêm da config do tenant; os textos das advertências são os do Decreto, art. 6º,
// e ficam no código para que nenhuma config altere texto legal.
import { normalizarTexto } from './medicamentos.js';

export type CodigoAdvertenciaNbcal = 'nbcal_aleitamento_2_anos' | 'nbcal_apos_6_meses';

/** Decreto 9.579/2018, art. 6º, I (incisos III e VI do art. 3º) e II (inciso I do art. 3º). */
export const TEXTOS_ADVERTENCIA: Readonly<Record<CodigoAdvertenciaNbcal, string>> = {
  nbcal_aleitamento_2_anos:
    'O Ministério da Saúde informa: o aleitamento materno evita infecções e alergias e é recomendado até os 2 (dois) anos de idade ou mais',
  nbcal_apos_6_meses:
    'O Ministério da Saúde informa: após os 6 (seis) meses de idade, continue amamentando seu filho e ofereça novos alimentos',
};

/** `vedado`: proibido pela norma. `cautela`: sem norma confirmada, bloqueado até a revisão jurídica. */
export type ClasseNbcal = 'vedado' | 'cautela' | 'advertencia';

export interface RegraNbcal {
  id: string;
  classe: ClasseNbcal;
  advertencia: CodigoAdvertenciaNbcal | null;
  /** Fundamento legal, para o motivo do bloqueio e a auditoria. */
  base: string;
  /** `titulo`: só o título (para palavras comuns em descrição, como "leite"). */
  campo: 'titulo' | 'titulo_descricao';
  /** Casa se algum termo aparecer... */
  termos: readonly string[];
  /** ...e, em cada grupo, algum termo aparecer... */
  com: readonly (readonly string[])[];
  /** ...e nenhum destes aparecer. */
  exceto: readonly string[];
}

export interface RegrasNbcal {
  /** Versão das regras; vai para o motivo de bloqueio, para auditoria. */
  versao: string;
  /** Produto com advertência gera push? Falso: o push do sistema não cumpre o art. 6º, §§ 1º e 2º. */
  notificarComAdvertencia: boolean;
  regras: readonly RegraNbcal[];
}

export type ResultadoNbcal =
  | { tipo: 'livre' }
  | { tipo: 'advertencia'; advertencias: CodigoAdvertenciaNbcal[]; regras: string[] }
  | { tipo: 'vedado' | 'cautela'; regra: string; termo: string; base: string };

/** Palavra inteira: "nan" pega "NAN Supreme 1", mas nunca "banana"; "bico" não pega "bicolor". */
function comBordas(texto: string): string {
  return ` ${normalizarTexto(texto).replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

function primeiro(texto: string, termos: readonly string[]): string | undefined {
  return termos.find((t) => texto.includes(t));
}

function casa(regra: RegraNbcal, titulo: string, tudo: string): string | undefined {
  const texto = regra.campo === 'titulo' ? titulo : tudo;
  const termo = primeiro(texto, regra.termos);
  if (termo === undefined) return undefined;
  if (!regra.com.every((grupo) => primeiro(texto, grupo) !== undefined)) return undefined;
  if (primeiro(texto, regra.exceto) !== undefined) return undefined;
  return termo.trim();
}

export function triarNbcal(titulo: string, descricao: string | null, regras: RegrasNbcal): ResultadoNbcal {
  const tituloB = comBordas(titulo);
  const tudo = comBordas(`${titulo} ${descricao ?? ''}`);
  for (const classe of ['vedado', 'cautela'] as const) {
    for (const regra of regras.regras) {
      if (regra.classe !== classe) continue;
      const termo = casa(regra, tituloB, tudo);
      if (termo !== undefined) return { tipo: classe, regra: regra.id, termo, base: regra.base };
    }
  }
  const advertencias = new Set<CodigoAdvertenciaNbcal>();
  const ids: string[] = [];
  for (const regra of regras.regras) {
    if (regra.classe !== 'advertencia' || casa(regra, tituloB, tudo) === undefined) continue;
    advertencias.add(regra.advertencia!);
    ids.push(regra.id);
  }
  if (advertencias.size === 0) return { tipo: 'livre' };
  // Ordem fixa: o app exibe na ordem recebida.
  return { tipo: 'advertencia', advertencias: [...advertencias].sort(), regras: ids };
}

// ------------------------------------------------------------------ config

const CLASSES: readonly string[] = ['vedado', 'cautela', 'advertencia'];

/**
 * Valida e compila a seção `nbcal` da config do tenant. Termos começando com "@" referenciam
 * `listas`. Config ausente ou inválida derruba o carregamento: falha fechada.
 */
export function compilarRegrasNbcal(bruto: unknown): RegrasNbcal {
  const erro = (campo: string): Error => new Error(`Config inválida: nbcal.${campo}`);
  const b = bruto as {
    versao?: unknown;
    notificarComAdvertencia?: unknown;
    listas?: Record<string, unknown>;
    regras?: unknown;
  } | undefined;
  if (b === undefined || b === null || typeof b !== 'object') throw erro('(ausente)');
  if (typeof b.versao !== 'string' || b.versao === '') throw erro('versao');
  if (typeof b.notificarComAdvertencia !== 'boolean') throw erro('notificarComAdvertencia');
  const listas = b.listas ?? {};

  const expandir = (termos: unknown, campo: string): string[] => {
    if (!Array.isArray(termos)) throw erro(campo);
    return termos.flatMap((t) => {
      if (typeof t !== 'string' || t.trim() === '') throw erro(campo);
      if (!t.startsWith('@')) return [comBordas(t)];
      const lista = listas[t.slice(1)];
      if (!Array.isArray(lista) || lista.length === 0) throw erro(`${campo}: lista "${t}" inexistente ou vazia`);
      return expandir(lista, `listas.${t.slice(1)}`);
    });
  };

  if (!Array.isArray(b.regras) || b.regras.length === 0) throw erro('regras');
  const ids = new Set<string>();
  const regras = b.regras.map((r: Record<string, unknown>, i: number): RegraNbcal => {
    const campo = `regras[${i}]`;
    if (typeof r.id !== 'string' || ids.has(r.id)) throw erro(`${campo}.id`);
    ids.add(r.id);
    if (typeof r.classe !== 'string' || !CLASSES.includes(r.classe)) throw erro(`${campo}.classe`);
    const advertencia = r.advertencia ?? null;
    if (r.classe === 'advertencia' ? !(typeof advertencia === 'string' && advertencia in TEXTOS_ADVERTENCIA) : advertencia !== null) {
      throw erro(`${campo}.advertencia`);
    }
    if (typeof r.base !== 'string' || r.base === '') throw erro(`${campo}.base`);
    const campoTexto = r.campo ?? 'titulo_descricao';
    if (campoTexto !== 'titulo' && campoTexto !== 'titulo_descricao') throw erro(`${campo}.campo`);
    const termos = expandir(r.termos, `${campo}.termos`);
    if (termos.length === 0) throw erro(`${campo}.termos`);
    const com = r.com ?? [];
    if (!Array.isArray(com)) throw erro(`${campo}.com`);
    return {
      id: r.id,
      classe: r.classe as ClasseNbcal,
      advertencia: advertencia as CodigoAdvertenciaNbcal | null,
      base: r.base,
      campo: campoTexto,
      termos,
      com: com.map((g, j) => {
        const grupo = expandir(g, `${campo}.com[${j}]`);
        if (grupo.length === 0) throw erro(`${campo}.com[${j}]`);
        return grupo;
      }),
      exceto: expandir(r.exceto ?? [], `${campo}.exceto`),
    };
  });
  if (!regras.some((r) => r.classe === 'vedado')) throw erro('regras (nenhuma regra vedado)');
  return { versao: b.versao, notificarComAdvertencia: b.notificarComAdvertencia, regras };
}
