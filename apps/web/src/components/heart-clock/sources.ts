/** A source as the heart clock pages list it; titles stay in the language of publication. */
export interface ClockSource {
  text: string;
  href: string;
  /** Language of the title. */
  lang: string;
}

// Sources behind the model: docs/plans/2026-10-11-stage-2-heart-clock.md.
export const modelSources: readonly ClockSource[] = [
  {
    text: 'StatPearls. Electrocardiogram. Updated 2023-06-05.',
    href: 'https://www.statpearls.com/point-of-care/20969',
    lang: 'en',
  },
  {
    text: 'StatPearls. Physiology, Cardiac Cycle. Updated 2022-10-03.',
    href: 'https://www.statpearls.com/point-of-care/786',
    lang: 'en',
  },
  {
    text: 'Weissler AM, Harris WS, Schoenfeld CD. Systolic time intervals in heart failure in man. Circulation. 1968;37(2):149–159.',
    href: 'https://doi.org/10.1161/01.CIR.37.2.149',
    lang: 'en',
  },
  {
    text: 'McSharry PE, Clifford GD, Tarassenko L, Smith LA. A dynamical model for generating synthetic electrocardiogram signals. IEEE Trans Biomed Eng. 2003;50(3):289–294.',
    href: 'https://doi.org/10.1109/TBME.2003.808805',
    lang: 'en',
  },
];

// Sources behind the disease presets: docs/plans/2026-10-11-stage-3-presets.md. A new preset adds
// its sources here.
export const presetSources: readonly ClockSource[] = [
  {
    text: '2024 ESC Guidelines for the management of atrial fibrillation developed in collaboration with EACTS. Eur Heart J. 2024;45(36):3314–3414.',
    href: 'https://doi.org/10.1093/eurheartj/ehae176',
    lang: 'en',
  },
  {
    text: '2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation. Circulation. 2024;149(1).',
    href: 'https://doi.org/10.1161/CIR.0000000000001193',
    lang: 'en',
  },
  {
    text: 'Минздрав России. Фибрилляция и трепетание предсердий. Клинические рекомендации, 2025.',
    href: 'https://cr.minzdrav.gov.ru/view-cr/382_2',
    lang: 'ru',
  },
  {
    text: '2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J. 2023;44(38):3720–3826.',
    href: 'https://doi.org/10.1093/eurheartj/ehad191',
    lang: 'en',
  },
  {
    text: 'StatPearls. Acute Coronary Syndrome. Updated 2026-07-05.',
    href: 'https://www.ncbi.nlm.nih.gov/books/NBK459157/',
    lang: 'en',
  },
  {
    text: 'StatPearls. Heart Failure (Congestive Heart Failure). Updated 2025-02-26.',
    href: 'https://www.ncbi.nlm.nih.gov/books/NBK430873/',
    lang: 'en',
  },
  {
    text: 'Минздрав России. Хроническая сердечная недостаточность. Клинические рекомендации, 2024. Рос кардиол журн. 2024;29(11):6162.',
    href: 'https://doi.org/10.15829/1560-4071-2024-6162',
    lang: 'ru',
  },
  {
    text: 'NICE. Hypertension in adults: diagnosis and management (NG136). 2019, updated 2023-11-21.',
    href: 'https://www.nice.org.uk/guidance/ng136',
    lang: 'en',
  },
  {
    text: '2024 ESC Guidelines for the management of elevated blood pressure and hypertension. Eur Heart J. 2024;45(38):3912–4018.',
    href: 'https://doi.org/10.1093/eurheartj/ehae178',
    lang: 'en',
  },
  {
    text: 'Минздрав России. Артериальная гипертензия у взрослых. Клинические рекомендации, 2024.',
    href: 'https://cr.minzdrav.gov.ru/view-cr/62_3',
    lang: 'ru',
  },
  {
    text: '2020 ACC/AHA Guideline for the Management of Patients With Valvular Heart Disease. Circulation. 2021;143(5).',
    href: 'https://doi.org/10.1161/CIR.0000000000000923',
    lang: 'en',
  },
  {
    text: 'StatPearls. Aortic Stenosis. Updated 2023-04-16.',
    href: 'https://www.ncbi.nlm.nih.gov/books/NBK557628/',
    lang: 'en',
  },
  {
    text: 'StatPearls. Atrial Septal Defect. Updated 2025-01-21.',
    href: 'https://www.ncbi.nlm.nih.gov/books/NBK535440/',
    lang: 'en',
  },
  {
    text: 'Минздрав России. Дефект межпредсердной перегородки. Клинические рекомендации, 2023.',
    href: 'https://cr.minzdrav.gov.ru/view-cr/46_2',
    lang: 'ru',
  },
  // First-degree AV block: docs/plans/2026-10-12-more-ecg-presets.md.
  {
    text: 'Минздрав России. Брадиаритмии и нарушения проводимости. Клинические рекомендации, 2025.',
    href: 'https://cr.minzdrav.gov.ru/view-cr/160_2',
    lang: 'ru',
  },
  {
    text: 'MSD Manuals, Professional Version. Atrioventricular Block. 2024.',
    href: 'https://www.msdmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/atrioventricular-block',
    lang: 'en',
  },
  // Supraventricular tachycardia: docs/plans/2026-10-12-more-ecg-presets.md.
  {
    text: 'Минздрав России. Наджелудочковые тахикардии. Клинические рекомендации, 2025.',
    href: 'https://cr.minzdrav.gov.ru/view-cr/619_3',
    lang: 'ru',
  },
  {
    text: 'MSD Manuals, Professional Version. Reentrant (Paroxysmal) Supraventricular Tachycardias (PSVT). 2024.',
    href: 'https://www.msdmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/reentrant-paroxysmal-supraventricular-tachycardias-psvt',
    lang: 'en',
  },
  // Long QT syndrome and ventricular tachycardia: docs/plans/2026-10-12-more-ecg-presets.md.
  {
    text: 'Минздрав России. Желудочковые нарушения ритма сердца. Внезапная сердечная смерть. Клинические рекомендации, 2025.',
    href: 'https://cr.minzdrav.gov.ru/view-cr/569_2',
    lang: 'ru',
  },
  {
    text: 'MSD Manuals, Professional Version. Long QT Interval Syndromes. 2026.',
    href: 'https://www.msdmanuals.com/professional/cardiovascular-disorders/arrhythmogenic-cardiac-disorders/long-qt-interval-syndromes',
    lang: 'en',
  },
  {
    text: 'MSD Manuals, Professional Version. Ventricular Tachycardia (VT). 2024.',
    href: 'https://www.msdmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/ventricular-tachycardia-vt',
    lang: 'en',
  },
  // Atrial flutter and sick sinus syndrome: docs/plans/2026-10-12-more-ecg-presets.md. The
  // AF/flutter guideline (382_2) is listed above with atrial fibrillation, and the
  // Bradyarrhythmias guideline (160_2) with first-degree AV block.
  {
    text: '2019 Рекомендации ESC по лечению пациентов с наджелудочковыми тахикардиями. Рос кардиол журн. 2020;25(7):3864.',
    href: 'https://doi.org/10.15829/1560-4071-2020-3864',
    lang: 'ru',
  },
  {
    text: 'MSD Manuals, Professional Version. Atrial Flutter. 2024.',
    href: 'https://www.msdmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/atrial-flutter',
    lang: 'en',
  },
  // Premature beats: docs/plans/2026-10-13-heart-clock-premature-beats.md. The ventricular
  // arrhythmias guideline (569_2), listed above with long QT syndrome, supports the ventricular one.
  {
    text: 'MSD Manuals, Professional Version. Ventricular Premature Beats (VPB). 2024.',
    href: 'https://www.msdmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/ventricular-premature-beats-vpb',
    lang: 'en',
  },
  {
    text: 'MSD Manuals, Professional Version. Ectopic Supraventricular Arrhythmias. 2024.',
    href: 'https://www.msdmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/ectopic-supraventricular-arrhythmias',
    lang: 'en',
  },
  {
    text: '2021 Рекомендации ESC по электрокардиостимуляции и сердечной ресинхронизирующей терапии. Рос кардиол журн. 2022;27(7):5159.',
    href: 'https://doi.org/10.15829/1560-4071-2022-5159',
    lang: 'ru',
  },
  {
    text: 'MSD Manuals, Professional Version. Sick Sinus Syndrome (Sinus Node Dysfunction). 2024.',
    href: 'https://www.msdmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/sinus-node-dysfunction',
    lang: 'en',
  },
  // WPW and Brugada syndromes: docs/plans/2026-10-12-more-ecg-presets.md. The SVT guideline
  // (619_3) is listed above with SVT, the ESC 2019 SVT translation with atrial flutter, and the
  // Ventricular arrhythmias guideline (569_2) with long QT syndrome and VT.
  {
    text: 'MSD Manuals, Professional Version. Wolff-Parkinson-White Syndrome (WPW Syndrome). 2024.',
    href: 'https://www.msdmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/wolff-parkinson-white-syndrome-wpw-syndrome',
    lang: 'en',
  },
  {
    text: 'MSD Manuals, Professional Version. Brugada Syndrome. 2026.',
    href: 'https://www.msdmanuals.com/professional/cardiovascular-disorders/arrhythmogenic-cardiac-disorders/brugada-syndrome',
    lang: 'en',
  },
  // Bundle branch blocks: docs/plans/2026-10-14-heart-clock-bundle-branch-block.md.
  {
    text: 'MSD Manuals, Professional Version. Bundle Branch Block and Fascicular Block. 2024.',
    href: 'https://www.msdmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/bundle-branch-block-and-fascicular-block',
    lang: 'en',
  },
  // Sick sinus syndrome after treatment (pacemaker): docs/plans/2026-10-13-heart-clock-after-treatment.md.
  // The ESC 2021 pacing translation and the Bradyarrhythmias guideline (160_2) are listed above.
  {
    text: 'Liaquat MT, Ahmed I, Alzahrani T. Pacemaker Malfunction. StatPearls. Updated 2023-07-30.',
    href: 'https://www.ncbi.nlm.nih.gov/books/NBK553149/',
    lang: 'en',
  },
  {
    text: 'Lak HM, Goyal A. Pacemaker Types and Selection. StatPearls. Updated 2022-12-11.',
    href: 'https://www.ncbi.nlm.nih.gov/books/NBK556011/',
    lang: 'en',
  },
  {
    text: 'Kligfield P, et al. Recommendations for the standardization and interpretation of the electrocardiogram: part I. Heart Rhythm. 2007;4(3):394–412.',
    href: 'https://doi.org/10.1016/j.hrthm.2007.01.027',
    lang: 'en',
  },
  // Complete AV block and its pacemaker: docs/plans/2026-10-13-heart-clock-av-block.md. MSD AV
  // block, the Bradyarrhythmias guideline (160_2), the ESC 2021 pacing translation and the two
  // pacemaker StatPearls chapters are listed above.
  {
    text: 'Knabben V, Chhabra L, Slane M. Third-Degree Atrioventricular Block. StatPearls. Updated 2023-07-31.',
    href: 'https://www.ncbi.nlm.nih.gov/books/NBK545199/',
    lang: 'en',
  },
  // Second-degree AV block: docs/plans/2026-10-13-heart-clock-second-degree-av-block.md. MSD AV
  // block, the Bradyarrhythmias guideline (160_2) and the ESC 2021 pacing translation are listed
  // above.
  {
    text: 'Mangi MA, Jones WM, Mansour MK, Napier L. Second-Degree Atrioventricular Block. StatPearls. Updated 2023-08-14.',
    href: 'https://www.ncbi.nlm.nih.gov/books/NBK482359/',
    lang: 'en',
  },
  {
    text: 'Scherbak D, Shams P, Hicks GJ. Left Bundle Branch Block. StatPearls. Updated 2024-10-05.',
    href: 'https://www.ncbi.nlm.nih.gov/books/NBK482167/',
    lang: 'en',
  },
];
