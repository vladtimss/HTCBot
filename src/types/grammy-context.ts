/**
 * types/grammy-context.ts
 * --------------------------
 * Расширяем стандартный Context от grammY:
 *  - SessionData хранит состояние навигации
 *  - AccessData хранит данные о доступе (привилегии)
 */

import { Context, SessionFlavor } from "grammy";
import { LmgNote, Sermon } from "./buildin";
import type { NormalizedSermonState } from "../features/sermons/sermons.util";
import type { NormalizedLmgNotesState } from "../features/lmg-notes/lmg-notes.util";

/** Данные сессии для навигации */
export interface SessionData {
	/** Стек для inline-навигации */
	menuStack: string[];

	/** Последний раздел */
	lastSection: string;

	/** Загруженные проповеди (для раздела "Проповеди") */
	sermons?: Sermon[];
	/** Нормализованное состояние проповедей (книги/серии/проповедники) */
	sermonsState?: NormalizedSermonState;
	/** Кеш проповедников по ID страницы */
	preachersById?: Record<string, string>;

	/** Загруженные конспекты ЛМГ */
	lmgNotes?: LmgNote[];
	/** Нормализованное состояние конспектов ЛМГ (книги/главы) */
	lmgNotesState?: NormalizedLmgNotesState;
	/** Время последней активности в разделе конспектов ЛМГ (ms since epoch) */
	lmgNotesLastActivityAt?: number;
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
