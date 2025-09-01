import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import {
	GROUPS,
	WEEKDAYS_PRESENT,
	WEEKDAY_TITLE,
	DISTRICTS,
	Weekday,
	SmallGroup,
	DISTRICT_MAP,
} from "../data/small-groups";
import { replyGroupsMenu } from "../utils/keyboards";
import { fetchLmEventsUntilSeasonEnd, formatEvent } from "../services/calendar";
import { MENU_LABELS } from "../constants/button-lables";

/**
 * Форматирует информацию об одной малой группе в виде HTML-текста
 */
function formatGroup(g: SmallGroup): string {
	const leaders = g.leaders.map((l) => `👤 ${l.firstName} — ${l.phone}`).join("\n");
	const addresses = g.addresses.map((a) => `📍 <a href="${a.mapUrl}">${a.address}</a>`).join("\n");
	return `<b>${g.title}</b>\n🗓 ${WEEKDAY_TITLE[g.weekday]}, начало в ${g.time}\n${addresses}\n${leaders}`;
}

/**
 * Генерация inline-клавиатуры для выбора дня недели
 */
function makeWeekdaysKeyboard() {
	const kb = new InlineKeyboard();
	WEEKDAYS_PRESENT.forEach((d) => kb.text(WEEKDAY_TITLE[d], `groups:day:${d}`).row());
	return kb;
}

/**
 * Генерация inline-клавиатуры для выбора района
 */
function makeDistrictsKeyboard() {
	const kb = new InlineKeyboard();
	DISTRICTS.forEach((districtKey) => {
		const districtName = DISTRICT_MAP[districtKey] ?? districtKey;
		kb.text(districtName, `groups:district:${districtKey}`).row();
	});
	return kb;
}

/**
 * Регистрирует обработчики для раздела "Малые группы"
 */
export function registerSmallGroups(bot: Bot<MyContext>) {
	/**
	 * Вход в раздел «Малые группы» (reply-кнопка)
	 */
	bot.hears(MENU_LABELS.GROUPS, async (ctx) => {
		await ctx.reply("*Малые группы*", {
			parse_mode: "Markdown",
			reply_markup: replyGroupsMenu,
		});
	});

	/**
	 * «📅 По дням» → список доступных дней (inline-клавиатура)
	 */
	bot.hears("📅 По дням", async (ctx) => {
		await ctx.reply("*Выберите день:*", {
			parse_mode: "Markdown",
			reply_markup: makeWeekdaysKeyboard(),
		});
	});

	/**
	 * «📍 По районам» → список доступных районов (inline-клавиатура)
	 */
	bot.hears("📍 По районам", async (ctx) => {
		await ctx.reply("*Выберите район:*", {
			parse_mode: "Markdown",
			reply_markup: makeDistrictsKeyboard(),
		});
	});

	/**
	 * Выбор дня → вывод списка групп в этот день
	 */
	bot.callbackQuery(/groups:day:(MON|TUE|WED|THU|FRI|SAT|SUN)/, async (ctx) => {
		const day = ctx.match![1] as Weekday;
		await ctx.answerCallbackQuery().catch(() => {});
		const list = GROUPS.filter((g) => g.weekday === day);

		// Заголовок выбранного дня
		await ctx.reply(`<b>${WEEKDAY_TITLE[day]} — группы:</b>`, {
			parse_mode: "HTML",
			link_preview_options: { is_disabled: true },
		});

		// Каждая группа отдельным сообщением
		for (let i = 0; i < list.length; i++) {
			const g = list[i];
			const isLast = i === list.length - 1;

			await ctx.reply(formatGroup(g), {
				parse_mode: "HTML",
				link_preview_options: { is_disabled: true },
				// Кнопка возврата "К дням" внизу последнего сообщения
				reply_markup: isLast ? new InlineKeyboard().text("⬅️ К дням", "groups:byday") : undefined,
			});
		}
	});

	/**
	 * Возврат к списку дней
	 */
	bot.callbackQuery("groups:byday", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await ctx.reply("*Выберите день:*", {
			parse_mode: "Markdown",
			reply_markup: makeWeekdaysKeyboard(),
		});
	});

	/**
	 * Выбор района → вывод списка групп в этом районе
	 */
	bot.callbackQuery(/groups:district:(.+)/, async (ctx) => {
		const districtKey = ctx.match![1];
		const districtName = DISTRICT_MAP[districtKey] ?? districtKey;

		await ctx.answerCallbackQuery().catch(() => {});
		const list = GROUPS.filter((g) => g.region === districtKey);

		// Заголовок выбранного района
		await ctx.reply(`<b>${districtName} — группы:</b>`, {
			parse_mode: "HTML",
			link_preview_options: { is_disabled: true },
		});

		// Каждая группа отдельным сообщением
		for (let i = 0; i < list.length; i++) {
			const g = list[i];
			const isLast = i === list.length - 1;

			await ctx.reply(formatGroup(g), {
				parse_mode: "HTML",
				link_preview_options: { is_disabled: true },
				// Кнопка возврата "К районам" только у последнего сообщения
				reply_markup: isLast ? new InlineKeyboard().text("⬅️ К районам", "groups:bydistrict") : undefined,
			});
		}
	});

	/**
	 * Возврат к списку районов
	 */
	bot.callbackQuery("groups:bydistrict", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await ctx.reply("*Выберите район:*", {
			parse_mode: "Markdown",
			reply_markup: makeDistrictsKeyboard(),
		});
	});

	/**
	 * Когда следующая встреча ЛМГ
	 */
	bot.hears(MENU_LABELS.NEXTLMG, async (ctx) => {
		const events = await fetchLmEventsUntilSeasonEnd();
		const nextLm = events[0];

		if (!nextLm) {
			await ctx.reply("😔 Ближайших встреч ЛМГ в этом сезоне не найдено.");
			return;
		}
		await ctx.reply(formatEvent(nextLm), { parse_mode: "Markdown" });
	});

	/**
	 * Все встречи ЛМГ до конца сезона
	 */
	bot.hears(MENU_LABELS.ALL_LMG, async (ctx) => {
		const lmEvents = await fetchLmEventsUntilSeasonEnd();

		if (lmEvents.length === 0) {
			await ctx.reply("😔 В этом сезоне встреч ЛМГ больше нет.");
			return;
		}

		const list = lmEvents.map(formatEvent).join("\n\n");
		await ctx.reply(`📖 *Список встреч ЛМГ до конца сезона:*\n\n${list}`, {
			parse_mode: "Markdown",
		});
	});
}
