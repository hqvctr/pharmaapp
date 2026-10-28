// Onde o HMAC do código de e-mail fica enquanto vale. Só o código mais recente vale; 5 tentativas por código.
import type { Redis } from 'ioredis';

export type ResultadoConferencia = 'ok' | 'invalido' | 'expirado';

export interface ArmazenamentoCodigos {
  /** Guarda (e zera as tentativas). Um código novo substitui o anterior. */
  guardar(chave: string, hmac: string, ttlSegundos: number): Promise<void>;
  /** `invalido` = errou e ainda pode tentar; `expirado` = venceu, nunca existiu ou esgotou as tentativas. */
  conferir(chave: string, hmac: string, maxTentativas: number): Promise<ResultadoConferencia>;
}

type Comparar = (a: string, b: string) => boolean;

export class CodigosRedis implements ArmazenamentoCodigos {
  constructor(
    private readonly redis: Pick<Redis, 'get' | 'set' | 'del' | 'incr' | 'expire'>,
    private readonly iguais: Comparar,
  ) {}

  async guardar(chave: string, hmac: string, ttl: number): Promise<void> {
    await this.redis.set(`codigo:${chave}`, hmac, 'EX', ttl);
    await this.redis.del(`codigo:${chave}:t`);
  }

  async conferir(chave: string, hmac: string, max: number): Promise<ResultadoConferencia> {
    const k = `codigo:${chave}`;
    const guardado = await this.redis.get(k);
    if (guardado === null) return 'expirado';
    // Conta antes de comparar: chutes simultâneos não passam do limite.
    const t = await this.redis.incr(`${k}:t`);
    if (t === 1) await this.redis.expire(`${k}:t`, 900);
    if (t > max) {
      await this.redis.del(k, `${k}:t`);
      return 'expirado';
    }
    if (this.iguais(guardado, hmac)) {
      await this.redis.del(k, `${k}:t`);
      return 'ok';
    }
    if (t === max) await this.redis.del(k, `${k}:t`);
    return 'invalido';
  }
}

/** Em memória: teste e desenvolvimento sem Redis. */
export class CodigosMemoria implements ArmazenamentoCodigos {
  private readonly itens = new Map<string, { hmac: string; fimMs: number; tentativas: number }>();
  constructor(
    private readonly iguais: Comparar,
    private readonly agoraMs: () => number = Date.now,
  ) {}

  async guardar(chave: string, hmac: string, ttl: number): Promise<void> {
    this.itens.set(chave, { hmac, fimMs: this.agoraMs() + ttl * 1000, tentativas: 0 });
  }

  async conferir(chave: string, hmac: string, max: number): Promise<ResultadoConferencia> {
    const i = this.itens.get(chave);
    if (i === undefined || i.fimMs <= this.agoraMs()) {
      this.itens.delete(chave);
      return 'expirado';
    }
    i.tentativas += 1;
    if (i.tentativas > max) {
      this.itens.delete(chave);
      return 'expirado';
    }
    if (this.iguais(i.hmac, hmac)) {
      this.itens.delete(chave);
      return 'ok';
    }
    if (i.tentativas === max) this.itens.delete(chave);
    return 'invalido';
  }
}
