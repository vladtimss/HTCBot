import { createDAVClient, DAVCalendar, DAVObject }                       from 'tsdav';
import { DAVClient, DavClientParamSettings, FetchCalendarObjectsParams } from "../types/calendar.types";
import { yaCalendarSettings }                                            from "../settings/ya.calendar.settings";
import env                                                               from "../env";
import { CalendarEvent }               from "../models/calendar-event.model";

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

		return calendarObjects.map(calendarObject => new CalendarEvent(calendarObject?.data ?? ''))
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

