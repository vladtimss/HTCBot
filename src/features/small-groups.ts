import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import { GROUPS, DISTRICTS, WEEKDAY_TITLE, MgGroup, Weekday, WEEKDAYS_PRESENT } from "../data/small-groups";
import { commonNav } from "../utils/keyboards";

function groupsRootKeyboard() {
	// в одну строку
	return new InlineKeyboard()
		.text("📆 По дням", "groups:byday")
		.text("🗺️ По районам", "groups:bydistrict")
		.row()
		.text("⬅️ Назад", "nav:back")
		.text("🏠 В главное меню", "nav:main");
}

function groupCard(g: MgGroup) {
	return `*${g.title}*\n` + `📍 ${g.address} (${g.region})\n` + `🕒 ${WEEKDAY_TITLE[g.weekday]} ${g.time}`;
}

function leadersCard(g: MgGroup) {
	const list = g.leaders.map((l) => `• ${l.name} — ${l.phone}`).join("\n");
	return `*Лидеры группы «${g.title}»:*\n${list}`;
}

export function registerSmallGroups(bot: Bot<MyContext>) {
	// Корень раздела "Малые группы"
	bot.callbackQuery("nav:groups", async (ctx) => {
		ctx.session.menuStack.push("groups");
		await ctx.editMessageText("*Малые группы*", {
			parse_mode: "Markdown",
			reply_markup: groupsRootKeyboard(),
		});
	});

	// По дням
	bot.callbackQuery("groups:byday", async (ctx) => {
		ctx.session.menuStack.push("groups/byday");
		const kb = new InlineKeyboard();
		WEEKDAYS_PRESENT.forEach((d) => kb.text(WEEKDAY_TITLE[d], `groups:day:${d}`));
		kb.row().text("⬅️ Назад", "nav:back").row().text("🏠 В главное меню", "nav:main");

		await ctx.editMessageText("*Выберите день:*", {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	bot.callbackQuery(/groups:day:(MON|TUE|WED|THU|FRI|SAT|SUN)/, async (ctx) => {
		const day = ctx.match![1] as Weekday;
		ctx.session.menuStack.push(`groups/byday/${day}`);

		const items = GROUPS.filter((g) => g.weekday === day);
		if (!items.length) {
			return ctx.editMessageText(`*${WEEKDAY_TITLE[day]}*\n\nПока нет групп.`, {
				parse_mode: "Markdown",
				reply_markup: commonNav(),
			});
		}

		// список кнопок по группам
		const kb = new InlineKeyboard();
		items.forEach((g) => kb.text(g.title, `groups:view:${g.id}`).row());
		kb.text("⬅️ Назад", "nav:back").row().text("🏠 В главное меню", "nav:main");

		await ctx.editMessageText(`*${WEEKDAY_TITLE[day]}* — доступные группы:`, {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	// По районам
	bot.callbackQuery("groups:bydistrict", async (ctx) => {
		ctx.session.menuStack.push("groups/bydistrict");
		const kb = new InlineKeyboard();
		DISTRICTS.forEach((d) => kb.text(d, `groups:district:${encodeURIComponent(d)}`));
		kb.row().text("⬅️ Назад", "nav:back").row().text("🏠 В главное меню", "nav:main");

		await ctx.editMessageText("*Выберите район:*", {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	bot.callbackQuery(/groups:district:(.+)/, async (ctx) => {
		const district = decodeURIComponent(ctx.match![1]);
		ctx.session.menuStack.push(`groups/bydistrict/${district}`);

		const items = GROUPS.filter((g) => g.region === district);
		if (!items.length) {
			return ctx.editMessageText(`*${district}*\n\nПока нет групп.`, {
				parse_mode: "Markdown",
				reply_markup: commonNav(),
			});
		}

		const kb = new InlineKeyboard();
		items.forEach((g) => kb.text(g.title, `groups:view:${g.id}`).row());
		kb.text("⬅️ Назад", "nav:back").row().text("🏠 В главное меню", "nav:main");

		await ctx.editMessageText(`*${district}* — доступные группы:`, {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	// Экран группы
	bot.callbackQuery(/groups:view:(.+)/, async (ctx) => {
		const id = ctx.match![1];
		const g = GROUPS.find((x) => x.id === id);
		if (!g) return ctx.answerCallbackQuery({ text: "Группа не найдена", show_alert: true });

		ctx.session.menuStack.push(`groups/view/${id}`);

		const kb = new InlineKeyboard()
			.text("📞 Получить контакты лидеров", `groups:leaders:${id}`)
			.row()
			.text("⬅️ Назад", "nav:back")
			.row()
			.text("🏠 В главное меню", "nav:main");

		await ctx.editMessageText(groupCard(g), {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	// Контакты лидеров (общая кнопка в корне)
	bot.callbackQuery("groups:leaders", async (ctx) => {
		ctx.session.menuStack.push("groups/leaders");
		const text = GROUPS.map(
			(g) => `*${g.title}:*\n` + g.leaders.map((l) => `• ${l.name} — ${l.phone}`).join("\n")
		).join("\n\n");

		await ctx.editMessageText(text, {
			parse_mode: "Markdown",
			reply_markup: commonNav(),
		});
	});

	// Контакты лидеров конкретной группы
	bot.callbackQuery(/groups:leaders:(.+)/, async (ctx) => {
		const id = ctx.match![1];
		const g = GROUPS.find((x) => x.id === id);
		if (!g) return ctx.answerCallbackQuery({ text: "Группа не найдена", show_alert: true });
		ctx.session.menuStack.push(`groups/leaders/${id}`);

		await ctx.editMessageText(leadersCard(g), {
			parse_mode: "Markdown",
			reply_markup: commonNav(),
		});
	});
}
