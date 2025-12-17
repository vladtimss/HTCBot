/**
 * features/about-htc/about-htc.keyboard.ts
 * --------------------------
 * Клавиатуры для раздела "О нас"
 */

import { Keyboard } from "grammy";
import { ABOUT_BUTTON_LABELS } from "./about-htc.constants";
import { NAVIGATION_LABELS } from "../../constants/navigation";

export const replyAboutMenu = new Keyboard()
	.text(ABOUT_BUTTON_LABELS.ABOUT_CHANNEL) // 📣 Канал
	.row()
	.text(ABOUT_BUTTON_LABELS.ABOUT_BELIEF) // 🧭 Во что мы верим
	.text(ABOUT_BUTTON_LABELS.ABOUT_HISTORY) // 📜 Наша история
	.row()
	.text(NAVIGATION_LABELS.NAV_BACK) // ⬅️ Назад
	.resized();
