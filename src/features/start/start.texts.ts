/**
 * features/start/start.texts.ts
 * --------------------------
 * Тексты для команды /start
 */

import { fmt, bold } from "@grammyjs/parse-mode";
import { MyContext } from "../../types/grammy-context";

/**
 * Приветственное сообщение при команде /start
 */
export function greet(ctx: MyContext) {
	const firstName = ctx.from?.first_name ?? "";
	const isPrivileged = ctx.access?.isPrivileged;

	if (isPrivileged) {
		return fmt`Привет${firstName ? `, ${firstName}` : ""}!\n${bold()}Это помощник для нашей Церкви${bold()}.\nВоспользуйтесь кнопками внизу 👇`;
	} else {
		return fmt`Добро пожаловать${firstName ? `, ${firstName}` : ""}!\n\nЭто помощник Церкви Святой Троицы\nЗдесь вы найдёте информацию о богослужениях, проповедях, о нас, о малых группах и, как к ним можно присоединиться.\nВоспользуйтесь кнопками внизу 👇`;
	}
}
