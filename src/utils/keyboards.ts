/**
 * utils/keyboard.ts
 * --------------------------
 * Все клавиатуры (reply и inline) собраны здесь.
 * Разделено по темам главного меню.
 */

import { InlineKeyboard, Keyboard } from "grammy";
import { MENU_LABELS }              from "../constants/button-lables";
import { MyContext }                from "../types/grammy-context";

/* -------------------- Главное меню -------------------- */
/**
 * Главное меню зависит от прав:
 * - у привилегированных пользователей есть кнопка "Церковный календарь"
 */
export function replyMainKeyboard(ctx: MyContext) {
    const kb = new Keyboard()
        .text(MENU_LABELS.MAIN_SUNDAY) // ⛪ Воскресное богослужение
        .text(MENU_LABELS.MAIN_SERMONS) // 🎧 Проповеди
		.row()
        .text(MENU_LABELS.MAIN_GROUPS); // 👥 Малые группы

    if (ctx.access.isPrivileged) {
        kb.text(MENU_LABELS.MAIN_CALENDAR); // 📅 Церковный календарь
	}

    kb.row().text(MENU_LABELS.MAIN_ABOUT).resized().persistent();
	return kb;
}

/* -------------------- Раздел "О нас" -------------------- */
export const replyAboutMenu = new Keyboard()
    .text(MENU_LABELS.ABOUT_CHANNEL) // 📣 Канал
	.row()
    .text(MENU_LABELS.ABOUT_BELIEF) // 🧭 Во что мы верим
    .text(MENU_LABELS.ABOUT_HISTORY) // 📜 Наша история
	.row()
    .text(MENU_LABELS.NAV_BACK) // ⬅️ Назад
	.resized();


/* -------------------- Малые группы -------------------- */
export function replyGroupsMenu(ctx: MyContext) {
	const kb = new Keyboard()
        .text(MENU_LABELS.LMG_GROUPS_BY_DAY) // 📅 По дням
        .text(MENU_LABELS.LMG_GROUPS_BY_DISTRICT) // 📍 По районам
		.row();

    if (ctx.access.isPrivileged) {
        kb.text(MENU_LABELS.LMG_CAL_NEXT) // ⏱️ Следующая встреча ЛМГ
            .text(MENU_LABELS.LMG_CAL_ALL) // 🗓️ Все встречи ЛМГ
			.row()
            .text(MENU_LABELS.LMG_NOTES) // "Конспекты ЛМГ"
            .text(MENU_LABELS.LMG_CAL_TRIP) // 🚌 Выезд ЛМГ
			.row();
	}

    kb.text(MENU_LABELS.NAV_BACK).resized();
	return kb;
}

// Клавиатура для раздела "Конспекты ЛМГ"
export function replyLmgNotesMenu() {
	return new Keyboard().text(MENU_LABELS.LMG_NOTES_PREV).row().text(MENU_LABELS.NAV_BACK).resized();
}

// Inline-меню для выезда ЛМГ
export const inlineLmgTrip = new InlineKeyboard().text("📅 Даты выезда", "lmg_trip_dates");

/* -------------------- Проповеди -------------------- */
export const replySermonsMenu = new Keyboard().text(MENU_LABELS.SERMONS_PODCASTS).row().text(MENU_LABELS.NAV_BACK).resized();

/* -------------------- Церковный календарь -------------------- */
export const replyCalendarMenu = {
	keyboard: [
		[MENU_LABELS.CAL_SUBSCRIBE],
        [MENU_LABELS.CAL_NEXT, MENU_LABELS.CAL_EVENTS],
        [MENU_LABELS.CAL_MEMBERS, MENU_LABELS.CAL_PRAYER],
        [MENU_LABELS.CAL_LMG, MENU_LABELS.CAL_FAMILY],
        [MENU_LABELS.NAV_BACK, MENU_LABELS.CAL_HOLIDAYS],
	],
	resize_keyboard: true,
};

export const replyCalendarLmgMenu = {
	keyboard: [
        [MENU_LABELS.LMG_CAL_NEXT, MENU_LABELS.LMG_CAL_ALL],
        [MENU_LABELS.LMG_CAL_TRIP],
        [MENU_LABELS.NAV_BACK, MENU_LABELS.NAV_MAIN],
	],
	resize_keyboard: true,
};

export const replyCalendarPrayerMenu = {
	keyboard: [
        [MENU_LABELS.CAL_PRAYER_NEXT, MENU_LABELS.CAL_PRAYER_ALL],
        [MENU_LABELS.NAV_BACK, MENU_LABELS.NAV_MAIN],
	],
	resize_keyboard: true,
};

export const replyCalendarMembersMenu = {
	keyboard: [
        [MENU_LABELS.CAL_MEMBERS_NEXT, MENU_LABELS.CAL_MEMBERS_ALL],
        [MENU_LABELS.NAV_BACK, MENU_LABELS.NAV_MAIN],
	],
	resize_keyboard: true,
};

export const replyCalendarHolidaysMenu = {
	keyboard: [
        [MENU_LABELS.CAL_HOLIDAYS_RV, MENU_LABELS.CAL_HOLIDAYS_EASTER],
        [MENU_LABELS.NAV_BACK, MENU_LABELS.NAV_MAIN],
	],
	resize_keyboard: true,
};

export const replyCalendarFamilyMenu = {
	keyboard: [
        [MENU_LABELS.CAL_FAMILY_NEXT, MENU_LABELS.CAL_FAMILY_ALL],
        [MENU_LABELS.NAV_BACK, MENU_LABELS.NAV_MAIN],
	],
	resize_keyboard: true,
};

// Inline-кнопки для подписки на календарь
export function subscribeKeyboard() {
    return new InlineKeyboard()
        .text(MENU_LABELS.CAL_SUBSCRIBE_APPLE, "calendar:sub:apple")
		.row()
        .text(MENU_LABELS.CAL_SUBSCRIBE_YANDEX, "calendar:sub:yandex")
		.row()
        .text(MENU_LABELS.CAL_SUBSCRIBE_GOOGLE, "calendar:sub:google")
		.row()
        .text(MENU_LABELS.CAL_SUBSCRIBE_XIOMI, "calendar:sub:xiomi")
		.row()
        .text(MENU_LABELS.CAL_SUBSCRIBE_OTHER, "calendar:sub:other");
}
