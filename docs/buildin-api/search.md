# Search API

API для поиска по контенту в Buildin.ai.

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

### `POST /search`

Полнотекстовый поиск по страницам, базам данных и блокам.

#### Тело запроса

```typescript
interface SearchRequest {
  query: string;              // Поисковый запрос
  filter?: {
    value: "page" | "database" | "block";
    property: "object";
  };
  sort?: {
    direction: "ascending" | "descending";
    timestamp: "last_edited_time";
  };
  page_size?: number;          // Количество результатов (по умолчанию 10, максимум 100)
  start_cursor?: string;       // Курсор для пагинации
}
```

**Пример тела запроса:**

```json
{
  "query": "проповедь",
  "filter": {
    "value": "page",
    "property": "object"
  },
  "sort": {
    "direction": "descending",
    "timestamp": "last_edited_time"
  },
  "page_size": 50
}
```

#### Пример запроса

```typescript
import { apiFetch } from "../../services/buildin";

// Простой поиск
const result = await apiFetch("/search", {
  method: "POST",
  body: {
    query: "проповедь"
  }
});

// Поиск только по страницам
const result = await apiFetch("/search", {
  method: "POST",
  body: {
    query: "проповедь",
    filter: {
      value: "page",
      property: "object"
    }
  }
});

// С сортировкой и пагинацией
const result = await apiFetch("/search", {
  method: "POST",
  body: {
    query: "проповедь",
    filter: {
      value: "page",
      property: "object"
    },
    sort: {
      direction: "descending",
      timestamp: "last_edited_time"
    },
    page_size: 50
  }
});
```

#### Формат ответа

```typescript
interface SearchResponse {
  results: SearchResult[];
  next_cursor?: string;
  has_more: boolean;
}
```

#### SearchResult

Структура зависит от типа объекта:

**Для страниц (page):**
```typescript
interface PageSearchResult {
  object: "page";
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

**Для баз данных (database):**
```typescript
interface DatabaseSearchResult {
  object: "database";
  id: string;
  title: Array<{ plain_text: string }>;
  description: Array<{ plain_text: string }>;
  created_time: string;
  last_edited_time: string;
}
```

**Для блоков (block):**
```typescript
interface BlockSearchResult {
  object: "block";
  id: string;
  type: BlockType;
}
```

---

## 🔍 Фильтрация поиска

### Поиск только по страницам

```typescript
const result = await apiFetch("/search", {
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

### Поиск только по базам данных

```typescript
const result = await apiFetch("/search", {
  method: "POST",
  body: {
    query: "проповеди",
    filter: {
      value: "database",
      property: "object"
    }
  }
});
```

### Поиск только по блокам

```typescript
const result = await apiFetch("/search", {
  method: "POST",
  body: {
    query: "текст",
    filter: {
      value: "block",
      property: "object"
    }
  }
});
```

---

## 📊 Сортировка результатов

### По дате последнего редактирования (убывание)

```typescript
const result = await apiFetch("/search", {
  method: "POST",
  body: {
    query: "проповедь",
    sort: {
      direction: "descending",
      timestamp: "last_edited_time"
    }
  }
});
```

### По дате последнего редактирования (возрастание)

```typescript
const result = await apiFetch("/search", {
  method: "POST",
  body: {
    query: "проповедь",
    sort: {
      direction: "ascending",
      timestamp: "last_edited_time"
    }
  }
});
```

---

## 💡 Примеры использования

### Простой поиск

```typescript
async function searchPages(query: string) {
  const result = await apiFetch("/search", {
    method: "POST",
    body: {
      query,
      filter: {
        value: "page",
        property: "object"
      }
    }
  });
  
  return result.results;
}
```

### Поиск с пагинацией

```typescript
async function searchAllPages(query: string) {
  const allResults: any[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await apiFetch("/search", {
      method: "POST",
      body: {
        query,
        filter: {
          value: "page",
          property: "object"
        },
        page_size: 100,
        start_cursor: cursor
      }
    });

    allResults.push(...response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor;
  }

  return allResults;
}
```

### Поиск проповедей по серии

```typescript
async function searchSermonsBySeries(seriesName: string) {
  const result = await apiFetch("/search", {
    method: "POST",
    body: {
      query: seriesName,
      filter: {
        value: "page",
        property: "object"
      },
      sort: {
        direction: "descending",
        timestamp: "last_edited_time"
      },
      page_size: 50
    }
  });
  
  // Дополнительная фильтрация по свойству "Серия" если нужно
  return result.results.filter((page: any) => {
    const series = page.properties?.["Серия"]?.select?.name;
    return series?.toLowerCase().includes(seriesName.toLowerCase());
  });
}
```

### Поиск по книге Библии

```typescript
async function searchSermonsByBook(bookName: string) {
  const result = await apiFetch("/search", {
    method: "POST",
    body: {
      query: bookName,
      filter: {
        value: "page",
        property: "object"
      },
      page_size: 100
    }
  });
  
  // Фильтрация по свойству "Книга"
  return result.results.filter((page: any) => {
    const book = page.properties?.["Книга"]?.select?.name;
    return book?.toLowerCase() === bookName.toLowerCase();
  });
}
```

### Комбинированный поиск: текст + фильтр по свойствам

```typescript
interface SermonFilters {
  series?: string;
  book?: string;
  status?: string;
}

async function searchSermons(query: string, filters: SermonFilters) {
  // Сначала поиск по тексту
  const searchResult = await apiFetch("/search", {
    method: "POST",
    body: {
      query,
      filter: {
        value: "page",
        property: "object"
      },
      page_size: 100
    }
  });
  
  // Затем фильтрация по свойствам
  return searchResult.results.filter((page: any) => {
    if (filters.series) {
      const series = page.properties?.["Серия"]?.select?.name;
      if (series?.toLowerCase() !== filters.series.toLowerCase()) {
        return false;
      }
    }
    
    if (filters.book) {
      const book = page.properties?.["Книга"]?.select?.name;
      if (book?.toLowerCase() !== filters.book.toLowerCase()) {
        return false;
      }
    }
    
    if (filters.status) {
      const status = page.properties?.["Статус"]?.select?.name;
      if (status?.toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }
    }
    
    return true;
  });
}
```

---

## ⚠️ Обработка ошибок

Типичные ошибки:

- `401 Unauthorized` — неверный или отсутствующий токен
- `400 Bad Request` — неверный формат запроса

---

## 🔗 Связанные разделы

- [Практический гайд](./overview.md) — как использовать поиск
- [Database API](./database.md) — фильтрация через Database Query
- [Page API](./page.md) — работа с найденными страницами

---

## 💡 Когда использовать Search API vs Database Query

**Используйте Search API когда:**
- Нужен полнотекстовый поиск по всему контенту
- Ищете по тексту в блоках страниц
- Не знаете точно, в какой базе данных находится контент
- Нужен поиск по нескольким базам данных одновременно

**Используйте Database Query когда:**
- Знаете ID базы данных
- Нужна точная фильтрация по свойствам (дата, select, checkbox и т.д.)
- Нужна сортировка по свойствам
- Работаете с конкретной структурой базы данных

