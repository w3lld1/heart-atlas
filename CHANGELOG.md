# Changelog

All notable changes to Heart Atlas are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

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

[0.2.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.2.0
[0.1.0]: https://github.com/w3lld1/heart-atlas/releases/tag/v0.1.0
