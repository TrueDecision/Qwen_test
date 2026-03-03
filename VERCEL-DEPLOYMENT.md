# 🚀 Vercel Deployment Guide - LoL Stats EUW

## 📋 Шаг 1: Подготовка аккаунта Vercel

1. Перейдите на [vercel.com](https://vercel.com)
2. Зарегистрируйтесь через GitHub (рекомендуется) или email
3. Установите Vercel CLI (опционально, но рекомендуется):
   ```bash
   npm i -g vercel
   ```

---

## 📋 Шаг 2: Подготовка проекта

### 2.1 Проверка файлов
Убедитесь, что в проекте есть следующие файлы:
- ✅ `server.js` - Express сервер
- ✅ `vercel.json` - Конфигурация Vercel
- ✅ `package.json` - Зависимости
- ✅ `public/` - Статические файлы
- ✅ `cache/full-analytics-stats.json` - Данные чемпионов

### 2.2 Создание .env файла для Vercel
Создайте файл `.env` с вашим API ключом:
```
RIOT_API_KEY=ваш_riot_api_ключ
PORT=3000
```

---

## 📋 Шаг 3: Деплой через GitHub (Рекомендуется)

### 3.1 Загрузка на GitHub
```bash
# Инициализация git (если ещё не инициализирован)
git init

# Добавление всех файлов
git add .

# Первый коммит
git commit -m "Initial commit - LoL Stats EUW"

# Добавление remote (замените URL на ваш репозиторий)
git remote add origin https://github.com/ВАШ_USERNAME/ВАШ_РЕПОЗИТОРИЙ.git

# Отправка на GitHub
git push -u origin main
```

### 3.2 Подключение к Vercel
1. Войдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Нажмите **"Add New Project"**
3. Выберите **"Import Git Repository"**
4. Найдите ваш репозиторий и нажмите **"Import"**
5. Настройте проект:
   - **Framework Preset:** Other
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `public`
   - **Install Command:** `npm install`
6. Нажмите **"Deploy"**

### 3.3 Добавление Environment Variables
1. После создания проекта перейдите в **Settings → Environment Variables**
2. Добавьте переменные:
   - `RIOT_API_KEY` — ваш Riot API ключ
   - `NODE_ENV` — `production`
3. Нажмите **"Save"**
4. Вернитесь в **Deployments** и сделайте **Redeploy**

---

## 📋 Шаг 4: Деплой через Vercel CLI (Альтернатива)

### 4.1 Авторизация
```bash
vercel login
```

### 4.2 Первый деплой
```bash
# Перейдите в папку проекта
cd c:\project

# Деплой
vercel

# Ответьте на вопросы:
# - Set up and deploy? Y
# - Which scope? (выберите ваш аккаунт)
# - Link to existing project? N
# - Project name? lol-stats-euw
# - Directory? ./
# - Override settings? N
```

### 4.3 Добавление Environment Variables
```bash
# Добавить переменную окружения
vercel env add RIOT_API_KEY production

# Введите ваш API ключ когда попросят
```

### 4.4 Повторный деплой
```bash
# Деплой в production
vercel --prod

# Или просто
vercel
```

---

## 📋 Шаг 5: Проверка работы

### 5.1 Проверьте эндпоинты
После деплоя проверьте:
- `https://ВАШ_ПРОЕКТ.vercel.app/` — главная страница
- `https://ВАШ_ПРОЕКТ.vercel.app/api/stats` — API статистики
- `https://ВАШ_ПРОЕКТ.vercel.app/api/cache-status` — статус кэша

### 5.2 Возможные проблемы и решения

#### ❌ Ошибка: "No cache data"
**Решение:** Убедитесь, что `cache/full-analytics-stats.json` существует и загружен на GitHub/Vercel.

#### ❌ Ошибка: "RIOT_API_KEY is not defined"
**Решение:** Добавьте Environment Variable в настройках Vercel.

#### ❌ Ошибка: 404 на страницах
**Решение:** Проверьте `vercel.json` — пути к статическим файлам должны быть правильными.

#### ❌ Ошибка: Timeout (10s)
**Решение:** Vercel имеет лимит 10 секунд на выполнение serverless функции. Если API запросы к Riot занимают больше времени, нужно:
1. Использовать фоновый сбор данных локально
2. Загружать готовый кэш в `cache/full-analytics-stats.json`
3. Деплоить уже с готовыми данными

---

## 📋 Шаг 6: Обновление данных

### Вариант A: Локальный сбор + деплой
```bash
# 1. Собрать данные локально
node final-test-collector.js

# 2. Конвертировать данные
node convert-test-data.js

# 3. Закоммитить изменения
git add cache/full-analytics-stats.json
git commit -m "Update champion stats"
git push

# 4. Vercel автоматически redeploy (если подключен GitHub)
# Или вручную:
vercel --prod
```

### Вариант B: Автоматический сбор через GitHub Actions
Создайте `.github/workflows/update-stats.yml`:
```yaml
name: Update Stats
on:
  schedule:
    - cron: '0 */6 * * *'  # Каждые 6 часов
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: node final-test-collector.js
        env:
          RIOT_API_KEY: ${{ secrets.RIOT_API_KEY }}
      - run: node convert-test-data.js
      - run: |
          git config --global user.name 'GitHub Actions'
          git config --global user.email 'actions@github.com'
          git add cache/full-analytics-stats.json
          git commit -m "Auto-update stats" || echo "No changes"
          git push
```

---

## 📋 Шаг 7: Мониторинг

### Логи деплоя
```bash
vercel logs
```

### Логи в реальном времени
```bash
vercel logs --follow
```

### Проверка статуса кэша
Откройте: `https://ВАШ_ПРОЕКТ.vercel.app/api/cache-status`

---

## 🔧 Дополнительные настройки

### Увеличение timeout (для платных тарифов)
В `vercel.json`:
```json
{
  "functions": {
    "server.js": {
      "maxDuration": 30
    }
  }
}
```

### Кастомный домен
1. В Dashboard перейдите в **Settings → Domains**
2. Добавьте ваш домен
3. Настройте DNS записи как указано в инструкции Vercel

### Автоматический redeploy при изменении кэша
Vercel автоматически redeploy'ит проект при изменении файлов в GitHub репозитории.

---

## ⚠️ Важные заметки

1. **Vercel Serverless Timeout:** Бесплатный тариф имеет лимит 10 секунд на выполнение функции. Все API запросы должны укладываться в это время.

2. **Кэширование:** Данные чемпионов хранятся в `cache/full-analytics-stats.json`. Этот файл должен быть загружен в репозиторий.

3. **Riot API Rate Limit:** Vercel использует статические IP, что может привести к rate limiting. Рекомендуется использовать Proxy или увеличить лимиты через Riot.

4. **Размер кэша:** Бесплатный тариф Vercel имеет лимит 100MB на Functions. Убедитесь, что `cache/full-analytics-stats.json` не превышает этот лимит.

5. **Environment Variables:** Никогда не коммитьте `.env` файл в репозиторий! Используйте Vercel Environment Variables.

---

## 📞 Поддержка

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Serverless Functions](https://vercel.com/docs/functions)

---

**✅ ГОТОВО!** Ваш проект развёрнут на Vercel! 🎉
