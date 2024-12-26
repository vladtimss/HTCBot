import ICAL          from "ical.js";

export class CalendarEvent {
	summary: string;
	startDate: Date;
	endDate: Date;
	location?: string;
	description?: string;

	constructor(data:  string) {
		const icalData = ICAL.parse(data);
		const icalComponent = new ICAL.Component(icalData);
		const firstSubcomponent = icalComponent.getFirstSubcomponent('vevent');
		const icalEvent = new ICAL.Event(firstSubcomponent);

		this.summary = icalEvent.summary;
		this.startDate = icalEvent.startDate.toJSDate();
		this.endDate = icalEvent.endDate.toJSDate();
		this.location = icalEvent.location;
		this.description = icalEvent.description;
	}
}