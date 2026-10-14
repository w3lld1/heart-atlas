# Changelog

All notable changes to Heart Atlas are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [0.9.0] - 2026-10-14

Sixteen new disease articles, ventricular fibrillation and short QT syndrome on the heart clock, and lighter article pages.

### Articles

- New disease articles in Russian and English, each with a diagram: short QT syndrome, acute rheumatic fever, subclavian artery stenosis and primary aldosteronism ([#398](https://github.com/w3lld1/heart-atlas/pull/398)), Loeys–Dietz syndrome ([#400](https://github.com/w3lld1/heart-atlas/pull/400)), giant cell arteritis ([#405](https://github.com/w3lld1/heart-atlas/pull/405)), tricuspid stenosis, pheochromocytoma, angina without obstructive coronary arteries and thyrotoxic heart disease ([#412](https://github.com/w3lld1/heart-atlas/pull/412)), popliteal artery aneurysm ([#415](https://github.com/w3lld1/heart-atlas/pull/415)), vascular rings ([#419](https://github.com/w3lld1/heart-atlas/pull/419)), fibromuscular dysplasia ([#421](https://github.com/w3lld1/heart-atlas/pull/421)), thromboangiitis obliterans ([#430](https://github.com/w3lld1/heart-atlas/pull/430)), Raynaud phenomenon ([#432](https://github.com/w3lld1/heart-atlas/pull/432)) and aortic intramural hematoma ([#434](https://github.com/w3lld1/heart-atlas/pull/434)). The site now has one hundred and sixteen disease articles.
- The short QT syndrome and ventricular fibrillation articles show their states on the heart clock ([#416](https://github.com/w3lld1/heart-atlas/pull/416), [#428](https://github.com/w3lld1/heart-atlas/pull/428)), and the AV block article adds first-degree block ([#431](https://github.com/w3lld1/heart-atlas/pull/431)).
- Older articles link to the new acute rheumatic fever, giant cell arteritis and aortic intramural hematoma articles ([#398](https://github.com/w3lld1/heart-atlas/pull/398), [#405](https://github.com/w3lld1/heart-atlas/pull/405), [#434](https://github.com/w3lld1/heart-atlas/pull/434)).

### Heart clock

- New preset: short QT syndrome, with a QTc of 320 ms at every heart rate ([#409](https://github.com/w3lld1/heart-atlas/pull/409)).
- New preset: ventricular fibrillation ([#418](https://github.com/w3lld1/heart-atlas/pull/418), [#424](https://github.com/w3lld1/heart-atlas/pull/424)). The strips show irregular oscillations from 300 per minute with no P waves, QRS complexes or T waves. The monitor shows "No pulse" in place of the heart rate slider and "No heart sounds" next to the sound button. The Wiggers diagram gives way to a line saying the heart pumps no blood. On the heart clock page, a note under the 3D model says why the model stays still. The embed builder hides the heart rate field for this preset, and embeds ignore a rate in the address.

### Site

- Article pages load less code up front. The heart sound players load on the first click ([#413](https://github.com/w3lld1/heart-atlas/pull/413)), and the Wiggers diagram's drawing code loads when the diagram comes near view ([#429](https://github.com/w3lld1/heart-atlas/pull/429)).
- Spec for ventricular fibrillation in the heart clock ([#404](https://github.com/w3lld1/heart-atlas/pull/404)).

### Learning

- Quizzes in seventeen more articles, 126 in all ([#402](https://github.com/w3lld1/heart-atlas/pull/402), [#410](https://github.com/w3lld1/heart-atlas/pull/410), [#414](https://github.com/w3lld1/heart-atlas/pull/414), [#420](https://github.com/w3lld1/heart-atlas/pull/420), [#422](https://github.com/w3lld1/heart-atlas/pull/422), [#427](https://github.com/w3lld1/heart-atlas/pull/427), [#433](https://github.com/w3lld1/heart-atlas/pull/433), [#435](https://github.com/w3lld1/heart-atlas/pull/435), [#437](https://github.com/w3lld1/heart-atlas/pull/437), [#438](https://github.com/w3lld1/heart-atlas/pull/438)).

## [0.8.0] - 2026-10-14

Twenty-four new disease articles, five new heart clock presets including bundle branch blocks and bidirectional ventricular tachycardia, nine more disease shapes on the 3D model, a page for physicians and a shorter header on phones.

### Articles

- New disease articles in Russian and English, each with a diagram: spontaneous coronary artery dissection, bundle branch block, Chagas cardiomyopathy and postural orthostatic tachycardia syndrome ([#341](https://github.com/w3lld1/heart-atlas/pull/341)), coronary artery anomalies ([#348](https://github.com/w3lld1/heart-atlas/pull/348)), hypertensive crisis, orthostatic hypotension, carotid artery stenosis and pericardial effusion ([#360](https://github.com/w3lld1/heart-atlas/pull/360)), congenital supravalvular aortic stenosis ([#361](https://github.com/w3lld1/heart-atlas/pull/361)), cor triatriatum ([#366](https://github.com/w3lld1/heart-atlas/pull/366)), congenital subaortic stenosis ([#373](https://github.com/w3lld1/heart-atlas/pull/373)), cardiogenic shock, patent foramen ovale, renal artery stenosis and inappropriate sinus tachycardia ([#377](https://github.com/w3lld1/heart-atlas/pull/377)), double-chambered right ventricle ([#382](https://github.com/w3lld1/heart-atlas/pull/382)), pulmonary regurgitation, cardiotoxicity of cancer treatment, hypertension in pregnancy and pre-eclampsia and mesenteric ischaemia ([#384](https://github.com/w3lld1/heart-atlas/pull/384)), pulmonary atresia with intact ventricular septum ([#386](https://github.com/w3lld1/heart-atlas/pull/386)), double outlet right ventricle ([#391](https://github.com/w3lld1/heart-atlas/pull/391)) and vascular Ehlers–Danlos syndrome ([#399](https://github.com/w3lld1/heart-atlas/pull/399)). The site now has one hundred disease articles.
- The bundle branch block and Chagas cardiomyopathy articles show their blocks on the heart clock ([#362](https://github.com/w3lld1/heart-atlas/pull/362), [#375](https://github.com/w3lld1/heart-atlas/pull/375)), with a neutral summary for the fascicular block ([#372](https://github.com/w3lld1/heart-atlas/pull/372)), the inappropriate sinus tachycardia and POTS articles show sinus tachycardia ([#385](https://github.com/w3lld1/heart-atlas/pull/385)), and the catecholaminergic polymorphic ventricular tachycardia article shows bidirectional ventricular tachycardia ([#392](https://github.com/w3lld1/heart-atlas/pull/392)).
- Older articles link to the new pulmonary regurgitation and hypertension in pregnancy articles ([#395](https://github.com/w3lld1/heart-atlas/pull/395)).

### Heart clock

- New presets: right and left bundle branch block and left anterior fascicular block ([#359](https://github.com/w3lld1/heart-atlas/pull/359), on the waveform work in [#356](https://github.com/w3lld1/heart-atlas/pull/356)), sinus tachycardia ([#380](https://github.com/w3lld1/heart-atlas/pull/380)) and bidirectional ventricular tachycardia, where the QRS complexes point up and down in turn ([#388](https://github.com/w3lld1/heart-atlas/pull/388)). Their numbers come from cited sources or are marked as model assumptions.
- The heart clock page and the ECG embed list the states in one list with four groups (rhythm disorders, conduction blocks, heart and blood vessels, after treatment); the play, sound and speed controls are easier to use on a phone ([#363](https://github.com/w3lld1/heart-atlas/pull/363)).

### 3D model

- Nine more diseases change the shape of the model: chambers grow, a narrowed valve opens only partly and a leaking valve keeps a gap when shut in mitral stenosis and regurgitation, aortic and tricuspid regurgitation, pulmonary valve stenosis, pulmonary hypertension, ventricular septal defect and restrictive cardiomyopathy ([#345](https://github.com/w3lld1/heart-atlas/pull/345)); a thoracic aortic aneurysm widens the ascending aorta ([#358](https://github.com/w3lld1/heart-atlas/pull/358)). The interrupted aortic arch article names the aortic arch on the model ([#350](https://github.com/w3lld1/heart-atlas/pull/350)).
- The viewer's switches, list, slider and heartbeat button take the site style, and on a wide screen the model stays in view beside the structure list ([#349](https://github.com/w3lld1/heart-atlas/pull/349)).

### Heart sounds

- "Heart sounds" is in the site menu, on the home page and in search ([#365](https://github.com/w3lld1/heart-atlas/pull/365)). In the valve articles the player is a framed "Listen to the heart" block, and its labels keep a readable size on any screen ([#347](https://github.com/w3lld1/heart-atlas/pull/347)).

### Learning

- Quizzes in twenty-five more articles, 109 in all ([#346](https://github.com/w3lld1/heart-atlas/pull/346), [#350](https://github.com/w3lld1/heart-atlas/pull/350), [#357](https://github.com/w3lld1/heart-atlas/pull/357), [#368](https://github.com/w3lld1/heart-atlas/pull/368), [#375](https://github.com/w3lld1/heart-atlas/pull/375), [#378](https://github.com/w3lld1/heart-atlas/pull/378), [#381](https://github.com/w3lld1/heart-atlas/pull/381), [#390](https://github.com/w3lld1/heart-atlas/pull/390), [#392](https://github.com/w3lld1/heart-atlas/pull/392), [#394](https://github.com/w3lld1/heart-atlas/pull/394), [#396](https://github.com/w3lld1/heart-atlas/pull/396)).

### Site

- A "For physicians" page, linked from the footer, lists ways for a physician to help, with an issue form, an author template and a review guide ([#367](https://github.com/w3lld1/heart-atlas/pull/367)).
- On a phone the header is about half as tall: search, the motion switch and the languages open from one button; the search field has a hint, and the menu shows that it scrolls ([#374](https://github.com/w3lld1/heart-atlas/pull/374)).
- Specs for the next work: stage 16, 17 and 18 articles ([#355](https://github.com/w3lld1/heart-atlas/pull/355), [#370](https://github.com/w3lld1/heart-atlas/pull/370), [#384](https://github.com/w3lld1/heart-atlas/pull/384)) and bundle branch block presets ([#352](https://github.com/w3lld1/heart-atlas/pull/352)).

## [0.7.0] - 2026-10-14

The heart clock ECG in leads I, II and III at once, a player of heart sounds and valve murmurs, disease shapes to pick on the 3D model, a disease catalogue with groups and a filter, ten new disease articles and a page for addresses that do not exist.

### Heart clock

- The ECG shows the standard limb leads I, II and III at once, three strips with a shared time ([#297](https://github.com/w3lld1/heart-atlas/pull/297), [#301](https://github.com/w3lld1/heart-atlas/pull/301), [#305](https://github.com/w3lld1/heart-atlas/pull/305), [#323](https://github.com/w3lld1/heart-atlas/pull/323)). Each wave has its own direction in the frontal plane, so the leads differ the way they do in a real ECG: in ST-elevation infarction of the inferior wall the ST segment rises in II and III and falls in I, flutter waves are clear in II and III and small in I, the atrial septal defect preset shows right axis deviation, and in ventricular tachycardia and ventricular premature beats the QRS is small in I. Lead II looks exactly as before, and I + III = II at every moment (Einthoven's law). Directions come from cited sources or are marked as model assumptions. The Brugada syndrome preset stays a single V1 strip.
- The embedded ECG shows the same three strips, and the embed builder gives taller snippets for the ECG and for articles with the heart clock monitor. Snippets already pasted on other sites keep their old height; take a new one from the builder to fit all three strips.

### Heart sounds

- A new page plays heart sounds and valve murmurs in time with the heart clock: normal sounds, aortic stenosis and regurgitation, mitral stenosis and regurgitation and mitral valve prolapse ([#299](https://github.com/w3lld1/heart-atlas/pull/299), [#306](https://github.com/w3lld1/heart-atlas/pull/306)). The sounds are synthesized and schematic; what each murmur sounds like and where it is heard come from cited sources.
- The five valve disease articles play their murmur next to the normal sounds ([#321](https://github.com/w3lld1/heart-atlas/pull/321)).

### 3D model

- The 3D page has a "Show on the model" list of the diseases whose shape the model can show; the pick changes the model, its caption and sources, links to the article and stays in the address, so it can be shared. An article with a disease shape but without a heart clock gets a "Normal / With the disease" switch on its model, and under the 3D page model there are links to the articles with real patient heart models ([#324](https://github.com/w3lld1/heart-atlas/pull/324)).

### Articles

- New disease articles in Russian and English, each with a diagram: pulmonary atresia with ventricular septal defect ([#293](https://github.com/w3lld1/heart-atlas/pull/293)), left ventricular noncompaction, catecholaminergic polymorphic ventricular tachycardia, ventricular fibrillation and chronic thromboembolic pulmonary hypertension ([#295](https://github.com/w3lld1/heart-atlas/pull/295)), acute limb ischaemia ([#300](https://github.com/w3lld1/heart-atlas/pull/300)), single ventricle ([#322](https://github.com/w3lld1/heart-atlas/pull/322)), partial anomalous pulmonary venous return ([#329](https://github.com/w3lld1/heart-atlas/pull/329)) aortopulmonary window ([#338](https://github.com/w3lld1/heart-atlas/pull/338)) and interrupted aortic arch ([#344](https://github.com/w3lld1/heart-atlas/pull/344)). The site now has seventy-six disease articles.
- The disease list is cards in ten groups (rhythm, coronary, valves, congenital and others) with jump links and counts, and a "Find a disease" field narrows the cards as you type; the other sections get the same cards ([#339](https://github.com/w3lld1/heart-atlas/pull/339)).
- The congenitally corrected transposition article shows the heart clock with complete AV block, without the Wiggers diagram and the pacemaker state, which are written for a usual heart ([#294](https://github.com/w3lld1/heart-atlas/pull/294)).
- Above every article a visible "Explanation level" label names the patient and student buttons, and a line under them says what the chosen level gives ([#312](https://github.com/w3lld1/heart-atlas/pull/312)).

### Learning

- Quizzes in thirteen more articles, 84 in all ([#292](https://github.com/w3lld1/heart-atlas/pull/292), [#302](https://github.com/w3lld1/heart-atlas/pull/302), [#304](https://github.com/w3lld1/heart-atlas/pull/304), [#314](https://github.com/w3lld1/heart-atlas/pull/314), [#325](https://github.com/w3lld1/heart-atlas/pull/325), [#343](https://github.com/w3lld1/heart-atlas/pull/343)).
- Quiz numbers start the question line, and the diagram's "Normal / Disease / After treatment" switch fits one row on a phone ([#315](https://github.com/w3lld1/heart-atlas/pull/315)).
- Track pages show the steps as numbered cards that fill when read, and search results use the site's fonts and colours in both themes ([#327](https://github.com/w3lld1/heart-atlas/pull/327)).

### Site

- An address that does not exist opens a "Page not found" page with links to the home page and search in every language, instead of the GitHub Pages default ([#328](https://github.com/w3lld1/heart-atlas/pull/328)).
- Specs for the next work: stage 15 articles ([#309](https://github.com/w3lld1/heart-atlas/pull/309)) and a disease picker with new shape changes on the 3D model ([#310](https://github.com/w3lld1/heart-atlas/pull/310)).

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

[0.9.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.9.0
[0.8.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.8.0
[0.7.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.7.0
[0.6.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.6.0
[0.5.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.5.0
[0.4.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.4.0
[0.3.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.3.0
[0.2.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.2.0
[0.1.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.1.0
