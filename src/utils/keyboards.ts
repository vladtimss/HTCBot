/**
 * Все клавиатуры бота собраны в одном месте.
 * Разбито по разделам главного меню для удобства.
 */

import { Keyboard, InlineKeyboard } from "grammy";
import { MENU_LABELS } from "../constants/button-lables";
import { SMALL_GROUPS_TEXTS as GROUPS_TEXTS } from "../services/texts";
import { MyContext } from "../types/grammy-context";

/**
 * Главное меню зависит от прав:
 * - если есть доступ — показываем кнопку "Церковный календарь"
 * - если нет — не показываем
 */
export function replyMainKeyboard(ctx: MyContext) {
	const kb = new Keyboard()
		.text(MENU_LABELS.SUNDAY) // ⛪ Воскресное богослужение
		.text(MENU_LABELS.SERMONS) // 🎧 Проповеди
		.row()
		.text(MENU_LABELS.GROUPS); // 👥 Малые группы

	if (ctx.access.isPrivileged) {
		kb.text(MENU_LABELS.CALENDAR); // 📅 Церковный календарь
	}

	kb.row().text(MENU_LABELS.ABOUT).resized().persistent();
	return kb;
}

/* -------------------- О нас -------------------- */
export const replyAboutMenu = new Keyboard()
	.text(MENU_LABELS.CHANNEL) // 📣 Канал
	.row()
	.text(MENU_LABELS.BELIEF) // 🧭 Во что мы верим
	.text(MENU_LABELS.HISTORY) // 📜 Наша история
	.row()
	.text(MENU_LABELS.BACK) // ⬅️ Назад
	.resized();

/** 🔙 Назад к «О нас» + 🏠 Главное меню */
export const replyBackToAbout = new Keyboard()
	.text(MENU_LABELS.BACK) // ⬅️ Назад
	.row()
	.text(MENU_LABELS.MAIN) // 🏠 В главное меню
	.resized();

/* -------------------- Малые группы -------------------- */
/**
 * В малых группах нужно скрывать кнопки календаря у неавторизованных.
 */
export function replyGroupsMenu(ctx: MyContext) {
	const kb = new Keyboard()
		.text(GROUPS_TEXTS.byDay) // 📅 По дням
		.text(GROUPS_TEXTS.byDistrict) // 📍 По районам
		.row();

	if (ctx.access.isPrivileged) {
		kb.text(MENU_LABELS.LMG_NEXT) // ⏱️ Следующая встреча ЛМГ
			.text(MENU_LABELS.LMG_ALL) // 🗓️ Все встречи ЛМГ
			.row()
			.text(MENU_LABELS.LMG_TRIP)
			.row();
	}

	kb.text(MENU_LABELS.BACK) // ⬅️ Назад
		.resized();

	return kb;
}

// Inline-меню для выезда ЛМГ
export const inlineLmgTrip = new InlineKeyboard().text("📅 Даты выезда", "lmg_trip_dates");

/* -------------------- Проповеди -------------------- */
export const replySermonsMenu = new Keyboard().text("🎧 Подкасты").row().text("⬅️ Назад").resized();

/* -------------------- Церковный календарь -------------------- */
export const replyCalendarMenu = {
	keyboard: [
		[MENU_LABELS.CALENDAR_MEMBERS, MENU_LABELS.CALENDAR_PRAYER],
		[MENU_LABELS.CALENDAR_LMG, MENU_LABELS.CALENDAR_FAMILY],
		[MENU_LABELS.CALENDAR_NEXT, MENU_LABELS.CALENDAR_HOLIDAYS],
		[MENU_LABELS.BACK, MENU_LABELS.CALENDAR_SUBSCRIBE],
	],
	resize_keyboard: true,
};

export const replyCalendarLmgMenu = {
	keyboard: [
		[MENU_LABELS.LMG_NEXT, MENU_LABELS.LMG_ALL],
		[MENU_LABELS.BACK, MENU_LABELS.MAIN],
	],
	resize_keyboard: true,
};

export const replyCalendarPrayerMenu = {
	keyboard: [
		[MENU_LABELS.PRAYER_NEXT, MENU_LABELS.PRAYER_ALL],
		[MENU_LABELS.BACK, MENU_LABELS.MAIN],
	],
	resize_keyboard: true,
};

export const replyCalendarMembersMenu = {
	keyboard: [
		[MENU_LABELS.MEMBERS_NEXT, MENU_LABELS.MEMBERS_ALL],
		[MENU_LABELS.BACK, MENU_LABELS.MAIN],
	],
	resize_keyboard: true,
};

export const replyCalendarHolidaysMenu = {
	keyboard: [
		[MENU_LABELS.HOLIDAY_RV, MENU_LABELS.HOLIDAY_EASTER],
		[MENU_LABELS.BACK, MENU_LABELS.MAIN],
	],
	resize_keyboard: true,
};

export const replyCalendarFamilyMenu = {
	keyboard: [
		[MENU_LABELS.FAMILY_NEXT, MENU_LABELS.FAMILY_ALL],
		[MENU_LABELS.BACK, MENU_LABELS.MAIN],
	],
	resize_keyboard: true,
};

export function subscribeKeyboard() {
	return new InlineKeyboard()
		.text(MENU_LABELS.CALENDAR_SUB_APPLE, "calendar:sub:apple")
		.row()
		.text(MENU_LABELS.CALENDAR_SUB_YANDEX, "calendar:sub:yandex")
		.row()
		.text(MENU_LABELS.CALENDAR_SUB_GOOGLE, "calendar:sub:google")
		.row()
		.text(MENU_LABELS.CALENDAR_SUB_XIOMI, "calendar:sub:xiomi")
		.row()
		.text(MENU_LABELS.CALENDAR_SUB_OTHER, "calendar:sub:other");
}

/* -------------------- Общие inline-кнопки -------------------- */
/** 🏠 В главное меню (используется в списках и сообщениях) */
export const inlineBackToMain = () => new InlineKeyboard().text(MENU_LABELS.MAIN, "nav:main");
