/**
 * helpers/buildin-helpers.ts
 * --------------------------
 * Универсальные функции для извлечения данных из свойств Buildin.ai
 * 
 * Эти функции обрабатывают различные типы полей Buildin и извлекают
 * из них значения, учитывая особенности API и возможные баги.
 */

import type {
	BuildinTitleProperty,
	BuildinRichTextProperty,
	BuildinSelectProperty,
	BuildinMultiSelectProperty,
	BuildinUrlProperty,
	BuildinDateProperty,
	BuildinTextContent,
} from "../types/buildin";

/**
 * Извлекает текст из свойства типа Title
 * 
 * @param property - свойство типа Title или undefined
 * @returns текст или undefined, если свойство отсутствует или пустое
 */
export function extractTitle(property: BuildinTitleProperty | undefined): string | undefined {
	if (!property?.title || property.title.length === 0) {
		return undefined;
	}

	const firstItem = property.title[0];
	return firstItem?.plain_text || firstItem?.text?.content;
}

/**
 * Извлекает текст из свойства типа Rich Text
 * 
 * @param property - свойство типа Rich Text или undefined
 * @returns текст или undefined, если свойство отсутствует или пустое
 */
export function extractRichText(property: BuildinRichTextProperty | undefined): string | undefined {
	if (!property?.rich_text || property.rich_text.length === 0) {
		return undefined;
	}

	const firstItem = property.rich_text[0];
	return firstItem?.plain_text || firstItem?.text?.content;
}

/**
 * Извлекает значение из свойства типа Select
 * 
 * @param property - свойство типа Select или undefined
 * @returns название выбранного значения или undefined
 */
export function extractSelect(property: BuildinSelectProperty | undefined): string | undefined {
	return property?.select?.name;
}

/**
 * Извлекает все значения из свойства типа Multi-select
 * 
 * @param property - свойство типа Multi-select или undefined
 * @returns массив названий выбранных значений
 */
export function extractMultiSelect(property: BuildinMultiSelectProperty | undefined): string[] {
	if (!property?.multi_select || property.multi_select.length === 0) {
		return [];
	}

	return property.multi_select.map((item) => item.name);
}

/**
 * Извлекает URL из свойства типа URL
 * 
 * @param property - свойство типа URL или undefined
 * @returns URL строка или undefined, если свойство отсутствует или пустое
 */
export function extractUrl(property: BuildinUrlProperty | undefined): string | undefined {
	return property?.url ?? undefined;
}

/**
 * Извлекает дату из свойства типа Date
 * 
 * @param property - свойство типа Date или undefined
 * @returns дата в формате строки (start) или undefined
 */
export function extractDate(property: BuildinDateProperty | undefined): string | undefined {
	return property?.date?.start;
}

