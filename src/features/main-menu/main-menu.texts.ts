/**
 * features/main-menu/main-menu.texts.ts
 * --------------------------
 * Тексты для главного меню
 */

import { fmt, bold } from "@grammyjs/parse-mode";
import { COMMON } from "../../services/texts";

// ============================================================================
// Основной объект (inline тексты)
// ============================================================================

/**
 * Заголовок главного меню
 */
export const MAIN_TEXTS = {
	title: fmt`${bold()}Главное меню${bold()}\n\n${COMMON.useButtonBelow}`,
};
