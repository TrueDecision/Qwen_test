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
- **Убрано ограничение в 8 предметов** - теперь показываются все предметы из timeline
- **Улучшен формат времени** - вместо `7:00` теперь `7:00` с секундами (7:23)
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
- **Сортировка по длительности** (⏱ Duration) - по умолчанию
- **Сортировка по рангу/LP** (👑 LP/Rank) - Challenger > Grandmaster > Master
- **Переключение порядка** (↑/↓) - клик по кнопке меняет направление

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

### 4. 📊 Обновлена структура данных matches

**Файл:** `convert-test-data.js`

**Данные в matches теперь включают:**
- `summonerName` - имя игрока
- `playerRank` - ранг (Master+)
- `playerTier` - точный тир (MASTER, GRANDMASTER, CHALLENGER)
- `itemPurchases.itemPurchaseTimeline` - полная хронология покупок
- `skillOrder` - порядок прокачки навыков

---

## 📁 Изменённые файлы

| Файл | Изменения |
|------|-----------|
| `server.js` | Улучшена фильтрация ролей, добавлена сортировка (sortBy, sortOrder) |
| `public/js/render-detail.js` | UI сортировки Pro Builds, улучшенный timeline, все предметы |
| `convert-test-data.js` | Данные matches с полной информацией |

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

---

## 📊 Статистика изменений

- **Изменено файлов:** 3
- **Строк добавлено:** ~150
- **Строк удалено:** ~30
- **Новые API параметры:** sortBy, sortOrder

---

## 🎯 Следующие задачи

- [ ] Добавить сортировку по дате матча (если доступно в данных)
- [ ] Улучшить отображение ранга игрока (LP, division)
- [ ] Добавить фильтрацию по.win/loss
- [ ] Интеграция с Telegram Mini App для Pro Builds

---

**Дата обновления:** 2026-03-09  
**Версия:** 1.2.0  
**Статус:** ✅ Production Ready - Pro Builds Improvements
