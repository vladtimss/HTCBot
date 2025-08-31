// src/services/calendar.ts
import { createDAVClient, DAVCalendar, DAVObject } from "tsdav";
import ICAL from "ical.js"; // ВАЖНО: дефолтный импорт, у ical.js нет именованных export'ов Component/Event/parse
import { compareAsc, isAfter } from "date-fns";
import { env } from "../config/env";

/** Нормализованное событие для бота */
export interface CalendarEvent {
	title: string;
	startsAt: Date;
	endsAt?: Date;
	location?: string;
	description?: string;
}

/** Тип клиента tsdav ровно как его возвращает createDAVClient */
type TSDavClient = Awaited<ReturnType<typeof createDAVClient>>;

/** Кешируем подключение, чтобы не логиниться каждый раз */
let cached: { client: TSDavClient; calendar: DAVCalendar } | null = null;

/**
 * Создать/получить подключение к CalDAV и найти календарь по URL из .env
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
	if (!calendar) {
		throw new Error("CalDAV calendar not found by HTC_COMMON_CALENDAR_URL");
	}

	cached = { client, calendar };
	return cached;
}

/**
 * Получить сырые объекты календаря (ICS)
 */
export async function fetchCalendarObjects(): Promise<DAVObject[]> {
	const { client, calendar } = await getCalendar();
	const objs = await client.fetchCalendarObjects({ calendar });
	// В некоторых версиях типы могут быть шире — явно приводим к DAVObject[]
	return (objs ?? []) as DAVObject[];
}

/**
 * Спарсить один DAVObject (ICS) в список событий ical.js -> CalendarEvent[]
 */
export function parseDavObjectToEvents(obj: DAVObject): CalendarEvent[] {
	// В tsdav у DAVObject.data может не быть — защищаемся
	if (!obj?.data || typeof obj.data !== "string") return [];

	try {
		// 1) Превращаем ICS-текст в jCal-структуру
		const jcal = ICAL.parse(obj.data);
		// 2) Корневой компонент VCALENDAR
		const comp = new ICAL.Component(jcal);
		// 3) Достаём все VEVENT
		const vevents = comp.getAllSubcomponents("vevent") as unknown as any[];

		// 4) Маппим каждый VEVENT в нормализованный объект
		const events = vevents
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

		return events;
	} catch {
		// Если ICS повреждён — просто пропускаем
		return [];
	}
}

/**
 * Получить N ближайших будущих событий, отсортированных по времени начала
 */
export async function fetchUpcomingEvents(limit = 3): Promise<CalendarEvent[]> {
	const objs = await fetchCalendarObjects();
	const allEvents = objs.flatMap(parseDavObjectToEvents);

	const now = new Date();
	const future = allEvents
		.filter((e) => isAfter(e.startsAt, now))
		.sort((a, b) => compareAsc(a.startsAt, b.startsAt))
		.slice(0, Math.max(0, limit));

	return future;
}

/**
 * Удобный формат вывода события в Markdown
 */
export function formatEvent(e: CalendarEvent): string {
	const date = e.startsAt.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
	const place = e.location ? `\n📍 ${e.location}` : "";
	const descr = e.description ? `\n— ${e.description}` : "";
	return `• *${escapeMd(e.title)}*\n🕒 ${date}${place}${descr}`;
}

/** Простейший эскейп Markdown для безопасного вывода */
function escapeMd(s: string): string {
	return s.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/**
 * Получить все встречи ЛМГ до конца сезона (сегодня → 31 июля текущего или следующего года)
 */
export async function fetchLmEventsUntilSeasonEnd(): Promise<CalendarEvent[]> {
	const objs = await fetchCalendarObjects();
	const allEvents = objs.flatMap(parseDavObjectToEvents);

	const now = new Date();
	// если уже август, считаем до конца следующего сезона
	const seasonYear = now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
	const seasonEnd = new Date(seasonYear, 6, 31, 23, 59, 59); // 31 июля

	return allEvents
		.filter((e) => e.title.toLowerCase().includes("лм") && isAfter(e.startsAt, now) && e.startsAt <= seasonEnd)
		.sort((a, b) => compareAsc(a.startsAt, b.startsAt));
}
