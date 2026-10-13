# Heart Atlas

[Русская версия](README.ru.md)

An open-source interactive web app about the heart and heart disease: 3D anatomy, a live cardiac cycle with a synchronized ECG and heart sounds, and articles on heart conditions in "normal / disease" mode. Every article cites verified sources. Free, runs in the browser, and built so any language can be added.

> **Status:** early versions are out, see [releases](https://github.com/w3lld1/heart-atlas/releases) and the [changelog](CHANGELOG.md). In progress: more disease articles ([stage 14 spec](docs/plans/2026-10-13-stage-14-lvnc-cpvt-vf-cteph.md)). Every change to `main` is deployed to [w3lld1.github.io/heart-atlas](https://w3lld1.github.io/heart-atlas/).
>
> Heart Atlas is an educational resource. It does not replace a consultation with a doctor. See [DISCLAIMER.md](DISCLAIMER.md).

## What's inside

- **3D anatomy.** A model of the normal adult heart built from BodyParts3D: chambers, septa, valves, papillary muscles, great vessels, coronary arteries and cardiac veins, and a schematic conduction system. Structures can be selected and highlighted with the mouse or keyboard, and the model can beat: on its own at a chosen heart rate, or in time with the heart clock.
- **Heart clock.** One cardiac-cycle timer drives a synthetic ECG, heart sounds and a Wiggers diagram of left-heart pressures and volume. Disease presets (atrial fibrillation, ST-elevation myocardial infarction, heart failure with reduced ejection fraction, hypertension, aortic stenosis, atrial septal defect, first-, second- (Mobitz I and II) and third-degree atrioventricular block, supraventricular tachycardia, long QT syndrome, monomorphic ventricular tachycardia, atrial flutter, sick sinus syndrome, WPW syndrome, Brugada syndrome, atrial and ventricular premature beats) switch the cycle between normal and disease, and some also show the heart after treatment with a pacemaker; every number comes from a cited source or is marked as a model assumption.
- **Articles.** In Russian and English, each at two levels (for patients and for students), with numbered citations: sixty-five disease articles with an animated "normal / disease" diagram (some also show the heart after treatment), fifty-two with the 3D model (two of them with a real patient's heart) and eighteen with the heart clock presets of that disease, six anatomy articles and four on diagnostic tests (ECG, echocardiography, Holter monitoring, natriuretic peptides) with interactive diagrams or a live ECG monitor. In some anatomy and disease articles the names of structures show them on the 3D model.
- **Quizzes and learning tracks.** 70 articles end with a short "Check yourself" quiz whose answers are explained from the article's own sources. Learning tracks list articles to read in order; the reader can mark steps as read, and the track shows passed quizzes and where to continue. Progress stays in the reader's browser.
- **Search.** Full-text search across the site, including other names and abbreviations of each disease.
- **Offline.** The site installs as an app; the home, search and offline pages and pages you have opened work without a connection.
- **Embedding.** The ECG, the 3D model and any article can be embedded on other sites with an `<iframe>`; a builder page gives the code.
- **Any language.** Russian and English now; a language is added with one registry entry and a strings file, and right-to-left scripts are supported.

## Medical content

Articles are not yet reviewed by physicians. Until reviewers join, articles about diseases, diagnostics and treatment cite at least two sources, at least one of them a clinical guideline (ESC, AHA/ACC, NICE, the Russian Ministry of Health, WHO). Other sources are peer-reviewed papers with a DOI, textbooks with an ISBN, or trusted references such as StatPearls. Every article is labelled "not reviewed by a physician". Found a mistake? [Report it](https://github.com/w3lld1/heart-atlas/issues/new?template=content-error.yml).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Physicians, medical students, translators and developers are all welcome.

## License

- Code: [MIT](LICENSE)
- Content, 3D models and other assets: [CC BY-SA 4.0](LICENSE-CONTENT)
