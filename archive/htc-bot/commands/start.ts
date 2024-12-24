import { Bot, Context }   from 'grammy';
import { welcomeMessage } from "../messages/welcome";
import { mainKeyboard }   from "../keyboards/main-keyboards";

export const startCommand = async (ctx: Context) => {
    await ctx.reply(
        welcomeMessage(ctx.from.first_name ?? ctx.from.username),
        {parse_mode: "MarkdownV2"});
}

export const useStartCommand = async (htcBot: Bot) => {
    htcBot.command("start", async (ctx) => {
        await ctx.reply("Добро пожаловать!", {
            reply_markup: mainKeyboard,
        });
    });
}
