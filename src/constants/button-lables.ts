// src/constants/menu-labels.ts
// Единый реестр текстов для всех кнопок бота (reply/inline).
//
// Задачи файла:
// - Централизовать все лейблы, чтобы не было «магических строк» по коду.
// - Облегчить поиск/редактирование — сгруппировано по разделам с комментариями.
// - Избежать расхождений между клавиатурами и хендлерами bot.hears(...).
export const MENU_LABELS = {
    // ==== Глобальные / Главное меню ====
    GLOBAL_START: "🚀 Начать",
    MAIN_SUNDAY: "⛪ Воскресное богослужение",
    MAIN_GROUPS: "👥 Малые группы",
    MAIN_CALENDAR: "📅 Церковный календарь",
    MAIN_SERMONS: "🎙️ Проповеди",
    MAIN_ABOUT: "ℹ️ О нас",

    // ==== Навигация (общая) ====
    NAV_MAIN: "🏠 В главное меню",
    NAV_BACK: "⬅️ Назад",

    // ==== Раздел "Малые группы" ====
    LMG_GROUPS_BY_DAY: "📅 По дням",
    LMG_GROUPS_BY_DISTRICT: "📍 По районам",
    LMG_GROUPS_BACK_TO_DAYS: "⬅️ К дням",
    LMG_GROUPS_BACK_TO_DISTRICTS: "⬅️ К районам",
    LMG_NOTES: "📝 Конспекты ЛМГ",
    LMG_NOTES_PREV: "Конспект с прошлой встречи",
    LMG_CAL_TRIP: "🚌 Выезд ЛМГ",
    LMG_CAL_NEXT: "📅 Следующая встреча ЛМГ",
    LMG_CAL_ALL: "📑 Список встреч ЛМГ",

    // ==== Раздел «О нас» ====
    ABOUT_CHANNEL: "📢 Канал",
    ABOUT_BELIEF: "✝️ Во что мы верим",
    ABOUT_HISTORY: "📜 Наша история",

    // ==== Раздел "Календарь (общие пункты)" ====
    CAL_EVENTS: "🗓️ Посмотреть все события",
    CAL_NEXT3: "🗓️ Три ближайших события",
    CAL_NEXT: "🗓️ Посмотреть ближайшие события",
    CAL_HOLIDAYS: "🎉 Большие праздники",
    CAL_HOLIDAYS_EASTER: "✝️ Когда будет Пасха",
    CAL_HOLIDAYS_RV: "🎄 Даты РВ",
    CAL_SUBSCRIBE: "🔔 Подписаться на календарь",
    CAL_SUBSCRIBE_APPLE: "🍏 Apple",
    CAL_SUBSCRIBE_YANDEX: "📒 Яндекс",
    CAL_SUBSCRIBE_GOOGLE: "🔎 Google",
    CAL_SUBSCRIBE_XIOMI: "📱 Xiaomi",
    CAL_SUBSCRIBE_OTHER: "❓ Другой",

    // ==== Календарь (подразделы) ====
    // ЛМГ
    CAL_LMG: "📅 Встречи ЛМГ",
    // Молитвенные
    CAL_PRAYER: "🙏 Молитвенные собрания",
    CAL_PRAYER_NEXT: "📅 Следующее молитвенное",
    CAL_PRAYER_ALL: "📅 Все молитвенные",
    // Членские
    CAL_MEMBERS: "👥 Членские собрания",
    CAL_MEMBERS_NEXT: "📅 Следующее членское",
    CAL_MEMBERS_ALL: "📅 Все членские",
    // Семейные
    CAL_FAMILY: "👨‍👩‍👧 Отцы и дети / Сёстры",
    CAL_FAMILY_NEXT: "📅 Следующая встреча",
    CAL_FAMILY_ALL: "📑 Все встречи",

    // ==== Радел "Проповеди" ====
    SERMONS_PODCASTS: "🎧 Подкасты",
};
