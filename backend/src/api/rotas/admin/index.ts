// Área do operador (admin.yaml): prefixo /v1/admin, token de audiência `operador`.
import type { FastifyInstance } from 'fastify';
import type { DepsAuth } from '../auth.js';
import { rotasAdminAuth } from './auth.js';

export function rotasAdmin(app: FastifyInstance, d: DepsAuth): void {
  rotasAdminAuth(app, d);
}
