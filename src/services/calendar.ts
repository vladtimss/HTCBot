// src/services/calendar.ts
import { createDAVClient, DAVCalendar, DAVObject } from "tsdav";
import ICAL from "ical.js";
import { compareAsc, isAfter, isBefore, isSameYear } from "date-fns";
import { env } from "../config/env";

export type HolidayEventResult =
	| { status: "future"; event: CalendarEvent } // ещё не было в этом году
	| { status: "past"; event: CalendarEvent } // уже прошло в этом году
	| { status: "not_found" }; // в этом году дат нет

/** Нормализованное событие для бота */
export interface CalendarEvent {
	title: string;
	startsAt: Date;
	endsAt?: Date;
	location?: string;
	description?: string;
}

type TSDavClient = Awaited<ReturnType<typeof createDAVClient>>;
let cached: { client: TSDavClient; calendar: DAVCalendar } | null = null;

export async function getCalendar(): Promise<{ client: TSDavClient; calendar: DAVCalendar }> {
	if (cached) return cached;

	const client = await createDAVClient({
		serverUrl: env.CALDAV_URL,
		credentials: {
			username: env.CALDAV_USERNAME,
			password: env.CALDAV_PASSWORD,
		},
		authMethod: "Basic",
		defaultAccountType: "caldav",
	});

	const calendars = await client.fetchCalendars();
	const calendar = calendars.find((c) => c.url === env.HTC_COMMON_CALENDAR_URL);
	if (!calendar) throw new Error("CalDAV calendar not found by HTC_COMMON_CALENDAR_URL");

	cached = { client, calendar };
	return cached;
}

export async function fetchCalendarObjects(): Promise<DAVObject[]> {
	const { client, calendar } = await getCalendar();
	const objs = await client.fetchCalendarObjects({ calendar });
	return (objs ?? []) as DAVObject[];
}

export function parseDavObjectToEvents(obj: DAVObject): CalendarEvent[] {
	if (!obj?.data || typeof obj.data !== "string") return [];
	try {
		const jcal = ICAL.parse(obj.data);
		const comp = new ICAL.Component(jcal);
		const vevents = comp.getAllSubcomponents("vevent") as unknown as any[];

		return vevents
			.map((ve: any) => {
				const ev = new ICAL.Event(ve);
				const starts = ev.startDate ? ev.startDate.toJSDate() : undefined;
				if (!starts) return null;

				return {
					title: ev.summary || "Событие",
					startsAt: starts,
					endsAt: ev.endDate ? ev.endDate.toJSDate() : undefined,
					location: ev.location || undefined,
					description: ev.description || undefined,
				} as CalendarEvent;
			})
			.filter(Boolean) as CalendarEvent[];
	} catch {
		return [];
	}
}

export async function fetchUpcomingEvents(limit = 3): Promise<CalendarEvent[]> {
	const objs = await fetchCalendarObjects();
	const allEvents = objs.flatMap(parseDavObjectToEvents);

	const now = new Date();
	return allEvents
		.filter((e) => isAfter(e.startsAt, now))
		.sort((a, b) => compareAsc(a.startsAt, b.startsAt))
		.slice(0, Math.max(0, limit));
}

/** Делает первую букву строки заглавной */
function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Форматирование события календаря в карточку для Telegram
 * @param e - событие
 * @param isList - если true, добавляет разделитель для списков
 * @param shouldShowYear - если true, добавляется год к названию (для крупных праздников)
 */
export function formatEvent(e: CalendarEvent, isList = false, shouldShowYear = false): string {
	const startDate = e.startsAt;
	const endDate = e.endsAt ?? null;

	// День недели + дата (с заглавной буквы)
	const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
	const dayStr = (d: Date) =>
		capitalize(
			d.toLocaleString("ru-RU", {
				weekday: "long",
				day: "numeric",
				month: "long",
			})
		);

	// Часы и минуты
	const timeStr = (d: Date) =>
		d.toLocaleString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
		});

	let dateStr: string;
	if (endDate && startDate.toDateString() !== endDate.toDateString()) {
		// Разные дни → показываем оба
		dateStr = `${dayStr(startDate)}, ${timeStr(startDate)} — ${dayStr(endDate)}, ${timeStr(endDate)}`;
	} else if (endDate) {
		// Один день → показываем диапазон времени
		dateStr = `${dayStr(startDate)}, ${timeStr(startDate)} — ${timeStr(endDate)}`;
	} else {
		// Только начало
		dateStr = `${dayStr(startDate)}, ${timeStr(startDate)}`;
	}

	// Заголовок
	const title = shouldShowYear ? `✨ ${escapeMd(e.title)} (${startDate.getFullYear()})` : `✨ ${escapeMd(e.title)}`;

	// Описание
	const descr = e.description ? `\n📝 ${e.description}` : "";

	// Собираем карточку
	const card = [`*${title}*`, `*🗓 ${dateStr}*`, descr].filter(Boolean).join("\n");

	return isList ? card + "\n\n━━━━━━━━━━" : card;
}

function escapeMd(s: string): string {
	return s.replace(/([_*[\]()~`>#{.!])/g, "\\$1");
}

/**
 * Найти ближайшее событие по названию (строго или нестрого)
 */
export async function fetchNextEventByTitle(title: string, strict = false): Promise<CalendarEvent | null> {
	const objs = await fetchCalendarObjects();
	const allEvents = objs.flatMap(parseDavObjectToEvents);

	const now = new Date();
	const filtered = allEvents
		.filter((e) =>
			strict ? e.title.toLowerCase() === title.toLowerCase() : e.title.toLowerCase().includes(title.toLowerCase())
		)
		.filter((e) => isAfter(e.startsAt, now))
		.sort((a, b) => compareAsc(a.startsAt, b.startsAt));

	return filtered[0] ?? null;
}

/**
 * Найти все будущие события по названию до конца сезона (строго или нестрого)
 */
export async function fetchAllFutureEventsByTitle(title: string, strict = false): Promise<CalendarEvent[]> {
	const objs = await fetchCalendarObjects();
	const allEvents = objs.flatMap(parseDavObjectToEvents);

	const now = new Date();
	const seasonYear = now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
	const seasonEnd = new Date(seasonYear, 6, 31, 23, 59, 59); // 31 июля

	return allEvents
		.filter((e) =>
			strict ? e.title.toLowerCase() === title.toLowerCase() : e.title.toLowerCase().includes(title.toLowerCase())
		)
		.filter((e) => isAfter(e.startsAt, now) && e.startsAt <= seasonEnd)
		.sort((a, b) => compareAsc(a.startsAt, b.startsAt));
}

/**
 * Получить событие праздника по имени (например: Пасха, РВ).
 * Возвращает статус:
 * - future → событие ещё впереди в этом году
 * - past → событие уже прошло в этом году
 * - not_found → в этом году не найдено
 */
export async function fetchHolidayEvent(
	title: string,
	options?: { strictYear?: boolean }
): Promise<HolidayEventResult> {
	const objs = await fetchCalendarObjects();
	const allEvents = objs.flatMap(parseDavObjectToEvents);

	const today = new Date();
	const year = today.getFullYear();

	// фильтр по названию
	let events = allEvents.filter((e) => e.title.toLowerCase().includes(title.toLowerCase()));

	if (options?.strictYear) {
		events = events.filter((e) => isSameYear(e.startsAt, today));
	}

	events = events.sort((a, b) => compareAsc(a.startsAt, b.startsAt));

	if (events.length === 0) {
		return { status: "not_found" };
	}

	const future = events.find((e) => isAfter(e.startsAt, today));
	if (future) {
		return { status: "future", event: future };
	}

	const past = [...events].reverse().find((e) => isBefore(e.startsAt, today));
	if (past) {
		return { status: "past", event: past };
	}

	return { status: "not_found" };
}
