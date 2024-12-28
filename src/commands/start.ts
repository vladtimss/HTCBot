import { Composer, InlineKeyboard }         from 'grammy';
import { Command, ParseMode }               from "../enums/bot.enums";
import { startKeyboards }                   from "../keyboards/start.keyboards";
import {
	CHURCH_TG_CHANNEL,
	SUNDAY_WORSHIP_INFO,
	UPCOMING_CHURCH_EVENTS
}                                           from "../strings/keyboards/start.keyboards.strings";
import { Divider }                          from "../ui-elements/html.elements";
import { generateCalendarEventMessage }     from "../messages/calendar.messages";
import { generateSundayWorshipInfoMessage } from "../messages/church-info.messages";
import {
	caldavCalendarIntegrationServiceInstance
}                                           from "../services/caldav-calendar-integration.service";
import env                                  from "../env";

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

composer.hears([CHURCH_TG_CHANNEL, SUNDAY_WORSHIP_INFO, UPCOMING_CHURCH_EVENTS], async (ctx) => {
	switch (ctx.message.text) {
		case SUNDAY_WORSHIP_INFO:
			return await ctx.reply(generateSundayWorshipInfoMessage(), {
				parse_mode: ParseMode.HTML
			});
		case CHURCH_TG_CHANNEL:
			return await ctx.reply('Посетите канал церкви', {
				reply_markup: new InlineKeyboard().url(
					'Перейти в канал',
					`${env.HTC_TG_CHANNEL_URL}`
				),
				parse_mode: ParseMode.HTML
			});
		case UPCOMING_CHURCH_EVENTS:
			const upcomingCalendarEvents = await caldavCalendarIntegrationServiceInstance.fetchUpcomingCalendarEvents(3);

			const reply = upcomingCalendarEvents
				.map(event => generateCalendarEventMessage(event))
				.join(`${Divider}\n`);

			return await ctx.reply(reply, { parse_mode: ParseMode.HTML })
	}
})

composer.on('message:text', async (ctx) => {
	await ctx.reply(`${ctx.from.first_name}, я не знаю, что ответить.`)
});

export default composer;
