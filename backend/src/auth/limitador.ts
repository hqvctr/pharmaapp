// Limite de taxa por janela fixa. Serve para o que não tem tabela própria (ex.: pedidos por IP).
import type { Redis } from 'ioredis';

export interface ResultadoLimite {
  permitido: boolean;
  /** Segundos até a janela reabrir; 0 quando permitido. */
  retryAposSegundos: number;
}

export interface LimitadorTaxa {
  consumir(chave: string, limite: number, janelaSegundos: number): Promise<ResultadoLimite>;
}

export class LimitadorRedis implements LimitadorTaxa {
  constructor(private readonly redis: Redis) {}

  async consumir(chave: string, limite: number, janelaSegundos: number): Promise<ResultadoLimite> {
    const k = `limite:${chave}`;
    const [[, n], [, ttl]] = (await this.redis.multi().incr(k).ttl(k).exec()) as [[null, number], [null, number]];
    // TTL -1: chave recém-criada (ou que perdeu a expiração); a janela começa agora.
    if (ttl < 0) await this.redis.expire(k, janelaSegundos);
    if (n <= limite) return { permitido: true, retryAposSegundos: 0 };
    return { permitido: false, retryAposSegundos: ttl > 0 ? ttl : janelaSegundos };
  }
}

/** Para testes e para rodar sem Redis. Relógio injetado. */
export class LimitadorMemoria implements LimitadorTaxa {
  private readonly janelas = new Map<string, { n: number; fimMs: number }>();

  constructor(private readonly agora: () => Date = () => new Date()) {}

  async consumir(chave: string, limite: number, janelaSegundos: number): Promise<ResultadoLimite> {
    const t = this.agora().getTime();
    let j = this.janelas.get(chave);
    if (j === undefined || j.fimMs <= t) {
      j = { n: 0, fimMs: t + janelaSegundos * 1000 };
      this.janelas.set(chave, j);
    }
    j.n++;
    if (j.n <= limite) return { permitido: true, retryAposSegundos: 0 };
    return { permitido: false, retryAposSegundos: Math.ceil((j.fimMs - t) / 1000) };
  }
}
