/**
 * services/texts.ts
 * --------------------------
 * Все тексты и статический контент для бота.
 */

import { env } from "../config/env";
import { MyContext } from "../types/grammy-context";
import { escapeMdV2, escapeUrlV2 } from "../utils/text";

/* -------------------- Общие тексты -------------------- */
export const COMMON = {
	mainMenuTitle: "Главное меню:",
	useButtonBelow: (() => {
		const text = escapeMdV2("Воспользуйтесь кнопками ниже".toLocaleUpperCase());
		return `👇 *${text}* 👇`;
	})(),
};

/* -------------------- Приветствие (/start) -------------------- */
export function greet(ctx: MyContext) {
	const firstName = ctx.from?.first_name ?? "";
	const isPrivileged = ctx.access?.isPrivileged;

	// Экранируем firstName для MarkdownV2
	const escapedFirstName = firstName ? escapeMdV2(firstName) : "";

	if (isPrivileged) {
		return `Привет${
			escapedFirstName ? ", " + escapedFirstName : ""
		}!\n*Это помощник для нашей Церкви*\\.\nВоспользуйтесь кнопками внизу 👇`;
	} else {
		return `Добро пожаловать${
			escapedFirstName ? ", " + escapedFirstName : ""
		}!\n\nЭто помощник Церкви Святой Троицы\nЗдесь вы найдёте информацию о богослужениях, проповедях, о нас, о малых группах и, как к ним можно присоединиться\\.\nВоспользуйтесь кнопками внизу 👇`;
	}
}

/* -------------------- Воскресное богослужение -------------------- */
export const SUNDAY = {
	title: "Воскресное богослужение",
	text: (() => {
		// Экранируем URL для MarkdownV2
		const escapedUrl = escapeUrlV2(env.YANDEX_MAP_URL);
		const t1 = escapeMdV2("Богослужение проходит каждое воскресенье");
		const t2 = escapeMdV2("Начало в 11:00");
		const t3 = escapeMdV2("Адрес:");
		const t4 = escapeMdV2("Чароитовая улица, 1к5");
		const t5 = escapeMdV2("район Троицк, Москва");
		const t6 = escapeMdV2("Вход справа от подъезда 1 и слева от ателье");
		const t7 = escapeMdV2("Открыть в Яндекс.Картах");
		return [
			`✨ *${t1}*`,
			"",
			`🕚 *${t2}*`,
			"",
			`📍 *${t3}*`,
			`> ${t4}`,
			`> ${t5}`,
			"",
			`_${t6}_`,
			"",
			`🌍 [${t7}](${escapedUrl})`,
		].join("\n");
	})(),
};

/* -------------------- О нас -------------------- */
export const ABOUT = {
	title: "О нас",

	// Подразделы
	belief: "Во что мы верим...",
	history: "Наша история...",
	channel: "📣 Канал",

	// Кнопки
	beliefButton: "🧭 Во что мы верим",
	historyButton: "📜 Наша история",
	backButton: "⬅️ Назад",
	mainButton: "🏠 В главное меню",
};

/* -------------------- Малые группы -------------------- */
export const SMALL_GROUPS_TEXTS = {
	title: "Раздел: Малые группы",
	descriptionForMembers: (() => {
		// Экранируем все спецсимволы MarkdownV2
		const line1 = escapeMdV2("Посмотреть группы по дням недели");
		const line2 = escapeMdV2("Найти группу рядом с вами (по району)");
		const line3 = escapeMdV2("Узнать ближайшую встречу ЛМГ");
		const line4 = escapeMdV2("Посмотреть все будущие встречи ЛМГ");
		return `Здесь вы можете:\n\n• 📅 ${line1}\n• 📍 ${line2}\n• ⏱️ ${line3}\n• 🗓️ ${line4}`;
	})(),

	descriptionForOther: (() => {
		// Экранируем все спецсимволы MarkdownV2
		const line1 = escapeMdV2("Посмотреть группы по дням недели");
		const line2 = escapeMdV2("Найти группу рядом с вами (по району)");
		return `Здесь вы можете:\n\n• 📅 ${line1}\n• 📍 ${line2}`;
	})(),

	// Кнопки (используются и в клавиатуре, и в хендлерах)
	byDay: "📅 По дням",
	byDistrict: "📍 По районам",
	nextMg: "⏱️ Ближайшая МГ",
	seasonAll: "🗓️ Все будущие встречи",
	lmgTrip: "🚌 Выезд ЛМГ",
	back: "⬅️ Назад",
	main: "🏠 В главное меню",

	// Промпты
	chooseDay: escapeMdV2("Выберите день:"),
	chooseDistrict: escapeMdV2("Выберите район:"),

	// Fallback-сообщения
	noNextLmg: escapeMdV2("😔 Ближайших встреч ЛМГ в этом сезоне не найдено."),
	noFutureLmg: escapeMdV2("😔 В этом сезоне встреч ЛМГ больше нет."),

	// Списки
	lmgSeasonList: (() => {
		const text = escapeMdV2("Список встреч ЛМГ до конца сезона:");
		return `📖 *${text}*`;
	})(),
	lmgNotesIntro: (() => {
		const text = escapeMdV2("Здесь вы можете найти полезные материалы для лидеров малых групп, а также найти конспекты для проведения МГ.");
		return `${text}\n\n${COMMON.useButtonBelow}`;
	})(),
};

/* -------------------- Церковный календарь -------------------- */
export const CALENDAR = {
	title: (() => {
		const text = escapeMdV2("📅 Раздел: Церковный календарь");
		return `*${text}*`;
	})(),
	nextEventsTitle: (() => {
		const text = escapeMdV2("Ближайшие события:");
		return `*${text}*`;
	})(),
	noEvents: escapeMdV2("Нет запланированных событий."),

	// ЛМГ
	lmgTitle: escapeMdV2("📖 ЛМГ:"),
	lmgNext: (() => {
		const text = escapeMdV2("Следующая встреча ЛМГ:");
		return `*${text}*`;
	})(),
	lmgNone: escapeMdV2("Следующей встречи ЛМГ пока нет."),
	lmgNoneAll: escapeMdV2("Будущих встреч ЛМГ пока нет."),

	// Молитвы
	prayersTitle: escapeMdV2("🙏 Молитвенные собрания:"),
	prayersNext: (() => {
		const text = escapeMdV2("Следующее молитвенное собрание:");
		return `*${text}*`;
	})(),
	prayersNone: escapeMdV2("Следующее молитвенное собрание пока не запланировано."),
	prayersNoneAll: escapeMdV2("Будущих молитвенных собраний пока нет."),

	// Членские собрания
	membersTitle: escapeMdV2("👥 Членские собрания:"),
	membersNext: (() => {
		const text = escapeMdV2("Следующее членское собрание:");
		return `*${text}*`;
	})(),
	membersNone: escapeMdV2("Следующее членское собрание пока не запланировано."),
	membersNoneAll: escapeMdV2("Будущих членских собраний пока нет."),

	// Большие праздники
	holidaysTitle: escapeMdV2("🎉 Большие праздники:"),
	rvNotPlanned: (year: number) => `В ${year} году Рождественский выезд ещё не запланирован в церковном календаре\\.`,
	rvPast: (year: number, body: string) => {
		const escapedBody = escapeMdV2(body);
		return `В следующем году Рождественский выезд ещё не запланирован в церковном календаре, а в ${year} году он проходил:\n\n${escapedBody}`;
	},
	rvFuture: (body: string) => {
		const escapedBody = escapeMdV2(body);
		return `*Рождественский выезд:*\n\n${escapedBody}`;
	},

	easterNotPlanned: (year: number) => `В ${year} году Пасха ещё не запланирована в церковном календаре\\.`,
	easterPast: (year: number, body: string) => {
		const escapedBody = escapeMdV2(body);
		return `В следующем году Пасха ещё не запланирована в церковном календаре, а в ${year} году она проходила:\n\n${escapedBody}`;
	},
	easterFuture: (body: string) => {
		const escapedBody = escapeMdV2(body);
		return `*Пасха:*\n\n${escapedBody}`;
	},

	// Семейные встречи
	familyTitle: escapeMdV2("👨‍👩‍👧 Отцы и дети / Сёстры:"),
	familyNext: (() => {
		const text = escapeMdV2("Следующая встреча:");
		return `*${text}*`;
	})(),
	familyNone: escapeMdV2("Следующая встреча пока не запланирована."),
	familyNoneAll: escapeMdV2("Будущих встреч пока нет."),

	// Подписка на календарь
	yourCalendarUsing: escapeMdV2("Подскажите, каким календарем вы пользуетесь на телефоне или компьютере?"),

	subscribeInstructions: {
		apple: (() => {
			const t1 = escapeMdV2("Если вы с");
			const t2 = escapeMdV2("iPhone или iPad");
			const t3 = escapeMdV2("Откройте приложение");
			const t4 = escapeMdV2("Календарь");
			const t5 = escapeMdV2("Внизу нажмите");
			const t6 = escapeMdV2("Календари");
			const t7 = escapeMdV2("Добавить подписной календарь");
			const t8 = escapeMdV2("Вставьте ссылку и сохраните");
			const t9 = escapeMdV2("Mac");
			const t10 = escapeMdV2("В верхнем меню выберите");
			const t11 = escapeMdV2("Файл");
			const t12 = escapeMdV2("Новый календарь подписки");
			const t13 = escapeMdV2("Вставьте ссылку и нажмите");
			const t14 = escapeMdV2("ОК");
			return `👉 ${t1} *${t2}*:\n1\\. ${t3} *${t4}*\\.\n2\\. ${t5} *${t6}* → *${t7}*\\.\n3\\. ${t8}\\.\n\n👉 ${t1} *${t9}*:\n1\\. ${t3} *${t4}*\\.\n2\\. ${t10} *${t11}* → *${t12}*\\.\n3\\. ${t13} *${t14}*\\.`;
		})(),
		yandex: (() => {
			const t1 = escapeMdV2("Если вы с");
			const t2 = escapeMdV2("телефона");
			const t3 = escapeMdV2("Откройте приложение");
			const t4 = escapeMdV2("Яндекс.Календарь");
			const t5 = escapeMdV2("Нажмите меню");
			const t6 = escapeMdV2("Добавить календарь");
			const t7 = escapeMdV2("По ссылке");
			const t8 = escapeMdV2("Вставьте ссылку и подтвердите");
			const t9 = escapeMdV2("компьютера");
			const t10 = escapeMdV2("Перейдите на");
			const t11 = escapeMdV2("Слева выберите");
			const t12 = escapeMdV2("Вставьте ссылку и сохраните");
			const url1 = escapeUrlV2("https://calendar.yandex.ru");
			return `👉 ${t1} *${t2}*:\n1\\. ${t3} *${t4}*\\.\n2\\. ${t5} → *${t6}* → *${t7}*\\.\n3\\. ${t8}\\.\n\n👉 ${t1} *${t9}*:\n1\\. ${t10} [calendar\\.yandex\\.ru](${url1})\\.\n2\\. ${t11} *${t6}* → *${t7}*\\.\n3\\. ${t12}\\.`;
		})(),
		google: (() => {
			const t1 = escapeMdV2("Если вы с");
			const t2 = escapeMdV2("компьютера");
			const t3 = escapeMdV2("Откройте");
			const t4 = escapeMdV2("Google Календарь");
			const t5 = escapeMdV2("Слева найдите");
			const t6 = escapeMdV2("Другие календари");
			const t7 = escapeMdV2("выберите");
			const t8 = escapeMdV2("По URL");
			const t9 = escapeMdV2("Вставьте ссылку и нажмите");
			const t10 = escapeMdV2("Добавить");
			const t11 = escapeMdV2("телефона");
			const t12 = escapeMdV2("Через приложение Google Календарь подписаться нельзя. Но можно открыть");
			const t13 = escapeMdV2("в браузере и выполнить те же шаги, что и на компьютере");
			const url1 = escapeUrlV2("https://calendar.google.com");
			return `👉 ${t1} *${t2}*:\n1\\. ${t3} [${t4}](${url1})\\.\n2\\. ${t5} *${t6}* → «\\+» → ${t7} *${t8}*\\.\n3\\. ${t9} *${t10}*\\.\n\n👉 ${t1} *${t11}*:\n${t12} [calendar\\.google\\.com](${url1}) ${t13}\\.`;
		})(),
		xiaomi: (() => {
			const t1 = escapeMdV2("Если вы с");
			const t2 = escapeMdV2("телефона");
			const t3 = escapeMdV2("Откройте приложение");
			const t4 = escapeMdV2("Календарь");
			const t5 = escapeMdV2("Зайдите в");
			const t6 = escapeMdV2("Настройки");
			const t7 = escapeMdV2("Найдите пункт");
			const t8 = escapeMdV2("Добавить календарь по URL");
			const t9 = escapeMdV2("Вставьте ссылку и сохраните");
			const t10 = escapeMdV2("компьютера");
			const t11 = escapeMdV2("Подписку через Xiaomi сделать нельзя. Используйте другой календарь (Google или Яндекс), а потом включите синхронизацию с телефоном");
			return `👉 ${t1} *${t2}*:\n1\\. ${t3} *${t4}*\\.\n2\\. ${t5} *${t6}*\\.\n3\\. ${t7} *${t8}*\\.\n4\\. ${t9}\\.\n\n👉 ${t1} *${t10}*:\n${t11}\\.`;
		})(),
		other: (() => {
			const t1 = escapeMdV2("К сожалению, точной инструкции нет. Обычно нужно найти в настройках пункт");
			const t2 = escapeMdV2("Добавить календарь по URL");
			const t3 = escapeMdV2("или");
			const t4 = escapeMdV2("Подписка на календарь");
			const t5 = escapeMdV2("и вставить ссылку");
			return `${t1} *${t2}* ${t3} *${t4}* ${t5}\\.`;
		})(),
	},
};

/* -------------------- Проповеди -------------------- */
export const SERMONS = {
	title: (() => {
		const text = escapeMdV2("Раздел: Проповеди");
		return `*${text}*`;
	})(),
	podcasts: (yandexUrl: string, podsterUrl: string) => {
		// Экранируем URL для MarkdownV2
		const escapedYandexUrl = escapeUrlV2(yandexUrl);
		const escapedPodsterUrl = escapeUrlV2(podsterUrl);
		// В MarkdownV2 маркер списка `-` нужно экранировать как `\-`
		return `🎧 Наши проповеди доступны в подкастах:\n\n` +
			`\\- [Яндекс\\.Музыка](${escapedYandexUrl})\n` +
			`\\- [Podster\\.fm](${escapedPodsterUrl})`;
	},
};

/* -------------------- Главное меню -------------------- */
export const MAIN = {
	title: (() => {
		const text = escapeMdV2("Главное меню");
		return `*${text}*\n\n${COMMON.useButtonBelow}`;
	})(),
};

/* -------------------- Наша история -------------------- */
export const HISTORY = (() => {
	// Экранируем URL для MarkdownV2
	const url1 = escapeUrlV2("https://www.nbcerkov.ru/");
	const url2 = escapeUrlV2("https://rbcerkov.ru/");
	const url3 = escapeUrlV2("https://t.me/troitskchurch/7?single");
	// Экранируем текст ссылок
	const link1 = escapeMdV2("Библейской церкви в Новой Москве");
	const link2 = escapeMdV2("Русская библейская церковь");
	const link3 = escapeMdV2("Библейская церковь в Новой Москве");
	const link4 = escapeMdV2("Вы можете прочитать об этом пост в нашем канале");
	// Дефисы в середине текста не нужно экранировать, только если они в начале строки для списка
	return `26 мая 2019 года мы командой из [${link1}](${url1}) посетили Троицк для молитвы \\(такая была традиция общины \\- после воскресного собрания приезжать и молиться за каждый район Новой Москвы\\)\\.
Молились о развитии Троицка, о духовном пробуждении, о том, чтобы в нём появилась группа по изучению Библии и, возможно, в ближайшем будущем даже церковь\\.
Нас было не так много, но мы вдохновились перспективой Божьей работы в этом районе\\. С этого времени мы начали больше молиться о Троицке\\. Спустя месяц, 22 июня во время молитвы Бог положил на сердце идею думать об основании церкви двумя общинами \\- [${link2}](${url2}) и [${link3}](${url1})\\. После такого предложения данная идея не покидала нас, но наоборот, желание по развитию евангельского движения в Новой Москве еще больше усиливалось, пока не воплотилось в жизнь\\.\n\n[${link4}](${url3})`;
})();

export const BELIEF = (() => {
	// Экранируем весь текст для MarkdownV2, но сохраняем форматирование
	const p1 = escapeMdV2("Церковь Святой Троицы существует для того, чтобы принести славу Богу — жить Евангелием и проповедовать его, заботится о людях, готовить зрелых служителей и участвовать в основывании новых церквей.");
	const p2 = escapeMdV2("Жизнь по Евангелию");
	const p3 = escapeMdV2("Мы помогаем каждому человеку поверить, понять и принять Благую весть — Евангелие Христа.");
	const p4 = escapeMdV2("Духовно здоровая церковь");
	const p5 = escapeMdV2("Мы заботимся о духовном росте и зрелости каждого члена церкви, помогая руководствоваться Писанием в жизни, семье и служении.");
	const p6 = escapeMdV2("Городская церковь");
	const p7 = escapeMdV2("Мы церковь, которая концентрирует свои усилия на проповеди Евангелия в городах для распространения истины Христовой повсеместно. Мы отожествляем себя с жителями своего города — стараемся видеть их боли и радости, для того, чтобы принести каждому Божий мир и радость.");
	return `${p1}\n*${p2}*\n${p3}\n*${p4}*\n${p5}\n*${p6}*\n${p7}`;
})();
