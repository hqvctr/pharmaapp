// Lista de medicamentos para a triagem do cadastro manual de oferta: o mesmo arquivo que o coletor mantém em `<DADOS>/listas/atual.json`
// (volume compartilhado, somente leitura aqui). Relê quando o arquivo muda; sem arquivo ou inválido, falha (o cadastro responde 503).
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { carregarListasMedicamentos } from '../normalizador/listas.js';
import type { ListasMedicamentos } from '../normalizador/medicamentos.js';

export function provedorDeListas(dados: string): () => Promise<ListasMedicamentos> {
  const arquivo = path.join(dados, 'listas', 'atual.json');
  let cache: { mtimeMs: number; listas: ListasMedicamentos } | null = null;
  return async () => {
    const { mtimeMs } = await stat(arquivo);
    if (cache === null || cache.mtimeMs !== mtimeMs) cache = { mtimeMs, listas: await carregarListasMedicamentos(arquivo) };
    return cache.listas;
  };
}
