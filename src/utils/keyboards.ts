// src/utils/keyboards.ts
import { Keyboard, InlineKeyboard } from "grammy";
import { MENU_LABELS } from "../constants/button-lables";

/**
 * Главное меню — широкие кнопки (каждая в своей строке)
 */
export const replyMainKeyboard = new Keyboard()
	.text(MENU_LABELS.SUNDAY) // ⛪ Воскресное богослужение
	.text(MENU_LABELS.GROUPS) // 👥 Малые группы
	.row()
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
	.text(MENU_LABELS.MAIN) // 🏠 В главное меню
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
 * Клавиатура «Малые группы» (reply — широкие)
 */
export const replyGroupsMenu = new Keyboard()
	.text(MENU_LABELS.LMG_NEXT) // 📅 Когда следующая встреча ЛМГ
	.text(MENU_LABELS.LMG_ALL) // 📖 Все встречи ЛМГ до конца сезона
	.row()
	.text(MENU_LABELS.MAIN) // 🏠 В главное меню
	.resized();

/**
 * Общая inline-кнопка «В главное меню» (для сообщений со списками)
 */
export const inlineBackToMain = () => new InlineKeyboard().text(MENU_LABELS.MAIN, "nav:main");
