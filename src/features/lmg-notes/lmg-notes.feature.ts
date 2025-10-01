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
 * (оставляем прямо в фиче, а не в env — т.к. таких ID будет несколько)
 */
const LMG_NOTES_DATABASE_ID = "122e4ef5-7599-4bfb-9cd5-206119056c20";

export function registerLmgNotesFeature(bot: Bot<MyContext>) {
	// Раздел "Конспекты ЛМГ"
	bot.hears(MENU_LABELS.LMG_NOTES, async (ctx) => {
		ctx.session.menuStack.push("groups/notes");
		ctx.session.lastSection = "groups/notes";

		await ctx.reply(SMALL_GROUPS_TEXTS.lmgNotesIntro, {
			parse_mode: "Markdown",
			reply_markup: replyLmgNotesMenu(ctx),
		});
	});

	// Кнопка "Конспект с прошлой встречи" → получить JSON базы
	bot.hears(MENU_LABELS.LMG_CONSP_PREV, async (ctx) => {
		const db = await withLoading(ctx, () => buildin.getDatabase(LMG_NOTES_DATABASE_ID), {
			text: "⏳ Получаю структуру базы данных…",
		});

		const jsonText = JSON.stringify(db, null, 2);

		if (jsonText.length < 3900) {
			// Если влезает в сообщение — шлём как код-блок
			await ctx.reply("```json\n" + jsonText + "\n```", { parse_mode: "Markdown" });
		} else {
			// Иначе отправляем как файл .json
			await ctx.replyWithDocument(
				new InputFile(Buffer.from(jsonText, "utf-8"), `database-${LMG_NOTES_DATABASE_ID}.json`)
			);
		}
	});

	// Кнопка "Назад" → возвращаем в меню Малых групп
	bot.hears(MENU_LABELS.BACK, async (ctx) => {
		const stack = ctx.session.menuStack ?? [];
		const last = stack.at(-1);

		if (last === "groups/notes") {
			stack.pop();
			ctx.session.menuStack = stack;
			ctx.session.lastSection = "groups";

			await ctx.reply(SMALL_GROUPS_TEXTS.title ?? "Малые группы:", {
				reply_markup: replyGroupsMenu(ctx),
				parse_mode: "Markdown",
			});
		}
	});
}
