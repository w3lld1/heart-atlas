// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import clientDirectives from './integrations/client-directives.ts';
import postBuild from './integrations/post-build.ts';

// SITE_URL and BASE_PATH come from the deploy workflow. Empty values fall back to the
// GitHub Pages defaults. base always ends with "/" so `${BASE_URL}path` joins correctly.
const site = process.env.SITE_URL || 'https://w3lld1.github.io';
const base = (process.env.BASE_PATH ?? '/heart-atlas').replace(/\/?$/, '/');

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  integrations: [mdx(), react(), clientDirectives(), postBuild()],
});
