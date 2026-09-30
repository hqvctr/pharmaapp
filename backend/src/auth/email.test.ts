import { describe, expect, it } from 'vitest';
import { CotaDiariaDeEmailEsgotada, EnviadorComCotaDiaria, EnviadorEmailBrevo, textoCodigo, type MensagemCodigo } from './email.js';
import { LimitadorMemoria } from './limitador.js';

const msg: MensagemCodigo = { para: 'ana@exemplo.com', codigo: '042917', nomeApp: 'economae', validadeMinutos: 10 };
const config = { apiKey: 'xkeysib-SEGREDO', remetente: 'nao-responda@economae.app', nomeRemetente: 'economae' };

function fetchFalso(status: number, corpo: unknown = { messageId: '<1@brevo>' }) {
  const pedidos: Array<{ url: string; init: RequestInit }> = [];
  const f = (async (url: string, init: RequestInit) => {
    pedidos.push({ url, init });
    return new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { f, pedidos };
}

describe('EnviadorEmailBrevo', () => {
  it('chama a API transacional com a chave no cabeçalho e o código no assunto e no corpo', async () => {
    const { f, pedidos } = fetchFalso(201);
    await new EnviadorEmailBrevo(config, f).enviarCodigo(msg);
    expect(pedidos).toHaveLength(1);
    const { url, init } = pedidos[0]!;
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['api-key']).toBe('xkeysib-SEGREDO');
    const corpo = JSON.parse(init.body as string);
    expect(corpo).toMatchObject({
      sender: { email: 'nao-responda@economae.app', name: 'economae' },
      to: [{ email: 'ana@exemplo.com' }],
      subject: '042917 é o seu código de acesso ao economae',
    });
    expect(corpo.textContent).toContain('10 minutos');
    expect(corpo.htmlContent).not.toMatch(/<a\s/);
  });

  it('erro do Brevo vira exceção sem vazar a chave nem o destinatário', async () => {
    const { f } = fetchFalso(401, { code: 'unauthorized', message: 'Key not found' });
    const erro = await new EnviadorEmailBrevo(config, f).enviarCodigo(msg).catch((e: Error) => e);
    expect((erro as Error).message).toBe('Brevo recusou o envio: HTTP 401 (unauthorized)');
    expect((erro as Error).message).not.toContain('SEGREDO');
    expect((erro as Error).message).not.toContain('ana@');
  });

  it('rede fora do ar vira exceção', async () => {
    const f = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    await expect(new EnviadorEmailBrevo(config, f).enviarCodigo(msg)).rejects.toThrow('Brevo inacessível');
  });
});

describe('EnviadorComCotaDiaria', () => {
  it('recusa acima da cota e reabre no dia seguinte (UTC)', async () => {
    let agora = new Date('2026-09-28T10:00:00Z');
    const enviados: string[] = [];
    const e = new EnviadorComCotaDiaria({ enviarCodigo: async (m) => void enviados.push(m.para) }, new LimitadorMemoria(() => agora), 2, () => agora);
    await e.enviarCodigo(msg);
    await e.enviarCodigo(msg);
    await expect(e.enviarCodigo(msg)).rejects.toBeInstanceOf(CotaDiariaDeEmailEsgotada);
    agora = new Date('2026-09-29T00:00:01Z');
    await e.enviarCodigo(msg);
    expect(enviados).toHaveLength(3);
  });
});

describe('textoCodigo', () => {
  it('não põe link no e-mail', () => {
    const t = textoCodigo(msg);
    expect(`${t.texto}${t.html}`).not.toMatch(/https?:\/\//);
  });
});
