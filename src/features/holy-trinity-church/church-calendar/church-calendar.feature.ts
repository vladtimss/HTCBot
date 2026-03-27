/**
 * features/holy-trinity-church/church-calendar/church-calendar.feature.ts
 * --------------------------
 * Логика раздела "Церковный календарь"
 */

import { Bot, InlineKeyboard, InputFile } from "grammy";
import { MyContext } from "../../../types/grammy-context";
import {
	fetchUpcomingEvents,
	fetchNextEventByTitle,
	fetchAllFutureEventsByTitle,
	fetchHolidayEvent,
	formatEvent,
} from "../../../services/calendar";
import { MENU_LABELS } from "../../../constants/button-lables"; // MAIN_CALENDAR — вход из раздела «Церковь Святой Троицы»
import { CALENDAR_TEXTS } from "./church-calendar.texts";
import { CALENDAR_BUTTON_LABELS } from "./church-calendar.constants";
import { SMALL_GROUPS_BUTTON_LABELS } from "../../small-groups/small-groups.constants";
import { COMMON } from "../../../services/texts"; // Глобальный текст, используется во множестве фич
import {
	replyCalendarMenu,
	replyCalendarLmgMenu,
	replyCalendarPrayerMenu,
	replyCalendarMembersMenu,
	replyCalendarHolidaysMenu,
	replyCalendarFamilyMenu,
	subscribeKeyboard,
} from "./church-calendar.keyboard";
import { requirePrivileged } from "../../../utils/guards";
import { env } from "../../../config/env";
import { withLoading } from "../../../utils/loading";
import { buildHtmlForEvents } from "./church-calendar.util";
import { fmt, bold, code, link, type FormattedString } from "@grammyjs/parse-mode";
import { replyFormatted } from "../../../utils/format-helpers";
import { safeReply } from "../../../utils/telegram-flood";
import puppeteer from "puppeteer";
import os from "os";

/**
 * 📌 Отрисовка корня раздела «Церковный календарь»
 */
export async function renderCalendarRoot(ctx: MyContext) {
	ctx.session.lastSection = "calendar";
	ctx.session.menuStack = ["holy-trinity-church", "calendar"];

	const text = fmt`${CALENDAR_TEXTS.title}${COMMON.useButtonBelow}`;

	await replyFormatted(ctx, text, {
		reply_markup: replyCalendarMenu,
	});
}

/**
 * Отрисовка кнопок с выбором инструкций
 * @param ctx
 * @param title
 * @param body
 */
async function replyInstruction(ctx: MyContext, title: string, body: FormattedString) {
	if (!requirePrivileged(ctx)) return;

	const text = fmt`${bold()}${title}${bold()}

${body}

${bold()}Ссылка для подписки:${bold()}

${code()}${env.CALENDAR_SUBSCRIBE_URL}${code()}
`;

	await ctx.editMessageText(text.text, {
		entities: text.entities,
		reply_markup: new InlineKeyboard().text("⬅️ Назад", "calendar:instructions"),
		link_preview_options: { is_disabled: true },
	});
}

/**
 * 📌 Регистрируем все обработчики для календаря
 */
export function registerChurchCalendar(bot: Bot<MyContext>) {
	// --- Корень календаря ---
	bot.hears(MENU_LABELS.MAIN_CALENDAR, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		await renderCalendarRoot(ctx);
	});

	// --- Ближайшие события ---
	bot.hears(CALENDAR_BUTTON_LABELS.CAL_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await withLoading(ctx, () => fetchUpcomingEvents(5), {
			text: "Запрашиваю календарь…",
		});

		if (events.length === 0) {
			return replyFormatted(ctx, CALENDAR_TEXTS.noEvents);
		}
		const eventsText = events.map((e) => formatEvent(e, true)).join("\n\n");
		const text = fmt`${CALENDAR_TEXTS.nextEventsTitle}

${eventsText}`;
		await ctx.reply(text.text, {
			entities: text.entities,
			parse_mode: "MarkdownV2",
		});
	});

	// === ЛМГ ===
	bot.hears(CALENDAR_BUTTON_LABELS.CAL_LMG, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("lmg");
		const text = fmt`${CALENDAR_TEXTS.lmgTitle}${COMMON.useButtonBelow}`;
		await replyFormatted(ctx, text, {
			reply_markup: replyCalendarLmgMenu,
		});
	});

	bot.hears(SMALL_GROUPS_BUTTON_LABELS.LMG_CAL_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const ev = await withLoading(ctx, () => fetchNextEventByTitle("лмг"), {
			text: "Ищу ближайшую встречу ЛМГ…",
		});
		if (!ev) return replyFormatted(ctx, CALENDAR_TEXTS.lmgNone);
		const text = fmt`${CALENDAR_TEXTS.lmgNext}

${formatEvent(ev)}`;
		await ctx.reply(text.text, {
			entities: text.entities,
			parse_mode: "MarkdownV2",
		});
	});

	bot.hears(SMALL_GROUPS_BUTTON_LABELS.LMG_CAL_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await withLoading(ctx, () => fetchAllFutureEventsByTitle("лмг"), {
			text: "Получаю расписание ЛМГ…",
		});
		if (events.length === 0) return replyFormatted(ctx, CALENDAR_TEXTS.lmgNoneAll);
		await ctx.reply(events.map((e) => formatEvent(e, true)).join("\n\n"), { parse_mode: "MarkdownV2" });
	});

	// === Молитвенные собрания ===
	bot.hears(CALENDAR_BUTTON_LABELS.CAL_PRAYER, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("prayers");
		const text = fmt`${CALENDAR_TEXTS.prayersTitle}${COMMON.useButtonBelow}`;
		await replyFormatted(ctx, text, {
			reply_markup: replyCalendarPrayerMenu,
		});
	});

	bot.hears(CALENDAR_BUTTON_LABELS.CAL_PRAYER_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const ev = await withLoading(ctx, () => fetchNextEventByTitle("молитвенное собрание"), {
			text: "Ищу ближайшее молитвенное…",
		});
		if (!ev) return replyFormatted(ctx, CALENDAR_TEXTS.prayersNone);
		const text = fmt`${CALENDAR_TEXTS.prayersNext}

${formatEvent(ev)}`;
		await ctx.reply(text.text, {
			entities: text.entities,
			parse_mode: "MarkdownV2",
		});
	});

	bot.hears(CALENDAR_BUTTON_LABELS.CAL_PRAYER_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await withLoading(ctx, () => fetchAllFutureEventsByTitle("молитвенное собрание"), {
			text: "Получаю список молитвенных…",
		});
		if (events.length === 0) return replyFormatted(ctx, CALENDAR_TEXTS.prayersNoneAll);
		await ctx.reply(events.map((e) => formatEvent(e, true)).join("\n\n"), { parse_mode: "MarkdownV2" });
	});

	// === Членские собрания ===
	bot.hears(CALENDAR_BUTTON_LABELS.CAL_MEMBERS, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("members");
		const text = fmt`${CALENDAR_TEXTS.membersTitle}${COMMON.useButtonBelow}`;
		await replyFormatted(ctx, text, {
			reply_markup: replyCalendarMembersMenu,
		});
	});

	bot.hears(CALENDAR_BUTTON_LABELS.CAL_MEMBERS_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const ev = await withLoading(ctx, () => fetchNextEventByTitle("членское собрание"), {
			text: "Ищу ближайшее членское…",
		});
		if (!ev) return replyFormatted(ctx, CALENDAR_TEXTS.membersNone);
		const text = fmt`${CALENDAR_TEXTS.membersNext}

${formatEvent(ev)}`;
		await ctx.reply(text.text, {
			entities: text.entities,
			parse_mode: "MarkdownV2",
		});
	});

	bot.hears(CALENDAR_BUTTON_LABELS.CAL_MEMBERS_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await withLoading(ctx, () => fetchAllFutureEventsByTitle("членское собрание"), {
			text: "Получаю список членских…",
		});
		if (events.length === 0) return replyFormatted(ctx, CALENDAR_TEXTS.membersNoneAll);
		await ctx.reply(events.map((e) => formatEvent(e, true)).join("\n\n"), { parse_mode: "MarkdownV2" });
	});

	// === ЛМГ Выезд ===
	bot.hears(SMALL_GROUPS_BUTTON_LABELS.LMG_CAL_TRIP, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const year = new Date().getFullYear();
		const res = await withLoading(ctx, () => fetchHolidayEvent("Выезд ЛМГ"), {
			text: "🚌 Проверяю даты выезда ЛМГ…",
		});

		if (res.status === "not_found") {
			return ctx.reply(fmt`В ${year} году даты выезда ЛМГ пока не запланированы.`.text, {
				entities: fmt`В ${year} году даты выезда ЛМГ пока не запланированы.`.entities,
			});
		}
		if (res.status === "past" || res.status === "future") {
			return ctx.reply(formatEvent(res.event, false, true), { parse_mode: "MarkdownV2" });
		}
	});

	// === Большие праздники ===
	bot.hears(CALENDAR_BUTTON_LABELS.CAL_HOLIDAYS, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("holidays");
		const text = fmt`${CALENDAR_TEXTS.holidaysTitle}${COMMON.useButtonBelow}`;
		await replyFormatted(ctx, text, {
			reply_markup: replyCalendarHolidaysMenu,
		});
	});

	// 🎄 Рождественский выезд
	bot.hears(CALENDAR_BUTTON_LABELS.CAL_HOLIDAYS_RV, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const year = new Date().getFullYear();
		const res = await withLoading(ctx, () => fetchHolidayEvent("Рождественский выезд", { strictYear: true }), {
			text: "🎄 Уточняю даты Рождественского выезда…",
		});

		if (res.status === "not_found") {
			return replyFormatted(ctx, CALENDAR_TEXTS.rvNotPlanned(year));
		}
		if (res.status === "past" || res.status === "future") {
			return ctx.reply(formatEvent(res.event, false, true), { parse_mode: "MarkdownV2" });
		}
	});

	// 🐣 Пасха
	bot.hears(CALENDAR_BUTTON_LABELS.CAL_HOLIDAYS_EASTER, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const year = new Date().getFullYear();
		const res = await withLoading(ctx, () => fetchHolidayEvent("Пасха"), {
			text: "🐣 Уточняю даты Пасхи…",
		});

		if (res.status === "not_found") {
			return replyFormatted(ctx, CALENDAR_TEXTS.easterNotPlanned(year));
		}
		if (res.status === "past" || res.status === "future") {
			return ctx.reply(formatEvent(res.event, false, true), { parse_mode: "MarkdownV2" });
		}
	});

	// === Отцы и дети / Сёстры ===
	bot.hears(CALENDAR_BUTTON_LABELS.CAL_FAMILY, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("family");
		const text = fmt`${CALENDAR_TEXTS.familyTitle}${COMMON.useButtonBelow}`;
		await replyFormatted(ctx, text, {
			reply_markup: replyCalendarFamilyMenu,
		});
	});

	bot.hears(CALENDAR_BUTTON_LABELS.CAL_FAMILY_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const ev = await withLoading(ctx, () => fetchNextEventByTitle("отцы и дети"), {
			text: "Ищу ближайшую встречу «Отцы и дети»…",
		});
		if (!ev) return replyFormatted(ctx, CALENDAR_TEXTS.familyNone);
		const text = fmt`${CALENDAR_TEXTS.familyNext}

${formatEvent(ev)}`;
		await ctx.reply(text.text, {
			entities: text.entities,
			parse_mode: "MarkdownV2",
		});
	});

	bot.hears(CALENDAR_BUTTON_LABELS.CAL_FAMILY_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await withLoading(ctx, () => fetchAllFutureEventsByTitle("отцы и дети"), {
			text: "Получаю расписание «Отцы и дети»…",
		});
		if (events.length === 0) return replyFormatted(ctx, CALENDAR_TEXTS.familyNoneAll);
		await ctx.reply(events.map((e) => formatEvent(e, true)).join("\n\n"), { parse_mode: "MarkdownV2" });
	});

	bot.hears(CALENDAR_BUTTON_LABELS.CAL_SUBSCRIBE, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		await replyFormatted(ctx, CALENDAR_TEXTS.yourCalendarUsing, {
			reply_markup: subscribeKeyboard(),
		});
	});

	// Список инструкций
	bot.callbackQuery("calendar:instructions", async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		await ctx.answerCallbackQuery().catch(() => {});

		await replyFormatted(ctx, CALENDAR_TEXTS.yourCalendarUsing, {
			reply_markup: subscribeKeyboard(),
		});
	});

	// ---------- инструкции для подписки на календарь -------------

	bot.callbackQuery("calendar:sub:apple", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Apple", CALENDAR_TEXTS.subscribeInstructions.apple);
	});

	bot.callbackQuery("calendar:sub:google", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Google", CALENDAR_TEXTS.subscribeInstructions.google);
	});

	bot.callbackQuery("calendar:sub:yandex", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Яндекс", CALENDAR_TEXTS.subscribeInstructions.yandex);
	});

	bot.callbackQuery("calendar:sub:xiomi", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Xiaomi / MIUI", CALENDAR_TEXTS.subscribeInstructions.xiaomi);
	});

	bot.callbackQuery("calendar:sub:other", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Другие приложения", CALENDAR_TEXTS.subscribeInstructions.other);
	});

	// === Посмотреть все события ===
	bot.hears(CALENDAR_BUTTON_LABELS.CAL_EVENTS, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const keyboard = new InlineKeyboard()
			.text("📋 Посмотреть списком", "calendar:view:list")
			.row()
			.text("📅 Посмотреть в виде календаря", "calendar:view:calendar");

		await ctx.reply("Выберите способ просмотра всех событий:", {
			reply_markup: keyboard,
		});
	});

	// --- Обработка inline-кнопок ---
	// === Сформировать компактный PDF со списком событий ===
	bot.callbackQuery("calendar:view:list", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});

		// Показываем промежуточный ответ — чтобы пользователь видел, что идёт формирование
		const preparingMsg = await ctx.reply(
			"📄 Готовлю список всех событий… Их довольно много, поэтому прошу подождать — процесс займёт немного времени 🙂"
		);

		try {
			// Получаем события (вперед на 365 дней — можно изменить)
			const events: any[] = await withLoading(ctx, () => fetchUpcomingEvents(365), {
				text: "Получаю события календаря…",
			});

			if (!Array.isArray(events) || events.length === 0) {
				await ctx.reply("❌ Нет запланированных событий.");
				return;
			}

			// Для каждого события используем форматирование formatEvent(e, true)
			// ожидаем, что формат возвращает Markdown-подобный текст:
			// строка1 — заголовок, строка2 — дата/время, далее — адрес (мы пропускаем)
			const items = events.map((e: any) => {
				const formatted = String(formatEvent(e, true) ?? "");
				const lines = formatted
					.split("\n")
					.map((l) => l.trim())
					.filter(Boolean);
				const titleLine = lines[0] ?? e.summary ?? e.title ?? "Событие";
				const dateLine = lines[1] ?? "";
				// Удаляем начящиеся '# ' если есть
				const titleClean = titleLine.replace(/^#\s*/, "");
				return { dateLine, title: titleClean };
			});

			// Собираем HTML из items
			const html = buildHtmlForEvents("Церковный календарь — ближайшие события", items);

			// Рендерим HTML в PDF через puppeteer
			const browser = await puppeteer.launch({
				headless: true,
				executablePath: os.platform() === "linux" ? "/usr/bin/chromium-browser" : undefined,
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
			});
			const page = await browser.newPage();
			await page.setContent(html, { waitUntil: "networkidle0" });
			const pdfBuffer = await page.pdf({
				format: "A4",
				printBackground: true,
				margin: { top: "15mm", bottom: "15mm", left: "10mm", right: "10mm" },
			});
			await browser.close();

			// Отправляем PDF (используем конструктор InputFile — чтобы имя файла было в кириллице)
			const input = new InputFile(Buffer.from(pdfBuffer), "Церковный_календарь.pdf");
			await ctx.replyWithDocument(input, {
				caption: "🗓 Список ближайших событий",
			});
		} catch (err) {
			console.error("[calendar:view:list] error:", err);
			await safeReply(ctx, "⚠️ Не удалось сформировать PDF. Попробуйте позже.");
		} finally {
			// Убираем сообщение «формирую...»
			try {
				await ctx.api.deleteMessage(preparingMsg.chat.id, preparingMsg.message_id);
			} catch {
				// игнорируем
			}
		}
	});

	bot.callbackQuery("calendar:view:calendar", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		const calendarLink = fmt`📅 ${link("https://calendar.yandex.ru/embed/month?&layer_ids=30582246&tz_id=Europe/Moscow&layer_names=Церковь%20Святой%20Троицы")}Посмотреть календарь${link("https://calendar.yandex.ru/embed/month?&layer_ids=30582246&tz_id=Europe/Moscow&layer_names=Церковь%20Святой%20Троицы")}`;
		await replyFormatted(ctx, calendarLink, {
			link_preview_options: { is_disabled: true },
		});
	});
}
