// The block under an article opened from a track (`?track=<id>`): the step, a "read" box and the
// previous and next steps. Loaded only when the parameter is there.
import { fillTitle, isRead, setRead, type TrackData } from './track-progress.ts';

export async function initTrackStep(block: HTMLElement, id: string): Promise<void> {
  const {
    tracksUrl = '',
    localeUrl = '',
    path,
    position = '',
    previous = '',
    next = '',
  } = block.dataset;
  let data: TrackData;
  try {
    const response = await fetch(`${tracksUrl}${id}/steps.json`);
    if (!response.ok) return;
    data = (await response.json()) as TrackData;
  } catch {
    // Offline or an unknown track: the article reads the same without the block.
    return;
  }
  const index = data.steps.findIndex((step) => step.path === path);
  const step = data.steps[index];
  if (!step) return;

  const stepUrl = (other: { path: string }) => `${localeUrl}${other.path}/?track=${id}`;
  const title = block.querySelector<HTMLElement>('.track-step-title');
  if (title) {
    fillTitle(
      title,
      position.replace('{n}', String(index + 1)).replace('{total}', String(data.steps.length)),
      data.title,
      data,
      `${tracksUrl}${id}/`,
    );
  }

  const box = block.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (box) {
    box.checked = isRead(step.key);
    box.addEventListener('change', () => setRead(step.key, box.checked));
    // A mark made on the track page or in another tab shows here too.
    const refresh = () => (box.checked = isRead(step.key));
    addEventListener('storage', refresh);
    addEventListener('pageshow', (event) => {
      if (event.persisted) refresh();
    });
  }

  const links: [HTMLElement | null, string, TrackData['steps'][number] | undefined][] = [
    [block.querySelector<HTMLElement>('.track-step-previous'), previous, data.steps[index - 1]],
    [block.querySelector<HTMLElement>('.track-step-next'), next, data.steps[index + 1]],
  ];
  for (const [holder, template, other] of links) {
    if (!holder || !other) continue;
    // The whole "Next: <title>" is the link, so its name says where it leads.
    const link = document.createElement('a');
    link.href = stepUrl(other);
    fillTitle(link, template, other.title, other);
    holder.replaceChildren(link);
    holder.hidden = false;
  }
  const list = block.querySelector<HTMLElement>('.track-step-links');
  if (list) list.hidden = data.steps.length < 2;
  block.hidden = false;
}
