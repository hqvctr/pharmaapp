import { describe, expect, it } from 'vitest';
import { EnviadorBrevo, EnviadorConsole, EnvioFalhouError } from './enviador.js';

const remetente = { email: 'nao-responda@exemplo.com', nome: 'economae' };

describe('EnviadorBrevo', () => {
  it('manda o pedido no formato da API, com a chave só no cabeçalho', async () => {
    let visto: { url: string; init: RequestInit } | undefined;
    const e = new EnviadorBrevo('CHAVE-SECRETA', remetente, (async (url: string, init: RequestInit) => {
      visto = { url, init };
      return new Response('{}', { status: 201 });
    }) as never);
    await e.enviarCodigo('maria@exemplo.com', '482913', 'economae');
    expect(visto!.url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((visto!.init.headers as Record<string, string>)['api-key']).toBe('CHAVE-SECRETA');
    const corpo = JSON.parse(String(visto!.init.body));
    expect(corpo.sender).toEqual({ email: 'nao-responda@exemplo.com', name: 'economae' });
    expect(corpo.to).toEqual([{ email: 'maria@exemplo.com' }]);
    expect(corpo.textContent).toContain('482913');
    expect(JSON.stringify(corpo)).not.toContain('CHAVE-SECRETA');
  });

  it('erro do provedor vira EnvioFalhouError sem vazar a chave nem o código', async () => {
    const e = new EnviadorBrevo('CHAVE-SECRETA', remetente, (async () => new Response('{"message":"x"}', { status: 401 })) as never);
    const erro = await e.enviarCodigo('a@b.co', '123456', 'economae').catch((x) => x);
    expect(erro).toBeInstanceOf(EnvioFalhouError);
    expect(erro.message).toBe('Envio de e-mail falhou: HTTP 401');
  });

  it('falha de rede também', async () => {
    const e = new EnviadorBrevo('k', remetente, (async () => {
      throw new TypeError('fetch failed');
    }) as never);
    await expect(e.enviarCodigo('a@b.co', '123456', 'economae')).rejects.toThrow('falha de rede');
  });
});

describe('EnviadorConsole', () => {
  it('escreve o código (só para desenvolvimento)', async () => {
    const linhas: string[] = [];
    await new EnviadorConsole((m) => linhas.push(m)).enviarCodigo('a@b.co', '123456', 'economae');
    expect(linhas[0]).toContain('123456');
  });
});
