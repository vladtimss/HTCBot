// src/features/meeting-notes/meeting-notes.ts
/**
 * Основная логика раздела "Конспекты ЛМГ"
 */

import { Bot, InlineKeyboard, InputFile } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { withLoading } from "../../utils/loading";
import buildin from "../../services/buildin";
import {
	getTitle,
	getFiles,
	extractAllDateStrings,
	parseDateToTs,
	getMonthNumbers,
	formatRecordMessage,
} from "./meeting-helpers";
import { kbMainInline, kbSearchMenu, kbYears, kbMonths, kbRecordsList, kbAfterLast } from "./meeting-keyboards";

const FETCH_PAGE_SIZE = 100;

/** Скачать URL в Buffer */
async function downloadToBuffer(url: string) {
	const resp = await fetch(url);
	if (!resp.ok) throw new Error(`Download failed ${resp.status}`);
	const ab = await resp.arrayBuffer();
	return Buffer.from(ab);
}

/**
 * safeEditMessage:
 * - если callback пришёл от текстового сообщения -> editMessageText
 * - если callback пришёл от документа -> reply новым сообщением
 */
async function safeEditMessage(ctx: MyContext, text: string, opts?: any) {
	try {
		const cbMsg: any = (ctx.callbackQuery as any)?.message;

		if (cbMsg && typeof cbMsg.text === "string") {
			await ctx.editMessageText(text, opts);
			return;
		}
		try {
			if (cbMsg && (cbMsg.message_id || cbMsg.message_id === 0)) {
				await ctx.editMessageReplyMarkup(undefined);
			}
		} catch {}
		await ctx.reply(text, opts);
	} catch (err: any) {
		const msg = String(err?.message ?? err);
		if (msg.includes("message is not modified")) return;
		if (msg.includes("BUTTON_DATA_INVALID")) {
			console.error("BUTTON_DATA_INVALID in safeEditMessage:", err);
			throw err;
		}
		console.error("safeEditMessage unexpected error:", err);
		throw err;
	}
}

/** Регистрация обработчиков */
export function registerMeetingNotes(bot: Bot<MyContext>) {
	// команда /notes
	bot.command("notes", async (ctx) => {
		await ctx.reply("📖 Конспекты ЛМГ — меню", { reply_markup: kbMainInline() });
	});

	// открыть меню
	bot.callbackQuery("notes:menu", async (ctx) => {
		await ctx.answerCallbackQuery();
		await safeEditMessage(ctx, "📖 Конспекты ЛМГ — меню", { reply_markup: kbMainInline() });
	});

	// назад в раздел МГ
	bot.callbackQuery("notes:backmg", async (ctx) => {
		await ctx.answerCallbackQuery();
		await safeEditMessage(ctx, "📖 Малые группы — меню");
	});

	// последний конспект
	bot.callbackQuery("notes:last", async (ctx) => {
		await ctx.answerCallbackQuery();
		await withLoading(
			ctx,
			async () => {
				const records = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
				if (!records.length) {
					await ctx.reply("❌ В базе нет записей");
					return;
				}
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
				withDates.sort((a, b) => b.ts - a.ts);
				const chosen = withDates[0].r;
				const files = getFiles(chosen);
				const caption = formatRecordMessage(chosen);
				if (!files.length) {
					await ctx.reply("⚠️ В записи нет файлов в поле 'Конспект'.\n\n" + caption, {
						reply_markup: kbAfterLast(),
					});
					return;
				}
				const f = files[0];
				try {
					const buf = await downloadToBuffer(f.url);
					const input = new InputFile(buf, f.name);
					await ctx.replyWithDocument(input, { caption, reply_markup: kbAfterLast() });
				} catch {
					await ctx.replyWithDocument(f.url, { caption, reply_markup: kbAfterLast() });
				}
			},
			{ text: "⏳ Ищу прошлую встречу..." }
		);
	});

	// подменю поиска
	bot.callbackQuery("notes:searchmenu", async (ctx) => {
		await ctx.answerCallbackQuery();
		await safeEditMessage(ctx, "🔎 Выберите способ поиска:", { reply_markup: kbSearchMenu() });
	});

	// по дате
	bot.callbackQuery("notes:bydate", async (ctx) => {
		await ctx.answerCallbackQuery();
		await safeEditMessage(ctx, "📅 Выберите год:", { reply_markup: kbYears() });
	});

	// выбрать год
	bot.callbackQuery(/^notes:year:(\d{4})$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const year = Number(ctx.match?.[1]);

		const session = (ctx.session as any) ?? {};
		session.notesCache = session.notesCache ?? {};
		session.notesCache.monthsByYear = session.notesCache.monthsByYear ?? {};

		if (Array.isArray(session.notesCache.monthsByYear[year]) && session.notesCache.monthsByYear[year].length > 0) {
			await safeEditMessage(ctx, `📅 ${year}: выберите месяц`, {
				reply_markup: kbMonths(year, session.notesCache.monthsByYear[year]),
			});
			(ctx.session as any) = session;
			return;
		}

		const records = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
		const monthsNums = getMonthNumbers(records, year);

		session.notesCache.monthsByYear[year] = monthsNums;
		(ctx.session as any) = session;

		if (!monthsNums.length) {
			await ctx.reply("❌ Для выбранного года нет записей.");
			return;
		}
		await safeEditMessage(ctx, `📅 ${year}: выберите месяц`, { reply_markup: kbMonths(year, monthsNums) });
	});

	// выбрать месяц
	bot.callbackQuery(/^notes:month:(\d{4}):(\d{1,2})$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const year = Number(ctx.match?.[1]);
		const month = Number(ctx.match?.[2]);

		const all = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
		const filtered = all.filter((r: any) => {
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
		const session = (ctx.session as any) ?? {};
		session.notesCache = session.notesCache ?? {};
		session.notesCache.lastList = filtered;
		session.notesCache.backAction = `notes:year:${year}`;
		(ctx.session as any) = session;

		await safeEditMessage(ctx, `*${year}/${String(month).padStart(2, "0")}* — выберите встречу:`, {
			parse_mode: "Markdown",
			reply_markup: kbRecordsList(filtered, session.notesCache.backAction ?? "notes:bydate"),
		});
	});

	// по книге
	bot.callbackQuery("notes:bybook", async (ctx) => {
		await ctx.answerCallbackQuery();
		const all = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
		const books = Array.from(
			new Set(all.flatMap((r: any) => (r?.properties?.["Книга"]?.multi_select ?? []).map((m: any) => m.name)))
		);
		if (!books.length) {
			await ctx.reply("❌ В базе нет значений свойства 'Книга'.");
			return;
		}
		const session = (ctx.session as any) ?? {};
		session.notesCache = session.notesCache ?? {};
		session.notesCache.books = books;
		(ctx.session as any) = session;

		const kb = new InlineKeyboard();
		books.forEach((b, i) => kb.text(b.slice(0, 30), `notes:book:${i}`).row());
		kb.text("⬅️ Назад", "notes:searchmenu");
		await safeEditMessage(ctx, "*Выберите книгу:*", { parse_mode: "Markdown", reply_markup: kb });
	});

	// выбрать книгу
	bot.callbackQuery(/^notes:book:(\d+)$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const idx = Number(ctx.match?.[1]);
		const session = (ctx.session as any) ?? {};
		const book = session.notesCache?.books?.[idx];
		if (!book) {
			await ctx.reply("❌ Книга не найдена (кэш). Повторите поиск.");
			return;
		}
		const all = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
		const chaptersSet = new Set<string>();
		for (const r of all) {
			const ms = r?.properties?.["Книга"]?.multi_select ?? [];
			if (!ms.some((m: any) => m.name === book)) continue;
			const msCh = r?.properties?.["Глава"]?.multi_select ?? [];
			if (Array.isArray(msCh) && msCh.length) {
				for (const c of msCh) chaptersSet.add(String(c.name));
			} else {
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
			await ctx.reply("❌ Для этой книги нет глав.");
			return;
		}
		session.notesCache = session.notesCache ?? {};
		session.notesCache.lastBookIndex = idx;
		session.notesCache.bookChapters = chapters;
		(ctx.session as any) = session;

		const kb = new InlineKeyboard();
		chapters.forEach((ch, i) => kb.text(ch, `notes:bookchapter:${idx}:${i}`).row());
		kb.text("⬅️ Назад", "notes:bybook");
		await safeEditMessage(ctx, `*Книга:* ${book}\n*Выберите главу:*`, { parse_mode: "Markdown", reply_markup: kb });
	});

	// выбрать главу
	bot.callbackQuery(/^notes:bookchapter:(\d+):(\d+)$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const bookIdx = Number(ctx.match?.[1]);
		const chIdx = Number(ctx.match?.[2]);
		const session = (ctx.session as any) ?? {};
		const book = session.notesCache?.books?.[bookIdx];
		const ch = session.notesCache?.bookChapters?.[chIdx];
		if (!book || !ch) {
			await ctx.reply("❌ Ошибка: не удалось найти книгу/главу (кэш устарел).");
			return;
		}
		const all = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
		const filtered = all.filter((r: any) => {
			const ms = r?.properties?.["Книга"]?.multi_select ?? [];
			if (!ms.some((m: any) => m.name === book)) return false;
			const msCh = r?.properties?.["Глава"]?.multi_select ?? [];
			if (Array.isArray(msCh) && msCh.length) {
				return msCh.some((c: any) => String(c.name) === String(ch));
			}
			const raw =
				r?.properties?.["Глава"]?.rich_text?.map((t: any) => t.plain_text).join(" ") ??
				r?.properties?.["Глава"];
			if (raw) {
				for (const p of String(raw).split(/[,\u003B\u2013\u2014\u002D]/)) {
					if (p.trim() === String(ch)) return true;
				}
			}
			return false;
		});
		if (!filtered.length) {
			await ctx.reply("❌ В выбранной главе нет записей.");
			return;
		}
		session.notesCache = session.notesCache ?? {};
		session.notesCache.lastList = filtered;
		session.notesCache.backAction = `notes:book:${bookIdx}`;
		(ctx.session as any) = session;

		await safeEditMessage(ctx, `*Книга:* ${book}\n*Глава:* ${ch}\n\nВыберите запись:`, {
			parse_mode: "Markdown",
			reply_markup: kbRecordsList(filtered, session.notesCache.backAction),
		});
	});

	// открыть запись
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
				let pageObj: any = null;
				try {
					pageObj = await buildin.getPage(pageId);
				} catch {
					const all = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
					pageObj = all.find((r: any) => r.id === pageId) ?? null;
				}
				if (!pageObj) {
					await ctx.reply("❌ Не удалось загрузить данные записи.");
					return;
				}
				const files = getFiles(pageObj);
				const caption = formatRecordMessage(pageObj);
				const session = (ctx.session as any) ?? {};
				const lastList = session.notesCache?.lastList ?? [];
				const backAction = session.notesCache?.backAction ?? "notes:menu";

				if (!files.length) {
					await ctx.reply("⚠️ В записи нет файлов в поле 'Конспект'.\n\n" + caption, {
						parse_mode: "Markdown",
						reply_markup: kbRecordsList(lastList, backAction),
					});
					return;
				}
				const f = files[0];
				try {
					const buf = await downloadToBuffer(f.url);
					const input = new InputFile(buf, f.name);
					await ctx.replyWithDocument(input, {
						caption,
						parse_mode: "Markdown",
						reply_markup: kbRecordsList(lastList, backAction),
					});
				} catch {
					await ctx.replyWithDocument(f.url, {
						caption,
						parse_mode: "Markdown",
						reply_markup: kbRecordsList(lastList, backAction),
					});
				}
			},
			{ text: "⏳ Загружаю запись..." }
		);
	});
}
