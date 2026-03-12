// src/types/buildin.ts
// Типы для работы с Buildin.ai API

// ============================================================================
// Базовые типы свойств Buildin
// ============================================================================

/** Текст в формате rich text или title */
export type BuildinTextContent = {
	type: "text";
	plain_text?: string;
	text?: {
		content: string;
		link?: string | null;
	};
	href?: string | null;
	annotations?: {
		bold?: boolean;
		italic?: boolean;
		strikethrough?: boolean;
		underline?: boolean;
		code?: boolean;
		color?: string;
	};
};

/** Свойство типа Title */
export type BuildinTitleProperty = {
	id: string;
	type: "title";
	title: BuildinTextContent[];
};

/** Свойство типа Rich Text */
export type BuildinRichTextProperty = {
	id: string;
	type: "rich_text";
	rich_text: BuildinTextContent[];
};

/** Свойство типа URL */
export type BuildinUrlProperty = {
	id: string;
	type: "url";
	url: string | null;
};

/** Свойство типа Date */
export type BuildinDateProperty = {
	id: string;
	type: "date";
	date: {
		start: string;
		end: string | null;
		time_zone: string | null;
	} | null;
};

/** Свойство типа Number */
export type BuildinNumberProperty = {
	id: string;
	type: "number";
	number: number | null;
};

/** Элемент Select */
export type BuildinSelectOption = {
	id: string;
	name: string;
	color?: string;
};

/** Свойство типа Select */
export type BuildinSelectProperty = {
	id: string;
	type: "select";
	select: BuildinSelectOption | null;
};

/** Свойство типа Multi-select */
export type BuildinMultiSelectProperty = {
	id: string;
	type: "multi_select";
	multi_select: BuildinSelectOption[];
};

/** Свойство типа Relation */
export type BuildinRelationProperty = {
	id: string;
	type: "relation";
	relation: Array<{
		id: string;
	}>;
};

/** Свойство типа Checkbox */
export type BuildinCheckboxProperty = {
	id: string;
	type: "checkbox";
	checkbox: boolean;
};

/** Свойство типа Files */
export type BuildinFilesProperty = {
	id: string;
	type: "files";
	files: BuildinFile[];
};

/** Все возможные типы свойств Buildin */
export type BuildinProperty =
	| BuildinTitleProperty
	| BuildinRichTextProperty
	| BuildinUrlProperty
	| BuildinDateProperty
	| BuildinNumberProperty
	| BuildinSelectProperty
	| BuildinMultiSelectProperty
	| BuildinRelationProperty
	| BuildinCheckboxProperty
	| BuildinFilesProperty;

/** Родитель страницы/записи */
export type BuildinParent = {
	type: "database_id" | "page_id" | "workspace";
	database_id?: string;
	page_id?: string;
	workspace?: boolean;
};

// ============================================================================
// Типы для записей базы данных (Database Records)
// ============================================================================

/** Запись из базы данных (страница в базе) */
export type BuildinDatabaseRecord = {
	id: string;
	properties: Record<string, BuildinProperty>;
	created_time: string;
	last_edited_time: string;
	parent: {
		type: "database_id";
		database_id: string;
	};
	url: string;
	archived: boolean;
};

/** Ответ на запрос к базе данных */
export type BuildinDatabaseQueryResponse = {
	results: BuildinDatabaseRecord[];
	next_cursor?: string | null;
	has_more: boolean;
};

// ============================================================================
// Типы для страниц (Pages)
// ============================================================================

/** Страница в Buildin */
export type BuildinPage = {
	id: string;
	properties: Record<string, BuildinProperty>;
	created_time: string;
	last_edited_time: string;
	parent: BuildinParent;
	url: string;
	archived: boolean;
};

// ============================================================================
// Типы для фильтров и сортировки
// ============================================================================

/** Фильтр для запроса к базе данных */
export type BuildinFilter = {
	property?: string;
	select?: { equals?: string };
	date?: { equals?: string; after?: string; before?: string; on_or_after?: string; on_or_before?: string };
	title?: { contains?: string; equals?: string; starts_with?: string; ends_with?: string };
	rich_text?: { contains?: string };
	number?: { equals?: number; greater_than?: number; less_than?: number };
	checkbox?: { equals?: boolean };
	url?: { is_not_empty?: boolean };
	and?: BuildinFilter[];
	or?: BuildinFilter[];
};

/** Сортировка для запроса к базе данных */
export type BuildinSort = {
	property: string;
	direction: "ascending" | "descending";
};

/** Параметры запроса к базе данных */
export type BuildinDatabaseQueryOptions = {
	page_size?: number;
	start_cursor?: string | null;
	filter?: BuildinFilter;
	sorts?: BuildinSort[];
};

// ============================================================================
// Типы для конкретных сущностей проекта
// ============================================================================

/** Файл, прикреплённый в Buildin */
export type BuildinFile = {
	name?: string;
	file?: { url?: string; expiry_time?: string };
	external?: { url?: string };
};

/** Одна встреча ЛМГ */
export type Meeting = {
	date: string; // ISO-строка, например "2025-09-23"
	files: BuildinFile[];
	raw: BuildinDatabaseRecord; // Вся оригинальная страница
};

/** Конспект ЛМГ, нормализованный для работы бота */
export type LmgNote = {
	id: string;
	title: string;
	book?: string;
	chapter?: number;
	text?: string;
	groupGoal?: string;
	date?: string;
	file?: BuildinFile;
};

/** Медиа-платформы для проповедей */
export type SermonMedia = {
	yandex?: string;
	youtube?: string;
	vk?: string;
	podster_fm?: string;
};

/** Проповедь из базы данных */
export type Sermon = {
	id: string;
	title?: string;
	book?: string;
	chapter?: number;
	/** Начальный стих для сортировки (например, 1 из "18:1" или "18:1-5") */
	verse?: number;
	sermonText?: string;
	series?: string;
	/** ID проповедника (из relation), если доступен. Первый из relations. */
	preacherId?: string;
	/** Все relation IDs из поля "Проповедник" (для проверки всех вариантов) */
	preacherIds?: string[];
	preacher?: string;
	date?: string;
	media: SermonMedia;
};
