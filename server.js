require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// === ПУТИ К ФАЙЛАМ КЭША ===
// Приоритет: full-analytics-stats.json > stats.json
const CACHE_FILES = [
    path.join(__dirname, 'cache', 'full-analytics-stats.json'),  // Полный сбор (1000 игр/чемп)
    path.join(__dirname, 'cache', 'stats.json')                   // Быстрый сбор (20 игр/чемп)
];

app.use(cors());
// Раздача статики (картинки из папки public/ddragon)
app.use(express.static('public'));
app.use('/ddragon', express.static(path.join(__dirname, 'public', 'ddragon')));

// === ЗАГРУЗКА ДАННЫХ ИЗ КЭША ===
function loadCachedStats() {
    // Ищем первый существующий файл
    const cacheFile = CACHE_FILES.find(f => fs.existsSync(f));
    
    if (!cacheFile) {
        console.log('⚠️ Кэш не найден. Запустите: node background-collector.js или node full-analytics-collector.js');
        return null;
    }
    
    const cacheName = path.basename(cacheFile);

    try {
        const data = fs.readFileSync(cacheFile, 'utf8');
        const parsed = JSON.parse(data);
        console.log(`✅ Кэш загружен: ${cacheName}`);
        console.log(`✅ Чемпионов: ${Object.keys(parsed).length}`);

        // Подсчитываем общее количество игр
        let totalGames = 0;
        Object.values(parsed).forEach(champ => {
            totalGames += champ.total_games || 0;
        });
        console.log(`📊 Всего игр в кэше: ${totalGames}`);

        return parsed;
    } catch (error) {
        console.error('❌ Ошибка загрузки кэша:', error.message);
        return null;
    }
}

// === ФОРМАТИРОВАНИЕ ДАННЫХ ДЛЯ ФРОНТЕНДА ===
function formatStatsForFrontend(championsData) {
    if (!championsData) return { champions: {} };

    const formattedChampions = {};

    // Маппинг ролей Riot API -> Роли фронтенда
    const ROLE_MAPPING = {
        'BOTTOM': 'ADC',
        'UTILITY': 'SUPPORT',
        'MIDDLE': 'MID',
        'TOP': 'TOP',
        'JUNGLE': 'JUNGLE'
    };

    Object.keys(championsData).forEach(id => {
        const champ = championsData[id];
        const rolesObj = {};
        let maxGames = 0;
        let primaryRole = 'TOP';
        let roleGamesDistribution = {}; // Для мультирольности

        Object.keys(champ.roles || {}).forEach(riotRole => {
            // Нормализуем роль
            const role = ROLE_MAPPING[riotRole] || riotRole;

            if (role === 'UNKNOWN' || role === '') return;

            const r = champ.roles[riotRole];

            // === ФОРМИРОВАНИЕ БИЛДОВ ===
            // Список финальных предметов (не компоненты)
            const FINAL_ITEMS = new Set([
                3001, 3003, 3004, 3006, 3009, 3011, 3015, 3020, 3026, 3031, 3033, 3036, 3040, 3042, 3046, 3047, 3050, 3053, 3059, 3065, 3068, 3071, 3072, 3074, 3075, 3078, 3083, 3089, 3091, 3094, 3095, 3100, 3102, 3107, 3109, 3110, 3111, 3115, 3116, 3117, 3118, 3119, 3121, 3124, 3133, 3135, 3139, 3140, 3142, 3143, 3144, 3145, 3146, 3147, 3151, 3152, 3153, 3156, 3157, 3158, 3161, 3165, 3179, 3180, 3181, 3190, 3193, 3222, 3504, 3508, 3513, 3599, 3742, 3814, 4005, 4401, 4403, 4628, 4629, 4630, 4632, 4633, 4636, 4637, 4638, 4643, 4644, 4645, 6029, 6035, 6333, 6609, 6610, 6616, 6617, 6630, 6631, 6632, 6650, 6651, 6652, 6653, 6655, 6656, 6657, 6660, 6661, 6662, 6664, 6665, 6666, 6667, 6670, 6671, 6672, 6673, 6675, 6676, 6677, 6691, 6692, 6693, 6694, 6695, 6696, 6700
            ]);

            const buildsObj = {};

            // Сортируем билды по количеству игр
            const sortedBuilds = Object.entries(r.builds || {})
                .sort((a, b) => b[1].games - a[1].games);

            // Берем топ-5 билдов
            sortedBuilds.slice(0, 5).forEach(([buildKey, buildData]) => {
                // Фильтруем только финальные предметы
                const finalItems = (buildData.items || []).filter(id => FINAL_ITEMS.has(id));
                
                // Собираем skill orders из matches этого чемпиона
                const champMatches = champ.matches || [];
                const matchingSkillOrders = champMatches
                    .filter(m => {
                        // Проверяем что предметы совпадают (хотя бы первые 2 финальных предмета)
                        const buildCore = finalItems.slice(0, 2).sort().join('-');
                        const matchFinalItems = (m.items || []).filter(id => FINAL_ITEMS.has(id));
                        const matchCore = matchFinalItems.slice(0, 2).sort().join('-');
                        return buildCore === matchCore && m.skillOrder;
                    })
                    .map(m => m.skillOrder)  // Возвращаем напрямую skillOrder объект
                    .slice(0, 10); // Топ-10

                buildsObj[buildKey] = {
                    games: buildData.games,
                    wins: buildData.wins,
                    items: finalItems,  // Только финальные предметы
                    summoner1: buildData.summoner1,
                    summoner2: buildData.summoner2,
                    perks: buildData.perks,
                    skillOrders: matchingSkillOrders,  // Skill orders из matches
                    frequencyAnalysis: buildData.frequencyAnalysis || null  // Частотный анализ
                };
            });

            rolesObj[role] = {
                win_rate: r.games > 0 ? parseFloat(((r.wins / r.games) * 100).toFixed(1)) : 0,
                games: r.games,
                is_reliable: r.games >= 3,
                builds: buildsObj,
                totalBuilds: Object.keys(r.builds || {}).length
            };

            if (r.games > maxGames) {
                maxGames = r.games;
                primaryRole = role;
            }
        });

        if (Object.keys(rolesObj).length) {
            // === ОПРЕДЕЛЕНИЕ МУЛЬТИРОЛЬНОСТИ ===
            // Считаем общее количество игр по всем ролям этого чемпиона
            const totalChampGames = Object.values(rolesObj).reduce((sum, r) => sum + r.games, 0);
            const secondaryRoles = [];

            Object.entries(rolesObj).forEach(([role, roleData]) => {
                const percent = totalChampGames > 0 ? (roleData.games / totalChampGames) * 100 : 0;
                // Порог 15% для мультирольности (вместо 20%)
                if (role !== primaryRole && percent >= 15) {
                    secondaryRoles.push({
                        role,
                        games: roleData.games,
                        percent: parseFloat(percent.toFixed(1))
                    });
                }
            });

            formattedChampions[id] = {
                id,
                name: `Champ_${id}`,
                primary_role: primaryRole,
                roles: rolesObj,
                total_games: champ.total_games || 0,
                matches: champ.matches || [],
                // Информация для мультирольности
                is_multiclass: secondaryRoles.length > 0,
                secondary_roles: secondaryRoles,
                role_distribution: rolesObj // Используем rolesObj вместо roleGamesDistribution
            };
        }
    });

    return { champions: formattedChampions };
}

// === API ENDPOINTS ===

// Основная статистика чемпионов
app.get('/api/stats', async (req, res) => {
    console.log('\n🔄 Запрос статистики...');
    
    const cachedData = loadCachedStats();
    
    if (!cachedData) {
        return res.json({
            error: 'No cache data. Run: node background-collector.js',
            champions: {},
            cache_required: true
        });
    }
    
    const formattedData = formatStatsForFrontend(cachedData);
    
    res.json({
        last_updated: new Date().toISOString(),
        total_matches_analyzed: Object.values(cachedData).reduce((sum, c) => sum + (c.total_games || 0), 0),
        region: 'EUW',
        patch: 'Live',
        source: 'cache',
        champions: formattedData.champions
    });
});

// Pro builds для конкретного чемпиона
app.get('/api/pro-builds/:champId', async (req, res) => {
    const champId = req.params.champId;
    let role = req.query.role || 'ALL';

    // Нормализация роли (фронтенд -> Riot API)
    const REVERSE_ROLE_MAPPING = {
        'ADC': 'BOTTOM',
        'SUPPORT': 'UTILITY',
        'MID': 'MIDDLE',
        'TOP': 'TOP',
        'JUNGLE': 'JUNGLE'
    };
    const riotRole = REVERSE_ROLE_MAPPING[role] || role;

    console.log(`\n🎯 Запрос pro builds: ${champId} (${role} -> ${riotRole})`);

    const cachedData = loadCachedStats();

    if (!cachedData || !cachedData[champId]) {
        return res.json({ error: 'No data for champion', matches: [] });
    }

    const champData = cachedData[champId];
    const matches = champData.matches || [];

    // Фильтруем по роли если указана
    const filteredMatches = role === 'ALL'
        ? matches
        : matches.filter(m => {
              // Нормализуем роль из матча
              const matchRole = m.role === 'BOTTOM' ? 'ADC' : 
                               m.role === 'UTILITY' ? 'SUPPORT' : 
                               m.role === 'MIDDLE' ? 'MID' : m.role;
              return matchRole === role || m.role === riotRole;
          });

    // Сортируем по времени (свежие сначала) и берем топ-15
    const topMatches = filteredMatches
        .sort((a, b) => (b.gameDuration || 0) - (a.gameDuration || 0))
        .slice(0, 15);

    res.json({
        championId: champId,
        role,
        matches: topMatches
    });
});

// Статус кэша
app.get('/api/cache-status', async (req, res) => {
    const cachedData = loadCachedStats();

    if (!cachedData) {
        return res.json({
            exists: false,
            message: 'Cache not found. Run: node background-collector.js или node full-analytics-collector.js'
        });
    }

    const champCount = Object.keys(cachedData).length;
    let totalGames = 0;
    const champGames = {};

    Object.keys(cachedData).forEach(id => {
        const games = cachedData[id].total_games || 0;
        totalGames += games;
        champGames[id] = games;
    });

    // Статистика по ролям (с нормализацией)
    const ROLE_MAPPING = {
        'BOTTOM': 'ADC',
        'UTILITY': 'SUPPORT',
        'MIDDLE': 'MID',
        'TOP': 'TOP',
        'JUNGLE': 'JUNGLE'
    };

    const roleStats = {};
    Object.values(cachedData).forEach(champ => {
        Object.keys(champ.roles || {}).forEach(riotRole => {
            const role = ROLE_MAPPING[riotRole] || riotRole;
            if (!roleStats[role]) roleStats[role] = { champs: 0, games: 0 };
            roleStats[role].champs++;
            roleStats[role].games += champ.roles[riotRole].games || 0;
        });
    });

    res.json({
        exists: true,
        champions: champCount,
        totalGames,
        champGames,
        roleStats,
        lastModified: fs.statSync(CACHE_FILES.find(f => fs.existsSync(f))).mtime.toISOString()
    });
});

// Запуск сервера только если не в Vercel environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        const activeCache = CACHE_FILES.find(f => fs.existsSync(f));
        console.log(`\n🚀 Server started: http://localhost:${PORT}`);
        console.log(`📂 Static Assets: /ddragon`);
        console.log(`📦 Cache File: ${activeCache ? path.basename(activeCache) : 'NONE'}`);
        console.log(`🎯 Mode: CACHE ONLY (use background-collector.js or full-analytics-collector.js)`);
        console.log(`\n📝 Endpoints:`);
        console.log(`   GET /api/stats - Основная статистика`);
        console.log(`   GET /api/pro-builds/:champId?role=ALL - Pro builds`);
        console.log(`   GET /api/cache-status - Статус кэша`);
    });
}

// Экспорт для Vercel serverless
module.exports = app;
