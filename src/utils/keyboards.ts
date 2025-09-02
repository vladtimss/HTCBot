import { Keyboard, InlineKeyboard } from "grammy";
import { MENU_LABELS } from "../constants/button-lables";
import { GROUPS as GROUPS_TEXTS } from "../services/texts";

/**
 * Главное меню — широкие кнопки (каждая в своей строке)
 */
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

/**
 * Клавиатура раздела «О нас»
 */
export const replyAboutMenu = new Keyboard()
	.text(MENU_LABELS.CHANNEL) // 📣 Канал
	.row()
	.text(MENU_LABELS.BELIEF) // 🧭 Во что мы верим
	.text(MENU_LABELS.HISTORY) // 📜 Наша история
	.row()
	.text(MENU_LABELS.BACK) // ⬅️ Назад
	.resized();

/**
 * Клавиатура «Назад к О нас» + «Главное меню»
 */
export const replyBackToAbout = new Keyboard()
	.text(MENU_LABELS.BACK) // ⬅️ Назад
	.row()
	.text(MENU_LABELS.MAIN) // 🏠 В главное меню
	.resized();

/**
 * Клавиатура «Малые группы»
 * Первые две кнопки (По дням/По районам) берём из texts.ts,
 * чтобы их же использовать в bot.hears().
 */
export const replyGroupsMenu = new Keyboard()
	.text(GROUPS_TEXTS.byDay) // 📅 По дням
	.text(GROUPS_TEXTS.byDistrict) // 📍 По районам
	.row()
	.text(MENU_LABELS.LMG_NEXT) // Когда следующая встреча ЛМГ
	.text(MENU_LABELS.LMG_ALL) // Все встречи ЛМГ до конца сезона
	.row()
	.text(MENU_LABELS.BACK) // ⬅️ Назад
	.resized();

/**
 * Общая inline-кнопка «В главное меню» (для сообщений со списками)
 */
export const inlineBackToMain = () => new InlineKeyboard().text(MENU_LABELS.MAIN, "nav:main");

// Клавиатура «Проповеди»
export const replySermonsMenu = new Keyboard().text("🎧 Подкасты").row().text("⬅️ Назад").resized();

// Ниже — календарные клавиатуры (как были)
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
