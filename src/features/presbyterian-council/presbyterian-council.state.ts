/**
 * features/presbyterian-council/presbyterian-council.state.ts
 * -----------------------------------------------------------
 * Нормализованное состояние повестки пресвитерского совета.
 *
 * Задача этого файла:
 * - один раз разобрать все записи Buildin;
 * - сгруппировать их по датам;
 * - быстро отдавать годы, месяцы и даты для inline-навигации;
 * - не пересчитывать дерево дат на каждый клик пользователя.
 */

import { BuildinDatabaseRecord } from "../../types/buildin";
import { PC_AGENDA_STATUS } from "./presbyterian-council.constants";

/** Минимальный набор полей записи, которые нужны для построения индекса по датам. */
type AgendaIndexProperties = {
	"Дата обсуждения"?: { date: { start: string } | null };
	Статус?: { select: { name: string } | null };
};

/** Нормализованный узел конкретной даты обсуждения. */
export type PresbyterianCouncilAgendaDateNode = {
	key: string;
	buttonLabel: string;
	displayLabel: string;
	year: number;
	month: number;
	day: number;
	itemIds: string[];
	onAgendaItemIds: string[];
};

/** Полное состояние раздела "Все вопросы по датам". */
export type NormalizedPresbyterianCouncilAgendaState = {
	records: {
		byId: Record<string, BuildinDatabaseRecord>;
		allIds: string[];
	};
	dates: {
		byKey: Record<string, PresbyterianCouncilAgendaDateNode>;
		allKeys: string[];
		years: number[];
		monthsByYear: Record<number, number[]>;
		dateKeysByMonth: Record<string, string[]>;
	};
};

/** Русские названия месяцев для inline-навигации. */
const MONTH_NAMES = [
	"Январь",
	"Февраль",
	"Март",
	"Апрель",
	"Май",
	"Июнь",
	"Июль",
	"Август",
	"Сентябрь",
	"Октябрь",
	"Ноябрь",
	"Декабрь",
] as const;

/** Возвращает название месяца по номеру 1..12. */
export function getPCAgendaMonthName(month: number): string {
	return MONTH_NAMES[month - 1] ?? `Месяц ${month}`;
}

/**
 * Парсит нестандартные форматы даты из Buildin.
 * Поддерживаются все форматы, которые уже встречались в базе повестки.
 */
export function parsePCAgendaDate(
	dateStr: string
): { year: number; month: number; day: number } | null {
	const allSlashes = dateStr.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
	if (allSlashes) {
		return { year: +allSlashes[1], month: +allSlashes[2], day: +allSlashes[3] };
	}

	const slashDash = dateStr.match(/^(\d{4})\/(\d{2})-(\d{2})/);
	if (slashDash) {
		return { year: +slashDash[1], month: +slashDash[2], day: +slashDash[3] };
	}

	const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) {
		return { year: +iso[1], month: +iso[2], day: +iso[3] };
	}

	return null;
}

/** Преобразует Date в ключ вида YYYY-MM-DD. */
export function getPCAgendaDateKey(date: Date): string {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join("-");
}

/** Форматирует дату для показа пользователю: DD.MM.YYYY или DD-MM-YYYY. */
export function formatPCAgendaDate(
	parts: { year: number; month: number; day: number },
	separator = "."
): string {
	return [
		String(parts.day).padStart(2, "0"),
		String(parts.month).padStart(2, "0"),
		String(parts.year),
	].join(separator);
}

/** Внутренний ключ месяца для индекса вида YYYY-MM. */
function getMonthKey(year: number, month: number): string {
	return `${year}-${String(month).padStart(2, "0")}`;
}

/** Безопасно приводит raw properties записи к форме, нужной для индексации. */
function getAgendaIndexProps(record: BuildinDatabaseRecord): AgendaIndexProperties {
	return record.properties as unknown as AgendaIndexProperties;
}

/**
 * Строит нормализованное состояние по всем вопросам.
 *
 * На выходе получаем:
 * - словарь всех записей по ID;
 * - словарь всех дат по ключу;
 * - список доступных лет;
 * - список месяцев в каждом году;
 * - список дат в каждом месяце.
 */
export function buildNormalizedPresbyterianCouncilAgendaState(
	records: BuildinDatabaseRecord[]
): NormalizedPresbyterianCouncilAgendaState {
	const byId: Record<string, BuildinDatabaseRecord> = {};
	const allIds: string[] = [];
	const byKey: Record<string, PresbyterianCouncilAgendaDateNode> = {};
	const monthsByYearSet = new Map<number, Set<number>>();
	const dateKeysByMonthSet = new Map<string, string[]>();

	for (const record of records) {
		if (record.archived) {
			continue;
		}

		byId[record.id] = record;
		allIds.push(record.id);

		const props = getAgendaIndexProps(record);
		const rawDate = props["Дата обсуждения"]?.date?.start;
		if (!rawDate) {
			continue;
		}

		const parsed = parsePCAgendaDate(rawDate);
		if (!parsed) {
			continue;
		}

		const key = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
		const existing = byKey[key] ?? {
			key,
			buttonLabel: formatPCAgendaDate(parsed, "-"),
			displayLabel: formatPCAgendaDate(parsed, "."),
			year: parsed.year,
			month: parsed.month,
			day: parsed.day,
			itemIds: [],
			onAgendaItemIds: [],
		};

		existing.itemIds.push(record.id);
		if (props.Статус?.select?.name === PC_AGENDA_STATUS) {
			existing.onAgendaItemIds.push(record.id);
		}
		byKey[key] = existing;

		if (!monthsByYearSet.has(parsed.year)) {
			monthsByYearSet.set(parsed.year, new Set<number>());
		}
		monthsByYearSet.get(parsed.year)!.add(parsed.month);

		const monthKey = getMonthKey(parsed.year, parsed.month);
		const monthDateKeys = dateKeysByMonthSet.get(monthKey) ?? [];
		if (!monthDateKeys.includes(key)) {
			monthDateKeys.push(key);
			dateKeysByMonthSet.set(monthKey, monthDateKeys);
		}
	}

	// Навигацию по истории показываем в естественном порядке: от ранних дат к поздним.
	const years = Array.from(monthsByYearSet.keys()).sort((a, b) => a - b);
	const monthsByYear: Record<number, number[]> = {};
	for (const year of years) {
		monthsByYear[year] = Array.from(monthsByYearSet.get(year) ?? []).sort((a, b) => a - b);
	}

	const dateKeysByMonth: Record<string, string[]> = {};
	for (const [monthKey, keys] of dateKeysByMonthSet.entries()) {
		dateKeysByMonth[monthKey] = keys.sort((a, b) => a.localeCompare(b));
	}

	return {
		records: {
			byId,
			allIds,
		},
		dates: {
			byKey,
			allKeys: Object.keys(byKey).sort((a, b) => a.localeCompare(b)),
			years,
			monthsByYear,
			dateKeysByMonth,
		},
	};
}

/** Возвращает месяцы выбранного года уже в отсортированном виде. */
export function getPCAgendaMonthsForYear(
	state: NormalizedPresbyterianCouncilAgendaState,
	year: number
): number[] {
	return state.dates.monthsByYear[year] ?? [];
}

/** Возвращает все даты выбранного месяца уже в порядке, заданном состоянием. */
export function getPCAgendaDatesForMonth(
	state: NormalizedPresbyterianCouncilAgendaState,
	year: number,
	month: number
): PresbyterianCouncilAgendaDateNode[] {
	const monthKey = getMonthKey(year, month);
	const keys = state.dates.dateKeysByMonth[monthKey] ?? [];
	return keys.map((key) => state.dates.byKey[key]).filter(Boolean);
}

/** Разворачивает список ID обратно в записи Buildin. */
export function getPCAgendaRecordsByIds(
	state: NormalizedPresbyterianCouncilAgendaState,
	ids: string[]
): BuildinDatabaseRecord[] {
	return ids.map((id) => state.records.byId[id]).filter(Boolean);
}
