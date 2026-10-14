import { heartRateLimits } from './clock.ts';
import { defaultRateLimits, resolveParams, type HeartParams } from './params.ts';

/**
 * Disease presets: parameter sets that show the textbook signs of each disease of the MVP.
 * Every number either comes from a source in docs/plans/2026-10-11-stage-3-sources.md or the
 * preset's own spec (cited in the comment next to it) or is marked `assumption`. Specs:
 * docs/plans/2026-10-11-stage-3-presets.md, docs/plans/2026-10-12-more-ecg-presets.md.
 */
export const presetIds = [
  'normal',
  'atrial-fibrillation',
  'stemi',
  'heart-failure',
  'hypertension',
  'aortic-stenosis',
  'atrial-septal-defect',
  'av-block-first-degree',
  'av-block-second-degree-mobitz-1',
  'av-block-second-degree-mobitz-2',
  'av-block-third-degree',
  'av-block-third-degree-paced',
  'sinus-tachycardia',
  'supraventricular-tachycardia',
  'long-qt-syndrome',
  'short-qt-syndrome',
  'ventricular-tachycardia',
  'bidirectional-ventricular-tachycardia',
  'ventricular-fibrillation',
  'atrial-flutter',
  'atrial-premature-beats',
  'ventricular-premature-beats',
  'sick-sinus-syndrome',
  'sick-sinus-syndrome-paced',
  'wpw-syndrome',
  'brugada-syndrome',
  'right-bundle-branch-block',
  'left-bundle-branch-block',
  'left-anterior-fascicular-block',
] as const;

export type PresetId = (typeof presetIds)[number];

export const presets: Readonly<Record<PresetId, Readonly<Partial<HeartParams>>>> = Object.freeze({
  normal: Object.freeze({}),
  'atrial-fibrillation': Object.freeze({
    // No P waves and irregular RR intervals: ESC 2024 AF, §3.1; ACC/AHA 2023 AF, Table 4.
    pAmplitude: 0,
    // assumption: how irregular. Sources say only that RR intervals follow no pattern.
    rrIrregularity: 0.2,
    // Fibrillatory waves (ACC/AHA 2023, Table 4) at 360 per minute: inside 300–500/min
    // (ACC/AHA 2023, §2.3) and 350–700/min (Minzdrav 2025, as quoted in our AF article).
    fWaveFrequency: 6,
    // assumption: f-wave amplitude; no source gives one.
    fWaveAmplitude: 0.05,
    // Loss of effective atrial contraction (ESC 2024 AF, §3.1): no atrial share of filling.
    atrialContribution: 0,
  }),
  stemi: Object.freeze({
    // ST elevation at the J point of ≥1 mm (0.1 mV) in leads other than V2–V3 (ESC 2023 ACS,
    // §3.2.1); the model's lead is like lead II. 0.2 mV, reached at the J point, is twice that
    // threshold. Sources ask for two contiguous leads; the model shows two, II and III.
    stShift: 0.2,
    // Inferior MI: ST elevation in II, III and aVF, reciprocal ST depression most often in I and
    // aVL; ST higher in III than in II points to the right coronary artery (StatPearls, Inferior
    // Myocardial Infarction, 2025; MSD Manuals, Acute MI, 2026). assumption: +110°, which gives
    // ST 0.31 mV in III and −0.11 mV in I with 0.2 mV in II; no source gives an ST axis.
    stAxis: 110,
  }),
  'heart-failure': Object.freeze({
    // Heart failure with reduced ejection fraction: LVEF ≤40% (StatPearls, Heart Failure; also
    // Minzdrav 2024 as quoted in our article). 30% is an example inside that group.
    ejectionFraction: 0.3,
  }),
  hypertension: Object.freeze({
    // Stage 2 hypertension, clinic BP from 160/100 to below 180/120 (NICE NG136); above the
    // ESC 2024 threshold of 140/90. assumption: LV systolic pressure equals systolic BP.
    lvSystolic: 160,
    aorticDiastolic: 100,
  }),
  'aortic-stenosis': Object.freeze({
    // Severe aortic stenosis: mean gradient ≥40 mmHg (ACC/AHA 2020 VHD, Table 13).
    aorticValveGradient: 40,
    // The stenosis raises LV systolic pressure (StatPearls, Aortic Stenosis). assumption: 180,
    // so the aortic peak stays near 120 mmHg (119 in the model); no source gives an LV pressure.
    lvSystolic: 180,
  }),
  'atrial-septal-defect': Object.freeze({
    // ASD gives incomplete or complete right bundle branch block (Minzdrav 2023, §2.4); complete
    // RBBB has QRS >0.12 s (StatPearls, Electrocardiogram). The model only widens the QRS; it
    // cannot draw the block's shape, and the width of an incomplete block has no source.
    qrsDuration: 130,
    // Wide fixed split of S2 (StatPearls, Atrial Septal Defect; Minzdrav 2023, §2.2).
    // assumption: the split size; no source gives it in ms.
    s2Split: 50,
    // A secundum ASD with a significant shunt may show right axis deviation, +90° to 180° (MSD
    // Manuals, Atrial Septal Defect, 2023; MSD, Electrocardiography; StatPearls, Electrical Right
    // and Left Axis Deviation, 2024); a primum one turns the axis superiorly, left or northwest (MSD,
    // Atrioventricular Septal Defect), which the model cannot draw. assumption: +100°, a mild right axis that keeps
    // lead III inside the strip; the T wave follows the QRS (MSD, Electrocardiography).
    // The S wave keeps the QRS axis (docs/plans/2026-10-14-heart-clock-bundle-branch-block.md).
    qrsAxis: 100,
    sAxis: 100,
    tAxis: 100,
  }),
  'av-block-first-degree': Object.freeze({
    // First-degree AV block: every P wave is followed by a QRS, but PR is longer than 0.20 s
    // (MSD Manuals, Atrioventricular Block, 2024; source 2 of our AV block article). assumption:
    // 260 ms at 60 bpm. The model scales PR with √RR, and 260 keeps PR above 200 ms at every
    // heart rate this preset allows (40–96 bpm; about 233 ms at 75 and 205 ms at 96). With 240,
    // PR would drop below 200 ms from 87 bpm. Spec: docs/plans/2026-10-12-more-ecg-presets.md.
    prInterval: 260,
  }),
  // Second-degree AV block: docs/plans/2026-10-13-heart-clock-second-degree-av-block.md. The slider
  // sets the P wave rate; the ventricles beat at 3/4 of it (Mobitz I) or 2/3 of it (Mobitz II).
  'av-block-second-degree-mobitz-1': Object.freeze({
    // Mobitz I (Wenckebach): PR lengthens with each beat until a P wave is not conducted and the QRS
    // is dropped; the next beat has the shortest PR, and the cycle repeats (MSD Manuals,
    // Atrioventricular Block, 2024). 4:3 groups, three QRS for four P waves (MSD, figure).
    blockedP: 1,
    pauseEvery: 3,
    // assumption: PR 180 ms, then +80 ms per beat (180, 260, 340 at 60 bpm). The sources give no
    // numbers; with equal growth the RR intervals inside a group are equal too.
    prInterval: 180,
    prStep: 80,
    // assumption: the narrow QRS of block in the AV node (MSD: with a narrow QRS, Mobitz I is
    // nearly always in the AV node), and a P wave rate of 60.
    heartRate: 60,
  }),
  'av-block-second-degree-mobitz-2': Object.freeze({
    // Mobitz II: the PR stays the same before and after the P wave that is not conducted
    // (StatPearls, Second-Degree AV Block; MSD). Usually every third or fourth P wave is not
    // conducted, and the RR across the block is twice the others (MSD); the model drops every third.
    blockedP: 1,
    pauseEvery: 2,
    // assumption: a P wave rate of 75. The QRS stays narrow, though in Mobitz II it is often wide
    // (StatPearls; MSD); the summary says so.
    heartRate: 75,
  }),
  // Complete (third-degree) AV block and its pacemaker: docs/plans/2026-10-13-heart-clock-av-block.md.
  'av-block-third-degree': Object.freeze({
    // No P wave reaches the ventricles: P waves and QRS complexes are unrelated (AV dissociation),
    // and the P wave rate is above the QRS rate (MSD Manuals, Atrioventricular Block, 2024;
    // StatPearls, Third-Degree AV Block). assumption: P waves at a steady 75, the model's sinus rate;
    // no source says that P–P is regular.
    atrialRate: 75,
    // An escape rhythm above the His bundle bifurcation: narrow QRS at 35–50 bpm (MSD, same), a
    // junctional escape (StatPearls, same). The QRS stays the model's narrow one. assumption: 40.
    heartRate: 40,
    // Atria and ventricles lose their coordination (StatPearls, same). assumption: averaged as no
    // atrial share of filling; the model does not follow which atrial beats meet a closed valve.
    atrialContribution: 0,
  }),
  'av-block-third-degree-paced': Object.freeze({
    // After treatment (`presetTreated`): a permanent pacemaker, indicated in complete AV block
    // without a reversible cause regardless of symptoms (Minzdrav 2025, Bradyarrhythmias, §3.3.2;
    // ESC 2021 pacing, §5.2.1.3); dual-chamber with sinus rhythm (ESC 2021, §5.2.2.1). It senses
    // the heart's own P wave and paces the ventricle at the end of the AV delay (StatPearls,
    // Pacemaker Malfunction; Pacemaker Types and Selection). assumption: the AV delay is the model's
    // default PR (ESC 2021 only says to avoid over 230 ms), and the rate, 75, follows the P waves.
    ventricularPacing: 1,
    heartRate: 75,
    // A paced ventricle gives a wide QRS like left bundle branch block (StatPearls, Left Bundle
    // Branch Block), where ST–T run opposite to the QRS (same). assumption: 160 ms (LBBB is
    // ≥120 ms), one broad positive R in lead II without Q or S, a T wave of -0.3 mV, and the
    // default QTc.
    qrsDuration: 160,
    qAmplitude: 0,
    sAmplitude: 0,
    tAmplitude: -0.3,
  }),
  'sinus-tachycardia': Object.freeze({
    // Sinus tachycardia is sinus rhythm faster than 100 per minute (Minzdrav 2025,
    // Supraventricular tachycardias, §1.2.1). The rate is the sign, so this preset sets it; every
    // other parameter stays normal: the P waves are those of normal sinus rhythm (same, §2.4).
    // assumption: 120, clearly above 100. It serves inappropriate sinus tachycardia and POTS,
    // which look the same on one strip.
    // Spec: docs/plans/2026-10-14-heart-clock-sinus-tachycardia.md.
    heartRate: 120,
  }),
  'supraventricular-tachycardia': Object.freeze({
    // Typical AV nodal re-entrant tachycardia. The rate is the sign, so this preset sets it:
    // reentrant SVT runs at 120–250 bpm (MSD Manuals, Reentrant (Paroxysmal) SVT, 2024; source 3
    // of our SVT article). assumption: 170, inside that range and below the model's limit of 180.
    // The rhythm is regular (MSD, same), so rrIrregularity stays 0, and the QRS is narrow, ≤120 ms
    // (Minzdrav 2025, Supraventricular tachycardias; source 1), so qrsDuration stays 90.
    heartRate: 170,
    // In typical AVNRT retrograde P′ waves merge with the QRS complex or sit at its end (Minzdrav
    // 2025; MSD). assumption: 0 draws "no separate P wave"; the model cannot draw P′ at the end of
    // QRS, and it has no retrograde P′ at all.
    pAmplitude: 0,
  }),
  'long-qt-syndrome': Object.freeze({
    // Long QT syndrome is diagnosed with QTc ≥480 ms, and the risk of torsades de pointes rises
    // with QTc, especially above 500 ms (Minzdrav 2025, Ventricular arrhythmias, quoting the ESC
    // 2022 criteria; MSD Manuals, Long QT Interval Syndromes, 2026; sources 1 and 2 of our long QT
    // article). The model scales QT with √RR, as the Bazett formula does, so `qtc` is the Bazett
    // QTc at every heart rate. assumption: 500 ms, above the diagnostic threshold; a QTc of 500 ms
    // fits the beat up to 137 bpm, so the preset allows 40–137 bpm. The heart rate stays the reader's.
    // Spec: docs/plans/2026-10-12-more-ecg-presets.md.
    qtc: 500,
  }),
  'short-qt-syndrome': Object.freeze({
    // Short QT syndrome: ESC 2022 (ventricular arrhythmias, source 2 of our short QT article)
    // recommends considering the diagnosis at a QTc of 320 ms or less; the Gollob score in Minzdrav
    // 2025 (569_2, source 1) gives points below 330 ms, and NICE CG109 calls a QTc under 350 ms short.
    // assumption: 320 ms, at the ESC level. Like long QT syndrome, `qtc` is the Bazett QTc at every
    // heart rate, which stays the reader's; the T wave keeps its default shape, for which the
    // sources give no numbers. Spec: docs/plans/2026-10-14-heart-clock-short-qt.md.
    qtc: 320,
  }),
  'ventricular-tachycardia': Object.freeze({
    // Monomorphic ventricular tachycardia. The rate is the sign, so this preset sets it: VT is ≥3
    // consecutive ventricular beats at more than 100 per minute (Minzdrav 2025, Ventricular
    // arrhythmias; source 1 of our VT article). assumption: 150, above 100 and inside the rates
    // the wide QRS below allows (101–169). Monomorphic VT is fast and regular with identical QRS
    // complexes (Minzdrav 2025; MSD Manuals, Ventricular Tachycardia, 2024), so rrIrregularity
    // stays 0. Spec: docs/plans/2026-10-12-more-ecg-presets.md.
    heartRate: 150,
    // ECG signs of ventricular arrhythmias: a wide QRS (≥120 ms), no preceding P wave and a T wave
    // discordant to the main QRS deflection (Minzdrav 2025). assumption: 130 ms, the width the
    // model already draws for complete bundle branch block in atrial septal defect; a wider QRS
    // would cut the fastest rates further (140 ms: up to 157 bpm, 160 ms: up to 132). The model
    // keeps the P-to-QRS delay; with no P wave it is a flat stretch before the QRS.
    qrsDuration: 130,
    pAmplitude: 0,
    // The ventricles fire on their own, not through the AV node (`ventricularRhythm`); the ECG of
    // VT can show dissociated P-wave activity (MSD Manuals, Ventricular Tachycardia, 2024).
    // assumption: the atria beat on their own, sometimes against closed valves; the model leaves
    // out their P waves, their contraction and their share of filling.
    ventricularRhythm: 1,
    atrialContribution: 0,
    // The model's QRS is mainly positive (R 1 mV, ecg.ts), so a negative T is discordant to it.
    // assumption: −0.3 mV, the default T amplitude inverted; no source gives a T amplitude.
    tAmplitude: -0.3,
    // VT from a ventricular outflow tract has a vertical downward axis with a near-isoelectric QRS
    // in lead I (MSD Manuals, Ventricular Tachycardia, 2024). The model draws that kind. assumption:
    // +85°, so lead I keeps a small QRS (about a tenth of II) rather than a flat line, and the
    // discordant T on the same axis. Other VTs turn the axis elsewhere (MSD, same).
    qrsAxis: 85,
    sAxis: 85,
    tAxis: 85,
  }),
  'bidirectional-ventricular-tachycardia': Object.freeze({
    // Bidirectional VT: QRS complexes of opposite polarity in an alternating pattern (MSD Manuals,
    // Catecholaminergic Polymorphic Ventricular Tachycardia, 2026); the frontal QRS axis alternates from beat to beat
    // (Minzdrav 2025, Ventricular arrhythmias, terms). `bidirectional` flips every second beat.
    // Spec: docs/plans/2026-10-14-heart-clock-bidirectional-vt.md.
    bidirectional: 1,
    // A VT runs at more than 100 per minute (Minzdrav 2025, same). assumption: 150, the rate of the
    // monomorphic VT preset; no source gives a rate for bidirectional VT.
    heartRate: 150,
    // Ventricular arrhythmias have a wide QRS (≥120 ms), no preceding P wave and a T wave
    // discordant to the QRS (Minzdrav 2025, same). assumption: 130 ms and a T of −0.3 mV, as in
    // the monomorphic VT preset.
    qrsDuration: 130,
    pAmplitude: 0,
    tAmplitude: -0.3,
    // A rhythm from the ventricles (`bidirectional` needs it). assumption: as in the monomorphic VT
    // preset, no atrial contraction or share of filling.
    ventricularRhythm: 1,
    atrialContribution: 0,
    // assumption: an R of 0.8 mV, so the inverted complexes stay inside the 1 mV below the
    // baseline that the strip shows. The axes stay at 60°, so all three limb leads alternate.
    rAmplitude: 0.8,
  }),
  'ventricular-fibrillation': Object.freeze({
    // Ventricular fibrillation: irregular oscillations from 300 per minute with changing shape and
    // size, no P, QRS or T (Minzdrav 2025, Ventricular arrhythmias, 1.1; MSD Manuals, Ventricular
    // Fibrillation, 2024), and no blood pumped (MSD, same). The clock has no beats, no pulse and
    // no heart rate (`hasPulse`); the rate only sets the length of its time slots.
    // Spec: docs/plans/2026-10-14-heart-clock-ventricular-fibrillation.md.
    ventricularFibrillation: 1,
    // assumption: the sources do not describe the atria in VF, so the model leaves out P waves and
    // atrial contraction (params.ts requires both at 0).
    pAmplitude: 0,
    atrialContribution: 0,
  }),
  'atrial-flutter': Object.freeze({
    // Typical atrial flutter with 2:1 conduction. The rate is the sign, so this preset sets it: the
    // atria depolarize at 250–350 per minute, typically 300, and typically half of the impulses get
    // through (2:1 block), giving a regular ventricular rate of 150 (MSD Manuals, Atrial Flutter,
    // 2024; source 4 of our flutter article). 150 is that source's number, so the F waves run at
    // 2 × 150 = 300 per minute. Spec: docs/plans/2026-10-12-more-ecg-presets.md.
    heartRate: 150,
    // Conduction is usually a fixed multiple from 4:1 to 2:1 (Minzdrav 2025, Atrial fibrillation and
    // flutter, §2; source 1), typically 2:1 (MSD, same). The model keeps it fixed, so the rhythm is
    // regular: rrIrregularity and fWaveAmplitude stay 0, as flutter requires (params.ts).
    flutterConduction: 2,
    // In typical flutter the F waves form a sawtooth, most obvious in II, III and aVF (Minzdrav
    // 2025, §2; MSD), negative in the inferior leads in counterclockwise flutter (ESC 2019 SVT,
    // Russian translation, §11.1.4.1.2; source 2). The model's sawtooth points down in lead II.
    // assumption: 0.2 mV peak to peak; no source gives an F-wave amplitude.
    flutterAmplitude: 0.2,
    // Typical flutter shows negative F waves in II, III and aVF and flat, low-amplitude ones in I
    // (StatPearls, Atrial Flutter, 2022). +90° points the F waves along aVF: flat in I, the same
    // in III as in II. assumption: +85°, just off aVF, so lead I keeps low F waves (about a tenth
    // of II); the source gives the picture, not degrees.
    fAxis: 85,
    // Flutter waves with no isoelectric line between them stand in for the P wave (Minzdrav 2025,
    // §1.1; MSD: continuous and regular atrial activation), so there is no separate P wave.
    pAmplitude: 0,
    // Symptoms come from the fast rate and the loss of atrial systole (ESC 2019 SVT, Russian
    // translation, §11.1.4.1.2): no atrial share of filling.
    atrialContribution: 0,
  }),
  // Premature beats: docs/plans/2026-10-13-heart-clock-premature-beats.md. A premature beat comes
  // earlier than the next normal beat, from an impulse outside the sinus node (MSD Manuals,
  // Ventricular Premature Beats and Ectopic Supraventricular Arrhythmias, 2024). assumption: every
  // fourth beat, at 0.7 of the rhythm RR (`prematureCoupling` default); MSD describes VPBs at random
  // or in regular patterns, and no source gives a coupling interval. The rate is not set: 75.
  'atrial-premature-beats': Object.freeze({
    // The atrial impulse resets the sinus node, so the pause after it is shorter than a full
    // compensatory pause; usually conducted normally, with a narrow QRS (MSD, Ectopic SVA). The
    // P wave keeps the sinus shape and the next beat comes one rhythm RR after: assumptions. Only MSD
    // describes the ECG of atrial premature beats; the Minzdrav guidelines cover their treatment.
    prematureEvery: 4,
    prematureOrigin: 1,
  }),
  'ventricular-premature-beats': Object.freeze({
    // No P wave, a QRS of 120 ms or more and a discordant T (Minzdrav 2025, Ventricular
    // arrhythmias; MSD, VPB), usually a full compensatory pause (MSD, VPB). The shape (QRS 140 ms,
    // T −0.3 mV) is `ventricularPrematureShape` in clock.ts.
    prematureEvery: 4,
    prematureOrigin: 2,
  }),
  'sick-sinus-syndrome': Object.freeze({
    // Sinus node dysfunction includes sinus bradycardia and sinus arrest (Minzdrav 2025,
    // Bradyarrhythmias, §1.5; MSD Manuals, Sick Sinus Syndrome, 2024; sources 1 and 3 of our
    // article). The rate is the sign, so this preset sets it. The lowest normal rate is 40 per
    // minute by day at rest and 35 at night (Minzdrav 2025, §2.4.2); 40–50 at rest and 30 in
    // sleep can be physiological (ESC 2021 pacing, Russian translation, §5.1.1.1; source 2).
    // assumption: 35, below the daytime resting limit of 40 in both documents. The slider stays
    // at 30–39 (floor and ceiling below). Spec: docs/plans/2026-10-12-more-ecg-presets.md.
    heartRate: 35,
    // Sinus pause: the sinus node stops and the P waves disappear for seconds to minutes (MSD,
    // same). Minzdrav accepts pauses of up to 2 s (§2.4.2); in healthy people pauses over 2.5 s are
    // rare (ESC, §5.1.1.1). assumption: 3000 ms of silence after the beat, longer than both; the
    // gap between the beats around a pause is then 4.5–5 s at 30–39 bpm. assumption: a pause
    // after every third beat; real pauses are irregular, and the model draws no escape beats.
    pauseEvery: 3,
    pauseDuration: 3000,
  }),
  'sick-sinus-syndrome-paced': Object.freeze({
    // After treatment (`presetTreated`): symptomatic SND is treated with a permanent pacemaker (I B),
    // dual-chamber, programmed to avoid unnecessary ventricular pacing (I A) (ESC 2021 pacing, table
    // of recommendations for SND; Minzdrav 2025, Bradyarrhythmias, §3.3.1). The pacemaker sends an
    // impulse when the heart's own rhythm slows or stops (Minzdrav 2025, appendix V), so
    // the pauses go and every beat starts with an atrial stimulus that the atria capture
    // (StatPearls, Pacemaker Malfunction, 2023). assumption: AV conduction is intact, so the paced
    // P wave is followed by the model's default PR and a narrow QRS, and the P wave keeps its shape.
    // Spec: docs/plans/2026-10-13-heart-clock-after-treatment.md.
    atrialPacing: 1,
    // assumption: a lower rate of 60, inside the 50–70 slider. Sources give only examples: 50
    // (StatPearls, Pacemaker Malfunction) and 70 for permanent AF (ESC 2021, §5.2.2.2).
    heartRate: 60,
  }),
  'wpw-syndrome': Object.freeze({
    // Manifest accessory pathway in sinus rhythm: a short PR interval (<120 ms), a delta wave at
    // the start of the QRS and a wide QRS (>120 ms) (Minzdrav 2025, Supraventricular
    // tachycardias, §2.4; ESC 2019 SVT, Russian translation, §11.3.2; sources 1 and 2 of our WPW
    // article). MSD Manuals (WPW Syndrome, 2024; source 3) shows the short PR and the delta wave
    // in lead II during sinus rhythm, so the preset stays in lead II and keeps the reader's rate.
    // Spec: docs/plans/2026-10-12-more-ecg-presets.md.
    // assumption: 90 ms at 60 bpm. The model scales PR with √RR up to RR 1500 ms, so PR is 110 ms
    // at 40 bpm, 80 ms at 75 and shorter at faster rates: below 120 ms at every rate.
    prInterval: 90,
    // assumption: QRS 130 ms, above the 120 ms threshold, with a delta wave of 40 ms; the rest of
    // the complex keeps the model's default QRS width of 90 ms. No source gives the width of the
    // delta wave. The later R peak (timing.ts) lets the preset fit up to 153 bpm.
    qrsDuration: 130,
    deltaWave: 40,
  }),
  'right-bundle-branch-block': Object.freeze({
    // Right bundle branch block: QRS ≥ 0.12 s, an rsR' complex in V1 or V2, and an S wave in leads
    // I and V6 longer than R or longer than 0.04 s (MSD Manuals, Bundle Branch Block and
    // Fascicular Block, 2024). The model draws the limb leads, so it shows the broad S in I; V1 is
    // not drawn. Spec: docs/plans/2026-10-14-heart-clock-bundle-branch-block.md.
    // assumption: QRS 140 ms; the start of the QRS as in the normal preset; a broad late S of
    // −0.2 mV in II on the 0° axis, so it points right: −0.4 mV in I, lasting more than 40 ms, and
    // a slurred tail of R in III. The net QRS axis stays about +85°, inside the normal range. No
    // source gives the S axis or amplitudes in the limb leads.
    qrsDuration: 140,
    sAmplitude: -0.2,
    sAxis: 0,
    sWidth: 0.1,
  }),
  'left-bundle-branch-block': Object.freeze({
    // Left bundle branch block: QRS ≥ 0.12 s; a broad notched or slurred R wave and no Q wave in
    // leads I, aVL, V5 and V6; ST and T deviate opposite to the QRS (MSD Manuals, Bundle Branch
    // Block and Fascicular Block, 2024). Spec: docs/plans/2026-10-14-heart-clock-bundle-branch-block.md.
    // assumption: QRS 150 ms; no S wave either (the source names only the missing Q); R 0.6 mV in
    // II on the 0° axis, so lead I shows 1.2 mV, the largest R; a notch of 0.3. No source gives the
    // axis or amplitudes.
    qrsDuration: 150,
    qAmplitude: 0,
    sAmplitude: 0,
    rAmplitude: 0.6,
    qrsAxis: 0,
    rNotch: 0.3,
    // assumption: ST −0.1 mV and T −0.3 mV in II on the QRS axis, opposite to the R wave in every
    // lead; no source gives their size.
    stShift: -0.1,
    stAxis: 0,
    tAmplitude: -0.3,
    tAxis: 0,
  }),
  'left-anterior-fascicular-block': Object.freeze({
    // Left anterior fascicular block (left anterior hemiblock): modest QRS prolongation under
    // 0.12 s and a frontal QRS axis more negative than −45° (MSD Manuals, Bundle Branch Block and
    // Fascicular Block, 2024). Spec: docs/plans/2026-10-14-heart-clock-bundle-branch-block.md.
    // assumption: QRS 110 ms, wider than the model's 90 ms but under 120. A small first r of
    // 0.2 mV and a deep S of −0.4 mV in II on one line at 120°: r points down to +120° and S up to
    // −60°, so lead I shows qR, II and III show rS with the S in III twice as deep. The S area is
    // larger than the r area, so the net axis is −60°. No source gives these shapes or amplitudes.
    qrsDuration: 110,
    qAmplitude: 0,
    rAmplitude: 0.2,
    sAmplitude: -0.4,
    qrsAxis: 120,
    sAxis: 120,
  }),
  'brugada-syndrome': Object.freeze({
    // Type 1 Brugada pattern: J-point and ST elevation in the right precordial leads V1 and V2;
    // the ST segment is coved and descends to an inverted T wave (MSD Manuals, Brugada Syndrome,
    // 2026; source 2 of our Brugada article). The diagnosis needs a type 1 ST elevation of ≥2 mm
    // in V1 and/or V2 (Minzdrav 2025, Ventricular arrhythmias, §3.3.15; source 1), which is
    // 0.2 mV at the standard 10 mm/mV. The preset is drawn in V1 (`presetLeads`) and keeps the
    // reader's rate. Spec: docs/plans/2026-10-12-more-ecg-presets.md.
    // assumption: 0.3 mV; with the tail of the deep V1 S wave the trace is about 0.28 mV at the
    // J point, above the 0.2 mV threshold at every rate.
    stShift: 0.3,
    // Coved: highest just after the J point (the S tail), falling in a convex curve into the T wave.
    stSlope: 1,
    // assumption: −0.3 mV, the default T amplitude inverted; no source gives a T amplitude.
    tAmplitude: -0.3,
  }),
});

/**
 * The lowest heart rate, bpm, a preset allows, for presets whose rate is itself the sign. With
 * `heartRate` in the preset, switching to it starts at that rate (see `switchedHeartRate`). A
 * preset without a floor here starts at `defaultRateLimits[0]` (40); only a floor here can go
 * below that, down to `paramRanges.heartRate[0]`.
 */
export const presetRateFloors: Readonly<Partial<Record<PresetId, number>>> = Object.freeze({
  // Reentrant SVT is 120–250 bpm (MSD Manuals, Reentrant (Paroxysmal) SVT, 2024).
  'supraventricular-tachycardia': 120,
  // Sinus tachycardia is faster than 100 per minute (Minzdrav 2025, Supraventricular tachycardias,
  // §1.2.1): 101 is the lowest whole rate above that.
  'sinus-tachycardia': 101,
  // VT runs at more than 100 per minute (Minzdrav 2025, Ventricular arrhythmias): 101 is the lowest
  // whole rate above that, so the slider never shows a rate below the VT definition.
  'ventricular-tachycardia': 101,
  // A VT runs at more than 100 per minute (same source).
  'bidirectional-ventricular-tachycardia': 101,
  // Atrial flutter: atrial rate 250–350 per minute with F waves of a cycle under 240 ms (Minzdrav
  // 2025, Atrial fibrillation and flutter, §2). At 2:1 the F waves run at twice the ventricular
  // rate; at 125 bpm their cycle is exactly 240 ms, so 126 (F waves at 252, cycle 238 ms) is the
  // lowest whole rate that meets both.
  'atrial-flutter': 126,
  // Sick sinus syndrome: the model's lowest rate (`paramRanges.heartRate`), not a source number.
  'sick-sinus-syndrome': 30,
  // Pacemaker lower rate: assumption, see the preset.
  'sick-sinus-syndrome-paced': 50,
  // Escape rhythm with a narrow QRS: 35–50 bpm (MSD Manuals, Atrioventricular Block, 2024).
  'av-block-third-degree': 35,
  // Rates the pacemaker follows the P waves at: assumption, the sources give no lower or upper
  // tracking rate. Without it the model would allow 40–132 for this QRS.
  'av-block-third-degree-paced': 60,
});

/**
 * The highest heart rate, bpm, a preset allows, when the sign has an upper bound (atrial flutter:
 * the F waves run at `flutterConduction` times the ventricular rate, inside the source's range).
 */
export const presetRateCeilings: Readonly<Partial<Record<PresetId, number>>> = Object.freeze({
  // Atrial flutter: atrial rate up to 350 per minute (Minzdrav 2025, §1.1 and §2; MSD Manuals,
  // Atrial Flutter, 2024); at 2:1 that is a ventricular rate of 175.
  'atrial-flutter': 175,
  // Sick sinus syndrome: below 40 per minute, the lowest normal daytime resting rate in Minzdrav
  // 2025 (Bradyarrhythmias, §2.4.2) and the lower end of the possibly physiological 40–50 at rest
  // in ESC 2021 pacing (§5.1.1.1), so the slider never shows a rate that either calls normal at
  // rest.
  'sick-sinus-syndrome': 39,
  // Pacemaker lower rate: assumption, see the preset. The model draws no own beats above it and no
  // rate-adaptive pacing.
  'sick-sinus-syndrome-paced': 70,
  // assumption: the model fits Mobitz I up to 76 per minute, but there the last beat of a group
  // keeps only about 12 ms of filling; 70 leaves about 57 ms. Mobitz II keeps the model's limit.
  'av-block-second-degree-mobitz-1': 70,
  // Escape rhythm with a narrow QRS: 35–50 bpm (MSD, as above).
  'av-block-third-degree': 50,
  // assumption, as above.
  'av-block-third-degree-paced': 100,
});

/**
 * The "after treatment" preset of a disease preset, offered next to it in the article. Spec:
 * docs/plans/2026-10-13-heart-clock-after-treatment.md. Only treatments that change the ECG away
 * from normal get one; the target is drawn in the disease's lead.
 */
export const presetTreated: Readonly<Partial<Record<PresetId, PresetId>>> = Object.freeze({
  'sick-sinus-syndrome': 'sick-sinus-syndrome-paced',
  'av-block-third-degree': 'av-block-third-degree-paced',
});

export function isPresetId(value: string): value is PresetId {
  return (presetIds as readonly string[]).includes(value);
}

/** ECG leads the model can draw. It draws one at a time. */
export const leads = ['II', 'V1'] as const;
export type Lead = (typeof leads)[number];

/**
 * The QRS of each lead without disease, under every preset drawn in that lead. Spec:
 * docs/plans/2026-10-13-heart-clock-rhythms.md, section 4.
 */
export const leadBaselines: Readonly<Record<Lead, Readonly<Partial<HeartParams>>>> = Object.freeze({
  II: Object.freeze({}),
  V1: Object.freeze({
    // V1 has the smallest R wave of the chest leads and the largest S wave (StatPearls,
    // Electrocardiogram): an rS complex. assumption: R 0.3 mV and S −1 mV; the source gives
    // no amplitudes. No q wave: assumption, the source does not mention one in V1.
    qAmplitude: 0,
    rAmplitude: 0.3,
    sAmplitude: -1,
    // The P wave is commonly biphasic in V1 (StatPearls, same); the model draws one hump, so it
    // keeps the lead II P wave. The T wave keeps the lead II shape too (assumption).
  }),
});

/** The lead a preset is drawn in; presets not listed here are drawn in lead II. */
export const presetLeads: Readonly<Partial<Record<PresetId, Lead>>> = Object.freeze({
  // The type 1 pattern is seen in the right precordial leads V1 and V2 (Minzdrav 2025, Ventricular
  // arrhythmias, §3.3.15; MSD Manuals, Brugada Syndrome, 2026); the model draws V1.
  'brugada-syndrome': 'V1',
});

/** The lead a preset is drawn in. */
export function presetLead(id: PresetId): Lead {
  return presetLeads[id] ?? 'II';
}

/**
 * Full parameters of a preset: the defaults, the lead's baseline and the preset on top. Switching
 * between presets with these resets every parameter the other preset changed. `lead` is the
 * preset's own by default; an article compares normal with its disease in the disease's lead.
 */
export function presetParams(id: PresetId, lead: Lead = presetLead(id)): Readonly<HeartParams> {
  return resolveParams({ ...leadBaselines[lead], ...presets[id] });
}

/**
 * Heart rates, bpm, a heart rate control offers for a preset: `heartRateLimits` of its parameters,
 * limited below by the preset's floor (40 unless `presetRateFloors` says otherwise). `params` are
 * the preset's own by default; pass them when a caller changed some. Throws RangeError when the
 * floor is above every rate the parameters fit.
 */
export function presetRateLimits(
  id: PresetId,
  params: Readonly<HeartParams> = presetParams(id),
): readonly [min: number, max: number] {
  return rateLimitsFrom(
    params,
    presetRateFloors[id] ?? defaultRateLimits[0],
    `Preset ${id}`,
    presetRateCeilings[id],
  );
}

/**
 * `heartRateLimits` of `params` with `floor` as the lowest rate and `ceiling`, when given, as the
 * highest; `name` goes into the error.
 */
export function rateLimitsFrom(
  params: Readonly<HeartParams>,
  floor: number,
  name = 'This parameter set',
  ceiling = Infinity,
): readonly [min: number, max: number] {
  const [min, max] = heartRateLimits(params);
  const low = Math.max(min, floor);
  const high = Math.min(max, ceiling);
  if (low > high) {
    throw new RangeError(`${name} does not fit any heart rate from ${floor} to ${ceiling}`);
  }
  return [low, high];
}

/**
 * Whether the heart pumps with these parameters: not in ventricular fibrillation, which has no
 * pulse and so no heart rate to show or set (MSD Manuals, Cardiac Arrest, 2025). The interface
 * reads this instead of preset ids.
 */
export function hasPulse(params: Readonly<HeartParams>): boolean {
  return params.ventricularFibrillation === 0;
}

/** Whether a preset sets its own heart rate. */
export function setsHeartRate(id: PresetId): boolean {
  return presets[id].heartRate !== undefined;
}

/**
 * Heart rate after switching from one preset to another. Switching to a preset that sets its own
 * rate starts at that rate, and leaving one goes back to the next preset's rate (75 by default);
 * between other presets the reader's rate stays. `startRate` is the next preset's starting rate,
 * when a caller changed it. The caller keeps the result inside `presetRateLimits`.
 */
export function switchedHeartRate(
  from: PresetId,
  to: PresetId,
  rate: number,
  startRate: number = presetParams(to).heartRate,
): number {
  return setsHeartRate(from) || setsHeartRate(to) ? startRate : rate;
}
