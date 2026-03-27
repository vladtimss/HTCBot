/**
 * features/holy-trinity-church/members-meeting/members-meeting.feature.ts
 * -----------------------------------------------------------------------
 * Логика раздела "Членское собрание"
 */

import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../../../types/grammy-context";
import { replyFormatted } from "../../../utils/format-helpers";
import { requireChurchAccess } from "../../../utils/guards";
import { createDatabasePage } from "../../../services/buildin";
import { logger } from "../../../utils/logger";
import { NAVIGATION_LABELS } from "../../../constants/navigation";
import { CALENDAR_BUTTON_LABELS } from "../church-calendar/church-calendar.constants";
import {
	MEMBERS_MEETING_DATABASE_ID,
	MEMBERS_MEETING_BUTTON_LABELS,
	MEMBERS_MEETING_INLINE,
} from "./members-meeting.constants";
import { MEMBERS_MEETING_TEXTS } from "./members-meeting.texts";
import { replyMembersMeetingMenu } from "./members-meeting.keyboard";
import { buildDraftReviewPreviewHtml } from "../shared/draft-preview.util";

export async function renderMembersMeetingRoot(ctx: MyContext) {
	ctx.session.lastSection = "members-meeting";
	ctx.session.menuStack = ["holy-trinity-church", "members-meeting"];
	ctx.session.awaitingMembersQuestion = false;
	ctx.session.membersQuestionDraft = undefined;

	await replyFormatted(ctx, MEMBERS_MEETING_TEXTS.title, {
		reply_markup: replyMembersMeetingMenu,
	});
}

function buildAskerLabel(ctx: MyContext): string {
	const username = ctx.from?.username ? ctx.from.username : "user";
	const telegramId = ctx.from?.id ? String(ctx.from.id) : "unknown";
	return `${username}_${telegramId}`;
}

async function saveMembersQuestion(ctx: MyContext, question: string): Promise<void> {
	const askerLabel = buildAskerLabel(ctx);
	const title = askerLabel.slice(0, 180);
	await createDatabasePage(MEMBERS_MEETING_DATABASE_ID, {
		"От кого": {
			type: "title",
			title: [{ text: { content: title } }],
		},
		Вопрос: {
			type: "rich_text",
			rich_text: [{ text: { content: question } }],
		},
	});
}

function reviewQuestionKeyboard() {
	return new InlineKeyboard()
		.text("❌ Отменить", MEMBERS_MEETING_INLINE.MM_CANCEL)
		.text("✅ Отправить", MEMBERS_MEETING_INLINE.MM_SEND);
}

export function registerMembersMeeting(bot: Bot<MyContext>) {
	bot.hears(MEMBERS_MEETING_BUTTON_LABELS.MM_ROOT, async (ctx) => {
		if (!requireChurchAccess(ctx)) return;
		await renderMembersMeetingRoot(ctx);
	});

	bot.hears(MEMBERS_MEETING_BUTTON_LABELS.MM_ASK_QUESTION, async (ctx) => {
		if (!requireChurchAccess(ctx)) return;

		ctx.session.awaitingMembersQuestion = true;
		ctx.session.membersQuestionDraft = undefined;
		await ctx.reply(MEMBERS_MEETING_TEXTS.enterQuestionPrompt, {
			reply_markup: replyMembersMeetingMenu,
		});
	});

	bot.on("message:text", async (ctx, next) => {
		if (!ctx.session.awaitingMembersQuestion) return next();

		const text = ctx.message.text.trim();
		const isNavigationOrMenuButton =
			text === NAVIGATION_LABELS.NAV_BACK ||
			text === NAVIGATION_LABELS.NAV_MAIN ||
			text === MEMBERS_MEETING_BUTTON_LABELS.MM_ROOT ||
			text === MEMBERS_MEETING_BUTTON_LABELS.MM_ASK_QUESTION ||
			text === CALENDAR_BUTTON_LABELS.CAL_MEMBERS_NEXT ||
			text === CALENDAR_BUTTON_LABELS.CAL_MEMBERS_ALL;
		if (isNavigationOrMenuButton) {
			ctx.session.awaitingMembersQuestion = false;
			return next();
		}

		if (!text) {
			await ctx.reply(MEMBERS_MEETING_TEXTS.emptyQuestion);
			return;
		}

		ctx.session.awaitingMembersQuestion = false;
		ctx.session.membersQuestionDraft = text;
		const reviewHtml = buildDraftReviewPreviewHtml(text, {
			prompt: MEMBERS_MEETING_TEXTS.reviewQuestionPrompt,
			trimmedNote: MEMBERS_MEETING_TEXTS.reviewQuestionTrimmedNote,
		});
		try {
			await ctx.reply(reviewHtml, {
				parse_mode: "HTML",
				reply_markup: reviewQuestionKeyboard(),
			});
		} catch (err) {
			logger.warn({ err }, "[members-meeting] review preview fallback to plain text");
			const fallbackPreview =
				text.length > 1200
					? `${MEMBERS_MEETING_TEXTS.reviewQuestionPrompt}\n\n${text.slice(0, 1200)}...`
					: `${MEMBERS_MEETING_TEXTS.reviewQuestionPrompt}\n\n${text}`;
			await ctx.reply(fallbackPreview, {
				reply_markup: reviewQuestionKeyboard(),
			});
		}
	});

	bot.callbackQuery(MEMBERS_MEETING_INLINE.MM_CANCEL, async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		ctx.session.awaitingMembersQuestion = false;
		ctx.session.membersQuestionDraft = undefined;
		await ctx.reply(MEMBERS_MEETING_TEXTS.questionCanceled, {
			reply_markup: replyMembersMeetingMenu,
		});
	});

	bot.callbackQuery(MEMBERS_MEETING_INLINE.MM_SEND, async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		const draft = (ctx.session.membersQuestionDraft ?? "").trim();
		if (!draft) {
			await ctx.reply(MEMBERS_MEETING_TEXTS.noDraftQuestion, {
				reply_markup: replyMembersMeetingMenu,
			});
			return;
		}

		await ctx.reply(MEMBERS_MEETING_TEXTS.addingQuestion);
		try {
			await saveMembersQuestion(ctx, draft);
			ctx.session.membersQuestionDraft = undefined;
			await ctx.reply(MEMBERS_MEETING_TEXTS.questionAdded, {
				reply_markup: replyMembersMeetingMenu,
			});
		} catch (err) {
			logger.error({ err }, "[members-meeting] add question failed");
			await ctx.reply(MEMBERS_MEETING_TEXTS.addQuestionFailed, {
				reply_markup: replyMembersMeetingMenu,
			});
		}
	});
}
