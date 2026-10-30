import { generateKeyPairSync, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EnviadorFcm, lerContaServico, type ContaServico } from './fcm.js';
import type { MensagemPush } from './texto.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const CHAVE = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const CONTA: ContaServico = { projectId: 'economae-teste', clientEmail: 'push@economae-teste.iam.gserviceaccount.com', privateKey: CHAVE, tokenUri: 'https://oauth2.googleapis.com/token' };
const TOKEN_APARELHO = 'token-do-aparelho-secreto';
const MSG: MensagemPush = { titulo: 'Baixou 12%', corpo: 'Fralda G por R$ 59,90 na Drogasmil', dados: { aviso_id: 'a1', tipo: 'queda_percentual', produto_id: 'p1' }, colapso: 'p1', ttlSegundos: 3600 };

type Resposta = { status: number; corpo: unknown };

/** fetch falso: devolve as respostas na ordem e guarda os pedidos. */
function falso(respostas: Array<Resposta | Error>) {
  const pedidos: Array<{ url: string; init: RequestInit }> = [];
  const f = (async (url: string, init: RequestInit) => {
    pedidos.push({ url, init });
    const r = respostas.shift();
    if (r === undefined) throw new Error('pedido a mais');
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r.corpo), { status: r.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { f, pedidos };
}

const TOKEN_OK: Resposta = { status: 200, corpo: { access_token: 'acesso-1', expires_in: 3600 } };
const ENVIO_OK: Resposta = { status: 200, corpo: { name: 'projects/economae-teste/messages/1' } };
const erroFcm = (status: number, situacao: string, errorCode?: string, message = 'x'): Resposta => ({
  status,
  corpo: { error: { code: status, status: situacao, message, details: errorCode ? [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode }] : [] } },
});

describe('lerContaServico', () => {
  const base = { type: 'service_account', project_id: 'economae-teste', client_email: 'a@b.iam.gserviceaccount.com', private_key: CHAVE };
  it('lê o JSON do Google Cloud', () => {
    expect(lerContaServico(JSON.stringify(base))).toEqual({ projectId: 'economae-teste', clientEmail: base.client_email, privateKey: CHAVE, tokenUri: 'https://oauth2.googleapis.com/token' });
  });
  it('recusa o que não é conta de serviço, sem citar o conteúdo', () => {
    expect(() => lerContaServico('{nao json')).toThrow('não é JSON');
    expect(() => lerContaServico(JSON.stringify({ ...base, type: 'authorized_user' }))).toThrow('não é de conta de serviço');
    expect(() => lerContaServico(JSON.stringify({ ...base, private_key: '' }))).toThrow('falta private_key');
    expect(() => lerContaServico(JSON.stringify({ ...base, project_id: '../x' }))).toThrow('project_id inválido');
    try {
      lerContaServico(JSON.stringify({ ...base, project_id: 'X' }));
    } catch (err) {
      expect((err as Error).message).not.toContain('PRIVATE KEY');
    }
  });
});

describe('EnviadorFcm', () => {
  it('troca um JWT assinado pela conta por um token de acesso e envia a mensagem no formato da API v1', async () => {
    const { f, pedidos } = falso([TOKEN_OK, ENVIO_OK]);
    const agora = new Date('2026-11-01T12:00:00Z');
    const r = await new EnviadorFcm(CONTA, { fetch: f, agora: () => agora }).enviar(TOKEN_APARELHO, MSG);
    expect(r).toEqual({ tipo: 'ok' });

    expect(pedidos[0]!.url).toBe('https://oauth2.googleapis.com/token');
    const form = new URLSearchParams(pedidos[0]!.init.body as string);
    expect(form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    const [cab, corpo, assinatura] = form.get('assertion')!.split('.');
    expect(JSON.parse(Buffer.from(cab!, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(JSON.parse(Buffer.from(corpo!, 'base64url').toString())).toEqual({
      iss: CONTA.clientEmail, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: CONTA.tokenUri, iat: 1793534400, exp: 1793538000,
    });
    expect(verify('RSA-SHA256', Buffer.from(`${cab}.${corpo}`), publicKey, Buffer.from(assinatura!, 'base64url'))).toBe(true);

    expect(pedidos[1]!.url).toBe('https://fcm.googleapis.com/v1/projects/economae-teste/messages:send');
    expect((pedidos[1]!.init.headers as Record<string, string>).authorization).toBe('Bearer acesso-1');
    expect(JSON.parse(pedidos[1]!.init.body as string)).toEqual({
      message: {
        token: TOKEN_APARELHO,
        notification: { title: MSG.titulo, body: MSG.corpo },
        data: MSG.dados,
        android: { priority: 'HIGH', ttl: '3600s', collapse_key: 'p1', notification: { channel_id: 'avisos', tag: 'p1' } },
      },
    });
  });

  it('guarda o token de acesso até perto de vencer', async () => {
    let agora = new Date('2026-11-01T12:00:00Z');
    const { f, pedidos } = falso([TOKEN_OK, ENVIO_OK, ENVIO_OK, { status: 200, corpo: { access_token: 'acesso-2', expires_in: 3600 } }, ENVIO_OK]);
    const fcm = new EnviadorFcm(CONTA, { fetch: f, agora: () => agora });
    await fcm.enviar('a', MSG);
    agora = new Date(agora.getTime() + 58 * 60_000);
    await fcm.enviar('b', MSG);
    agora = new Date(agora.getTime() + 2 * 60_000);
    await fcm.enviar('c', MSG);
    expect(pedidos.map((p) => p.url.includes('oauth2'))).toEqual([true, false, false, true, false]);
    expect((pedidos[4]!.init.headers as Record<string, string>).authorization).toBe('Bearer acesso-2');
  });

  it('401 no envio pede outro token uma vez', async () => {
    const { f, pedidos } = falso([TOKEN_OK, erroFcm(401, 'UNAUTHENTICATED'), { status: 200, corpo: { access_token: 'acesso-2', expires_in: 3600 } }, ENVIO_OK]);
    expect(await new EnviadorFcm(CONTA, { fetch: f }).enviar('a', MSG)).toEqual({ tipo: 'ok' });
    expect(pedidos).toHaveLength(4);
  });

  it.each([
    ['aparelho desregistrado', erroFcm(404, 'NOT_FOUND', 'UNREGISTERED'), 'token_invalido'],
    ['token de outro projeto', erroFcm(403, 'PERMISSION_DENIED', 'SENDER_ID_MISMATCH'), 'token_invalido'],
    ['token malformado', erroFcm(400, 'INVALID_ARGUMENT', 'INVALID_ARGUMENT', 'The registration token is not a valid FCM registration token'), 'token_invalido'],
    ['mensagem recusada', erroFcm(400, 'INVALID_ARGUMENT', 'INVALID_ARGUMENT', 'Invalid value at message.android.ttl'), 'falha_mensagem'],
    ['limite do FCM', erroFcm(429, 'RESOURCE_EXHAUSTED', 'QUOTA_EXCEEDED'), 'falha_temporaria'],
    ['FCM fora', erroFcm(503, 'UNAVAILABLE', 'UNAVAILABLE'), 'falha_temporaria'],
    ['credencial sem permissão', erroFcm(403, 'PERMISSION_DENIED'), 'falha_config'],
    ['APNs sem chave', erroFcm(401, 'UNAUTHENTICATED', 'THIRD_PARTY_AUTH_ERROR'), 'falha_config'],
  ] as const)('%s → %s', async (_nome, resposta, tipo) => {
    const respostas: Array<Resposta | Error> = [TOKEN_OK, resposta];
    if (resposta.status === 401) respostas.push(TOKEN_OK, resposta);
    const { f } = falso(respostas);
    const r = await new EnviadorFcm(CONTA, { fetch: f }).enviar(TOKEN_APARELHO, MSG);
    expect(r.tipo).toBe(tipo);
    expect(JSON.stringify(r)).not.toContain(TOKEN_APARELHO);
  });

  it('rede fora é passageira; token recusado pelo Google é de config; nada de segredo na mensagem', async () => {
    const semRede = await new EnviadorFcm(CONTA, { fetch: falso([new TypeError('fetch failed')]).f }).enviar(TOKEN_APARELHO, MSG);
    expect(semRede.tipo).toBe('falha_temporaria');
    const envioSemRede = await new EnviadorFcm(CONTA, { fetch: falso([TOKEN_OK, new TypeError('fetch failed')]).f }).enviar(TOKEN_APARELHO, MSG);
    expect(envioSemRede.tipo).toBe('falha_temporaria');
    const recusado = await new EnviadorFcm(CONTA, { fetch: falso([{ status: 400, corpo: { error: 'invalid_grant', error_description: 'Invalid JWT Signature.' } }]).f }).enviar(TOKEN_APARELHO, MSG);
    expect(recusado).toEqual({ tipo: 'falha_config', motivo: 'token recusado (HTTP 400, invalid_grant)' });
    const chaveRuim = await new EnviadorFcm({ ...CONTA, privateKey: 'nada' }, { fetch: falso([]).f }).enviar(TOKEN_APARELHO, MSG);
    expect(chaveRuim).toEqual({ tipo: 'falha_config', motivo: 'chave privada da conta de serviço ilegível' });
    for (const r of [semRede, envioSemRede, recusado, chaveRuim]) {
      expect(JSON.stringify(r)).not.toContain(TOKEN_APARELHO);
      expect(JSON.stringify(r)).not.toContain('PRIVATE KEY');
    }
  });
});
