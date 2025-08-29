import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import { DISTRICTS, GROUPS, WEEKDAY_TITLE, MgGroup } from "../data/small-groups";
import { commonNav } from "../utils/keyboards";

export function registerSmallGroups(bot: Bot<MyContext>) {
	bot.callbackQuery("nav:groups", async (ctx) => {
		ctx.session.menuStack.push("groups");
		const kb = new InlineKeyboard()
			.text("📆 По дням", "groups:byday")
			.row()
			.text("🗺️ По районам", "groups:bydistrict")
			.row()
			.text("⬅️ Назад", "nav:back")
			.row()
			.text("🏠 В главное меню", "nav:main");

		await ctx.editMessageText("*Малые группы*", {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	bot.callbackQuery("groups:byday", async (ctx) => {
		ctx.session.menuStack.push("groups/byday");
		const kb = new InlineKeyboard();
		(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const).forEach((d) =>
			kb.text(WEEKDAY_TITLE[d], `groups:day:${d}`).row()
		);
		kb.text("⬅️ Назад", "nav:back").row().text("🏠 В главное меню", "nav:main");

		await ctx.editMessageText("*Малые группы по дням:*", {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	bot.callbackQuery(/groups:day:(MON|TUE|WED|THU|FRI|SAT|SUN)/, async (ctx) => {
		const day = ctx.match![1] as MgGroup["weekday"];
		ctx.session.menuStack.push(`groups/byday/${day}`);

		const items = GROUPS.filter((g) => g.weekday === day);
		if (!items.length) {
			return ctx.editMessageText(`*${WEEKDAY_TITLE[day]}*\n\nПока нет групп.`, {
				parse_mode: "Markdown",
				reply_markup: commonNav(),
			});
		}
		const lines = items
			.map(
				(g) =>
					`• *${g.title}*\nЛидер: ${g.leader}\n📍 ${g.address} (${g.district})\n🕒 ${
						WEEKDAY_TITLE[g.weekday]
					} ${g.time}`
			)
			.join("\n\n");

		await ctx.editMessageText(`*${WEEKDAY_TITLE[day]}*\n\n${lines}`, {
			parse_mode: "Markdown",
			reply_markup: commonNav(),
		});
	});

	bot.callbackQuery("groups:bydistrict", async (ctx) => {
		ctx.session.menuStack.push("groups/bydistrict");
		const kb = new InlineKeyboard();
		DISTRICTS.forEach((d) => kb.text(d, `groups:district:${encodeURIComponent(d)}`).row());
		kb.text("⬅️ Назад", "nav:back").row().text("🏠 В главное меню", "nav:main");

		await ctx.editMessageText("*Малые группы по районам:*", {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	bot.callbackQuery(/groups:district:(.+)/, async (ctx) => {
		const district = decodeURIComponent(ctx.match![1]);
		ctx.session.menuStack.push(`groups/bydistrict/${district}`);

		const items = GROUPS.filter((g) => g.district === district);
		if (!items.length) {
			return ctx.editMessageText(`*${district}*\n\nПока нет групп.`, {
				parse_mode: "Markdown",
				reply_markup: commonNav(),
			});
		}
		const lines = items
			.map((g) => `• *${g.title}*\nЛидер: ${g.leader}\n📍 ${g.address}\n🕒 ${WEEKDAY_TITLE[g.weekday]} ${g.time}`)
			.join("\n\n");

		await ctx.editMessageText(`*${district}*\n\n${lines}`, {
			parse_mode: "Markdown",
			reply_markup: commonNav(),
		});
	});
}
