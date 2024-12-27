import { CalendarEvent }                  from "../models/calendar-event.model";
import bot                                from "../bot";
import env                                from "../env";
import { getUpcomingCalendarEvents }      from "../helpers/calendar.helpers";
import { getTimezoneOffset, toZonedTime } from "date-fns-tz";
import { format, isSameDay, subDays, addDays }     from "date-fns";

const MOSCOW_TIMEZONE = "Europe/Moscow";
const FORMAT_STR_FULL = 'yyyy-MM-dd HH:mm';
const FORMAT_STR_HOURS = 'HH';

const sentReminders = new Set<string>();

const processReminders = async () => {
	const events = await getUpcomingCalendarEvents(3);

	const now = new Date();
	const moscowNow = toZonedTime(now, MOSCOW_TIMEZONE);

	for (const event of events) {
		const eventTimeInMoscow = toZonedTime(event.startDate, MOSCOW_TIMEZONE);

		const oneDayBefore = subDays(eventTimeInMoscow, 1);
		const sevenDaysBefore = subDays(eventTimeInMoscow, 7);
		const eventDay = eventTimeInMoscow;

		if (shouldSendReminder(oneDayBefore, moscowNow)) {
			await sendReminder(event, "1 day before");
		}
		if (shouldSendReminder(sevenDaysBefore, moscowNow)) {
			await sendReminder(event, "7 days before");
		}
		if (shouldSendReminder(eventDay, moscowNow)) {
			await sendReminder(event, "on the event day");
		}
	}
}

// Function to check if a reminder should be sent
function shouldSendReminder(reminderTime: Date, currentTime: Date): boolean {
	// Reminder should be sent at exactly 10:00 AM Moscow time
	const isTenAM = reminderTime.getHours() === 10 && reminderTime.getMinutes() === 0;

	return (
		isSameDay(reminderTime, currentTime)
		// && isTenAM
		&& !sentReminders.has(getReminderKey(reminderTime))
	);
}

// Generate a unique key for each reminder
function getReminderKey(eventTime: Date, reminderType?: string): string {
	return `${eventTime.toISOString()}_${reminderType}`;
}

async function sendReminder(event: CalendarEvent, reminderType: string) {
	const reminderKey = getReminderKey(event.startDate, reminderType);

	// Ensure the reminder hasn't already been sent
	if (sentReminders.has(reminderKey)) return;

	// Send the message via Telegram bot
	await bot.api.sendMessage(
		env.LOG_CHANNEL,
		`Reminder: "${event.summary}" is happening ${reminderType} at ${format(
			toZonedTime(event.startDate, MOSCOW_TIMEZONE),
			"yyyy-MM-dd HH:mm"
		)} Moscow time!`
	);

	console.log(`Sent reminder for event "${event.startDate}" (${reminderType}))`);
	// Mark this reminder as sent
	sentReminders.add(reminderKey);
}

// Function to start the periodic check
export function startPeriodicCheck() {
	setInterval(async () => {
		try {
			await processReminders();
		} catch (error) {
			console.error("Error processing reminders:", error);
		}
	}, 10000); // Run every 30 seconds
}

