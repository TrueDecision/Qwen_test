/**
 * Convert final-test-data.json to server format
 * С частотным анализом предметов и отдельной обработкой сапогов
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'cache', 'final-test-data.json');
const OUTPUT_FILE = path.join(__dirname, 'cache', 'full-analytics-stats.json');

// ID сапогов
const BOOTS_IDS = new Set([3006, 3009, 3020, 3047, 3111, 3117, 3158]);

console.log('\n🔄 CONVERTING DATA FORMAT (with frequency analysis)\n');

const testData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
const serverFormat = {};

let totalChamps = 0;
let totalGames = 0;

Object.entries(testData).forEach(([champId, roles]) => {
    const champData = {
        id: champId,
        roles: {},
        total_games: 0,
        matches: []
    };

    Object.entries(roles).forEach(([role, roleData]) => {
        const games = roleData.games || [];
        let roleWins = 0;
        let roleGames = 0;

        // === СТАРТОВЫЕ ПРЕДМЕТЫ ===
        // Предметы которые считаются стартовыми
        const STARTING_ITEMS = new Set([
            // Doran's
            1055,  // Doran's Blade
            1056,  // Doran's Ring
            1054,  // Doran's Shield
            // Лесник
            1039,  // Hunter's Machete
            1041,  // Emberknife
            // Саппорт
            3850,  // Relic Shield
            3851,  // Spellthief's Edge
            3854,  // Steel Shoulderguards
            3858,  // Spectral Sickle
            // Зелья и старт
            2003,  // Health Potion
            2031,  // Refillable Potion
            2033,  // Corrupting Potion
            2055,  // Control Ward
            // Меч
            1036   // Long Sword
        ]);
        
        const startingItemStats = {};  // { "1055-2003": { count, wins, items: [] } }

        // === ЧАСТОТНЫЙ АНАЛИЗ ПРЕДМЕТОВ ===
        // Считаем частоту каждого предмета и его среднюю позицию
        const itemStats = {};  // itemId -> { count, positions[], wins }
        const bootsStats = {}; // itemId -> { count, wins }

        games.forEach(game => {
            roleGames++;
            if (game.win) roleWins++;

            const items = game.items || [];
            
            // Собираем стартовые предметы (первые 2-3 предмета)
            const startingItems = items.slice(0, 3).filter(id => STARTING_ITEMS.has(id));
            if (startingItems.length > 0) {
                const startingKey = startingItems.sort().join('-');
                if (!startingItemStats[startingKey]) {
                    startingItemStats[startingKey] = { count: 0, wins: 0, items: startingItems };
                }
                startingItemStats[startingKey].count++;
                if (game.win) startingItemStats[startingKey].wins++;
            }

            // Считаем все предметы для основного билда
            items.forEach((itemId, idx) => {
                if (!itemStats[itemId]) {
                    itemStats[itemId] = { count: 0, positions: [], wins: 0 };
                }
                itemStats[itemId].count++;
                itemStats[itemId].positions.push(idx);
                if (game.win) itemStats[itemId].wins++;

                // Сапоги считаем отдельно
                if (BOOTS_IDS.has(itemId)) {
                    if (!bootsStats[itemId]) {
                        bootsStats[itemId] = { count: 0, wins: 0 };
                    }
                    bootsStats[itemId].count++;
                    if (game.win) bootsStats[itemId].wins++;
                }
            });
        });

        // === ТОП-3 СТАРТОВЫХ ПРЕДМЕТА ===
        const topStartingItems = Object.values(startingItemStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(s => ({
                items: s.items,
                count: s.count,
                percent: roleGames > 0 ? ((s.count / roleGames) * 100).toFixed(1) : 0,
                winRate: s.count > 0 ? ((s.wins / s.count) * 100).toFixed(1) : 0
            }));

        // === ОПРЕДЕЛЯЕМ ТИПИЧНЫЙ БИЛД ===
        // Сортируем предметы по: 1) частоте, 2) средней позиции (порядок покупки)
        const nonBootsItems = Object.entries(itemStats)
            .filter(([id]) => !BOOTS_IDS.has(Number(id)))
            .map(([id, stats]) => ({
                id: Number(id),
                count: stats.count,
                avgPosition: stats.positions.reduce((a, b) => a + b, 0) / stats.positions.length,
                winRate: stats.count > 0 ? ((stats.wins / stats.count) * 100).toFixed(1) : 0
            }))
            .sort((a, b) => {
                // Сначала по частоте (убывание)
                if (b.count !== a.count) return b.count - a.count;
                // Потом по средней позиции (возрастание - раньше купленные primero)
                return a.avgPosition - b.avgPosition;
            });

        // === ОПРЕДЕЛЯЕМ ТИПИЧНЫЕ САПОГИ ===
        // Показываем сапог, если его популярность >= 40%
        const totalBootsGames = Object.values(bootsStats).reduce((sum, s) => sum + s.count, 0);
        const typicalBoots = Object.entries(bootsStats)
            .map(([id, stats]) => ({
                id: Number(id),
                count: stats.count,
                percent: totalBootsGames > 0 ? ((stats.count / totalBootsGames) * 100).toFixed(1) : 0,
                winRate: stats.count > 0 ? ((stats.wins / stats.count) * 100).toFixed(1) : 0
            }))
            .filter(b => parseFloat(b.percent) >= 40)  // Порог 40%
            .sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent));

        // === ФОРМИРУЕМ ТИПИЧНЫЙ БИЛД ===
        // Берём топ-6 предметов (без сапог) + добавляем сапог на правильную позицию
        const typicalItems = nonBootsItems.slice(0, 6).map(x => x.id);
        
        // Вставляем сапог на позицию 1-2 (после первого предмета)
        if (typicalBoots.length > 0) {
            const bootsId = typicalBoots[0].id;
            // Вставляем после первого предмета (позиция 1)
            typicalItems.splice(1, 0, bootsId);
        }

        // === СОЗДАЁМ ЕДИНЫЙ БИЛД ДЛЯ РОЛИ ===
        const builds = {};
        const buildKey = 'typical';  // Теперь один билд на роль

        builds[buildKey] = {
            games: roleGames,
            wins: roleWins,
            items: typicalItems,
            summoner1: games[0]?.summoners[0] || 4,
            summoner2: games[0]?.summoners[1] || 14,
            perks: games[0]?.perks || {},
            skillOrders: [],
            // Частотный анализ для отображения
            frequencyAnalysis: {
                startingItems: topStartingItems,
                items: nonBootsItems.slice(0, 10).map(x => ({
                    id: x.id,
                    count: x.count,
                    percent: roleGames > 0 ? ((x.count / roleGames) * 100).toFixed(1) : 0,
                    avgPosition: x.avgPosition.toFixed(2),
                    winRate: x.winRate
                })),
                boots: typicalBoots.map(b => ({
                    id: b.id,
                    count: b.count,
                    percent: b.percent,
                    winRate: b.winRate
                }))
            }
        };

        // Собираем skill orders из всех игр
        games.forEach(game => {
            if (game.skillOrder) {
                builds[buildKey].skillOrders.push(game.skillOrder);
            }
        });

        // Добавляем в matches для Pro Builds
        games.forEach(game => {
            if (champData.matches.length < 100) {
                champData.matches.push({
                    matchId: game.matchId,
                    puuid: 'unknown',
                    summonerName: 'Summoner',
                    role,
                    win: game.win,
                    items: game.items,
                    summoner1: game.summoners[0],
                    summoner2: game.summoners[1],
                    perks: game.perks,
                    kills: game.kda?.kills || 0,
                    deaths: game.kda?.deaths || 0,
                    assists: game.kda?.assists || 0,
                    cs: game.cs || 0,
                    gameDuration: game.gameDuration || 0,
                    skillOrder: game.skillOrder,
                    tier: 'Master+'
                });
            }
        });

        champData.roles[role] = {
            win_rate: roleGames > 0 ? parseFloat(((roleWins / roleGames) * 100).toFixed(1)) : 0,
            games: roleGames,
            wins: roleWins,
            is_reliable: roleGames >= 3,
            builds,
            totalBuilds: Object.keys(builds).length
        };

        champData.total_games += roleGames;
        totalGames += roleGames;
    });

    serverFormat[champId] = champData;
    totalChamps++;

    if (totalChamps % 20 === 0) {
        console.log(`   Converted ${totalChamps} champions...`);
    }
});

console.log('\n💾 Saving...\n');
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(serverFormat, null, 2));

console.log('='.repeat(70));
console.log('✅ CONVERSION COMPLETE!');
console.log('='.repeat(70));
console.log(`🏆 Champions: ${totalChamps}`);
console.log(`🎮 Total games: ${totalGames}`);
console.log(`📁 Output: ${OUTPUT_FILE}`);
console.log('='.repeat(70) + '\n');
