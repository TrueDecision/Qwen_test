# 🚀 LoL Stats EUW - Production Deployment

## 📦 Что готово

### ✅ Сделано:
1. **11,000+ skill orders** собрано
2. **19,642 игр** в кэше
3. **72% игр с skill order** (14,165 из 19,642)
4. **Unified Collector** — собирает всё сразу
5. **Данные объединены** — skill orders в основной статистике

---

## 📁 Структура проекта

```
c:\project/
├── unified-collector.js         ← НОВЫЙ: Сбор всего сразу
├── full-analytics-collector.js  ← Старый: Только статистика
├── collect-skill-orders.js      ← Старый: Только skill orders
├── merge-skill-orders.js        ← Объединение данных
├── server.js                    ← API сервер
├── .env                         ← Конфигурация
├── cache/
│   ├── full-analytics-stats.json    (~24 MB) — Основная статистика
│   ├── skill-orders.json            (~2.6 MB) — Skill orders
│   ├── unified-progress.json        ← Прогресс unified collector
│   └── ...
└── wispbyte-deploy/             ← Файлы для сервера
```

---

## 🎯 Unified Collector (НОВЫЙ)

### Что собирает:
- ✅ Предметы, руны, заклинания
- ✅ KDA, CS, длительность игры
- ✅ **Skill order (Q/W/E/R по уровням)**
- ✅ Pro builds с skill orders

### Преимущества:
- **1 скрипт вместо 2**
- **Skill order сразу для каждой игры**
- **Меньше API запросов** (нет дублирования)
- **Pro builds только с skill order** (качественнее данные)

### Запуск:
```bash
node unified-collector.js
```

### Время сбора:
| Игр | Запросов | Время |
|-----|----------|-------|
| 1000 | ~2000 | ~1 час |
| 10000 | ~20000 | ~11 часов |
| 20000 | ~40000 | ~22 часа |

---

## 📊 Текущая статистика

```
Champions: 172
Total Games: 19,642
Games with Skill Order: 14,165 (72%)
Skill Orders in Cache: 7,807
Pro Builds Matches: ~8,000 (filtered)
```

---

## 🔄 Процесс обновления

### На локальном компьютере:

```bash
# 1. Проверить текущие данные
node -e "const s=JSON.parse(require('fs').readFileSync('cache/full-analytics-stats.json','utf8')); let t=0; Object.values(s).forEach(c=>t+=c.total_games); console.log('Games:', t);"

# 2. Запустить unified collector
node unified-collector.js

# 3. Мониторить прогресс
node -e "const p=JSON.parse(require('fs').readFileSync('cache/unified-progress.json','utf8')); console.log('Games:', p.totalGamesCollected, 'Skill Orders:', p.skillOrdersCollected);"
```

### На сервере (wispbyte.com):

```bash
# 1. Загрузить unified-collector.js
scp unified-collector.js user@wispbyte.com:/var/lol-stats/

# 2. Обновить .env
nano .env
# REQUEST_DELAY=2000
# COLLECT_SKILL_ORDER=true

# 3. Запустить
node unified-collector.js

# 4. Или через PM2
pm2 restart unified-collector
```

---

## 📈 API Endpoints

### После деплоя:

```
GET /api/stats
{
  "champions": {
    "1": {
      "id": "1",
      "roles": {
        "MID": {
          "games": 100,
          "win_rate": 52.3,
          "builds": [
            {
              "games": 50,
              "wins": 28,
              "items": [3001, 3003, ...],
              "perks": {...},
              "skillOrders": [  ← НОВОЕ!
                {
                  "matchId": "EUW1_...",
                  "skillOrder": {
                    "Q": [1, 4, 7, ...],
                    "W": [2, 8, ...],
                    "E": [3, 5, ...],
                    "R": [6, 11, ...]
                  }
                }
              ]
            }
          ]
        }
      }
    }
  }
}

GET /api/pro-builds/:champId?role=MID
{
  "matches": [
    {
      "matchId": "EUW1_...",
      "summonerName": "...",
      "skillOrder": {  ← НОВОЕ!
        "Q": [1, 4, 7, ...],
        "W": [2, 8, ...],
        ...
      },
      ...
    }
  ]
}
```

---

## 🎯 Frontend Изменения

### render-detail.js (обновить):

```javascript
// Отображение skill order в Pro Builds
${match.skillOrder ? `
  <div style="font-size:11px; color:#64748b;">
    Skill Order: Q[${match.skillOrder.Q.join(',')}] 
                 W[${match.skillOrder.W.join(',')}] 
                 E[${match.skillOrder.E.join(',')}] 
                 R[${match.skillOrder.R.join(',')}]
  </div>
` : ''}

// Отображение skill order в билдах
${build.skillOrders && build.skillOrders.length > 0 ? `
  <div style="margin-top:10px;">
    <div style="font-size:10px; color:#64748b; margin-bottom:5px;">Skill Orders:</div>
    ${build.skillOrders.slice(0, 3).map(so => `
      <div style="font-size:9px; color:#94a3b8;">
        Q[${so.skillOrder.Q.join(',')}] 
        W[${so.skillOrder.W.join(',')}] 
        E[${so.skillOrder.E.join(',')}] 
        R[${so.skillOrder.R.join(',')}]
      </div>
    `).join('')}
  </div>
` : ''}
```

---

## 📋 Checklist для деплоя

### Локально:
- [ ] Проверить `cache/full-analytics-stats.json` (19,642 игр)
- [ ] Проверить `cache/skill-orders.json` (7,807 skill orders)
- [ ] Запустить `unified-collector.js` для сбора новых данных
- [ ] Проверить что skill orders собираются

### На сервере:
- [ ] Загрузить `unified-collector.js`
- [ ] Обновить `.env` (`REQUEST_DELAY=2000`, `COLLECT_SKILL_ORDER=true`)
- [ ] Запустить `unified-collector.js`
- [ ] Проверить логи
- [ ] Проверить что skill orders в Pro Builds

### Frontend:
- [ ] Обновить `render-detail.js` для отображения skill orders
- [ ] Добавить отображение skill order в карточке чемпиона
- [ ] Протестировать Pro Builds с skill orders

---

## 🐛 Troubleshooting

### Skill orders не собираются:
```bash
# Проверить .env
grep COLLECT_SKILL_ORDER .env

# Должно быть:
COLLECT_SKILL_ORDER=true
```

### Мало skill orders:
```bash
# Проверить прогресс
node -e "const p=JSON.parse(require('fs').readFileSync('cache/unified-progress.json','utf8')); console.log('Skill Orders:', p.skillOrdersCollected);"

# Если 0 — проверить логи
tail -f cache/unified-collector.log | grep "Skill order"
```

### 429 Rate Limit:
```bash
# Увеличить задержку в .env
REQUEST_DELAY=2500  # или 3000
```

---

## 📞 Support

При проблемах:
1. Проверить логи: `tail -f cache/*.log`
2. Проверить прогресс: `node -e "..."` (см. выше)
3. Проверить API ключ: https://developer.riotgames.com/
4. Перезапустить: `pm2 restart unified-collector`

---

## 🎉 Итог

**Готово к деплою:**
- ✅ 19,642 игр в кэше
- ✅ 7,807 skill orders
- ✅ 72% игр с skill order
- ✅ Unified collector для сбора всего сразу
- ✅ Данные объединены и готовы

**Следующий шаг:** Загрузить на сервер и запустить `unified-collector.js`! 🚀
