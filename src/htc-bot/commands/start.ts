import { Context } from 'grammy';

export const startCommand = (ctx: Context) => {
    return ctx.reply('Добро пожаловать в помощник Церкви Святой Троицы!');
}
