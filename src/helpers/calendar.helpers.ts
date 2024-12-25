import ICAL                               from "ical.js";
import { createDAVClient }                from 'tsdav';
import env                                from "../env";
import { AuthMethod, DefaultAccountType } from "../enums/caldav.enums";

async function getAllEvents() {
	const client = await createDAVClient({
		serverUrl: env.CALDAV_URL,
		credentials: {
			username: env.CALDAV_USERNAME,
			password: env.CALDAV_PASSWORD
		},
		authMethod: AuthMethod.Basic,
		defaultAccountType: DefaultAccountType.CALDAV,
	});

	const calendars = await client.fetchCalendars();

	const calendarObjects = await client.fetchCalendarObjects({
		calendar: calendars[0],
	});

	const jcalData = ICAL.parse(calendarObjects[0]?.data);
	const vcalendar = new ICAL.Component(jcalData);
	const vevent = vcalendar.getFirstSubcomponent('vevent');
	const eventDetails = new ICAL.Event(vevent);

	return {
		summary: eventDetails.summary,
		startDate: eventDetails.startDate.toJSDate(),
		endDate: eventDetails.endDate.toJSDate(),
		location: eventDetails.location,
		description: eventDetails.description,
	}
}

export { getAllEvents }

