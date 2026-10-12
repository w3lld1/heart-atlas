import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Cite from '../src/components/Cite.astro';
import Diagram from '../src/components/diagrams/Diagram.astro';
import { diagramStates, diagrams, type DiagramName } from '../src/components/diagrams/index.ts';
import { localeCodes } from '../src/i18n/locales.ts';
import { getMessages, type MessageKey } from '../src/i18n/messages.ts';
import LevelSwitch from '../src/components/LevelSwitch.astro';
import Patient from '../src/components/Patient.astro';
import SourceList from '../src/components/SourceList.astro';
import Structure from '../src/components/Structure.astro';
import Student from '../src/components/Student.astro';
import HeartModel from '../src/components/viewer/HeartModel.astro';

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('Patient and Student', () => {
  it('mark their level and label it in the page locale', async () => {
    const patient = await container.renderToString(Patient, {
      locals: { locale: 'ru' },
      slots: { default: 'Text' },
    });
    expect(patient).toContain('data-level="patient"');
    expect(patient).toContain('Для пациентов');

    const student = await container.renderToString(Student, {
      locals: { locale: 'en' },
      slots: { default: 'Text' },
    });
    expect(student).toContain('data-level="student"');
    expect(student).toContain('For students');
  });
});

describe('LevelSwitch', () => {
  it('renders a labelled group of toggle buttons', async () => {
    const html = await container.renderToString(LevelSwitch, { props: { locale: 'en' } });
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Explanation level"');
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(2);
  });
});

describe('Cite', () => {
  it('links to the cited sources', async () => {
    const html = await container.renderToString(Cite, {
      props: { n: [1, 3] },
      locals: { sourceCount: 3 },
    });
    expect(html).toContain('href="#source-1"');
    expect(html).toContain('href="#source-3"');
  });

  it.each([0, 4, 1.5])('fails the build for n=%s', async (n) => {
    await expect(
      container.renderToString(Cite, { props: { n }, locals: { sourceCount: 3 } }),
    ).rejects.toThrow('the article has 3 sources');
  });
});

describe('SourceList', () => {
  const sources = [
    {
      tier: 'guideline' as const,
      org: 'minzdrav-rf',
      title: 'Fixture guideline',
      year: 2025,
      doi: '10.1234/fixture',
      url: 'https://cr.minzdrav.gov.ru/view-cr/1',
    },
    { tier: 'textbook' as const, title: 'Fixture textbook', year: 2020, isbn: '9780306406157' },
  ];

  it('lists sources with anchors, organization, DOI, url and ISBN', async () => {
    const html = await container.renderToString(SourceList, {
      props: { locale: 'en', sources, checked: new Date('2026-10-11') },
    });
    expect(html).toContain('id="source-1"');
    expect(html).toContain('id="source-2"');
    expect(html).toContain('Ministry of Health of the Russian Federation');
    expect(html).toContain('href="https://doi.org/10.1234/fixture"');
    expect(html).toContain('href="https://cr.minzdrav.gov.ru/view-cr/1"');
    expect(html).toContain('ISBN 9780306406157');
    expect(html).toContain('Sources checked on October 11, 2026');
  });

  it('formats the check date in the page locale', async () => {
    const html = await container.renderToString(SourceList, {
      props: { locale: 'ru', sources, checked: new Date('2026-10-11') },
    });
    expect(html).toContain('Источники сверены 11 октября 2026');
  });
});

describe('Diagram', () => {
  it('renders the named diagram with an accessible name and both captions', async () => {
    const html = await container.renderToString(Diagram, {
      props: { name: 'atrial-septal-defect' },
      locals: { locale: 'en' },
      slots: { normal: 'Normal caption', disease: 'Disease caption' },
    });
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Diagram of the heart chambers');
    expect(html).toContain('Normal caption');
    expect(html).toContain('Disease caption');
    expect(html).toMatch(/value="disease" checked/);
  });

  it('switches between the states a diagram declares, with a caption per state', async () => {
    const html = await container.renderToString(Diagram, {
      props: { name: 'heart-chambers' },
      locals: { locale: 'ru' },
      slots: { diastole: 'Наполнение', systole: 'Изгнание' },
    });
    expect(html).toMatch(/value="diastole" checked/);
    expect(html).toContain('value="systole"');
    expect(html).not.toContain('value="disease"');
    expect(html).toContain('Диастола');
    expect(html).toContain('<div class="diagram-caption" data-only="systole">Изгнание</div>');
    // The first diagram on a page carries the state rules for all diagrams.
    expect(html).toContain(
      ".diagram:has([value='systole']:checked) [data-only]:not([data-only='systole']){display:none}",
    );
  });

  it('has no switch for a single-state diagram', async () => {
    const html = await container.renderToString(Diagram, {
      props: { name: 'blood-flow' },
      locals: { locale: 'en' },
      slots: { scheme: 'Caption' },
    });
    expect(html).not.toContain('<fieldset');
    expect(html).toContain('Caption');
  });

  it.each(Object.keys(diagrams) as DiagramName[])(
    'renders "%s" as an image named in every locale, with labels and a valid initial state',
    async (name) => {
      const { states, initial } = diagramStates(name);
      expect(states).toContain(initial);
      for (const locale of localeCodes) {
        const html = await container.renderToString(Diagram, {
          props: { name },
          locals: { locale },
        });
        expect(html).toContain('role="img"');
        const title = getMessages(locale)[`diagram.${name}.title` as MessageKey];
        expect(title).toBeTruthy();
        expect(html).toContain(`aria-label="${title}"`);
        // A missing message key renders as empty text, so no <text> element may be empty.
        expect(html).not.toMatch(/<text[^>]*>\s*<\/text>/);
      }
    },
  );

  it('fails the build on a caption for a state the diagram does not have', async () => {
    await expect(
      container.renderToString(Diagram, {
        props: { name: 'heart-chambers' },
        slots: { systolic: 'Typo' },
      }),
    ).rejects.toThrow('no state "systolic"');
  });

  it('fails the build on an unknown diagram', async () => {
    await expect(
      container.renderToString(Diagram, { props: { name: 'nope' as DiagramName } }),
    ).rejects.toThrow('Unknown diagram "nope"');
  });
});

describe('HeartModel', () => {
  it('fails the build for an unknown structure', async () => {
    await expect(
      container.renderToString(HeartModel, {
        props: { locale: 'en', highlight: ['mitral-valve', 'no-such-part'] },
      }),
    ).rejects.toThrow('unknown structure "no-such-part"');
  });
});

describe('Structure', () => {
  it('marks the word with its structure id', async () => {
    const html = await container.renderToString(Structure, {
      props: { id: 'mitral-valve' },
      locals: { locale: 'en' },
      slots: { default: 'mitral valve' },
    });
    expect(html).toContain('data-structure="mitral-valve"');
    expect(html).toContain('data-hint="show on the 3D model"');
    expect(html).toContain('mitral valve');
  });

  it('fails the build for an unknown structure', async () => {
    await expect(
      container.renderToString(Structure, {
        props: { id: 'no-such-part' },
        locals: { locale: 'en' },
      }),
    ).rejects.toThrow('unknown structure');
  });
});
