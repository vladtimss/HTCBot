// src/services/calendar.ts
// ========================
// Работа с календарём (CalDAV):
// - подключение к серверу CalDAV
// - загрузка и парсинг событий
// - фильтрация будущих событий
// - поиск праздников и встреч по названию
// - форматирование событий для Telegram

import { createDAVClient, DAVCalendar, DAVObject } from "tsdav";
import ICAL from "ical.js";
import { compareAsc, isAfter, isBefore, isSameYear, startOfDay } from "date-fns";
import { env } from "../config/env";
import { escapeMdV2 } from "../utils/text";

export type HolidayEventResult =
	| { status: "future"; event: CalendarEvent } // событие ещё впереди
	| { status: "past"; event: CalendarEvent } // событие уже прошло
	| { status: "not_found" }; // ничего не нашли

/** Унифицированное событие календаря */
export interface CalendarEvent {
	title: string;
	startsAt: Date;
	endsAt?: Date;
	location?: string;
	description?: string;
}

type TSDavClient = Awaited<ReturnType<typeof createDAVClient>>;
let cached: { client: TSDavClient; calendar: DAVCalendar } | null = null;

/** Кэш для пасторского календаря */
let pastorsCached: { client: TSDavClient; calendar: DAVCalendar } | null = null;

/**
 * Создаём клиент CalDAV и ищем нужный календарь.
 * Кэшируем, чтобы не пересоздавать на каждый вызов.
 */
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

/**
 * Загружаем все объекты календаря (VEVENT и др.)
 */
export async function fetchCalendarObjects(): Promise<DAVObject[]> {
	const { client, calendar } = await getCalendar();
	const objs = await client.fetchCalendarObjects({ calendar });
	return (objs ?? []) as DAVObject[];
}

/**
 * Получить клиент и объект пасторского календаря (с кэшем).
 *
 * Алгоритм:
 * 1. Пытаемся найти календарь через fetchCalendars() по точному URL.
 * 2. Если не нашли (URL не совпал / не в списке) — конструируем объект прямо из URL.
 *    tsdav отправляет REPORT-запрос на calendar.url, так что объект нужен только с url.
 */
export async function getPastorsCalendar(): Promise<{ client: TSDavClient; calendar: DAVCalendar }> {
	if (pastorsCached) return pastorsCached;

	if (!env.HTC_PASTORS_CALENDAR_URL) {
		throw new Error("HTC_PASTORS_CALENDAR_URL is not configured");
	}

	const { client } = await getCalendar();

	// Ищем в списке (обход нескольких возможных вариантов URL)
	const allCalendars = await client.fetchCalendars();
	const pastorsUrl = env.HTC_PASTORS_CALENDAR_URL;
	const found = allCalendars.find(
		(c) => c.url === pastorsUrl || c.url === pastorsUrl.replace(/\/$/, "") || c.url === pastorsUrl + "/"
	);

	// Если не нашли — конструируем напрямую из URL (tsdav использует calendar.url для REPORT)
	const calendar: DAVCalendar = found ?? ({ url: pastorsUrl } as DAVCalendar);

	pastorsCached = { client, calendar };
	return pastorsCached;
}

/**
 * Загрузить все объекты из пасторского календаря.
 */
export async function fetchPastorsCalendarObjects(): Promise<DAVObject[]> {
	const { client, calendar } = await getPastorsCalendar();
	const objs = await client.fetchCalendarObjects({ calendar });
	return (objs ?? []) as DAVObject[];
}

/**
 * Найти ближайшее событие по названию (или массиву названий) в пасторском календаре.
 *
 * «Ближайшее» = первое, которое начинается сегодня или позже.
 * Используем startOfDay(today) чтобы включать текущий день целиком
 * (событие в 20:00 сегодня — это тоже «ближайшее», даже если уже началось).
 */
export async function fetchNextPastorsEventByTitle(
	titles: string | readonly string[],
): Promise<CalendarEvent | null> {
	const objs = await fetchPastorsCalendarObjects();
	const allEvents = objs.flatMap(parseDavObjectToEvents);

	const titleList = Array.isArray(titles) ? titles : [titles];
	const todayStart = startOfDay(new Date());

	const titleMatches = allEvents.filter((e) =>
		titleList.some((t) => e.title.toLowerCase().includes((t as string).toLowerCase()))
	);

	const filtered = titleMatches
		.filter((e) => !isBefore(e.startsAt, todayStart))
		.sort((a, b) => compareAsc(a.startsAt, b.startsAt));

	return filtered[0] ?? null;
}


/**
 * Превращаем DAVObject → список CalendarEvent
 */
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

/**
 * Найти ближайшие N событий (по умолчанию 3).
 */
export async function fetchUpcomingEvents(limit = 5): Promise<CalendarEvent[]> {
	const objs = await fetchCalendarObjects();
	const allEvents = objs.flatMap(parseDavObjectToEvents);

	const now = new Date();
	return allEvents
		.filter((e) => isAfter(e.startsAt, now))
		.sort((a, b) => compareAsc(a.startsAt, b.startsAt))
		.slice(0, Math.max(0, limit));
}

/**
 * Форматирование события в карточку Telegram.
 * @param e - событие
 * @param isList - если true → добавляем разделитель (для списков)
 * @param shouldShowYear - если true → выводим год в заголовке (для крупных праздников)
 */
export function formatEvent(e: CalendarEvent, isList = false, shouldShowYear = false): string {
	const startDate = e.startsAt;
	const endDate = e.endsAt ?? null;

	// Дата: день недели + число + месяц
	const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
	const dayStr = (d: Date) =>
		capitalize(
			d.toLocaleString("ru-RU", {
				weekday: "long",
				day: "numeric",
				month: "long",
			})
		);

	// Время: часы и минуты
	const timeStr = (d: Date) =>
		d.toLocaleString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
		});

	// Формируем строки даты и времени (экранируем для MarkdownV2)
	let dateStr: string;
	if (endDate && startDate.toDateString() !== endDate.toDateString()) {
		// Начало и конец в разные дни
		const startDay = escapeMdV2(dayStr(startDate));
		const startTime = escapeMdV2(timeStr(startDate));
		const endDay = escapeMdV2(dayStr(endDate));
		const endTime = escapeMdV2(timeStr(endDate));
		dateStr = `${startDay}, ${startTime} — ${endDay}, ${endTime}`;
	} else if (endDate) {
		// Один день, но диапазон времени
		const day = escapeMdV2(dayStr(startDate));
		const startTime = escapeMdV2(timeStr(startDate));
		const endTime = escapeMdV2(timeStr(endDate));
		dateStr = `${day}, ${startTime} — ${endTime}`;
	} else {
		// Только начало
		const day = escapeMdV2(dayStr(startDate));
		const time = escapeMdV2(timeStr(startDate));
		dateStr = `${day}, ${time}`;
	}

	// Заголовок (с годом — опционально) - экранируем title
	const escapedTitle = escapeMdV2(e.title);
	const title = shouldShowYear ? `✨ ${escapedTitle} \\(${startDate.getFullYear()}\\)` : `✨ ${escapedTitle}`;

	// Описание (если есть) - экранируем description
	const descr = e.description ? `\n📝 ${escapeMdV2(e.description)}` : "";

	// Финальная карточка (MarkdownV2 использует * для жирного)
	const card = [`*${title}*`, `*🗓 ${dateStr}*`, descr].filter(Boolean).join("\n");

	return isList ? card + "\n\n━━━━━━━━━━" : card;
}

/**
 * Найти ближайшее событие по названию.
 * @param title
 * @param strict - если true, ищем точное совпадение
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
 * Найти все будущие события по названию до конца сезона.
 * Сезон = до 31 июля.
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
 * Получить событие праздника по названию (например: Пасха, РВ).
 * Возвращает:
 * - future → впереди в этом году
 * - past → уже прошло в этом году
 * - not_found → ничего не нашли
 */
export async function fetchHolidayEvent(
	title: string,
	options?: { strictYear?: boolean }
): Promise<HolidayEventResult> {
	const objs = await fetchCalendarObjects();
	const allEvents = objs.flatMap(parseDavObjectToEvents);

	const today = new Date();

	// Фильтруем по названию
	let events = allEvents.filter((e) => e.title.toLowerCase().includes(title.toLowerCase()));

	// Если включён strictYear → берём только события этого года
	if (options?.strictYear) {
		events = events.filter((e) => isSameYear(e.startsAt, today));
	}

	events = events.sort((a, b) => compareAsc(a.startsAt, b.startsAt));

	if (events.length === 0) {
		return { status: "not_found" };
	}

	// Смотрим будущие события
	const future = events.find((e) => isAfter(e.startsAt, today));
	if (future) {
		return { status: "future", event: future };
	}

	// Если будущих нет — берём последнее прошедшее
	const past = [...events].reverse().find((e) => isBefore(e.startsAt, today));
	if (past) {
		return { status: "past", event: past };
	}

	return { status: "not_found" };
}
