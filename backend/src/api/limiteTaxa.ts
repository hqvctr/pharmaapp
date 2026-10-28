// Limite de taxa por chave (rota + IP, ou rota + e-mail). Janela fixa: simples e suficiente para o MVP.
import type { Redis } from 'ioredis';

export interface LimitadorTaxa {
  /** Registra um uso; devolve segundos até liberar quando passou do limite, ou null quando está dentro. */
  usar(chave: string, maximo: number, janelaSegundos: number): Promise<number | null>;
}

/** Em memória: para teste e para rodar a API sem Redis. Não serve para mais de um processo. */
export class LimitadorMemoria implements LimitadorTaxa {
  private readonly janelas = new Map<string, { fimMs: number; usos: number }>();
  constructor(private readonly agoraMs: () => number = Date.now) {}

  async usar(chave: string, maximo: number, janelaSegundos: number): Promise<number | null> {
    const agora = this.agoraMs();
    let j = this.janelas.get(chave);
    if (j === undefined || j.fimMs <= agora) {
      j = { fimMs: agora + janelaSegundos * 1000, usos: 0 };
      this.janelas.set(chave, j);
    }
    j.usos += 1;
    return j.usos > maximo ? Math.max(1, Math.ceil((j.fimMs - agora) / 1000)) : null;
  }
}

export class LimitadorRedis implements LimitadorTaxa {
  constructor(private readonly redis: Pick<Redis, 'incr' | 'expire' | 'ttl'>) {}

  async usar(chave: string, maximo: number, janelaSegundos: number): Promise<number | null> {
    const k = `limite:${chave}`;
    const usos = await this.redis.incr(k);
    if (usos === 1) await this.redis.expire(k, janelaSegundos);
    if (usos <= maximo) return null;
    const ttl = await this.redis.ttl(k);
    if (ttl < 0) await this.redis.expire(k, janelaSegundos); // chave sem validade (queda entre incr e expire)
    return ttl > 0 ? ttl : janelaSegundos;
  }
}
