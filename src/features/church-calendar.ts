// src/features/church-calendar.ts
import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import {
	fetchUpcomingEvents,
	fetchNextEventByTitle,
	fetchAllFutureEventsByTitle,
	fetchHolidayEvent,
	formatEvent,
} from "../services/calendar";
import { MENU_LABELS } from "../constants/button-lables";

/**
 * 📌 Отрисовка корня раздела «Церковный календарь»
 */
export async function renderCalendarRoot(ctx: MyContext) {
	ctx.session.lastSection = "calendar";
	ctx.session.menuStack = ["calendar"];

	await ctx.reply("📅 Церковный календарь:", {
		reply_markup: {
			keyboard: [
				[MENU_LABELS.CALENDAR_MEMBERS, MENU_LABELS.CALENDAR_PRAYER],
				[MENU_LABELS.CALENDAR_LMG, MENU_LABELS.CALENDAR_FAMILY],
				[MENU_LABELS.CALENDAR_NEXT, MENU_LABELS.CALENDAR_HOLIDAYS],
				[MENU_LABELS.BACK],
			],
			resize_keyboard: true,
		},
	});
}

/**
 * 📌 Регистрируем все обработчики для календаря
 */
export function registerChurchCalendar(bot: Bot<MyContext>) {
	// --- Корень календаря ---
	bot.hears(MENU_LABELS.CALENDAR, async (ctx) => {
		await renderCalendarRoot(ctx);
	});

	// --- Ближайшие события ---
	bot.hears(MENU_LABELS.CALENDAR_NEXT, async (ctx) => {
		const events = await fetchUpcomingEvents(5);
		if (events.length === 0) {
			return ctx.reply("Нет запланированных событий.");
		}
		await ctx.reply("*Ближайшие события:*\n\n" + events.map(formatEvent).join("\n\n"), {
			parse_mode: "Markdown",
		});
	});

	// === ЛМГ ===
	bot.hears(MENU_LABELS.CALENDAR_LMG, async (ctx) => {
		ctx.session.menuStack.push("lmg");
		await ctx.reply("📖 ЛМГ:", {
			reply_markup: {
				keyboard: [
					[MENU_LABELS.LMG_NEXT, MENU_LABELS.LMG_ALL],
					[MENU_LABELS.BACK, MENU_LABELS.MAIN],
				],
				resize_keyboard: true,
			},
		});
	});

	bot.hears(MENU_LABELS.LMG_NEXT, async (ctx) => {
		const ev = await fetchNextEventByTitle("лмг");
		if (!ev) return ctx.reply("Следующей встречи ЛМГ пока нет.");
		await ctx.reply("*Следующая встреча ЛМГ:*\n\n" + formatEvent(ev), { parse_mode: "Markdown" });
	});

	bot.hears(MENU_LABELS.LMG_ALL, async (ctx) => {
		const events = await fetchAllFutureEventsByTitle("лмг");
		if (events.length === 0) return ctx.reply("Будущих встреч ЛМГ пока нет.");
		await ctx.reply(events.map(formatEvent).join("\n\n"), { parse_mode: "Markdown" });
	});

	// === Молитвенные собрания ===
	bot.hears(MENU_LABELS.CALENDAR_PRAYER, async (ctx) => {
		ctx.session.menuStack.push("prayers");
		await ctx.reply("🙏 Молитвенные собрания:", {
			reply_markup: {
				keyboard: [
					[MENU_LABELS.PRAYER_NEXT, MENU_LABELS.PRAYER_ALL],
					[MENU_LABELS.BACK, MENU_LABELS.MAIN],
				],
				resize_keyboard: true,
			},
		});
	});

	bot.hears(MENU_LABELS.PRAYER_NEXT, async (ctx) => {
		const ev = await fetchNextEventByTitle("молитвенное собрание");
		if (!ev) return ctx.reply("Следующее молитвенное собрание пока не запланировано.");
		await ctx.reply("*Следующее молитвенное собрание:*\n\n" + formatEvent(ev), {
			parse_mode: "Markdown",
		});
	});

	bot.hears(MENU_LABELS.PRAYER_ALL, async (ctx) => {
		const events = await fetchAllFutureEventsByTitle("молитвенное собрание");
		if (events.length === 0) return ctx.reply("Будущих молитвенных собраний пока нет.");
		await ctx.reply(events.map(formatEvent).join("\n\n"), { parse_mode: "Markdown" });
	});

	// === Членские собрания ===
	bot.hears(MENU_LABELS.CALENDAR_MEMBERS, async (ctx) => {
		ctx.session.menuStack.push("members");
		await ctx.reply("👥 Членские собрания:", {
			reply_markup: {
				keyboard: [
					[MENU_LABELS.MEMBERS_NEXT, MENU_LABELS.MEMBERS_ALL],
					[MENU_LABELS.BACK, MENU_LABELS.MAIN],
				],
				resize_keyboard: true,
			},
		});
	});

	bot.hears(MENU_LABELS.MEMBERS_NEXT, async (ctx) => {
		const ev = await fetchNextEventByTitle("членское собрание");
		if (!ev) return ctx.reply("Следующее членское собрание пока не запланировано.");
		await ctx.reply("*Следующее членское собрание:*\n\n" + formatEvent(ev), {
			parse_mode: "Markdown",
		});
	});

	bot.hears(MENU_LABELS.MEMBERS_ALL, async (ctx) => {
		const events = await fetchAllFutureEventsByTitle("членское собрание");
		if (events.length === 0) return ctx.reply("Будущих членских собраний пока нет.");
		await ctx.reply(events.map(formatEvent).join("\n\n"), { parse_mode: "Markdown" });
	});

	// === Большие праздники ===
	bot.hears(MENU_LABELS.CALENDAR_HOLIDAYS, async (ctx) => {
		ctx.session.menuStack.push("holidays");
		await ctx.reply("🎉 Большие праздники:", {
			reply_markup: {
				keyboard: [
					[MENU_LABELS.HOLIDAY_RV, MENU_LABELS.HOLIDAY_EASTER],
					[MENU_LABELS.BACK, MENU_LABELS.MAIN],
				],
				resize_keyboard: true,
			},
		});
	});

	bot.hears(MENU_LABELS.HOLIDAY_RV, async (ctx) => {
		const year = new Date().getFullYear();
		const res = await fetchHolidayEvent("Рождественский выезд");

		if (res.status === "not_found") {
			return ctx.reply(`В ${year} году Рождественский выезд ещё не запланирован в церковном календаре.`);
		}

		if (res.status === "past") {
			return ctx.reply(
				`В следующем году Рождественский выезд ещё не запланирован в церковном календаре, а в ${year} году он проходил:\n\n${formatEvent(
					res.event
				)}`,
				{ parse_mode: "Markdown" }
			);
		}

		if (res.status === "future") {
			return ctx.reply(`*Рождественский выезд:*\n\n${formatEvent(res.event)}`, {
				parse_mode: "Markdown",
			});
		}
	});

	bot.hears(MENU_LABELS.HOLIDAY_EASTER, async (ctx) => {
		const year = new Date().getFullYear();
		const res = await fetchHolidayEvent("пасха");

		if (res.status === "not_found") {
			return ctx.reply(`В ${year} году Пасха ещё не запланирована в церковном календаре.`);
		}

		if (res.status === "past") {
			return ctx.reply(
				`В следующем году Пасха ещё не запланирована в церковном календаре, а в ${year} году она проходила:\n\n${formatEvent(
					res.event
				)}`,
				{ parse_mode: "Markdown" }
			);
		}

		if (res.status === "future") {
			return ctx.reply(`*Пасха:*\n\n${formatEvent(res.event)}`, {
				parse_mode: "Markdown",
			});
		}
	});

	// === Отцы и дети / Сёстры ===
	bot.hears(MENU_LABELS.CALENDAR_FAMILY, async (ctx) => {
		ctx.session.menuStack.push("family");
		await ctx.reply("👨‍👩‍👧 Отцы и дети / Сёстры:", {
			reply_markup: {
				keyboard: [
					[MENU_LABELS.FAMILY_NEXT, MENU_LABELS.FAMILY_ALL],
					[MENU_LABELS.BACK, MENU_LABELS.MAIN],
				],
				resize_keyboard: true,
			},
		});
	});

	bot.hears(MENU_LABELS.FAMILY_NEXT, async (ctx) => {
		const ev = await fetchNextEventByTitle("отцы и дети");
		if (!ev) return ctx.reply("Следующая встреча пока не запланирована.");
		await ctx.reply("*Следующая встреча:*\n\n" + formatEvent(ev), { parse_mode: "Markdown" });
	});

	bot.hears(MENU_LABELS.FAMILY_ALL, async (ctx) => {
		const events = await fetchAllFutureEventsByTitle("отцы и дети");
		if (events.length === 0) return ctx.reply("Будущих встреч пока нет.");
		await ctx.reply(events.map(formatEvent).join("\n\n"), { parse_mode: "Markdown" });
	});
}
