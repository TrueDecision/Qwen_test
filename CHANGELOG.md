# 📝 CHANGELOG - LoL Stats EUW

## Версия: 2026-03-09

---

## ✅ Выполненные изменения

### 1. 🛠️ Улучшена фильтрация Pro Builds по ролям

**Файл:** `server.js`

**Изменения:**
- Улучшена логика фильтрации матчей по ролям
- Поддержка обоих форматов ролей: Riot API (BOTTOM, UTILITY, MIDDLE) и фронтенд (ADC, SUPPORT, MID)
- Добавлено логирование для отладки фильтрации
- Исправлена проблема с несоответствием ролей при запросе Pro Builds

**Пример:**
```javascript
// Теперь работает корректно:
GET /api/pro-builds/1?role=ADC      // Фильтрует BOTTOM матчи
GET /api/pro-builds/1?role=SUPPORT  // Фильтрует UTILITY матчи
GET /api/pro-builds/1?role=MID      // Фильтрует MIDDLE матчи
```

---

### 2. ⏱️ Улучшено отображение Item Purchase Timeline

**Файл:** `public/js/render-detail.js`

**Изменения:**
- **Убрано ограничение в 8 предметов** — теперь показываются все предметы из timeline
- **Улучшен формат времени** — вместо `7:00` теперь `7:23` с секундами
- **Добавлен скролл** для длинных списков покупок (max-height: 400px)
- **Золотой цвет времени** для лучшей видимости

**Пример отображения:**
```
Item Purchase Order
┌─────────────────────────────┐
│ 7:23  [Everfrost icon] Everfrost │
│ 12:45 [Shadowflame icon] Shadowflame │
│ 15:30 [Zhonya's icon] Zhonya's Hourglass │
└─────────────────────────────┘
```

---

### 3. 🎚️ Добавлены фильтры сортировки для Pro Builds

**Файлы:** `server.js`, `public/js/render-detail.js`

**Новые возможности:**
- **Сортировка по длительности** (⏱ Duration) — по умолчанию
- **Сортировка по рангу/LP** (👑 LP/Rank) — Challenger > Grandmaster > Master
- **Переключение порядка** (↑/↓) — клик по кнопке меняет направление

**API изменения:**
```javascript
// Новые query параметры:
GET /api/pro-builds/:champId?role=ALL&sortBy=duration&sortOrder=desc
GET /api/pro-builds/:champId?role=ALL&sortBy=lp&sortOrder=asc

// Ответ API теперь включает:
{
  "championId": "1",
  "role": "MIDDLE",
  "matches": [...],
  "sortBy": "duration",
  "sortOrder": "desc"
}
```

**UI:**
```
┌─────────────────────────────────────────────────────┐
│ 🏆 Pro Builds - Annie  15 games                    │
│ Sort by: [⏱ Duration ↓] [👑 LP/Rank] [×]           │
└─────────────────────────────────────────────────────┘
```

---

### 4. 🧠 ПЕРЕРАБОТАН АНАЛИЗ БИЛДОВ (ИЕРАРХИЧЕСКИЙ ПОДХОД)

**Файл:** `convert-test-data.js` (полностью переписан)

**Новая логика анализа соответствует вашему промпту:**

#### 📋 Фильтр по роли (Самый высокий приоритет)
- Перед анализом все игры группируются по роли (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)
- Для мультирольных чемпионов определяется основная роль по количеству игр
- Для джунглей учитывается наличие Smite и jungle items

#### 🔮 Иерархический анализ рун (6 шагов)

```
Шаг 1 → Основное древо (Precision/Domination/Sorcery/Resolve/Inspiration)
   ↓
Шаг 2 → Краеугочный камень (Keystone) среди игр с этим древом
   ↓
Шаг 3 → Малые руны (по слотам 1, 2, 3) с соблюдением порядка
   ↓
Шаг 4 → Вторичная ветка среди игр с этим кестоуном
   ↓
Шаг 5 → Две популярные руны во вторичной ветке
   ↓
Шаг 6 → Три адаптивных бонуса (по ячейкам)
```

**Пример результата:**
```json
{
  "primary": 8100,        // Domination
  "keystone": 8112,       // Electrocute
  "primaryRunes": [8112, 8126, 8140, 8105],
  "sub": 8200,            // Sorcery
  "secondaryRunes": [8226, 8237],
  "shards": [5005, 5008, 5011]
}
```

#### ⚔️ Анализ предметов (4 уровня)

```
1. Стартовый набор
   └─ Предметы купленные в первые 1-2 минуты (до первого возврата)
   └─ Топ-3 комбинации с pick rate %

2. Core Build (последовательность)
   └─ Анализ порядка покупки первых 3 легендарных предметов
   └─ Если последовательности разные → берётся топ-3 по частоте + сортировка по позиции

3. Сапоги
   └─ Самый популярный вариант (порог 40%)
   └─ Среднее время покупки (в минутах)

4. Финишная сборка
   └─ Топ-6 предметов (мифик + легендарки)
   └─ Самая частая комбинация из 6 предметов
```

#### 🎯 Анализ прокачки скиллов

```
- Определение приоритета максимизации (Q→E→W)
- Анализ по первым 6 уровням
- Сбор топ-10 паттернов прокачки
```

#### 📜 Анализ призывных заклинаний

```
- Поиск самой популярной пары заклинаний
- Для джунглей: Smite + Flash (обязательно)
- Для остальных: Flash + (Teleport/Ignite/Exhaust)
```

---

## 📁 Изменённые файлы

| Файл | Изменения |
|------|-----------|
| `server.js` | Улучшена фильтрация ролей, добавлена сортировка (sortBy, sortOrder) |
| `public/js/render-detail.js` | UI сортировки Pro Builds, улучшенный timeline, все предметы |
| `convert-test-data.js` | ✨ Полностью переписан с иерархическим анализом |
| `CHANGELOG.md` | Обновлён с версией 1.2.0 |

---

## 🚀 Команды для обновления

### Локально (разработка):

```bash
# Проверка данных
node -e "const d=JSON.parse(require('fs').readFileSync('cache/full-analytics-stats.json','utf8')); console.log('Champions:', Object.keys(d).length);"

# Запуск сервера
node server.js

# Тест API
curl "http://localhost:3000/api/pro-builds/1?role=MIDDLE&sortBy=lp"
```

### Обновление на сервере:

```bash
# Git push (Vercel авто-деплой)
git add .
git commit -m "Improve Pro Builds: sorting, timeline display, role filtering"
git push origin main

# Проверка деплоя
https://vercel.com/dashboard
```

### Пересборка данных (на сервере сбора):

```bash
# 1. Очистить старый кэш
rm cache/final-test-data.json
rm cache/final-test-progress.json

# 2. Запустить новый сбор
node final-test-collector.js

# 3. Скачать файл на локальную машину
# (SCP или через FTP)

# 4. Конвертировать в формат сервера
node convert-test-data.js

# 5. Закоммитить и запушить
git add cache/full-analytics-stats.json
git commit -m "Update: New data with hierarchical analysis"
git push origin main
```

---

## 🎯 Проверка работы

### 1. Item Purchase Timeline
```bash
# Проверка структуры данных
node -e "const d=JSON.parse(require('fs').readFileSync('cache/full-analytics-stats.json','utf8')); const m=Object.values(d)[0].matches[0]; console.log('Timeline:', m.itemPurchases?.itemPurchaseTimeline?.length||0, 'items');"
```

### 2. Pro Builds API
```bash
# Тест сортировки по длительности
curl "http://localhost:3000/api/pro-builds/1?role=MIDDLE&sortBy=duration&sortOrder=desc"

# Тест сортировки по рангу
curl "http://localhost:3000/api/pro-builds/1?role=MIDDLE&sortBy=lp&sortOrder=desc"
```

### 3. Фильтрация по ролям
```bash
# ADC (BOTTOM)
curl "http://localhost:3000/api/pro-builds/22?role=ADC"

# SUPPORT (UTILITY)
curl "http://localhost:3000/api/pro-builds/412?role=SUPPORT"

# MID (MIDDLE)
curl "http://localhost:3000/api/pro-builds/1?role=MID"
```

### 4. Проверка иерархии рун
```bash
node -e "const d=JSON.parse(require('fs').readFileSync('cache/full-analytics-stats.json','utf8')); const champ=Object.values(d)[0]; const role=Object.values(champ.roles)[0]; const build=Object.values(role.builds)[0]; console.log('Runes:', JSON.stringify(build.perks, null, 2));"
```

### 5. Проверка анализа предметов
```bash
node -e "const d=JSON.parse(require('fs').readFileSync('cache/full-analytics-stats.json','utf8')); const champ=Object.values(d)[0]; const role=Object.values(champ.roles)[0]; const build=Object.values(role.builds)[0]; console.log('Starting:', JSON.stringify(build.frequencyAnalysis?.startingItems, null, 2)); console.log('Core:', build.frequencyAnalysis?.coreBuildOrder);"
```

---

## 📊 Статистика изменений

- **Изменено файлов:** 4
- **Строк добавлено:** ~400
- **Строк удалено:** ~150
- **Новые API параметры:** sortBy, sortOrder
- **Новая логика:** Иерархический анализ билдов

---

## 🎯 Следующие задачи

- [ ] Добавить сортировку по дате матча (если доступно в данных)
- [ ] Улучшить отображение ранга игрока (LP, division)
- [ ] Добавить фильтрацию по win/loss в Pro Builds
- [ ] Интеграция с Telegram Mini App для Pro Builds
- [ ] Валидация данных для джунглей (Smite + jungle item)

---

**Дата обновления:** 2026-03-09  
**Версия:** 1.2.0  
**Статус:** ✅ Production Ready - Pro Builds Improvements + Hierarchical Build Analysis
