import type { ClockSource } from '../heart-clock/sources.ts';
import type { HeartSoundId } from './auscultation.ts';

// Sources behind each sound: docs/plans/2026-10-13-heart-sounds.md and
// /mnt/project-files/evidence/heart-murmurs.md.
const msd = (title: string, path: string): ClockSource => ({
  text: `MSD Manual Professional Version. ${title}. Reviewed 2025.`,
  href: `https://www.msdmanuals.com/professional/cardiovascular-disorders/${path}`,
  lang: 'en',
});

const minzdrav = (title: string, year: number, id: string): ClockSource => ({
  text: `Минздрав России. ${title}. Клинические рекомендации, ${year}.`,
  href: `https://cr.minzdrav.gov.ru/view-cr/${id}`,
  lang: 'ru',
});

const auscultation = msd(
  'Cardiac Auscultation',
  'approach-to-the-cardiac-patient/cardiac-auscultation',
);
const mitralRegurgitation = minzdrav('Митральная недостаточность', 2024, '881_1');

export const heartSoundSources: Readonly<Record<HeartSoundId, readonly ClockSource[]>> = {
  normal: [auscultation],
  'aortic-stenosis': [
    msd('Aortic Stenosis', 'valvular-disorders/aortic-stenosis'),
    minzdrav('Аортальный стеноз', 2025, '37_2'),
    auscultation,
  ],
  'aortic-regurgitation': [
    msd('Aortic Regurgitation', 'valvular-disorders/aortic-regurgitation'),
    minzdrav('Аортальная недостаточность', 2025, '983_1'),
  ],
  'mitral-stenosis': [
    msd('Mitral Stenosis', 'valvular-disorders/mitral-stenosis'),
    minzdrav('Митральный стеноз', 2025, '945_1'),
  ],
  'mitral-regurgitation': [
    msd('Mitral Regurgitation', 'valvular-disorders/mitral-regurgitation'),
    mitralRegurgitation,
    auscultation,
  ],
  'mitral-valve-prolapse': [
    msd('Mitral Valve Prolapse (MVP)', 'valvular-disorders/mitral-valve-prolapse-mvp'),
    mitralRegurgitation,
    auscultation,
  ],
};
