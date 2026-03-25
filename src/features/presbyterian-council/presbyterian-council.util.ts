/**
 * features/presbyterian-council/presbyterian-council.util.ts
 * ----------------------------------------------------------
 * Утилиты для генерации PDF повестки пресвитерского совета
 */

import { existsSync, readFileSync } from "fs";
import { resolve }                  from "path";

type ColorToken = {
	bg: string;
	text: string;
	border: string;
};

export type AgendaPdfTopic = {
	name: string;
	color?: string;
};

export type AgendaPdfRow = {
	index: number;
	title: string;
	author: string;
	topics: AgendaPdfTopic[];
	timing: string;
};

const AUTHOR_COLOR_TOKENS: ColorToken[] = [
	{ bg: "rgba(96, 165, 250, 0.20)", text: "#0f4da8", border: "#93c5fd" },
	{ bg: "rgba(196, 181, 253, 0.24)", text: "#6d28d9", border: "#c4b5fd" },
	{ bg: "rgba(134, 239, 172, 0.24)", text: "#166534", border: "#86efac" },
	{ bg: "rgba(251, 191, 36, 0.18)", text: "#92400e", border: "#fcd34d" },
	{ bg: "rgba(251, 113, 133, 0.16)", text: "#be123c", border: "#fda4af" },
	{ bg: "rgba(125, 211, 252, 0.18)", text: "#075985", border: "#7dd3fc" },
	{ bg: "rgba(165, 180, 252, 0.20)", text: "#3730a3", border: "#a5b4fc" },
	{ bg: "rgba(244, 114, 182, 0.16)", text: "#9d174d", border: "#f9a8d4" },
];

const TEMPLATE_CANDIDATES = [
	resolve(process.cwd(), "src/features/presbyterian-council/layout/agenda-pdf.layout.html"),
	resolve(process.cwd(), "dist/features/presbyterian-council/layout/agenda-pdf.layout.html"),
];

function escapeHtml(s: string): string {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function hashString(s: string): number {
	let hash = 0;
	for (let i = 0; i < s.length; i += 1) {
		hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
	}
	return hash;
}

function loadAgendaTemplate(): string {
	for (const templatePath of TEMPLATE_CANDIDATES) {
		if (existsSync(templatePath)) {
			return readFileSync(templatePath, "utf8");
		}
	}

	throw new Error("Не найден HTML-шаблон повестки пресвитерского совета");
}

function replaceAll(source: string, placeholder: string, value: string): string {
	return source.split(placeholder).join(value);
}

function formatQuestionCount(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;

	if (mod10 === 1 && mod100 !== 11) {
		return `${count} вопрос`;
	}
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
		return `${count} вопроса`;
	}
	return `${count} вопросов`;
}

function pickAuthorColor(author: string): ColorToken {
	return AUTHOR_COLOR_TOKENS[hashString(author) % AUTHOR_COLOR_TOKENS.length];
}

function pickTopicColor(name: string, _buildinColor?: string): ColorToken {
	const hue = hashString(name) % 360;
	return {
		bg: `hsl(${hue} 88% 92%)`,
		text: `hsl(${hue} 62% 28%)`,
		border: `hsl(${hue} 72% 80%)`,
	};
}

function renderTopic(topic: AgendaPdfTopic): string {
	const token = pickTopicColor(topic.name, topic.color);
	return `<span class="badge" style="background:${token.bg};color:${token.text};border-color:${token.border};"><span class="badge-label">${escapeHtml(topic.name)}</span></span>`;
}

function renderAuthor(author: string): string {
	const token = pickAuthorColor(author);
	return `<span class="author-mark" style="--author-bg:${token.bg};--author-text:${token.text};">${escapeHtml(author)}</span>`;
}

function renderRow(row: AgendaPdfRow): string {
	return `
		<tr>
			<td class="index">${row.index}</td>
			<td><div class="question-title">${escapeHtml(row.title)}</div></td>
			<td class="author">${renderAuthor(row.author)}</td>
			<td>
				<div class="badge-list">${row.topics.map(renderTopic).join("") || '<span class="empty">-</span>'}</div>
			</td>
			<td class="timing">${escapeHtml(row.timing || "-")}</td>
		</tr>
	`;
}

export function buildAgendaPdfHtml(dateLabel: string, rows: AgendaPdfRow[]): string {
	let html = loadAgendaTemplate();
	html = replaceAll(html, "__DATE_LABEL__", escapeHtml(dateLabel));
	html = replaceAll(html, "__TOTAL_LABEL__", escapeHtml(formatQuestionCount(rows.length)));
	html = replaceAll(html, "__ROWS__", rows.map(renderRow).join("\n"));
	return html;
}
