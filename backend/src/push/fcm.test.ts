import { generateKeyPairSync, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EnviadorFcm } from './fcm.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const conta = {
  project_id: 'project-79519032-1c32-4dac-a1f',
  client_email: 'despacho@projeto.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
};
const mensagem = { titulo: 'R$ 49,90 · Fralda', corpo: 'Menor preço em 6 meses', expandido: 'Menor preço em 6 meses\nAviso', dados: { tipo: 'oferta', ofertaId: 'o1', entregaId: 'e1', loja: 'Loja', privado: '0' } };
const android = { canal: 'ofertas', tag: 'o1', validadeSegundos: 3600 };

function falso(respostaEnvio: { status: number; corpo?: unknown }) {
  const pedidos: Array<{ url: string; init: RequestInit }> = [];
  const f = (async (url: string, init: RequestInit) => {
    pedidos.push({ url, init });
    if (url.startsWith('https://oauth2.googleapis.com')) {
      return new Response(JSON.stringify({ access_token: 'ya29.teste', expires_in: 3600 }), { status: 200 });
    }
    return new Response(JSON.stringify(respostaEnvio.corpo ?? { name: 'projects/x/messages/1' }), { status: respostaEnvio.status });
  }) as unknown as typeof fetch;
  return { f, pedidos };
}

describe('EnviadorFcm', () => {
  it('troca um JWT assinado pela conta de serviço por token OAuth e envia pela API HTTP v1', async () => {
    const { f, pedidos } = falso({ status: 200 });
    const e = new EnviadorFcm(conta, f, () => new Date('2026-09-30T12:00:00Z'));
    expect(await e.enviar('token-do-aparelho', mensagem, android)).toEqual({ tipo: 'ok' });
    expect(await e.enviar('outro-token', mensagem, android)).toEqual({ tipo: 'ok' });
    // Token OAuth reaproveitado: 1 troca, 2 envios.
    expect(pedidos.map((p) => new URL(p.url).host)).toEqual(['oauth2.googleapis.com', 'fcm.googleapis.com', 'fcm.googleapis.com']);

    const assertion = new URLSearchParams(pedidos[0]!.init.body as URLSearchParams).get('assertion')!;
    const [h, p, s] = assertion.split('.') as [string, string, string];
    expect(verify('sha256', Buffer.from(`${h}.${p}`), publicKey, Buffer.from(s, 'base64url'))).toBe(true);
    expect(JSON.parse(Buffer.from(p, 'base64url').toString())).toMatchObject({
      iss: conta.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
    });

    expect(pedidos[1]!.url).toBe('https://fcm.googleapis.com/v1/projects/project-79519032-1c32-4dac-a1f/messages:send');
    expect((pedidos[1]!.init.headers as Record<string, string>).authorization).toBe('Bearer ya29.teste');
    expect(JSON.parse(pedidos[1]!.init.body as string)).toEqual({
      message: {
        token: 'token-do-aparelho',
        // Só dados: o app desenha a notificação (texto expandido e versão pública).
        data: { ...mensagem.dados, titulo: mensagem.titulo, corpo: mensagem.corpo, expandido: mensagem.expandido, canal: 'ofertas', tag: 'o1' },
        android: { priority: 'HIGH', ttl: '3600s' },
      },
    });
  });

  it('token não registrado vira token_invalido; outros erros não apagam o aparelho', async () => {
    const naoRegistrado = falso({
      status: 404,
      corpo: { error: { status: 'NOT_FOUND', details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED' }] } },
    });
    expect(await new EnviadorFcm(conta, naoRegistrado.f).enviar('t', mensagem, android)).toEqual({ tipo: 'token_invalido' });
    const fora = falso({ status: 503, corpo: { error: { status: 'UNAVAILABLE' } } });
    expect(await new EnviadorFcm(conta, fora.f).enviar('t', mensagem, android)).toEqual({ tipo: 'erro', detalhe: 'FCM HTTP 503 UNAVAILABLE' });
  });
});
