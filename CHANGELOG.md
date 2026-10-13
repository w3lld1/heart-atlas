# Changelog

All notable changes to Heart Atlas are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [0.6.0] - 2026-10-13

Twenty new disease articles, heart clock presets for AV block, pacemakers and premature beats, and quizzes in fifteen more articles.

### Articles

- New disease articles in Russian and English, each with a diagram: cardiac myxoma, constrictive pericarditis, atrioventricular septal defect and bicuspid aortic valve ([#226](https://github.com/w3lld1/heart-atlas/pull/226)), cardiac sarcoidosis ([#233](https://github.com/w3lld1/heart-atlas/pull/233)), Takayasu arteritis ([#237](https://github.com/w3lld1/heart-atlas/pull/237)), varicose veins ([#245](https://github.com/w3lld1/heart-atlas/pull/245)), mitral valve prolapse, extrasystole, rheumatic heart disease and takotsubo syndrome ([#247](https://github.com/w3lld1/heart-atlas/pull/247)), thoracic aortic aneurysm ([#249](https://github.com/w3lld1/heart-atlas/pull/249)), truncus arteriosus ([#259](https://github.com/w3lld1/heart-atlas/pull/259)), total anomalous pulmonary venous return ([#262](https://github.com/w3lld1/heart-atlas/pull/262)), congenitally corrected transposition ([#271](https://github.com/w3lld1/heart-atlas/pull/271)), Kawasaki disease, familial hypercholesterolemia, vasovagal syncope and Fabry disease ([#273](https://github.com/w3lld1/heart-atlas/pull/273)) and myocardial infarction ([#275](https://github.com/w3lld1/heart-atlas/pull/275)). The site now has sixty-five disease articles.
- Structure names are buttons that highlight that structure on the 3D model or the beating heart clock model in thirteen more articles ([#230](https://github.com/w3lld1/heart-atlas/pull/230), [#234](https://github.com/w3lld1/heart-atlas/pull/234)), and fifteen of the twenty new articles show the 3D model with their structures highlighted ([#242](https://github.com/w3lld1/heart-atlas/pull/242) and the article PRs).
- The AV block article shows complete block with the pacemaker after treatment, and Mobitz I and Mobitz II ([#254](https://github.com/w3lld1/heart-atlas/pull/254), [#276](https://github.com/w3lld1/heart-atlas/pull/276)); first-degree block stays on the heart clock page. The extrasystole article shows ventricular and atrial premature beats ([#285](https://github.com/w3lld1/heart-atlas/pull/285)), and the myocardial infarction article opens the heart clock on the ST-elevation preset ([#275](https://github.com/w3lld1/heart-atlas/pull/275)).
- For article authors: an article can offer several heart clock presets (`morePresets`), hide the Wiggers diagram (`wiggers: false`) and leave out the states after treatment (`afterTreatment: false`) ([#270](https://github.com/w3lld1/heart-atlas/pull/270), [#278](https://github.com/w3lld1/heart-atlas/pull/278), [#287](https://github.com/w3lld1/heart-atlas/pull/287)). Articles written in parallel no longer conflict in shared files ([#241](https://github.com/w3lld1/heart-atlas/pull/241), [#256](https://github.com/w3lld1/heart-atlas/pull/256)).

### Heart clock

- Pacemakers after treatment: sick sinus syndrome with atrial pacing ([#231](https://github.com/w3lld1/heart-atlas/pull/231), [#232](https://github.com/w3lld1/heart-atlas/pull/232)) and complete AV block with P waves on their own clock, a slow escape rhythm and a dual-chamber pacemaker ([#238](https://github.com/w3lld1/heart-atlas/pull/238), [#246](https://github.com/w3lld1/heart-atlas/pull/246)). Pacemaker spikes are drawn on the ECG and in the Wiggers diagram.
- Second-degree AV block: Mobitz I, where the PR interval grows until a P wave is not conducted, and Mobitz II, where a P wave is dropped with the same PR before and after ([#257](https://github.com/w3lld1/heart-atlas/pull/257), [#261](https://github.com/w3lld1/heart-atlas/pull/261)).
- Atrial and ventricular premature beats: every fourth beat comes early, the ventricular one with a wide QRS and a full compensatory pause, the atrial one with a P wave and a shorter pause ([#266](https://github.com/w3lld1/heart-atlas/pull/266), [#274](https://github.com/w3lld1/heart-atlas/pull/274), [#281](https://github.com/w3lld1/heart-atlas/pull/281)).

### Learning

- Quizzes in fifteen new disease articles, 70 articles in all ([#239](https://github.com/w3lld1/heart-atlas/pull/239), [#242](https://github.com/w3lld1/heart-atlas/pull/242), [#248](https://github.com/w3lld1/heart-atlas/pull/248), [#253](https://github.com/w3lld1/heart-atlas/pull/253), [#258](https://github.com/w3lld1/heart-atlas/pull/258), [#260](https://github.com/w3lld1/heart-atlas/pull/260), [#265](https://github.com/w3lld1/heart-atlas/pull/265), [#272](https://github.com/w3lld1/heart-atlas/pull/272), [#279](https://github.com/w3lld1/heart-atlas/pull/279)).

## [0.5.0] - 2026-10-13

Eight new disease articles, four heart clock presets that use the new rhythms, and clickable structure names in nineteen more articles.

### Articles

- New disease articles in Russian and English, each with a diagram: Marfan syndrome, cardiac tamponade, pulmonary valve stenosis and Eisenmenger syndrome ([#215](https://github.com/w3lld1/heart-atlas/pull/215)), peripartum cardiomyopathy ([#214](https://github.com/w3lld1/heart-atlas/pull/214)), deep vein thrombosis ([#217](https://github.com/w3lld1/heart-atlas/pull/217)), peripheral artery disease of the legs ([#222](https://github.com/w3lld1/heart-atlas/pull/222)) and hypoplastic left heart syndrome ([#224](https://github.com/w3lld1/heart-atlas/pull/224)). The site now has forty-five disease articles.
- In seventeen disease articles and two anatomy articles, the names of valves, chambers, septa, great vessels and the conduction system are buttons that highlight that structure on the article's 3D model ([#213](https://github.com/w3lld1/heart-atlas/pull/213)).
- Marfan syndrome, pulmonary valve stenosis, Eisenmenger syndrome, peripartum cardiomyopathy and hypoplastic left heart syndrome show the 3D model with the structures they name highlighted ([#214](https://github.com/w3lld1/heart-atlas/pull/214), [#215](https://github.com/w3lld1/heart-atlas/pull/215), [#223](https://github.com/w3lld1/heart-atlas/pull/223), [#224](https://github.com/w3lld1/heart-atlas/pull/224)). Peripartum cardiomyopathy also opens the heart clock on the heart failure preset ([#214](https://github.com/w3lld1/heart-atlas/pull/214)).

### Heart clock

- Atrial flutter: downward sawtooth F waves with 2:1 conduction. Sick sinus syndrome: sinus bradycardia at 35 per minute with a 3-second pause after every third beat ([#216](https://github.com/w3lld1/heart-atlas/pull/216)).
- WPW syndrome: a short PR interval, a delta wave and a wide QRS. Brugada syndrome: lead V1 with a type 1 coved ST elevation, and the normal comparison is drawn in V1 too ([#219](https://github.com/w3lld1/heart-atlas/pull/219)).
- All four presets open in their articles and can be chosen on the heart clock page and in the embed builder.

### Learning

- Quizzes in seven new disease articles: peripartum cardiomyopathy, Marfan syndrome, cardiac tamponade, pulmonary valve stenosis, Eisenmenger syndrome, deep vein thrombosis and peripheral artery disease, 54 in all ([#218](https://github.com/w3lld1/heart-atlas/pull/218), [#223](https://github.com/w3lld1/heart-atlas/pull/223)).

## [0.4.0] - 2026-10-13

Twelve new disease articles, an "After treatment" state in the congenital defect diagrams, two patient 3D models, new ECG presets and quizzes in 47 articles. Under the hood, the heart clock can now model slow rhythms, sinus pauses, pre-excitation, lead V1 and atrial flutter for upcoming presets.

### Articles

- New disease articles in Russian and English, each with a normal/disease diagram: WPW syndrome, Brugada syndrome, pulmonary hypertension and tricuspid regurgitation ([#171](https://github.com/w3lld1/heart-atlas/pull/171)), Ebstein anomaly, restrictive cardiomyopathy, arrhythmogenic right ventricular cardiomyopathy and transposition of the great arteries ([#186](https://github.com/w3lld1/heart-atlas/pull/186)), sick sinus syndrome ([#169](https://github.com/w3lld1/heart-atlas/pull/169)), abdominal aortic aneurysm ([#189](https://github.com/w3lld1/heart-atlas/pull/189)), atrial flutter ([#195](https://github.com/w3lld1/heart-atlas/pull/195)) and cardiac amyloidosis ([#200](https://github.com/w3lld1/heart-atlas/pull/200)). The site now has thirty-seven disease articles.
- Disease diagrams can show a third state, "After treatment", with a caption that says what treatment changes and that the doctor chooses the method ([#181](https://github.com/w3lld1/heart-atlas/pull/181), [#182](https://github.com/w3lld1/heart-atlas/pull/182)). Ventricular septal defect, atrial septal defect, tetralogy of Fallot, patent ductus arteriosus and coarctation of the aorta have it ([#207](https://github.com/w3lld1/heart-atlas/pull/207), [#191](https://github.com/w3lld1/heart-atlas/pull/191), [#196](https://github.com/w3lld1/heart-atlas/pull/196), [#199](https://github.com/w3lld1/heart-atlas/pull/199), [#202](https://github.com/w3lld1/heart-atlas/pull/202)). The author guide explains how to add it ([#183](https://github.com/w3lld1/heart-atlas/pull/183)).

### 3D anatomy

- Patient models from the NIH 3D Heart Library: the tetralogy of Fallot article shows one patient's heart from MRI, cut open with a see-through muscle layer ([#141](https://github.com/w3lld1/heart-atlas/pull/141)), and the transposition of the great arteries article shows one child's heart before surgery, with a switch that makes the systemic circulation see-through ([#185](https://github.com/w3lld1/heart-atlas/pull/185), [#188](https://github.com/w3lld1/heart-atlas/pull/188)).
- More disease articles show the base 3D model with the structures they name highlighted: coarctation of the aorta, patent ductus arteriosus, ventricular tachycardia, pulmonary hypertension, tricuspid regurgitation, WPW, Brugada, restrictive cardiomyopathy, Ebstein anomaly, ARVC, sick sinus syndrome, atrial flutter and cardiac amyloidosis ([#167](https://github.com/w3lld1/heart-atlas/pull/167), [#171](https://github.com/w3lld1/heart-atlas/pull/171), [#180](https://github.com/w3lld1/heart-atlas/pull/180), [#187](https://github.com/w3lld1/heart-atlas/pull/187), [#186](https://github.com/w3lld1/heart-atlas/pull/186), [#169](https://github.com/w3lld1/heart-atlas/pull/169), [#195](https://github.com/w3lld1/heart-atlas/pull/195), [#200](https://github.com/w3lld1/heart-atlas/pull/200)).

### Heart clock

- ECG presets for long QT syndrome and monomorphic ventricular tachycardia, in their articles, on the heart clock page and in embeds ([#174](https://github.com/w3lld1/heart-atlas/pull/174)).
- For preset authors: a preset can now go down to 30 beats per minute and add sinus pauses: the ECG stays flat, the Wiggers chart stretches diastole and the phase reads "Sinus pause". The default range stays 40–180, and every existing curve is unchanged ([#204](https://github.com/w3lld1/heart-atlas/pull/204)).
- For preset authors: a preset can add a delta wave with a short PR interval, show lead V1 with its own QRS and a coved ST segment, and draw atrial flutter: sawtooth F waves with fixed 2:1 to 4:1 conduction. The preset guide lists all rhythm and shape parameters ([#208](https://github.com/w3lld1/heart-atlas/pull/208)).

### Learning

- Quizzes in eighteen more disease articles, 47 in all ([#167](https://github.com/w3lld1/heart-atlas/pull/167), [#180](https://github.com/w3lld1/heart-atlas/pull/180), [#187](https://github.com/w3lld1/heart-atlas/pull/187), [#194](https://github.com/w3lld1/heart-atlas/pull/194), [#198](https://github.com/w3lld1/heart-atlas/pull/198), [#201](https://github.com/w3lld1/heart-atlas/pull/201), [#203](https://github.com/w3lld1/heart-atlas/pull/203)).

### Fixed

- In a right-to-left page showing an article in its fallback language, the diagram switch follows the page direction, so the arrow keys move the right way ([#182](https://github.com/w3lld1/heart-atlas/pull/182)).

## [0.3.0] - 2026-10-12

Eleven new disease articles, quizzes at the end of 29 articles and the first learning tracks. The 3D heart moves into the articles, every page gets the new header and footer, and the animation setting now reaches the whole site.

### Articles

- New disease articles in Russian and English, each with a normal/disease diagram: tetralogy of Fallot, atrioventricular block and supraventricular tachycardia ([#142](https://github.com/w3lld1/heart-atlas/pull/142)), aortic dissection ([#146](https://github.com/w3lld1/heart-atlas/pull/146)), dyslipidaemia ([#153](https://github.com/w3lld1/heart-atlas/pull/153)), coarctation of the aorta, patent ductus arteriosus, ventricular tachycardia and long QT syndrome ([#157](https://github.com/w3lld1/heart-atlas/pull/157)), aortic regurgitation, which also shows the 3D model with the aortic valve highlighted ([#161](https://github.com/w3lld1/heart-atlas/pull/161)), and mitral stenosis ([#163](https://github.com/w3lld1/heart-atlas/pull/163)). The site now has twenty-five disease articles.

### Design

- A new header on every page: the heart mark, the site name and a short tagline, search, the animation switch and languages, and a section menu that marks the current section. The footer keeps the medical disclaimer and adds section and project links and the content license ([#139](https://github.com/w3lld1/heart-atlas/pull/139)).
- The home page moves: the ECG in the column runs, the cards float with their lines, blood runs along the vessels and the section pictures move. In the full and calm modes the poster heart beats lightly until the live model replaces it. With animation off nothing moves: the 3D viewer drops its inertia, the heart clock does not start by itself and pauses when animation is turned off, and article diagrams stand still ([#125](https://github.com/w3lld1/heart-atlas/pull/125)).

### 3D anatomy

- Eight disease articles show the 3D model with the signs of the disease (it loads on click); in articles with a heart clock preset the model beats with the monitor. On the heart clock page the model follows the chosen preset ([#119](https://github.com/w3lld1/heart-atlas/pull/119)).
- All six anatomy articles show the 3D heart with the structures they describe already highlighted; in "Cardiac cycle" it beats with the article's ECG ([#133](https://github.com/w3lld1/heart-atlas/pull/133)).
- The articles on ventricular septal defect, mitral regurgitation, pulmonary embolism and infective endocarditis show the 3D heart with the place their text names highlighted. Myocarditis and pericarditis have no model yet, because the model has no pericardium ([#136](https://github.com/w3lld1/heart-atlas/pull/136)).
- In three anatomy articles the names of valves, chambers and coronary vessels are buttons: pressing one scrolls to the model and highlights that structure ([#143](https://github.com/w3lld1/heart-atlas/pull/143)).
- AV block, supraventricular tachycardia and aortic dissection show the 3D model with the structures they name highlighted; in AV block and SVT the conduction structures in the diagram captions are buttons that show them on the model ([#155](https://github.com/w3lld1/heart-atlas/pull/155)).
- The home page credits the source of the 3D model, and the Japanese credit line is marked as Japanese for screen readers here, in the viewer and in embeds ([#140](https://github.com/w3lld1/heart-atlas/pull/140)).

### Learning

- Quizzes: an article can end with a "Check yourself" block of questions with answers explained by the article's own sources, scored for the reader's level and remembered in the browser ([#137](https://github.com/w3lld1/heart-atlas/pull/137)). 29 articles in Russian and English have one: six anatomy, four diagnostic and nineteen disease articles ([#150](https://github.com/w3lld1/heart-atlas/pull/150), [#155](https://github.com/w3lld1/heart-atlas/pull/155)).
- Learning tracks: the new "Tracks" menu item lists articles to read in order. The first three are "How the heart works", "ECG and heart tests" and "Heart conditions for patients" ([#147](https://github.com/w3lld1/heart-atlas/pull/147)).
- Track progress: each step of a track can be marked as read, a passed quiz shows on the track, and a link leads to the next unread article. An article opened from a track ends with its step in the track and links to the previous and next steps. Marks are kept only in the reader's browser ([#162](https://github.com/w3lld1/heart-atlas/pull/162)).

### Fixed

- CI now checks every internal link on the built site, and the weekly link check no longer reports working article links as broken ([#129](https://github.com/w3lld1/heart-atlas/pull/129)).
- No page scrolls sideways on a 320 px screen any more: long words in headings break, and the embed builder fits ([#154](https://github.com/w3lld1/heart-atlas/pull/154)).

## [0.2.0] - 2026-10-12

A new home page with the live 3D heart, a site-wide animation setting, and four more disease articles.

### Home page and design

- A new palette with Manrope and Onest fonts, and an Animation switch in the header (Auto, Full, Calm, Off). Auto picks the level from reduced motion, data saving and the device's memory, cores and screen; the choice is kept across pages ([#105](https://github.com/w3lld1/heart-atlas/pull/105)).
- A new home page: a hero with the heart on a body silhouette, six cards linked by lines to the structures they describe, an ECG strip and sections. The page loads no 3D code on its first screen ([#107](https://github.com/w3lld1/heart-atlas/pull/107)).
- At full animation the poster turns into the live 3D heart: it beats, turns with the mouse, a swipe or the arrow keys, and hovering or focusing a card lights its structures on the model. With calm or no animation a "Rotate in 3D" button loads a still model, and without WebGL it stays a poster ([#113](https://github.com/w3lld1/heart-atlas/pull/113)).

### 3D anatomy

- Groundwork for showing disease signs on the 3D model: the viewer can draw an inferior infarct zone that contracts less, a tinted left ventricle in hypertension and hypertrophic cardiomyopathy (with a darker septal zone in the latter), an enlarged left ventricle in dilated cardiomyopathy, a narrowed aortic valve opening in aortic stenosis and a marker on the interatrial septum in atrial septal defect. Numbers that no source gives are marked as model assumptions. No page shows them yet ([#103](https://github.com/w3lld1/heart-atlas/pull/103)).
- The 3D viewer poster is a 33 KB WebP instead of a 120 KB PNG, so the anatomy, heart clock and 3D embed pages load faster ([#112](https://github.com/w3lld1/heart-atlas/pull/112)).

### Articles

- Four more disease articles in Russian and English, each with an animated "normal / disease" diagram: mitral regurgitation and ventricular septal defect ([#112](https://github.com/w3lld1/heart-atlas/pull/112)), pulmonary embolism and myocarditis ([#116](https://github.com/w3lld1/heart-atlas/pull/116)). The pulmonary embolism article has a section on when to call an ambulance. There are now fourteen disease articles.

### Fixed

- The heart clock no longer fails when its time jumps past the kept history in one step ([#93](https://github.com/w3lld1/heart-atlas/pull/93)).

## [0.1.0] - 2026-10-11

The first public version: a working site in Russian and English with the 3D heart, the heart clock, disease articles, search, offline mode and embedding.

### 3D anatomy

- A model of the normal adult heart built from BodyParts3D: chambers, septa, valves, papillary muscles, great vessels, coronary arteries and cardiac veins, and a schematic conduction system, with structure ids, a license register and a workflow that rebuilds the model from the pinned BodyParts3D archive ([#39](https://github.com/w3lld1/heart-atlas/pull/39)).
- Compressed models in two levels of detail with size and triangle budgets checked in CI ([#44](https://github.com/w3lld1/heart-atlas/pull/44)).
- The anatomy page with a 3D viewer: rotate, zoom, select and highlight structures with the mouse or keyboard; a poster with a text alternative is shown until the model loads ([#56](https://github.com/w3lld1/heart-atlas/pull/56)).
- The model beats: a heartbeat deformation driven by the cardiac cycle ([#81](https://github.com/w3lld1/heart-atlas/pull/81)), synchronised with the heart clock on its page ([#82](https://github.com/w3lld1/heart-atlas/pull/82)). On the anatomy page a button and a heart rate control start the heartbeat; nothing moves on its own ([#89](https://github.com/w3lld1/heart-atlas/pull/89)).

### Heart clock

- One cardiac-cycle timer drives a synthetic ECG, heart sounds and a Wiggers diagram of left-heart pressures and volume, with text descriptions that follow the rhythm ([#33](https://github.com/w3lld1/heart-atlas/pull/33), [#40](https://github.com/w3lld1/heart-atlas/pull/40), [#41](https://github.com/w3lld1/heart-atlas/pull/41), [#46](https://github.com/w3lld1/heart-atlas/pull/46)).
- Disease presets: atrial fibrillation, ST-elevation myocardial infarction, heart failure with reduced ejection fraction, hypertension, aortic stenosis and atrial septal defect. Every number comes from a cited source or is marked as a model assumption, and a "normal / disease" switch ([#59](https://github.com/w3lld1/heart-atlas/pull/59), [#65](https://github.com/w3lld1/heart-atlas/pull/65)).
- Animation does not start on its own with reduced motion, and sound never starts on its own.

### Articles

- Article schema with two levels of text (for patients and for students), numbered citations to verified sources, a "not reviewed by a physician" notice and a translation notice ([#17](https://github.com/w3lld1/heart-atlas/pull/17), [#27](https://github.com/w3lld1/heart-atlas/pull/27)).
- Ten disease articles in Russian and English, most with the heart clock preset of that disease, including hypertrophic and dilated cardiomyopathy, pericarditis and infective endocarditis ([#94](https://github.com/w3lld1/heart-atlas/pull/94), [#96](https://github.com/w3lld1/heart-atlas/pull/96), [#38](https://github.com/w3lld1/heart-atlas/pull/38), [#48](https://github.com/w3lld1/heart-atlas/pull/48), [#50](https://github.com/w3lld1/heart-atlas/pull/50), [#68](https://github.com/w3lld1/heart-atlas/pull/68), [#77](https://github.com/w3lld1/heart-atlas/pull/77)).
- Six anatomy articles (structure of the heart, chambers, valves, conduction system, coronary circulation, cardiac cycle) and four diagnostic ones (ECG, echocardiography, Holter monitoring, natriuretic peptides) in Russian and English, with interactive diagrams or the live ECG monitor (`<EcgMonitor>`); the anatomy page lists its articles ([#83](https://github.com/w3lld1/heart-atlas/pull/83)).
- Animated diagrams in articles: "normal / disease" and other state pairs such as diastole / systole ([#66](https://github.com/w3lld1/heart-atlas/pull/66), [#79](https://github.com/w3lld1/heart-atlas/pull/79)).

### Search, offline and embedding

- Full-text search across the site with Pagefind, including other names and abbreviations of each disease (`aliases`) ([#36](https://github.com/w3lld1/heart-atlas/pull/36), [#64](https://github.com/w3lld1/heart-atlas/pull/64)).
- The site installs as an app: per-locale manifests, a service worker, an offline page and an update notice ([#45](https://github.com/w3lld1/heart-atlas/pull/45)).
- Embedding with `<iframe>`: the ECG (with `?preset=` and `?rate=`), the 3D model (with `?structure=`) and any article, plus a builder page that gives the code ([#60](https://github.com/w3lld1/heart-atlas/pull/60), [#72](https://github.com/w3lld1/heart-atlas/pull/72), [#85](https://github.com/w3lld1/heart-atlas/pull/85), [#83](https://github.com/w3lld1/heart-atlas/pull/83)).

### Languages and accessibility

- A locale registry: a language is added with one registry entry and a strings file; right-to-left scripts are supported and tested with a pseudo-locale ([#15](https://github.com/w3lld1/heart-atlas/pull/15), [#28](https://github.com/w3lld1/heart-atlas/pull/28)).
- axe checks in end-to-end tests, Lighthouse CI on every page template (each category at least 90, LCP at most 2.5 s, CLS at most 0.1), a 100 KB gzip JavaScript budget for article pages and a manual accessibility checklist ([#75](https://github.com/w3lld1/heart-atlas/pull/75)).

### Project

- Astro and React monorepo with TypeScript strict, ESLint, Prettier, stylelint, Vitest and Playwright; CI and deploy to GitHub Pages ([#6](https://github.com/w3lld1/heart-atlas/pull/6), [#14](https://github.com/w3lld1/heart-atlas/pull/14)).
- Contributor guides: architecture, adding an article, a language, a model and a disease preset.

[0.5.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.5.0
[0.4.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.4.0
[0.3.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.3.0
[0.2.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.2.0
[0.1.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.1.0
