# Page API

API для работы со страницами (Pages) в Buildin.ai.

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

### `GET /pages/{pageId}`

Получить информацию о странице по ID.

#### Параметры пути

- `pageId` (string, required) — ID страницы

#### Пример запроса

```typescript
import { apiFetch } from "../../services/buildin";

const pageId = "e33a3fd7-4dfc-4f0a-8a0b-390493b56d33";
const page = await apiFetch(`/pages/${pageId}`);
```

#### Формат ответа

```typescript
interface Page {
  id: string;
  properties: Record<string, PropertyValue>;
  created_time: string;
  last_edited_time: string;
  parent: {
    type: "database_id" | "page_id" | "workspace";
    database_id?: string;
    page_id?: string;
    workspace?: boolean;
  };
  url: string;
  archived: boolean;
}
```

---

### `POST /pages`

Создать новую страницу.

#### Тело запроса

```typescript
interface CreatePageRequest {
  parent: {
    database_id?: string;  // ID базы данных
    page_id?: string;      // ID родительской страницы
  };
  properties: {
    [key: string]: PropertyValue;
  };
  children?: Block[];      // Опционально: блоки контента
}
```

#### Пример создания страницы в базе данных

```typescript
const newPage = await apiFetch(`/pages`, {
  method: "POST",
  body: {
    parent: {
      database_id: "e20b989f-2439-46d1-90a3-d92471d6bb79"
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

#### Пример создания дочерней страницы

```typescript
const childPage = await apiFetch(`/pages`, {
  method: "POST",
  body: {
    parent: {
      page_id: "e33a3fd7-4dfc-4f0a-8a0b-390493b56d33"
    },
    properties: {
      "title": {
        title: [
          { text: { content: "Дочерняя страница" } }
        ]
      }
    }
  }
});
```

---

### `PATCH /pages/{pageId}`

Обновить свойства страницы.

#### Параметры пути

- `pageId` (string, required) — ID страницы

#### Тело запроса

```typescript
interface UpdatePageRequest {
  properties?: {
    [key: string]: PropertyValue;
  };
  archived?: boolean;  // Опционально: архивировать страницу
}
```

#### Пример обновления

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

#### Пример архивирования

```typescript
await apiFetch(`/pages/${pageId}`, {
  method: "PATCH",
  body: {
    archived: true
  }
});
```

---

### `GET /pages/{pageId}/blocks`

Получить блоки контента страницы.

#### Параметры пути

- `pageId` (string, required) — ID страницы

#### Query параметры (если поддерживаются)

- `page_size` (number) — количество блоков на странице
- `start_cursor` (string) — курсор для пагинации

#### Пример запроса

```typescript
const blocks = await apiFetch(`/pages/${pageId}/blocks`);
```

#### Формат ответа

```typescript
interface BlocksResponse {
  results: Block[];
  next_cursor?: string;
  has_more: boolean;
}
```

См. [Block API](./block.md) для подробностей о структуре блоков.

---

### `PATCH /blocks/{pageId}/children`

Добавить блоки к странице.

#### Параметры пути

- `pageId` (string, required) — ID страницы

#### Тело запроса

```typescript
interface AddBlocksRequest {
  children: Block[];
}
```

#### Пример добавления блоков

```typescript
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
      },
      {
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [
            {
              type: "text",
              text: { content: "Заголовок" }
            }
          ]
        }
      }
    ]
  }
});
```

---

## 📝 Типы данных

### Page

```typescript
interface Page {
  id: string;
  properties: Record<string, PropertyValue>;
  created_time: string;
  last_edited_time: string;
  parent: {
    type: "database_id" | "page_id" | "workspace";
    database_id?: string;
    page_id?: string;
    workspace?: boolean;
  };
  url: string;
  archived: boolean;
}
```

### PropertyValue

Структура зависит от типа свойства. См. [overview.md](./overview.md) для примеров.

---

## 💡 Примеры использования

### Получение и парсинг страницы

```typescript
const pageId = "e33a3fd7-4dfc-4f0a-8a0b-390493b56d33";
const page = await apiFetch(`/pages/${pageId}`);

// Парсинг свойств
const title = page.properties["Название"]?.title?.[0]?.plain_text;
const date = page.properties["Дата"]?.date?.start;
const status = page.properties["Статус"]?.select?.name;

console.log({ title, date, status });
```

### Получение всех блоков страницы

```typescript
async function getAllBlocks(pageId: string): Promise<any[]> {
  const allBlocks: any[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await apiFetch(`/pages/${pageId}/blocks`, {
      method: "GET"
      // Добавьте query параметры для пагинации, если API поддерживает
    });

    allBlocks.push(...response.results);
    hasMore = response.has_more ?? false;
    cursor = response.next_cursor;
  }

  return allBlocks;
}
```

### Создание страницы с контентом

```typescript
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
      }
    },
    children: [
      {
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [
            { type: "text", text: { content: "Заголовок проповеди" } }
          ]
        }
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            { type: "text", text: { content: "Текст проповеди..." } }
          ]
        }
      }
    ]
  }
});
```

### Обновление нескольких свойств

```typescript
await apiFetch(`/pages/${pageId}`, {
  method: "PATCH",
  body: {
    properties: {
      "Статус": {
        select: { name: "Опубликовано" }
      },
      "Дата публикации": {
        date: { start: new Date().toISOString().split("T")[0] }
      },
      "Опубликовано": {
        checkbox: true
      }
    }
  }
});
```

---

## ⚠️ Обработка ошибок

Типичные ошибки:

- `401 Unauthorized` — неверный или отсутствующий токен
- `404 Not Found` — страница не найдена
- `400 Bad Request` — неверный формат запроса (неверное имя свойства, неверный тип значения и т.д.)

---

## 🔗 Связанные разделы

- [Практический гайд](./overview.md) — как работать со страницами
- [Database API](./database.md) — получение страниц из базы данных
- [Block API](./block.md) — работа с блоками контента

