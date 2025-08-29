import { InlineKeyboard } from "grammy";

/**
 * Универсальные кнопки для любого экрана.
 * "Назад" возвращает на шаг назад (обрабатывается в menu.ts),
 * "В главное меню" — в корень (main).
 */
export function commonNav(backPayload = "nav:back") {
	return new InlineKeyboard().text("⬅️ Назад", backPayload).row().text("🏠 В главное меню", "nav:main");
}

/**
 * Помощник для URL-кнопок, чтобы не смешивать callback и url.
 */
export function urlKeyboard(text: string, url: string) {
	const kb = new InlineKeyboard();
	kb.url(text, url);
	kb.row().text("⬅️ Назад", "nav:back").row().text("🏠 В главное меню", "nav:main");
	return kb;
}
