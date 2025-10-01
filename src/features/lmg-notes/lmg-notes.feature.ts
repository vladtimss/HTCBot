// src/features/lmg-notes/lmg-notes.feature.ts
import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { MENU_LABELS } from "../../constants/button-lables";
import { SMALL_GROUPS_TEXTS } from "../../services/texts";
import { replyLmgNotesMenu } from "../../utils/keyboards";
import { withLoading } from "../../utils/loading";
import * as buildin from "../../services/buildin";

// конкретный ID БД для ЛМГ — держим в конфиге фичи
const LMG_NOTES_DB_ID = "122e4ef5-7599-4bfb-9cd5-206119056c20";

export function registerLmgNotesFeature(bot: Bot<MyContext>) {
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
		const db = await withLoading(ctx, () => buildin.getDatabase(LMG_NOTES_DB_ID), {
			text: "⏳ Получаю структуру базы данных…",
		});

		const props = buildin.formatDatabaseProperties(db);
		let msg = `*Структура базы данных* (id: \`${LMG_NOTES_DB_ID}\`)\n\n*Свойства:*`;
		for (const p of props) {
			msg += `\n• *${p.name}* — \`${p.type}\``;
		}

		await ctx.reply(msg, { parse_mode: "Markdown" });
	});
}
