/**
 * features/small-groups/small-groups.feature.ts
 * --------------------------
 * Логика раздела "Малые группы"
 */

import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../../types/grammy-context";
import {
	SMALL_GROUPS,
	WEEKDAY_TITLE,
	Weekday,
	DISTRICT_MAP,
} from "../../data/small-groups";
import { COMMON } from "../../services/texts"; // Глобальный текст, используется во множестве фич
import { SMALL_GROUPS_TEXTS } from "./small-groups.texts";
import { replyGroupsMenu, inlineLmgTrip, makeWeekdaysKeyboard, makeDistrictsKeyboard } from "./small-groups.keyboard";
import {
	fetchAllFutureEventsByTitle,
	fetchHolidayEvent,
	fetchNextEventByTitle,
	formatEvent,
} from "../../services/calendar";
import { SMALL_GROUPS_BUTTON_LABELS } from "./small-groups.constants";
import { MENU_LABELS } from "../../constants/button-lables"; // Глобальные константы главного меню
import { requirePrivileged } from "../../utils/guards";
import { withLoading } from "../../utils/loading";
import { formatGroup } from "./small-groups.util";
import { fmt, bold } from "@grammyjs/parse-mode";
import { replyFormatted } from "../../utils/format-helpers";

/**
 * Рендер корня раздела «Малые группы»
 */
export async function renderGroupsRoot(ctx: MyContext) {
	ctx.session.menuStack = ["groups"];
	ctx.session.lastSection = "groups";

	const isPrivileged = ctx.access?.isPrivileged;

	const text = fmt`${bold()}${SMALL_GROUPS_TEXTS.title}${bold()}

${isPrivileged ? SMALL_GROUPS_TEXTS.descriptionForMembers : SMALL_GROUPS_TEXTS.descriptionForOther}${COMMON.useButtonBelow}`;

	await replyFormatted(ctx, text, {
		reply_markup: replyGroupsMenu(ctx),
	});
}

/**
 * Регистрирует обработчики для раздела "Малые группы"
 */
export function registerSmallGroups(bot: Bot<MyContext>) {
	// Вход в раздел «Малые группы»
	bot.hears(MENU_LABELS.MAIN_GROUPS, async (ctx) => {
		await renderGroupsRoot(ctx);
	});

	// «📅 По дням»
	bot.hears(SMALL_GROUPS_BUTTON_LABELS.LMG_GROUPS_BY_DAY, async (ctx) => {
		if (!ctx.session.menuStack) ctx.session.menuStack = ["groups"];
		ctx.session.menuStack.push("groups/byday");
		ctx.session.lastSection = "groups/byday";

		const chooseDayText = fmt`${bold()}${SMALL_GROUPS_TEXTS.chooseDay}${bold()}`;
		await replyFormatted(ctx, chooseDayText, {
			reply_markup: makeWeekdaysKeyboard(),
		});
	});

	// «📍 По районам»
	bot.hears(SMALL_GROUPS_BUTTON_LABELS.LMG_GROUPS_BY_DISTRICT, async (ctx) => {
		if (!ctx.session.menuStack) ctx.session.menuStack = ["groups"];
		ctx.session.menuStack.push("groups/bydistrict");
		ctx.session.lastSection = "groups/bydistrict";

		const chooseDistrictText = fmt`${bold()}${SMALL_GROUPS_TEXTS.chooseDistrict}${bold()}`;
		await replyFormatted(ctx, chooseDistrictText, {
			reply_markup: makeDistrictsKeyboard(),
		});
	});

	// Выбор дня → список групп
	bot.callbackQuery(/groups:day:(MON|TUE|WED|THU|FRI|SAT|SUN)/, async (ctx) => {
		const day = ctx.match![1] as Weekday;
		await ctx.answerCallbackQuery().catch(() => {});

		const list = SMALL_GROUPS.filter((g) => g.weekday === day);

		const text = fmt`${bold()}${WEEKDAY_TITLE[day]} — группы:${bold()}`;
		await replyFormatted(ctx, text, {
			link_preview_options: { is_disabled: true },
		});

		for (let i = 0; i < list.length; i++) {
			const g = list[i];
			const isLast = i === list.length - 1;

			await ctx.reply(formatGroup(g), {
				parse_mode: "MarkdownV2",
				link_preview_options: { is_disabled: true },
				reply_markup: isLast ? new InlineKeyboard().text(SMALL_GROUPS_BUTTON_LABELS.LMG_GROUPS_BACK_TO_DAYS, "groups:byday") : undefined,
			});
		}
	});

	// Возврат к списку дней
	bot.callbackQuery("groups:byday", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		const chooseDayText = fmt`${bold()}${SMALL_GROUPS_TEXTS.chooseDay}${bold()}`;
		await replyFormatted(ctx, chooseDayText, {
			reply_markup: makeWeekdaysKeyboard(),
		});
	});

	// Выбор района → список групп
	bot.callbackQuery(/groups:district:(.+)/, async (ctx) => {
		const districtKey = ctx.match![1];
		const districtName = DISTRICT_MAP[districtKey] ?? districtKey;

		await ctx.answerCallbackQuery().catch(() => {});

		const list = SMALL_GROUPS.filter((g) => g.region === districtKey);

		const text = fmt`${bold()}${districtName} — группы:${bold()}`;
		await replyFormatted(ctx, text, {
			link_preview_options: { is_disabled: true },
		});

		for (let i = 0; i < list.length; i++) {
			const g = list[i];
			const isLast = i === list.length - 1;

			await ctx.reply(formatGroup(g), {
				parse_mode: "MarkdownV2",
				link_preview_options: { is_disabled: true },
				reply_markup: isLast ? new InlineKeyboard().text(SMALL_GROUPS_BUTTON_LABELS.LMG_GROUPS_BACK_TO_DISTRICTS, "groups:bydistrict") : undefined,
			});
		}
	});

	// Возврат к списку районов
	bot.callbackQuery("groups:bydistrict", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		const chooseDistrictText = fmt`${bold()}${SMALL_GROUPS_TEXTS.chooseDistrict}${bold()}`;
		await replyFormatted(ctx, chooseDistrictText, {
			reply_markup: makeDistrictsKeyboard(),
		});
	});

	// Когда следующая встреча ЛМГ
	bot.hears(SMALL_GROUPS_BUTTON_LABELS.LMG_CAL_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const nextLm = await withLoading(ctx, () => fetchNextEventByTitle("Встреча ЛМГ"), {
			text: "⏳ Ищу ближайшую встречу ЛМГ…",
		});

		if (!nextLm) {
			await replyFormatted(ctx, SMALL_GROUPS_TEXTS.noNextLmg);
			return;
		}
		await ctx.reply(formatEvent(nextLm), { parse_mode: "MarkdownV2" });
	});

	// Все встречи ЛМГ до конца сезона
	bot.hears(SMALL_GROUPS_BUTTON_LABELS.LMG_CAL_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const lmEvents = await withLoading(ctx, () => fetchAllFutureEventsByTitle("Встреча ЛМГ"), {
			text: "⏳ Получаю все будущие встречи ЛМГ…",
		});

		if (lmEvents.length === 0) {
			await replyFormatted(ctx, SMALL_GROUPS_TEXTS.noFutureLmg);
			return;
		}
		const list = lmEvents.map((e) => formatEvent(e, true)).join("\n\n");
		const text = fmt`${SMALL_GROUPS_TEXTS.lmgSeasonList}

${list}`;
		await replyFormatted(ctx, text);
	});

	// Выезд ЛМГ
	bot.hears(SMALL_GROUPS_BUTTON_LABELS.LMG_CAL_TRIP, async (ctx) => {
		if (!requirePrivileged(ctx)) return;
		const text = fmt`${bold()}Выезд ЛМГ${bold()}`;
		await replyFormatted(ctx, text, {
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

		await ctx.reply(msg, { parse_mode: "MarkdownV2" });
		await ctx.answerCallbackQuery();
	});
}
