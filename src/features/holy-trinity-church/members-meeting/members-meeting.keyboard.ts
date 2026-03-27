/**
 * features/holy-trinity-church/members-meeting/members-meeting.keyboard.ts
 * ------------------------------------------------------------------------
 * Клавиатура раздела "Членское собрание"
 */

import { NAVIGATION_LABELS } from "../../../constants/navigation";
import { CALENDAR_BUTTON_LABELS } from "../church-calendar/church-calendar.constants";
import { MEMBERS_MEETING_BUTTON_LABELS } from "./members-meeting.constants";

export const replyMembersMeetingMenu = {
	keyboard: [
		[MEMBERS_MEETING_BUTTON_LABELS.MM_ASK_QUESTION],
		[CALENDAR_BUTTON_LABELS.CAL_MEMBERS_NEXT, CALENDAR_BUTTON_LABELS.CAL_MEMBERS_ALL],
		[NAVIGATION_LABELS.NAV_BACK, NAVIGATION_LABELS.NAV_MAIN],
	],
	resize_keyboard: true,
};
