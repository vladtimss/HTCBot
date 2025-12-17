/**
 * features/church-calendar/church-calendar.keyboard.ts
 * --------------------------
 * Клавиатуры для раздела "Церковный календарь"
 */

import { InlineKeyboard } from "grammy";
import { CALENDAR_BUTTON_LABELS } from "./church-calendar.constants";
import { SMALL_GROUPS_BUTTON_LABELS } from "../small-groups/small-groups.constants";
import { NAVIGATION_LABELS } from "../../constants/navigation";

export const replyCalendarMenu = {
	keyboard: [
		[CALENDAR_BUTTON_LABELS.CAL_SUBSCRIBE],
		[CALENDAR_BUTTON_LABELS.CAL_NEXT, CALENDAR_BUTTON_LABELS.CAL_EVENTS],
		[CALENDAR_BUTTON_LABELS.CAL_MEMBERS, CALENDAR_BUTTON_LABELS.CAL_PRAYER],
		[CALENDAR_BUTTON_LABELS.CAL_LMG, CALENDAR_BUTTON_LABELS.CAL_FAMILY],
		[NAVIGATION_LABELS.NAV_BACK, CALENDAR_BUTTON_LABELS.CAL_HOLIDAYS],
	],
	resize_keyboard: true,
};

export const replyCalendarLmgMenu = {
	keyboard: [
		[SMALL_GROUPS_BUTTON_LABELS.LMG_CAL_NEXT, SMALL_GROUPS_BUTTON_LABELS.LMG_CAL_ALL],
		[SMALL_GROUPS_BUTTON_LABELS.LMG_CAL_TRIP],
		[NAVIGATION_LABELS.NAV_BACK, NAVIGATION_LABELS.NAV_MAIN],
	],
	resize_keyboard: true,
};

export const replyCalendarPrayerMenu = {
	keyboard: [
		[CALENDAR_BUTTON_LABELS.CAL_PRAYER_NEXT, CALENDAR_BUTTON_LABELS.CAL_PRAYER_ALL],
		[NAVIGATION_LABELS.NAV_BACK, NAVIGATION_LABELS.NAV_MAIN],
	],
	resize_keyboard: true,
};

export const replyCalendarMembersMenu = {
	keyboard: [
		[CALENDAR_BUTTON_LABELS.CAL_MEMBERS_NEXT, CALENDAR_BUTTON_LABELS.CAL_MEMBERS_ALL],
		[NAVIGATION_LABELS.NAV_BACK, NAVIGATION_LABELS.NAV_MAIN],
	],
	resize_keyboard: true,
};

export const replyCalendarHolidaysMenu = {
	keyboard: [
		[CALENDAR_BUTTON_LABELS.CAL_HOLIDAYS_RV, CALENDAR_BUTTON_LABELS.CAL_HOLIDAYS_EASTER],
		[NAVIGATION_LABELS.NAV_BACK, NAVIGATION_LABELS.NAV_MAIN],
	],
	resize_keyboard: true,
};

export const replyCalendarFamilyMenu = {
	keyboard: [
		[CALENDAR_BUTTON_LABELS.CAL_FAMILY_NEXT, CALENDAR_BUTTON_LABELS.CAL_FAMILY_ALL],
		[NAVIGATION_LABELS.NAV_BACK, NAVIGATION_LABELS.NAV_MAIN],
	],
	resize_keyboard: true,
};

/**
 * Inline-кнопки для подписки на календарь
 */
export function subscribeKeyboard() {
	return new InlineKeyboard()
		.text(CALENDAR_BUTTON_LABELS.CAL_SUBSCRIBE_APPLE, "calendar:sub:apple")
		.row()
		.text(CALENDAR_BUTTON_LABELS.CAL_SUBSCRIBE_YANDEX, "calendar:sub:yandex")
		.row()
		.text(CALENDAR_BUTTON_LABELS.CAL_SUBSCRIBE_GOOGLE, "calendar:sub:google")
		.row()
		.text(CALENDAR_BUTTON_LABELS.CAL_SUBSCRIBE_XIOMI, "calendar:sub:xiomi")
		.row()
		.text(CALENDAR_BUTTON_LABELS.CAL_SUBSCRIBE_OTHER, "calendar:sub:other");
}
