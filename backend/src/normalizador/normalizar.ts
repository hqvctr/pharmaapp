// Normalizador: OfertaBruta → produto + oferta prontos para gravar, ou bloqueio registrado.
import { createHash } from 'node:crypto';
import type { Embalagem } from '../curadoria/tipos.js';
import type { OfertaBruta } from '../fontes/contrato.js';
import { extrairEmbalagem, removerEmbalagem } from './embalagem.js';
import {
  normalizarTexto,
  triarMedicamento,
  type CodigoBloqueioMedicamento,
  type ListasMedicamentos,
  type ModoMedicamentos,
  type TriagemPorNome,
} from './medicamentos.js';
import { categorizar, type RegrasCategorizacao } from './categorizar.js';
import { triarNbcal, type CodigoAdvertenciaNbcal, type RegrasNbcal } from './nbcal.js';

export interface ConfigNormalizacao {
  /** Nome da categoria na fonte (normalizado) → categoria do app. Fora do mapa: ignorada. */
  mapaCategorias: Record<string, string>;
  categoriaMedicamentos: string;
  modoMedicamentos: ModoMedicamentos;
  triagemPorNome: TriagemPorNome;
  nbcal: RegrasNbcal;
  /** Categorização por texto, categoria da fonte e marca. Sem isto vale só `mapaCategorias` (comportamento antigo). */
  categorizacao?: RegrasCategorizacao;
  /**
   * Códigos de bloqueio que um operador liberou para ESTA oferta (admin: triagem `liberado`, D20). Só valem os que a triagem
   * permite liberar (cautela da NBCAL e filtro de texto de medicamento); um código vedado ou de GTIN da CMED aqui é ignorado.
   */
  liberados?: ReadonlySet<string>;
}

/** Códigos que a liberação do operador consegue destravar (D20). Os demais só mudam ajustando as listas. */
export const CODIGOS_LIBERAVEIS: ReadonlySet<string> = new Set(['NBCAL_CAUTELA', 'TERMO_DE_VENDA_CONTROLADA', 'MEDICAMENTO_SEM_REFERENCIA']);

export type CodigoBloqueio = CodigoBloqueioMedicamento | 'NBCAL_VEDADO' | 'NBCAL_CAUTELA';

export interface ProdutoNormalizado {
  gtin: string | null;
  chaveHash: string;
  familiaChave: string;
  marca: string | null;
  nome: string;
  categoria: string;
  /** Subcategoria dentro da categoria do app; null quando a regra não define. */
  subcategoria: string | null;
  /** Foto na loja (https) ou null. */
  imagemUrl: string | null;
  embalagem: Embalagem;
  ehMedicamento: boolean;
  /** Advertências do Decreto 9.579/2018, art. 6º; vazio = livre. */
  advertencias: CodigoAdvertenciaNbcal[];
}

export type ResultadoNormalizacao =
  | { tipo: 'ok'; produto: ProdutoNormalizado; oferta: OfertaBruta }
  | { tipo: 'categoria_ignorada'; categoriaFonte: string }
  | { tipo: 'bloqueado'; codigo: CodigoBloqueio; detalhe: string; revisaoHumana: boolean };

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function normalizarOferta(
  bruta: OfertaBruta,
  listas: ListasMedicamentos,
  config: ConfigNormalizacao,
): ResultadoNormalizacao {
  const daFonte = config.mapaCategorias[normalizarTexto(bruta.categoriaFonte)];
  // Medicamento continua decidido pelo mapa da fonte (a triagem precisa dele); o resto, pela categorização quando ela existe.
  let categoriaMapeada = daFonte;
  let subcategoria: string | null = null;
  if (daFonte !== config.categoriaMedicamentos && config.categorizacao !== undefined) {
    const c = categorizar(bruta, config.categorizacao);
    categoriaMapeada = c?.categoria;
    subcategoria = c?.subcategoria ?? null;
  }
  // A triagem roda antes do descarte por categoria: um remédio controlado numa categoria
  // não mapeada também precisa ficar registrado.
  const triagem = triarMedicamento(
    {
      gtin: bruta.gtin,
      titulo: bruta.titulo,
      descricao: bruta.descricao,
      categoria: categoriaMapeada ?? '',
      condicao: bruta.condicao,
    },
    listas,
    config.categoriaMedicamentos,
    { modo: config.modoMedicamentos, triagemPorNome: config.triagemPorNome },
  );
  // Liberação do operador: só vale para bloqueio de texto (revisão humana), nunca para medicamento achado por GTIN na CMED.
  const liberadoPeloOperador =
    !triagem.liberado && triagem.revisaoHumana && CODIGOS_LIBERAVEIS.has(triagem.codigo) && config.liberados?.has(triagem.codigo) === true;
  if (!triagem.liberado && !liberadoPeloOperador) {
    return { tipo: 'bloqueado', codigo: triagem.codigo, detalhe: triagem.detalhe, revisaoHumana: triagem.revisaoHumana };
  }
  // NBCAL também antes do descarte por categoria: o tipo do produto decide, não a categoria da fonte.
  const nbcal = triarNbcal(bruta.titulo, bruta.descricao, config.nbcal);
  const cautelaLiberada = nbcal.tipo === 'cautela' && config.liberados?.has('NBCAL_CAUTELA') === true;
  if ((nbcal.tipo === 'vedado' || nbcal.tipo === 'cautela') && !cautelaLiberada) {
    return {
      tipo: 'bloqueado',
      codigo: nbcal.tipo === 'vedado' ? 'NBCAL_VEDADO' : 'NBCAL_CAUTELA',
      detalhe: `regra "${nbcal.regra}" (termo "${nbcal.termo}"): ${nbcal.base}; regras ${config.nbcal.versao}`,
      revisaoHumana: false,
    };
  }
  if (categoriaMapeada === undefined && !(triagem.liberado && triagem.ehMedicamento)) {
    return { tipo: 'categoria_ignorada', categoriaFonte: bruta.categoriaFonte };
  }

  const { embalagem } = extrairEmbalagem(bruta.titulo);
  const marca = bruta.marca === null ? null : normalizarTexto(bruta.marca);
  const familia = [marca ?? '', removerEmbalagem(bruta.titulo)].join('|');
  const chave = bruta.gtin !== null ? `gtin:${bruta.gtin}` : `${familia}|${embalagem.quantidade}${embalagem.unidade}`;

  return {
    tipo: 'ok',
    oferta: bruta,
    produto: {
      gtin: bruta.gtin,
      chaveHash: sha256(chave),
      familiaChave: sha256(familia),
      marca: bruta.marca,
      nome: bruta.titulo,
      // Liberado pelo operador: vale a categoria da fonte. Se ela for a de medicamentos, o produto continua tratado como medicamento.
      categoria: triagem.liberado ? triagem.categoria : (categoriaMapeada ?? ''),
      subcategoria,
      imagemUrl: bruta.imagemUrl ?? null,
      embalagem,
      ehMedicamento: triagem.liberado ? triagem.ehMedicamento : categoriaMapeada === config.categoriaMedicamentos,
      advertencias: nbcal.tipo === 'advertencia' ? nbcal.advertencias : [],
    },
  };
}
