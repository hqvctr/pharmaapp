// Área do operador (admin.yaml): prefixo /v1/admin, token de audiência `operador`.
import type { FastifyInstance } from 'fastify';
import { rotasAdminAlertas } from './alertas.js';
import { rotasAdminAuth } from './auth.js';
import { rotasAdminModeracao } from './moderacao.js';
import { rotasAdminLojasFontes, type DepsAdmin } from './lojasFontes.js';

export type { DepsAdmin } from './lojasFontes.js';

export function rotasAdmin(app: FastifyInstance, d: DepsAdmin): void {
  rotasAdminAuth(app, d);
  rotasAdminAlertas(app, d);
  rotasAdminLojasFontes(app, d);
  rotasAdminModeracao(app, d);
}
