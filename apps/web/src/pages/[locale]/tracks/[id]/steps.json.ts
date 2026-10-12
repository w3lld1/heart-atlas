import type { APIRoute, GetStaticPaths } from 'astro';
import { trackRoutes } from '../../../../lib/track-routes.ts';

// The steps of a track for the block under an article opened from it (`?track=<id>`), so
// articles do not carry every track they are in.
export const getStaticPaths = (async () =>
  (await trackRoutes()).map(({ params, props }) => ({
    params,
    props: { data: props.data },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props['data']), {
    headers: { 'Content-Type': 'application/json' },
  });
