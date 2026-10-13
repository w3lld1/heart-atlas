# Stage 3 presets: verified quotes

Researched 2026-10-11. Only sources from `docs/plans/2026-10-11-stage-3-sources.md` and the StatPearls chapters in `docs/plans/2026-10-11-stage-2-heart-clock.md`.

## How the material was accessed

- **Article**: the Russian articles in `content/ru/disease/*.mdx`. They already passed a source check. Their text is a Russian paraphrase, not a verbatim guideline quote. The `Cite n` number points to the article's frontmatter `sources`.
- **WebFetch**: the page was opened on 2026-10-11 with WebFetch.
  - The fetch tool returns quotes through a small model and cuts them to about 125 characters. A quote may therefore be a verbatim fragment and not a whole sentence.
  - NCBI Bookshelf pages opened with `?report=printable` and showed no captcha, except NBK526072 (AF).
  - academic.oup.com and ahajournals.org serve only the first ~100k characters, so later sections of some guidelines could not be reached.
  - Direct curl is blocked by the proxy (403).
- Conversions:
  - Per StatPearls ECG: "one mVolt should move the stylus by 1 cm", so 1 mm = 0.1 mV.
  - Rates in Hz are rate/min divided by 60. This is arithmetic, not a source number.

---

## 1. Normal (baseline, for reference)

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| Pressures | LV 120/15, Ao 120/80, LA/PA 25/10 mmHg | (see stage-2 spec row 2) | StatPearls, Physiology, Cardiac Cycle, statpearls.com/point-of-care/786 | stage-2 spec, opened 11.10.2026; not re-fetched |
| ECG calibration | 1 mV = 10 mm | "The ECG machine is calibrated in such a way that an increase of voltage by one mVolt should move the stylus by 1 cm." | StatPearls, Electrocardiogram, statpearls.com/point-of-care/20969 | WebFetch, yes |

## 2. Atrial fibrillation

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| No P waves | absent | "AF is reflected on the surface electrocardiogram (ECG) by the absence of discernible and regular P waves, and irregular activation of the ventricles." | ESC 2024 AF (10.1093/eurheartj/ehae176), §3.1 | WebFetch academic.oup.com, yes |
| RR irregular | no pattern | "no specific pattern to RR intervals, in the absence of an atrioventricular block" | ESC 2024 AF, §3.1 | WebFetch, yes |
| ECG criteria | irregular RR, no P, f waves | "irregular R-R intervals (when atrioventricular conduction is present)"; "absence of distinct P waves"; "irregular atrial activity also known as fibrillatory waves" | 2023 ACC/AHA/ACCP/HRS AF (10.1161/CIR.0000000000001193), §2.2, Table 4 | WebFetch ahajournals.org, yes |
| Irregularly irregular | wording | "The presence of 'irregularly irregular' narrow QRS complexes with no discrete P waves is the hallmark feature" | StatPearls Electrocardiogram, point-of-care/20969 | WebFetch, yes |
| Atrial rate (AHA) | 300–500/min, i.e. 5–8.3 Hz | "AF is a chaotic, rapid (300-500 bpm), and irregular atrial rhythm." | ACC/AHA 2023 AF, §2.3 | WebFetch, yes |
| Atrial rate (Minzdrav) | 350–700/min, i.e. 5.8–11.7 Hz | Article: «хаотическая электрическая активность предсердий с частотой 350–700 в минуту» | Article atrial-fibrillation.mdx, Cite 3 = Минздрав «Фибрилляция и трепетание предсердий» 2025 | Article only; elpub page returned a server error |
| Loss of atrial contraction | qualitative | "AF results in a loss of effective atrial contraction." / AHA: "ineffective atrial contraction" | ESC 2024 §3.1; ACC/AHA 2023 Table 4 | WebFetch, yes; **no %** |
| Diagnosis duration | ≥30 s | "30 s or more on single-lead or multiple-lead ECG devices has generally been the consensus opinion." | ESC 2024 AF, §3.2 | WebFetch, yes |

Overlap of the two rate ranges: 350–500/min, i.e. 5.8–8.3 Hz. A value such as 6 Hz fits both sources.

## 3. STEMI

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| ST elevation, V2–V3 | ≥2.5 mm (0.25 mV) in men <40 y; ≥2 mm (0.2 mV) in men ≥40 y; ≥1.5 mm (0.15 mV) in women | "New ST elevation at the J-point in at least two contiguous leads:" "≥2.5 mm in men <40 years, ≥2 mm in men ≥40 years, or ≥1.5 mm in women regardless of age in leads V2–V3" | 2023 ESC ACS (10.1093/eurheartj/ehad191), §3.2.1 | WebFetch, yes |
| ST elevation, other leads (lead II) | ≥1 mm (0.1 mV) | "and/or ≥1 mm in the other leads (in the absence of left ventricular [LV] hypertrophy or left bundle branch block [LBBB])." | ESC 2023 ACS, §3.2.1 | WebFetch, yes |
| Same rule (StatPearls ACS) | ≥1 mm except V2–V3 | "ST-segment elevations in 2 or more contiguous leads" … "1 mm or greater in all leads except V2–V3" … "where sex- and age-specific criteria apply" | StatPearls Acute Coronary Syndrome, NBK459157 (updated 05.07.2026), Evaluation | WebFetch NCBI printable, yes |
| StatPearls ECG | ≥1 mm limb, ≥2 mm precordial | ST change significant when it "is at least 1 mm in a limb lead or 2 mm in a precordial lead." | StatPearls Electrocardiogram, point-of-care/20969 | WebFetch, yes |
| Hyperacute T waves | named only, no amplitude | "T wave abnormalities, including hyperacute T waves" (in patients without persistent ST elevation) | ESC 2023 ACS, §3.2 | WebFetch, yes; **no number** |
| Mechanism | complete occlusion leads to transmural ischaemia and ST elevation | Article: «Полная окклюзия артерии вызывает трансмуральную ишемию с подъёмом сегмента ST на ЭКГ (STEMI)» | Article coronary-heart-disease.mdx, Cite 5 (StatPearls ACS) | Article |

## 4. Heart failure with reduced EF (HFrEF)

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| HFrEF | EF ≤40% | "LV EF ≤40%" | StatPearls Heart Failure, NBK430873 (updated 26.02.2025) | WebFetch NCBI printable, yes |
| HFmrEF / HFpEF | 41–49% / ≥50% | "LVEF 41% to 49% and evidence of HF …"; "LVEF ≥50% and evidence of HF …" | same | WebFetch, yes |
| Same groups (Minzdrav) | ≤40 / 41–49 / ≥50 | Article: «ХСН со сниженной (40% и менее), умеренно сниженной (41–49%) и сохранённой (50% и более) ФВ» | Article heart-failure.mdx, Cite 2 = Минздрав ХСН 2024 | Article |
| ESC 2026 | classification revised | Article: «Рекомендации ESC 2026 года пересмотрели классификацию по фракции выброса» | Article, Cite 1 | Article; the ESC 2026 numbers were not checked |
| LVEDP / filling pressure | **no number** | "BNP is an independent predictor of increased left ventricular end-diastolic pressure." | StatPearls HF | WebFetch; qualitative only |
| S3 | present | "An S3 gallop is the most significant and early finding associated with HF." | StatPearls HF | WebFetch, yes |
| Tachycardia | >120/min is a Framingham minor criterion | "Tachycardia (heart rate >120 beats per minute)" | StatPearls HF | WebFetch, yes (diagnostic criterion, not a typical value) |

## 5. Arterial hypertension

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| Hypertension (ESC) | ≥140 / ≥90 office | "The 2024 Guidelines define hypertension as a confirmed office systolic BP of ≥140 mmHg or diastolic BP of ≥90 mmHg." | ESC 2024 HTN (10.1093/eurheartj/ehae178), §6.1 | WebFetch, yes |
| Elevated BP (ESC) | 120–139 / 70–89 | "'elevated BP', which is defined as an office systolic BP of 120–139 mmHg or diastolic BP of 70–89 mmHg." | ESC 2024, §6.1 | WebFetch, yes |
| Non-elevated (ESC) | <120 / <70 | "Non-elevated BP is defined as a systolic BP of <120 mmHg and a diastolic BP of <70 mmHg." | ESC 2024, §6.1 | WebFetch, yes |
| NICE stage 1 | 140/90–159/99 | "Clinic blood pressure ranging from 140/90 mmHg to 159/99 mmHg" | NICE NG136, Recommendations, terms used | WebFetch nice.org.uk, yes |
| NICE stage 2 | ≥160/100 and <180/120 | "Clinic blood pressure of 160/100 mmHg or higher but less than 180/120 mmHg" | NICE NG136 | WebFetch, yes |
| NICE severe | ≥180 or ≥120 | "Clinic systolic blood pressure of 180 mmHg or higher or clinic diastolic blood pressure of 120 mmHg or higher." | NICE NG136 | WebFetch, yes |
| Minzdrav: hypertension | ≥140 / ≥90 | «САД ≥140 мм рт.ст. и/или ДАД ≥90 мм рт.ст.» | Минздрав АГ 2024, Рос кардиол журн 6117, §1.1 | WebFetch russjcardiol.elpub.ru, yes |
| Minzdrav: high-normal | 130–139 / 85–89 | «от 130 до 139 мм рт.ст. и/или ДАД от 85 до 89 мм рт.ст.» | same, «Термины и определения» | WebFetch, yes |
| Minzdrav grades 1–3 | **not seen** | Table П2 (Appendix A3) was not in the visible text | same | not verified |

For a representative preset, NICE stage 2 (≥160/100 and <180/120) or the band between the ESC threshold and NICE severe gives a sourced range. In the model, `aorticDiastolic` maps to diastolic BP. `lvSystolic` roughly equals systolic BP when there is no aortic stenosis. Equating LV systolic pressure with cuff systolic pressure is a modelling assumption, not a sourced fact.

## 6. Aortic stenosis

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| Severe AS (high gradient) | Vmax ≥4 m/s or mean ΔP ≥40 mmHg | "Aortic Vmax ≥4 m/s or mean ΔP ≥40 mm Hg" | 2020 ACC/AHA VHD (10.1161/CIR.0000000000000923), Table 13 (§3.1), stages C1/D1 | WebFetch ahajournals.org, yes |
| AVA | ≤1.0 cm² (not required) | "AVA typically is ≤1.0 cm2 (or AVAi 0.6 cm2/m2) but not required to define severe AS" | same, Table 13 C1 | WebFetch, yes |
| Very severe | Vmax ≥5 m/s or mean ≥60 mmHg | Article: «Очень тяжёлый стеноз — пиковая скорость ≥5 м/с или средний градиент ≥60 мм рт. ст.» | Article aortic-stenosis.mdx, Cite 2 (ACC/AHA 2020) | Article |
| StatPearls asymptomatic AVR threshold | >5 m/s, mean >60 | "peak velocity greater than 5 m/sec and mean pressure gradient greater than 60" (the text gives no unit) | StatPearls Aortic Stenosis, NBK557628 (updated 16.04.2023), Treatment/Management | WebFetch NCBI printable, yes |
| Gradient raises LV pressure | qualitative | "Left ventricular (LV) obstruction caused by the stenosis of the valve increases LV systolic pressure." | StatPearls AS, Pathophysiology | WebFetch, yes |
| Carotid pulse | parvus et tardus | "A slow-rising, late-peaking, and a low-amplitude carotid impulse, pulsus parvus et tardus, is an expected finding in severe aortic stenosis" | StatPearls AS, History and Physical | WebFetch, yes |
| S2 | single, may be paradoxical | "the second heart sound may lack a split and can be heard as a single sound during inspiration." / "It can also become paradoxical when the closure of the aortic valve gets delayed than the pulmonic valve." | StatPearls AS | WebFetch, yes |
| A2 diminished | qualitative | "the A2 component of the second heart sound is diminished or absent" | ACC/AHA 2020 VHD, §3.2.1 | WebFetch, yes |
| Murmur | mid-systolic ejection, crescendo-decrescendo | "A mid-systolic ejection murmur, heard best over the right second intercostal space, with radiation into the right neck." | StatPearls AS | WebFetch, yes |
| ECG | LVH, 1st-degree AV block (figure example) | "sinus rhythm with 1st-degree atrioventricular block" … "left ventricular hypertrophy by voltage criteria" | StatPearls AS, figure caption | WebFetch, yes (a single example ECG, not a criterion) |
| Peak-to-peak / peak instantaneous gradient | **not found** | — | ACC/AHA visible text and StatPearls | not verified |

Modelling note: the guideline number is the **mean** Doppler gradient (≥40 mmHg). If the new parameter is a systolic LV–aorta gradient, it should be applied so that the time-averaged LV–Ao difference during ejection is about 40 mmHg or more. Any peak value would be our modelling, not a sourced number.

## 7. Atrial septal defect

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| S2 | wide fixed split | "a wide, fixed S2 splitting is characteristic." | StatPearls ASD, NBK535440 (updated 21.01.2025), History and Physical | WebFetch NCBI printable, yes |
| S2 (Minzdrav) | persistent split | «постоянное расщепление второго тона в проекции легочной артерии» | Минздрав ДМПП 2023 (Рос кардиол журн 5588), §2.2 | WebFetch elpub, yes |
| Murmur | soft systolic ejection, pulmonic area | "a soft, systolic ejection murmur over the pulmonic area (2nd intercostal space)" | StatPearls ASD | WebFetch, yes |
| ECG | right axis deviation; incomplete or complete RBBB | «отклонение электрической оси сердца вправо»; «неполная или полная блокада правой ножки пучка Гиса» | Минздрав ДМПП 2023, §2.4 | WebFetch, yes |
| RBBB definition | QRS >0.12 s, RSR in V1–V2 | "a widened QRS complex greater than 0.12 seconds, along with an RSR pattern in V1 and V2." | StatPearls Electrocardiogram, point-of-care/20969 | WebFetch, yes |
| Right axis | +90 to 180° | "a right axis deviation (+90 and 180 degrees) by the presence of negative QRS in the lead I and positive in the lead aVF." | StatPearls ECG | WebFetch, yes |
| Significant shunt | Qp/Qs >1.5 | "Significant shunts have a pulmonary (Qp) to systemic (Qs) flow ratio greater than 1.5:1 (Qp/Qs > 1.5)." | StatPearls ASD, Pathophysiology | WebFetch, yes |
| Atrial pressures | LA > RA | "Normally, the pressure in the right atrium is significantly lower than in its left counterpart" / «хоть незначительно, но более высокое давление в ЛП» | StatPearls ASD; Минздрав ДМПП §1.2 | WebFetch, yes |
| Left heart | LV volume-underloaded | «левый желудочек (ЛЖ) недогружен объемом» | Минздрав ДМПП, §2.4 comments | WebFetch, yes (qualitative) |
| PA pressure | >40 mmHg means catheterisation | «при повышении расчетного систолического давления в легочной артерии >40 мм рт.ст.» | Минздрав ДМПП, §2.4 | WebFetch, yes |
| PR prolongation, rSR′ term, incomplete RBBB QRS width | **not found** | — | StatPearls ASD has no ECG description; Минздрав has none | not verified |

Modelling note: the model has no RV/PA curves. For ASD, the sourced changes we can show are fixed S2 splitting, an RBBB-like wide QRS (>120 ms is complete RBBB per StatPearls ECG), and right axis. Lead II polarity under right axis deviation is not stated by a source. Left-heart pressures: the only sourced fact is that LA pressure is slightly higher than RA pressure and the LV is volume-underloaded. **No number** is given for a change in LV/Ao pressures.

## 8. First-degree AV block

Added 2026-10-12 for [the ECG presets spec](2026-10-12-more-ecg-presets.md), PR 2. Sources are the `av-block` article's own (`content/{ru,en}/disease/av-block.mdx`). Access differs from the rest of this file: both pages were opened on 2026-10-12 with `curl` through the agent proxy, which now lets it through; the Minzdrav text came as JSON from `apicr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=160_2` (the `cr.minzdrav.gov.ru/api.ashx` address returns only the site's HTML shell).

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| PR threshold | > 0.20 s | "All normal P waves are followed by QRS complexes, but the PR interval is longer than normal (> 0.20 second—see figure First-Degree Atrioventricular Block)." | MSD Manuals Professional, Atrioventricular Block (2024), source 2 of the article | curl, yes |
| Same, figure caption | > 0.2 s, no skipped beats | "For first-degree block, conduction is slowed without skipped beats. All normal P waves are followed by QRS complexes, but the PR interval is longer than normal (> 0.2 second)." | MSD, same page | curl, yes |
| Definition (Minzdrav) | every impulse conducted, more slowly | «ПЖБ I степени – замедление проведения импульса от предсердий к желудочкам с проведением каждого импульса.» | Минздрав 2025 «Брадиаритмии и нарушения проводимости» (cr.minzdrav.gov.ru/view-cr/160_2), source 1 of the article | curl JSON, yes |
| PR threshold (Minzdrav) | **no number** | The text names no PR limit for first-degree block. PR numbers it does give are indication thresholds (PR > 240 ms in neuromuscular disease and after TAVI, PR > 300 ms with pacemaker-syndrome-like symptoms), not the definition | Минздрав 2025, same | curl JSON; searched for «PQ», «PR», «0,20», «200 мс» in the text and tables of the JSON; images were not read |
| Article phrase | > 0.20 s | Article: «I степень: за каждым нормальным зубцом P следует QRS, но интервал PR длиннее нормы (более 0,20 с).» | Article av-block.mdx, Cite 2 (MSD) | Article |

Modelling note: the preset value 260 ms at 60 bpm is an assumption, not a source number. The model scales PR with √RR (`timing.ts`); with 260 ms the preset fits 40–96 bpm (`heartRateLimits`), and PR is 232.6 ms at 75 bpm and 205.5 ms at 96 bpm, so it stays above 200 ms at every rate the preset allows. With 240 ms PR would drop below 200 ms from 87 bpm (199.3 ms). Minzdrav does not contradict the 0.20 s threshold; it gives none.

## 9. Supraventricular tachycardia (typical AVNRT)

Added 2026-10-12 for [the ECG presets spec](2026-10-12-more-ecg-presets.md), PR 3. Sources are the `supraventricular-tachycardia` article's own (`content/{ru,en}/disease/supraventricular-tachycardia.mdx`). Both pages were opened on 2026-10-12 with `curl` through the agent proxy; the Minzdrav text came as JSON from `apicr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=619_3`.

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| Rate, rhythm, QRS | 120–250 bpm, regular, narrow | "Reentrant (paroxysmal) supraventricular tachycardias are defined as the sudden-onset, sudden-offset, rapid (120 to 250 beats per minute), regular (successive RR interval variations ≤ 0.04 seconds), narrow QRS complex (or wide QRS complex with bundle branch block) tachycardias that are not sinus tachycardia, atrial fibrillation, or atrial flutter." | MSD Manuals Professional, Reentrant (Paroxysmal) Supraventricular Tachycardias (PSVT) (2024), Pathophysiology; source 3 of the article | curl, yes |
| Retrograde P (MSD) | at the end of QRS | "In most cases of typical (slow-fast) AV nodal reentrant tachycardia, retrograde P waves are in the terminal portion of the QRS complex (often producing a pseudo-R′ deflection in lead V1); about one-third occur just after the QRS complex, and very few occur immediately before." | MSD, same page, Diagnosis | curl, yes |
| Definition (Minzdrav) | > 100 per minute | «НЖТ – три и более (по некоторым литературным источникам 5 и более) последовательных сокращения сердца с частотой сердечных сокращений (ЧСС) > 100 в 1 минуту…» | Минздрав 2025 «Наджелудочковые тахикардии» (cr.minzdrav.gov.ru/view-cr/619_3), §1.1; source 1 of the article | curl JSON, yes |
| Narrow QRS (Minzdrav) | ≤ 120 ms | «Термин «тахикардия с узким комплексом QRS» означает, что продолжительность QRS-комплексов в цепи тахикардии составляет ≤ 120 мс.» | Минздрав 2025, same | curl JSON, yes |
| Retrograde P′ (Minzdrav) | merges with QRS | «При типичной форме АВУРТ, называемой «медленно-быстрой» («slow- fast»), ретроградные зубцы P’ постоянно связаны с комплексами QRS и сливаются с ними, реже определяются в конце QRS-комплекса.» | Минздрав 2025, same | curl JSON, yes |
| Article phrases | 120–250, regular, ≤ 120 ms, P′ merges | «…ритм частый — от 120 до 250 ударов в минуту — и ровный.<Cite n={3} />»; «Узкие комплексы QRS (≤120 мс)…<Cite n={1} />»; «При типичной АВУРТ ретроградные зубцы P′ обычно сливаются с QRS или видны в его конце…<Cite n={[1, 3]} />» | Article supraventricular-tachycardia.mdx | Article |

Modelling note: 170 bpm is an assumption inside 120–250 and below the model's limit of 180 (`paramRanges.heartRate`); the article and MSD give no single typical rate (MSD gives "most commonly 180 to 210 beats/minute" on examination, above the model's limit). The preset's slider floor of 120 is the lower end of the MSD range. `pAmplitude: 0` stands for "no separate P wave": the model cannot draw a P′ at the end of QRS or after it. QRS stays at the default 90 ms and RR stays regular.

## 10. Long QT syndrome

Added 2026-10-12 for [the ECG presets spec](2026-10-12-more-ecg-presets.md), section «Дополнение: ЖТ и удлинённый QT». Sources are the `long-qt-syndrome` article's own (`content/{ru,en}/disease/long-qt-syndrome.mdx`). Both pages were opened on 2026-10-12 with `curl` through the agent proxy; the Minzdrav text came as JSON from `apicr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=569_2`.

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| Diagnosis | QTc ≥ 480 ms | «Группа экспертов ЕОК, разрабатывающая клинические рекомендации по лечению ЖА 2022 г., подтвердила диагностические критерии для установления клинического диагноза СУИQT [8]: QTc ≥ 480 мс или наличие > 3 баллов по шкале оценки риска для СУИQT ( Приложение Г1 ) [567]. При наличии аритмогенного обморока или сердечного ареста QTc ≥ 460 мс достаточно для постановки диагноза СУИQT.» | Минздрав 2025 «Желудочковые нарушения ритма сердца. Внезапная сердечная смерть» (cr.minzdrav.gov.ru/view-cr/569_2), source 1 of the article | curl JSON, yes |
| Risk | especially > 0.50 s | "The risk of TdP VT is dependent on the degree of QTc prolongation, particularly if it is > 0.50 second ( 1 , 2 )." | MSD Manuals Professional, Long QT Interval Syndromes (2026), source 2 of the article | curl, yes |
| Rate correction | Bazett | "…prolongation of the rate-corrected QT interval on the ECG (QTc, typically calculated using Bazett formula)." | MSD, same page | curl, yes |
| Article phrases | ≥ 480 ms, > 500 ms | «…диагноз ставят при QTc 480 мс и больше или при сумме больше 3 баллов по шкале Шварца…<Cite n={1} />»; «Риск тахикардии типа «пируэт» тем выше, чем длиннее QTc, особенно больше 500 мс…<Cite n={[1, 2]} />» | Article long-qt-syndrome.mdx, diagram caption | Article |

Modelling note: the preset value 500 ms is an assumption, not a source number: it is above the 480 ms threshold and at the point where the article says the risk rises. The model scales QT with √RR (`timing.ts`), which is the Bazett correction, so the model's QTc is exactly 500 ms at every rate. A QT this long fits the beat only up to 137 bpm (`heartRateLimits`: 40–137); at 75 bpm the QT is 447 ms against 358 ms in the normal preset. The preset does not draw torsades de pointes or any other change of the T wave.

## 11. Ventricular tachycardia (monomorphic)

Added 2026-10-12 for [the ECG presets spec](2026-10-12-more-ecg-presets.md), section «Дополнение: ЖТ и удлинённый QT». Sources are the `ventricular-tachycardia` article's own (`content/{ru,en}/disease/ventricular-tachycardia.mdx`). Access as in section 10 (same Minzdrav guideline, 569_2).

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| Definition | ≥ 3 beats, > 100 per minute | «Желудочковая тахикардия – ≥ 3 последовательных сокращения с частотой более 100 ударов в мин., исходящие из желудочков, независимо от предсердного и АВ-узлового проведения [8].» | Минздрав 2025 «Желудочковые нарушения ритма сердца. Внезапная сердечная смерть», §1.1; source 1 of the article | curl JSON, yes |
| ECG signs | QRS ≥ 120 ms, no P, discordant T | «Общими ЭКГ-признаками для всех ЖНР являются: 1) широкий деформированный комплекс QRS (≥ 120 мс), который чаще бывает преждевременным, реже – своевременным или выскальзывающим; 2) отсутствие предшествующего зубца P; 3) дискордантность зубца Т по отношению к основному зубцу желудочкового комплекса; 4) наличие сливных комплексов.» | Минздрав 2025, same | curl JSON, yes |
| Monomorphic (Minzdrav) | identical QRS | «Мономорфная ЖТ – ЖТ при наличии одинаковой конфигурации QRS-комплексов.» | Минздрав 2025, same | curl JSON, yes |
| Monomorphic (MSD) | regular, identical QRS | "Monomorphic VT: Single abnormal focus or reentrant pathway and thus regular, identical-appearing QRS complexes" | MSD Manuals Professional, Ventricular Tachycardia (VT) (2024), source 2 of the article | curl, yes |
| Rate (MSD) | ≥ 120 per minute | "Ventricular tachycardia is ≥ 3 consecutive ventricular beats at a rate ≥ 120 beats/minute." | MSD, same page | curl, yes |
| Article phrases | > 100, ≥ 120 ms, no P, discordant T, regular, identical | «Российские рекомендации называют ЖТ три и более сокращения подряд из желудочков с частотой более 100 в минуту.<Cite n={1} />»; «Общие ЭКГ-признаки желудочковых нарушений ритма: широкий деформированный комплекс QRS (≥ 120 мс), отсутствие предшествующего зубца P, дискордантность зубца T по отношению к основному зубцу комплекса, сливные комплексы.<Cite n={1} />»; «…поэтому ритм частый и ровный, а комплексы QRS на ЭКГ одинаковые (мономорфная ЖТ).<Cite n={[1, 2]} />» | Article ventricular-tachycardia.mdx | Article |

Modelling note: the article gives the Minzdrav threshold (> 100 per minute), so the preset floor is 101, the lowest whole rate above it; MSD's ≥ 120 is not in the article, and rates 101–119 count as VT by Minzdrav only. 150 bpm, QRS 130 ms and T −0.3 mV are assumptions: no source gives a single typical rate, QRS width or T amplitude. The model's QRS is mainly positive (R 1 mV, S −0.25 mV, `ecg.ts`), so a negative T is discordant to it. QRS 130 ms fits up to 169 bpm (the R peak must come before the aortic valve opens, `timing.ts`). The model keeps the P-to-QRS delay as a flat stretch, and its Wiggers diagram keeps the atrial share of filling in step with every beat: it cannot show AV dissociation or fusion complexes.

## 12. Atrial flutter (typical, 2:1 conduction)

Added 2026-10-13 for [the ECG presets spec](2026-10-12-more-ecg-presets.md), section «Дополнение: трепетание предсердий и СССУ». Sources are the `atrial-flutter` article's own (`content/{ru,en}/disease/atrial-flutter.mdx`), quoted in the article's evidence file (`evidence/atrial-flutter.md`, rows 1, 6, 14, 15). The quotes below were checked again on 2026-10-13 against texts opened with `curl` through the agent proxy: the Minzdrav guideline as JSON from `apicr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=382_2` (sections «1.1 Определение заболевания или состояния» and «2. Диагностика»), the MSD page, and the ESC 2019 SVT Russian translation PDF (russjcardiol.elpub.ru/jour/article/viewFile/3864/2959, `pdftotext`, line-end hyphens joined).

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| Atrial rate, no isoelectric line | 250–350 per minute | «Трепетание предсердий (ТП) — наджелудочковая тахиаритмия, характеризующаяся возбуждением предсердий с частотой 250–350 в минуту («волны трепетания» с отсутствием изолинии на ЭКГ) вследствие процесса macro re-entry вокруг определенного анатомического или функционального препятствия (как правило, с участием трикуспидального клапана).» | Минздрав 2025 «Фибрилляция и трепетание предсердий» (cr.minzdrav.gov.ru/view-cr/382_2), §1.1; source 1 of the article | curl JSON, yes |
| ECG criteria | F cycle < 240 ms, 250–350 per minute; sawtooth in II, III, aVF | «Регулярный предсердный ритм (волны F с циклом менее 240 мс) с частотой 250–350 в минуту при одинаковых или изменяющихся интервалах RR.»; «Наличие волн F, имеющих при типичном ТП вид «пилообразной» кривой, особенно отчетливо видных в нижних отведениях (II, III, aVF).» | Минздрав 2025, §2 | curl JSON, yes |
| Conduction | from 4:1 to 2:1 | «обычно наблюдается кратное проведение с предсердий на желудочки в соотношении от 4:1 до 2:1, редко 1:1» | Минздрав 2025, §2 | curl JSON, yes |
| Typical rates, 2:1 | atria 250–350, typically 300; ventricles 150 | "The atria depolarize at a rate of 250 to 350 beats/minute (typically 300 beats/minute). Because the atrioventricular (AV) node cannot usually conduct at this rate, typically half of the impulses get through (2:1 block), resulting in a regular ventricular rate of 150 beats/minute." | MSD Manuals Professional, Atrial Flutter (2024), source 4 of the article | curl, yes |
| Varying block | irregular rhythm | "Sometimes, the block varies from moment to moment, causing an irregular ventricular rhythm." | MSD, same page | curl, yes |
| Sawtooth (MSD) | continuous, regular | "In typical flutter, ECG shows continuous and regular atrial activation with a sawtooth pattern, most obvious in leads II, III, and aVF" | MSD, same page | curl, yes |
| F-wave direction | negative in inferior leads, positive in V1; 250–330 per minute | «Трепетание против часовой стрелки приводит к развитию регулярной волны активации с ЧПС 250-330 уд./мин, с отрицательными пилообразными зубцами F в нижних отведениях и положительными — в отведении V1 (рис. 10).» | ESC 2019 SVT, Russian translation (Рос кардиол журн 2020;25(7):3864, DOI 10.15829/1560-4071-2020-3864), §11.1.4.1.2; source 2 of the article | curl PDF, yes |
| Loss of atrial systole | — | «Помимо симптомов, связанных с высокой ЧСС и потерей систолы предсердий, нередко встречаются и симптомы обратимой систолической дисфункции ЛЖ и тахикардиомиопатии [233, 234].» | ESC 2019 SVT, Russian translation, §11.1.4.1.2 | curl PDF, yes |
| Article phrases | 250–350, 300, 150, 2:1, sawtooth | «…при котором предсердия возбуждаются с частотой 250–350 в минуту.»; «Предсердия возбуждаются обычно около 300 раз в минуту; АВ-узел не успевает проводить все импульсы, и чаще до желудочков доходит каждый второй — около 150 в минуту (на схеме показано замедленно).<Cite n={4} />»; «ЭКГ-критерии ТП: регулярный предсердный ритм (волны F с циклом менее 240 мс) с частотой 250–350 в минуту при одинаковых или изменяющихся интервалах RR; обычно проведение на желудочки кратное, от 4:1 до 2:1, редко 1:1; волны F при типичном ТП имеют вид «пилообразной» кривой, особенно отчётливой в нижних отведениях (II, III, aVF).<Cite n={1} /> При ТП против часовой стрелки зубцы F отрицательные в нижних отведениях и положительные в V1.<Cite n={2} />» | Article atrial-flutter.mdx (ru lines 44, 55–56, 115; en lines 44, 54–56, 114) | Article |

Modelling note: 150 bpm is MSD's number for typical 2:1 flutter, so the F waves start at 300 per minute (MSD's typical atrial rate). The model ties the F waves to the beat (`flutterConduction: 2`), so they run at twice the ventricular rate at every slider position. The slider is limited to 126–175: 175 is 350 / 2; 125 would give an F cycle of exactly 240 ms, and Minzdrav asks for less than 240 ms, so the floor is 126 (F waves at 252 per minute, cycle 238 ms). ESC gives 250–330 for counterclockwise flutter; rates 166–175 are inside the Minzdrav and MSD range only. The F-wave amplitude (0.2 mV peak to peak) is an assumption. `pAmplitude: 0` stands for "flutter waves instead of P waves"; `atrialContribution: 0` for the loss of atrial systole. The model draws no varying conduction, no 1:1 conduction and no other lead.

## 13. Sick sinus syndrome (sinus bradycardia with pauses)

Added 2026-10-13 for [the ECG presets spec](2026-10-12-more-ecg-presets.md), section «Дополнение: трепетание предсердий и СССУ». Sources are the `sick-sinus-syndrome` article's own (`content/{ru,en}/disease/sick-sinus-syndrome.mdx`), quoted in the article's evidence file (`evidence/sick-sinus-syndrome.md`, rows 5, 6, 12, 29). Checked again on 2026-10-13 with `curl`: the Minzdrav guideline as JSON from `apicr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=160_2` (sections «1.5 Классификация заболевания или состояния» and «2.4 Инструментальные исследования», subsection 2.4.2), the MSD page (its URL now redirects to `…/sick-sinus-syndrome`), and the ESC 2021 pacing Russian translation PDF (russjcardiol.elpub.ru/jour/article/download/5159/3771, `pdftotext`).

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| Spectrum | sinus bradycardia, sinus arrest | «ДСУ объединяет спектр аритмий: - синусовая брадикардия, - отказ синусового узла, - синусно-предсердная блокада (СПБ), которую разделяют на:» | Минздрав 2025 «Брадиаритмии и нарушения проводимости» (cr.minzdrav.gov.ru/view-cr/160_2), §1.5; source 1 of the article | curl JSON, yes |
| Spectrum (MSD) | — | "Sick sinus syndrome includes Inappropriate sinus bradycardia Alternating bradycardia and atrial tachyarrhythmias (bradycardia-tachycardia, or brady-tachy syndrome) Sinus pause or sinus arrest Sinoatrial (SA) exit block Chronotropic incompetence" | MSD Manuals Professional, Sick Sinus Syndrome (Sinus Node Dysfunction) (2024), source 3 of the article | curl, yes |
| Sinus pause | no P waves; escape beats | "Sinus pause is temporary cessation of sinus node activity, seen on electrocardiography (ECG) as disappearance of P waves for seconds to minutes. The pause usually triggers escape activity in lower pacemakers (eg, atrial or junctional), preserving heart rate and function, but long pauses cause dizziness and syncope." | MSD, same page | curl, yes |
| Normal limits (Minzdrav) | 40 by day at rest, 35 at night; pauses ≤ 2 s | «Предельное нормальное снижение частоты ритма днем в покое определяется величиной 40 имп/мин, ночью — 35 имп/мин и не зависит от пола и возраста. Допускается также развитие синусовых пауз, длительность которых не превышает 2 секунд.» | Минздрав 2025, §2.4.2 | curl JSON, yes |
| Physiological bradycardia (ESC) | 40–50 at rest, 30 in sleep | «Например, синусовая брадикардия 40-50 уд./мин в покое и 30 уд./мин во время сна, в частности у профессиональных спорт­ сменов, может быть расценена как физиологическая и не требует ПЭКС.» (the PDF has a soft hyphen in «спорт­ сменов») | ESC 2021 pacing, Russian translation (Рос кардиол журн 2022;27(7):5159, DOI 10.15829/1560-4071-2022-5159), §5.1.1.1; source 2 of the article | curl PDF, yes |
| Pauses (ESC) | > 2.5 s rare | «…у здоровых лиц паузы >2,5 с встречаются редко, но наличие только пауз не должно интерпретироваться как патологическое состояние…» | ESC 2021 pacing, Russian translation, §5.1.1.1 | curl PDF, yes |
| Pacing threshold | pause > 6 s | «У пациентов с обмороками ЭКС может быть рассмотрена для уменьшения рецидивирующих обмороков если документирована бессимптомная пауза >6 сек на фоне синус-ареста» | ESC 2021 table (IIb C); the same sentence in Минздрав 2025 §3.3.1 | evidence file; Minzdrav sentence found in the curl JSON |
| Article phrases | 40/35, 2 s; 40–50/30, 2.5 s | «Российские рекомендации считают предельным нормальным снижением частоты 40 имп/мин днём в покое и 35 имп/мин ночью и допускают синусовые паузы не длиннее 2 секунд.<Cite n={1} /> ESC пишет, что синусовая брадикардия 40–50 уд./мин в покое и 30 уд./мин во сне … может быть физиологической, а паузы длиннее 2,5 с у здоровых людей встречаются редко, но сами по себе не должны считаться патологией.<Cite n={2} />»; «…P waves disappear from the ECG… During a pause, lower pacemakers usually take over…<Cite n={3} />» | Article sick-sinus-syndrome.mdx (ru line 85; en lines 53–57, 86) | Article |

Modelling note: the two guidelines disagree on the limits, so the preset takes values abnormal under both for daytime rest. 35 bpm is an assumption below 40 (Minzdrav's lowest normal daytime resting rate and the lower end of ESC's possibly physiological 40–50 at rest); the slider stays at 30–39 (30 is the model's lowest rate, `paramRanges.heartRate`, not a source number; 39 keeps every rate below 40). It does not claim to be abnormal at night: Minzdrav's night limit is 35 and ESC calls 30 in sleep physiological. The pause is an assumption too: the model adds 3000 ms of silence after every third beat, longer than Minzdrav's 2 s and ESC's 2.5 s; the interval from QRS to QRS across a pause is then 4.5 s at 39 bpm to 5 s at 30 bpm, below the 6 s pacing threshold, which the preset does not use. Real pauses come irregularly, and the escape beats MSD describes are not drawn: the summary says so. The pause does not change `checkParams`: it is added after the rhythm RR (`clock.ts`), so the preset fits every rate the default parameters fit.

## 14. WPW syndrome (manifest pre-excitation in sinus rhythm)

Added 2026-10-13 for [the ECG presets spec](2026-10-12-more-ecg-presets.md), section «Дополнение: синдром WPW и синдром Бругада». Sources are the `wpw-syndrome` article's own (`content/{ru,en}/disease/wpw-syndrome.mdx`). Checked on 2026-10-13 against texts opened with `curl` through the agent proxy: the Minzdrav guideline as JSON from `apicr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=619_3` (section «2.4. Инструментальные диагностические исследования»), the MSD page, and the ESC 2019 SVT Russian translation PDF (russjcardiol.elpub.ru/jour/article/viewFile/3864/2959, `pdftotext`, line-end hyphens joined).

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| ECG of WPW (Minzdrav) | PR < 120 ms, QRS > 120 ms, delta wave | «Большинство аномальных проводящих путей, являющихся причиной предвозбуждения желудочков, составляют ДАВС с быстрым проведением импульсов, формирующие синдром WPW, включающий [9]: укорочение интервала PR менее 120 мс; расширение комплекса QRS более 120 мс; регистрацию в начале зубца R так называемой дельта-волны; рецидивы НЖТ.» (the four items are a list in the source) | Минздрав 2025 «Наджелудочковые тахикардии» (cr.minzdrav.gov.ru/view-cr/619_3, DOI 10.15829/1560-4071-2025-6448), §2.4; source 1 of the article | curl JSON, yes |
| Definition (ESC) | pre-excitation with recurrent tachycardias | «Синдром Вольфа-Паркинсона-Уайта определяется наличием явного (манифестирующего) ДПП, что приводит к развитию так называемого предвозбуждения желудочков в сочетании с рецидивирующими тахикардиями [397].» | ESC 2019 SVT, Russian translation (Рос кардиол журн 2020;25(7):3864, DOI 10.15829/1560-4071-2020-3864), §11.3.2; source 2 of the article | curl PDF, yes |
| Resting ECG (ESC) | PR < 120 ms, delta wave, QRS > 120 ms | «ДПП характеризуется типичной картиной ЭКГ покоя: (1) короткий интервал PR (<120 мс), (2) восходящая (или нисходящая) зазубрина в начальной части комплекса QRS (дельта-волна) и (3) широкий комплекс QRS (>120 мс).» | ESC 2019 SVT, Russian translation, §11.3.2 | curl PDF, yes |
| Mechanism, ECG (MSD) | short PR, slurred start of a wide QRS, repolarization changes | "Classic (manifest) Wolff-Parkinson-White syndrome is due to an accessory atrioventricular connection that produces a prototypical ECG consisting of a short PR interval, a wide QRS complex with an initial slurred component (delta wave), and secondary repolarization changes in association with symptomatic reentrant (paroxysmal) supraventricular tachycardia."; "When the accessory AV connection conducts in the antegrade direction, the AV nodal delay is bypassed and a portion of ventricular myocardium is activated before the rest is activated by the normal conduction system. This ventricular pre-excitation produces a short PR interval (1)." | MSD Manuals Professional, Wolff-Parkinson-White Syndrome (WPW Syndrome) (2024), summary and «Pathophysiology»; source 3 of the article | curl, yes |
| Lead II, sinus rhythm (MSD) | — | "Leads I, II, III, V3 through V6 show classic features of WPW syndrome, with a short PR interval and a delta wave during sinus rhythm." | MSD, same page, figure «Classic Wolff-Parkinson-White (WPW) Pattern» | curl, yes |
| T wave (MSD) | direction not given | "Because the early depolarized parts of the ventricle also repolarize early, the T-wave vector may be abnormal." | MSD, same page, «Pathophysiology» | curl, yes |
| Article phrases | < 120, > 120, delta wave | «На ЭКГ это короткий интервал PR (меньше 120 мс), дельта-волна в начале комплекса QRS и широкий QRS (больше 120 мс).<Cite n={[1, 2]} />»; «Типичная ЭКГ покоя при манифестирующем ДПП: короткий интервал PR (менее 120 мс), дельта-волна в начальной части комплекса QRS и широкий QRS (более 120 мс).<Cite n={[1, 2]} />» | Article wpw-syndrome.mdx (ru lines 58–59, 115; en lines 58–59, 115) | Article |

Modelling note: the sources give thresholds only (PR < 120 ms, QRS > 120 ms) and no width of the delta wave. `prInterval: 90` is an assumption: the model scales PR with √RR up to RR 1500 ms, so PR is 110 ms at 40 bpm, about 80 ms at 75 and about 56 ms at 153, under 120 ms at every rate the preset allows. `qrsDuration: 130` (above 120 ms) and `deltaWave: 40` are assumptions; the rest of the complex then keeps the model's default QRS width of 90 ms. The delta wave moves the R peak later, so the preset fits 40–153 bpm (`timing.ts`), a model limit, not a source number. The preset keeps the default T wave: MSD names secondary repolarization changes but no direction or size, and the summary says they are not shown. The model's P wave fills 60% of PR (stage 2 assumption), so with a short PR the P wave is shorter too. No tachycardia, no pre-excited AF and no other lead are drawn.

## 15. Brugada syndrome (type 1 pattern, lead V1)

Added 2026-10-13 for [the ECG presets spec](2026-10-12-more-ecg-presets.md), section «Дополнение: синдром WPW и синдром Бругада». Sources are the `brugada-syndrome` article's own (`content/{ru,en}/disease/brugada-syndrome.mdx`). Checked on 2026-10-13 with `curl`: the Minzdrav guideline as JSON from `apicr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=569_2` (section «3.3.15 Синдром Бругада») and the MSD page (full review June 2026, last updated August 2026).

| Fact | Value | Verbatim quote | Source | Access / verified |
|---|---|---|---|---|
| Diagnostic criterion | type 1 ST elevation ≥ 2 mm in V1 and/or V2 | «Синдром Бругада диагностируется у пациентов с подъемом сегмента ST с морфологией 1-го типа ≥ 2 мм в одном или нескольких правых прекордиальных отведениях V1 и/или V2, расположенных во втором, третьем или четвертом межреберье, возникающих либо спонтанно, либо после провокационного лекарственного теста с в/в введением антиаритмического препарата, класс IA (такого как прокаинамид**), или при регистрации ЭКГ в верхних прекордиальных отведениях (межреберных промежутках на 1-2 ребра выше положений электродов в V1 и V2.» (the closing parenthesis is missing in the source) | Минздрав 2025 «Желудочковые нарушения ритма сердца. Внезапная сердечная смерть» (cr.minzdrav.gov.ru/view-cr/569_2, DOI 10.15829/1560-4071-2025-6670), §3.3.15; source 1 of the article | curl JSON, yes |
| Triggers (Minzdrav) | fever among them | «Психотропные средства (АТХ Н05), некоторые ААП, анестетики, кокаин, чрезмерное употребление алкоголя и лихорадка являются потенциальными триггерами появления бругада-подобного паттерна ЭКГ 1 типа и запуска ФЖ.» | Минздрав 2025, §3.3.15 | curl JSON, yes |
| Type 1 pattern (MSD) | J point and ST raised in V1–V2; coved ST into an inverted T | "The type 1 Brugada ECG pattern has prominent J-point and ST elevation in V1 and V2 (sometimes involving V3) that causes the QRS complex in these leads to resemble right bundle branch block. The ST segment is coved and descends to an inverted T-wave. These characteristics may be more evident in V1 and V2 leads recorded from the second or third intercostal spaces rather than the usual fourth intercostal space." | MSD Manuals Professional, Brugada Syndrome (2026), «Diagnosis»; source 2 of the article | curl, yes |
| Types 2 and 3 (MSD) | not diagnostic | "Lesser degrees of these patterns (type 2 and type 3 Brugada ECG patterns) are not considered diagnostic. The type 2 and type 3 patterns may change to a type 1 pattern spontaneously, with fever, or in response to medications." | MSD, same page, «Diagnosis» | curl, yes |
| Figure (MSD) | — | "Prominent J-point elevation to a coved ST segment, leading to an inverted T-wave in leads V1 and V2." | MSD, same page, figure «Type 1 Brugada ECG Pattern» | curl, yes |
| Article phrases | 2 mm, V1–V2, coved ST, negative T | «При ЭКГ-картине 1-го типа точка J и сегмент ST в V1 и V2 заметно приподняты, поэтому комплекс QRS похож на блокаду правой ножки пучка Гиса; сегмент ST выпуклый («куполом») и опускается в отрицательный зубец T.<Cite n={2} /> Российские рекомендации ставят диагноз при подъёме ST такой формы на 2 мм и больше хотя бы в одном из отведений V1–V2 — спонтанном или после провокационной лекарственной пробы.<Cite n={1} />» | Article brugada-syndrome.mdx (ru lines 45–48, 102; en lines 41, 93) | Article |

Modelling note: 2 mm is 0.2 mV at the standard 10 mm/mV (our arithmetic; the model's strip uses the same grid). `stShift: 0.3` is an assumption above that threshold; with the tail of the deep V1 S wave the trace is about 0.28 mV at the J point at every rate, and the test asks for at least 0.2 mV. `stSlope: 1` draws the coved segment falling into the T wave; `tAmplitude: −0.3` (the default T inverted) is an assumption, since no source gives a T amplitude. The preset is drawn in V1 only (`presetLeads`), on the V1 baseline from `leadBaselines` (an rS complex, amplitudes are assumptions of the rhythms spec), and the article compares it with normal in V1. The model draws the raised J point as the start of the ST segment, with no r′-like wave, and shows neither V2, V3, the high intercostal positions, type 2 or type 3 patterns, nor the provocation by fever or drugs; the summary says so.

---

## Not verifiable

- **AF**
  - f-wave **amplitude** (mV): no source gives one.
  - Atrial contribution to filling as a **%**: no source. ESC, AHA and StatPearls say only "loss of effective/ineffective atrial contraction".
  - Ventricular rate in AF and a rate-control target (e.g. <110/min): the ESC and AHA rate-control sections were past the truncation point.
  - StatPearls AF chapter (NBK526072): NCBI captcha. statpearls.com search is blocked by robots.txt.
  - Minzdrav AF text: elpub server error. The 350–700/min figure comes only via the article.
- **STEMI**: a hyperacute T-wave amplitude. ESC names hyperacute T waves without a number.
- **HFrEF**: LVEDP or filling-pressure values. The ESC 2026 EF categories were not opened.
- **Hypertension**:
  - The AHA/ACC 2025 stage 1 and stage 2 values: ahajournals returned an error.
  - The Minzdrav numeric grade 1–3 table: Appendix A3 was not in the visible text.
- **Aortic stenosis**:
  - Peak-to-peak and peak instantaneous gradients.
  - Any LV systolic pressure value.
  - ESC 2025 VHD §8: OUP page truncated before the AS section.
- **ASD**:
  - PR prolongation.
  - QRS width for incomplete RBBB (100–120 ms).
  - "rSR′" wording.
  - The size of S2 split in ms.
  - ESC 2020 ACHD §4.1: OUP page truncated.
- **First-degree AV block**: a PR limit in Минздрав 2025 «Брадиаритмии» (none in its text).
- **SVT**: a single typical heart rate (none in the article's sources inside the model's range).
- **Long QT syndrome**: a typical QTc value for the model (sources give thresholds only).
- **VT**: a single typical heart rate, QRS width and T-wave amplitude (sources give thresholds and directions only).
- **Atrial flutter**: an F-wave amplitude (no source gives one).
- **Sick sinus syndrome**: a typical heart rate, pause length or pause frequency (sources give normal limits only; real pauses are irregular).
- **WPW syndrome**: a PR interval, QRS width or delta-wave width for the model (sources give thresholds only, and no delta-wave width), and the direction of the secondary ST–T changes.
- **Brugada syndrome**: the height of the ST elevation above the 2 mm threshold and the T-wave amplitude (sources give a threshold and a direction only).
- **General**: the conversion of mm to mV and of /min to Hz is our arithmetic on sourced numbers.
