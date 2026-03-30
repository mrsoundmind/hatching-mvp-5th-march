import { defineConfig } from 'vitest/config';
import { VitestReporter } from 'tdd-guard-vitest';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve('/Users/shashankrai/Documents/hatching-mvp-5th-march/shared'),
    },
  },
  test: {
    reporters: [
      'default',
      new VitestReporter('/Users/shashankrai/Documents/hatching-mvp-5th-march'),
    ],
    environment: 'node',
    include: ['scripts/**/*.test.ts'],
  },
});
