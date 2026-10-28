// Registro de adaptadores de fonte. Cada canal de ofertas (Lomadee, Mercado Livre, uma rede de afiliados,
// um feed de produtos...) é um módulo que implementa SourceAdapter e se registra aqui. O tenant liga uma
// fonte a um adaptador na config (`fontes.<nome>.adaptador`) e o operador grava as credenciais dela
// cifradas no banco; nada de segredo na config nem no código.
import type { HttpGetJson, SourceAdapter, TipoFonte } from './contrato.js';
import { fabricaLomadee } from './lomadee.js';

export interface ArgumentosFabrica {
  http: HttpGetJson;
  /** Bloco `fontes.<nome>` da config do tenant, sem validação: cada fábrica valida o que usa. */
  config: Readonly<Record<string, unknown>>;
  /** Campos secretos já decifrados (ou valores de mentira em reprodução de gravações). */
  credenciais: Readonly<Record<string, string>>;
  /** Ids de loja na fonte que o operador vinculou e aprovou. */
  lojas: string[];
}

export interface FabricaFonte {
  /** Nome do adaptador, igual a `fontes.<nome>.adaptador` (ou ao próprio nome da fonte, se omitido). */
  adaptador: string;
  tipo: TipoFonte;
  /** Campos secretos que a fonte exige. Faltou um, a coleta não roda. */
  credenciais: readonly string[];
  criar(args: ArgumentosFabrica): SourceAdapter;
  /** Só para adaptadores que sabem reproduzir respostas gravadas (testes e critério de pronto). */
  httpGravado?(dir: string): HttpGetJson;
}

const fabricas = new Map<string, FabricaFonte>();

export function registrarFabrica(f: FabricaFonte): void {
  if (fabricas.has(f.adaptador)) throw new Error(`Adaptador já registrado: ${f.adaptador}`);
  fabricas.set(f.adaptador, f);
}

export function fabricaDo(adaptador: string): FabricaFonte {
  const f = fabricas.get(adaptador);
  if (f === undefined) {
    throw new Error(`Adaptador desconhecido: ${adaptador} (registrados: ${[...fabricas.keys()].sort().join(', ')})`);
  }
  return f;
}

export function adaptadoresRegistrados(): string[] {
  return [...fabricas.keys()].sort();
}

/** Confere que todos os campos secretos que a fábrica exige estão presentes e não vazios. */
export function validarCredenciais(f: FabricaFonte, credenciais: Readonly<Record<string, string>>): void {
  const faltando = f.credenciais.filter((c) => (credenciais[c] ?? '') === '');
  if (faltando.length > 0) throw new Error(`Credenciais ausentes para ${f.adaptador}: ${faltando.join(', ')}`);
}

registrarFabrica(fabricaLomadee);
