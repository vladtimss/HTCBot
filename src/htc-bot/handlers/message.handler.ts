import { Bot }               from "grammy";
import { secondaryKeyboard } from "../keyboards/search-songs";
import { mainKeyboard }      from "../keyboards/main-keyboards";

export const useMassageHandler = async (htcBot: Bot) => {
	let state = 'main';

	htcBot.on("message:text", async (ctx) => {
		const text = ctx.message.text;

		if (text === "📕Песни") {
			await ctx.reply("Здесь вы можете найти песни ЦСТ", {
				reply_markup: secondaryKeyboard, // Show the second keyboard
			});
		}

		else if (text === "Поиск 🔎") {
			state = 'search';
			await ctx.reply("Пожалуйста введи ваш запрос:");
		}

		else if (text === "🔙Назад") {
			state = 'main';
			await ctx.reply("Возвращаемся в главное меню...", {
				reply_markup: mainKeyboard, // Show the main keyboard again
			});
		} else if (state === 'search') {
			const userInput = ctx.message.text; // Capture user input
			console.log("User input:", userInput); // Log the input to the console
			await ctx.reply(`You searched for: "${userInput}"`);
		} else {
			await ctx.reply("На это не знаю, что вам сказать");
		}
	});
}