export const a = 2;
// src/features/church-calendar.ts
import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { MENU_LABELS } from "../constants/button-lables";
import { replyMainKeyboard } from "../utils/keyboards";
import {
	fetchUpcomingEvents,
	fetchNextEventByTitle,
	fetchAllFutureEventsByTitle,
	fetchHolidayEvent,
	formatEvent,
} from "../services/calendar";

/**
 * Рендер корня раздела «Церковный календарь»
 */
export async function renderCalendarRoot(ctx: MyContext) {
	ctx.session.lastSection = "calendar";
	ctx.session.menuStack = ["calendar"];

	await ctx.reply("📅 Церковный календарь:", {
		reply_markup: {
			keyboard: [
				["Членские собрания", "Молитвенные собрания"],
				["ЛМГ", "Отцы и дети / Встреча сестер"],
				["Большие праздники"],
				["Показать три ближайших события"],
				[MENU_LABELS.BACK, MENU_LABELS.MAIN],
			],
			resize_keyboard: true,
		},
	});
}

/**
 * Регистрирует раздел «Церковный календарь»
 */
export function registerChurchCalendar(bot: Bot<MyContext>) {
	// --- Меню календаря ---
	bot.hears(MENU_LABELS.CALENDAR, async (ctx) => {
		await renderCalendarRoot(ctx);
	});

	// --- 3 ближайших события ---
	bot.hears("Показать три ближайших события", async (ctx) => {
		const events = await fetchUpcomingEvents(3);
		if (events.length === 0) {
			await ctx.reply("Нет запланированных событий.");
			return;
		}
		await ctx.reply("*Ближайшие события:*\n\n" + events.map(formatEvent).join("\n\n"), {
			parse_mode: "Markdown",
		});
	});

	// --- ЛМГ ---
	bot.hears("ЛМГ", async (ctx) => {
		ctx.session.menuStack.push("lmg");
		await ctx.reply("📖 ЛМГ:", {
			reply_markup: {
				keyboard: [
					["Когда будет следующая встреча ЛМГ"],
					["Получить список всех будущих встреч ЛМГ"],
					[MENU_LABELS.BACK, MENU_LABELS.MAIN],
				],
				resize_keyboard: true,
			},
		});
	});

	bot.hears("Когда будет следующая встреча ЛМГ", async (ctx) => {
		const ev = await fetchNextEventByTitle("лмг");
		if (!ev) {
			await ctx.reply("Следующей встречи ЛМГ пока нет.");
			return;
		}
		await ctx.reply("*Следующая встреча ЛМГ:*\n\n" + formatEvent(ev), { parse_mode: "Markdown" });
	});

	bot.hears("Получить список всех будущих встреч ЛМГ", async (ctx) => {
		const events = await fetchAllFutureEventsByTitle("лмг");
		if (events.length === 0) {
			await ctx.reply("Будущих встреч ЛМГ пока нет.");
			return;
		}
		await ctx.reply(events.map(formatEvent).join("\n\n"), { parse_mode: "Markdown" });
	});

	// --- Молитвенные собрания ---
	bot.hears("Молитвенные собрания", async (ctx) => {
		ctx.session.menuStack.push("prayers");
		await ctx.reply("🙏 Молитвенные собрания:", {
			reply_markup: {
				keyboard: [
					["Когда будет следующее молитвенное"],
					["Получить список всех будущих молитвенных"],
					[MENU_LABELS.BACK, MENU_LABELS.MAIN],
				],
				resize_keyboard: true,
			},
		});
	});

	bot.hears("Когда будет следующее молитвенное", async (ctx) => {
		const ev = await fetchNextEventByTitle("молитвенное собрание");
		if (!ev) {
			await ctx.reply("Следующее молитвенное собрание пока не запланировано.");
			return;
		}
		await ctx.reply("*Следующее молитвенное собрание:*\n\n" + formatEvent(ev), {
			parse_mode: "Markdown",
		});
	});

	bot.hears("Получить список всех будущих молитвенных", async (ctx) => {
		const events = await fetchAllFutureEventsByTitle("молитвенное собрание");
		if (events.length === 0) {
			await ctx.reply("Будущих молитвенных собраний пока нет.");
			return;
		}
		await ctx.reply(events.map(formatEvent).join("\n\n"), { parse_mode: "Markdown" });
	});

	// --- Членские собрания ---
	bot.hears("Членские собрания", async (ctx) => {
		ctx.session.menuStack.push("members");
		await ctx.reply("👥 Членские собрания:", {
			reply_markup: {
				keyboard: [
					["Когда будет следующее членское"],
					["Получить список всех будущих членских"],
					[MENU_LABELS.BACK, MENU_LABELS.MAIN],
				],
				resize_keyboard: true,
			},
		});
	});

	bot.hears("Когда будет следующее членское", async (ctx) => {
		const ev = await fetchNextEventByTitle("членское собрание");
		if (!ev) {
			await ctx.reply("Следующее членское собрание пока не запланировано.");
			return;
		}
		await ctx.reply("*Следующее членское собрание:*\n\n" + formatEvent(ev), {
			parse_mode: "Markdown",
		});
	});

	bot.hears("Получить список всех будущих членских", async (ctx) => {
		const events = await fetchAllFutureEventsByTitle("членское собрание");
		if (events.length === 0) {
			await ctx.reply("Будущих членских собраний пока нет.");
			return;
		}
		await ctx.reply(events.map(formatEvent).join("\n\n"), { parse_mode: "Markdown" });
	});

	// --- Большие праздники ---
	bot.hears("Большие праздники", async (ctx) => {
		ctx.session.menuStack.push("holidays");
		await ctx.reply("🎉 Большие праздники:", {
			reply_markup: {
				keyboard: [
					["Узнать даты РВ", "Узнать когда будет Пасха"],
					[MENU_LABELS.BACK, MENU_LABELS.MAIN],
				],
				resize_keyboard: true,
			},
		});
	});

	bot.hears("Узнать даты РВ", async (ctx) => {
		const year = new Date().getFullYear();
		const ev = await fetchHolidayEvent("Рождественский выезд", year);
		if (!ev) {
			await ctx.reply(`В ${year} году Рождественский выезд ещё не запланирован.`);
			return;
		}
		await ctx.reply("*Рождественский выезд:*\n\n" + formatEvent(ev), { parse_mode: "Markdown" });
	});

	bot.hears("Узнать когда будет Пасха", async (ctx) => {
		const year = new Date().getFullYear();
		const ev = await fetchHolidayEvent("пасха", year);
		if (!ev) {
			await ctx.reply(`В ${year} году Пасха ещё не запланирована.`);
			return;
		}
		await ctx.reply("*Пасха:*\n\n" + formatEvent(ev), { parse_mode: "Markdown" });
	});

	// --- Отцы и дети / Встреча сестер ---
	bot.hears("Отцы и дети / Встреча сестер", async (ctx) => {
		ctx.session.menuStack.push("family");
		await ctx.reply("👨‍👩‍👧 Отцы и дети / Встреча сестер:", {
			reply_markup: {
				keyboard: [
					["Когда будет следующая встреча Отцов и детей / сестер"],
					["Получить список всех будущих встреч Отцов и детей / сестер"],
					[MENU_LABELS.BACK, MENU_LABELS.MAIN],
				],
				resize_keyboard: true,
			},
		});
	});

	bot.hears("Когда будет следующая встреча Отцов и детей / сестер", async (ctx) => {
		const ev = await fetchNextEventByTitle("отцы и дети");
		if (!ev) {
			await ctx.reply("Следующая встреча Отцов и детей / сестер пока не запланирована.");
			return;
		}
		await ctx.reply("*Следующая встреча Отцов и детей / сестер:*\n\n" + formatEvent(ev), {
			parse_mode: "Markdown",
		});
	});

	bot.hears("Получить список всех будущих встреч Отцов и детей / сестер", async (ctx) => {
		const events = await fetchAllFutureEventsByTitle("отцы и дети");
		if (events.length === 0) {
			await ctx.reply("Будущих встреч Отцов и детей / сестер пока нет.");
			return;
		}
		await ctx.reply(events.map(formatEvent).join("\n\n"), { parse_mode: "Markdown" });
	});
}
