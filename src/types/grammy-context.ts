import { Context, SessionFlavor } from "grammy";

export interface SessionData {
	// Стек для inline-навигации (малые группы и др.)
	menuStack: string[];

	// Для Reply-навигации по разделу «О нас»:
	// lastSection: "main" | "about" | "about/belief" | "about/history" | "sunday" | "next3" | ...
	lastSection: string;
}

export interface AccessData {
	isPrivileged: boolean;
	username?: string;
	telegramId?: number;
}

export type MyContext = Context &
	SessionFlavor<SessionData> & {
		access: AccessData;
	};
