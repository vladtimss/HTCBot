import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import { GROUPS, WEEKDAYS_PRESENT, WEEKDAY_TITLE, DISTRICTS, Weekday } from "../data/small-groups";
import { MENU_LABELS } from "./main-menu";

function kbGroupsRoot() {
	return new InlineKeyboard()
		.text("📅 По дням", "groups:byday")
		.text("📍 По районам", "groups:bydistrict")
		.row()
		.text("⬅️ Назад", "nav:back")
		.row()
		.text("🏠 В главное меню", "nav:main");
}

function formatGroupList(groups = GROUPS): string {
	if (!groups.length) return "Группы не найдены.";
	return groups
		.map((g) => {
			const leaders = g.leaders.map((l) => `• ${l.name} — ${l.phone}`).join("\n");
			return `*${g.title}*\n📍 ${g.address} (${g.region})\n🗓 ${WEEKDAY_TITLE[g.weekday]} ${
				g.time
			}\n👥 Лидеры:\n${leaders}`;
		})
		.join("\n\n");
}

export async function renderGroupsRoot(ctx: MyContext) {
	await ctx.reply("*Малые группы*", {
		parse_mode: "Markdown",
		reply_markup: kbGroupsRoot(),
	});
}

export async function renderGroupsByDayIndex(ctx: MyContext) {
	const kb = new InlineKeyboard();
	WEEKDAYS_PRESENT.forEach((d) => kb.text(WEEKDAY_TITLE[d], `groups:day:${d}`).row());
	kb.text("⬅️ Назад", "nav:back").row().text("🏠 В главное меню", "nav:main");

	await ctx.editMessageText("*Выберите день:*", {
		parse_mode: "Markdown",
		reply_markup: kb,
	});
}

export async function renderGroupsByDay(ctx: MyContext, day: Weekday) {
	const list = GROUPS.filter((g) => g.weekday === day);
	await ctx.editMessageText(`*${WEEKDAY_TITLE[day]} — группы:*\n` + "\n\n" + formatGroupList(list), {
		parse_mode: "Markdown",
		reply_markup: commonInlineNav(),
	});
}

export async function renderGroupsByDistrictIndex(ctx: MyContext) {
	const kb = new InlineKeyboard();
	DISTRICTS.forEach((r) => kb.text(r, `groups:district:${encodeURIComponent(r)}`).row());
	kb.text("⬅️ Назад", "nav:back").row().text("🏠 В главное меню", "nav:main");

	await ctx.editMessageText("*Выберите район:*", {
		parse_mode: "Markdown",
		reply_markup: kb,
	});
}

export async function renderGroupsByDistrict(ctx: MyContext, district: string) {
	const list = GROUPS.filter((g) => g.region === district);
	await ctx.editMessageText(`*${district} — группы:*\n` + "\n\n" + formatGroupList(list), {
		parse_mode: "Markdown",
		reply_markup: commonInlineNav(),
	});
}

export function registerSmallGroups(bot: Bot<MyContext>) {
	// Вход из Reply-клавиатуры
	bot.hears(MENU_LABELS.GROUPS, async (ctx) => {
		ctx.session.menuStack.push("groups");
		await renderGroupsRoot(ctx);
	});

	// Навигация внутри раздела — Inline
	bot.callbackQuery("nav:groups", async (ctx) => {
		ctx.session.menuStack.push("groups");
		await ctx.answerCallbackQuery().catch(() => {});
		await ctx.editMessageText("*Малые группы*", {
			parse_mode: "Markdown",
			reply_markup: kbGroupsRoot(),
		});
	});

	bot.callbackQuery("groups:byday", async (ctx) => {
		ctx.session.menuStack.push("groups/byday");
		await ctx.answerCallbackQuery().catch(() => {});
		await renderGroupsByDayIndex(ctx);
	});

	bot.callbackQuery(/groups:day:(MON|TUE|WED|THU|FRI|SAT|SUN)/, async (ctx) => {
		const day = ctx.match![1] as Weekday;
		ctx.session.menuStack.push(`groups/byday/${day}`);
		await ctx.answerCallbackQuery().catch(() => {});
		await renderGroupsByDay(ctx, day);
	});

	bot.callbackQuery("groups:bydistrict", async (ctx) => {
		ctx.session.menuStack.push("groups/bydistrict");
		await ctx.answerCallbackQuery().catch(() => {});
		await renderGroupsByDistrictIndex(ctx);
	});

	bot.callbackQuery(/groups:district:(.+)/, async (ctx) => {
		const district = decodeURIComponent(ctx.match![1]);
		ctx.session.menuStack.push(`groups/bydistrict/${district}`);
		await ctx.answerCallbackQuery().catch(() => {});
		await renderGroupsByDistrict(ctx, district);
	});
}
function commonInlineNav(): import("@grammyjs/types").InlineKeyboardMarkup | undefined {
	throw new Error("Function not implemented.");
}
