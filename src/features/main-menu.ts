import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import { fetchUpcomingEvents, formatEvent } from "../services/calendar";

/** экспортируем генератор клавы, чтобы использовать в app.ts без динамических import().then */
export function mainMenuKeyboard(ctx: MyContext) {
	const kb = new InlineKeyboard()
		.text("⛪ Воскресное богослужение", "nav:sunday")
		.row()
		.text("👥 Малые группы", "nav:groups")
		.row()
		.text("🗓️ Показать три ближайших события", "nav:next3")
		.row()
		.text("🙌 Кто мы", "nav:about");

	if (ctx.canSeeFourthButton) {
		kb.row().text("⭐ Пресвитерский совет", "nav:pro");
	}
	return kb;
}

export function registerMainMenu(bot: Bot<MyContext>) {
	bot.callbackQuery("nav:main", async (ctx) => {
		ctx.session.menuStack = ["main"];
		await ctx.editMessageText("*Главное меню*", {
			parse_mode: "Markdown",
			reply_markup: mainMenuKeyboard(ctx),
		});
	});

	// заглушка для "четвертой кнопки"
	bot.callbackQuery("nav:pro", async (ctx) => {
		if (!ctx.canSeeFourthButton) {
			return ctx.answerCallbackQuery({ text: "Недоступно.", show_alert: true });
		}
		ctx.session.menuStack.push("pro");
		const kb = new InlineKeyboard().text("⬅️ Назад", "nav:back").text("🏠 В главное меню", "nav:main");

		await ctx.editMessageText("*Расширенные функции*\n\nЗдесь появятся инструменты для служителей.", {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	// НОВАЯ КНОПКА: показать 3 ближайших события из календаря
	bot.callbackQuery("nav:next3", async (ctx) => {
		// не ограничиваем по ролям — доступно всем
		ctx.session.menuStack.push("next3");

		// важно: ответить на коллбэк, чтобы Telegram не показывал «часики»
		await ctx.answerCallbackQuery().catch(() => {});

		const events = await fetchUpcomingEvents(3);
		if (events.length === 0) {
			return ctx.editMessageText("Ближайших событий не найдено.", {
				reply_markup: new InlineKeyboard().text("⬅️ Назад", "nav:back").text("🏠 В главное меню", "nav:main"),
			});
		}

		const text = events.map(formatEvent).join("\n\n");
		await ctx.editMessageText(`*Ближайшие события:*\n\n${text}`, {
			parse_mode: "Markdown",
			reply_markup: new InlineKeyboard().text("⬅️ Назад", "nav:back").text("🏠 В главное меню", "nav:main"),
		});
	});
}
