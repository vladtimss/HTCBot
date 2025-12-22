/**
 * features/sermons/sermons.feature.ts
 * --------------------------
 * Логика раздела "Проповеди"
 */

import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { env } from "../../config/env";
import { replySermonsMenu } from "./sermons.keyboard";
import { MENU_LABELS } from "../../constants/button-lables";
import { SERMONS_TEXTS } from "./sermons.texts";
import { CALENDAR_BUTTON_LABELS } from "../church-calendar/church-calendar.constants";
import { COMMON } from "../../services/texts";
import { fmt } from "@grammyjs/parse-mode";
import { replyFormatted } from "../../utils/format-helpers";

/**
 * 📌 Рендер корня раздела «Проповеди»
 */
export async function renderSermonsRoot(ctx: MyContext) {
	ctx.session.menuStack = ["sermons"];
	ctx.session.lastSection = "sermons";

	const text = fmt`${SERMONS_TEXTS.title}

${COMMON.useButtonBelow}`;

	await replyFormatted(ctx, text, {
		reply_markup: replySermonsMenu,
	});
}

/**
 * 📌 Регистрация хендлеров раздела «Проповеди»
 */
export function registerSermons(bot: Bot<MyContext>) {
	// Вход в раздел из главного меню
	bot.hears(MENU_LABELS.MAIN_SERMONS, async (ctx) => {
		await renderSermonsRoot(ctx);
	});

	// Подкасты
	bot.hears(CALENDAR_BUTTON_LABELS.SERMONS_PODCASTS, async (ctx) => {
		const podcastsText = SERMONS_TEXTS.podcasts(env.SERMONS_YANDEX_URL, env.SERMONS_PODSTER_URL);
		await replyFormatted(ctx, podcastsText, {
			link_preview_options: { is_disabled: true },
			reply_markup: replySermonsMenu,
		});
	});
}
