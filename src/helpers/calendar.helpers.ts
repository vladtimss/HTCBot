import { createDAVClient, DAVCalendar, DAVObject }                       from 'tsdav';
import { DAVClient, DavClientParamSettings, FetchCalendarObjectsParams } from "../types/calendar.types";
import { yaCalendarSettings }                                            from "../settings/ya.calendar.settings";
import env                                                               from "../env";
import { CalendarEvent }                                                 from "../models/calendar-event.model";

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

const getAllEvents = async () => {
	const client = await connectToCalendar(yaCalendarSettings);
	const calendar = await fetchCalendarByUrl(client, env.HTC_COMMON_CALENDAR_URL);
	const calendarObjects = await fetchCalendarObjects(client, { calendar })

	return new CalendarEvent(calendarObjects[0]?.data ?? '')
}

export {
	connectToCalendar,
	fetchCalendarByUrl,
	fetchCalendarObjects,
	getAllEvents
}

