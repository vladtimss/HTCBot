import ICAL          from "ical.js";
import { DAVObject } from "tsdav";

export class CalendarEvent {
	url: string;
	summary: string;
	startDate: Date;
	endDate: Date;
	location?: string;
	description?: string;

	constructor(calendarObject: DAVObject) {
		const icalData = ICAL.parse(calendarObject?.data ?? '');
		const icalComponent = new ICAL.Component(icalData);
		const firstSubcomponent = icalComponent.getFirstSubcomponent('vevent');
		const icalEvent = new ICAL.Event(firstSubcomponent);

		this.url = calendarObject.url;
		this.summary = icalEvent.summary;
		this.startDate = icalEvent.startDate.toJSDate();
		this.endDate = icalEvent.endDate.toJSDate();
		this.location = icalEvent.location;
		this.description = icalEvent.description;
	}
}