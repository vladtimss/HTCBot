/**
 * features/about-htc/about-htc.feature.ts
 * --------------------------
 * Логика раздела "О нас"
 */

import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { ABOUT_TEXTS, BELIEF_TEXT, HISTORY_TEXT } from "./about-htc.texts";
import { COMMON } from "../../services/texts";
import { env } from "../../config/env";
import { replyAboutMenu } from "./about-htc.keyboard";
import { ABOUT_BUTTON_LABELS } from "./about-htc.constants";
import { MENU_LABELS } from "../../constants/button-lables";
import { fmt, bold } from "@grammyjs/parse-mode";
import { replyFormatted, replyPhotoWithFormattedCaption } from "../../utils/format-helpers";

/**
 * Рендер корня раздела «О нас»
 */
export async function renderAboutRoot(ctx: MyContext) {
	ctx.session.menuStack = ["about"];
	ctx.session.lastSection = "about";

	const text = fmt`${bold()}Раздел: ${ABOUT_TEXTS.title}${bold()}

${COMMON.useButtonBelow}`;

	await replyFormatted(ctx, text, {
		reply_markup: replyAboutMenu,
	});
}

/**
 * Регистрация хендлеров раздела «О нас»
 */
export function registerAboutHTC(bot: Bot<MyContext>) {
	// Вход в раздел
	bot.hears(MENU_LABELS.MAIN_ABOUT, async (ctx) => {
		await renderAboutRoot(ctx);
	});

	// Канал — отправляем ссылку из env
	bot.hears(ABOUT_BUTTON_LABELS.ABOUT_CHANNEL, async (ctx) => {
		const text = fmt`Наш канал: ${env.CHANNEL_URL}`;
		await replyFormatted(ctx, text, {
			reply_markup: replyAboutMenu,
		});
		ctx.session.menuStack = ["about"];
		ctx.session.lastSection = "about";
	});

	// Во что мы верим — просто информационное сообщение внутри раздела
	bot.hears(ABOUT_BUTTON_LABELS.ABOUT_BELIEF, async (ctx) => {
		await replyPhotoWithFormattedCaption(
			ctx,
			"https://disk.yandex.ru/i/D40j3pRDbGGFMw",
			BELIEF_TEXT,
			{
				reply_markup: replyAboutMenu,
			}
		);
		ctx.session.menuStack = ["about"];
		ctx.session.lastSection = "about";
	});

	// Наша история
	bot.hears(ABOUT_BUTTON_LABELS.ABOUT_HISTORY, async (ctx) => {
		await replyFormatted(ctx, HISTORY_TEXT, {
			reply_markup: replyAboutMenu,
			link_preview_options: { is_disabled: true },
		});
		ctx.session.menuStack = ["about"];
		ctx.session.lastSection = "about";
	});
}
