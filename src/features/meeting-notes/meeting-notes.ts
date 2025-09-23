// src/features/meeting-notes/meeting-notes.ts
/**
 * Основная логика раздела "Конспекты ЛМГ"
 * - использует сервис buildin (src/services/buildin.ts)
 * - кеширует месяцы в ctx.session (через any)
 * - скачивает файлы и отправляет как InputFile (чтобы сохранить кириллицу имени)
 */

import { Bot, InputFile } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { withLoading } from "../../utils/loading";
import { buildin } from "../../services/buildin";
import {
	getTitle,
	getDate,
	getFiles,
	extractAllDateStrings,
	parseDateToTs,
	getMonthNumbers,
	formatRecordMessage,
} from "./meeting-helpers";
import { kbMainInline, kbSearchMenu, kbYears, kbMonths, kbRecordsList } from "./meeting-keyboards";

const FETCH_PAGE_SIZE = 100;

/** Скачать URL в Buffer */
async function downloadToBuffer(url: string) {
	const resp = await fetch(url);
	if (!resp.ok) throw new Error(`Download failed ${resp.status}`);
	const ab = await resp.arrayBuffer();
	return Buffer.from(ab);
}

/** Регистрация обработчиков */
export function registerMeetingNotes(bot: Bot<MyContext>) {
	// Меню: команда /notes
	bot.command("notes", async (ctx) => {
		await ctx.reply("📖 Конспекты ЛМГ — меню", { reply_markup: kbMainInline() });
	});

	// Открыть меню (callback)
	bot.callbackQuery("notes:menu", async (ctx) => {
		await ctx.answerCallbackQuery();
		await ctx.editMessageText("📖 Конспекты ЛМГ — меню", { reply_markup: kbMainInline() });
	});

	// Быстрый: конспект с прошлой встречи
	bot.callbackQuery("notes:last", async (ctx) => {
		await ctx.answerCallbackQuery();
		await withLoading(
			ctx,
			async () => {
				// получаем все записи через сервис
				const records = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
				if (!records.length) {
					await ctx.reply("❌ В базе нет записей");
					return;
				}

				// мапим даты
				const now = Date.now();
				const mapped = records.map((r: any) => {
					const ds = extractAllDateStrings(r)[0] ?? null;
					const ts = parseDateToTs(ds);
					return { r, ds, ts };
				});

				const withDates = mapped.filter(
					(x): x is { r: any; ds: string; ts: number } =>
						typeof x.ds === "string" && typeof x.ts === "number" && x.ts <= now
				);

				if (!withDates.length) {
					await ctx.reply("❌ Не найдено прошлых встреч (нет дат ≤ сегодня).");
					return;
				}

				withDates.sort((a, b) => b.ts - a.ts); // latest first
				const chosen = withDates[0].r;
				const files = getFiles(chosen);

				// формируем подпись и отправляем файл
				const caption = formatRecordMessage(chosen);
				if (!files.length) {
					await ctx.reply("⚠️ В записи нет файлов в поле 'Конспект'.\n\n" + caption);
					return;
				}

				const f = files[0];
				try {
					const buf = await downloadToBuffer(f.url);
					const input = new InputFile(buf, f.name);
					await ctx.replyWithDocument(input, { caption });
				} catch (err) {
					// fallback: отправка по URL
					await ctx.replyWithDocument(f.url, { caption });
				}
			},
			{ text: "⏳ Ищу прошлую встречу..." }
		);
	});

	// Подменю поиска
	bot.callbackQuery("notes:searchmenu", async (ctx) => {
		await ctx.answerCallbackQuery();
		await ctx.editMessageText("🔎 Выберите способ поиска:", { reply_markup: kbSearchMenu() });
	});

	// По дате: показать годы
	bot.callbackQuery("notes:bydate", async (ctx) => {
		await ctx.answerCallbackQuery();
		await ctx.editMessageText("📅 Выберите год:", { reply_markup: kbYears() });
	});

	// Выбор года -> месяцы (кешируем в ctx.session)
	bot.callbackQuery(/^notes:year:(\d{4})$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const year = Number(ctx.match?.[1]);

		// сессия (избегаем TS ошибок через any)
		const session = (ctx.session as any) ?? {};
		session.notesMonths = session.notesMonths ?? {};

		// если есть в кеше — сразу отдать
		if (Array.isArray(session.notesMonths[year]) && session.notesMonths[year].length > 0) {
			await ctx.editMessageText(`📅 ${year}: выберите месяц`, {
				reply_markup: kbMonths(year, session.notesMonths[year]),
			});
			(ctx.session as any) = session;
			return;
		}

		// иначе получить все записи и собрать месяцы
		const records = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
		const monthsNums = getMonthNumbers(records, year);

		// сохранить в сессии
		session.notesMonths[year] = monthsNums;
		(ctx.session as any) = session;

		if (!monthsNums.length) {
			await ctx.reply("❌ Для выбранного года нет записей.");
			return;
		}
		await ctx.editMessageText(`📅 ${year}: выберите месяц`, { reply_markup: kbMonths(year, monthsNums) });
	});

	// Выбор месяца -> список записей
	bot.callbackQuery(/^notes:month:(\d{4}):(\d{1,2})$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const year = Number(ctx.match?.[1]);
		const month = Number(ctx.match?.[2]);

		const records = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
		const filtered = records.filter((r: any) => {
			for (const ds of extractAllDateStrings(r)) {
				const ts = parseDateToTs(ds);
				if (!ts) continue;
				const dt = new Date(ts);
				if (dt.getFullYear() === year && dt.getMonth() + 1 === month) return true;
			}
			return false;
		});

		if (!filtered.length) {
			await ctx.answerCallbackQuery({ text: "❌ В этом месяце нет записей." });
			return;
		}

		await ctx.editMessageText(`*${year}/${String(month).padStart(2, "0")}* — выберите встречу:`, {
			parse_mode: "Markdown",
			reply_markup: kbRecordsList(filtered),
		});
	});

	// Открыть запись (page) и прислать файлы
	bot.callbackQuery(/^notes:get:(.+)$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const pageId = ctx.match?.[1];
		if (!pageId) {
			await ctx.answerCallbackQuery({ text: "Неверный id" });
			return;
		}

		await withLoading(
			ctx,
			async () => {
				// пытаемся получить страницу напрямую
				let pageObj: any = null;
				try {
					pageObj = await buildin.getPage(pageId);
				} catch {
					// если не получилось — пытаемся найти в базе (fallback)
					const all = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
					pageObj = all.find((r: any) => r.id === pageId) ?? null;
				}

				if (!pageObj) {
					await ctx.reply("❌ Не удалось загрузить данные записи.");
					return;
				}

				const files = getFiles(pageObj);
				const caption = formatRecordMessage(pageObj);

				if (!files.length) {
					await ctx.reply("⚠️ В записи нет файлов в поле 'Конспект'.\n\n" + caption);
					return;
				}

				for (const f of files) {
					try {
						const buf = await downloadToBuffer(f.url);
						const input = new InputFile(buf, f.name);
						await ctx.replyWithDocument(input, { caption });
					} catch {
						await ctx.replyWithDocument(f.url, { caption });
					}
				}
			},
			{ text: "⏳ Получаю конспект..." }
		);
	});

	// По книге (минимальная рабочая ветка) — показывает список книг
	bot.callbackQuery("notes:bybook", async (ctx) => {
		await ctx.answerCallbackQuery();
		const records = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
		const books = Array.from(
			new Set(records.flatMap((r: any) => (r?.properties?.["Книга"]?.multi_select ?? []).map((m: any) => m.name)))
		);
		if (!books.length) {
			await ctx.reply("❌ В базе нет значений свойства 'Книга'.");
			return;
		}
		const { InlineKeyboard } = await import("grammy");
		const kb = new InlineKeyboard();
		for (const b of books) kb.text(b.slice(0, 30), `notes:book:${encodeURIComponent(b)}`).row();
		kb.text("⬅️ Назад", "notes:searchmenu");
		await ctx.editMessageText("*Выберите книгу:*", { parse_mode: "Markdown", reply_markup: kb });
	});

	// Выбор книги -> главы -> записи (реализуется аналогично годам/месяцам)
	bot.callbackQuery(/notes:book:(.+)/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const enc = ctx.match?.[1] ?? "";
		const book = decodeURIComponent(enc);
		const records = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
		const chaptersSet = new Set<string>();
		for (const r of records) {
			const ms = r?.properties?.["Книга"]?.multi_select ?? [];
			if (!ms.some((m: any) => m.name === book)) continue;
			// главы
			const msCh = r?.properties?.["Глава"]?.multi_select ?? [];
			if (Array.isArray(msCh) && msCh.length) for (const c of msCh) chaptersSet.add(String(c.name));
			else {
				const raw =
					r?.properties?.["Глава"]?.rich_text?.map((t: any) => t.plain_text).join(" ") ??
					r?.properties?.["Глава"];
				if (raw)
					for (const p of String(raw).split(/[,\u003B\u2013\u2014\u002D]/)) {
						const v = p.trim();
						if (v) chaptersSet.add(v);
					}
			}
		}

		const chapters = Array.from(chaptersSet).sort((a, b) => {
			const na = Number(a);
			const nb = Number(b);
			if (!isNaN(na) && !isNaN(nb)) return na - nb;
			return a.localeCompare(b);
		});

		if (!chapters.length) {
			await ctx.reply("❌ Нет глав для выбранной книги.");
			return;
		}

		const { InlineKeyboard } = await import("grammy");
		const kb = new InlineKeyboard();
		for (const ch of chapters)
			kb.text(ch, `notes:bookchapter:${encodeURIComponent(book)}:${encodeURIComponent(ch)}`).row();
		kb.text("⬅️ Назад", "notes:bybook");
		await ctx.editMessageText(`*Книга:* ${book}\n*Выберите главу:*`, { parse_mode: "Markdown", reply_markup: kb });
	});

	// По ключевым словам — включаем режим поиска в сессии
	bot.callbackQuery("notes:bykeywords", async (ctx) => {
		await ctx.answerCallbackQuery();
		(ctx.session as any) = (ctx.session as any) ?? {};
		(ctx.session as any).notes = (ctx.session as any).notes ?? {};
		(ctx.session as any).notes.searchMode = "keyword";
		(ctx.session as any).notes.searchInProgress = false;
		await ctx.reply(
			"🔎 Введите ключевые слова для поиска (по полям Тема и Текст). Чтобы отменить — /cancel_search"
		);
	});

	// Отмена поиска
	bot.command("cancel_search", async (ctx) => {
		(ctx.session as any) = (ctx.session as any) ?? {};
		if ((ctx.session as any).notes) {
			(ctx.session as any).notes.searchMode = undefined;
			(ctx.session as any).notes.searchInProgress = false;
		}
		await ctx.reply("Поиск отменён.");
	});

	// Обработка текста — поиск по ключевым словам
	bot.on("message:text", async (ctx) => {
		const sess = (ctx.session as any)?.notes;
		if (!sess || sess.searchMode !== "keyword") return;
		if (!ctx.message?.text) return;
		if (sess.searchInProgress) {
			await ctx.reply("⚠️ Подождите, предыдущий поиск ещё выполняется.");
			return;
		}
		sess.searchInProgress = true;
		const q = ctx.message.text.trim().toLowerCase();

		await withLoading(
			ctx,
			async () => {
				const all = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
				const matches = all.filter((r: any) => {
					const title = (getTitle(r) ?? "").toLowerCase();
					const text = (r?.properties?.["Текст"]?.rich_text ?? [])
						.map((t: any) => t.plain_text ?? "")
						.join(" ")
						.toLowerCase();
					return title.includes(q) || text.includes(q);
				});

				if (!matches.length) {
					await ctx.reply("❌ Ничего не найдено.");
					return;
				}

				const top = matches.slice(0, 5);
				for (const r of top) {
					const files = getFiles(r);
					const caption = formatRecordMessage(r);
					if (files.length) {
						try {
							const buf = await downloadToBuffer(files[0].url);
							const input = new InputFile(buf, files[0].name);
							await ctx.replyWithDocument(input, { caption });
						} catch {
							await ctx.replyWithDocument(files[0].url, { caption });
						}
					} else {
						await ctx.reply(caption);
					}
				}
				if (matches.length > 5) await ctx.reply(`И ещё ${matches.length - 5} результатов...`);
			},
			{ text: `🔎 Ищу "${q}"...` }
		);

		sess.searchInProgress = false;
		sess.searchMode = undefined;
	});
}
