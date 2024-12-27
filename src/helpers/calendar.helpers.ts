import { createDAVClient, DAVCalendar, DAVObject }                       from 'tsdav';
import { DAVClient, DavClientParamSettings, FetchCalendarObjectsParams } from "../types/calendar.types";
import { yaCalendarSettings }                                            from "../settings/ya.calendar.settings";
import env                                                               from "../env";
import { CalendarEvent }                                                 from "../models/calendar-event.model";
import { toZonedTime }                                                   from "date-fns-tz";
import { addDays }                                                       from "date-fns/addDays";

/**
 * Подключение к клиенту DAV
 * @param settings
 */
const connectToCalendar = async (settings: DavClientParamSettings): Promise<DAVClient> => {
	return createDAVClient(settings);
}

/**
 * Получаем календарь по уникальному url
 * @param url
 * @param client
 */
const fetchCalendarByUrl = async (client: DAVClient, url: string): Promise<DAVCalendar | undefined> => {
	const calendars = await client.fetchCalendars();

	return calendars?.find(calendar => calendar.url === url);
}

/**
 * Получаем события календаря
 * @param client
 * @param params
 */
const fetchCalendarObjects = async (client: DAVClient, params: FetchCalendarObjectsParams): Promise<DAVObject[]> => {
	return client.fetchCalendarObjects(params);
}

const fetchAllCalendarEvents = async (): Promise<CalendarEvent[]> => {
	try {
		const client = await connectToCalendar(yaCalendarSettings);
		const calendar = await fetchCalendarByUrl(client, env.HTC_COMMON_CALENDAR_URL);
		const calendarObjects = await fetchCalendarObjects(client, { calendar })

		return calendarObjects.map(calendarObject => new CalendarEvent(calendarObject))
	} catch (e) {
		throw new Error(e?.message ?? 'Something went wrong...');
	}
}

const fetchTomorrowCalendarObject = async (): Promise<CalendarEvent[]> => {
	const eventTimeInMoscow = toZonedTime(new Date(), "Europe/Moscow");
	const oneDayAfter = addDays(eventTimeInMoscow, 1);
	const sevenDaysAfter = addDays(eventTimeInMoscow, 7);

	console.log({ oneDayAfter, sevenDaysAfter });

	try {
		const client = await connectToCalendar(yaCalendarSettings);
		const calendar = await fetchCalendarByUrl(client, env.HTC_COMMON_CALENDAR_URL);
		const calendarObjects = await fetchCalendarObjects(client, {
			calendar,
			timeRange: {
				start: new Date().toISOString(),
				end: sevenDaysAfter.toISOString()
			}
		})
		return calendarObjects.map(calendarObject => new CalendarEvent(calendarObject))
	} catch (e) {
		throw new Error(e?.message ?? 'Something went wrong...');
	}
}

const getUpcomingCalendarEvents = async (amount = 1): Promise<CalendarEvent[]> => {
	const allEvents = await fetchAllCalendarEvents();
	const upcomingEvents = allEvents.filter((event) => event.startDate > new Date());

	return upcomingEvents
		.sort((a, b) =>
			a.startDate.getTime() - b.startDate.getTime()).slice(0, amount
		);
}

export {
	connectToCalendar,
	fetchCalendarByUrl,
	fetchCalendarObjects,
	fetchAllCalendarEvents,
	getUpcomingCalendarEvents,
}

