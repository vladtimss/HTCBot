import { Composer, InlineKeyboard } from 'grammy';
import { Command, ParseMode }       from "../enums/bot.enums";
import { startKeyboards }           from "../keyboards/start.keyboards";
import { START_KEYBOARD_TEXT }      from "../strings/keyboards/start.keyboards.strings";
import { log }                      from "../middlewares/logger";
import { escape }                   from 'html-escaper';
import { getAllEvents }             from "../helpers/calendar.helpers";

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
		return ctx.reply('Посетите канал церкви', {
			reply_markup: new InlineKeyboard().url(
				'Перейти в канал',
				'https://t.me/troitskchurch'
			),
			parse_mode: ParseMode.HTML
		})
	} else if (text === 'Узнать ближайшее событие') {
		const res = await getAllEvents();
		void log(`<pre class="language-json"><code>${escape(JSON.stringify(res, null, 2))}</code></pre>`);
	}
});

export default composer;
