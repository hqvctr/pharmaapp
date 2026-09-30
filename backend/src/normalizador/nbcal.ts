// Triagem NBCAL (Lei 11.265/2006, regulamentada pelo Decreto 9.579/2018). A lei veda a promoção
// comercial de fórmulas infantis para lactentes, mamadeiras, bicos, chupetas e protetores de mamilo,
// e exige advertência do Ministério da Saúde na promoção de outros alimentos infantis.
// Um app de desconto com link de afiliado é promoção comercial: na dúvida, bloqueia (falha fechada).
// Os termos vêm da config do tenant e precisam de validação jurídica.
import { normalizarTexto } from './medicamentos.js';

export interface ResultadoNbcal {
  vedado: boolean;
  termo: string | null;
}

/** Palavra inteira: "nan pro" pega "NAN PRO 1", mas "nan" nunca pegaria "banana". */
function textoComBordas(texto: string): string {
  return ` ${normalizarTexto(texto).replace(/[^a-z0-9]+/g, ' ')} `;
}

export function triarNbcal(titulo: string, descricao: string | null, termosVedados: readonly string[]): ResultadoNbcal {
  const texto = textoComBordas(`${titulo} ${descricao ?? ''}`);
  const termo = termosVedados.find((t) => texto.includes(textoComBordas(t)));
  return { vedado: termo !== undefined, termo: termo ?? null };
}
