// Carrega a referência de medicamentos de um arquivo JSON. Sem arquivo, o normalizador não sobe:
// falha fechada. Formato: { versao, referencia: [{gtin, principioAtivo, isentoPrescricao}],
// substanciasControladas: [...], termosBloqueados: [...] }.
import { readFile } from 'node:fs/promises';
import { normalizarTexto, type ListasMedicamentos, type ReferenciaMedicamento } from './medicamentos.js';

export async function carregarListasMedicamentos(arquivo: string): Promise<ListasMedicamentos> {
  const bruto = JSON.parse(await readFile(arquivo, 'utf8'));
  if (typeof bruto.versao !== 'string' || !Array.isArray(bruto.referencia) || !Array.isArray(bruto.substanciasControladas)
    || !Array.isArray(bruto.termosBloqueados) || bruto.termosBloqueados.length === 0) {
    throw new Error(`Listas de medicamentos inválidas em ${arquivo}`);
  }
  return {
    versao: bruto.versao,
    porGtin: new Map((bruto.referencia as ReferenciaMedicamento[]).map((r) => [r.gtin, r])),
    substanciasControladas: new Set((bruto.substanciasControladas as string[]).map(normalizarTexto)),
    termosBloqueados: bruto.termosBloqueados,
  };
}
