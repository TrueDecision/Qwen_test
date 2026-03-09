# 📁 LoL Stats EUW - Project Structure

## 🗂️ Файловая структура

```
c:\project/
│
├── 📄 server.js                      # Express сервер для Vercel
├── 📄 final-test-collector.js        # Сборщик данных (100 игр/чемпион)
├── 📄 convert-test-data.js           # Конвертер в формат сервера
├── 📄 package.json                   # Зависимости npm
├── 📄 vercel.json                    # Конфигурация Vercel
├── 📄 .env                           # Riot API ключ (НЕ КОММИТИТЬ!)
├── 📄 .gitignore                     # Git исключения
├── 📄 .vercelignore                  # Vercel исключения
│
├── 📁 public/                        # Статические файлы для Vercel
│   ├── index.html                    # Главная страница
│   ├── styles.css                    # Стили
│   ├── script.js                     # Скрипты (если есть)
│   ├── ddragon/                      # DataDragon assets
│   │   ├── img/                      # Изображения
│   │   └── data/                     # JSON данные
│   └── js/                           # JavaScript модули
│       ├── config.js                 # Конфигурация
│       ├── state.js                  # Глобальное состояние
│       ├── utils.js                  # Утилиты
│       ├── data-loader.js            # Загрузка данных
│       ├── item-groups.js            # Логика взаимоисключающих предметов
│       ├── skill-order.js            # Skill order логика
│       ├── render-skills.js          # Рендер skill таблицы
│       ├── render-runes.js           # Рендер рун
│       ├── render-detail.js          # Рендер деталей чемпиона
│       ├── render-list.js            # Рендер списка чемпионов
│       ├── telegram.js               # Telegram Mini App интеграция
│       └── main.js                   # Главный entry point
│
├── 📁 cache/                         # Кэш данные
│   └── full-analytics-stats.json     # ⭐ ГЛАВНЫЙ ФАЙЛ - данные для Vercel
│
└── 📁 docs/                          # Документация
    ├── CHANGELOG.md                  # История изменений
    ├── DEPLOYMENT-DOCS.md            # Документация деплоя
    └── VERCEL-DEPLOYMENT.md          # Инструкция по Vercel
```

---

## 🎯 Назначение файлов

### 🔹 Основные скрипты

| Файл | Назначение | Запуск |
|------|------------|--------|
| `server.js` | Express сервер для Vercel | Автоматически |
| `final-test-collector.js` | Сбор данных с Riot API | `node final-test-collector.js` |
| `convert-test-data.js` | Конвертация данных | `node convert-test-data.js` |

### 🔹 Frontend модули

| Файл | Назначение |
|------|------------|
| `config.js` | API URLs, настройки |
| `state.js` | AppState.globalData, AppState.db |
| `utils.js` | Helper функции, tooltip, modal |
| `data-loader.js` | Загрузка DataDragon и API |
| `item-groups.js` | Взаимоисключающие предметы |
| `skill-order.js` | Skill order логика + отрисовка |
| `render-*.js` | Рендеринг UI компонентов |
| `main.js` | Инициализация приложения |

### 🔹 Конфигурация

| Файл | Назначение |
|------|------------|
| `vercel.json` | Маршруты, builds, regions |
| `.env` | Riot API ключ |
| `.gitignore` | Исключения для Git |
| `.vercelignore` | Исключения для Vercel |

---

## 🔄 Поток данных

```
Riot API
   ↓
final-test-collector.js
   ↓
cache/final-test-data.json (сырые данные)
   ↓
convert-test-data.js
   ↓
cache/full-analytics-stats.json (готовые данные)
   ↓
git push → GitHub → Vercel
   ↓
server.js → /api/stats
   ↓
Frontend (public/js/*.js)
   ↓
UI отображение
```

---

## 🚀 Команды

### Сбор данных:
```bash
node final-test-collector.js    # Сбор с Riot API
node convert-test-data.js       # Конвертация
```

### Деплой:
```bash
git add .
git commit -m "Update"
git push origin main            # Vercel обновится автоматически
```

### Локальный запуск:
```bash
node server.js                  # http://localhost:3000
```

---

## ⚠️ Важные заметки

1. **`cache/full-analytics-stats.json`** - единственный файл кэша в Git
2. **`.env`** - никогда не коммитить!
3. **`public/ddragon/`** - не загружать на Vercel (использовать CDN)
4. **`final-test-collector.js`** - запускать на отдельном сервере

---

**Версия:** 2026-03-04  
**Статус:** ✅ Production Ready
