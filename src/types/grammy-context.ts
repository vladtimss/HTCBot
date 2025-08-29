import { Context, SessionFlavor } from "grammy";

export interface SessionData {
	menuStack: string[]; // стек экранов для «Назад»
	lastMessageId?: number; // можно хранить id сообщения, если нужно
}

export interface AccessData {
	isPrivileged: boolean;
	canSeeFourthButton: boolean;
	username?: string;
	telegramId?: number;
}

export type MyContext = Context &
	SessionFlavor<SessionData> & {
		access: AccessData;
		// вспомогательный флаг на главную 4-ю кнопку
		canSeeFourthButton?: boolean;
	};
