// Normalizador: OfertaBruta → produto + oferta prontos para gravar, ou bloqueio registrado.
import { createHash } from 'node:crypto';
import type { Embalagem } from '../curadoria/tipos.js';
import type { OfertaBruta } from '../fontes/contrato.js';
import { extrairEmbalagem, removerEmbalagem } from './embalagem.js';
import { normalizarTexto, triarMedicamento, type ListasMedicamentos, type CodigoBloqueioMedicamento } from './medicamentos.js';

export interface ConfigNormalizacao {
  /** Nome da categoria na fonte (normalizado) → categoria do app. Fora do mapa: ignorada. */
  mapaCategorias: Record<string, string>;
  categoriaMedicamentos: string;
}

export interface ProdutoNormalizado {
  gtin: string | null;
  chaveHash: string;
  familiaChave: string;
  marca: string | null;
  nome: string;
  categoria: string;
  embalagem: Embalagem;
  ehMedicamento: boolean;
}

export type ResultadoNormalizacao =
  | { tipo: 'ok'; produto: ProdutoNormalizado; oferta: OfertaBruta }
  | { tipo: 'categoria_ignorada'; categoriaFonte: string }
  | { tipo: 'bloqueado'; codigo: CodigoBloqueioMedicamento; detalhe: string; revisaoHumana: boolean };

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function normalizarOferta(
  bruta: OfertaBruta,
  listas: ListasMedicamentos,
  config: ConfigNormalizacao,
): ResultadoNormalizacao {
  const categoriaMapeada = config.mapaCategorias[normalizarTexto(bruta.categoriaFonte)];
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
  );
  if (!triagem.liberado) {
    return { tipo: 'bloqueado', codigo: triagem.codigo, detalhe: triagem.detalhe, revisaoHumana: triagem.revisaoHumana };
  }
  if (categoriaMapeada === undefined && !triagem.ehMedicamento) {
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
      categoria: triagem.categoria,
      embalagem,
      ehMedicamento: triagem.ehMedicamento,
    },
  };
}
