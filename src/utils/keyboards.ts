/**
 * Все клавиатуры бота собраны в одном месте.
 * Разбито по разделам главного меню для удобства.
 */

import { Keyboard, InlineKeyboard } from "grammy";
import { MENU_LABELS } from "../constants/button-lables";
import { GROUPS as GROUPS_TEXTS } from "../services/texts";

/* -------------------- Главное меню -------------------- */
export const replyMainKeyboard = new Keyboard()
	.text(MENU_LABELS.SUNDAY) // ⛪ Воскресное богослужение
	.text(MENU_LABELS.SERMONS) // 🎧 Проповеди
	.row()
	.text(MENU_LABELS.GROUPS) // 👥 Малые группы
	.text(MENU_LABELS.CALENDAR) // 📅 Церковный календарь
	.row()
	.text(MENU_LABELS.ABOUT) // 🙌 О нас
	.resized()
	.persistent();

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
export const replyGroupsMenu = new Keyboard()
	.text(GROUPS_TEXTS.byDay) // 📅 По дням
	.text(GROUPS_TEXTS.byDistrict) // 📍 По районам
	.row()
	.text(MENU_LABELS.LMG_NEXT) // ⏱️ Следующая встреча ЛМГ
	.text(MENU_LABELS.LMG_ALL) // 🗓️ Все встречи ЛМГ
	.row()
	.text(MENU_LABELS.BACK) // ⬅️ Назад
	.resized();

/* -------------------- Проповеди -------------------- */
export const replySermonsMenu = new Keyboard().text("🎧 Подкасты").row().text("⬅️ Назад").resized();

/* -------------------- Церковный календарь -------------------- */
export const replyCalendarMenu = {
	keyboard: [
		[MENU_LABELS.CALENDAR_MEMBERS, MENU_LABELS.CALENDAR_PRAYER],
		[MENU_LABELS.CALENDAR_LMG, MENU_LABELS.CALENDAR_FAMILY],
		[MENU_LABELS.CALENDAR_NEXT, MENU_LABELS.CALENDAR_HOLIDAYS],
		[MENU_LABELS.BACK],
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

/* -------------------- Общие inline-кнопки -------------------- */
/** 🏠 В главное меню (используется в списках и сообщениях) */
export const inlineBackToMain = () => new InlineKeyboard().text(MENU_LABELS.MAIN, "nav:main");
