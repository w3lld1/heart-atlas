/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { getViteConfig } from 'astro/config';

// Runs tests through Astro's Vite setup so `astro:content` and import.meta.env work. The root
// keeps this app's Astro config (with its React integration) when tests run from the repo root.
export default getViteConfig(
  {
    test: {
      include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    },
  },
  { root: fileURLToPath(new URL('.', import.meta.url)) },
);
