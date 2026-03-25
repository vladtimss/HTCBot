/**
 * features/presbyterian-council/presbyterian-council.feature.ts
 * --------------------------
 * Логика раздела "Пресвитерский совет"
 */

import { Bot, InputFile } from "grammy";
import { format } from "date-fns";
import os from "os";
import puppeteer from "puppeteer";
import { MyContext } from "../../types/grammy-context";
import { MENU_LABELS } from "../../constants/button-lables";
import { requirePresbyterianCouncil } from "../../utils/guards";
import { logger } from "../../utils/logger";
import { getAllDatabaseRecords } from "../../services/buildin";
import { fetchNextPastorsEventByTitle } from "../../services/calendar";
import { removeLoadingMessage, replyWithSpinner } from "../../utils/loading";
import { escapeMdV2 } from "../../utils/text";
import { BuildinDatabaseRecord } from "../../types/buildin";
import {
	PRESBYTERIAN_COUNCIL_BUTTON_LABELS,
	PC_AGENDA_DATABASE_ID,
	PC_CALENDAR_EVENT_TITLES,
	PC_AGENDA_STATUS,
} from "./presbyterian-council.constants";
import {
	replyPresbyterianCouncilMenu,
	replyPCAgendaMenu,
} from "./presbyterian-council.keyboard";
import { PRESBYTERIAN_COUNCIL_TEXTS } from "./presbyterian-council.texts";
import { AgendaPdfRow, buildAgendaPdfHtml } from "./presbyterian-council.util";

// ─────────────────────────────────────────────────────────────────────────────
// Типы свойств конкретной базы данных повестки
// ─────────────────────────────────────────────────────────────────────────────

interface AgendaProperties {
	title?: { title: Array<{ plain_text?: string; text?: { content: string } }> };
	Тема?: { multi_select: Array<{ name: string; color?: string }> };
	Комментарий?: { rich_text: Array<{ plain_text?: string; text?: { content: string } }> };
	"Дата обсуждения"?: { date: { start: string } | null };
	Тип?: { select: { name: string } | null };
	Тайминг?: { select: { name: string } | null };
	Статус?: { select: { name: string } | null };
	"Дедлайн задачи"?: { date: { start: string } | null };
}

const AUTHOR_NAMES_BY_ID: Record<string, string> = {
	"59bf20ad-946a-45d4-aaff-d7b8a01bc186": "Дима Левин",
	"ad3a53ab-9901-4598-9792-c8bfb361b9e7": "Влад Тимофеев",
	"3f22e238-7a9d-4016-b2c8-ba810e083104": "Влад Тимофеев",
	"c3c13655-5ca6-4c59-b195-abd0958a74c0": "Вадим Гыра",
};

// ─────────────────────────────────────────────────────────────────────────────
// Хелперы
// ─────────────────────────────────────────────────────────────────────────────

function extractPlainText(
	arr?: Array<{ plain_text?: string; text?: { content: string } }>
): string {
	if (!arr || arr.length === 0) return "";
	return arr.map((t) => t.plain_text ?? t.text?.content ?? "").join("").trim();
}

function getAgendaProps(record: BuildinDatabaseRecord): AgendaProperties {
	return record.properties as unknown as AgendaProperties;
}

function resolveAuthorLabel(authorId: string | undefined): string {
	if (!authorId) return "";
	return AUTHOR_NAMES_BY_ID[authorId] ?? authorId;
}

/**
 * Парсит дату из Buildin.
 * Buildin хранит даты в нескольких нестандартных форматах:
 *   "2026/01/13T00:00:00"        — YYYY/MM/DD (все слэши, встречается в новых записях)
 *   "2024/05-07T20:50:00+03:00"  — YYYY/MM-DD (слэш + дефис, старые записи)
 *   "2024-03-24"                 — стандартный ISO
 */
function parseBuildinDate(dateStr: string): { year: number; month: number; day: number } | null {
	// YYYY/MM/DD... (все слэши)
	const allSlashes = dateStr.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
	if (allSlashes) {
		return { year: +allSlashes[1], month: +allSlashes[2], day: +allSlashes[3] };
	}
	// YYYY/MM-DD... (слэш + дефис)
	const slashDash = dateStr.match(/^(\d{4})\/(\d{2})-(\d{2})/);
	if (slashDash) {
		return { year: +slashDash[1], month: +slashDash[2], day: +slashDash[3] };
	}
	// Стандартный ISO: YYYY-MM-DD...
	const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) {
		return { year: +iso[1], month: +iso[2], day: +iso[3] };
	}
	return null;
}

/**
 * Проверить совпадение даты записи с датой заседания совета.
 */
function recordMatchesDate(record: BuildinDatabaseRecord, target: Date): boolean {
	const props = getAgendaProps(record);
	const dateStart = props["Дата обсуждения"]?.date?.start;
	if (!dateStart) return false;

	const parsed = parseBuildinDate(dateStart);
	if (!parsed) return false;

	return (
		parsed.year === target.getFullYear() &&
		parsed.month === target.getMonth() + 1 &&
		parsed.day === target.getDate()
	);
}

/**
 * Форматировать запись повестки для Telegram (MarkdownV2).
 */
function formatDeadline(dateStr: string | null | undefined): string {
	if (!dateStr) return "";
	const parsed = parseBuildinDate(dateStr);
	if (!parsed) return dateStr.slice(0, 10);
	return `${String(parsed.day).padStart(2, "0")}.${String(parsed.month).padStart(2, "0")}.${parsed.year}`;
}

function formatAgendaRecord(record: BuildinDatabaseRecord, index: number): string {
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
	if (timing) lines.push(`Тайминг \\- ${escapeMdV2(timing)} мин`);
	if (type) lines.push(`Тип \\- ${escapeMdV2(type)}`);
	if (comment) lines.push(`Комментарий \\- ${escapeMdV2(comment)}`);
	if (deadline) lines.push(`Дедлайн \\- ${escapeMdV2(deadline)}`);

	return lines.join("\n");
}

/**
 * Собрать все вопросы повестки в одно сообщение (или несколько, если > 4000 символов).
 */
function buildAgendaMessages(
	agendaItems: BuildinDatabaseRecord[],
	dateLabel: string
): string[] {
	const SEPARATOR = "\n\n━━━━━━━━━━━━━━━━━━━━\n";
	const MAX_LEN = 4000;

	const header = `*📋 Повестка на совет ${escapeMdV2(dateLabel)}*\n*Вопросов: ${agendaItems.length}*`;
	const blocks = agendaItems.map((r, i) => formatAgendaRecord(r, i + 1));

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

function buildAgendaPdfRows(agendaItems: BuildinDatabaseRecord[]): AgendaPdfRow[] {
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
			timing: props.Тайминг?.select?.name ?? "-",
		};
	});
}

async function renderAgendaPdf(dateLabel: string, agendaItems: BuildinDatabaseRecord[]): Promise<Buffer> {
	const html = buildAgendaPdfHtml(dateLabel, buildAgendaPdfRows(agendaItems));
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

// ─────────────────────────────────────────────────────────────────────────────
// Рендер корня
// ─────────────────────────────────────────────────────────────────────────────

export async function renderPresbyterianCouncilRoot(ctx: MyContext) {
	ctx.session.lastSection = "presbyterian-council";
	ctx.session.menuStack = ["main", "presbyterian-council"];

	await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.title.text, {
		entities: PRESBYTERIAN_COUNCIL_TEXTS.title.entities,
		reply_markup: replyPresbyterianCouncilMenu,
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Регистрация обработчиков
// ─────────────────────────────────────────────────────────────────────────────

export function registerPresbyterianCouncil(bot: Bot<MyContext>) {
	// Вход в раздел из главного меню
	bot.hears(MENU_LABELS.MAIN_PRESBYTERIAN_COUNCIL, async (ctx) => {
		if (!requirePresbyterianCouncil(ctx)) return;
		await renderPresbyterianCouncilRoot(ctx);
	});

	// Подраздел "Повестка на совет"
	bot.hears(PRESBYTERIAN_COUNCIL_BUTTON_LABELS.PC_AGENDA, async (ctx) => {
		if (!requirePresbyterianCouncil(ctx)) return;

		ctx.session.menuStack.push("pc-agenda");
		ctx.session.lastSection = "pc-agenda";

		await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.agendaTitle.text, {
			entities: PRESBYTERIAN_COUNCIL_TEXTS.agendaTitle.entities,
			reply_markup: replyPCAgendaMenu,
		});
	});

	// Кнопка "Ближайшая повестка"
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

			const allRecords = await getAllDatabaseRecords(PC_AGENDA_DATABASE_ID, {
				page_size: 100,
			});

			const onAgendaRecords = allRecords.filter((r) => {
				const props = r.properties as AgendaProperties;
				return props["Статус"]?.select?.name === PC_AGENDA_STATUS;
			});

			const agendaItems = onAgendaRecords.filter((r) => recordMatchesDate(r, councilDate));

			if (agendaItems.length === 0) {
				await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.noAgendaItems);
				return;
			}

			try {
				const pdfBuffer = await renderAgendaPdf(dateLabel, agendaItems);

				const filename = `Повестка_совета_${dateLabel.replace(/\./g, "-")}.pdf`;
				await ctx.replyWithDocument(new InputFile(pdfBuffer, filename), {
					caption: `📋 Повестка на совет ${dateLabel}`,
				});
			} catch (pdfErr) {
				logger.error({ err: pdfErr }, "[PC] Не удалось сформировать PDF, отправляем текстом");

				const parts = buildAgendaMessages(agendaItems, dateLabel);
				for (const part of parts) {
					await ctx.reply(part, {
						parse_mode: "MarkdownV2",
						link_preview_options: { is_disabled: true },
					});
				}
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error({ err }, "[PC] Ошибка при загрузке повестки");
			await ctx.reply(`❌ Ошибка при загрузке повестки: ${message}`);
		} finally {
			spinner.stop();
			await removeLoadingMessage(ctx, loadingMsg);
		}
	});
}
