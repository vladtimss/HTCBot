# HTCBot

Telegram-бот для Церкви Святой Троицы. Предоставляет информацию о богослужениях, малых группах, календаре событий и другие полезные функции.

## Архитектура проекта

Проект организован по принципу **Feature-First** архитектуры: каждая функциональность (фича) является самостоятельным модулем со своими текстами, клавиатурами, константами и утилитами.

### Структура проекта

```
src/
├── app.ts                    # Точка входа: создание бота, подключение middleware, регистрация фич
├── config/                   # Конфигурация (переменные окружения)
│   └── env.ts
│
├── constants/                # Глобальные константы
│   ├── parse-mode.ts        # Режимы парсинга текста (MarkdownV2)
│   ├── navigation.ts        # Глобальные навигационные константы (NAV_MAIN, NAV_BACK, GLOBAL_START)
│   └── button-lables.ts     # Константы кнопок главного меню (MAIN_SUNDAY, MAIN_GROUPS, etc.)
│
├── services/                 # Переиспользуемые сервисы (бизнес-логика)
│   ├── calendar.ts          # Работа с календарем (CalDAV)
│   ├── buildin.ts           # Работа с Buildin API
│   ├── access.ts            # Проверка доступа пользователей
│   └── texts.ts             # Только глобальные тексты (COMMON)
│
├── utils/                    # Переиспользуемые утилиты (технические)
│   ├── text.ts              # Утилиты для работы с текстом (escapeMdV2, escapeUrlV2)
│   ├── loading.ts           # Утилиты для отображения состояния загрузки
│   ├── logger.ts            # Логирование
│   ├── guards.ts            # Проверки доступа
│   └── keyboards.ts         # Пусто (все клавиатуры перенесены в фичи)
│
├── types/                    # Типы TypeScript
│   ├── grammy-context.ts    # Расширенный контекст бота
│   └── buildin.ts           # Типы для Buildin API
│
├── middlewares/              # Middleware для бота
│   ├── auth.ts              # Авторизация и сессии
│   └── error.ts             # Обработка ошибок
│
└── features/                 # Фичи (основные модули функциональности)
    ├── start/                # Команда /start
    │   ├── start.feature.ts    # Логика фичи
    │   └── start.texts.ts      # Тексты для /start
    │
    ├── main-menu/            # Главное меню
    │   ├── main-menu.feature.ts  # Логика
    │   ├── main-menu.texts.ts    # Тексты
    │   └── main-menu.keyboard.ts # Клавиатуры
    │
    ├── about-htc/            # Раздел "О нас"
    │   ├── about-htc.feature.ts
    │   ├── about-htc.texts.ts
    │   ├── about-htc.keyboard.ts
    │   └── about-htc.constants.ts  # Константы кнопок (ABOUT_CHANNEL, etc.)
    │
    ├── church-calendar/      # Церковный календарь
    │   ├── church-calendar.feature.ts
    │   ├── church-calendar.texts.ts
    │   ├── church-calendar.keyboard.ts
    │   ├── church-calendar.constants.ts
    │   └── church-calendar.util.ts  # Утилиты для генерации PDF
    │
    └── ... (другие фичи)
```

### Как понимать фичи

**Фича** — это самостоятельный модуль, который реализует одну функциональность бота. Например:
- `start` — обработка команды /start
- `church-calendar` — весь функционал церковного календаря
- `small-groups` — работа с малыми группами

Каждая фича имеет свою папку `features/{feature-name}/` и может содержать:

- **`{feature-name}.feature.ts`** — основная логика:
  - Регистрация хендлеров (`bot.hears`, `bot.callbackQuery`)
  - Функции рендеринга (`render*`)
  - Экспорт функции регистрации (`register*`)

- **`{feature-name}.texts.ts`** — все тексты фичи:
  - Сообщения пользователям
  - Описания разделов
  - Инструкции

- **`{feature-name}.keyboard.ts`** — клавиатуры фичи:
  - Reply-клавиатуры
  - Inline-клавиатуры
  - Функции генерации клавиатур

- **`{feature-name}.constants.ts`** — константы фичи (опционально):
  - Метки кнопок, специфичные для этой фичи
  - Другие константы

- **`{feature-name}.util.ts`** — утилиты фичи (опционально):
  - Функции форматирования
  - Вспомогательные функции, используемые только в этой фиче

### Правила организации кода

#### 1. Глобальное vs Локальное

**Глобальное** (используется в 2+ фичах) → `services/`, `utils/`, `constants/`:
- `escapeMdV2()` — используется везде → `utils/text.ts`
- `COMMON` — используется везде → `services/texts.ts`
- `NAV_MAIN`, `NAV_BACK` — используются везде → `constants/navigation.ts`
- `MAIN_SUNDAY`, `MAIN_ABOUT` — кнопки главного меню → `constants/button-lables.ts`

**Локальное** (используется только в 1 фиче) → в папке фичи:
- `formatGroup()` — только в small-groups → `features/small-groups/small-groups.util.ts`
- `CALENDAR_TEXTS` — только в church-calendar → `features/church-calendar/church-calendar.texts.ts`

#### 2. Правило "2+ использования"

- Если функция/текст/константа используется в **2+ фичах** → глобальное
- Если используется только в **1 фиче** → локальное (в папке фичи)

#### 3. Структура импортов

```typescript
// ✅ Правильно: импорт локальных ресурсов фичи
import { CALENDAR_TEXTS } from "./church-calendar.texts";
import { replyCalendarMenu } from "./church-calendar.keyboard";

// ✅ Правильно: импорт глобальных ресурсов
import { COMMON } from "../../services/texts";
import { escapeMdV2 } from "../../utils/text";
import { NAVIGATION_LABELS } from "../../constants/navigation";

// ✅ Правильно: импорт из другой фичи (если нужно)
import { SMALL_GROUPS_TEXTS } from "../small-groups/small-groups.texts";
```

### Как добавить новую фичу

1. **Создайте папку фичи:**
   ```
   src/features/my-new-feature/
   ```

2. **Создайте необходимые файлы:**
   - `my-new-feature.feature.ts` — логика (обязательно)
   - `my-new-feature.texts.ts` — тексты (если есть)
   - `my-new-feature.keyboard.ts` — клавиатуры (если нужны)
   - `my-new-feature.constants.ts` — константы (если специфичные)
   - `my-new-feature.util.ts` — утилиты (если локальные)

3. **Пример структуры новой фичи:**

   ```typescript
   // features/my-new-feature/my-new-feature.feature.ts
   import { Bot } from "grammy";
   import { MyContext } from "../../types/grammy-context";
   import { MY_NEW_FEATURE_TEXTS } from "./my-new-feature.texts";
   import { replyMyNewFeatureMenu } from "./my-new-feature.keyboard";
   import { PARSE_MODE } from "../../constants/parse-mode";
   
   export async function renderMyNewFeatureRoot(ctx: MyContext) {
     ctx.session.menuStack = ["my-new-feature"];
     ctx.session.lastSection = "my-new-feature";
     
     await ctx.reply(MY_NEW_FEATURE_TEXTS.title, {
       parse_mode: PARSE_MODE.MARKDOWN_V2,
       reply_markup: replyMyNewFeatureMenu,
     });
   }
   
   export function registerMyNewFeature(bot: Bot<MyContext>) {
     bot.hears(MENU_LABELS.MY_NEW_FEATURE, async (ctx) => {
       await renderMyNewFeatureRoot(ctx);
     });
   }
   ```

4. **Зарегистрируйте фичу в `app.ts`:**
   ```typescript
   import { registerMyNewFeature } from "./features/my-new-feature/my-new-feature.feature";
   
   // В секции регистрации фич
   registerMyNewFeature(bot);
   ```

### Примеры существующих фич

#### Простая фича: `start`
```
features/start/
├── start.feature.ts    # Логика команды /start
└── start.texts.ts      # Функция greet()
```

#### Средняя фича: `about-htc`
```
features/about-htc/
├── about-htc.feature.ts    # Логика раздела
├── about-htc.texts.ts      # Тексты (ABOUT_TEXTS, BELIEF_TEXT, HISTORY_TEXT)
├── about-htc.keyboard.ts   # Клавиатура replyAboutMenu
└── about-htc.constants.ts  # Константы кнопок (ABOUT_CHANNEL, etc.)
```

#### Сложная фича: `church-calendar`
```
features/church-calendar/
├── church-calendar.feature.ts    # Логика (много хендлеров)
├── church-calendar.texts.ts      # Тексты (CALENDAR_TEXTS)
├── church-calendar.keyboard.ts   # Клавиатуры (replyCalendarMenu, subscribeKeyboard, etc.)
├── church-calendar.constants.ts  # Константы (CAL_* метки)
└── church-calendar.util.ts       # Утилиты (buildHtmlForEvents, stripMarkdown, escapeHtml)
```

### Технические детали

#### Режим парсинга

Проект использует **MarkdownV2** для форматирования текста. Все тексты должны быть экранированы через `escapeMdV2()` или `escapeUrlV2()`.

```typescript
import { escapeMdV2 } from "../../utils/text";
import { PARSE_MODE } from "../../constants/parse-mode";

const text = escapeMdV2("Текст с (спецсимволами)");
await ctx.reply(`*${text}*`, { parse_mode: PARSE_MODE.MARKDOWN_V2 });
```

#### Сессии и навигация

Бот использует систему навигации на основе `menuStack` в сессии:
- `ctx.session.menuStack` — стек разделов (например: `["main", "calendar", "lmg"]`)
- `ctx.session.lastSection` — последний раздел
- Кнопка "Назад" работает через `features/navigation/navigation.feature.ts`

#### Доступ и привилегии

- Проверка доступа через `requirePrivileged(ctx)` из `utils/guards.ts`
- Привилегированные пользователи определяются через `env.AUTHORIZED_USERNAMES`
- Проверка доступа происходит в `middlewares/auth.ts`

### Разработка

#### Запуск бота

```bash
npm install
npm run dev      # Разработка с автоперезагрузкой
npm run build    # Сборка
npm start        # Запуск production
```

#### Структура конфигурации

Все переменные окружения в `.env` (см. `src/config/env.ts`):
- `BOT_TOKEN` — токен Telegram бота
- `CALDAV_URL`, `CALDAV_USERNAME`, `CALDAV_PASSWORD` — доступ к календарю
- `BUILDIN_API_TOKEN` — токен для Buildin API
- `AUTHORIZED_USERNAMES` — список привилегированных пользователей

### Принципы архитектуры

1. **Модульность** — каждая фича самодостаточна
2. **Переиспользование** — общие ресурсы в `services/`, `utils/`, `constants/`
3. **Изоляция** — локальные ресурсы рядом с логикой фичи
4. **Масштабируемость** — легко добавлять новые фичи без изменения существующих
