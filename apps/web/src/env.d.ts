declare namespace App {
  interface Locals {
    /** Page locale, set by article pages so MDX components can read their UI strings. */
    locale?: string;
    /** Number of sources of the current article, so Cite can reject a missing source. */
    sourceCount?: number;
    /** Diagrams rendered so far on the page, for unique ids. */
    diagramCount?: number;
  }
}
