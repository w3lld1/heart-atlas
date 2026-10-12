import type { AstroIntegration } from 'astro';

/** Hydration directives of our own; see src/directives/. */
export default function clientDirectives(): AstroIntegration {
  return {
    name: 'heart-atlas:client-directives',
    hooks: {
      'astro:config:setup': ({ addClientDirective }) => {
        addClientDirective({
          name: 'after-poster',
          entrypoint: new URL('../src/directives/after-poster.ts', import.meta.url),
        });
      },
    },
  };
}
