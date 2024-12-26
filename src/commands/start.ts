import { Composer, InlineKeyboard }                                        from 'grammy';
import { Command, ParseMode }                                              from "../enums/bot.enums";
import { startKeyboards }                                                  from "../keyboards/start.keyboards";
import {
	START_KEYBOARD_TEXT
}                                                                          from "../strings/keyboards/start.keyboards.strings";
import { generateCalendarEventTemplateMessage, getUpcomingCalendarEvents } from "../helpers/calendar.helpers";
import { log }                                                             from "../middlewares/logger";

const composer = new Composer();

composer.command(Command.START, (ctx) => {
	if (!ctx.from) {
		return;
	}
	const firstName = ctx.from.first_name;
	const text = `Помощник Церкви Святой Троицы приветствуют вас${firstName.length ? ` *${firstName}*` : ''}\\!`;

	return ctx.reply(text, {
		reply_markup: startKeyboards,
		parse_mode: ParseMode.MarkdownV2
	});
});

composer.on('message:text', async (ctx) => {
	const { text } = ctx.message;

	if (text === START_KEYBOARD_TEXT) {
		return await ctx.reply('Посетите канал церкви', {
			reply_markup: new InlineKeyboard().url(
				'Перейти в канал',
				'https://t.me/troitskchurch'
			),
			parse_mode: ParseMode.HTML
		})
	} else if (text === 'Узнать ближайшие события') {
		const upcomingCalendarEvents = await getUpcomingCalendarEvents(3);

		const reply = upcomingCalendarEvents
			.map(event => generateCalendarEventTemplateMessage(event))
			.join(`━━━━━━━━━━━━\n`);
		void log(reply);

		return await ctx.reply(reply, { parse_mode: ParseMode.HTML })

	} else {
		return await ctx.reply('Я вас не понимаю...')
	}
});

export default composer;
