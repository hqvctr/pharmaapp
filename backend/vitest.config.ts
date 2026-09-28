import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Testes unitários não podem depender de ordem nem de estado compartilhado.
    sequence: { shuffle: false },
    restoreMocks: true,
  },
});
