// Groups of the disease catalogue page, in display order. Spec:
// docs/plans/2026-10-13-disease-catalog.md. A disease not listed here goes to `other`, so a new
// article never breaks the page; slugs of planned articles are listed ahead of time.

export const diseaseGroups = {
  rhythm: [
    'atrial-fibrillation',
    'atrial-flutter',
    'av-block',
    'brugada-syndrome',
    'bundle-branch-block',
    'catecholaminergic-polymorphic-ventricular-tachycardia',
    'extrasystole',
    'inappropriate-sinus-tachycardia',
    'long-qt-syndrome',
    'postural-orthostatic-tachycardia-syndrome',
    'sick-sinus-syndrome',
    'supraventricular-tachycardia',
    'vasovagal-syncope',
    'ventricular-fibrillation',
    'ventricular-tachycardia',
    'wpw-syndrome',
  ],
  coronary: [
    'coronary-artery-anomalies',
    'coronary-heart-disease',
    'kawasaki-disease',
    'myocardial-infarction',
    'spontaneous-coronary-artery-dissection',
    'takotsubo-syndrome',
  ],
  'risk-factors': [
    'dyslipidemia',
    'familial-hypercholesterolemia',
    'hypertension',
    'hypertension-in-pregnancy',
    'hypertensive-crisis',
    'orthostatic-hypotension',
  ],
  myocardium: [
    'arrhythmogenic-right-ventricular-cardiomyopathy',
    'cancer-therapy-related-cardiac-dysfunction',
    'cardiac-amyloidosis',
    'cardiac-sarcoidosis',
    'cardiogenic-shock',
    'chagas-cardiomyopathy',
    'dilated-cardiomyopathy',
    'fabry-disease',
    'heart-failure',
    'hypertrophic-cardiomyopathy',
    'left-ventricular-noncompaction',
    'peripartum-cardiomyopathy',
    'restrictive-cardiomyopathy',
  ],
  valves: [
    'aortic-regurgitation',
    'aortic-stenosis',
    'bicuspid-aortic-valve',
    'mitral-regurgitation',
    'mitral-stenosis',
    'mitral-valve-prolapse',
    'pulmonary-regurgitation',
    'pulmonary-valve-stenosis',
    'rheumatic-heart-disease',
    'tricuspid-regurgitation',
  ],
  inflammation: [
    'cardiac-myxoma',
    'cardiac-tamponade',
    'constrictive-pericarditis',
    'infective-endocarditis',
    'myocarditis',
    'pericardial-effusion',
    'pericarditis',
  ],
  congenital: [
    'aortopulmonary-window',
    'atrial-septal-defect',
    'atrioventricular-septal-defect',
    'coarctation-of-the-aorta',
    'congenitally-corrected-transposition',
    'cor-triatriatum',
    'double-chambered-right-ventricle',
    'double-outlet-right-ventricle',
    'ebstein-anomaly',
    'eisenmenger-syndrome',
    'hypoplastic-left-heart-syndrome',
    'interrupted-aortic-arch',
    'partial-anomalous-pulmonary-venous-return',
    'patent-ductus-arteriosus',
    'patent-foramen-ovale',
    'pulmonary-atresia-with-intact-ventricular-septum',
    'pulmonary-atresia-with-ventricular-septal-defect',
    'single-ventricle',
    'subaortic-stenosis',
    'supravalvular-aortic-stenosis',
    'tetralogy-of-fallot',
    'total-anomalous-pulmonary-venous-return',
    'transposition-of-the-great-arteries',
    'truncus-arteriosus',
    'ventricular-septal-defect',
  ],
  arteries: [
    'abdominal-aortic-aneurysm',
    'acute-limb-ischemia',
    'aortic-dissection',
    'carotid-artery-stenosis',
    'marfan-syndrome',
    'mesenteric-ischemia',
    'peripheral-artery-disease',
    'renal-artery-stenosis',
    'takayasu-arteritis',
    'thoracic-aortic-aneurysm',
    'vascular-ehlers-danlos-syndrome',
  ],
  veins: ['deep-vein-thrombosis', 'superficial-thrombophlebitis', 'varicose-veins'],
  pulmonary: [
    'chronic-thromboembolic-pulmonary-hypertension',
    'pulmonary-embolism',
    'pulmonary-hypertension',
  ],
} as const satisfies Record<string, readonly string[]>;

export type DiseaseGroup = keyof typeof diseaseGroups | 'other';

export const diseaseGroupOrder: readonly DiseaseGroup[] = [
  ...(Object.keys(diseaseGroups) as (keyof typeof diseaseGroups)[]),
  'other',
];

const groupBySlug = new Map<string, DiseaseGroup>(
  Object.entries(diseaseGroups).flatMap(([group, slugs]) =>
    slugs.map((slug) => [slug, group as DiseaseGroup] as const),
  ),
);

export function diseaseGroupOf(slug: string): DiseaseGroup {
  return groupBySlug.get(slug) ?? 'other';
}

/** Items split by group in display order; empty groups are left out. */
export function groupDiseases<T>(
  items: readonly T[],
  slugOf: (item: T) => string,
): { group: DiseaseGroup; items: T[] }[] {
  const byGroup = new Map<DiseaseGroup, T[]>();
  for (const item of items) {
    const group = diseaseGroupOf(slugOf(item));
    byGroup.set(group, [...(byGroup.get(group) ?? []), item]);
  }
  return diseaseGroupOrder.flatMap((group) => {
    const list = byGroup.get(group);
    return list ? [{ group, items: list }] : [];
  });
}
