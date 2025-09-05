/**
 * utils/logger.ts
 * --------------------------
 * Конфигурация логирования через pino:
 *  - в production → JSON-логи для систем сбора
 *  - в development → читаемые цветные логи через pino-pretty
 */

import pino from "pino";

export const logger =
	process.env.NODE_ENV === "production"
		? pino()
		: pino({
				transport: {
					target: "pino-pretty",
					options: {
						colorize: true, // цветной вывод
						translateTime: "SYS:standard", // время
						ignore: "pid,hostname", // убираем лишние поля
					},
				},
		  });
