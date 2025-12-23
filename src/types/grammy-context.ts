/**
 * types/grammy-context.ts
 * --------------------------
 * Расширяем стандартный Context от grammY:
 *  - SessionData хранит состояние навигации
 *  - AccessData хранит данные о доступе (привилегии)
 */

import { Context, SessionFlavor } from "grammy";
import { Sermon } from "./buildin";

/** Данные сессии для навигации */
export interface SessionData {
	/** Стек для inline-навигации */
	menuStack: string[];

	/** Последний раздел */
	lastSection: string;

	/** Загруженные проповеди (для раздела "Проповеди") */
	sermons?: Sermon[];
}

/** Данные о доступе пользователя */
export interface AccessData {
	isPrivileged: boolean;
	username?: string;
	telegramId?: number;
}

/** Контекст бота: Context + Session + Access */
export type MyContext = Context &
	SessionFlavor<SessionData> & {
		access: AccessData;
	};
