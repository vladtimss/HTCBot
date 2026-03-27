/**
 * features/holy-trinity-church/shared/draft-preview.util.ts
 * ---------------------------------------------------------
 * Общие утилиты для превью длинных пользовательских текстов перед отправкой.
 */

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function quoteAsHtml(text: string): string {
	return `<blockquote>${escapeHtml(text)}</blockquote>`;
}

export function buildDraftReviewPreviewHtml(
	text: string,
	options: { prompt: string; trimmedNote: string; previewLimit?: number }
): string {
	const limit = options.previewLimit ?? 2500;
	const needsTrim = text.length > limit;
	const preview = needsTrim ? `${text.slice(0, limit)}...` : text;
	const note = needsTrim ? `${options.trimmedNote}\n\n` : "";
	return `${options.prompt}\n\n${note}${quoteAsHtml(preview)}`;
}
