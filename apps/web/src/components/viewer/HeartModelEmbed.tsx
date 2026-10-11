import { HeartViewer, highlightStructures, type HeartViewerProps } from '@heart-atlas/viewer';
import { useEffect } from 'react';
import { oneOf, parseEmbedParams } from '../../lib/embed.ts';

/** Query parameters the heart model embed accepts: `?structure=<id>` from structures.yaml. */
export function heartModelEmbedParams(structureIds: Iterable<string>) {
  return { structure: oneOf(structureIds) };
}

/**
 * The viewer configured from the query string. The page renders it at build time with nothing
 * highlighted, so the poster shows at once; the parameter is applied after hydration through the
 * viewer's highlight event, which the viewer starts listening to before this effect runs.
 */
export default function HeartModelEmbed(props: HeartViewerProps) {
  const { structures } = props;
  useEffect(() => {
    const ids = structures.map((s) => s.id);
    const { structure } = parseEmbedParams(window.location.search, heartModelEmbedParams(ids));
    if (structure) highlightStructures([structure]);
  }, [structures]);
  return <HeartViewer {...props} />;
}
