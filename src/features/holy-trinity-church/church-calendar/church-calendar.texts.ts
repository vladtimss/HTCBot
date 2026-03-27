/**
 * features/holy-trinity-church/church-calendar/church-calendar.texts.ts
 * --------------------------
 * Тексты для раздела "Церковный календарь"
 */

import { fmt, bold, link } from "@grammyjs/parse-mode";

// ============================================================================
// Block тексты (большие многострочные)
// ============================================================================

const calendarTextsSubscribeInstructionsApple = fmt`👉 Если вы с ${bold()}iPhone или iPad${bold()}:
1. Откройте приложение ${bold()}Календарь${bold()}.
2. Внизу нажмите ${bold()}Календари${bold()} → ${bold()}Добавить подписной календарь${bold()}.
3. Вставьте ссылку и сохраните.

👉 Если вы с ${bold()}Mac${bold()}:
1. Откройте приложение ${bold()}Календарь${bold()}.
2. В верхнем меню выберите ${bold()}Файл${bold()} → ${bold()}Новый календарь подписки${bold()}.
3. Вставьте ссылку и нажмите ${bold()}ОК${bold()}.`;

const calendarTextsSubscribeInstructionsYandex = fmt`👉 Если вы с ${bold()}телефона${bold()}:
1. Откройте приложение ${bold()}Яндекс.Календарь${bold()}.
2. Нажмите меню → ${bold()}Добавить календарь${bold()} → ${bold()}По ссылке${bold()}.
3. Вставьте ссылку и подтвердите.

👉 Если вы с ${bold()}компьютера${bold()}:
1. Перейдите на ${link("https://calendar.yandex.ru")}calendar.yandex.ru${link("https://calendar.yandex.ru")}.
2. Слева выберите ${bold()}Добавить календарь${bold()} → ${bold()}По ссылке${bold()}.
3. Вставьте ссылку и сохраните.`;

const calendarTextsSubscribeInstructionsGoogle = fmt`👉 Если вы с ${bold()}компьютера${bold()}:
1. Откройте ${link("https://calendar.google.com")}Google Календарь${link("https://calendar.google.com")}.
2. Слева найдите ${bold()}Другие календари${bold()} → «+» → выберите ${bold()}По URL${bold()}.
3. Вставьте ссылку и нажмите ${bold()}Добавить${bold()}.

👉 Если вы с ${bold()}телефона${bold()}:
Через приложение Google Календарь подписаться нельзя. Но можно открыть ${link("https://calendar.google.com")}calendar.google.com${link("https://calendar.google.com")} в браузере и выполнить те же шаги, что и на компьютере.`;

const calendarTextsSubscribeInstructionsXiaomi = fmt`👉 Если вы с ${bold()}телефона${bold()}:
1. Откройте приложение ${bold()}Календарь${bold()}.
2. Зайдите в ${bold()}Настройки${bold()}.
3. Найдите пункт ${bold()}Добавить календарь по URL${bold()}.
4. Вставьте ссылку и сохраните.

👉 Если вы с ${bold()}компьютера${bold()}:
Подписку через Xiaomi сделать нельзя. Используйте другой календарь (Google или Яндекс), а потом включите синхронизацию с телефоном.`;

const calendarTextsSubscribeInstructionsOther = fmt`К сожалению, точной инструкции нет. Обычно нужно найти в настройках пункт ${bold()}Добавить календарь по URL${bold()} или ${bold()}Подписка на календарь${bold()} и вставить ссылку.`;

// ============================================================================
// Динамические тексты (функции)
// ============================================================================

function calendarTextsRvNotPlanned(year: number) {
	return fmt`В ${year} году Рождественский выезд ещё не запланирован в церковном календаре.`;
}

function calendarTextsEasterNotPlanned(year: number) {
	return fmt`В ${year} году Пасха ещё не запланирована в церковном календаре.`;
}

// ============================================================================
// Основной объект (inline тексты)
// ============================================================================

export const CALENDAR_TEXTS = {
	title: fmt`${bold()}📅 Раздел: Церковный календарь${bold()}`,
	nextEventsTitle: fmt`${bold()}Ближайшие события:${bold()}`,
	noEvents: fmt`Нет запланированных событий.`,

	// ЛМГ
	lmgTitle: fmt`📖 ЛМГ:`,
	lmgNext: fmt`${bold()}Следующая встреча ЛМГ:${bold()}`,
	lmgNone: fmt`Следующей встречи ЛМГ пока нет.`,
	lmgNoneAll: fmt`Будущих встреч ЛМГ пока нет.`,

	// Молитвы
	prayersTitle: fmt`🙏 Молитвенные собрания:`,
	prayersNext: fmt`${bold()}Следующее молитвенное собрание:${bold()}`,
	prayersNone: fmt`Следующее молитвенное собрание пока не запланировано.`,
	prayersNoneAll: fmt`Будущих молитвенных собраний пока нет.`,

	// Членские собрания
	membersTitle: fmt`👥 Членские собрания:`,
	membersNext: fmt`${bold()}Следующее членское собрание:${bold()}`,
	membersNone: fmt`Следующее членское собрание пока не запланировано.`,
	membersNoneAll: fmt`Будущих членских собраний пока нет.`,

	// Большие праздники
	holidaysTitle: fmt`🎉 Большие праздники:`,
	rvNotPlanned: calendarTextsRvNotPlanned,
	easterNotPlanned: calendarTextsEasterNotPlanned,

	// Семейные встречи
	familyTitle: fmt`👨‍👩‍👧 Отцы и дети / Сёстры:`,
	familyNext: fmt`${bold()}Следующая встреча:${bold()}`,
	familyNone: fmt`Следующая встреча пока не запланирована.`,
	familyNoneAll: fmt`Будущих встреч пока нет.`,

	// Подписка на календарь
	yourCalendarUsing: fmt`Подскажите, каким календарем вы пользуетесь на телефоне или компьютере?`,

	subscribeInstructions: {
		apple: calendarTextsSubscribeInstructionsApple,
		yandex: calendarTextsSubscribeInstructionsYandex,
		google: calendarTextsSubscribeInstructionsGoogle,
		xiaomi: calendarTextsSubscribeInstructionsXiaomi,
		other: calendarTextsSubscribeInstructionsOther,
	},
};
