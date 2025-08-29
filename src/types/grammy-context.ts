import { Context, SessionFlavor } from "grammy";

/**
 * Состояние сессии хранит стек путей меню,
 * чтобы кнопка "Назад" всегда знала, куда вернуться.
 */
export interface SessionData {
	menuStack: string[]; // например: ["main", "groups", "byday", "MON"]
}

/**
 * Данные о пользователе/ролях, которые мы подгружаем в миддлваре auth.
 */
export interface AccessData {
	isProUser: boolean; // имеет ли доступ к "четвёртой кнопке" + MG расширенные пункты
	username?: string;
	telegramId?: number;
}

/**
 * Собираем свой контекст с добавлением session и access.
 */
export type MyContext = Context &
	SessionFlavor<SessionData> & {
		access: AccessData;
		// вспомогательный флаг на главную 4-ю кнопку
		canSeeFourthButton?: boolean;
	};
