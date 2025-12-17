/**
 * features/sunday-service/sunday-service.texts.ts
 * --------------------------
 * Тексты для раздела "Воскресное богослужение"
 */

import { fmt, bold, italic, link } from "@grammyjs/parse-mode";
import { env } from "../../config/env";

export const SUNDAY_TEXTS = {
	title: "Воскресное богослужение",
	text: fmt`✨ ${bold()}Богослужение проходит каждое воскресенье${bold()}

🕚 ${bold()}Начало в 11:00${bold()}

📍 ${bold()}Адрес:${bold()}
> Чароитовая улица, 1к5
> район Троицк, Москва

${italic()}Вход справа от подъезда 1 и слева от ателье${italic()}

🌍 ${link(env.YANDEX_MAP_URL)}Открыть в Яндекс.Картах${link(env.YANDEX_MAP_URL)}`,
};
