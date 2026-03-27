/**
 * features/htc-wiki/children-catechism/children-catechism.keyboard.ts
 * --------------------------
 * Клавиатуры подфичи "Детский катехизис"
 */

import { InlineKeyboard, Keyboard } from "grammy";
import { NAVIGATION_LABELS } from "../../../constants/navigation";
import { CHILDREN_CATECHISM_BUTTON_LABELS } from "./children-catechism.constants";

export const replyChildrenCatechismMenu = new Keyboard()
	.text(CHILDREN_CATECHISM_BUTTON_LABELS.TOC)
	.row()
	.text(NAVIGATION_LABELS.NAV_BACK)
	.resized();

export function inlineChildrenCatechismTopics(topics: { id: string; title: string }[]) {
	const kb = new InlineKeyboard();
	for (const t of topics) kb.text(t.title, `catechism:t:${t.id}`).row();
	kb.text("⬅️ Назад", "catechism:root");
	return kb;
}

export function inlineChildrenCatechismQuestions(questions: { id: string; title: string }[]) {
	const kb = new InlineKeyboard();
	for (const q of questions) kb.text(q.title, `catechism:q:${q.id}`).row();
	kb.text("⬅️ Назад", "catechism:toc");
	return kb;
}

export function inlineBackToCatechismQuestions(topicKey: string) {
	return new InlineKeyboard().text("⬅️ Назад", `catechism:t:${topicKey}`);
}

