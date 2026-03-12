/**
 * features/lmg-notes/lmg-notes.feature.ts
 * --------------------------
 * Логика раздела "Конспекты ЛМГ"
 */

import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import type { LmgNote } from "../../types/buildin";
import { SMALL_GROUPS_BUTTON_LABELS } from "../small-groups/small-groups.constants";
import { SMALL_GROUPS_TEXTS } from "../small-groups/small-groups.texts";
import { inlineLmgBibleBooksMenu, inlineLmgChaptersMenu, inlineLmgNoteDownloadMenu, replyLmgNotesMenu } from "./lmg-notes.keyboard";
import { withLoading, withLoadingAndMsg, withProgressMessages } from "../../utils/loading";
import { queryDatabase } from "../../services/buildin";
import {
	BuildinFile,
	Meeting,
	BuildinDatabaseRecord,
	BuildinDateProperty,
	BuildinFilesProperty,
} from "../../types/buildin";
import { requirePrivileged } from "../../utils/guards";
import {
	normalizeDate,
	fetchFileAsInput,
	getAllLmgNotes,
	buildNormalizedLmgNotesState,
	getLmgBookByIndex,
	getLmgChaptersFromBook,
	getLmgNotesByBookAndChapter,
	formatMeetingDateWithWeekday,
	getBookShortName,
	sortLmgNotesByDateDesc,
} from "./lmg-notes.util";
import { fmt } from "@grammyjs/parse-mode";
import { escapeMdV2 } from "../../utils/text";

/**
 * ID базы с конспектами ЛМГ
 * URL: https://buildin.ai/htchurch/d8ddec27-c395-4c7c-a229-850d579ef7b3
 */
const LMG_NOTES_DATABASE_ID = "d8ddec27-c395-4c7c-a229-850d579ef7b3";

/**
 * Строит или возвращает из сессии нормализованное состояние конспектов ЛМГ.
 */
async function generateLmgNotesState(ctx: MyContext) {
	if (ctx.session.lmgNotesState) {
		return ctx.session.lmgNotesState;
	}

	const { result: notes } = await withProgressMessages(
		ctx,
		() => getAllLmgNotes(),
		{
			firstMessageText: "⏳ Загружаю конспекты ЛМГ…",
			secondMessageText: "⌛ Немного подождите, идёт подготовка списка…",
			parseMode: "MarkdownV2",
		}
	);

	if (notes.length === 0) {
		await ctx.reply("❌ В базе нет конспектов ЛМГ.");
		return;
	}

	const state = buildNormalizedLmgNotesState(notes);
	ctx.session.lmgNotes = notes;
	ctx.session.lmgNotesState = state;
	return state;
}

/**
 * Формирует текст одного конспекта ЛМГ по заданному шаблону.
 */
function formatLmgNoteText(note: LmgNote): string {
	const datePart = note.date ? formatMeetingDateWithWeekday(note.date)?.split(",")[0] ?? undefined : undefined;
	const title = note.title || "Без темы";
	const goal = note.groupGoal;
	const shortBook = getBookShortName(note.book);
	const textRef = note.text ?? "";

	let result = "";
	if (datePart) {
		result += `📅 *Дата:* ${escapeMdV2(datePart)}\n\n`;
	}
	const safeTitle = escapeMdV2(title);
	result += `📌 *Тема:* ${safeTitle}\n\n`;

	if (goal && goal.trim().length > 0) {
		result += `🎯 *Цель на группу:* ${escapeMdV2(goal)}\n\n`;
	}

	if (shortBook || textRef) {
		const ref = `${shortBook ?? ""} ${textRef.trim()}`.trim();
		result += `📖 *Текст:* ${escapeMdV2(ref)}\n`;
	}

	return result;
}

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
			const meetings: Meeting[] = (result.results ?? []).flatMap((page: BuildinDatabaseRecord): Meeting[] => {
				const dateProperty = page.properties["Дата встречи"] as BuildinDateProperty | undefined;
				const rawDate = dateProperty?.date?.start ?? null;
				if (!rawDate) return []; // ⬅️ вместо null возвращаем пустой массив
				const date = normalizeDate(rawDate);
				const filesProperty = page.properties["Конспект"] as BuildinFilesProperty | undefined;
				const files: BuildinFile[] = filesProperty?.files ?? [];
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

	// 3) Поиск конспектов по книгам Библии
	bot.hears(SMALL_GROUPS_BUTTON_LABELS.LMG_NOTES_BY_BOOK, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("lmg-notes-books");
		ctx.session.lastSection = "lmg-notes-books";

		try {
			const state = await generateLmgNotesState(ctx);
			if (!state) return;

			const books = state.books.allNames || [];
			if (books.length === 0) {
				await ctx.reply("❌ Не удалось найти книги в базе конспектов ЛМГ.");
				return;
			}

			const text = fmt`Выберите книгу Библии для конспектов ЛМГ. ${SMALL_GROUPS_TEXTS.lmgNotesIntro}`;

			await ctx.reply(text.text, {
				entities: text.entities,
				reply_markup: inlineLmgBibleBooksMenu(books),
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error("[lmg-notes] error loading notes by book:", message);
			await ctx.reply(`❌ Ошибка загрузки конспектов: ${message}`);
		}
	});

	// Выбор книги
	bot.callbackQuery(/^lmg:book:(\d+)$/, async (ctx) => {
		if (!requirePrivileged(ctx)) return;
		const bookIndex = parseInt(ctx.match[1], 10);
		await ctx.answerCallbackQuery();

		try {
			const state = await generateLmgNotesState(ctx);
			if (!state) return;

			const bookData = getLmgBookByIndex(state, bookIndex);
			if (!bookData) {
				await ctx.reply("❌ Книга не найдена.");
				return;
			}

			const { book, bookRec } = bookData;
			const chapters = getLmgChaptersFromBook(bookRec);

			if (chapters.length === 0) {
				const notes = sortLmgNotesByDateDesc(getLmgNotesByBookAndChapter(state, bookRec));
				if (notes.length === 0) {
					await ctx.reply("❌ В этой книге нет конспектов.");
					return;
				}

				for (const note of notes) {
					const text = formatLmgNoteText(note);
					await ctx.reply(text, {
						parse_mode: "MarkdownV2",
						reply_markup: inlineLmgNoteDownloadMenu(note.id, "lmg:books"),
						link_preview_options: { is_disabled: true },
					});
				}
			} else {
				const title = fmt`Выберите главу книги ${book}.`;
				await ctx.reply(title.text, {
					entities: title.entities,
					reply_markup: inlineLmgChaptersMenu(chapters, bookIndex),
				});
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error("[lmg-notes] error handling book selection:", message);
			await ctx.reply(`❌ Ошибка обработки выбора книги: ${message}`);
		}
	});

	// Возврат к списку книг
	bot.callbackQuery(/^lmg:books$/, async (ctx) => {
		if (!requirePrivileged(ctx)) return;
		await ctx.answerCallbackQuery();

		const state = await generateLmgNotesState(ctx);
		if (!state) return;

		const books = state.books.allNames || [];
		const text = fmt`Выберите книгу Библии для конспектов ЛМГ.`;

		await ctx.reply(text.text, {
			entities: text.entities,
			reply_markup: inlineLmgBibleBooksMenu(books),
		});
	});

	// Выбор главы
	bot.callbackQuery(/^lmg:book:(\d+):chapter:(\d+)$/, async (ctx) => {
		if (!requirePrivileged(ctx)) return;
		const bookIndex = parseInt(ctx.match[1], 10);
		const chapterNumber = parseInt(ctx.match[2], 10);
		await ctx.answerCallbackQuery();

		const state = await generateLmgNotesState(ctx);
		if (!state) return;

		const bookData = getLmgBookByIndex(state, bookIndex);
		if (!bookData) {
			await ctx.reply("❌ Книга не найдена.");
			return;
		}

		const { bookRec } = bookData;

		await withLoading(
			ctx,
			async () => {
				const notes = sortLmgNotesByDateDesc(
					getLmgNotesByBookAndChapter(state, bookRec, chapterNumber)
				);

				if (notes.length === 0) {
					const chapters = getLmgChaptersFromBook(bookRec);
					await ctx.reply("❌ В этой главе конспекты не найдены.", {
						reply_markup: inlineLmgChaptersMenu(chapters, bookIndex),
					});
					return;
				}

				for (const note of notes) {
					const text = formatLmgNoteText(note);
					await ctx.reply(text, {
						parse_mode: "MarkdownV2",
						reply_markup: inlineLmgNoteDownloadMenu(note.id, `lmg:book:${bookIndex}`),
						link_preview_options: { is_disabled: true },
					});
				}
			},
			{
				text: "⏳ Формирую список конспектов…",
				delayMs: 500,
			}
		).catch(async (error) => {
			const message = error instanceof Error ? error.message : String(error);
			console.error("[lmg-notes] error handling chapter selection:", message);
			await ctx.reply(`❌ Ошибка получения конспектов для главы: ${message}`);
		});
	});

	// Загрузка конкретного конспекта по кнопке "ПОЛУЧИТЬ КОНСПЕКТ"
	bot.callbackQuery(/^lmg:note:(.+)$/, async (ctx) => {
		if (!requirePrivileged(ctx)) return;
		const noteId = ctx.match[1];
		await ctx.answerCallbackQuery();

		const state = await generateLmgNotesState(ctx);
		if (!state) return;

		const note = state.notes.byId[noteId];
		if (!note) {
			await ctx.reply("❌ Конспект не найден.");
			return;
		}

		const file = note.file;
		if (!file) {
			await ctx.reply("❌ У этой встречи нет файла конспекта.");
			return;
		}

		const fileUrl = file.file?.url ?? file.external?.url;
		const fileName = file.name ?? `Конспект_${noteId}.pdf`;

		if (!fileUrl) {
			await ctx.reply("❌ Не удалось получить ссылку на файл конспекта.");
			return;
		}

		try {
			const { result: inputFile, loadingMsg } = await withLoadingAndMsg(
				ctx,
				() => fetchFileAsInput(fileUrl, fileName),
				{ text: "⏳ Загружаю конспект…" }
			);

			const caption = note.date
				? `📝 Конспект от ${formatMeetingDateWithWeekday(note.date) ?? note.date}`
				: "📝 Конспект ЛМГ";

			await ctx.replyWithDocument(inputFile, {
				caption,
			});

			if (loadingMsg) {
				await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id).catch(() => {});
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error("[lmg-notes] error sending note file:", message);
			await ctx.reply(`❌ Не удалось отправить файл конспекта: ${message}`);
		}
	});
}
