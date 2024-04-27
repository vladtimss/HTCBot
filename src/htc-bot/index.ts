import { Bot }                         from 'grammy';
import { loggingMiddleware }           from "./middlewares/logging";
import { startCommand }                from "./commands/start";
import dotenv                          from 'dotenv';
import { getUserFirstNameFrom }        from "./helpers/user-info.helpers";
import { transformTextToItalicHelper } from "./helpers/markdown.helpers";

dotenv.config();

const htcBot = new Bot(process.env.TOKEN);

htcBot.use(loggingMiddleware);

htcBot.command('start', startCommand);

htcBot.on("message", async (ctx) => {
    const userText = ctx.message.text;
    const author = await ctx.getAuthor();
    const userFirstName = getUserFirstNameFrom(author.user);

    await ctx.api.sendMessage(ctx.message.chat.id, `
    Я еще очень мало умею, но постарался понять, что вы написали, ${userFirstName}\\.
    \nКажется, вы написали:
    \n${transformTextToItalicHelper(userText)}`, {parse_mode: "MarkdownV2"}
    )
});

export default htcBot;
