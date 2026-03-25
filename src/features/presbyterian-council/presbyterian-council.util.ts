/**
 * features/presbyterian-council/presbyterian-council.util.ts
 * ----------------------------------------------------------
 * Утилиты для генерации PDF повестки пресвитерского совета.
 */

import { existsSync, readFileSync } from "fs";
import { resolve }                  from "path";

type ColorToken = {
	bg: string;
	text: string;
	border: string;
};

/** Один тег темы, который выводим цветным бейджем. */
export type AgendaPdfTopic = {
	name: string;
	color?: string;
};

/** Статус вопроса для PDF-таблицы. */
export type AgendaPdfStatus = {
	name: string;
	color?: string;
};

/** Одна строка PDF-таблицы. */
export type AgendaPdfRow = {
	index: number;
	title: string;
	author: string;
	topics: AgendaPdfTopic[];
	status?: AgendaPdfStatus;
	timing: string;
};

/** Опции рендера PDF-таблицы. */
export type AgendaPdfBuildOptions = {
	showStatusColumn?: boolean;
};

/** Набор цветов для авторов. */
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

/** Цвета для типовых статусов Buildin. */
const STATUS_COLOR_TOKENS: Record<string, ColorToken> = {
	green: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
	red: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
	yellow: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
	orange: { bg: "#ffedd5", text: "#9a3412", border: "#fdba74" },
	blue: { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
	purple: { bg: "#ede9fe", text: "#6d28d9", border: "#c4b5fd" },
	pink: { bg: "#fce7f3", text: "#be185d", border: "#f9a8d4" },
	gray: { bg: "#e5e7eb", text: "#374151", border: "#cbd5e1" },
	default: { bg: "#e2e8f0", text: "#334155", border: "#cbd5e1" },
};

/** Возможные пути к HTML-шаблону PDF. */
const TEMPLATE_CANDIDATES = [
	resolve(process.cwd(), "src/features/presbyterian-council/layout/agenda-pdf.layout.html"),
	resolve(process.cwd(), "dist/features/presbyterian-council/layout/agenda-pdf.layout.html"),
];

/** Экранирует произвольный текст для безопасной вставки в HTML. */
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

/** Читает актуальный HTML-шаблон PDF из `src` или `dist`. */
function loadAgendaTemplate(): string {
	for (const templatePath of TEMPLATE_CANDIDATES) {
		if (existsSync(templatePath)) {
			return readFileSync(templatePath, "utf8");
		}
	}

	throw new Error("Не найден HTML-шаблон повестки пресвитерского совета");
}

/** Простейшая замена placeholder-ов внутри шаблона. */
function replaceAll(source: string, placeholder: string, value: string): string {
	return source.split(placeholder).join(value);
}

/** Склонение слова "вопрос" для шапки PDF. */
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

/** Подбирает цветовую метку автора по его имени. */
function pickAuthorColor(author: string): ColorToken {
	return AUTHOR_COLOR_TOKENS[hashString(author) % AUTHOR_COLOR_TOKENS.length];
}

/** Подбирает цвет для бейджа темы. */
function pickTopicColor(name: string, _buildinColor?: string): ColorToken {
	const hue = hashString(name) % 360;
	return {
		bg: `hsl(${hue} 88% 92%)`,
		text: `hsl(${hue} 62% 28%)`,
		border: `hsl(${hue} 72% 80%)`,
	};
}

/** Подбирает цветовую метку статуса. */
function pickStatusColor(name: string, buildinColor?: string): ColorToken {
	if (buildinColor && STATUS_COLOR_TOKENS[buildinColor]) {
		return STATUS_COLOR_TOKENS[buildinColor];
	}

	return STATUS_COLOR_TOKENS[hashString(name) % 2 === 0 ? "default" : "blue"];
}

/** Рендерит один бейдж темы. */
function renderTopic(topic: AgendaPdfTopic): string {
	const token = pickTopicColor(topic.name, topic.color);
	return `<span class="badge" style="background:${token.bg};color:${token.text};border-color:${token.border};"><span class="badge-label">${escapeHtml(topic.name)}</span></span>`;
}

/** Рендерит автора с фирменной подсветкой. */
function renderAuthor(author: string): string {
	const token = pickAuthorColor(author);
	return `<span class="author-mark" style="--author-bg:${token.bg};--author-text:${token.text};">${escapeHtml(author)}</span>`;
}

/** Рендерит бейдж статуса. */
function renderStatus(status: AgendaPdfStatus | undefined): string {
	if (!status?.name) {
		return '<span class="empty">-</span>';
	}

	const token = pickStatusColor(status.name, status.color);
	return `<span class="status-badge" style="background:${token.bg};color:${token.text};border-color:${token.border};">${escapeHtml(status.name)}</span>`;
}

/** Рендерит строку таблицы с учетом включенной/отключенной колонки статуса. */
function renderRow(row: AgendaPdfRow, options: AgendaPdfBuildOptions): string {
	const statusCell = options.showStatusColumn
		? `<td class="status">${renderStatus(row.status)}</td>`
		: "";

	return `
		<tr>
			<td class="index">${row.index}</td>
			<td><div class="question-title">${escapeHtml(row.title)}</div></td>
			<td class="author">${renderAuthor(row.author)}</td>
			<td>
				<div class="badge-list">${row.topics.map(renderTopic).join("") || '<span class="empty">-</span>'}</div>
			</td>
			${statusCell}
			<td class="timing">${escapeHtml(row.timing || "-")}</td>
		</tr>
	`;
}

/**
 * Собирает финальный HTML для PDF.
 * При необходимости может добавить колонку статуса.
 */
export function buildAgendaPdfHtml(
	dateLabel: string,
	rows: AgendaPdfRow[],
	options: AgendaPdfBuildOptions = {}
): string {
	const showStatusColumn = options.showStatusColumn ?? false;
	let html = loadAgendaTemplate();
	html = replaceAll(html, "__DATE_LABEL__", escapeHtml(dateLabel));
	html = replaceAll(html, "__TOTAL_LABEL__", escapeHtml(formatQuestionCount(rows.length)));
	html = replaceAll(html, "__STATUS_COL__", showStatusColumn ? '<col class="col-status" />' : "");
	html = replaceAll(html, "__STATUS_HEAD__", showStatusColumn ? "<th>Статус</th>" : "");
	html = replaceAll(html, "__ROWS__", rows.map((row) => renderRow(row, { showStatusColumn })).join("\n"));
	return html;
}
