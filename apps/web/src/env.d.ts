declare namespace App {
  interface Locals {
    /** Page locale, set by article pages so MDX components can read their UI strings. */
    locale?: string;
    /** Number of sources of the current article, so Cite can reject a missing source. */
    sourceCount?: number;
    /** The article being rendered, in the language of its text (a fallback page differs). */
    article?: { locale: string; type: string; slug: string };
    /** True on embed pages, where components skip scripts and storage. */
    embed?: boolean;
    /** Diagrams rendered so far on the page, for unique ids. */
    diagramCount?: number;
  }
}

declare namespace Astro {
  interface ClientDirectives {
    /** Hydrates once the island is near the screen and its poster image has loaded. */
    'client:after-poster'?: boolean;
  }
}
