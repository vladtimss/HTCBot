# Authentication

Настройка аутентификации для работы с Buildin.ai API.

---

## 🔑 Получение API токена

1. Откройте Buildin.ai
2. Перейдите в настройки аккаунта
3. Найдите раздел "API" или "Developer Settings"
4. Создайте новый токен (Token)
5. Скопируйте токен (он показывается только один раз!)

---

## ⚙️ Настройка в проекте

### Добавление токена в `.env`

```bash
BUILDIN_API_TOKEN=your_token_here
```

### Использование в коде

Токен автоматически используется через `src/services/buildin.ts`:

```typescript
// src/services/buildin.ts
import { env } from "../config/env";

const headers: Record<string, string> = {
  Authorization: `Bearer ${env.BUILDIN_API_TOKEN}`,
  Accept: "application/json",
  Cookie: "locale=en-us",
  // ...
};
```

Все функции API (`queryDatabase`, `apiFetch`) автоматически используют токен из `env.BUILDIN_API_TOKEN`.

---

## 🔒 Заголовки запросов

Все запросы к Buildin API требуют следующие заголовки:

```http
Authorization: Bearer YOUR_API_TOKEN
Accept: application/json
Cookie: locale=en-us
Content-Type: application/json  (для POST/PATCH запросов)
```

Эти заголовки автоматически добавляются в функции `apiFetch` из `src/services/buildin.ts`.

---

## ⚠️ Безопасность

- **Никогда не коммитьте токен в Git!** Используйте `.env` файл, который в `.gitignore`
- Токен дает полный доступ к вашему workspace в Buildin.ai
- Если токен скомпрометирован, немедленно отзовите его и создайте новый
- Не передавайте токен в клиентский код или публичные места

---

## 🧪 Проверка токена

Если токен не установлен, в консоли появится предупреждение:

```typescript
⚠️ BUILDIN API token is not set (env.BUILDIN_API_TOKEN). Buildin requests will fail.
```

При неверном токене API вернет ошибку `401 Unauthorized`.

---

## 🔗 Связанные разделы

- [Практический гайд](./overview.md) — начало работы с API
- [Database API](./database.md) — использование API с аутентификацией

