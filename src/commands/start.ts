import { Composer, InlineKeyboard }         from 'grammy';
import { Command, ParseMode }               from "../enums/bot.enums";
import { startKeyboards }                   from "../keyboards/start.keyboards";
import {
	CHURCH_TG_CHANNEL,
	SUNDAY_WORSHIP_INFO,
	UPCOMING_CHURCH_EVENTS
}                                           from "../strings/keyboards/start.keyboards.strings";
import { Divider }                          from "../ui-elements/html.elements";
import { log }                              from "../middlewares/logger";
import { HTC_TG_CHANNEL_LINK }              from "../constants/links.constants";
import { generateCalendarEventMessage }     from "../messages/calendar.messages";
import { getUpcomingCalendarEvents }        from "../helpers/calendar.helpers";
import { generateSundayWorshipInfoMessage } from "../messages/church-info.messages";

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
			await ctx.reply(generateSundayWorshipInfoMessage(), {
				parse_mode: ParseMode.HTML
			});

			const inlineKeyboard = new InlineKeyboard()
				.text('Да', "yesOption")
				.text('Нет', "noOption");

			return await ctx.reply("Хотите, я попробую построить для вас маршрут?", {
				reply_markup: inlineKeyboard,
			});
		case CHURCH_TG_CHANNEL:
			return await ctx.reply('Посетите канал церкви', {
				reply_markup: new InlineKeyboard().url(
					'Перейти в канал',
					HTC_TG_CHANNEL_LINK
				),
				parse_mode: ParseMode.HTML
			});
		case UPCOMING_CHURCH_EVENTS:
			const upcomingCalendarEvents = await getUpcomingCalendarEvents(3);

			const reply = upcomingCalendarEvents
				.map(event => generateCalendarEventMessage(event))
				.join(`${Divider}\n`);

			return await ctx.reply(reply, { parse_mode: ParseMode.HTML })
	}
})

composer.callbackQuery("noOption", async (ctx) => {
	await ctx.answerCallbackQuery();

	await ctx.reply("Хорошо 😊. Будем рады увидеть вас в нашем собрании 🥰");
});

composer.callbackQuery("yesOption", async (ctx) => {
	await ctx.answerCallbackQuery();

	return await ctx.reply('Построить маршрут', {
		reply_markup: new InlineKeyboard().url(
			'Открыть навигатор',
			'https://yandex.ru/navi?rtext=55.485407,37.275574~55.510665,37.349650&rtt=auto'
		),
		parse_mode: ParseMode.HTML
	});

});

composer.on('message:text', async (ctx) => {
	log('some')
	return ctx.reply(`${ctx.from.first_name}, я не знаю, что ответить.`)
});

export default composer;
