import { Bot, InlineKeyboard, InputFile } from "grammy";
import { MyContext } from "../types/grammy-context";
import {
	fetchUpcomingEvents,
	fetchNextEventByTitle,
	fetchAllFutureEventsByTitle,
	fetchHolidayEvent,
	formatEvent,
} from "../services/calendar";
import { MENU_LABELS } from "../constants/button-lables";
import { CALENDAR, COMMON } from "../services/texts";
import {
	replyCalendarMenu,
	replyCalendarLmgMenu,
	replyCalendarPrayerMenu,
	replyCalendarMembersMenu,
	replyCalendarHolidaysMenu,
	replyCalendarFamilyMenu,
	subscribeKeyboard,
} from "../utils/keyboards";
import { requirePrivileged } from "../utils/guards";
import { env } from "../config/env";
import { withLoading } from "../utils/loading";
import puppeteer from "puppeteer";
import os from "os";

// Удаляем markdown-знаки вроде * _ `
function stripMarkdown(s: string): string {
	return String(s ?? "")
		.replace(/[*_`~]/g, "")
		.trim();
}

// Экранируем текст для вставки в HTML
function escapeHtml(s: string): string {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// Собираем HTML — событие жирным, дата под ним
function buildHtmlForEvents(title: string, items: { dateLine: string; title: string }[]) {
	const rows = items
		.map(
			(it) => `
      <li>
        <div class="ttl">${escapeHtml(stripMarkdown(it.title))}</div>
        <div class="date">${escapeHtml(stripMarkdown(it.dateLine))}</div>
      </li>`
		)
		.join("\n");

	return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8"/>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color:#111; padding:30px; max-width:700px; margin:0 auto;
      }
      h1 {
        font-size:20px; margin-bottom:20px; text-align:center;
        border-bottom:1px solid #ddd; padding-bottom:10px;
      }
      ul { list-style:none; padding:0; margin:0; }
      li { margin:14px 0 20px 0; }
      .ttl { font-size:14px; font-weight:600; color:#000; margin-bottom:2px; }
      .date { font-size:12px; color:#666; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <ul>
      ${rows}
    </ul>
  </body>
</html>`;
}

/**
 * 📌 Отрисовка корня раздела «Церковный календарь»
 */
export async function renderCalendarRoot(ctx: MyContext) {
	ctx.session.lastSection = "calendar";
	ctx.session.menuStack = ["calendar"];

	await ctx.reply(`${CALENDAR.title}\n\n${COMMON.useButtonBelow}`, {
		reply_markup: replyCalendarMenu,
		parse_mode: "Markdown",
	});
}

/**
 * Отрисовка кнопок с выбором инструкций
 * @param ctx
 * @param title
 * @param body
 */
async function replyInstruction(ctx: MyContext, title: string, body: string) {
	if (!requirePrivileged(ctx)) return;

	await ctx.editMessageText(
		`*${title}*\n\n${body}\n\n*Ссылка для подписки:*\n\n\`${env.CALENDAR_SUBSCRIBE_URL}\`\n`,
		{
			parse_mode: "Markdown",
			reply_markup: new InlineKeyboard().text("⬅️ Назад", "calendar:instructions"),
			link_preview_options: { is_disabled: true },
		}
	);
}
/**
 * 📌 Регистрируем все обработчики для календаря
 */
export function registerChurchCalendar(bot: Bot<MyContext>) {
	// --- Корень календаря ---
	bot.hears(MENU_LABELS.CALENDAR, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		await renderCalendarRoot(ctx);
	});

	// --- Ближайшие события ---
	bot.hears(MENU_LABELS.CALENDAR_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await withLoading(ctx, () => fetchUpcomingEvents(5), {
			text: "⏳ Запрашиваю календарь…",
		});

		if (events.length === 0) {
			return ctx.reply(CALENDAR.noEvents);
		}
		await ctx.reply(CALENDAR.nextEventsTitle + "\n\n" + events.map((e) => formatEvent(e, true)).join("\n\n"), {
			parse_mode: "Markdown",
		});
	});

	// === ЛМГ ===
	bot.hears(MENU_LABELS.CALENDAR_LMG, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("lmg");
		await ctx.reply(`${CALENDAR.lmgTitle}\n\n${COMMON.useButtonBelow}`, {
			reply_markup: replyCalendarLmgMenu,
			parse_mode: "Markdown",
		});
	});

	bot.hears(MENU_LABELS.LMG_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const ev = await withLoading(ctx, () => fetchNextEventByTitle("лмг"), {
			text: "⏳ Ищу ближайшую встречу ЛМГ…",
		});
		if (!ev) return ctx.reply(CALENDAR.lmgNone);
		await ctx.reply(CALENDAR.lmgNext + "\n\n" + formatEvent(ev), { parse_mode: "Markdown" });
	});

	bot.hears(MENU_LABELS.LMG_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await withLoading(ctx, () => fetchAllFutureEventsByTitle("лмг"), {
			text: "⏳ Получаю расписание ЛМГ…",
		});
		if (events.length === 0) return ctx.reply(CALENDAR.lmgNoneAll);
		await ctx.reply(events.map((e) => formatEvent(e, true)).join("\n\n"), { parse_mode: "Markdown" });
	});

	// === Молитвенные собрания ===
	bot.hears(MENU_LABELS.CALENDAR_PRAYER, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("prayers");
		await ctx.reply(`${CALENDAR.prayersTitle}\n\n${COMMON.useButtonBelow}`, {
			reply_markup: replyCalendarPrayerMenu,
			parse_mode: "Markdown",
		});
	});

	bot.hears(MENU_LABELS.PRAYER_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const ev = await withLoading(ctx, () => fetchNextEventByTitle("молитвенное собрание"), {
			text: "⏳ Ищу ближайшее молитвенное…",
		});
		if (!ev) return ctx.reply(CALENDAR.prayersNone);
		await ctx.reply(CALENDAR.prayersNext + "\n\n" + formatEvent(ev), {
			parse_mode: "Markdown",
		});
	});

	bot.hears(MENU_LABELS.PRAYER_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await withLoading(ctx, () => fetchAllFutureEventsByTitle("молитвенное собрание"), {
			text: "⏳ Получаю список молитвенных…",
		});
		if (events.length === 0) return ctx.reply(CALENDAR.prayersNoneAll);
		await ctx.reply(events.map((e) => formatEvent(e, true)).join("\n\n"), { parse_mode: "Markdown" });
	});

	// === Членские собрания ===
	bot.hears(MENU_LABELS.CALENDAR_MEMBERS, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("members");
		await ctx.reply(`${CALENDAR.membersTitle}\n\n${COMMON.useButtonBelow}`, {
			reply_markup: replyCalendarMembersMenu,
			parse_mode: "Markdown",
		});
	});

	bot.hears(MENU_LABELS.MEMBERS_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const ev = await withLoading(ctx, () => fetchNextEventByTitle("членское собрание"), {
			text: "⏳ Ищу ближайшее членское…",
		});
		if (!ev) return ctx.reply(CALENDAR.membersNone);
		await ctx.reply(CALENDAR.membersNext + "\n\n" + formatEvent(ev), {
			parse_mode: "Markdown",
		});
	});

	bot.hears(MENU_LABELS.MEMBERS_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await withLoading(ctx, () => fetchAllFutureEventsByTitle("членское собрание"), {
			text: "⏳ Получаю список членских…",
		});
		if (events.length === 0) return ctx.reply(CALENDAR.membersNoneAll);
		await ctx.reply(events.map((e) => formatEvent(e, true)).join("\n\n"), { parse_mode: "Markdown" });
	});

	// === ЛМГ Выезд ===
	bot.hears(MENU_LABELS.LMG_TRIP, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const year = new Date().getFullYear();
		const res = await withLoading(ctx, () => fetchHolidayEvent("Выезд ЛМГ"), {
			text: "🚌 Проверяю даты выезда ЛМГ…",
		});

		if (res.status === "not_found") {
			return ctx.reply(`В ${year} году даты выезда ЛМГ пока не запланированы.`, { parse_mode: "Markdown" });
		}
		if (res.status === "past") {
			return ctx.reply(formatEvent(res.event, false, true), { parse_mode: "Markdown" });
		}
		if (res.status === "future") {
			return ctx.reply(formatEvent(res.event, false, true), { parse_mode: "Markdown" });
		}
	});

	// === Большие праздники ===
	bot.hears(MENU_LABELS.CALENDAR_HOLIDAYS, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("holidays");
		await ctx.reply(`${CALENDAR.holidaysTitle}\n\n${COMMON.useButtonBelow}`, {
			reply_markup: replyCalendarHolidaysMenu,
			parse_mode: "Markdown",
		});
	});

	// 🎄 Рождественский выезд
	bot.hears(MENU_LABELS.HOLIDAY_RV, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const year = new Date().getFullYear();
		const res = await withLoading(ctx, () => fetchHolidayEvent("Рождественский выезд", { strictYear: true }), {
			text: "🎄 Уточняю даты Рождественского выезда…",
		});

		if (res.status === "not_found") {
			return ctx.reply(CALENDAR.rvNotPlanned(year));
		}
		if (res.status === "past") {
			return ctx.reply(formatEvent(res.event, false, true), { parse_mode: "Markdown" });
		}
		if (res.status === "future") {
			return ctx.reply(formatEvent(res.event, false, true), { parse_mode: "Markdown" });
		}
	});

	// 🐣 Пасха
	bot.hears(MENU_LABELS.HOLIDAY_EASTER, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const year = new Date().getFullYear();
		const res = await withLoading(ctx, () => fetchHolidayEvent("Пасха"), {
			text: "🐣 Сверяю даты Пасхи…",
		});

		if (res.status === "not_found") {
			return ctx.reply(CALENDAR.easterNotPlanned(year));
		}
		if (res.status === "past") {
			return ctx.reply(formatEvent(res.event, false, true), { parse_mode: "Markdown" });
		}
		if (res.status === "future") {
			return ctx.reply(formatEvent(res.event, false, true), { parse_mode: "Markdown" });
		}
	});

	// === Отцы и дети / Сёстры ===
	bot.hears(MENU_LABELS.CALENDAR_FAMILY, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		ctx.session.menuStack.push("family");
		await ctx.reply(`${CALENDAR.familyTitle}\n\n${COMMON.useButtonBelow}`, {
			reply_markup: replyCalendarFamilyMenu,
			parse_mode: "Markdown",
		});
	});

	bot.hears(MENU_LABELS.FAMILY_NEXT, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const ev = await withLoading(ctx, () => fetchNextEventByTitle("отцы и дети"), {
			text: "⏳ Ищу ближайшую встречу «Отцы и дети»…",
		});
		if (!ev) return ctx.reply(CALENDAR.familyNone);
		await ctx.reply(CALENDAR.familyNext + "\n\n" + formatEvent(ev), { parse_mode: "Markdown" });
	});

	bot.hears(MENU_LABELS.FAMILY_ALL, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		const events = await withLoading(ctx, () => fetchAllFutureEventsByTitle("отцы и дети"), {
			text: "⏳ Получаю расписание «Отцы и дети»…",
		});
		if (events.length === 0) return ctx.reply(CALENDAR.familyNoneAll);
		await ctx.reply(events.map((e) => formatEvent(e, true)).join("\n\n"), { parse_mode: "Markdown" });
	});

	bot.hears(MENU_LABELS.CALENDAR_SUBSCRIBE, async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		await ctx.reply(CALENDAR.yourCalendarUsing, {
			parse_mode: "Markdown",
			reply_markup: subscribeKeyboard(),
		});
	});

	// Список инстуркций
	bot.callbackQuery("calendar:instructions", async (ctx) => {
		if (!requirePrivileged(ctx)) return;

		await ctx.answerCallbackQuery().catch(() => {});

		await ctx.reply(CALENDAR.yourCalendarUsing, {
			parse_mode: "Markdown",
			reply_markup: subscribeKeyboard(),
		});
	});

	// ---------- инструкции для подписки на календарь -------------

	bot.callbackQuery("calendar:sub:apple", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Apple", CALENDAR.subscribeInstructions.apple);
	});

	bot.callbackQuery("calendar:sub:google", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Google", CALENDAR.subscribeInstructions.google);
	});

	bot.callbackQuery("calendar:sub:yandex", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Яндекс", CALENDAR.subscribeInstructions.yandex);
	});

	bot.callbackQuery("calendar:sub:xiomi", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Xiaomi / MIUI", CALENDAR.subscribeInstructions.xiaomi);
	});

	bot.callbackQuery("calendar:sub:other", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await replyInstruction(ctx, "Подписка — Другие приложения", CALENDAR.subscribeInstructions.other);
	});

	// === Посмотреть все события ===
	bot.hears("🗓️ Посмотреть все события", async (ctx) => {
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
	// === Сформировать компактный PDF со списком событий (без адресов) ===
	bot.callbackQuery("calendar:view:list", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});

		// Показываем промежуточный ответ — чтобы пользователь видел, что идёт формирование
		const preparingMsg = await ctx.reply(
			"📄 Готовлю список всех событий… Их довольно много, поэтому прошу подождать — процесс займёт немного времени 🙂"
		);

		try {
			// Получаем события (вперед на 365 дней — можно изменить)
			const events: any[] = await withLoading(ctx, () => fetchUpcomingEvents(365), {
				text: "⏳ Получаю события календаря…",
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
				caption: "🗓 Список ближайших событий (без адресов)",
			});
		} catch (err) {
			console.error("[calendar:view:list] error:", err);
			await ctx.reply("⚠️ Не удалось сформировать PDF. Попробуйте позже.");
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
		await ctx.reply(
			"📅 [Посмотреть календарь](https://calendar.yandex.ru/embed/month?&layer_ids=30582246&tz_id=Europe/Moscow&layer_names=Церковь%20Святой%20Троицы)",
			{
				parse_mode: "Markdown",
				link_preview_options: { is_disabled: true },
			}
		);
	});
}
