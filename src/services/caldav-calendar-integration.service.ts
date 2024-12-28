import { DAVClient, DavClientParamSettings, FetchCalendarObjectsParams } from "../types/calendar.types";
import { createDAVClient, DAVCalendar, DAVObject }                       from "tsdav";
import { CalendarEvent }                                                 from "../models/calendar-event.model";
import { toZonedTime }                                                   from "date-fns-tz";
import { addDays }                                                       from "date-fns/addDays";
import { yaCalendarSettings }                                            from "../settings/ya.calendar.settings";
import env                                                               from "../env";

class CaldavCalendarIntegrationService {
	static readonly MOSCOW_TIMEZONE = "Europe/Moscow";

	private client: DAVClient;
	private calendar: DAVCalendar;
	private readonly settings: DavClientParamSettings;
	private readonly url: string;

	constructor(settings: DavClientParamSettings, url: string) {
		this.settings = settings;
		this.url = url;
	}

	/**
	 * Инициализация интеграционного сервиса с календарем через caldav
	 */
	async init() {
		if (!this.client || !this.calendar) {
			try {
				this.client = await this.connectToCalendar(this.settings);
				this.calendar = await this.fetchCalendarByUrl(this.client, this.url);
			} catch (e) {
				throw new Error(e?.message ?? 'Failed to initialize calendar service');
			}
		}
	};

	/**
	 * Подключение к клиенту DAV
	 * @param settings
	 */
	async connectToCalendar(settings: DavClientParamSettings): Promise<DAVClient> {
		return createDAVClient(settings);
	}

	/**
	 * Получаем календарь по уникальному url
	 * @param url
	 * @param client
	 */
	async fetchCalendarByUrl(client: DAVClient, url: string): Promise<DAVCalendar | undefined> {
		const calendars = await client.fetchCalendars();
		return calendars?.find(calendar => calendar.url === url);
	}

	async fetchCalendarObjects(client: DAVClient, params: FetchCalendarObjectsParams): Promise<DAVObject[]> {
		return client.fetchCalendarObjects(params);
	}

	/**
	 * Получает все события календаря
	 */
	async fetchAllCalendarEvents(): Promise<CalendarEvent[]> {
		try {
			const calendarObjects = await this.fetchCalendarObjects(this.client, { calendar: this.calendar })
			return calendarObjects.map(calendarObject => new CalendarEvent(calendarObject))
		} catch (e) {
			throw new Error(e?.message ?? 'Something went wrong...');
		}
	}

	/**
	 * Получает будущие события
	 * @param amount
	 */
	async fetchUpcomingCalendarEvents(amount = 1): Promise<CalendarEvent[]> {
		const allEvents = await this.fetchAllCalendarEvents();
		const upcomingEvents = allEvents.filter((event) => event.startDate > new Date());

		return upcomingEvents
			.sort((a, b) =>
				a.startDate.getTime() - b.startDate.getTime()).slice(0, amount
			);
	}

	/**
	 * Получает события, которые будут завтра
	 */
	async fetchUpcomingTomorrowCalendarEvents(): Promise<CalendarEvent[]> {
		const now = toZonedTime(new Date(), CaldavCalendarIntegrationService.MOSCOW_TIMEZONE);
		const oneDayAfterNow = addDays(now, 1);

		try {
			const calendarObjects = await this.fetchCalendarObjects(this.client, {
				calendar: this.calendar,
				timeRange: {
					start: now.toISOString(),
					end: oneDayAfterNow.toISOString()
				}
			})
			return calendarObjects.map(calendarObject => new CalendarEvent(calendarObject))
		} catch (e) {
			throw new Error(e?.message ?? 'Something went wrong...');
		}
	}
}

export const caldavCalendarIntegrationServiceInstance = new CaldavCalendarIntegrationService(
	yaCalendarSettings,
	env.HTC_COMMON_CALENDAR_URL
);
