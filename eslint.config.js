import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const generated = [
  '**/dist/',
  '**/.astro/',
  '**/node_modules/',
  '**/coverage/',
  '**/playwright-report/',
  '**/test-results/',
  '**/.lighthouseci/',
];

export default defineConfig(
  { ignores: generated },
  js.configs.recommended,
  tseslint.configs.strict,
  astro.configs.recommended,
  { files: ['apps/*/src/**'], languageOptions: { globals: globals.browser } },
  {
    files: ['apps/web/integrations/service-worker.js'],
    languageOptions: { globals: { ...globals.serviceworker, CONFIG: 'readonly' } },
  },
  {
    files: ['**/*.config.{js,mjs,ts}', '**/test/**', '**/*.test.{ts,tsx}', 'scripts/**'],
    languageOptions: { globals: globals.node },
  },
);
