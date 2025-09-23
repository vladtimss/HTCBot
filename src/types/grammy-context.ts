/**
 * types/grammy-context.ts
 * --------------------------
 * Расширяем стандартный Context от grammY:
 *  - SessionData хранит состояние навигации
 *  - AccessData хранит данные о доступе (привилегии)
 */

import { Context, SessionFlavor } from "grammy";

/** Данные сессии для навигации */
export interface SessionData {
	menuStack: string[];
	lastSection: string;

	/** Данные для поиска конспектов */
	notes?: {
		searchMode?: "keyword";
		searchInProgress?: boolean;
	};

	/** Кэш годов/месяцев для быстрого возврата (meeting-notes) */
	notesCache?: {
		years?: number[];
		monthsByYear?: Record<number, number[]>;
	};
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
