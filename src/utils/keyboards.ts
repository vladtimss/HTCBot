import { Keyboard, InlineKeyboard } from "grammy";

// Главное меню — широкие кнопки
export const replyMainKeyboard = new Keyboard()
	.text("⛪ Воскресное богослужение")
	.text("👥 Малые группы")
	.row()
	.text("🗓️ Показать три ближайших события")
	.row()
	.text("🙌 Кто мы")
	.resized();

// Клавиатура «В главное меню»
export const replyOnlyMain = new Keyboard().text("🏠 В главное меню").resized();

// Клавиатура раздела «Кто мы»
export const replyAboutMenu = new Keyboard()
	.text("📣 Канал")
	.row()
	.text("🧭 Во что мы верим")
	.row()
	.text("📜 Наша история")
	.row()
	.text("⬅️ В главное меню")
	.row()
	.resized();

// Клавиатура «Назад в «Кто мы» + главное меню» (для belief/history)
export const replyBackToAbout = new Keyboard().text("⬅️ Назад").row().text("🏠 В главное меню").resized();

// Общая inline-навигация для списка (малые группы)
export function inlineBackToMain() {
	return new InlineKeyboard().text("🏠 В главное меню", "nav:main");
}

export function inlineGroupsRoot() {
	return new InlineKeyboard()
		.text("📅 По дням", "groups:byday")
		.text("📍 По районам", "groups:bydistrict")
		.row()
		.text("🏠 В главное меню", "nav:main");
}
