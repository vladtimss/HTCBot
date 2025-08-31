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
import { replyGroupsMenu, replyMainKeyboard } from "../utils/keyboards";
import { MENU_LABELS } from "./main-menu";
import { fetchLmEventsUntilSeasonEnd, fetchUpcomingEvents, formatEvent } from "../services/calendar";

// Форматируем одну группу
function formatGroup(g: SmallGroup): string {
	const leaders = g.leaders.map((l) => `👤 ${l.firstName} — ${l.phone}`).join("\n");
	const addresses = g.addresses.map((a) => `📍 <a href="${a.mapUrl}">${a.address}</a>`).join("\n");
	return `<b>${g.title}</b>\n🗓 ${WEEKDAY_TITLE[g.weekday]}, начало в ${g.time}\n${addresses}\n${leaders}`;
}

export function registerSmallGroups(bot: Bot<MyContext>) {
	// Вход в раздел — широкие reply-кнопки
	bot.hears(MENU_LABELS.GROUPS, async (ctx) => {
		await ctx.reply("*Малые группы*", {
			parse_mode: "Markdown",
			reply_markup: replyGroupsMenu,
		});
	});

	// Reply: «По дням» -> inline-список дней
	bot.hears("📅 По дням", async (ctx) => {
		const kb = new InlineKeyboard();
		WEEKDAYS_PRESENT.forEach((d) => kb.text(WEEKDAY_TITLE[d], `groups:day:${d}`).row());

		await ctx.reply("*Выберите день:*", {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	// Reply: «По районам» -> inline-список районов
	bot.hears("📍 По районам", async (ctx) => {
		const kb = new InlineKeyboard();
		DISTRICTS.forEach((districtKey) => {
			const districtName = DISTRICT_MAP[districtKey] ?? districtKey;
			kb.text(districtName, `groups:district:${districtKey}`).row();
		});

		await ctx.reply("*Выберите район:*", {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	// Inline: выбор дня -> список групп (каждая группа отдельным сообщением)
	bot.callbackQuery(/groups:day:(MON|TUE|WED|THU|FRI|SAT|SUN)/, async (ctx) => {
		const day = ctx.match![1] as Weekday;
		await ctx.answerCallbackQuery().catch(() => {});
		const list = GROUPS.filter((g) => g.weekday === day);

		// 1) Заголовок
		await ctx.editMessageText(`<b>${WEEKDAY_TITLE[day]} — группы:</b>`, {
			parse_mode: "HTML",
			link_preview_options: { is_disabled: true },
		});

		// 2) Каждая группа — отдельным сообщением; кнопки только к последнему
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

	// Inline: вернуть к списку дней
	bot.callbackQuery("groups:byday", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		const kb = new InlineKeyboard();
		WEEKDAYS_PRESENT.forEach((d) => kb.text(WEEKDAY_TITLE[d], `groups:day:${d}`).row());

		await ctx.editMessageText("*Выберите день:*", {
			parse_mode: "HTML",
			reply_markup: kb,
		});
	});

	// Inline: выбор района -> список групп (каждая группа отдельным сообщением)
	bot.callbackQuery(/groups:district:(.+)/, async (ctx) => {
		const districtKey = ctx.match![1];
		const districtName = DISTRICT_MAP[districtKey] ?? districtKey;

		await ctx.answerCallbackQuery().catch(() => {});
		const list = GROUPS.filter((g) => g.region === districtKey);

		// 1) Заголовок
		await ctx.editMessageText(`<b>${districtName} — группы:</b>`, {
			parse_mode: "HTML",
			link_preview_options: { is_disabled: true },
		});

		// 2) Каждая группа — отдельным сообщением; кнопки только к последнему
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

	// Inline: вернуть к списку районов
	bot.callbackQuery("groups:bydistrict", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		const kb = new InlineKeyboard();
		DISTRICTS.forEach((districtKey) => {
			const districtName = DISTRICT_MAP[districtKey] ?? districtKey;
			kb.text(districtName, `groups:district:${districtKey}`).row();
		});

		await ctx.editMessageText("*Выберите район:*", {
			parse_mode: "HTML",
			reply_markup: kb,
		});
	});

	// Inline: «к разделу „Малые группы“» — вернём reply-клавиатуру раздела
	bot.callbackQuery("groups:root", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await ctx.reply("*Малые группы*", {
			parse_mode: "HTML",
			reply_markup: replyGroupsMenu,
		});
	});

	// Inline: глобальный возврат в главное
	bot.callbackQuery("nav:main", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await ctx.reply("Главное меню:", { reply_markup: replyMainKeyboard });
	});

	// Кнопка: когда следующая встреча ЛМГ
	bot.hears("📅 Когда следующая встреча ЛМГ", async (ctx) => {
		const events = await fetchLmEventsUntilSeasonEnd();
		const nextLm = events[0]; // первый в списке — ближайший

		if (!nextLm) {
			await ctx.reply("😔 Ближайших встреч ЛМГ в этом сезоне не найдено.");
			return;
		}

		await ctx.reply(formatEvent(nextLm), { parse_mode: "Markdown" });
	});

	// Кнопка: все встречи ЛМГ до конца сезона
	bot.hears("📖 Все встречи ЛМГ до конца сезона", async (ctx) => {
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
