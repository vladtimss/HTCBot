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
		// гарантируем корректное состояние stack
		const stack = ctx.session.menuStack ?? [];
		if (stack.length === 0) stack.push("groups"); // если стек пуст — считаем, что мы пришли из groups
		stack.push("groups/notes");
		ctx.session.menuStack = stack;
		ctx.session.lastSection = "groups/notes";

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

	// Назад — корректно возвращаемся по стеку
	bot.hears(MENU_LABELS.BACK, async (ctx) => {
		const stack = ctx.session.menuStack ?? [];
		if (stack.length > 0) {
			stack.pop(); // убираем текущий раздел
		}

		const last = stack.at(-1);
		ctx.session.menuStack = stack;
		ctx.session.lastSection = last ?? "main";

		if (last === "groups") {
			// Возвращаем меню Малых групп
			await ctx.reply(SMALL_GROUPS_TEXTS.title ?? "Малые группы:", {
				reply_markup: replyGroupsMenu(ctx),
				parse_mode: "Markdown",
			});
		} else if (last === "groups/notes") {
			// остаёмся в notes (если вдруг дважды нажали назад подряд)
			await ctx.reply(SMALL_GROUPS_TEXTS.lmgNotesIntro, {
				reply_markup: replyLmgNotesMenu(ctx),
				parse_mode: "Markdown",
			});
		} else {
			// если стек пуст или что-то другое — уходим в главное меню
			await ctx.reply("Главное меню", {
				reply_markup: replyGroupsMenu(ctx),
			});
		}
	});
}
