/**
 * features/htc-wiki/children-catechism/children-catechism.feature.ts
 * --------------------------
 * Подфича "Детский катехизис"
 */

import { Bot } from "grammy";
import { fmt, bold, italic, blockquote } from "@grammyjs/parse-mode";
import catechism from "../../../data/children-catechism.json";
import { COMMON } from "../../../services/texts";
import { replyFormatted } from "../../../utils/format-helpers";
import { MyContext } from "../../../types/grammy-context";
import { CHILDREN_CATECHISM_BUTTON_LABELS } from "./children-catechism.constants";
import {
	inlineChildrenCatechismQuestions,
	inlineChildrenCatechismTopics,
	replyChildrenCatechismMenu,
} from "./children-catechism.keyboard";

type CatechismTopic = {
	title: string;
	items: { number: number; q: string; a: string | null; sources: string[] }[];
};

function buildIndex(topics: CatechismTopic[]) {
	const topicByKey = new Map<string, { idx: number; topic: CatechismTopic }>();
	const qIndex = new Map<string, { topicKey: string; item: CatechismTopic["items"][number] }>();

	topics.forEach((topic, idx) => {
		const topicKey = `t${idx}`;
		topicByKey.set(topicKey, { idx, topic });
		for (const item of topic.items) qIndex.set(`${topicKey}_${item.number}`, { topicKey, item });
	});

	return { topicByKey, qIndex };
}

const topics = (catechism as { topics: CatechismTopic[] }).topics ?? [];
const { topicByKey, qIndex } = buildIndex(topics);

export async function renderChildrenCatechismRoot(ctx: MyContext) {
	ctx.session.menuStack = ["htc-wiki", "children-catechism"];
	ctx.session.lastSection = "children-catechism";

	const text = fmt`${bold()}Детский катехизис${bold()}${COMMON.useButtonBelow}`;
	await replyFormatted(ctx, text, { reply_markup: replyChildrenCatechismMenu });
}

async function renderTopicsInline(ctx: MyContext) {
	const list = topics.map((t, idx) => ({ id: `t${idx}`, title: t.title }));
	const text = fmt`${bold()}Выберите тему${bold()}`;
	await replyFormatted(ctx, text, { reply_markup: inlineChildrenCatechismTopics(list) });
}

async function renderQuestionsInline(ctx: MyContext, topicKey: string) {
	const hit = topicByKey.get(topicKey);
	if (!hit) return renderTopicsInline(ctx);

	const list = hit.topic.items.map((it) => ({
		id: `${topicKey}_${it.number}`,
		title: `${it.number}. ${it.q}`,
	}));

	const text = fmt`${bold()}${hit.topic.title}${bold()}\n\nВыберите вопрос:`;
	await replyFormatted(ctx, text, { reply_markup: inlineChildrenCatechismQuestions(list) });
}

async function renderAnswer(ctx: MyContext, qId: string) {
	const hit = qIndex.get(qId);
	if (!hit) return;

	const { item } = hit;
	const sources = (item.sources ?? []).filter(Boolean);
	const srcLines = sources.reduce((acc, s) => fmt`${acc}\n${blockquote}${s}${blockquote}`, fmt``);
	const srcBlock = sources.length ? fmt`\n\n${bold()}Источник:${bold()}${srcLines}` : fmt``;

	const text = fmt`${bold()}Вопрос:${bold()} ${bold()}${item.number}. ${item.q}${bold()}

${bold()}Ответ:${bold()}
${italic()}${item.a ?? ""}${italic()}${srcBlock}`;

	await replyFormatted(ctx, text, {
		reply_markup: inlineChildrenCatechismQuestions(
			(topicByKey.get(hit.topicKey)?.topic.items ?? []).map((it) => ({
				id: `${hit.topicKey}_${it.number}`,
				title: `${it.number}. ${it.q}`,
			}))
		),
	});
}

export function registerChildrenCatechism(bot: Bot<MyContext>) {
	bot.hears(CHILDREN_CATECHISM_BUTTON_LABELS.TOC, async (ctx) => {
		await renderTopicsInline(ctx);
	});

	bot.callbackQuery("catechism:root", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await renderChildrenCatechismRoot(ctx);
	});

	bot.callbackQuery("catechism:toc", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await renderTopicsInline(ctx);
	});

	bot.callbackQuery(/^catechism:t:(t\d+)$/, async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await renderQuestionsInline(ctx, ctx.match[1]);
	});

	bot.callbackQuery(/^catechism:q:(.+)$/, async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await renderAnswer(ctx, ctx.match[1]);
	});

	// Совместимость со старым форматом callback_data (если где-то закешировано сообщение)
	bot.callbackQuery(/^catechism:topic:/, async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await renderTopicsInline(ctx);
	});
}

