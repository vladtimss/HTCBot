import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import {
	GROUPS as GROUPS_DATA,
	WEEKDAYS_PRESENT,
	WEEKDAY_TITLE,
	DISTRICTS,
	Weekday,
	SmallGroup,
	DISTRICT_MAP,
} from "../data/small-groups";
import { GROUPS as GROUPS_TEXTS } from "../services/texts";
import { replyGroupsMenu } from "../utils/keyboards";
import { fetchAllFutureEventsByTitle, fetchNextEventByTitle, formatEvent } from "../services/calendar";
import { MENU_LABELS } from "../constants/button-lables";
import { requirePrivileged } from "../utils/guards";

/**
 * Форматирует информацию об одной малой группе в виде «карточки».
 */
function formatGroup(g: SmallGroup): string {
	const leaders = g.leaders
		.map((l) => {
			if (l.tgUserName) {
				return `👤 ${l.firstName} — <a href="https://t.me/${l.tgUserName}">Написать лидеру</a>`;
			}
			if (l.tgId) {
				return `👤 ${l.firstName} — <a href="tg://user?id=${l.tgId}">Написать лидеру</a>`;
			}
			// fallback на телефон, если нет ни tgUserName, ни tgId
			return `👤 ${l.firstName} — ${l.phone}`;
		})
		.join("\n");

	const addresses = g.addresses.map((a) => `📍 <a href="${a.mapUrl}">${a.address}</a>`).join("\n");

	return `
<b>✨ ${g.title}</b>

🗓 <i>${WEEKDAY_TITLE[g.weekday]}, начало в ${g.time}</i>

${addresses}

${leaders}
	`.trim();
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
async function renderGroupsRoot(ctx: MyContext) {
	ctx.session.menuStack = ["groups"];
	ctx.session.lastSection = "groups";

	await ctx.reply(`*${GROUPS_TEXTS.title}*`, {
		parse_mode: "Markdown",
		reply_markup: replyGroupsMenu(ctx),
	});
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
	bot.hears(GROUPS_TEXTS.byDay, async (ctx) => {
		if (!ctx.session.menuStack) ctx.session.menuStack = ["groups"];
		ctx.session.menuStack.push("groups/byday");
		ctx.session.lastSection = "groups/byday";

		await ctx.reply(`*${GROUPS_TEXTS.chooseDay}*`, {
			parse_mode: "Markdown",
			reply_markup: makeWeekdaysKeyboard(),
		});
	});

	// «📍 По районам»
	bot.hears(GROUPS_TEXTS.byDistrict, async (ctx) => {
		if (!ctx.session.menuStack) ctx.session.menuStack = ["groups"];
		ctx.session.menuStack.push("groups/bydistrict");
		ctx.session.lastSection = "groups/bydistrict";

		await ctx.reply(`*${GROUPS_TEXTS.chooseDistrict}*`, {
			parse_mode: "Markdown",
			reply_markup: makeDistrictsKeyboard(),
		});
	});

	// Выбор дня → список групп
	bot.callbackQuery(/groups:day:(MON|TUE|WED|THU|FRI|SAT|SUN)/, async (ctx) => {
		const day = ctx.match![1] as Weekday;
		await ctx.answerCallbackQuery().catch(() => {});

		const list = GROUPS_DATA.filter((g) => g.weekday === day);

		await ctx.reply(`<b>${WEEKDAY_TITLE[day]} — группы:</b>`, {
			parse_mode: "HTML",
			link_preview_options: { is_disabled: true },
		});

		for (let i = 0; i < list.length; i++) {
			const g = list[i];
			const isLast = i === list.length - 1;

			await ctx.reply(formatGroup(g), {
				parse_mode: "HTML",
				link_preview_options: { is_disabled: true },
				reply_markup: isLast ? new InlineKeyboard().text("⬅️ К дням", "groups:byday") : undefined,
			});
		}
	});

	// Возврат к списку дней
	bot.callbackQuery("groups:byday", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await ctx.reply(`*${GROUPS_TEXTS.chooseDay}*`, {
			parse_mode: "Markdown",
			reply_markup: makeWeekdaysKeyboard(),
		});
	});

	// Выбор района → список групп
	bot.callbackQuery(/groups:district:(.+)/, async (ctx) => {
		const districtKey = ctx.match![1];
		const districtName = DISTRICT_MAP[districtKey] ?? districtKey;

		await ctx.answerCallbackQuery().catch(() => {});

		const list = GROUPS_DATA.filter((g) => g.region === districtKey);

		await ctx.reply(`<b>${districtName} — группы:</b>`, {
			parse_mode: "HTML",
			link_preview_options: { is_disabled: true },
		});

		for (let i = 0; i < list.length; i++) {
			const g = list[i];
			const isLast = i === list.length - 1;

			await ctx.reply(formatGroup(g), {
				parse_mode: "HTML",
				link_preview_options: { is_disabled: true },
				reply_markup: isLast ? new InlineKeyboard().text("⬅️ К районам", "groups:bydistrict") : undefined,
			});
		}
	});

	// Возврат к списку районов
	bot.callbackQuery("groups:bydistrict", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await ctx.reply(`*${GROUPS_TEXTS.chooseDistrict}*`, {
			parse_mode: "Markdown",
			reply_markup: makeDistrictsKeyboard(),
		});
	});

	// Когда следующая встреча ЛМГ
	bot.hears(MENU_LABELS.LMG_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const nextLm = await fetchNextEventByTitle("Встреча ЛМГ");
		if (!nextLm) {
			await ctx.reply(GROUPS_TEXTS.noNextLmg);
			return;
		}
		await ctx.reply(formatEvent(nextLm), { parse_mode: "Markdown" });
	});

	// Все встречи ЛМГ до конца сезона
	bot.hears(MENU_LABELS.LMG_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const lmEvents = await fetchAllFutureEventsByTitle("Встреча ЛМГ");
		if (lmEvents.length === 0) {
			await ctx.reply(GROUPS_TEXTS.noFutureLmg);
			return;
		}
		const list = lmEvents.map(formatEvent).join("\n\n");
		await ctx.reply(`${GROUPS_TEXTS.lmgSeasonList}\n\n${list}`, {
			parse_mode: "Markdown",
		});
	});
}
