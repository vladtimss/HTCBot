import { Keyboard, InlineKeyboard } from "grammy";

// Главное меню — широкие кнопки (каждая в своей строке)
export const replyMainKeyboard = new Keyboard()
	.text("⛪ Воскресное богослужение")
	.text("👥 Малые группы")
	.row()
	.text("🗓️ Показать три ближайших события")
	.row()
	.text("🙌 Кто мы")
	.resized()
	.persistent();

// Клавиатура «Кто мы»
export const replyAboutMenu = new Keyboard()
	.text("📣 Канал")
	.row()
	.text("🧭 Во что мы верим")
	.text("📜 Наша история")
	.row()
	.text("⬅️ В главное меню")
	.resized();

// Клавиатура «Назад к „Кто мы“ + в главное»
export const replyBackToAbout = new Keyboard().text("⬅️ Назад").row().text("🏠 В главное меню").resized();

// Клавиатура «Малые группы» (reply — широкие)
export const replyGroupsMenu = new Keyboard()
	.text("📅 По дням")
	.text("📍 По районам")
	.row()
	.text("📅 Когда следующая встреча ЛМГ")
	.text("📖 Все встречи ЛМГ до конца сезона")
	.row()
	.text("⬅️ В главное меню")
	.resized();

// Общая inline-кнопка «В главное меню» (для сообщений со списками)
export const inlineBackToMain = () => new InlineKeyboard().text("🏠 В главное меню", "nav:main");
