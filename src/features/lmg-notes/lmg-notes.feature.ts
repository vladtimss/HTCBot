// src/features/lmg-notes/lmg-notes.feature.ts
import { Bot, InputFile } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { MENU_LABELS } from "../../constants/button-lables";
import { SMALL_GROUPS_TEXTS } from "../../services/texts";
import { replyLmgNotesMenu, replyGroupsMenu } from "../../utils/keyboards";
import { withLoading } from "../../utils/loading";
import * as buildin from "../../services/buildin";

/**
 * ID базы с конспектами ЛМГ
 * (держим в фиче — у тебя может быть много баз)
 */
const LMG_NOTES_DATABASE_ID = "d8ddec27-c395-4c7c-a229-850d579ef7b3";

/**
 * Регистрирует обработчики раздела "Конспекты ЛМГ"
 */
export function registerLmgNotesFeature(bot: Bot<MyContext>) {
	// 1) Открыть раздел "Конспекты ЛМГ"
	bot.hears(MENU_LABELS.LMG_NOTES, async (ctx) => {
		// вход в раздел Конспектов всегда из Малых групп
		ctx.session.menuStack.push("lmg-notes"); // а не "groups/notes"
		ctx.session.lastSection = "lmg-notes";

		await ctx.reply(SMALL_GROUPS_TEXTS.lmgNotesIntro, {
			parse_mode: "Markdown",
			reply_markup: replyLmgNotesMenu(ctx),
		});
	});

	// 2) Конспект с прошлой встречи — получить структуру БД и отправить JSON
	bot.hears(MENU_LABELS.LMG_CONSP_PREV, async (ctx) => {
		try {
			const db = await withLoading(ctx, () => buildin.getDatabase(LMG_NOTES_DATABASE_ID), {
				text: "⏳ Получаю структуру базы данных…",
			});

			const jsonText = JSON.stringify(db, null, 2);
			if (jsonText.length < 3900) {
				await ctx.reply("```json\n" + jsonText + "\n```", { parse_mode: "Markdown" });
			} else {
				await ctx.replyWithDocument(
					new InputFile(Buffer.from(jsonText, "utf-8"), `database-${LMG_NOTES_DATABASE_ID}.json`)
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error("[lmg-notes] getDatabase error:", message);
			await ctx.reply(`❌ Не удалось получить структуру базы: ${message}`);
		}
	});
}
