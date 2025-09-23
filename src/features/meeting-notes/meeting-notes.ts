// src/features/meeting-notes/meeting-notes.ts
/**
 * Основная логика раздела "Конспекты ЛМГ"
 * - использует сервис buildin
 * - кеширует list/backAction в ctx.session.notesCache
 * - скачивает файлы и отправляет как InputFile (чтобы сохранить кириллицу имени)
 * - safeEditMessage умеет корректно работать, когда callback пришёл из сообщения с документом
 */

import { Bot, InputFile, InlineKeyboard } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { withLoading } from "../../utils/loading";
import buildin from "../../services/buildin";
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

/**
 * safeEditMessage:
 * - если callback пришёл от текстового сообщения -> editMessageText
 * - если callback пришёл от сообщения без поля text (например document) -> reply новым сообщением
 * - игнорируем "message is not modified" ошибку
 */
async function safeEditMessage(ctx: MyContext, text: string, opts?: any) {
	try {
		// определяем сообщение откуда пришёл callback
		const cbMsg: any = (ctx.callbackQuery as any)?.message;

		// если это обычное текстовое сообщение — редактируем его
		if (cbMsg && typeof cbMsg.text === "string") {
			await ctx.editMessageText(text, opts);
			return;
		}

		// иначе — пробуем сначала убрать inline-клавиатуру у исходного сообщения (если есть),
		// чтобы не оставлять "мертвые" кнопки под документом.
		try {
			if (cbMsg && (cbMsg.message_id || cbMsg.message_id === 0)) {
				// Попытка очистить reply_markup у сообщения-источника (игнорируем ошибки)
				await ctx.editMessageReplyMarkup(undefined);
			}
		} catch (e) {
			// игнорируем — это вспомогательная операция
		}

		// и отправляем новый текст (как reply) с нужными параметрами
		await ctx.reply(text, opts);
	} catch (err: any) {
		const msg = String(err?.message ?? err);
		// Игнорируем корректную, но шумную ошибку Telegram
		if (msg.includes("message is not modified")) return;
		// Если ошибка связана с кнопками -> логируем и пробрасываем
		if (msg.includes("BUTTON_DATA_INVALID")) {
			console.error("BUTTON_DATA_INVALID in safeEditMessage:", err);
			throw err;
		}
		// Неожиданная ошибка — логируем и пробрасываем
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

	// последний конспект (дата <= сейчас)
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
					await ctx.reply("⚠️ В записи нет файлов в поле 'Конспект'.\n\n" + caption);
					return;
				}

				const f = files[0];
				try {
					const buf = await downloadToBuffer(f.url);
					const input = new InputFile(buf, f.name);
					await ctx.replyWithDocument(input, { caption });
				} catch {
					await ctx.replyWithDocument(f.url, { caption });
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

	// по дате: показать годы
	bot.callbackQuery("notes:bydate", async (ctx) => {
		await ctx.answerCallbackQuery();
		await safeEditMessage(ctx, "📅 Выберите год:", { reply_markup: kbYears() });
	});

	// выбрать год -> месяцы (кешируем monthsByYear в сессии)
	bot.callbackQuery(/^notes:year:(\d{4})$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const year = Number(ctx.match?.[1]);

		const session = (ctx.session as any) ?? {};
		session.notesCache = session.notesCache ?? {};
		session.notesCache.monthsByYear = session.notesCache.monthsByYear ?? {};

		// есть в кеше?
		if (Array.isArray(session.notesCache.monthsByYear[year]) && session.notesCache.monthsByYear[year].length > 0) {
			await safeEditMessage(ctx, `📅 ${year}: выберите месяц`, {
				reply_markup: kbMonths(year, session.notesCache.monthsByYear[year]),
			});
			(ctx.session as any) = session;
			return;
		}

		// иначе получить все записи и собрать месяцы
		const records = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
		const monthsNums = getMonthNumbers(records, year);

		// сохранить в сессии
		session.notesCache.monthsByYear[year] = monthsNums;
		(ctx.session as any) = session;

		if (!monthsNums.length) {
			await ctx.reply("❌ Для выбранного года нет записей.");
			return;
		}
		await safeEditMessage(ctx, `📅 ${year}: выберите месяц`, { reply_markup: kbMonths(year, monthsNums) });
	});

	// выбрать месяц -> список записей (и сохраняем lastList/backAction)
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

		// кешируем текущий список и backAction (back — на уровень года)
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

	// по книге — список книг (с индексами)
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

		// сохраняем книги в сессии и создаём кнопки вида notes:book:<index>
		const session = (ctx.session as any) ?? {};
		session.notesCache = session.notesCache ?? {};
		session.notesCache.books = books;
		(ctx.session as any) = session;

		const kb = new InlineKeyboard();
		books.forEach((b, i) => kb.text(b.slice(0, 30), `notes:book:${i}`).row());
		kb.text("⬅️ Назад", "notes:searchmenu");
		await safeEditMessage(ctx, "*Выберите книгу:*", { parse_mode: "Markdown", reply_markup: kb });
	});

	// выбрать книгу (index) -> собрать главы и показать (callback notes:book:<index>)
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
			// multi_select главы
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

		// кешируем выбранную книгу и главы
		session.notesCache = session.notesCache ?? {};
		session.notesCache.lastBookIndex = idx;
		session.notesCache.bookChapters = chapters;
		(ctx.session as any) = session;

		const kb = new InlineKeyboard();
		chapters.forEach((ch, i) => kb.text(ch, `notes:bookchapter:${idx}:${i}`).row());
		kb.text("⬅️ Назад", "notes:bybook");
		await safeEditMessage(ctx, `*Книга:* ${book}\n*Выберите главу:*`, { parse_mode: "Markdown", reply_markup: kb });
	});

	// выбрать главу -> список записей для книги/главы
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
			// проверяем книгу
			const ms = r?.properties?.["Книга"]?.multi_select ?? [];
			if (!ms.some((m: any) => m.name === book)) return false;
			// проверяем главы (multi_select или парсинг)
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

		// кешируем lastList/backAction (back — к книге)
		session.notesCache = session.notesCache ?? {};
		session.notesCache.lastList = filtered;
		session.notesCache.backAction = `notes:book:${bookIdx}`;
		(ctx.session as any) = session;

		await safeEditMessage(ctx, `*Книга:* ${book}\n*Глава:* ${ch}\n\nВыберите запись:`, {
			parse_mode: "Markdown",
			reply_markup: kbRecordsList(filtered, session.notesCache.backAction),
		});
	});

	// открыть запись — отправляем файлы и под документом рисуем ту же клавиатуру lastList
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
				// пробуем получить страницу напрямую
				let pageObj: any = null;
				try {
					pageObj = await buildin.getPage(pageId);
				} catch {
					// fallback: искать в базе
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
					// прикрепляем клавиатуру к сообщению с текстом
					await ctx.reply("⚠️ В записи нет файлов в поле 'Конспект'.\n\n" + caption, {
						reply_markup: kbRecordsList(lastList, backAction),
					});
					return;
				}

				// отправляем все файлы; под каждым файлом рисуем ту же клавиатуру (в случае callback'а от документа safeEditMessage ответит новым сообщением)
				for (const f of files) {
					try {
						const buf = await downloadToBuffer(f.url);
						const input = new InputFile(buf, f.name);
						await ctx.replyWithDocument(input, {
							caption,
							reply_markup: kbRecordsList(lastList, backAction),
						});
					} catch {
						await ctx.replyWithDocument(f.url, {
							caption,
							reply_markup: kbRecordsList(lastList, backAction),
						});
					}
				}
			},
			{ text: "⏳ Получаю конспект..." }
		);
	});

	// по ключевым словам (режим сессии)
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

	// отмена поиска
	bot.command("cancel_search", async (ctx) => {
		(ctx.session as any) = (ctx.session as any) ?? {};
		if ((ctx.session as any).notes) {
			(ctx.session as any).notes.searchMode = undefined;
			(ctx.session as any).notes.searchInProgress = false;
		}
		await ctx.reply("Поиск отменён.");
	});

	// обработка текстовых сообщений — поиск по ключевым словам
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
					sess.searchInProgress = false;
					return;
				}

				// кешируем результаты поиска и backAction = notes:searchmenu
				const session = (ctx.session as any) ?? {};
				session.notesCache = session.notesCache ?? {};
				session.notesCache.lastList = matches;
				session.notesCache.backAction = "notes:searchmenu";
				(ctx.session as any) = session;

				const top = matches.slice(0, 5);
				for (const r of top) {
					const files = getFiles(r);
					const caption = formatRecordMessage(r);
					if (files.length) {
						try {
							const buf = await downloadToBuffer(files[0].url);
							const input = new InputFile(buf, files[0].name);
							await ctx.replyWithDocument(input, {
								caption,
								reply_markup: kbRecordsList(top, session.notesCache.backAction),
							});
						} catch {
							await ctx.replyWithDocument(files[0].url, {
								caption,
								reply_markup: kbRecordsList(top, session.notesCache.backAction),
							});
						}
					} else {
						await ctx.reply(caption, { reply_markup: kbRecordsList(top, session.notesCache.backAction) });
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
