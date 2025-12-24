# Buildin.ai API - Практический гайд

Практические примеры работы с Buildin.ai API в проекте HTCBot.

---

## 🔍 Как узнать ID базы данных, страницы или блока

### ID базы данных (Database ID)

**Способ 1: Из URL страницы базы данных**

1. Откройте базу данных в Buildin.ai
2. Посмотрите на URL в браузере:
   ```
   https://buildin.ai/workspace/e20b989f-2439-46d1-90a3-d92471d6bb79
   ```
   ID базы данных — это последняя часть URL: `e20b989f-2439-46d1-90a3-d92471d6bb79`

**Способ 2: Из URL конкретной страницы в базе**

Если открыта страница внутри базы:
```
https://buildin.ai/workspace/e20b989f-2439-46d1-90a3-d92471d6bb79#e33a3fd7-4dfc-4f0a-8a0b-390493b56d33
```

- До `#` — ID базы: `e20b989f-2439-46d1-90a3-d92471d6bb79`
- После `#` — ID страницы: `e33a3fd7-4dfc-4f0a-8a0b-390493b56d33`

**Способ 3: Через API (если знаете название)**

```typescript
// Получить информацию о странице, чтобы узнать database_id
const page = await apiFetch(`/pages/${pageId}`);
const databaseId = page.parent.database_id;
```

### ID страницы (Page ID)

Из URL (см. выше) или из ответа API:

```typescript
const result = await queryDatabase(databaseId);
const pageId = result.results[0].id; // ID первой страницы
```

### ID блока (Block ID)

Блоки получаются через API страницы:

```typescript
const blocks = await apiFetch(`/pages/${pageId}/blocks`);
const blockId = blocks.results[0].id; // ID первого блока
```

---

## 📝 Как создать базу данных в Buildin и использовать в коде

### Шаг 1: Создание базы данных

1. Откройте Buildin.ai
2. Создайте новую базу данных (Database) вручную через интерфейс
3. Добавьте нужные колонки (свойства):
   - Текст
   - Дата
   - Файлы
   - Select (выпадающий список)
   - И т.д.

### Шаг 2: Получение ID базы данных

См. раздел "Как узнать ID базы данных" выше.

### Шаг 3: Использование в коде

```typescript
// src/features/my-feature/my-feature.feature.ts

import { queryDatabase } from "../../services/buildin";

// Сохраните ID базы как константу
const MY_DATABASE_ID = "e20b989f-2439-46d1-90a3-d92471d6bb79";

// Используйте в коде
const result = await queryDatabase(MY_DATABASE_ID, {
  page_size: 100
});
```

**Пример из проекта:**

```typescript
// src/features/lmg-notes/lmg-notes.feature.ts

const LMG_NOTES_DATABASE_ID = "d8ddec27-c395-4c7c-a229-850d579ef7b3";

const result = await queryDatabase(LMG_NOTES_DATABASE_ID, { 
  page_size: 100 
});
```

---

## 🔎 Как парсить поля из базы данных

### Базовый пример

```typescript
import { queryDatabase } from "../../services/buildin";

const result = await queryDatabase(databaseId, { page_size: 100 });

// Каждая запись в result.results — это страница (Page)
result.results.forEach((page: any) => {
  // Все свойства находятся в page.properties
  const title = page.properties["Название"]?.title?.[0]?.plain_text;
  const date = page.properties["Дата"]?.date?.start;
  const files = page.properties["Файлы"]?.files ?? [];
  const select = page.properties["Статус"]?.select?.name;
  
  console.log({ title, date, files, select });
});
```

### Реальный пример из проекта

```typescript
// src/features/lmg-notes/lmg-notes.feature.ts

const meetings: Meeting[] = (result.results ?? []).flatMap((page: any): Meeting[] => {
  // Парсим дату
  const rawDate = page.properties?.["Дата встречи"]?.date?.start ?? null;
  if (!rawDate) return [];
  
  // Парсим файлы
  const files: BuildinFile[] = page.properties?.["Конспект"]?.files ?? [];
  
  return [{
    date: normalizeDate(rawDate),
    files,
    raw: page // Сохраняем всю страницу для дальнейшего парсинга
  }];
});
```

### Типы свойств и как их парсить

#### Title (Заголовок)

```typescript
const title = page.properties["Название"]?.title?.[0]?.plain_text ?? "";
```

#### Rich Text (Текст)

```typescript
const text = page.properties["Описание"]?.rich_text?.[0]?.plain_text ?? "";
// Или весь массив для форматированного текста
const richTextArray = page.properties["Описание"]?.rich_text ?? [];
```

#### Date (Дата)

```typescript
const dateStart = page.properties["Дата"]?.date?.start; // "2025-01-15"
const dateEnd = page.properties["Дата"]?.date?.end;     // опционально
```

#### Files (Файлы)

```typescript
const files = page.properties["Файлы"]?.files ?? [];
files.forEach((file: BuildinFile) => {
  const url = file.file?.url ?? file.external?.url;
  const name = file.name;
});
```

#### Select (Выбор одного значения)

```typescript
const status = page.properties["Статус"]?.select?.name ?? null;
const statusId = page.properties["Статус"]?.select?.id;
```

#### Multi-select (Множественный выбор)

```typescript
const tags = page.properties["Теги"]?.multi_select ?? [];
tags.forEach((tag: any) => {
  console.log(tag.name, tag.id);
});
```

#### Number (Число)

```typescript
const number = page.properties["Количество"]?.number ?? 0;
```

#### Checkbox (Чекбокс)

```typescript
const isPublished = page.properties["Опубликовано"]?.checkbox ?? false;
```

#### Relation (Связь с другой базой)

```typescript
const relations = page.properties["Связанные записи"]?.relation ?? [];
relations.forEach((relation: any) => {
  const relatedPageId = relation.id;
});
```

---

## 🔍 Как искать через код в Buildin

### Поиск через Database Query (фильтрация)

```typescript
import { queryDatabase } from "../../services/buildin";

// Поиск по точному совпадению Select
const result = await queryDatabase(databaseId, {
  filter: {
    property: "Статус",
    select: { equals: "Опубликовано" }
  }
});

// Поиск по дате
const result = await queryDatabase(databaseId, {
  filter: {
    property: "Дата",
    date: { 
      equals: "2025-01-15" 
      // или: after, before, on_or_after, on_or_before
    }
  }
});

// Поиск по тексту (содержит)
const result = await queryDatabase(databaseId, {
  filter: {
    property: "Название",
    title: { contains: "проповедь" }
  }
});

// Комбинированные фильтры (AND)
const result = await queryDatabase(databaseId, {
  filter: {
    and: [
      { property: "Статус", select: { equals: "Опубликовано" } },
      { property: "Дата", date: { after: "2025-01-01" } }
    ]
  }
});

// Сортировка
const result = await queryDatabase(databaseId, {
  sorts: [
    { property: "Дата", direction: "descending" }
  ]
});
```

### Поиск через Search API

```typescript
import { apiFetch } from "../../services/buildin";

// Полнотекстовый поиск по всем страницам
const searchResult = await apiFetch("/search", {
  method: "POST",
  body: {
    query: "проповедь",
    filter: {
      value: "page",
      property: "object"
    }
  }
});
```

См. подробнее в [Search API](./search.md).

---

## 📄 Как парсить и смотреть внутрь отдельной страницы

### Получение страницы по ID

```typescript
import { apiFetch } from "../../services/buildin";

const pageId = "e33a3fd7-4dfc-4f0a-8a0b-390493b56d33";
const page = await apiFetch(`/pages/${pageId}`);
```

### Парсинг свойств страницы

```typescript
// Все свойства
console.log(page.properties);

// Конкретное свойство
const title = page.properties["Название"]?.title?.[0]?.plain_text;
const date = page.properties["Дата"]?.date?.start;

// Вся страница для отладки
console.log(JSON.stringify(page, null, 2));
```

### Получение блоков страницы (контент)

```typescript
// Получить все блоки страницы
const blocks = await apiFetch(`/pages/${pageId}/blocks`);

blocks.results.forEach((block: any) => {
  console.log("Block type:", block.type);
  
  // Парсинг в зависимости от типа блока
  switch (block.type) {
    case "paragraph":
      const text = block.paragraph.rich_text?.[0]?.plain_text;
      break;
    case "heading_1":
      const heading = block.heading_1.rich_text?.[0]?.plain_text;
      break;
    case "image":
      const imageUrl = block.image.file?.url ?? block.image.external?.url;
      break;
    // и т.д.
  }
});
```

### Рекурсивное получение дочерних блоков

```typescript
async function getAllBlocks(pageId: string): Promise<any[]> {
  const allBlocks: any[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await apiFetch(`/pages/${pageId}/blocks`, {
      method: "GET",
      // Если API поддерживает пагинацию через query params
    });

    allBlocks.push(...response.results);
    hasMore = response.has_more ?? false;
    cursor = response.next_cursor;
    
    // Если нужна пагинация, добавьте start_cursor в следующий запрос
  }

  return allBlocks;
}
```

См. подробнее в [Page API](./page.md) и [Block API](./block.md).

---

## ✏️ Как обновлять и добавлять записи

### Добавление новой страницы в базу данных

```typescript
import { apiFetch } from "../../services/buildin";

const newPage = await apiFetch(`/pages`, {
  method: "POST",
  body: {
    parent: {
      database_id: databaseId
    },
    properties: {
      "Название": {
        title: [
          { text: { content: "Новая проповедь" } }
        ]
      },
      "Дата": {
        date: { start: "2025-01-15" }
      },
      "Статус": {
        select: { name: "Черновик" }
      }
    }
  }
});
```

### Обновление существующей страницы

```typescript
const pageId = "e33a3fd7-4dfc-4f0a-8a0b-390493b56d33";

const updatedPage = await apiFetch(`/pages/${pageId}`, {
  method: "PATCH",
  body: {
    properties: {
      "Статус": {
        select: { name: "Опубликовано" }
      },
      "Дата": {
        date: { start: "2025-01-20" }
      }
    }
  }
});
```

### Добавление блоков к странице

```typescript
const pageId = "e33a3fd7-4dfc-4f0a-8a0b-390493b56d33";

// Добавить параграф
await apiFetch(`/blocks/${pageId}/children`, {
  method: "PATCH",
  body: {
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Текст параграфа" }
            }
          ]
        }
      }
    ]
  }
});
```

---

## 🛠️ Работа с разными типами свойств

### Создание/обновление Title

```typescript
properties: {
  "Название": {
    title: [
      { text: { content: "Текст заголовка" } }
    ]
  }
}
```

### Создание/обновление Rich Text

```typescript
properties: {
  "Описание": {
    rich_text: [
      { text: { content: "Текст описания" } }
    ]
  }
}
```

### Создание/обновление Date

```typescript
properties: {
  "Дата": {
    date: { 
      start: "2025-01-15",
      end: "2025-01-20" // опционально
    }
  }
}
```

### Создание/обновление Select

```typescript
properties: {
  "Статус": {
    select: { name: "Опубликовано" }
    // или по ID: select: { id: "option-id" }
  }
}
```

### Создание/обновление Multi-select

```typescript
properties: {
  "Теги": {
    multi_select: [
      { name: "проповедь" },
      { name: "серия" }
    ]
  }
}
```

### Создание/обновление Files

```typescript
properties: {
  "Файлы": {
    files: [
      {
        name: "document.pdf",
        external: { url: "https://example.com/file.pdf" }
      }
    ]
  }
}
```

### Создание/обновление Number

```typescript
properties: {
  "Количество": {
    number: 42
  }
}
```

### Создание/обновление Checkbox

```typescript
properties: {
  "Опубликовано": {
    checkbox: true
  }
}
```

### Создание/обновление Relation

```typescript
properties: {
  "Связанные записи": {
    relation: [
      { id: "page-id-1" },
      { id: "page-id-2" }
    ]
  }
}
```

---

## 💡 Полезные паттерны

### Получение всех записей с пагинацией

```typescript
async function getAllPages(databaseId: string) {
  const allPages: any[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await queryDatabase(databaseId, {
      page_size: 100,
      start_cursor: cursor
    });

    allPages.push(...response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor;
  }

  return allPages;
}
```

### Обработка ошибок

```typescript
try {
  const result = await queryDatabase(databaseId);
} catch (err) {
  if (err instanceof Error) {
    console.error("Buildin API error:", err.message);
    // Обработка конкретных ошибок
    if (err.message.includes("401")) {
      // Неверный токен
    } else if (err.message.includes("404")) {
      // База не найдена
    }
  }
}
```

---

## 📚 Дополнительные ресурсы

- [Database API](./database.md) — подробная документация по Database API
- [Page API](./page.md) — работа со страницами
- [Block API](./block.md) — работа с блоками
- [Search API](./search.md) — поиск по контенту

