/**
 * features/holy-trinity-church/prayer-meeting/prayer-meeting.feature.ts
 * ---------------------------------------------------------------------
 * Логика раздела "Молитвенное собрание"
 */

import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../../../types/grammy-context";
import { replyFormatted } from "../../../utils/format-helpers";
import { requireChurchAccess } from "../../../utils/guards";
import { createDatabasePage } from "../../../services/buildin";
import { logger } from "../../../utils/logger";
import { withLoading } from "../../../utils/loading";
import { NAVIGATION_LABELS } from "../../../constants/navigation";
import { CALENDAR_BUTTON_LABELS } from "../church-calendar/church-calendar.constants";
import {
	PRAYER_MEETING_BUTTON_LABELS,
	PRAYER_MEETING_INLINE,
	PRAYER_NEEDS_DATABASE_ID,
} from "./prayer-meeting.constants";
import { PRAYER_MEETING_TEXTS } from "./prayer-meeting.texts";
import { replyPrayerMeetingMenu } from "./prayer-meeting.keyboard";
import { buildDraftReviewPreviewHtml } from "../shared/draft-preview.util";

export async function renderPrayerMeetingRoot(ctx: MyContext) {
	ctx.session.lastSection = "prayer-meeting";
	ctx.session.menuStack = ["holy-trinity-church", "prayer-meeting"];
	ctx.session.awaitingPrayerNeed = false;
	ctx.session.prayerNeedDraft = undefined;

	await replyFormatted(ctx, PRAYER_MEETING_TEXTS.title, {
		reply_markup: replyPrayerMeetingMenu,
	});
}

function buildAskerLabel(ctx: MyContext): string {
	const username = ctx.from?.username ? ctx.from.username : "user";
	const telegramId = ctx.from?.id ? String(ctx.from.id) : "unknown";
	return `${username}_${telegramId}`;
}

async function savePrayerNeed(
	ctx: MyContext,
	needText: string,
	opts: { notPublic: boolean }
): Promise<void> {
	const askerLabel = buildAskerLabel(ctx).slice(0, 180);
	await createDatabasePage(PRAYER_NEEDS_DATABASE_ID, {
		"От кого": {
			type: "title",
			title: [{ text: { content: askerLabel } }],
		},
		"Молитвенная нужда": {
			type: "rich_text",
			rich_text: [{ text: { content: needText } }],
		},
		"Не для публичной молитвы": {
			type: "checkbox",
			checkbox: opts.notPublic,
		},
	});
}

function reviewNeedKeyboard() {
	return new InlineKeyboard()
		.text("❌ Отменить", PRAYER_MEETING_INLINE.PM_CANCEL)
		.text("✅ Отправить", PRAYER_MEETING_INLINE.PM_SEND);
}

function privacyKeyboard() {
	return new InlineKeyboard()
		.text("Это не для публичной молитвы.", PRAYER_MEETING_INLINE.PM_PRIVACY_NOT_PUBLIC)
		.row()
		.text("Да, хочу.", PRAYER_MEETING_INLINE.PM_PRIVACY_PUBLIC);
}

export function registerPrayerMeeting(bot: Bot<MyContext>) {
	bot.hears(PRAYER_MEETING_BUTTON_LABELS.PM_ROOT, async (ctx) => {
		if (!requireChurchAccess(ctx)) return;
		await renderPrayerMeetingRoot(ctx);
	});

	bot.hears(PRAYER_MEETING_BUTTON_LABELS.PM_SHARE_NEED, async (ctx) => {
		if (!requireChurchAccess(ctx)) return;

		ctx.session.awaitingPrayerNeed = true;
		ctx.session.prayerNeedDraft = undefined;
		await ctx.reply(PRAYER_MEETING_TEXTS.enterNeedPrompt, {
			reply_markup: replyPrayerMeetingMenu,
		});
	});

	bot.on("message:text", async (ctx, next) => {
		if (!ctx.session.awaitingPrayerNeed) return next();

		const text = ctx.message.text.trim();
		const isNavigationOrMenuButton =
			text === NAVIGATION_LABELS.NAV_BACK ||
			text === NAVIGATION_LABELS.NAV_MAIN ||
			text === PRAYER_MEETING_BUTTON_LABELS.PM_ROOT ||
			text === PRAYER_MEETING_BUTTON_LABELS.PM_SHARE_NEED ||
			text === CALENDAR_BUTTON_LABELS.CAL_PRAYER_NEXT ||
			text === CALENDAR_BUTTON_LABELS.CAL_PRAYER_ALL;
		if (isNavigationOrMenuButton) {
			ctx.session.awaitingPrayerNeed = false;
			return next();
		}

		if (!text) {
			await ctx.reply(PRAYER_MEETING_TEXTS.emptyNeed);
			return;
		}

		ctx.session.awaitingPrayerNeed = false;
		ctx.session.prayerNeedDraft = text;
		const reviewHtml = buildDraftReviewPreviewHtml(text, {
			prompt: PRAYER_MEETING_TEXTS.reviewNeedPrompt,
			trimmedNote: PRAYER_MEETING_TEXTS.reviewNeedTrimmedNote,
		});
		try {
			await ctx.reply(reviewHtml, {
				parse_mode: "HTML",
				reply_markup: reviewNeedKeyboard(),
			});
		} catch (err) {
			logger.warn({ err }, "[prayer-meeting] review preview fallback to plain text");
			const fallbackPreview =
				text.length > 1200
					? `${PRAYER_MEETING_TEXTS.reviewNeedPrompt}\n\n${text.slice(0, 1200)}...`
					: `${PRAYER_MEETING_TEXTS.reviewNeedPrompt}\n\n${text}`;
			await ctx.reply(fallbackPreview, {
				reply_markup: reviewNeedKeyboard(),
			});
		}
	});

	bot.callbackQuery(PRAYER_MEETING_INLINE.PM_CANCEL, async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		ctx.session.awaitingPrayerNeed = false;
		ctx.session.prayerNeedDraft = undefined;
		await ctx.reply(PRAYER_MEETING_TEXTS.needCanceled, {
			reply_markup: replyPrayerMeetingMenu,
		});
	});

	bot.callbackQuery(PRAYER_MEETING_INLINE.PM_SEND, async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		const draft = (ctx.session.prayerNeedDraft ?? "").trim();
		if (!draft) {
			await ctx.reply(PRAYER_MEETING_TEXTS.noDraftNeed, {
				reply_markup: replyPrayerMeetingMenu,
			});
			return;
		}

		await ctx.reply(PRAYER_MEETING_TEXTS.privacyQuestion, {
			reply_markup: privacyKeyboard(),
		});
	});

	async function finalizeSave(ctx: MyContext, opts: { notPublic: boolean }) {
		const draft = (ctx.session.prayerNeedDraft ?? "").trim();
		if (!draft) {
			await ctx.reply(PRAYER_MEETING_TEXTS.noDraftNeed, {
				reply_markup: replyPrayerMeetingMenu,
			});
			return;
		}

		try {
			await withLoading(ctx, () => savePrayerNeed(ctx, draft, opts), {
				text: PRAYER_MEETING_TEXTS.addingNeed,
				delayMs: 0,
			});
			ctx.session.prayerNeedDraft = undefined;
			await ctx.reply(PRAYER_MEETING_TEXTS.needAdded, {
				reply_markup: replyPrayerMeetingMenu,
			});
		} catch (err) {
			logger.error({ err }, "[prayer-meeting] add prayer need failed");
			await ctx.reply(PRAYER_MEETING_TEXTS.addNeedFailed, {
				reply_markup: replyPrayerMeetingMenu,
			});
		}
	}

	bot.callbackQuery(PRAYER_MEETING_INLINE.PM_PRIVACY_NOT_PUBLIC, async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await finalizeSave(ctx, { notPublic: true });
	});

	bot.callbackQuery(PRAYER_MEETING_INLINE.PM_PRIVACY_PUBLIC, async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await finalizeSave(ctx, { notPublic: false });
	});
}
