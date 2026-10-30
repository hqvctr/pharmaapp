import { describe, expect, it } from 'vitest';
import { descreverStatus, type Contagens } from './status.js';

const base: Contagens = { produtos: 10, ofertas: 20, linhasHistorico: 30, primeiraObservacao: null, diasFechados: 0, ultimaColeta: null, bloqueios: 2, alertas: 0 };
const agora = new Date('2026-11-15T12:00:00Z');

describe('status da coleta', () => {
  it('sem histórico: explica que falta o primeiro ciclo', () => {
    expect(descreverStatus(base, null, agora, 14).join('\n')).toContain('Ainda não há nenhum preço guardado');
  });

  it('conta os dias de histórico e quanto falta', () => {
    const t = descreverStatus({ ...base, primeiraObservacao: new Date('2026-11-08T12:00:00Z'), diasFechados: 7 }, null, agora, 14).join('\n');
    expect(t).toContain('7 de 14 dias');
    expect(t).toContain('Faltam cerca de 7 dias');
  });

  it('14 dias ou mais: libera a avaliação', () => {
    const t = descreverStatus({ ...base, primeiraObservacao: new Date('2026-10-30T12:00:00Z'), diasFechados: 16 }, null, agora, 14).join('\n');
    expect(t).toContain('16 de 14 dias');
    expect(t).toContain('Já dá para avaliar');
  });

  it('conta dias fechados com preço, não o tempo corrido: parada de uma semana não conta como 14 dias', () => {
    const t = descreverStatus({ ...base, primeiraObservacao: new Date('2026-10-01T12:00:00Z'), diasFechados: 5 }, null, agora, 14).join('\n');
    expect(t).toContain('5 de 14 dias');
    expect(t).not.toContain('Já dá para avaliar');
  });

  it('primeiro dia ainda aberto: 0 dias e explica que o dia de hoje não conta', () => {
    const t = descreverStatus({ ...base, primeiraObservacao: new Date('2026-11-15T09:00:00Z'), diasFechados: 0 }, null, agora, 14).join('\n');
    expect(t).toContain('0 de 14 dias');
    expect(t).toContain('dia de hoje ainda não conta');
  });

  it('coleta parada há muitas horas pede atenção', () => {
    const t = descreverStatus({ ...base, ultimaColeta: new Date('2026-11-15T03:00:00Z') }, null, agora, 14).join('\n');
    expect(t).toContain('há 9 hora(s)');
    expect(t).toContain('ATENÇÃO');
  });

  it('mostra os aparelhos registrados e o destino dos avisos das últimas 24 h', () => {
    const t = descreverStatus({ ...base, push: { aparelhos: 1, ultimas24h: { enviado: 2, sem_aparelho: 3 } } }, null, agora, 14).join('\n');
    expect(t).toContain('Aparelhos com notificação registrados: 1. Avisos nas últimas 24 h: enviado 2, sem_aparelho 3.');
    expect(descreverStatus({ ...base, push: { aparelhos: 0, ultimas24h: {} } }, null, agora, 14).join('\n')).toContain('Avisos nas últimas 24 h: nenhum.');
  });

  it('mostra o problema do último ciclo', () => {
    const t = descreverStatus(base, { falhou: true, fim: '2026-11-15T10:00:00Z', erro: 'sem internet' }, agora, 14).join('\n');
    expect(t).toContain('COM PROBLEMA');
    expect(t).toContain('sem internet');
  });
});
