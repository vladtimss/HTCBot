/**
 * features/lmg-notes/lmg-notes.feature.ts
 * --------------------------
 * Логика раздела "Конспекты ЛМГ"
 */

import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { SMALL_GROUPS_BUTTON_LABELS } from "../small-groups/small-groups.constants";
import { SMALL_GROUPS_TEXTS } from "../small-groups/small-groups.texts";
import { replyLmgNotesMenu } from "./lmg-notes.keyboard";
import { withLoadingAndMsg } from "../../utils/loading";
import { queryDatabase } from "../../services/buildin";
import { BuildinFile, Meeting } from "../../types/buildin";
import { requirePrivileged } from "../../utils/guards";
import { normalizeDate, fetchFileAsInput } from "./lmg-notes.util";

/**
 * ID базы с конспектами ЛМГ
 */
const LMG_NOTES_DATABASE_ID = "d8ddec27-c395-4c7c-a229-850d579ef7b3";

export function registerLmgNotesFeature(bot: Bot<MyContext>) {
	// Открыть раздел "Конспекты ЛМГ"
	bot.hears(SMALL_GROUPS_BUTTON_LABELS.LMG_NOTES, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("lmg-notes");
		ctx.session.lastSection = "lmg-notes";

		await ctx.reply(SMALL_GROUPS_TEXTS.lmgNotesIntro.text, {
			entities: SMALL_GROUPS_TEXTS.lmgNotesIntro.entities,
			reply_markup: replyLmgNotesMenu(),
		});
	});

	// 2) Конспект с прошлой встречи — получить PDF из поля "Конспект"
	bot.hears(SMALL_GROUPS_BUTTON_LABELS.LMG_NOTES_PREV, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		try {
			const { result, loadingMsg } = await withLoadingAndMsg(
				ctx,
				() => queryDatabase(LMG_NOTES_DATABASE_ID, { page_size: 100 }),
				{ text: "⏳ Ищу конспект с последней встречи…" }
			);

			// Мапим страницы и сразу отбрасываем без даты
			const meetings: Meeting[] = (result.results ?? []).flatMap((page: any): Meeting[] => {
				const rawDate = page.properties?.["Дата встречи"]?.date?.start ?? null;
				if (!rawDate) return []; // ⬅️ вместо null возвращаем пустой массив
				const date = normalizeDate(rawDate);
				const files: BuildinFile[] = page.properties?.["Конспект"]?.files ?? [];
				return [{ date, files, raw: page }];
			});

			if (meetings.length === 0) {
				await ctx.reply("❌ В базе нет встреч с датой.");
				return;
			}

			// Сортировка по нормализованной дате
			meetings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
			const lastMeeting = meetings[meetings.length - 1];

			if (!lastMeeting.files || lastMeeting.files.length === 0) {
				await ctx.reply("❌ У последней встречи нет конспекта.");
				return;
			}

			const file = lastMeeting.files[0];
			const fileUrl = file.file?.url ?? file.external?.url;
			const fileName = file.name ?? `Конспект_${lastMeeting.date}.pdf`;

			if (!fileUrl) {
				await ctx.reply("❌ Не удалось получить ссылку на файл конспекта.");
				return;
			}

			// Скачиваем и отправляем с правильным именем
			const inputFile = await fetchFileAsInput(fileUrl, fileName);
			await ctx.replyWithDocument(inputFile, {
				caption: `📝 Конспект от ${lastMeeting.date}`,
			});

			// теперь можно убрать лоадер
			if (loadingMsg) {
				await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id).catch(() => {});
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error("[lmg-notes] getLastConspect error:", message);
			await ctx.reply(`❌ Не удалось получить последний конспект: ${message}`);
		}
	});
}
