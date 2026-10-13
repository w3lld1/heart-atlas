# Статьи: атеросклероз артерий нижних конечностей, тромбоз глубоких вен, синдром гипоплазии левых отделов сердца, перипартальная кардиомиопатия

Дата: 13.10.2026
Статус: принята (второй поток статей; темы согласованы с координатором, владелец разрешил работать автономно 12.10.2026)
Связано: `2026-10-12-articles-flutter-sss-aaa-amyloidosis.md` (тот же процесс и способ чтения источников), `2026-10-11-stage-3-diseases.md` (правила статей), `2026-10-11-article-visuals.md` (схемы).

## Цель

Четыре статьи о болезнях на русском и английском, с уровнями «пациент» и «студент», плашкой «Врачом не проверено» и схемой «норма / болезнь»:

- `peripartum-cardiomyopathy` — «Перипартальная кардиомиопатия»;
- `deep-vein-thrombosis` — «Тромбоз глубоких вен»;
- `peripheral-artery-disease` — «Атеросклероз артерий нижних конечностей»;
- `hypoplastic-left-heart-syndrome` — «Синдром гипоплазии левых отделов сердца».

Каждая статья идёт отдельным PR. Перипартальная кардиомиопатия использует уже существующую схему `dilated-cardiomyopathy` со своими подписями; у остальных трёх новые схемы. 3D-модель с подсветкой есть там, где нужная структура есть в модели (левый желудочек; у артерий и вен ног её нет).

Из предложенного координатором списка такоцубо не взята: взрослой рекомендации Минздрава по ней нет. Саркоидоз сердца — запасная тема (Минздрав 736_2).

## Как читали источники

Как в предыдущей партии: Минздрав полностью через API рубрикатора с проверкой, что новее версии нет; ESC по официальным слайдам или авторизованному русскому переводу; справочник — MSD Manuals. Каждую цитату автор и независимый проверяющий сверяли точным поиском по своему скачанному тексту. Где источники расходятся в числах, каждое число подписано своим источником. Дозы, названия препаратов, режимы и индивидуальные советы не пишем.

## 1. Перипартальная кардиомиопатия (`peripartum-cardiomyopathy`)

| org | tier | Документ | Год | DOI / ссылка |
|---|---|---|---|---|
| esc | guideline | 2025 ESC Guidelines for the management of cardiovascular disease and pregnancy (слайды ESC) | 2025 | 10.1093/eurheartj/ehaf193 |
| minzdrav-rf | guideline | Дилатационная кардиомиопатия (1008_1; разделы о перипартальной форме, код O90.3) | 2025 | cr.minzdrav.gov.ru/view-cr/1008_1 |
| esc | guideline | 2023 ESC Guidelines for the management of cardiomyopathies (слайды ESC) | 2023 | 10.1093/eurheartj/ehad194 |
| msd-manuals | reference | Heart Disease in Pregnancy (Professional); пациентская страница | 2026, 2025 | msdmanuals.com |

Тема касается беременности и грудного вскармливания: только классы препаратов, без названий и доз. Сроки после родов и возраст как фактор риска у источников разные, подписаны.

## 2. Тромбоз глубоких вен (`deep-vein-thrombosis`)

| org | tier | Документ | Год | DOI / ссылка |
|---|---|---|---|---|
| minzdrav-rf | guideline | Тромбоз глубоких вен конечностей (960_1) | 2025 | cr.minzdrav.gov.ru/view-cr/960_1 |
| nice | guideline | NG158 Venous thromboembolic diseases: diagnosis, management and thrombophilia testing | 2023 | nice.org.uk/guidance/ng158 |
| esc | guideline | 2019 ESC Guidelines on acute pulmonary embolism (официальный перевод) | 2019 | 10.1093/eurheartj/ehz405 |
| msd-manuals | reference | Deep Venous Thrombosis (Professional и Consumer) | 2026 | msdmanuals.com |

ESC по ТЭЛА — только для четырёх утверждений о ТГВ. ESVS 2021 нет в списке доверенных источников и не цитируется. Минздрав и NICE расходятся в компрессионном трикотаже: приводим обе позиции с подписью.

## 3. Атеросклероз артерий нижних конечностей (`peripheral-artery-disease`)

| org | tier | Документ | Год | DOI / ссылка |
|---|---|---|---|---|
| minzdrav-rf | guideline | Хроническая ишемия нижних конечностей с клиникой перемежающейся хромоты (958_1) | 2025 | cr.minzdrav.gov.ru/view-cr/958_1 |
| minzdrav-rf | guideline | Критическая ишемия нижних конечностей (1016_1) | 2025 | cr.minzdrav.gov.ru/view-cr/1016_1 |
| esc | guideline | 2024 ESC Guidelines for the management of peripheral arterial and aortic diseases (слайды ESC) | 2024 | 10.1093/eurheartj/ehae179 |
| nice | guideline | CG147 Peripheral arterial disease: diagnosis and management | 2020 | nice.org.uk/guidance/cg147 |
| aha-acc | guideline | 2024 ACC/AHA Guideline for the Management of Lower Extremity Peripheral Artery Disease (авторская рукопись NIH) | 2024 | 10.1161/CIR.0000000000001251 |
| minzdrav-rf | guideline | Острая ишемия конечностей (1006_1; только признаки неотложного состояния) | 2025 | cr.minzdrav.gov.ru/view-cr/1006_1 |
| msd-manuals | reference | Peripheral Artery Disease; Acute Limb Ischemia (Professional) | 2025 | msdmanuals.com |

Препараты, которые рекомендует только Минздрав, не называем.

## 4. Синдром гипоплазии левых отделов сердца (`hypoplastic-left-heart-syndrome`)

| org | tier | Документ | Год | DOI / ссылка |
|---|---|---|---|---|
| minzdrav-rf | guideline | Синдром гипоплазии левых отделов сердца (602_2, дети) | 2024 | cr.minzdrav.gov.ru/view-cr/602_2 |
| esc | guideline | 2020 ESC Guidelines for the management of adult congenital heart disease (только взрослые после операции Фонтена) | 2020 | 10.1093/eurheartj/ehaa554 |
| msd-manuals | reference | Hypoplastic Left Heart Syndrome (Professional) | 2025 | msdmanuals.com |

Этапные операции описываем простыми словами и без обещаний исхода; процент выживаемости MSD не берём.
