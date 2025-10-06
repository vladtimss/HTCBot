// src/features/lmg-notes/lmg-notes.feature.ts
import { Bot, InputFile } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { MENU_LABELS } from "../../constants/button-lables";
import { SMALL_GROUPS_TEXTS } from "../../services/texts";
import { replyLmgNotesMenu } from "../../utils/keyboards";
import { withLoading, withLoadingAndMsg } from "../../utils/loading";
import * as buildin from "../../services/buildin";
import { BuildinFile, Meeting } from "../../types/buildin";
import { requirePrivileged } from "../../utils/guards";

function normalizeDate(dateStr: string): string {
	if (!dateStr) return dateStr;
	// убираем время
	let clean = dateStr.split("T")[0];
	// бывают "2024/03-11" → заменяем второй разделитель на "/"
	clean = clean.replace(/(\d{4})[/-](\d{2})[-/](\d{2})/, "$1-$2-$3");
	return clean;
}

async function fetchFileAsInput(url: string, fileName: string): Promise<InputFile> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Не удалось скачать файл: ${res.status}`);
	const buffer = Buffer.from(await res.arrayBuffer());
	return new InputFile(buffer, fileName);
}

/**
 * ID базы с конспектами ЛМГ
 */
const LMG_NOTES_DATABASE_ID = "d8ddec27-c395-4c7c-a229-850d579ef7b3";

export function registerLmgNotesFeature(bot: Bot<MyContext>) {
	// Открыть раздел "Конспекты ЛМГ"
	bot.hears(MENU_LABELS.LMG_NOTES, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("lmg-notes");
		ctx.session.lastSection = "lmg-notes";

		await ctx.reply(SMALL_GROUPS_TEXTS.lmgNotesIntro, {
			parse_mode: "Markdown",
			reply_markup: replyLmgNotesMenu(ctx),
		});
	});

	// 2) Конспект с прошлой встречи — получить PDF из поля "Конспект"
	bot.hears(MENU_LABELS.LMG_CONSP_PREV, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		try {
			const { result, loadingMsg } = await withLoadingAndMsg(
				ctx,
				() => buildin.queryDatabase(LMG_NOTES_DATABASE_ID, { page_size: 100 }),
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
