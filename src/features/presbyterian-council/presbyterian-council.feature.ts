/**
 * features/presbyterian-council/presbyterian-council.feature.ts
 * --------------------------
 * Логика раздела "Пресвитерский совет"
 */

import { Bot } from "grammy";
import { format } from "date-fns";
import { MyContext } from "../../types/grammy-context";
import { MENU_LABELS } from "../../constants/button-lables";
import { requirePresbyterianCouncil } from "../../utils/guards";
import { logger } from "../../utils/logger";
import { getAllDatabaseRecords } from "../../services/buildin";
import { fetchNextPastorsEventByTitle } from "../../services/calendar";
import { escapeMdV2 } from "../../utils/text";
import { BuildinDatabaseRecord } from "../../types/buildin";
import {
	PRESBYTERIAN_COUNCIL_BUTTON_LABELS,
	PC_AGENDA_DATABASE_ID,
	PC_CALENDAR_EVENT_TITLE,
	PC_AGENDA_STATUS,
} from "./presbyterian-council.constants";
import {
	replyPresbyterianCouncilMenu,
	replyPCAgendaMenu,
} from "./presbyterian-council.keyboard";
import { PRESBYTERIAN_COUNCIL_TEXTS } from "./presbyterian-council.texts";

// ─────────────────────────────────────────────────────────────────────────────
// Типы свойств конкретной базы данных повестки
// ─────────────────────────────────────────────────────────────────────────────

interface AgendaProperties {
	title?: { title: Array<{ plain_text?: string; text?: { content: string } }> };
	Тема?: { multi_select: Array<{ name: string }> };
	Комментарий?: { rich_text: Array<{ plain_text?: string; text?: { content: string } }> };
	"Дата обсуждения"?: { date: { start: string } | null };
	Тип?: { select: { name: string } | null };
	Тайминг?: { select: { name: string } | null };
	Статус?: { select: { name: string } | null };
	"Дедлайн задачи"?: { date: { start: string } | null };
}

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
	const topics = (props.Тема?.multi_select ?? []).map((t) => t.name).join(", ");
	const comment = extractPlainText(props.Комментарий?.rich_text);
	const type = props.Тип?.select?.name ?? "";
	const timing = props.Тайминг?.select?.name ?? "";
	const deadline = formatDeadline(props["Дедлайн задачи"]?.date?.start);

	const lines: string[] = [
		`*${index}\\. ${escapeMdV2(titleText || "Без названия")}*`,
	];

	if (type) lines.push(`🏷 *Тип:* ${escapeMdV2(type)}`);
	if (topics) lines.push(`🔖 *Тема:* ${escapeMdV2(topics)}`);
	if (comment) lines.push(`💬 *Комментарий:* ${escapeMdV2(comment)}`);
	if (timing) lines.push(`⏱ *Тайминг:* ${escapeMdV2(timing)} мин`);
	if (deadline) lines.push(`⏰ *Дедлайн:* ${escapeMdV2(deadline)}`);

	return lines.join("\n");
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

		const loadingMsg = await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.agendaLoading);

		try {
			// 1. Найти ближайшее заседание совета в пасторском календаре
			logger.info("[PC] Ищем событие в пасторском календаре: '%s'", PC_CALENDAR_EVENT_TITLE);
			const councilEvent = await fetchNextPastorsEventByTitle(PC_CALENDAR_EVENT_TITLE);
			logger.info({ councilEvent }, "[PC] Результат поиска события в календаре");

			if (!councilEvent) {
				await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id).catch(() => {});
				await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.noCouncilEvent);
				return;
			}

			const councilDate = councilEvent.startsAt;
			const dateLabel = format(councilDate, "dd.MM.yyyy");
			logger.info("[PC] Дата заседания: %s", dateLabel);

			// 2. Загрузить записи базы повестки — только со статусом "На повестку", новые первыми
			logger.info("[PC] Запрашиваем базу Buildin: %s (фильтр: статус='%s')", PC_AGENDA_DATABASE_ID, PC_AGENDA_STATUS);
			const onAgendaRecords = await getAllDatabaseRecords(PC_AGENDA_DATABASE_ID, {
				filter: { property: "Статус", select: { equals: PC_AGENDA_STATUS } },
				sorts: [{ property: "Дата обсуждения", direction: "descending" }],
			});
			logger.info("[PC] Записей со статусом '%s': %d", PC_AGENDA_STATUS, onAgendaRecords.length);

			// Лог всех найденных + результат парсинга даты
			onAgendaRecords.forEach((r) => {
				const props = r.properties as Record<string, any>;
				const rawDate = props["Дата обсуждения"]?.date?.start ?? null;
				const parsed = rawDate ? parseBuildinDate(rawDate) : null;
				logger.info(
					{ rawDate, parsed,
					  title: (props["title"]?.title ?? []).map((t: any) => t.plain_text).join("") },
					"[PC] 'На повестку' запись"
				);
			});

			// 3. Отфильтровать по дате заседания (статус уже отфильтрован на сервере)
			const agendaItems = onAgendaRecords.filter((r) => recordMatchesDate(r, councilDate));
			logger.info("[PC] Из них с датой %s: %d", format(councilDate, "dd.MM.yyyy"), agendaItems.length);

			await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id).catch(() => {});

			if (agendaItems.length === 0) {
				await ctx.reply(PRESBYTERIAN_COUNCIL_TEXTS.noAgendaItems);
				return;
			}

			// 4. Вывести заголовок и список вопросов
			const header = `*📋 Повестка на совет ${escapeMdV2(dateLabel)}*\n\n*Вопросов на повестке: ${agendaItems.length}*`;
			await ctx.reply(header, { parse_mode: "MarkdownV2" });

			for (let i = 0; i < agendaItems.length; i++) {
				const text = formatAgendaRecord(agendaItems[i], i + 1);
				await ctx.reply(text, {
					parse_mode: "MarkdownV2",
					link_preview_options: { is_disabled: true },
				});
			}
		} catch (err) {
			await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id).catch(() => {});
			const message = err instanceof Error ? err.message : String(err);
			logger.error({ err }, "[PC] Ошибка при загрузке повестки");
			await ctx.reply(`❌ Ошибка при загрузке повестки: ${message}`);
		}
	});
}
