// Cifra das credenciais de fonte (P2, DECISIONS 22): AES-256-GCM com `node:crypto`.
// A chave vem do ambiente (CREDENTIALS_KEY, 32 bytes em base64) com um id de versão, para poder girar a
// chave sem perder o que já está gravado. O texto autenticado adicional (AAD) amarra o segredo ao tenant
// e à fonte: trocar a linha de lugar no banco faz a decifragem falhar.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export interface ChaveCredenciais {
  versao: string;
  chave: Buffer;
}

export interface SegredoCifrado {
  chaveVersao: string;
  iv: Buffer;
  textoCifrado: Buffer;
  tag: Buffer;
}

export function carregarChaveCredenciais(env: NodeJS.ProcessEnv = process.env): ChaveCredenciais {
  const bruta = env.CREDENTIALS_KEY;
  if (bruta === undefined || bruta === '') throw new Error('Missing required environment variable: CREDENTIALS_KEY');
  const chave = Buffer.from(bruta, 'base64');
  if (chave.length !== 32) throw new Error('CREDENTIALS_KEY inválida: precisa ser 32 bytes em base64 (openssl rand -base64 32)');
  const versao = env.CREDENTIALS_KEY_VERSION ?? 'v1';
  if (!/^[A-Za-z0-9._-]{1,32}$/.test(versao)) throw new Error('CREDENTIALS_KEY_VERSION inválida');
  return { versao, chave };
}

export function cifrar(texto: string, chave: ChaveCredenciais, aad: string): SegredoCifrado {
  const iv = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', chave.chave, iv);
  cifra.setAAD(Buffer.from(aad, 'utf8'));
  const textoCifrado = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
  return { chaveVersao: chave.versao, iv, textoCifrado, tag: cifra.getAuthTag() };
}

/** `chaves` tem todas as versões ainda em uso; a do segredo é escolhida pelo id gravado. */
export function decifrar(segredo: SegredoCifrado, chaves: readonly ChaveCredenciais[], aad: string): string {
  const chave = chaves.find((c) => c.versao === segredo.chaveVersao);
  if (chave === undefined) throw new Error(`Chave de credenciais da versão ${segredo.chaveVersao} não disponível`);
  const decifra = createDecipheriv('aes-256-gcm', chave.chave, segredo.iv);
  decifra.setAAD(Buffer.from(aad, 'utf8'));
  decifra.setAuthTag(segredo.tag);
  try {
    return Buffer.concat([decifra.update(segredo.textoCifrado), decifra.final()]).toString('utf8');
  } catch {
    // Mensagem fixa: nada do conteúdo nem da chave vai para o erro.
    throw new Error('Credencial não pôde ser decifrada (chave errada, dado alterado ou linha trocada de lugar)');
  }
}
