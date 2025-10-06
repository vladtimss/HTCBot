import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import {
	SMALL_GROUPS,
	WEEKDAYS_PRESENT,
	WEEKDAY_TITLE,
	DISTRICTS,
	Weekday,
	SmallGroup,
	DISTRICT_MAP,
} from "../data/small-groups";
import { COMMON, SMALL_GROUPS_TEXTS } from "../services/texts";
import { inlineLmgTrip, replyGroupsMenu } from "../utils/keyboards";
import {
	fetchAllFutureEventsByTitle,
	fetchHolidayEvent,
	fetchNextEventByTitle,
	formatEvent,
} from "../services/calendar";
import { MENU_LABELS } from "../constants/button-lables";
import { requirePrivileged } from "../utils/guards";
import { withLoading } from "../utils/loading";

/**
 * Форматирует информацию об одной малой группе в виде «карточки» (Markdown).
 */
function formatGroup(g: SmallGroup): string {
	const leaders = g.leaders
		.map((l) => {
			if (l.tgUserName) {
				return `👤 [${l.firstName}](https://t.me/${l.tgUserName})`;
			}
			if (l.tgId) {
				return `👤 [${l.firstName}](tg://user?id=${l.tgId})`;
			}
			return `👤 ${l.firstName}`;
		})
		.join("\n");

	const addresses = g.addresses.map((a) => `📍 [${a.address}](${a.mapUrl})`).join("\n");

	return [
		`*✨ ${g.title}*`,
		"",
		`🗓 _${WEEKDAY_TITLE[g.weekday]}, начало в ${g.time}_`,
		"",
		addresses,
		"",
		"_(Напишите ведущим, если хотите что-то уточнить - нажмите на имя 👇)_\n",
		leaders,
	].join("\n");
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
 * Рендер корня раздела «Малые группы»
 */
export async function renderGroupsRoot(ctx: MyContext) {
	ctx.session.menuStack = ["groups"];
	ctx.session.lastSection = "groups";

	const isPrivileged = ctx.access?.isPrivileged;

	await ctx.reply(
		`*${SMALL_GROUPS_TEXTS.title}*\n\n${
			isPrivileged ? SMALL_GROUPS_TEXTS.descriptionForMembers : SMALL_GROUPS_TEXTS.descriptionForOther
		}\n\n${COMMON.useButtonBelow}`,
		{
			parse_mode: "Markdown",
			reply_markup: replyGroupsMenu(ctx),
		}
	);
}

/**
 * Регистрирует обработчики для раздела "Малые группы"
 */
export function registerSmallGroups(bot: Bot<MyContext>) {
	// Вход в раздел «Малые группы»
	bot.hears(MENU_LABELS.GROUPS, async (ctx) => {
		await renderGroupsRoot(ctx);
	});

	// «📅 По дням»
	bot.hears(SMALL_GROUPS_TEXTS.byDay, async (ctx) => {
		if (!ctx.session.menuStack) ctx.session.menuStack = ["groups"];
		ctx.session.menuStack.push("groups/byday");
		ctx.session.lastSection = "groups/byday";

		await ctx.reply(`*${SMALL_GROUPS_TEXTS.chooseDay}*`, {
			parse_mode: "Markdown",
			reply_markup: makeWeekdaysKeyboard(),
		});
	});

	// «📍 По районам»
	bot.hears(SMALL_GROUPS_TEXTS.byDistrict, async (ctx) => {
		if (!ctx.session.menuStack) ctx.session.menuStack = ["groups"];
		ctx.session.menuStack.push("groups/bydistrict");
		ctx.session.lastSection = "groups/bydistrict";

		await ctx.reply(`*${SMALL_GROUPS_TEXTS.chooseDistrict}*`, {
			parse_mode: "Markdown",
			reply_markup: makeDistrictsKeyboard(),
		});
	});

	// Выбор дня → список групп
	bot.callbackQuery(/groups:day:(MON|TUE|WED|THU|FRI|SAT|SUN)/, async (ctx) => {
		const day = ctx.match![1] as Weekday;
		await ctx.answerCallbackQuery().catch(() => {});

		const list = SMALL_GROUPS.filter((g) => g.weekday === day);

		await ctx.reply(`*${WEEKDAY_TITLE[day]} — группы:*`, {
			parse_mode: "Markdown",
			link_preview_options: { is_disabled: true },
		});

		for (let i = 0; i < list.length; i++) {
			const g = list[i];
			const isLast = i === list.length - 1;

			await ctx.reply(formatGroup(g), {
				parse_mode: "Markdown",
				link_preview_options: { is_disabled: true },
				reply_markup: isLast ? new InlineKeyboard().text("⬅️ К дням", "groups:byday") : undefined,
			});
		}
	});

	// Возврат к списку дней
	bot.callbackQuery("groups:byday", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await ctx.reply(`*${SMALL_GROUPS_TEXTS.chooseDay}*`, {
			parse_mode: "Markdown",
			reply_markup: makeWeekdaysKeyboard(),
		});
	});

	// Выбор района → список групп
	bot.callbackQuery(/groups:district:(.+)/, async (ctx) => {
		const districtKey = ctx.match![1];
		const districtName = DISTRICT_MAP[districtKey] ?? districtKey;

		await ctx.answerCallbackQuery().catch(() => {});

		const list = SMALL_GROUPS.filter((g) => g.region === districtKey);

		await ctx.reply(`*${districtName} — группы:*`, {
			parse_mode: "Markdown",
			link_preview_options: { is_disabled: true },
		});

		for (let i = 0; i < list.length; i++) {
			const g = list[i];
			const isLast = i === list.length - 1;

			await ctx.reply(formatGroup(g), {
				parse_mode: "Markdown",
				link_preview_options: { is_disabled: true },
				reply_markup: isLast ? new InlineKeyboard().text("⬅️ К районам", "groups:bydistrict") : undefined,
			});
		}
	});

	// Возврат к списку районов
	bot.callbackQuery("groups:bydistrict", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await ctx.reply(`*${SMALL_GROUPS_TEXTS.chooseDistrict}*`, {
			parse_mode: "Markdown",
			reply_markup: makeDistrictsKeyboard(),
		});
	});

	// Когда следующая встреча ЛМГ
	bot.hears(MENU_LABELS.LMG_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const nextLm = await withLoading(ctx, () => fetchNextEventByTitle("Встреча ЛМГ"), {
			text: "⏳ Ищу ближайшую встречу ЛМГ…",
		});

		if (!nextLm) {
			await ctx.reply(SMALL_GROUPS_TEXTS.noNextLmg);
			return;
		}
		await ctx.reply(formatEvent(nextLm), { parse_mode: "Markdown" });
	});

	// Все встречи ЛМГ до конца сезона
	bot.hears(MENU_LABELS.LMG_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const lmEvents = await withLoading(ctx, () => fetchAllFutureEventsByTitle("Встреча ЛМГ"), {
			text: "⏳ Получаю все будущие встречи ЛМГ…",
		});

		if (lmEvents.length === 0) {
			await ctx.reply(SMALL_GROUPS_TEXTS.noFutureLmg);
			return;
		}
		const list = lmEvents.map((e) => formatEvent(e, true)).join("\n\n");
		await ctx.reply(`${SMALL_GROUPS_TEXTS.lmgSeasonList}\n\n${list}`, {
			parse_mode: "Markdown",
		});
	});

	// Выезд ЛМГ
	bot.hears(MENU_LABELS.LMG_TRIP, async (ctx) => {
		if (!requirePrivileged(ctx)) return;
		await ctx.reply("*Выезд ЛМГ*", {
			parse_mode: "Markdown",
			reply_markup: inlineLmgTrip,
		});
	});

	// Обработка inline-кнопки «Даты выезда»
	bot.callbackQuery("lmg_trip_dates", async (ctx) => {
		if (!requirePrivileged(ctx)) return;
		const res = await withLoading(ctx, () => fetchHolidayEvent("Выезд ЛМГ"), {
			text: "🚌 Проверяю даты выезда…",
		});

		if (res.status === "not_found") {
			await ctx.answerCallbackQuery({ text: "Даты пока не запланированы", show_alert: true });
			return;
		}

		const msg =
			res.status === "future"
				? formatEvent(res.event)
				: res.status === "past"
				? `Последний выезд был:\n\n${formatEvent(res.event)}`
				: "Нет данных по выезду";

		await ctx.reply(msg, { parse_mode: "Markdown" });
		await ctx.answerCallbackQuery();
	});
}
