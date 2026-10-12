// Progress marks on a track page: "read" boxes, "quiz done" badges and the continue link.
import { fillTitle, isQuizDone, isRead, nextUnread, setRead } from './track-progress.ts';

export function initTrackPage(list: HTMLElement, next: HTMLElement): void {
  const items = [...list.querySelectorAll<HTMLElement>('li[data-key]')].map((item) => ({
    key: item.dataset['key'] ?? '',
    link: item.querySelector<HTMLAnchorElement>('a'),
    box: item.querySelector<HTMLInputElement>('.track-read input'),
    quiz: item.querySelector<HTMLElement>('.track-quiz'),
  }));

  // Read marks of this page; the boxes keep working when storage is blocked.
  const read = new Set<string>();
  const load = () => {
    for (const item of items) {
      if (isRead(item.key)) read.add(item.key);
      else read.delete(item.key);
      if (item.quiz) item.quiz.hidden = !isQuizDone(item.key);
    }
  };

  const render = () => {
    for (const item of items) if (item.box) item.box.checked = read.has(item.key);
    const index = nextUnread(items, (key) => read.has(key));
    const link = index === undefined ? undefined : items[index]?.link;
    if (!link) {
      next.textContent = next.dataset['finished'] ?? '';
    } else {
      const started = read.size > 0;
      const holder = link.parentElement;
      const anchor = document.createElement('a');
      anchor.href = link.href;
      fillTitle(
        anchor,
        (started ? next.dataset['continue'] : next.dataset['start']) ?? '{title}',
        link.textContent?.trim() ?? '',
        {
          lang: holder?.lang || undefined,
          dir: holder?.dir === 'rtl' ? 'rtl' : holder?.dir ? 'ltr' : undefined,
        },
      );
      next.replaceChildren(anchor);
    }
    next.hidden = false;
  };

  for (const item of items) {
    if (!item.box) continue;
    const box = item.box;
    box.addEventListener('change', () => {
      setRead(item.key, box.checked);
      if (box.checked) read.add(item.key);
      else read.delete(item.key);
      render();
    });
    if (box.parentElement) box.parentElement.hidden = false;
  }
  const refresh = () => {
    load();
    render();
  };
  refresh();
  // Coming back from an article (history or another tab) shows marks made there.
  addEventListener('pageshow', (event) => {
    if (event.persisted) refresh();
  });
  addEventListener('storage', refresh);
}
