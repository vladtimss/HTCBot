// src/aeefrstu / lmg - notes / index.ts;
import { Bot } from "grammy";
import { Keyboard } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { MENU_LABELS } from "../../constants/button-lables";
import { COMMON, SMALL_GROUPS_TEXTS } from "../../services/texts";
import { replyLmgNotesMenu } from "../../utils/keyboards";
import { withLoading } from "../../utils/loading";
import * as buildin from "../../services/buildin";
import { env } from "../../config/env";

export function registerLmgNotes(bot: Bot<MyContext>) {
	// Открыть раздел "Конспекты ЛМГ"
	bot.hears(MENU_LABELS.LMG_NOTES, async (ctx) => {
		if (!ctx.session.menuStack) ctx.session.menuStack = ["groups"];
		ctx.session.menuStack.push("groups/notes");
		ctx.session.lastSection = "groups/notes";

		await ctx.reply(SMALL_GROUPS_TEXTS.lmgNotesIntro, {
			parse_mode: "Markdown",
			reply_markup: replyLmgNotesMenu(ctx),
		});
	});

	// Запрос: Конспект с прошлой встречи
	bot.hears(MENU_LABELS.LMG_CONSP_PREV, async (ctx) => {
		const dbId = "122e4ef5-7599-4bfb-9cd5-206119056c20";
		const db = await withLoading(ctx, () => buildin.getDatabase(dbId), {
			text: "⏳ Получаю структуру базы данных…",
		});

		const props = buildin.formatDatabaseProperties(db);
		let msg = `*Структура базы данных* (id: \`${dbId}\`)\n\n*Свойства:*`;
		for (const p of props) {
			msg += `\n• *${p.name}* — \`${p.type}\``;
		}

		await ctx.reply(msg, { parse_mode: "Markdown" });
	});
}
