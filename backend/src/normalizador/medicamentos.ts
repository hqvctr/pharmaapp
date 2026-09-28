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
  | 'TERMO_DE_VENDA_CONTROLADA'
  | 'MEDICAMENTO_COM_PRESCRICAO'
  | 'SUBSTANCIA_CONTROLADA'
  | 'PROMOCAO_PROIBIDA_PARA_MEDICAMENTO'
  | 'MEDICAMENTO_SEM_REFERENCIA';

export type ResultadoTriagem =
  | { liberado: true; ehMedicamento: boolean; categoria: string }
  | { liberado: false; codigo: CodigoBloqueioMedicamento; detalhe: string; revisaoHumana: boolean };

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

  const ref = produto.gtin !== null ? listas.porGtin.get(produto.gtin) : undefined;

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
  return { liberado: true, ehMedicamento: true, categoria: categoriaMedicamentos };
}
