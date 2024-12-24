import { Composer, InlineKeyboard } from 'grammy';
import { ParseMode }                from "../enums/main.enums";

const composer = new Composer();

composer.command('start', (ctx) => {
	if (!ctx.from) {
		return;
	}
	const firstName = ctx.from.first_name;
	const text = `Помощник Церкви Святой Троицы приветствуют вас${firstName.length ? ` *${firstName}*` : ''}\\!`;

	return ctx.reply(text, {
		reply_markup: new InlineKeyboard().url(
			'Канал о жизни церкви',
			'https://t.me/troitskchurch'
		),
		parse_mode: ParseMode.MarkdownV2
	});
});

export default composer;
