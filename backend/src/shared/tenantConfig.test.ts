import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { carregarConfigTenant, DIR_CONFIG } from './tenantConfig.js';

const temporarios: string[] = [];
afterAll(async () => {
  await Promise.all(temporarios.map((d) => rm(d, { recursive: true, force: true })));
});

async function comMedicamentos(alteracao: (m: Record<string, unknown>) => void): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'economae-config-'));
  temporarios.push(dir);
  await mkdir(path.join(dir, 'tenants'));
  const bruto = JSON.parse(await readFile(path.join(DIR_CONFIG, 'tenants', 'padrao.json'), 'utf8'));
  alteracao(bruto.medicamentos);
  await writeFile(path.join(dir, 'tenants', 'padrao.json'), JSON.stringify(bruto));
  return dir;
}

describe('config de medicamentos do tenant (parecer da RDC 96/2008)', () => {
  it('o padrão carrega desligado, com a trava por nome compilada', async () => {
    const c = await carregarConfigTenant('padrao');
    expect(c.medicamentos.modo).toBe('desligado');
    expect(c.medicamentos.triagemPorNome.substancias).toContain(' dipirona ');
    expect(c.medicamentos.notificar).toBe(false);
  });

  it.each(['lista', 'propaganda', 'ligado', undefined])('modo %s é recusado: ainda não está implementado', async (modo) => {
    const dir = await comMedicamentos((m) => {
      m.modo = modo;
    });
    await expect(carregarConfigTenant('padrao', dir)).rejects.toThrow(/medicamentos\.modo/);
  });

  it('config sem a trava por nome é recusada', async () => {
    const dir = await comMedicamentos((m) => {
      delete m.triagemPorNome;
    });
    await expect(carregarConfigTenant('padrao', dir)).rejects.toThrow(/triagemPorNome/);
  });
});
