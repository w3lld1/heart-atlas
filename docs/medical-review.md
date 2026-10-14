# Medical review / Медицинская проверка

_Russian below. / Русский текст ниже._

Heart Atlas has no physician reviewers yet. Until then every article is checked against its sources, and until an article is reviewed its page shows the notice "Not reviewed by a physician". This page describes how a physician can review an article now.

## How a review works

1. **Offer to help.** Open an issue with the [Physician form](https://github.com/w3lld1/heart-atlas/issues/new?template=physician.yml). Say which articles or topics you can review and whether we may record your name.
2. **Read the article on the site.** Check both levels (patient and student), diagrams in every state (normal, disease, after treatment), the ECG and 3D model if the article has them, and the quiz questions with their explanations.
3. **Check the sources.** Each statement should be supported by the source it cites. A link that opens is not the same as a source that supports the claim.
4. **Send your findings** in the issue: the article, the wrong or unclear statement, what is correct and a source. One issue per article is easiest.
5. **We fix the article** in a pull request and send you the changes.
6. **When you are satisfied**, write in the issue: "I have reviewed the article <link> as of <date>." We fill in the article's `review` field (`reviewer`: your name, or "physician, name withheld" if you prefer; `date`), and the page drops the "not reviewed" notice. The field is in the article's public source file; the "Report an error" link stays on the page.

## Rules

- A review covers one article in one language as of its date. A translation needs its own review.
- An author does not review their own article.
- Any later change to the medical text needs a new review: until then we put `review` back to `null` and the notice returns.
- If you find a dangerous error, say so in the issue title: we fix or take down the statement first and discuss later.
- We never invent reviewers, names or dates.
- Everything in issues and pull requests is public. Do not post patient data or copies of your diplomas.

---

# Медицинская проверка

У Heart Atlas пока нет врачей-рецензентов. До их появления каждая статья сверяется с источниками, а пока статью не проверили, на её странице стоит плашка «Врачом не проверено». Ниже описано, как врач может проверить статью уже сейчас.

## Как проходит проверка

1. **Предложите помощь.** Откройте issue по [форме «Врач»](https://github.com/w3lld1/heart-atlas/issues/new?template=physician.yml). Напишите, какие статьи или темы готовы проверить и можно ли указывать ваше имя.
2. **Прочитайте статью на сайте.** Оба уровня (пациент и студент), схемы во всех состояниях (норма, болезнь, после лечения), ЭКГ и 3D-модель, если они есть, и вопросы теста с пояснениями.
3. **Сверьте с источниками.** Каждое утверждение должно подтверждаться источником, на который ссылается. Открывающаяся ссылка ещё не значит, что источник подтверждает тезис.
4. **Пришлите замечания** в issue: статья, неверное или неясное утверждение, как правильно и источник. Удобнее одно issue на статью.
5. **Мы исправим статью** в pull request и пришлём вам изменения.
6. **Когда всё в порядке**, напишите в issue: «Я проверил(а) статью <ссылка> по состоянию на <дата>». Мы заполним поле `review` статьи (`reviewer`: ваше имя или, если вы против, «врач, имя не указано»; `date`), и плашка «Врачом не проверено» исчезнет. Поле находится в публичном файле статьи; ссылка «Сообщить об ошибке» на странице остаётся.

## Правила

- Проверка относится к одной статье на одном языке на указанную дату. Перевод проверяется отдельно.
- Автор не проверяет собственную статью.
- После любой правки медицинского текста нужна новая проверка: до неё мы возвращаем `review: null`, и плашка появляется снова.
- Если ошибка опасна, напишите об этом в заголовке issue: сначала исправим или уберём утверждение, обсудим потом.
- Мы никогда не выдумываем рецензентов, имена и даты.
- Всё в issue и pull request публично. Не публикуйте данные пациентов и копии дипломов.

Шаблон для врача, который хочет написать статью: [medical-author-template.md](medical-author-template.md).
