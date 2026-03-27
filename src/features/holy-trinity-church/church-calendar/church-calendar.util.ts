/**
 * features/holy-trinity-church/church-calendar/church-calendar.util.ts
 * --------------------------
 * Утилиты для генерации PDF из событий календаря
 */

/**
 * Удаляем markdown-знаки вроде * _ `
 */
export function stripMarkdown(s: string): string {
	return String(s ?? "")
		.replace(/[*_`~]/g, "")
		.trim();
}

/**
 * Экранируем текст для вставки в HTML
 */
export function escapeHtml(s: string): string {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Собираем HTML — событие жирным, дата под ним
 */
export function buildHtmlForEvents(title: string, items: { dateLine: string; title: string }[]) {
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
