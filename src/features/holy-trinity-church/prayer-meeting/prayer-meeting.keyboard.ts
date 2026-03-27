/**
 * features/holy-trinity-church/prayer-meeting/prayer-meeting.keyboard.ts
 * ----------------------------------------------------------------------
 * Клавиатура раздела "Молитвенное собрание"
 */

import { NAVIGATION_LABELS } from "../../../constants/navigation";
import { CALENDAR_BUTTON_LABELS } from "../church-calendar/church-calendar.constants";
import { PRAYER_MEETING_BUTTON_LABELS } from "./prayer-meeting.constants";

export const replyPrayerMeetingMenu = {
	keyboard: [
		[PRAYER_MEETING_BUTTON_LABELS.PM_SHARE_NEED],
		[CALENDAR_BUTTON_LABELS.CAL_PRAYER_NEXT, CALENDAR_BUTTON_LABELS.CAL_PRAYER_ALL],
		[NAVIGATION_LABELS.NAV_BACK, NAVIGATION_LABELS.NAV_MAIN],
	],
	resize_keyboard: true,
};
