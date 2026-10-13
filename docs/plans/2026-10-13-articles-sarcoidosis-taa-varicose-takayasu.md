# Статьи: саркоидоз сердца, аневризма грудной аорты, варикозная болезнь, неспецифический аортоартериит

Дата: 13.10.2026
Статус: принята (второй поток статей; темы согласованы с координатором, владелец разрешил работать автономно 12.10.2026)
Связано: `2026-10-13-articles-pad-dvt-hlhs-ppcm.md` (тот же процесс и способ чтения источников), `2026-10-11-stage-3-diseases.md` (правила статей), `2026-10-11-article-visuals.md` (схемы).

## Цель

Четыре статьи о болезнях на русском и английском, с уровнями «пациент» и «студент», плашкой «Врачом не проверено» и новой схемой «норма / болезнь» у каждой:

- `cardiac-sarcoidosis` — «Саркоидоз сердца»;
- `thoracic-aortic-aneurysm` — «Аневризма грудной аорты»;
- `varicose-veins` — «Варикозная болезнь вен нижних конечностей»;
- `takayasu-arteritis` — «Неспецифический аортоартериит (артериит Такаясу)».

Каждая статья идёт отдельным PR. 3D-модель с подсветкой есть там, где нужная структура есть в модели: перегородка и проводящая система у саркоидоза, аорта у аневризмы и аортоартериита. У вен ног её нет. Квизы добавляет поток интерактива после слияния.

Темы не пересекаются с первым потоком (миксома, констриктивный перикардит, АВСД, двустворчатый аортальный клапан).

## Как читали источники

Как в предыдущей партии: Минздрав полностью через API рубрикатора с проверкой, что новее версии нет; ESC по официальным слайдам; справочник — MSD Manuals. Каждую цитату автор и независимый проверяющий сверяли точным поиском по своему скачанному тексту; английскую версию проверял отдельный проверяющий. Где источники расходятся в числах, каждое число подписано своим источником. Дозы, названия препаратов, режимы и индивидуальные советы не пишем. EULAR, ACR, ESVS и HRS нет в списке доверенных источников, их документы не цитируются.

## 1. Саркоидоз сердца (`cardiac-sarcoidosis`)

| org | tier | Документ | Год | DOI / ссылка |
|---|---|---|---|---|
| minzdrav-rf | guideline | Саркоидоз (736_2) | 2025 | cr.minzdrav.gov.ru/view-cr/736_2 |
| minzdrav-rf | guideline | Желудочковые нарушения ритма сердца. Внезапная сердечная смерть (569_2) | 2025 | 10.15829/1560-4071-2025-6670 |
| minzdrav-rf | guideline | Брадиаритмии и нарушения проводимости (160_2) | 2025 | 10.15829/1560-4071-2025-6669 |
| minzdrav-rf | guideline | Миокардиты (153_2) | 2025 | cr.minzdrav.gov.ru/view-cr/153_2 |
| esc | guideline | 2022 ESC Guidelines for the management of patients with ventricular arrhythmias and the prevention of sudden cardiac death (слайды ESC) | 2022 | 10.1093/eurheartj/ehac262 |
| esc | guideline | 2023 ESC Guidelines for the management of cardiomyopathies (слайды ESC) | 2023 | 10.1093/eurheartj/ehad194 |
| msd-manuals | reference | Sarcoidosis (Professional и Consumer) | 2025 | msdmanuals.com |

Долю поражения сердца и порог фракции выброса для ИКД не приводим: источники дают их по-разному или без опоры на прочитанный текст.

## 2. Аневризма грудной аорты (`thoracic-aortic-aneurysm`)

| org | tier | Документ | Год | DOI / ссылка |
|---|---|---|---|---|
| esc | guideline | 2024 ESC Guidelines for the management of peripheral arterial and aortic diseases (слайды ESC) | 2024 | 10.1093/eurheartj/ehae179 |
| minzdrav-rf | guideline | Аневризмы грудной и торакоабдоминальной аорты (919_1) | 2025 | cr.minzdrav.gov.ru/view-cr/919_1 |
| aha-acc | guideline | 2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease | 2022 | 10.1161/CIR.0000000000001106 |
| msd-manuals | reference | Thoracic Aortic Aneurysms (Professional и Consumer) | 2024 | msdmanuals.com |

Пороги для операции подписаны каждым руководством и отделом аорты отдельно и стоят только в блоке «студент».

## 3. Варикозная болезнь вен нижних конечностей (`varicose-veins`)

| org | tier | Документ | Год | DOI / ссылка |
|---|---|---|---|---|
| minzdrav-rf | guideline | Варикозное расширение вен нижних конечностей (680_2) | 2024 | cr.minzdrav.gov.ru/view-cr/680_2 |
| minzdrav-rf | guideline | Флебит и тромбофлебит поверхностных сосудов (668_2) | 2024 | cr.minzdrav.gov.ru/view-cr/668_2 |
| nice | guideline | CG168 Varicose veins: diagnosis and management | 2013 | nice.org.uk/guidance/cg168 |
| msd-manuals | reference | Varicose Veins (Professional и Consumer); Overview of the Venous System | 2026 | msdmanuals.com |

Названия склерозантов, препаратов и давление компрессионного трикотажа не пишем. Тромбоз поверхностных вен в разделе о скорой помощи — по 680_2 и 668_2.

## 4. Неспецифический аортоартериит (`takayasu-arteritis`)

| org | tier | Документ | Год | DOI / ссылка |
|---|---|---|---|---|
| minzdrav-rf | guideline | Неспецифический аортоартериит (479_2, дети) | 2025 | cr.minzdrav.gov.ru/view-cr/479_2 |
| aha-acc | guideline | 2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease | 2022 | 10.1161/CIR.0000000000001106 |
| msd-manuals | reference | Takayasu Arteritis (Professional) | 2025 | msdmanuals.com |

Взрослой рекомендации Минздрава нет, поэтому все числа из 479_2 подписаны как относящиеся к детям.
