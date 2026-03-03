# 🚀 LoL Stats EUW - Project Structure

## 📁 Финальная структура (после очистки)

```
c:\project/
├── .env                        ← Конфигурация (API ключ, настройки)
├── .git/                       ← Git репозиторий
├── .gitignore                  ← Git ignore правила
├── cache/                      ← Данные (кэш)
│   ├── full-analytics-stats.json    (~119 MB) — Основная статистика
│   ├── skill-orders.json            (~2.6 MB) — Skill orders
│   ├── full-analytics-dedup.json    (~1.9 MB) — Дедупликация
│   ├── full-analytics-progress.json (~90 KB) — Прогресс сбора
│   ├── skill-order-progress.json    (~253 KB) — Прогресс skill orders
│   ├── full-analytics-tier-cache.json (~151 KB) — Кэш тиров
│   ├── full-analytics-ranks.json    (~2 bytes) — Кэш рангов
│   ├── ranks-cache.json             (~5 KB) — Кэш рангов
│   └── collector-progress.json      (~11 KB) — Старый прогресс
├── node_modules/               ← Зависимости npm
├── public/                     ← Frontend
│   ├── index.html              ← Главная страница
│   ├── styles.css              ← Стили
│   ├── ddragon/                ← DataDragon (ассеты)
│   └── js/
│       ├── config.js           ← Конфигурация frontend
│       ├── state.js            ← Глобальное состояние
│       ├── utils.js            ← Утилиты
│       ├── data-loader.js      ← Загрузка данных
│       ├── skill-order.js      ← Skill order логика
│       ├── render-skills.js    ← Рендер навыков
│       ├── render-runes.js     ← Рендер рун
│       ├── render-detail.js    ← Рендер карточки чемпиона
│       ├── render-list.js      ← Рендер списка чемпионов
│       └── main.js             ← Точка входа
├── server.js                   ← API сервер (Express)
├── unified-collector.js        ← Сбор данных (статистика + skill order)
├── DEPLOYMENT-FINAL.md         ← Документация по деплою
├── package.json                ← Зависимости npm
└── package-lock.json           ← Locked версии зависимостей
```

## 📊 Размер кэша

| Файл | Размер | Описание |
|------|--------|----------|
| full-analytics-stats.json | ~119 MB | 19,642 игр с предметами/рунами |
| skill-orders.json | ~2.6 MB | 7,807 skill orders |
| full-analytics-dedup.json | ~1.9 MB | Дедупликация матчей |
| full-analytics-progress.json | ~90 KB | Прогресс сбора |
| skill-order-progress.json | ~253 KB | Прогресс skill orders |
| full-analytics-tier-cache.json | ~151 KB | Кэш тиров игроков |
| **ВСЕГО** | **~124 MB** | |

## 🎯 Основные файлы

### Для запуска локально:

```bash
# 1. Установить зависимости
npm install

# 2. Проверить .env (API ключ должен быть)
cat .env

# 3. Запустить сервер
node server.js

# 4. Или запустить сбор данных
node unified-collector.js
```

### Для деплоя на сервер:

```bash
# 1. Загрузить файлы на сервер:
scp .env server.js unified-collector.js package.json user@wispbyte.com:/var/lol-stats/

# 2. На сервере:
cd /var/lol-stats
npm install
node unified-collector.js
```

## 📝 Конфигурация (.env)

```env
# Riot API ключ (обновлять каждые 24 часа)
RIOT_API_KEY=RGAPI-...

# Порт сервера
PORT=3000

# Настройки сбора данных
TARGET_GAMES=1000          # Игр на чемпиона
MAX_PLAYERS=200            # Игроков за запуск
GAMES_PER_PLAYER=20        # Игр на игрока

# Rate limiting
REQUEST_DELAY=2000         # Задержка (мс)

# Логирование
DEBUG_LOGS=false
LOG_TO_CONSOLE=true

# Skill Order
COLLECT_SKILL_ORDER=true   # Собирать skill order
```

## 🧹 Что удалено (очистка)

### Удалено файлов: 57
- ✅ Тестовые скрипты (test-*.js, check-*.js)
- ✅ Старые коллекторы (background-collector.js, full-analytics-collector.js)
- ✅ Старая документация (BUILD-*.md, FINAL-*.md, etc.)
- ✅ Временные файлы кэша (ambessa*.json, test*.json, etc.)
- ✅ Папка wispbyte-deploy (интегрировано в основной проект)

### Осталось:
- ✅ Только production файлы
- ✅ Актуальная документация (DEPLOYMENT-FINAL.md)
- ✅ unified-collector.js (единственный коллектор)
- ✅ server.js (API сервер)
- ✅ public/ (frontend)
- ✅ cache/ (данные)

## 🎉 Готово к деплою!

**Следующий шаг:** Тестирование локально → Деплой на wispbyte.com
