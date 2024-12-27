import { CalendarEvent }   from "../models/calendar-event.model";
import { formatDateRange } from "../helpers/date.helpers";

export const generateCalendarEventMessage = (event: CalendarEvent): string => {
	return `
	📅 <b>${event.summary}</b>\n
	Дата: <b>${formatDateRange(event.startDate, event.endDate)}</b>${!!event?.location ? '\n' : ''}
	${event?.location ? `📍 Место: <pre>${event.location}</pre>${event?.description ? '\n' : ''}` : ''}
	${event?.description ? `📝 Описание: ${event.description}` : ''}
	`;
}