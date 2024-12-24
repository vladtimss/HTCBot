import ICAL                from "ical.js";
import { createDAVClient } from 'tsdav';
import { log }             from "../middlewares/logger";

const CALDAV_URL = 'https://caldav.yandex.ru';
const USERNAME = 'htchurch@yandex.ru';
const PASSWORD = 'gclxdwhwawjhjrjm';

async function getAllEvents() {
	const client = await createDAVClient({
		serverUrl: CALDAV_URL,
		credentials: {
			username: USERNAME,
			password: PASSWORD
		},
		authMethod: 'Basic',
		defaultAccountType: 'caldav',
	});

	const calendars = await client.fetchCalendars();


	const calendarObjects = await client.fetchCalendarObjects({
		calendar: calendars[0],
	});

	const jcalData = ICAL.parse(calendarObjects[0]?.data);
	const vcalendar = new ICAL.Component(jcalData);
	const vevent = vcalendar.getFirstSubcomponent('vevent');
	const eventDetails = new ICAL.Event(vevent);


	log(JSON.stringify({
		summary: eventDetails.summary,
		startDate: eventDetails.startDate.toJSDate(),
		endDate: eventDetails.endDate.toJSDate(),
		location: eventDetails.location,
		description: eventDetails.description,
	}, null, 2));
}

export { getAllEvents }

