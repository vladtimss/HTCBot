import { Commands }   from "../enums/commands";
import { BotCommand } from "grammy/out/types";

export const htcBotCommands: BotCommand[] = [
	{command: Commands.start, description: 'Начало работы'}
];