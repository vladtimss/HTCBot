// src/features/meeting-notes/meeting-notes.ts
/**
 * Основная логика раздела "Конспекты ЛМГ"
 *
 * Изменения/цели:
 *  - показываем loader (withLoading) везде, где идут запросы к Buildin
 *  - более надёжный safeEditMessage (корректно работает с callback'ами от документов)
 *  - минимальная подпись к файлу: "YYYY-MM-DD - Заголовок"
 *  - при выдаче документа под ним рисуем навигационную клавиатуру (kbRecordsList / kbAfterLast)
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
	getDate,
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
 * Безопасное редактирование/ответ на callback:
 * - если callback пришёл от текстового сообщения → пытаемся editMessageText
 * - если callback пришёл от сообщения без text (например document/media) → удаляем reply_markup у исходного сообщения (если можем)
 *   и отправляем новое сообщение (ctx.reply) с нужным текстом.
 * - аккуратно обрабатываем "message is not modified" и другие ожидаемые ошибки.
 */
async function safeEditMessage(ctx: MyContext, text: string, opts?: any) {
	try {
		const cbMsg: any = (ctx.callbackQuery as any)?.message;

		// если исходное сообщение -- текстовое, пробуем редактировать
		if (cbMsg && typeof cbMsg.text === "string") {
			try {
				await ctx.editMessageText(text, opts);
				return;
			} catch (err: any) {
				const msg = String(err?.message ?? err);
				// если ошибка "not modified" — просто молча возвращаемся
				if (msg.includes("message is not modified")) return;
				// иначе продолжим fallback-логикой ниже
			}
		}

		// fallback: попробуем убрать inline-клавиатуру у исходного сообщения (игнорируем ошибки)
		try {
			await ctx.editMessageReplyMarkup(undefined);
		} catch {
			// игнорируем — возможно сообщение нельзя редактировать
		}

		// отправляем новое сообщение с нужным текстом (как reply)
		await ctx.reply(text, opts);
	} catch (err: any) {
		const msg = String(err?.message ?? err);
		// Игнорируем "message is not modified"
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
	// команда /notes — быстрое открытие меню
	bot.command("notes", async (ctx) => {
		await ctx.reply("📖 Конспекты ЛМГ — меню", { reply_markup: kbMainInline() });
	});

	// открыть меню (callback)
	bot.callbackQuery("notes:menu", async (ctx) => {
		await ctx.answerCallbackQuery();
		await safeEditMessage(ctx, "📖 Конспекты ЛМГ — меню", { reply_markup: kbMainInline() });
	});

	// назад в раздел МГ (кнопка "К разделу МГ")
	bot.callbackQuery("notes:backmg", async (ctx) => {
		await ctx.answerCallbackQuery();
		// просто пишем текст (пользователь сказал, что так делает) — оставляем минимальную реализацию
		await safeEditMessage(ctx, "📖 Малые группы — меню");
	});

	// Быстрый: конспект с прошлой встречи (с loader'ом)
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

				// минимальная подпись: дата - заголовок
				const dateStr = getDate(chosen) ?? "";
				const caption = `${dateStr ? dateStr + " - " : ""}${getTitle(chosen) ?? "Без названия"}`;

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

	// Подменю поиска (сразу предлагает варианты)
	bot.callbackQuery("notes:searchmenu", async (ctx) => {
		await ctx.answerCallbackQuery();
		await safeEditMessage(ctx, "🔎 Выберите способ поиска:", { reply_markup: kbSearchMenu() });
	});

	// По дате — показываем годы (не делаем запросов на годы — берем статично 2022..текущий год)
	bot.callbackQuery("notes:bydate", async (ctx) => {
		await ctx.answerCallbackQuery();
		await safeEditMessage(ctx, "📅 Выберите год:", { reply_markup: kbYears() });
	});

	// Выбор года -> собираем месяцы (кешируем monthsByYear в ctx.session)
	bot.callbackQuery(/^notes:year:(\d{4})$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const year = Number(ctx.match?.[1]);

		// сессия
		const session = (ctx.session as any) ?? {};
		session.notesCache = session.notesCache ?? {};
		session.notesCache.monthsByYear = session.notesCache.monthsByYear ?? {};

		// если есть в кеше — отдаем быстро
		if (Array.isArray(session.notesCache.monthsByYear[year]) && session.notesCache.monthsByYear[year].length > 0) {
			await safeEditMessage(ctx, `📅 ${year}: выберите месяц`, {
				reply_markup: kbMonths(year, session.notesCache.monthsByYear[year]),
			});
			(ctx.session as any) = session;
			return;
		}

		// иначе делаем загрузку (loader) и вычисляем месяцы
		await withLoading(
			ctx,
			async () => {
				const records = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
				const monthsNums = getMonthNumbers(records, year);

				// сохраняем в сессии
				session.notesCache.monthsByYear[year] = monthsNums;
				(ctx.session as any) = session;

				if (!monthsNums.length) {
					await ctx.reply("❌ Для выбранного года нет записей.");
					return;
				}
				await safeEditMessage(ctx, `📅 ${year}: выберите месяц`, { reply_markup: kbMonths(year, monthsNums) });
			},
			{ text: "⏳ Загружаю даты..." }
		);
	});

	// Выбор месяца -> список записей (и сохраняем lastList/backAction)
	bot.callbackQuery(/^notes:month:(\d{4}):(\d{1,2})$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const year = Number(ctx.match?.[1]);
		const month = Number(ctx.match?.[2]);

		await withLoading(
			ctx,
			async () => {
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
			},
			{ text: "⏳ Загружаю записи..." }
		);
	});

	// По книге — показываем список книг (и кешируем их как массив в session)
	bot.callbackQuery("notes:bybook", async (ctx) => {
		await ctx.answerCallbackQuery();
		await withLoading(
			ctx,
			async () => {
				const all = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
				const books = Array.from(
					new Set(
						all.flatMap((r: any) => (r?.properties?.["Книга"]?.multi_select ?? []).map((m: any) => m.name))
					)
				);

				if (!books.length) {
					await ctx.reply("❌ В базе нет значений свойства 'Книга'.");
					return;
				}

				// кешируем книги в сессии и создаём кнопки вида notes:book:<index>
				const session = (ctx.session as any) ?? {};
				session.notesCache = session.notesCache ?? {};
				session.notesCache.books = books;
				(ctx.session as any) = session;

				const kb = new InlineKeyboard();
				books.forEach((b, i) => kb.text(b.slice(0, 30), `notes:book:${i}`).row());
				kb.text("⬅️ Назад", "notes:searchmenu");
				await safeEditMessage(ctx, "*Выберите книгу:*", { parse_mode: "Markdown", reply_markup: kb });
			},
			{ text: "⏳ Загружаю книги..." }
		);
	});

	// Выбор книги -> собрать главы и показать
	bot.callbackQuery(/^notes:book:(\d+)$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const idx = Number(ctx.match?.[1]);
		const session = (ctx.session as any) ?? {};
		const book = session.notesCache?.books?.[idx];
		if (!book) {
			await ctx.reply("❌ Книга не найдена в кэше. Повторите поиск.");
			return;
		}

		await withLoading(
			ctx,
			async () => {
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

				// кешируем выбранную книгу и главы
				session.notesCache = session.notesCache ?? {};
				session.notesCache.lastBookIndex = idx;
				session.notesCache.bookChapters = chapters;
				(ctx.session as any) = session;

				const kb = new InlineKeyboard();
				chapters.forEach((ch, i) => kb.text(ch, `notes:bookchapter:${idx}:${i}`).row());
				kb.text("⬅️ Назад", "notes:bybook");
				await safeEditMessage(ctx, `*Книга:* ${book}\n*Выберите главу:*`, {
					parse_mode: "Markdown",
					reply_markup: kb,
				});
			},
			{ text: "⏳ Загружаю главы..." }
		);
	});

	// Выбор главы -> список записей (и кешируем lastList/backAction)
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

		await withLoading(
			ctx,
			async () => {
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
			},
			{ text: "⏳ Загружаю записи..." }
		);
	});

	// Открыть запись — отправляем файл(ы). Под документом прикрепляем ту же клавиатуру lastList
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
				// минимальная подпись: YYYY-MM-DD - Title
				const dateStr = getDate(pageObj) ?? "";
				const caption = `${dateStr ? dateStr + " - " : ""}${getTitle(pageObj) ?? "Без названия"}`;

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

				// отправляем первый файл (как правило PDF) и рисуем навигацию под ним
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

	// По ключевым словам — переводим в режим ожидания текста
	bot.callbackQuery("notes:bykeywords", async (ctx) => {
		await ctx.answerCallbackQuery();
		// Отправляем подсказку и кнопку "назад"
		await safeEditMessage(
			ctx,
			"🔑 Введите ключевое слово или несколько слов для поиска.\n\nОтправьте их обычным сообщением в чат.",
			{ reply_markup: new InlineKeyboard().text("⬅️ Назад", "notes:searchmenu") }
		);

		const session = (ctx.session as any) ?? {};
		session.notesCache = session.notesCache ?? {};
		session.notesCache.awaitingKeywords = true;
		(ctx.session as any) = session;
	});

	// Отмена поиска (команда)
	bot.command("cancel_search", async (ctx) => {
		(ctx.session as any) = (ctx.session as any) ?? {};
		if ((ctx.session as any).notesCache) {
			(ctx.session as any).notesCache.awaitingKeywords = false;
		}
		await ctx.reply("Поиск отменён.");
	});

	// Обработка текстового ввода — поиск по ключевым словам
	bot.on("message:text", async (ctx, next) => {
		const session = (ctx.session as any) ?? {};
		if (!session.notesCache?.awaitingKeywords) {
			return next();
		}

		const query = (ctx.message?.text ?? "").trim().toLowerCase();
		// снимаем флаг немедленно, чтобы не допустить параллельных поисков
		session.notesCache.awaitingKeywords = false;
		(ctx.session as any) = session;

		if (!query) {
			await ctx.reply("❌ Пустой запрос. Введите ключевое слово.");
			return;
		}

		await withLoading(
			ctx,
			async () => {
				const all = await buildin.listAllRecords("lmgNotes", FETCH_PAGE_SIZE, 2000);
				const filtered = all.filter((r: any) => {
					const title = (getTitle(r) ?? "").toLowerCase();
					const text =
						(r?.properties?.["Текст"]?.rich_text ?? [])
							.map((t: any) => t.plain_text ?? "")
							.join(" ")
							.toLowerCase() ?? "";
					// также ищем по датам/теме
					const ds = extractAllDateStrings(r).join(" ").toLowerCase();
					return title.includes(query) || text.includes(query) || ds.includes(query);
				});

				if (!filtered.length) {
					await ctx.reply("❌ Ничего не найдено по запросу.");
					return;
				}

				// кешируем результаты поиска и backAction = notes:bykeywords
				const s = (ctx.session as any) ?? {};
				s.notesCache = s.notesCache ?? {};
				s.notesCache.lastList = filtered;
				s.notesCache.backAction = "notes:bykeywords";
				(ctx.session as any) = s;

				// показываем первые 5 результатов и клавиатуру (под документами будет та же клавиатура)
				const top = filtered.slice(0, 5);
				for (const r of top) {
					const files = getFiles(r);
					const dateStr = getDate(r) ?? "";
					const caption = `${dateStr ? dateStr + " - " : ""}${getTitle(r) ?? "Без названия"}`;
					if (files.length) {
						try {
							const buf = await downloadToBuffer(files[0].url);
							const input = new InputFile(buf, files[0].name);
							await ctx.replyWithDocument(input, {
								caption,
								reply_markup: kbRecordsList(top, s.notesCache.backAction),
							});
						} catch {
							await ctx.replyWithDocument(files[0].url, {
								caption,
								reply_markup: kbRecordsList(top, s.notesCache.backAction),
							});
						}
					} else {
						await ctx.reply(caption, { reply_markup: kbRecordsList(top, s.notesCache.backAction) });
					}
				}

				if (filtered.length > 5) await ctx.reply(`И ещё ${filtered.length - 5} результатов...`);
			},
			{ text: `🔎 Ищу "${query}"...` }
		);
	});
}
