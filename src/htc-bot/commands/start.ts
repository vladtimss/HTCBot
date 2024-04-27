import { Context }        from 'grammy';
import { welcomeMessage } from "../messages/welcome";

export const startCommand = async (ctx: Context) => {
    await ctx.reply(
        welcomeMessage(ctx.from.first_name ?? ctx.from.username),
        {parse_mode: "MarkdownV2"});
}
