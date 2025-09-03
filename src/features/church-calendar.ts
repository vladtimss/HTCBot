import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import {
	fetchUpcomingEvents,
	fetchNextEventByTitle,
	fetchAllFutureEventsByTitle,
	fetchHolidayEvent,
	formatEvent,
} from "../services/calendar";
import { MENU_LABELS } from "../constants/button-lables";
import { CALENDAR } from "../services/texts";
import {
	replyCalendarMenu,
	replyCalendarLmgMenu,
	replyCalendarPrayerMenu,
	replyCalendarMembersMenu,
	replyCalendarHolidaysMenu,
	replyCalendarFamilyMenu,
	subscribeKeyboard,
} from "../utils/keyboards";
import { requirePrivileged } from "../utils/guards";
import { env } from "../config/env";

/**
 * 📌 Отрисовка корня раздела «Церковный календарь»
 */
export async function renderCalendarRoot(ctx: MyContext) {
	ctx.session.lastSection = "calendar";
	ctx.session.menuStack = ["calendar"];

	await ctx.reply(CALENDAR.title, {
		reply_markup: replyCalendarMenu,
	});
}

/**
 * Отрисовка кнопок с выбором инструкций
 * @param ctx
 * @param title
 * @param body
 */
async function replyInstruction(ctx: MyContext, title: string, body: string) {
	if (!requirePrivileged(ctx)) return;

	await ctx.editMessageText(`*${title}*\n\n${body}\n\n*Ссылка для подписки:*\n\n${env.CALENDAR_SUBSCRIBE_URL}\n`, {
		parse_mode: "Markdown",
		reply_markup: new InlineKeyboard().text("⬅️ Назад", "calendar:instructions"),
		link_preview_options: { is_disabled: true },
	});
}
/**
 * 📌 Регистрируем все обработчики для календаря
 */
export function registerChurchCalendar(bot: Bot<MyContext>) {
	// --- Корень календаря ---
	bot.hears(MENU_LABELS.CALENDAR, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		await renderCalendarRoot(ctx);
	});

	// --- Ближайшие события ---
	bot.hears(MENU_LABELS.CALENDAR_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await fetchUpcomingEvents(5);
		if (events.length === 0) {
			return ctx.reply(CALENDAR.noEvents);
		}
		await ctx.reply(CALENDAR.nextEventsTitle + "\n\n" + events.map(formatEvent).join("\n\n"), {
			parse_mode: "Markdown",
		});
	});

	// === ЛМГ ===
	bot.hears(MENU_LABELS.CALENDAR_LMG, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("lmg");
		await ctx.reply(CALENDAR.lmgTitle, {
			reply_markup: replyCalendarLmgMenu,
		});
	});

	bot.hears(MENU_LABELS.LMG_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const ev = await fetchNextEventByTitle("лмг");
		if (!ev) return ctx.reply(CALENDAR.lmgNone);
		await ctx.reply(CALENDAR.lmgNext + "\n\n" + formatEvent(ev), { parse_mode: "Markdown" });
	});

	bot.hears(MENU_LABELS.LMG_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await fetchAllFutureEventsByTitle("лмг");
		if (events.length === 0) return ctx.reply(CALENDAR.lmgNoneAll);
		await ctx.reply(events.map(formatEvent).join("\n\n"), { parse_mode: "Markdown" });
	});

	// === Молитвенные собрания ===
	bot.hears(MENU_LABELS.CALENDAR_PRAYER, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("prayers");
		await ctx.reply(CALENDAR.prayersTitle, {
			reply_markup: replyCalendarPrayerMenu,
		});
	});

	bot.hears(MENU_LABELS.PRAYER_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const ev = await fetchNextEventByTitle("молитвенное собрание");
		if (!ev) return ctx.reply(CALENDAR.prayersNone);
		await ctx.reply(CALENDAR.prayersNext + "\n\n" + formatEvent(ev), {
			parse_mode: "Markdown",
		});
	});

	bot.hears(MENU_LABELS.PRAYER_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await fetchAllFutureEventsByTitle("молитвенное собрание");
		if (events.length === 0) return ctx.reply(CALENDAR.prayersNoneAll);
		await ctx.reply(events.map(formatEvent).join("\n\n"), { parse_mode: "Markdown" });
	});

	// === Членские собрания ===
	bot.hears(MENU_LABELS.CALENDAR_MEMBERS, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("members");
		await ctx.reply(CALENDAR.membersTitle, {
			reply_markup: replyCalendarMembersMenu,
		});
	});

	bot.hears(MENU_LABELS.MEMBERS_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const ev = await fetchNextEventByTitle("членское собрание");
		if (!ev) return ctx.reply(CALENDAR.membersNone);
		await ctx.reply(CALENDAR.membersNext + "\n\n" + formatEvent(ev), {
			parse_mode: "Markdown",
		});
	});

	bot.hears(MENU_LABELS.MEMBERS_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await fetchAllFutureEventsByTitle("членское собрание");
		if (events.length === 0) return ctx.reply(CALENDAR.membersNoneAll);
		await ctx.reply(events.map(formatEvent).join("\n\n"), { parse_mode: "Markdown" });
	});

	// === Большие праздники ===
	bot.hears(MENU_LABELS.CALENDAR_HOLIDAYS, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("holidays");
		await ctx.reply(CALENDAR.holidaysTitle, {
			reply_markup: replyCalendarHolidaysMenu,
		});
	});

	bot.hears(MENU_LABELS.HOLIDAY_RV, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const year = new Date().getFullYear();
		const res = await fetchHolidayEvent("Рождественский выезд");

		if (res.status === "not_found") {
			return ctx.reply(CALENDAR.rvNotPlanned(year));
		}

		if (res.status === "past") {
			return ctx.reply(CALENDAR.rvPast(year, formatEvent(res.event)), { parse_mode: "Markdown" });
		}

		if (res.status === "future") {
			return ctx.reply(CALENDAR.rvFuture(formatEvent(res.event)), { parse_mode: "Markdown" });
		}
	});

	bot.hears(MENU_LABELS.HOLIDAY_EASTER, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const year = new Date().getFullYear();
		const res = await fetchHolidayEvent("пасха");

		if (res.status === "not_found") {
			return ctx.reply(CALENDAR.easterNotPlanned(year));
		}

		if (res.status === "past") {
			return ctx.reply(CALENDAR.easterPast(year, formatEvent(res.event)), {
				parse_mode: "Markdown",
			});
		}

		if (res.status === "future") {
			return ctx.reply(CALENDAR.easterFuture(formatEvent(res.event)), { parse_mode: "Markdown" });
		}
	});

	// === Отцы и дети / Сёстры ===
	bot.hears(MENU_LABELS.CALENDAR_FAMILY, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("family");
		await ctx.reply(CALENDAR.familyTitle, {
			reply_markup: replyCalendarFamilyMenu,
		});
	});

	bot.hears(MENU_LABELS.FAMILY_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const ev = await fetchNextEventByTitle("отцы и дети");
		if (!ev) return ctx.reply(CALENDAR.familyNone);
		await ctx.reply(CALENDAR.familyNext + "\n\n" + formatEvent(ev), { parse_mode: "Markdown" });
	});

	bot.hears(MENU_LABELS.FAMILY_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await fetchAllFutureEventsByTitle("отцы и дети");
		if (events.length === 0) return ctx.reply(CALENDAR.familyNoneAll);
		await ctx.reply(events.map(formatEvent).join("\n\n"), { parse_mode: "Markdown" });
	});

	bot.hears(MENU_LABELS.CALENDAR_SUBSCRIBE, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		await ctx.reply(CALENDAR.yourCalendarUsing, {
			parse_mode: "Markdown",
			reply_markup: subscribeKeyboard(),
		});
	});

	// Список инстуркций
	bot.callbackQuery("calendar:instructions", async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		await ctx.answerCallbackQuery().catch(() => {});

		await ctx.reply(CALENDAR.yourCalendarUsing, {
			parse_mode: "Markdown",
			reply_markup: subscribeKeyboard(),
		});
	});

	// ---------- инструкции для подписки на календарь -------------

	bot.callbackQuery("calendar:sub:apple", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Apple", CALENDAR.subscribeInstructions.apple);
	});

	bot.callbackQuery("calendar:sub:yandex", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Яндекс", CALENDAR.subscribeInstructions.yandex);
	});

	bot.callbackQuery("calendar:sub:google", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Google", CALENDAR.subscribeInstructions.google);
	});

	bot.callbackQuery("calendar:sub:xiomi", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Xiaomi / MIUI", CALENDAR.subscribeInstructions.xiaomi);
	});

	bot.callbackQuery("calendar:sub:other", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Другие приложения", CALENDAR.subscribeInstructions.other);
	});
}
