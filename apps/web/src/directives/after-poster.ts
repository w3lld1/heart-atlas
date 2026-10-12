import type { ClientDirective } from 'astro';

/**
 * Like `client:visible` with a 200px margin, but also waits until the island's poster image is
 * on screen. The island's script (React and the viewer) then never competes with the poster,
 * the largest paint of the page, for the network or the main thread.
 */
const afterPoster: ClientDirective = (load, _options, el) => {
  const hydrate = async () => {
    const run = await load();
    await run();
  };
  // After the next frame, the poster is on screen: rAF runs before that paint, the task after it.
  const afterPaint = () => requestAnimationFrame(() => setTimeout(() => void hydrate()));
  const afterImage = () => {
    const poster = el.querySelector('img');
    if (!poster) {
      void hydrate();
      return;
    }
    // A poster that fails still starts the viewer, which then shows its own error state.
    poster.decode().then(afterPaint, afterPaint);
  };
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      afterImage();
    },
    { rootMargin: '200px' },
  );
  // The island element is display: contents, so the observer watches its children.
  for (const child of el.children) observer.observe(child);
};

export default afterPoster;
