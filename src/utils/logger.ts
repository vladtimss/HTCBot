import pino from "pino";

export const logger =
	process.env.NODE_ENV === "production"
		? // В проде пишем обычные JSON-логи (легче для контейнеров, ELK и т.п.)
		  pino()
		: // В dev — красиво форматируем через pino-pretty
		  pino({
				transport: {
					target: "pino-pretty",
					options: {
						colorize: true, // цветные логи
						translateTime: "SYS:standard", // человекочитаемое время
						ignore: "pid,hostname", // убираем лишнее
					},
				},
		  });
