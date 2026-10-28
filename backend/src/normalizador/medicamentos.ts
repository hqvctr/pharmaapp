// Triagem de medicamento no normalizador (P4). Falha fechada: na dúvida, bloqueia.
// Vale para TODO produto, não só para a categoria de medicamentos, porque um remédio controlado
// cadastrado na categoria errada é exatamente o caso que precisa ser pego.
import type { Condicao } from '../curadoria/tipos.js';

/** Linha da referência de medicamentos (derivada da lista de preços CMED/Anvisa). */
export interface ReferenciaMedicamento {
  gtin: string;
  /** Um ou mais princípios ativos, separados por ";" ou "+". */
  principioAtivo: string;
  isentoPrescricao: boolean;
}

export interface ListasMedicamentos {
  /** Data de download das listas oficiais; vai para o motivo de bloqueio, para auditoria. */
  versao: string;
  /** Chave = GTIN com 14 dígitos (`gtin14`). */
  porGtin: ReadonlyMap<string, ReferenciaMedicamento>;
  /** Substâncias das listas da Portaria SVS/MS 344/98, já normalizadas por normalizarTexto. */
  substanciasControladas: ReadonlySet<string>;
  /** Termos que, no título ou na descrição, bloqueiam e mandam para revisão humana. */
  termosBloqueados: readonly string[];
}

export interface ProdutoEmTriagem {
  gtin: string | null;
  titulo: string;
  descricao: string | null;
  categoria: string;
  condicao: Condicao | null;
}

export type CodigoBloqueioMedicamento =
  | 'MEDICAMENTO_DESLIGADO'
  | 'TERMO_DE_VENDA_CONTROLADA'
  | 'MEDICAMENTO_COM_PRESCRICAO'
  | 'SUBSTANCIA_CONTROLADA'
  | 'PROMOCAO_PROIBIDA_PARA_MEDICAMENTO'
  | 'MEDICAMENTO_SEM_REFERENCIA';

/** Modos do parecer da RDC 96/2008 (RF-1). Hoje só `desligado` está implementado. */
export type ModoMedicamentos = 'desligado' | 'lista' | 'propaganda';

/**
 * Trava por nome de substância (RF-12 do parecer da RDC 96): produto sem GTIN reconhecido cujo título
 * cita uma substância de medicamento é bloqueado em qualquer categoria. Termos já vêm com bordas.
 */
export interface TriagemPorNome {
  /** Sempre bloqueia. */
  substancias: readonly string[];
  /** Comum em alimento e cosmético (ex.: "vitamina c"); bloqueia, salvo se o título tiver um `ignorarSeTitulo`. */
  substanciasAmbiguas: readonly string[];
  ignorarSeTitulo: readonly string[];
}

export interface OpcoesTriagemMedicamento {
  modo?: ModoMedicamentos;
  triagemPorNome?: TriagemPorNome;
}

/** Palavra inteira: "nicotina" não pega "nicotinamida". */
function comBordas(texto: string): string {
  return ` ${normalizarTexto(texto).replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

function listaDeTextos(bruto: unknown, campo: string, obrigatoria: boolean): string[] {
  if (!Array.isArray(bruto) || (obrigatoria && bruto.length === 0)) throw new Error(`Config inválida: ${campo}`);
  return bruto.map((t) => {
    if (typeof t !== 'string' || comBordas(t).trim() === '') throw new Error(`Config inválida: ${campo}`);
    return comBordas(t);
  });
}

export function compilarTriagemPorNome(bruto: unknown): TriagemPorNome {
  const b = bruto as { substancias?: unknown; substanciasAmbiguas?: unknown; ignorarSeTitulo?: unknown } | null | undefined;
  if (b === null || typeof b !== 'object') throw new Error('Config inválida: medicamentos.triagemPorNome');
  return {
    substancias: listaDeTextos(b.substancias, 'medicamentos.triagemPorNome.substancias', true),
    substanciasAmbiguas: listaDeTextos(b.substanciasAmbiguas, 'medicamentos.triagemPorNome.substanciasAmbiguas', false),
    ignorarSeTitulo: listaDeTextos(b.ignorarSeTitulo, 'medicamentos.triagemPorNome.ignorarSeTitulo', false),
  };
}

function substanciaNoTitulo(titulo: string, t: TriagemPorNome): string | undefined {
  const texto = comBordas(titulo);
  const firme = t.substancias.find((x) => texto.includes(x));
  if (firme !== undefined) return firme.trim();
  if (t.ignorarSeTitulo.some((x) => texto.includes(x))) return undefined;
  return t.substanciasAmbiguas.find((x) => texto.includes(x))?.trim();
}

export type ResultadoTriagem =
  | { liberado: true; ehMedicamento: boolean; categoria: string }
  | { liberado: false; codigo: CodigoBloqueioMedicamento; detalhe: string; revisaoHumana: boolean };

/** GTIN sempre com 14 dígitos (EAN-13 e UPC-12 ganham zeros à esquerda), para comparar códigos de tamanhos diferentes. */
export function gtin14(gtin: string): string {
  return gtin.padStart(14, '0');
}

export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function triarMedicamento(
  produto: ProdutoEmTriagem,
  listas: ListasMedicamentos,
  categoriaMedicamentos: string,
  opcoes: OpcoesTriagemMedicamento = {},
): ResultadoTriagem {
  // Trava independente da CMED: texto do anúncio.
  const texto = normalizarTexto(`${produto.titulo} ${produto.descricao ?? ''}`);
  const termo = listas.termosBloqueados.find((t) => texto.includes(normalizarTexto(t)));
  if (termo !== undefined) {
    return {
      liberado: false,
      codigo: 'TERMO_DE_VENDA_CONTROLADA',
      detalhe: `anúncio contém "${termo}"; bloqueado até revisão humana`,
      revisaoHumana: true,
    };
  }

  const ref = produto.gtin !== null ? listas.porGtin.get(gtin14(produto.gtin)) : undefined;

  if (ref === undefined) {
    if (produto.categoria === categoriaMedicamentos) {
      return {
        liberado: false,
        codigo: 'MEDICAMENTO_SEM_REFERENCIA',
        detalhe:
          produto.gtin === null
            ? 'produto na categoria de medicamentos sem GTIN'
            : `GTIN ${produto.gtin} não consta da referência de medicamentos (versão ${listas.versao})`,
        revisaoHumana: false,
      };
    }
    // RF-12: sem GTIN reconhecido, o título que cita substância de medicamento não passa como produto comum.
    const substancia = opcoes.triagemPorNome !== undefined ? substanciaNoTitulo(produto.titulo, opcoes.triagemPorNome) : undefined;
    if (substancia !== undefined) {
      return {
        liberado: false,
        codigo: 'MEDICAMENTO_SEM_REFERENCIA',
        detalhe: `título cita a substância "${substancia}" e o produto não consta da referência de medicamentos (versão ${listas.versao}); revisão humana`,
        revisaoHumana: true,
      };
    }
    return { liberado: true, ehMedicamento: false, categoria: produto.categoria };
  }

  // A partir daqui o GTIN é de medicamento, em qualquer categoria que a fonte tenha informado.
  if (!ref.isentoPrescricao) {
    return {
      liberado: false,
      codigo: 'MEDICAMENTO_COM_PRESCRICAO',
      detalhe: `GTIN ${ref.gtin} é medicamento de venda sob prescrição (referência ${listas.versao})`,
      revisaoHumana: false,
    };
  }
  const controlada = ref.principioAtivo
    .split(/[;+]/)
    .map(normalizarTexto)
    .find((s) => listas.substanciasControladas.has(s));
  if (controlada !== undefined) {
    return {
      liberado: false,
      codigo: 'SUBSTANCIA_CONTROLADA',
      detalhe: `princípio ativo "${controlada}" consta da Portaria SVS/MS 344/98 (referência ${listas.versao})`,
      revisaoHumana: false,
    };
  }
  // RDC 96/2008: "leve X pague Y" e similares são vedados para isentos de prescrição.
  if (produto.condicao?.tipo === 'leve_pague' || produto.condicao?.tipo === 'quantidade_minima') {
    return {
      liberado: false,
      codigo: 'PROMOCAO_PROIBIDA_PARA_MEDICAMENTO',
      detalhe: `promoção por quantidade (${produto.condicao.tipo}) não é permitida para medicamento isento de prescrição`,
      revisaoHumana: false,
    };
  }
  // Parecer da RDC 96/2008 (decisão 58): medicamento desligado enquanto não houver GTIN na fonte,
  // revisão de advogado e consulta à Anvisa. O bloqueio fica registrado para quando for religado.
  if (opcoes.modo === 'desligado') {
    return {
      liberado: false,
      codigo: 'MEDICAMENTO_DESLIGADO',
      detalhe: 'medicamento isento desligado neste tenant (medicamentos.modo = desligado; ver docs/juridico/religar-medicamento.md)',
      revisaoHumana: false,
    };
  }
  return { liberado: true, ehMedicamento: true, categoria: categoriaMedicamentos };
}
