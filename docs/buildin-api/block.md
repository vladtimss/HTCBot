# Block API

API для работы с блоками контента (Blocks) в Buildin.ai.

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

### `GET /blocks/{blockId}`

Получить информацию о блоке по ID.

#### Параметры пути

- `blockId` (string, required) — ID блока

#### Пример запроса

```typescript
import { apiFetch } from "../../services/buildin";

const blockId = "block-id-here";
const block = await apiFetch(`/blocks/${blockId}`);
```

---

### `PATCH /blocks/{blockId}`

Обновить содержимое блока.

#### Параметры пути

- `blockId` (string, required) — ID блока

#### Тело запроса

Зависит от типа блока. См. раздел "Типы блоков" ниже.

#### Пример обновления параграфа

```typescript
await apiFetch(`/blocks/${blockId}`, {
  method: "PATCH",
  body: {
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: { content: "Обновленный текст" }
        }
      ]
    }
  }
});
```

---

### `DELETE /blocks/{blockId}`

Удалить блок.

#### Параметры пути

- `blockId` (string, required) — ID блока

#### Пример

```typescript
await apiFetch(`/blocks/${blockId}`, {
  method: "DELETE"
});
```

---

### `GET /pages/{pageId}/blocks`

Получить все блоки страницы.

#### Параметры пути

- `pageId` (string, required) — ID страницы

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
      }
    ]
  }
});
```

---

## 📝 Типы блоков

### Paragraph (Параграф)

```typescript
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
```

**Парсинг:**
```typescript
const text = block.paragraph.rich_text?.[0]?.plain_text ?? "";
```

---

### Heading 1, 2, 3 (Заголовки)

```typescript
{
  object: "block",
  type: "heading_1",  // или "heading_2", "heading_3"
  heading_1: {
    rich_text: [
      {
        type: "text",
        text: { content: "Заголовок" }
      }
    ]
  }
}
```

**Парсинг:**
```typescript
const heading = block.heading_1?.rich_text?.[0]?.plain_text ?? "";
// или block.heading_2, block.heading_3
```

---

### Bulleted List Item (Маркированный список)

```typescript
{
  object: "block",
  type: "bulleted_list_item",
  bulleted_list_item: {
    rich_text: [
      {
        type: "text",
        text: { content: "Элемент списка" }
      }
    ]
  }
}
```

**Парсинг:**
```typescript
const text = block.bulleted_list_item?.rich_text?.[0]?.plain_text ?? "";
```

---

### Numbered List Item (Нумерованный список)

```typescript
{
  object: "block",
  type: "numbered_list_item",
  numbered_list_item: {
    rich_text: [
      {
        type: "text",
        text: { content: "Элемент списка" }
      }
    ]
  }
}
```

**Парсинг:**
```typescript
const text = block.numbered_list_item?.rich_text?.[0]?.plain_text ?? "";
```

---

### To Do (Чекбокс)

```typescript
{
  object: "block",
  type: "to_do",
  to_do: {
    rich_text: [
      {
        type: "text",
        text: { content: "Задача" }
      }
    ],
    checked: false
  }
}
```

**Парсинг:**
```typescript
const text = block.to_do?.rich_text?.[0]?.plain_text ?? "";
const checked = block.to_do?.checked ?? false;
```

---

### Image (Изображение)

```typescript
{
  object: "block",
  type: "image",
  image: {
    file: {
      url: "https://...",
      expiry_time: "2025-01-15T12:00:00.000Z"
    },
    // или
    external: {
      url: "https://..."
    },
    caption: []
  }
}
```

**Парсинг:**
```typescript
const imageUrl = block.image?.file?.url ?? block.image?.external?.url;
const caption = block.image?.caption?.[0]?.plain_text ?? "";
```

---

### File (Файл)

```typescript
{
  object: "block",
  type: "file",
  file: {
    file: {
      url: "https://...",
      expiry_time: "2025-01-15T12:00:00.000Z"
    },
    // или
    external: {
      url: "https://..."
    },
    caption: []
  }
}
```

**Парсинг:**
```typescript
const fileUrl = block.file?.file?.url ?? block.file?.external?.url;
```

---

### Code (Код)

```typescript
{
  object: "block",
  type: "code",
  code: {
    rich_text: [
      {
        type: "text",
        text: { content: "const x = 1;" }
      }
    ],
    language: "javascript",
    caption: []
  }
}
```

**Парсинг:**
```typescript
const code = block.code?.rich_text?.[0]?.plain_text ?? "";
const language = block.code?.language ?? "";
```

---

### Quote (Цитата)

```typescript
{
  object: "block",
  type: "quote",
  quote: {
    rich_text: [
      {
        type: "text",
        text: { content: "Текст цитаты" }
      }
    ]
  }
}
```

**Парсинг:**
```typescript
const text = block.quote?.rich_text?.[0]?.plain_text ?? "";
```

---

### Callout (Выделенный блок)

```typescript
{
  object: "block",
  type: "callout",
  callout: {
    rich_text: [
      {
        type: "text",
        text: { content: "Текст" }
      }
    ],
    icon: {
      emoji: "💡"
    }
  }
}
```

**Парсинг:**
```typescript
const text = block.callout?.rich_text?.[0]?.plain_text ?? "";
const icon = block.callout?.icon?.emoji ?? "";
```

---

## 📝 Типы данных

### Block

```typescript
interface Block {
  object: "block";
  id: string;
  type: BlockType;
  created_time: string;
  last_edited_time: string;
  has_children: boolean;
  archived: boolean;
  // Содержимое зависит от type
  [key: string]: any;
}
```

### BlockType

```typescript
type BlockType = 
  | "paragraph"
  | "heading_1" | "heading_2" | "heading_3"
  | "bulleted_list_item"
  | "numbered_list_item"
  | "to_do"
  | "image"
  | "file"
  | "code"
  | "quote"
  | "callout"
  | "divider"
  | "table"
  | "column_list"
  | "column"
  // и другие...
```

---

## 💡 Примеры использования

### Получение и парсинг всех блоков страницы

```typescript
async function parsePageContent(pageId: string) {
  const blocks = await apiFetch(`/pages/${pageId}/blocks`);
  
  const content: string[] = [];
  
  for (const block of blocks.results) {
    switch (block.type) {
      case "paragraph":
        const paraText = block.paragraph?.rich_text?.[0]?.plain_text ?? "";
        if (paraText) content.push(paraText);
        break;
        
      case "heading_1":
        const h1 = block.heading_1?.rich_text?.[0]?.plain_text ?? "";
        if (h1) content.push(`# ${h1}`);
        break;
        
      case "heading_2":
        const h2 = block.heading_2?.rich_text?.[0]?.plain_text ?? "";
        if (h2) content.push(`## ${h2}`);
        break;
        
      case "image":
        const imageUrl = block.image?.file?.url ?? block.image?.external?.url;
        if (imageUrl) content.push(`[Image: ${imageUrl}]`);
        break;
        
      // Добавьте другие типы по необходимости
    }
  }
  
  return content.join("\n\n");
}
```

### Добавление контента к странице

```typescript
async function addContentToPage(pageId: string, title: string, text: string) {
  await apiFetch(`/blocks/${pageId}/children`, {
    method: "PATCH",
    body: {
      children: [
        {
          object: "block",
          type: "heading_1",
          heading_1: {
            rich_text: [
              {
                type: "text",
                text: { content: title }
              }
            ]
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: text }
              }
            ]
          }
        }
      ]
    }
  });
}
```

### Обновление блока

```typescript
async function updateBlock(blockId: string, newText: string) {
  await apiFetch(`/blocks/${blockId}`, {
    method: "PATCH",
    body: {
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: newText }
          }
        ]
      }
    }
  });
}
```

### Удаление блока

```typescript
async function deleteBlock(blockId: string) {
  await apiFetch(`/blocks/${blockId}`, {
    method: "DELETE"
  });
}
```

---

## ⚠️ Обработка ошибок

Типичные ошибки:

- `401 Unauthorized` — неверный или отсутствующий токен
- `404 Not Found` — блок не найден
- `400 Bad Request` — неверный формат запроса

---

## 🔗 Связанные разделы

- [Практический гайд](./overview.md) — как работать с блоками
- [Page API](./page.md) — получение блоков страницы

