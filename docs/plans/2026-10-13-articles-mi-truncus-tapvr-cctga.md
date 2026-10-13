# Статьи: инфаркт миокарда, общий артериальный ствол, ТАДЛВ, корригированная транспозиция

Дата: 13.10.2026
Статус: принята (второй поток статей; темы согласованы с координатором, владелец разрешил работать автономно 12.10.2026)
Связано: `2026-10-13-articles-sarcoidosis-taa-varicose-takayasu.md` (тот же процесс), `2026-10-11-stage-3-diseases.md` (правила статей), `2026-10-11-article-visuals.md` (схемы), `docs/adding-an-article.md` → «Shared files».

## Цель

Четыре статьи о болезнях на русском и английском, с уровнями «пациент» и «студент», плашкой «Врачом не проверено» и новой схемой «норма / болезнь» у каждой:

- `myocardial-infarction` — «Инфаркт миокарда»;
- `truncus-arteriosus` — «Общий артериальный ствол»;
- `total-anomalous-pulmonary-venous-return` — «Тотальный аномальный дренаж лёгочных вен»;
- `congenitally-corrected-transposition` — «Корригированная транспозиция магистральных артерий».

Каждая статья идёт отдельным PR. У всех есть 3D-модель нормального сердца с подсветкой нужных структур; у врождённых пороков в тексте сказано, что модель показывает нормальное сердце. Квизы добавляет поток интерактива после слияния.

Темы не пересекаются с первым потоком (пролапс митрального клапана, экстрасистолия, ревматическая болезнь сердца, синдром такоцубо, резерв — некомпактный миокард). Статья об инфаркте ссылается на статью об ИБС и не повторяет её.

## Как читали источники

Как в предыдущих партиях: Минздрав полностью через API рубрикатора с проверкой, что новее версии нет; ESC 2020 ACHD по копии PDF издателя у сети NHS North West CHD и по официальным слайдам; ESC 2023 ACS по официальным слайдам; справочник — MSD Manuals. Каждую цитату автор и независимый проверяющий сверяли точным поиском по своему скачанному тексту; английскую версию проверял отдельный проверяющий. Где источники расходятся в числах, каждое число подписано своим источником. Дозы, названия препаратов, режимы и индивидуальные советы не пишем. Руководство ACC/AHA 2025 по ВПС у взрослых прочитать не удалось, оно не цитируется.

## 1. Инфаркт миокарда (`myocardial-infarction`)

| org | tier | Документ | Год | DOI / ссылка |
|---|---|---|---|---|
| minzdrav-rf | guideline | Острый инфаркт миокарда с подъемом сегмента ST (157_5) | 2024 | 10.15829/1560-4071-2025-6306 |
| minzdrav-rf | guideline | Острый коронарный синдром без подъема сегмента ST (154_4) | 2024 | 10.15829/1560-4071-2025-6319 |
| esc | guideline | 2023 ESC Guidelines for the management of acute coronary syndromes (слайды ESC) | 2023 | 10.1093/eurheartj/ehad191 |
| — | review | Fifth Universal Definition of Myocardial Infarction | 2026 | 10.1093/eurheartj/ehag101 |
| msd-manuals | reference | Acute MI (Professional); Acute Coronary Syndromes и Complications of an ACS (Consumer) | 2026 | msdmanuals.com |

Схема: правая коронарная артерия и нижняя стенка левого желудочка; при инфаркте тромб на бляшке закрывает артерию. ЭКГ-модель — пресет `stemi`, в тексте сказано, что он показывает только инфаркт с подъёмом ST.

## 2. Общий артериальный ствол (`truncus-arteriosus`)

| org | tier | Документ | Год | DOI / ссылка |
|---|---|---|---|---|
| minzdrav-rf | guideline | Общий артериальный ствол (737_2) | 2025 | cr.minzdrav.gov.ru/view-cr/737_2 |
| esc | guideline | 2020 ESC Guidelines for the management of adult congenital heart disease | 2020 | 10.1093/eurheartj/ehaa554 |
| msd-manuals | reference | Persistent Truncus Arteriosus (Professional и Consumer), Overview of Heart Defects (Consumer) | 2023–2026 | msdmanuals.com |

Числа выживаемости и летальности не приводим. Долю 22q11, частоту и сроки операции источники дают по-разному — каждое число подписано.

## 3. Тотальный аномальный дренаж лёгочных вен (`total-anomalous-pulmonary-venous-return`)

| org | tier | Документ | Год | DOI / ссылка |
|---|---|---|---|---|
| minzdrav-rf | guideline | Тотальный аномальный дренаж легочных вен (34_3, детские) | 2024 | cr.minzdrav.gov.ru/view-cr/34_3 |
| esc | guideline | 2020 ESC Guidelines for the management of adult congenital heart disease | 2020 | 10.1093/eurheartj/ehaa554 |
| msd-manuals | reference | TAPVR (Professional и Consumer) | 2023, 2025 | msdmanuals.com |

Числа Минздрава подписаны как данные детских рекомендаций. Схема показывает надсердечный вариант.

## 4. Корригированная транспозиция (`congenitally-corrected-transposition`)

| org | tier | Документ | Год | DOI / ссылка |
|---|---|---|---|---|
| minzdrav-rf | guideline | Дискордантное предсердно-желудочковое соединение (35_2) | 2024 | cr.minzdrav.gov.ru/view-cr/35_2 |
| esc | guideline | 2020 ESC Guidelines for the management of adult congenital heart disease, §4.13 | 2020 | 10.1093/eurheartj/ehaa554 |
| msd-manuals | reference | Congenitally Corrected Transposition of the Great Arteries (Professional) | 2023 | msdmanuals.com |

Статья противопоставляет порок d-ТМА. На схеме толстая стенка у желудочка, который качает кровь в аорту (при пороке — морфологически правого).
