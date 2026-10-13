import { describe, expect, it } from 'vitest';
import { treatedCaptionErrors } from '../src/lib/diagram-captions.ts';

const treated = (name: string) => name === 'with-treated';
const tiers = ['guideline', 'review'];

describe('treatedCaptionErrors', () => {
  it('accepts a multi-line caption that cites a guideline', () => {
    const mdx = `<Diagram name="with-treated">
  <p slot="disease">Disease.</p>
  <p slot="treated">
    Closed.<Cite n={[2, 1]} />
  </p>
</Diagram>`;
    expect(treatedCaptionErrors(mdx, treated, tiers)).toEqual([]);
  });

  it('ignores diagrams without the state', () => {
    expect(treatedCaptionErrors('<Diagram name="other"></Diagram>', treated, tiers)).toEqual([]);
  });

  it('needs the caption, a citation and a guideline among the citations', () => {
    expect(treatedCaptionErrors('<Diagram name="with-treated"></Diagram>', treated, tiers)).toEqual(
      ['<Diagram name="with-treated"> has no <p slot="treated"> caption'],
    );
    expect(
      treatedCaptionErrors(
        '<Diagram name="with-treated"><p slot="treated">Closed.</p></Diagram>',
        treated,
        tiers,
      ),
    ).toEqual(['<Diagram name="with-treated">: the "treated" caption cites no source']);
    expect(
      treatedCaptionErrors(
        '<Diagram name="with-treated"><p slot="treated">Closed.<Cite n={2} /></p></Diagram>',
        treated,
        tiers,
      ),
    ).toEqual(['<Diagram name="with-treated">: the "treated" caption cites no clinical guideline']);
  });

  it('does not take a citation from outside the caption', () => {
    const mdx = `<Diagram name="with-treated">
  <p slot="disease">Disease.<Cite n={1} /></p>
  <p slot="treated">Closed.<Cite n={2} /></p>
</Diagram>`;
    expect(treatedCaptionErrors(mdx, treated, tiers)).toHaveLength(1);
  });

  it('reads attributes in any order and skips self-closing diagrams', () => {
    const mdx = `<Diagram name="other" />
<Diagram class="wide" name="with-treated">
  <p class="note" slot="treated">Closed.<Cite id="x" n={2} /></p>
</Diagram>`;
    expect(treatedCaptionErrors(mdx, treated, tiers)).toEqual([
      '<Diagram name="with-treated">: the "treated" caption cites no clinical guideline',
    ]);
  });

  it('checks each of several diagrams on its own', () => {
    const mdx = `<Diagram name="with-treated"><p slot="treated">A.<Cite n={1} /></p></Diagram>
<Diagram name="with-treated"><p slot="disease">B.</p></Diagram>`;
    expect(treatedCaptionErrors(mdx, treated, tiers)).toEqual([
      '<Diagram name="with-treated"> has no <p slot="treated"> caption',
    ]);
  });
});
