# Database API

API для работы с базами данных Buildin.ai.

**Базовый URL:** `https://api.buildin.ai/v1`

---

## 🔐 Аутентификация

Все запросы требуют Bearer токен:

```http
Authorization: Bearer YOUR_API_TOKEN
Cookie: locale=en-us
Accept: application/json
```

---

## 📡 Endpoints

### `POST /databases/{databaseId}/query`

Запрос записей из базы данных с фильтрацией, сортировкой и пагинацией.

#### Параметры пути

- `databaseId` (string, required) — ID базы данных

#### Тело запроса

```typescript
interface DatabaseQueryRequest {
  page_size?: number;        // Количество записей на странице (по умолчанию 50, максимум 100)
  start_cursor?: string;      // Курсор для пагинации (из предыдущего ответа)
  filter?: FilterObject;       // Условия фильтрации
  sorts?: SortObject[];       // Массив сортировок
}
```

**Пример тела запроса:**

```json
{
  "page_size": 100,
  "filter": {
    "property": "Статус",
    "select": { "equals": "Опубликовано" }
  },
  "sorts": [
    { "property": "Дата", "direction": "descending" }
  ]
}
```

#### Пример запроса

```typescript
import { queryDatabase } from "../../services/buildin";

// Простой запрос
const result = await queryDatabase("e20b989f-2439-46d1-90a3-d92471d6bb79");

// С параметрами
const result = await queryDatabase("e20b989f-2439-46d1-90a3-d92471d6bb79", {
  page_size: 100,
  filter: {
    property: "Статус",
    select: { equals: "Опубликовано" }
  },
  sorts: [
    { property: "Дата", direction: "descending" }
  ]
});
```

#### Формат ответа

```typescript
interface DatabaseQueryResponse {
  results: DatabaseRecord[];  // Массив записей (страниц)
  next_cursor?: string;       // Курсор для следующей страницы
  has_more: boolean;          // Есть ли еще записи
}
```

---

## 🔍 Фильтрация

### Фильтр по Select

```typescript
const result = await queryDatabase(databaseId, {
  filter: {
    property: "Статус",
    select: { equals: "Опубликовано" }
  }
});
```

### Фильтр по Date

```typescript
const result = await queryDatabase(databaseId, {
  filter: {
    property: "Дата",
    date: { 
      equals: "2025-01-15"
      // или: after, before, on_or_after, on_or_before
    }
  }
});
```

Доступные операторы:
- `equals` — точное совпадение
- `before` — до указанной даты
- `after` — после указанной даты
- `on_or_before` — до или в указанную дату
- `on_or_after` — после или в указанную дату

### Фильтр по Title (текст)

```typescript
const result = await queryDatabase(databaseId, {
  filter: {
    property: "Название",
    title: { 
      contains: "проповедь"
      // или: equals, starts_with, ends_with
    }
  }
});
```

### Фильтр по Rich Text

```typescript
const result = await queryDatabase(databaseId, {
  filter: {
    property: "Описание",
    rich_text: { contains: "текст" }
  }
});
```

### Фильтр по Number

```typescript
const result = await queryDatabase(databaseId, {
  filter: {
    property: "Количество",
    number: { 
      equals: 10
      // или: greater_than, less_than, greater_than_or_equal_to, less_than_or_equal_to
    }
  }
});
```

### Фильтр по Checkbox

```typescript
const result = await queryDatabase(databaseId, {
  filter: {
    property: "Опубликовано",
    checkbox: { equals: true }
  }
});
```

### Комбинированные фильтры (AND)

```typescript
const result = await queryDatabase(databaseId, {
  filter: {
    and: [
      { property: "Статус", select: { equals: "Опубликовано" } },
      { property: "Дата", date: { after: "2025-01-01" } },
      { property: "Опубликовано", checkbox: { equals: true } }
    ]
  }
});
```

### Комбинированные фильтры (OR)

```typescript
const result = await queryDatabase(databaseId, {
  filter: {
    or: [
      { property: "Статус", select: { equals: "Черновик" } },
      { property: "Статус", select: { equals: "На проверке" } }
    ]
  }
});
```

---

## 📊 Сортировка

### Одна сортировка

```typescript
const result = await queryDatabase(databaseId, {
  sorts: [
    { property: "Дата", direction: "descending" }
  ]
});
```

### Несколько сортировок

```typescript
const result = await queryDatabase(databaseId, {
  sorts: [
    { property: "Дата", direction: "descending" },
    { property: "Название", direction: "ascending" }
  ]
});
```

Направления:
- `ascending` — по возрастанию
- `descending` — по убыванию

---

## 📝 Типы данных

### DatabaseRecord

```typescript
interface DatabaseRecord {
  id: string;                    // ID страницы
  properties: Record<string, PropertyValue>;  // Все свойства
  created_time: string;          // ISO дата создания
  last_edited_time: string;      // ISO дата последнего редактирования
  parent: {
    type: "database_id";
    database_id: string;
  };
  url: string;                   // URL страницы
}
```

### PropertyValue

Структура зависит от типа свойства. См. [overview.md](./overview.md) для примеров парсинга.

---

## 💡 Примеры использования

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

### Поиск последней записи по дате

```typescript
const result = await queryDatabase(databaseId, {
  page_size: 1,
  sorts: [
    { property: "Дата", direction: "descending" }
  ]
});

const lastPage = result.results[0];
```

### Фильтрация и сортировка

```typescript
// Получить все опубликованные проповеди за 2025 год, отсортированные по дате
const result = await queryDatabase(databaseId, {
  page_size: 100,
  filter: {
    and: [
      { property: "Статус", select: { equals: "Опубликовано" } },
      { property: "Дата", date: { on_or_after: "2025-01-01" } },
      { property: "Дата", date: { on_or_before: "2025-12-31" } }
    ]
  },
  sorts: [
    { property: "Дата", direction: "descending" }
  ]
});
```

---

## ⚠️ Обработка ошибок

Типичные ошибки:

- `401 Unauthorized` — неверный или отсутствующий токен
- `404 Not Found` — база данных не найдена
- `400 Bad Request` — неверный формат запроса (неверное имя свойства, неверный тип фильтра и т.д.)

Все ошибки обрабатываются в `apiFetch` и выбрасываются как `Error` с подробным сообщением.

---

## 🔗 Связанные разделы

- [Практический гайд](./overview.md) — как работать с базами данных
- [Page API](./page.md) — работа с отдельными страницами
- [Search API](./search.md) — поиск по контенту

