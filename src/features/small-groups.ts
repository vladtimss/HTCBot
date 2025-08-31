import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import { GROUPS, WEEKDAYS_PRESENT, WEEKDAY_TITLE, DISTRICTS, Weekday } from "../data/small-groups";
import { replyGroupsMenu, replyMainKeyboard, inlineBackToMain } from "../utils/keyboards";
import { MENU_LABELS } from "./main-menu";

// форматируем список групп
function formatGroupList(list = GROUPS): string {
	if (!list.length) return "Группы не найдены.";
	return list
		.map((g) => {
			const leaders = g.leaders.map((l) => `• ${l.firstName} — ${l.phone}`).join("\n");
			return `*${g.title}*\n📍 ${g.addresses.join(",")} (${g.region})\n🗓 ${WEEKDAY_TITLE[g.weekday]} ${
				g.time
			}\n👥 Лидеры:\n${leaders}`;
		})
		.join("\n\n");
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
		kb.text("⬅️ К разделу «Малые группы»", "groups:root").row().text("🏠 В главное меню", "nav:main");

		await ctx.reply("*Выберите день:*", {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	// Reply: «По районам» -> inline-список районов
	bot.hears("📍 По районам", async (ctx) => {
		const kb = new InlineKeyboard();
		DISTRICTS.forEach((r) => kb.text(r, `groups:district:${encodeURIComponent(r)}`).row());
		kb.text("⬅️ К разделу «Малые группы»", "groups:root").row().text("🏠 В главное меню", "nav:main");

		await ctx.reply("*Выберите район:*", {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	// Inline: выбор дня -> список групп
	bot.callbackQuery(/groups:day:(MON|TUE|WED|THU|FRI|SAT|SUN)/, async (ctx) => {
		const day = ctx.match![1] as Weekday;
		await ctx.answerCallbackQuery().catch(() => {});
		const list = GROUPS.filter((g) => g.weekday === day);

		await ctx.editMessageText(`*${WEEKDAY_TITLE[day]} — группы:*\n\n${formatGroupList(list)}`, {
			parse_mode: "Markdown",
			reply_markup: new InlineKeyboard()
				.text("⬅️ К дням", "groups:byday")
				.row()
				.text("🏠 В главное меню", "nav:main"),
		});
	});

	// Inline: вернуть к списку дней
	bot.callbackQuery("groups:byday", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		const kb = new InlineKeyboard();
		WEEKDAYS_PRESENT.forEach((d) => kb.text(WEEKDAY_TITLE[d], `groups:day:${d}`).row());
		kb.text("⬅️ К разделу «Малые группы»", "groups:root").row().text("🏠 В главное меню", "nav:main");

		await ctx.editMessageText("*Выберите день:*", {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	// Inline: выбор района -> список групп
	bot.callbackQuery(/groups:district:(.+)/, async (ctx) => {
		const district = decodeURIComponent(ctx.match![1]);
		await ctx.answerCallbackQuery().catch(() => {});
		const list = GROUPS.filter((g) => g.region === district);

		await ctx.editMessageText(`*${district} — группы:*\n\n${formatGroupList(list)}`, {
			parse_mode: "Markdown",
			reply_markup: new InlineKeyboard()
				.text("⬅️ К районам", "groups:bydistrict")
				.row()
				.text("🏠 В главное меню", "nav:main"),
		});
	});

	// Inline: вернуть к списку районов
	bot.callbackQuery("groups:bydistrict", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		const kb = new InlineKeyboard();
		DISTRICTS.forEach((r) => kb.text(r, `groups:district:${encodeURIComponent(r)}`).row());
		kb.text("⬅️ К разделу «Малые группы»", "groups:root").row().text("🏠 В главное меню", "nav:main");

		await ctx.editMessageText("*Выберите район:*", {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	// Inline: «к разделу „Малые группы“» — вернём reply-клавиатуру
	bot.callbackQuery("groups:root", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await ctx.reply("*Малые группы*", {
			parse_mode: "Markdown",
			reply_markup: replyGroupsMenu,
		});
	});

	// Inline: глобальный возврат в главное
	bot.callbackQuery("nav:main", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await ctx.reply("Главное меню:", { reply_markup: replyMainKeyboard });
	});
}
