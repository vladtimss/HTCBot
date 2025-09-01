// src/services/calendar.ts
import { createDAVClient, DAVCalendar, DAVObject } from "tsdav";
import ICAL from "ical.js";
import { compareAsc, isAfter, isSameYear } from "date-fns";
import { env } from "../config/env";

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

export function formatEvent(e: CalendarEvent): string {
	const date = e.startsAt.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
	const place = e.location ? `\n📍 ${e.location}` : "";
	const descr = e.description ? `\n— ${e.description}` : "";
	return `• *${escapeMd(e.title)}*\n🕒 ${date}${place}${descr}`;
}
function escapeMd(s: string): string {
	return s.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
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

/** Получить событие по имени в конкретном году (для Пасхи/РВ) */
export async function fetchHolidayEvent(title: string, year: number): Promise<CalendarEvent | null> {
	const objs = await fetchCalendarObjects();
	const allEvents = objs.flatMap(parseDavObjectToEvents);

	const filtered = allEvents
		.filter(
			(e) => e.title.toLowerCase().includes(title.toLowerCase()) && isSameYear(e.startsAt, new Date(year, 0, 1))
		)
		.sort((a, b) => compareAsc(a.startsAt, b.startsAt));

	return filtered[0] || null;
}
