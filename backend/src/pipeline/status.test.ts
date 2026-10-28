import { describe, expect, it } from 'vitest';
import { descreverStatus, type Contagens } from './status.js';

const base: Contagens = { produtos: 10, ofertas: 20, linhasHistorico: 30, primeiraObservacao: null, ultimaColeta: null, bloqueios: 2, alertas: 0 };
const agora = new Date('2026-11-15T12:00:00Z');

describe('status da coleta', () => {
  it('sem histórico: explica que falta o primeiro ciclo', () => {
    expect(descreverStatus(base, null, agora).join('\n')).toContain('Ainda não há nenhum preço guardado');
  });

  it('conta os dias de histórico e quanto falta', () => {
    const t = descreverStatus({ ...base, primeiraObservacao: new Date('2026-11-08T12:00:00Z') }, null, agora).join('\n');
    expect(t).toContain('7 de 14 dias');
    expect(t).toContain('Faltam cerca de 7 dias');
  });

  it('14 dias ou mais: libera a avaliação', () => {
    const t = descreverStatus({ ...base, primeiraObservacao: new Date('2026-10-30T12:00:00Z') }, null, agora).join('\n');
    expect(t).toContain('16 de 14 dias');
    expect(t).toContain('Já dá para avaliar');
  });

  it('coleta parada há muitas horas pede atenção', () => {
    const t = descreverStatus({ ...base, ultimaColeta: new Date('2026-11-15T03:00:00Z') }, null, agora).join('\n');
    expect(t).toContain('há 9 hora(s)');
    expect(t).toContain('ATENÇÃO');
  });

  it('mostra o problema do último ciclo', () => {
    const t = descreverStatus(base, { falhou: true, fim: '2026-11-15T10:00:00Z', erro: 'sem internet' }, agora).join('\n');
    expect(t).toContain('COM PROBLEMA');
    expect(t).toContain('sem internet');
  });
});
