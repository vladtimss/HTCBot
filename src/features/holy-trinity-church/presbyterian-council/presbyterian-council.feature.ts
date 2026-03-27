/**
 * features/presbyterian-council/presbyterian-council.feature.ts
 * --------------------------
 * Основная логика раздела "Пресвитерский совет".
 *
 * Здесь живут:
 * - обработчики reply- и inline-кнопок;
 * - загрузка и нормализация повестки;
 * - формирование текстового fallback и PDF;
 * - сценарии "Ближайшая повестка" и "Все вопросы по датам".
 */

import { Bot, InputFile } from "grammy";
import { format } from "date-fns";
import os from "os";
import puppeteer                                                   from "puppeteer";
import { MyContext }                                               from "../../../types/grammy-context";
import { MENU_LABELS }                                             from "../../../constants/button-lables";
import { requirePresbyterianCouncil }                              from "../../../utils/guards";
import { logger }                                                  from "../../../utils/logger";
import { getAllDatabaseRecords }                                   from "../../../services/buildin";
import { fetchNextPastorsEventByTitle }                            from "../../../services/calendar";
import { removeLoadingMessage, replyWithSpinner, withLoading }     from "../../../utils/loading";
import { isGrammyTooManyRequests, safeReply }                      from "../../../utils/telegram-flood";
import { escapeMdV2 }                                              from "../../../utils/text";
import { BuildinDatabaseRecord }                                   from "../../../types/buildin";
import {
	PRESBYTERIAN_COUNCIL_BUTTON_LABELS,
	PC_AGENDA_DATABASE_ID,
	PC_CALENDAR_EVENT_TITLES,
}                                                                  from "./presbyterian-council.constants";
import {
	replyPresbyterianCouncilMenu,
	replyPCAgendaMenu,
	inlinePCAgendaYearsMenu,
	inlinePCAgendaMonthsMenu,
	inlinePCAgendaDatesMenu,
}                                                                  from "./presbyterian-council.keyboard";
import { PRESBYTERIAN_COUNCIL_TEXTS }                              from "./presbyterian-council.texts";
import { AgendaPdfBuildOptions, AgendaPdfRow, buildAgendaPdfHtml } from "./presbyterian-council.util";
import {
	buildNormalizedPresbyterianCouncilAgendaState,
	formatPCAgendaDate,
	getPCAgendaDatesForMonth,
	getPCAgendaMonthName,
	getPCAgendaMonthsForYear,
	getPCAgendaRecordsByIds,
	getPCAgendaDateKey,
	parsePCAgendaDate,
}                                                                  from "./presbyterian-council.state";

// ─────────────────────────────────────────────────────────────────────────────
// Типы свойств конкретной базы данных повестки
// ─────────────────────────────────────────────────────────────────────────────

/** Свойства записи повестки, которые реально используются внутри фичи. */
interface AgendaProperties {
	title?: { title: Array<{ plain_text?: string; text?: { content: string } }> };
	Тема?: { multi_select: Array<{ name: string; color?: string }> };
	Комментарий?: { rich_text: Array<{ plain_text?: string; text?: { content: string } }> };
	"Дата обсуждения"?: { date: { start: string } | null };
	Тип?: { select: { name: string } | null };
	Тайминг?: { select: { name: string } | null };
	Статус?: { select: { name: string; color?: string } | null };
	"Дедлайн задачи"?: { date: { start: string } | null };
}

/** Статическая карта авторов по `created_by.id`, пока Buildin не отдает удобное имя напрямую. */
const AUTHOR_NAMES_BY_ID: Record<string, string> = {
	"59bf20ad-946a-45d4-aaff-d7b8a01bc186": "Дима Левин",
	"ad3a53ab-9901-4598-9792-c8bfb361b9e7": "Влад Тимофеев",
	"3f22e238-7a9d-4016-b2c8-ba810e083104": "Влад Тимофеев",
	"c3c13655-5ca6-4c59-b195-abd0958a74c0": "Вадим Гыра",
};

// ─────────────────────────────────────────────────────────────────────────────
// Хелперы для форматирования и извлечения данных
// ─────────────────────────────────────────────────────────────────────────────

/** Склеивает plain-text фрагменты Buildin в одну строку. */
function extractPlainText(
	arr?: Array<{ plain_text?: string; text?: { content: string } }>
): string {
	if (!arr || arr.length === 0) return "";
	return arr.map((t) => t.plain_text ?? t.text?.content ?? "").join("").trim();
}

/** Приводит `properties` записи к локальной форме `AgendaProperties`. */
function getAgendaProps(record: BuildinDatabaseRecord): AgendaProperties {
	return record.properties as unknown as AgendaProperties;
}

/** Возвращает отображаемое имя автора по ID или сам ID как fallback. */
function resolveAuthorLabel(authorId: string | undefined): string {
	if (!authorId) return "";
	return AUTHOR_NAMES_BY_ID[authorId] ?? authorId;
}

/** Опции вывода вопросов в PDF и fallback-тексте. */
type AgendaRenderOptions = {
	showStatusColumn?: boolean;
};

/** Форматирует дедлайн из Buildin в вид `DD.MM.YYYY`. */
function formatDeadline(dateStr: string | null | undefined): string {
	if (!dateStr) return "";
	const parsed = parsePCAgendaDate(dateStr);
	if (!parsed) return dateStr.slice(0, 10);
	return `${String(parsed.day).padStart(2, "0")}.${String(parsed.month).padStart(2, "0")}.${parsed.year}`;
}

/** Форматирует одну запись повестки для текстового fallback в Telegram. */
function formatAgendaRecord(record: BuildinDatabaseRecord, index: number, options: AgendaRenderOptions = {}): string {
	const props = getAgendaProps(record);

	const titleText = extractPlainText(props.title?.title);
	const authorLabel = resolveAuthorLabel(record.created_by?.id);
	const topics = (props.Тема?.multi_select ?? []).map((t) => t.name).join(", ");
	const comment = extractPlainText(props.Комментарий?.rich_text);
	const type = props.Тип?.select?.name ?? "";
	const timing = props.Тайминг?.select?.name ?? "";
	const deadline = formatDeadline(props["Дедлайн задачи"]?.date?.start);

	const lines: string[] = [`*${index} \\- ${escapeMdV2(titleText || "Без названия")}*`];

	if (authorLabel) lines.push(`Автор \\- ${escapeMdV2(authorLabel)}`);
	if (topics) lines.push(`Тема \\- ${escapeMdV2(topics)}`);
	if (options.showStatusColumn && props.Статус?.select?.name) {
		lines.push(`Статус \\- ${escapeMdV2(props.Статус.select.name)}`);
	}
	if (timing) lines.push(`Тайминг \\- ${escapeMdV2(timing)} мин`);
	if (type) lines.push(`Тип \\- ${escapeMdV2(type)}`);
	if (comment) lines.push(`Комментарий \\- ${escapeMdV2(comment)}`);
	if (deadline) lines.push(`Дедлайн \\- ${escapeMdV2(deadline)}`);

	return lines.join("\n");
}

/** Собирает вопросы повестки в один или несколько Telegram-сообщений. */
function buildAgendaMessages(
	agendaItems: BuildinDatabaseRecord[],
	dateLabel: string,
	options: AgendaRenderOptions = {}
): string[] {
	const SEPARATOR = "\n\n━━━━━━━━━━━━━━━━━━━━\n";
	const MAX_LEN = 4000;

	const header = `*📋 Повестка на совет ${escapeMdV2(dateLabel)}*\n*Вопросов: ${agendaItems.length}*`;
	const blocks = agendaItems.map((r, i) => formatAgendaRecord(r, i + 1, options));

	const messages: string[] = [];
	let current = header;

	for (const block of blocks) {
		const candidate = current + SEPARATOR + block;
		if (candidate.length > MAX_LEN) {
			messages.push(current);
			current = block;
		} else {
			current = candidate;
		}
	}
	messages.push(current);

	return messages;
}

/** Отправляет повестку частями сообщений (MarkdownV2). */
async function sendAgendaAsTextParts(
	ctx: MyContext,
	dateLabel: string,
	agendaItems: BuildinDatabaseRecord[],
	options: AgendaRenderOptions = {}
) {
	const parts = buildAgendaMessages(agendaItems, dateLabel, options);
	for (const part of parts) {
		await ctx.reply(part, {
			parse_mode: "MarkdownV2",
			link_preview_options: { is_disabled: true },
		});
	}
}

/** Подготавливает строки таблицы PDF из записей Buildin. */
function buildAgendaPdfRows(
	agendaItems: BuildinDatabaseRecord[],
	options: AgendaRenderOptions = {}
): AgendaPdfRow[] {
	return agendaItems.map((record, index) => {
		const props = getAgendaProps(record);
		return {
			index: index + 1,
			title: extractPlainText(props.title?.title) || "Без названия",
			author: resolveAuthorLabel(record.created_by?.id) || "Не указан",
			topics: (props.Тема?.multi_select ?? []).map((topic) => ({
				name: topic.name,
				color: topic.color,
			})),
			status: options.showStatusColumn && props.Статус?.select?.name
				? {
					name: props.Статус.select.name,
					color: props.Статус.select.color,
				}
				: undefined,
			timing: props.Тайминг?.select?.name ?? "-",
		};
	});
}

/** Генерирует PDF для списка вопросов повестки. */
async function renderAgendaPdf(
	dateLabel: string,
	agendaItems: BuildinDatabaseRecord[],
	options: AgendaRenderOptions = {}
): Promise<Buffer> {
	const html = buildAgendaPdfHtml(
		dateLabel,
		buildAgendaPdfRows(agendaItems, options),
		{ showStatusColumn: options.showStatusColumn } satisfies AgendaPdfBuildOptions
	);
	const browser = await puppeteer.launch({
		headless: true,
		executablePath: os.platform() === "linux" ? "/usr/bin/chromium-browser" : undefined,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const page = await browser.newPage();
		await page.setContent(html, { waitUntil: "networkidle0" });
		return Buffer.from(
			await page.pdf({
				format: "A4",
				printBackground: true,
				scale: 0.9,
				margin: { top: "6mm", bottom: "6mm", left: "4mm", right: "4mm" },
			})
		);
	} finally {
		await browser.close().catch(() => {});
	}
}

/**
 * Гарантирует наличие нормализованного состояния в сессии.
 * Если состояние уже есть, повторно БД не запрашиваем.
 */
async function ensurePCAgendaState(
	ctx: MyContext,
	forceReload = false,
	loadingText?: string
) {
	if (!forceReload && ctx.session.pcAgendaState) {
		return ctx.session.pcAgendaState;
	}

	const task = async () => {
		const records = await getAllDatabaseRecords(PC_AGENDA_DATABASE_ID, {
			page_size: 100,
		});
		const state = buildNormalizedPresbyterianCouncilAgendaState(records);
		ctx.session.pcAgendaState = state;
		return state;
	};

	if (loadingText) {
		return withLoading(ctx, task, {
			text: loadingText,
			delayMs: 0,
		});
	}

	return task();
}

/** Достает записи для выбранной даты из уже построенного нормализованного состояния. */
function getAgendaItemsForDateKey(
	ctx: MyContext,
	dateKey: string,
	mode: "all" | "onAgenda" = "all"
): BuildinDatabaseRecord[] {
	const state = ctx.session.pcAgendaState;
	if (!state) {
		return [];
	}

	const dateNode = state.dates.byKey[dateKey];
	if (!dateNode) {
		return [];
	}

	const ids = mode === "onAgenda" ? dateNode.onAgendaItemIds : dateNode.itemIds;
	return getPCAgendaRecordsByIds(state, ids);
}

/**
 * Отправляет PDF, а если рендер PDF не удался — текстовый fallback.
 * Ошибку отправки (в т.ч. 429) не смешиваем с ошибкой генерации PDF;
 * при 429 не делаем fallback-текстом — это лишь усугубляет flood.
 */
async function sendAgendaPdfOrFallback(
	ctx: MyContext,
	dateLabel: string,
	agendaItems: BuildinDatabaseRecord[],
	options: AgendaRenderOptions = {}
) {
	let pdfBuffer: Buffer;
	try {
		pdfBuffer = await renderAgendaPdf(dateLabel, agendaItems, options);
	} catch (pdfErr) {
		logger.error({ err: pdfErr }, "[PC] Не удалось сформировать PDF, отправляем текстом");
		await sendAgendaAsTextParts(ctx, dateLabel, agendaItems, options);
		return;
	}

	const filename = `Повестка_совета_${dateLabel.replace(/\./g, "-")}.pdf`;
	try {
		await ctx.replyWithDocument(new InputFile(pdfBuffer, filename), {
			caption: `📋 Повестка на совет ${dateLabel}`,
		});
	} catch (sendErr) {
		if (isGrammyTooManyRequests(sendErr)) {
			throw sendErr;
		}
		logger.error({ err: sendErr }, "[PC] Не удалось отправить PDF, отправляем текстом");
		await sendAgendaAsTextParts(ctx, dateLabel, agendaItems, options);
	}
}

/** Отправляет первый экран истории повесток: список доступных лет. */
async function replyAgendaYears(ctx: MyContext) {
	const state = ctx.session.pcAgendaState;
	if (!state || state.dates.years.length === 0) {
		await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.noAgendaHistory);
		return;
	}

	await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.agendaDatesChooseYear.text, {
		entities: PRESBYTERIAN_COUNCIL_TEXTS.agendaDatesChooseYear.entities,
		reply_markup: inlinePCAgendaYearsMenu(state.dates.years),
	});
}

/** Отправляет второй экран истории повесток: месяцы выбранного года. */
async function replyAgendaMonths(ctx: MyContext, year: number) {
	const state = ctx.session.pcAgendaState;
	const months = state ? getPCAgendaMonthsForYear(state, year) : [];

	if (months.length === 0) {
		await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.noAgendaDatesForYear);
		return;
	}

	const text = PRESBYTERIAN_COUNCIL_TEXTS.agendaDatesChooseMonth(year);
	await ctx.reply(text.text, {
		entities: text.entities,
		reply_markup: inlinePCAgendaMonthsMenu(year, months),
	});
}

/** Отправляет третий экран истории повесток: даты выбранного месяца. */
async function replyAgendaDates(ctx: MyContext, year: number, month: number) {
	const state = ctx.session.pcAgendaState;
	const dates = state ? getPCAgendaDatesForMonth(state, year, month) : [];

	if (dates.length === 0) {
		await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.noAgendaDatesForMonth);
		return;
	}

	const text = PRESBYTERIAN_COUNCIL_TEXTS.agendaDatesChooseDate(getPCAgendaMonthName(month), year);
	await ctx.reply(text.text, {
		entities: text.entities,
		reply_markup: inlinePCAgendaDatesMenu(year, dates),
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Рендер корня
// ─────────────────────────────────────────────────────────────────────────────

export async function renderPresbyterianCouncilRoot(ctx: MyContext) {
	ctx.session.lastSection = "presbyterian-council";
	ctx.session.menuStack = ["holy-trinity-church", "presbyterian-council"];

	await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.title.text, {
		entities: PRESBYTERIAN_COUNCIL_TEXTS.title.entities,
		reply_markup: replyPresbyterianCouncilMenu,
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Регистрация обработчиков
// ─────────────────────────────────────────────────────────────────────────────

export function registerPresbyterianCouncil(bot: Bot<MyContext>) {
	// Вход в корень раздела из главного меню бота.
	bot.hears(MENU_LABELS.MAIN_PRESBYTERIAN_COUNCIL, async (ctx) => {
		if (!requirePresbyterianCouncil(ctx)) return;
		await renderPresbyterianCouncilRoot(ctx);
	});

	// Вход в подраздел "Повестка на совет".
	bot.hears(PRESBYTERIAN_COUNCIL_BUTTON_LABELS.PC_AGENDA, async (ctx) => {
		if (!requirePresbyterianCouncil(ctx)) return;

		ctx.session.menuStack.push("pc-agenda");
		ctx.session.lastSection = "pc-agenda";
		ctx.session.pcAgendaState = undefined;

		await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.agendaTitle.text, {
			entities: PRESBYTERIAN_COUNCIL_TEXTS.agendaTitle.entities,
			reply_markup: replyPCAgendaMenu,
		});
	});

	// Запуск сценария "Все вопросы по датам":
	// строим нормализованное состояние и показываем первый уровень — список лет.
	bot.hears(PRESBYTERIAN_COUNCIL_BUTTON_LABELS.PC_AGENDA_ALL_DATES, async (ctx) => {
		if (!requirePresbyterianCouncil(ctx)) return;

		await ensurePCAgendaState(ctx, false, PRESBYTERIAN_COUNCIL_TEXTS.agendaDatesLoading);
		await replyAgendaYears(ctx);
	});

	// Сценарий "Ближайшая повестка":
	// ищем ближайший совет в календаре и берем для него записи со статусом "На повестку".
	bot.hears(PRESBYTERIAN_COUNCIL_BUTTON_LABELS.PC_AGENDA_NEXT, async (ctx) => {
		if (!requirePresbyterianCouncil(ctx)) return;

		// Фаза 1: ищем ближайший совет в календаре
		const calendarText = PRESBYTERIAN_COUNCIL_TEXTS.agendaLoadingCalendar;
		const { message: loadingMsg, spinner } = await replyWithSpinner(ctx, calendarText);

		try {
			const councilEvent = await fetchNextPastorsEventByTitle(PC_CALENDAR_EVENT_TITLES);

			if (!councilEvent) {
				await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.noCouncilEvent);
				return;
			}

			const councilDate = councilEvent.startsAt;
			const dateLabel = format(councilDate, "dd.MM.yyyy");

			// Фаза 2: обновляем текст спиннера под загрузку повестки
			const dbText = PRESBYTERIAN_COUNCIL_TEXTS.agendaLoadingDb(dateLabel);
			spinner.setText(dbText);

			await ensurePCAgendaState(ctx);
			const agendaItems = getAgendaItemsForDateKey(ctx, getPCAgendaDateKey(councilDate), "onAgenda");

			if (agendaItems.length === 0) {
				await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.noAgendaItems);
				return;
			}

			await sendAgendaPdfOrFallback(ctx, dateLabel, agendaItems);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error({ err }, "[PC] Ошибка при загрузке повестки");
			if (isGrammyTooManyRequests(err)) {
				return;
			}
			await safeReply(ctx, `❌ Ошибка при загрузке повестки: ${message}`);
		} finally {
			spinner.stop();
			await removeLoadingMessage(ctx, loadingMsg);
		}
	});

	// Возврат к первому уровню inline-навигации: список лет.
	bot.callbackQuery("pc:agenda:dates:years", async (ctx) => {
		if (!requirePresbyterianCouncil(ctx)) return;
		await ctx.answerCallbackQuery().catch(() => {});

		await ensurePCAgendaState(ctx, false, PRESBYTERIAN_COUNCIL_TEXTS.agendaDatesLoading);
		await replyAgendaYears(ctx);
	});

	// Выбор года -> показываем месяцы.
	bot.callbackQuery(/^pc:agenda:dates:year:(\d{4})$/, async (ctx) => {
		if (!requirePresbyterianCouncil(ctx)) return;
		await ctx.answerCallbackQuery().catch(() => {});

		const year = parseInt(ctx.match[1], 10);
		await ensurePCAgendaState(ctx, false, PRESBYTERIAN_COUNCIL_TEXTS.agendaDatesLoading);
		await replyAgendaMonths(ctx, year);
	});

	// Выбор месяца -> показываем доступные даты внутри выбранного месяца.
	bot.callbackQuery(/^pc:agenda:dates:year:(\d{4}):month:(\d{1,2})$/, async (ctx) => {
		if (!requirePresbyterianCouncil(ctx)) return;
		await ctx.answerCallbackQuery().catch(() => {});

		const year = parseInt(ctx.match[1], 10);
		const month = parseInt(ctx.match[2], 10);
		await ensurePCAgendaState(ctx, false, PRESBYTERIAN_COUNCIL_TEXTS.agendaDatesLoading);
		await replyAgendaDates(ctx, year, month);
	});

	// Выбор даты -> формируем PDF по всем вопросам этой даты, включая их статусы.
	bot.callbackQuery(/^pc:agenda:dates:date:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
		if (!requirePresbyterianCouncil(ctx)) return;
		await ctx.answerCallbackQuery().catch(() => {});

		const dateKey = ctx.match[1];
		const parsed = parsePCAgendaDate(dateKey);
		if (!parsed) {
			await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.noAgendaItemsForDate(dateKey));
			return;
		}

		const displayLabel = formatPCAgendaDate(parsed, ".");
		await withLoading(
			ctx,
			async () => {
				await ensurePCAgendaState(ctx);
				const agendaItems = getAgendaItemsForDateKey(ctx, dateKey, "all");
				if (agendaItems.length === 0) {
					await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.noAgendaItemsForDate(displayLabel));
					return;
				}

				await sendAgendaPdfOrFallback(ctx, displayLabel, agendaItems, {
					showStatusColumn: true,
				});
			},
			{
				text: PRESBYTERIAN_COUNCIL_TEXTS.agendaDatePdfLoading(displayLabel),
				delayMs: 0,
			}
		);
	});
}
