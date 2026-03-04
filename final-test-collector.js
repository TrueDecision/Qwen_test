/**
 * Final Test Data Collector - 10 Games Per Champion
 * 
 * Собирает ВСЕ данные для финального тестирования:
 * - 10 игр на КАЖДОГО чемпиона
 * - Предметы, руны, заклинания
 * - KDA, CS, длительность
 * - Skill Order (порядок прокачки)
 * 
 * Запуск: node final-test-collector.js
 */

require('dotenv').config();
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

// === КОНФИГУРАЦИЯ ===
const CONFIG = {
    RIOT_API_KEY: process.env.RIOT_API_KEY,
    REGION: 'euw1',
    REGION_ROUTE: 'europe',
    GAMES_PER_CHAMPION: 100,  // 100 игр на чемпиона
    REQUEST_DELAY_MS: 1500,   // Уменьшил задержку для скорости
    REQUEST_TIMEOUT_MS: 20000,
    OUTPUT_FILE: path.join(__dirname, 'cache', 'final-test-data.json'),
    PROGRESS_FILE: path.join(__dirname, 'cache', 'final-test-progress.json')
};

// === ГЛОБАЛЬНОЕ СОСТОЯНИЕ ===
let collectedData = {};  // { champId: { role: { games: [] } } }
let progress = {
    processedPuuids: [],
    championGames: {},  // { champId: count }
    lastSaved: null
};
let requestCounter = 0;
let sessionStartTime = 0;

// === RIOT API REQUEST ===
async function riotRequest(url, retryCount = 0) {
    requestCounter++;
    
    try {
        const res = await axios.get(url, {
            headers: {
                'X-Riot-Token': CONFIG.RIOT_API_KEY,
                'User-Agent': 'Final-Test-Collector/1.0'
            },
            httpsAgent: insecureAgent,
            timeout: CONFIG.REQUEST_TIMEOUT_MS
        });
        return res.data;
    } catch (error) {
        if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'] || 12;
            console.log(`   🚫 Rate limit! Waiting ${retryAfter}s...`);
            await new Promise(r => setTimeout(r, retryAfter * 1000));
            return riotRequest(url, retryCount + 1);
        }
        if (error.response?.status === 404) return null;
        if (error.response?.status === 401) throw new Error('401 Unauthorized - Check API key');
        if (retryCount < 3) {
            await new Promise(r => setTimeout(r, 2000));
            return riotRequest(url, retryCount + 1);
        }
        throw error;
    }
}

// === ИЗВЛЕЧЕНИЕ SKILL ORDER ===
async function extractSkillOrder(matchId, participantId) {
    try {
        const timeline = await riotRequest(
            `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`
        );

        if (!timeline?.info?.frames) return null;

        const events = [];
        timeline.info.frames.forEach(frame => {
            if (frame.events) {
                frame.events.forEach(event => {
                    if ((event.type === 'SKILL_LEVEL_UP' || event.eventType === 'SKILL_LEVEL_UP') &&
                        event.participantId === participantId) {
                        events.push({
                            skill: event.skill || event.skillSlot || 0,
                            timestamp: event.timestamp || event.realTimestamp || 0
                        });
                    }
                });
            }
        });

        if (events.length === 0) return null;

        events.sort((a, b) => a.timestamp - b.timestamp);

        const skillOrderByLevel = new Array(18).fill(null);
        let levelIndex = 0;

        events.forEach(event => {
            if (event.skill > 0 && event.skill < 5 && levelIndex < 18) {
                skillOrderByLevel[levelIndex] = event.skill;
                levelIndex++;
            }
        });

        const skillOrder = {
            byLevel: skillOrderByLevel.map(s =>
                s === 1 ? 'Q' : s === 2 ? 'W' : s === 3 ? 'E' : s === 4 ? 'R' : null
            ).filter(s => s),
            Q: [], W: [], E: [], R: []
        };

        const skillCount = { 1: 0, 2: 0, 3: 0, 4: 0 };
        events.forEach(event => {
            if (event.skill > 0 && event.skill < 5) {
                skillCount[event.skill]++;
                const skillName = event.skill === 1 ? 'Q' : event.skill === 2 ? 'W' : event.skill === 3 ? 'E' : 'R';
                skillOrder[skillName].push(skillCount[event.skill]);
            }
        });

        return skillOrder;
    } catch (error) {
        return null;
    }
}

// === ИЗВЛЕЧЕНИЕ ПОРЯДКА ПОКУПКИ ПРЕДМЕТОВ ===
async function extractItemPurchases(matchId, participantId) {
    try {
        const timeline = await riotRequest(
            `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`
        );

        if (!timeline?.info?.frames) return null;

        const purchaseEvents = [];
        const startingItems = [];
        let firstBackItems = [];
        
        // Собираем все события покупок
        timeline.info.frames.forEach((frame, frameIndex) => {
            if (frame.events) {
                frame.events.forEach(event => {
                    if ((event.type === 'ITEM_PURCHASED' || event.eventType === 'ITEM_PURCHASED') &&
                        event.participantId === participantId) {
                        
                        const timestamp = event.timestamp || event.realTimestamp || 0;
                        const minutes = Math.floor(timestamp / 60000);
                        
                        purchaseEvents.push({
                            itemId: event.itemId,
                            timestamp: timestamp,
                            minutes: minutes,
                            frame: frameIndex
                        });
                    }
                });
            }
        });

        // Сортируем по времени
        purchaseEvents.sort((a, b) => a.timestamp - b.timestamp);

        // Определяем стартовые предметы (купленные до 1:30 или первые 2-3 предмета)
        const startingThreshold = 90000; // 1:30 в миллисекундах
        const startingPurchases = purchaseEvents.filter(e => e.timestamp < startingThreshold);
        
        startingPurchases.forEach(e => {
            if (!startingItems.includes(e.itemId)) {
                startingItems.push(e.itemId);
            }
        });

        // Если стартовых предметов меньше 2, добавляем первые покупки
        if (startingItems.length < 2 && purchaseEvents.length > 0) {
            purchaseEvents.slice(0, 3).forEach(e => {
                if (!startingItems.includes(e.itemId)) {
                    startingItems.push(e.itemId);
                }
            });
        }

        // Определяем первый возврат на базу (первая покупка после 3 минут)
        const firstBackThreshold = 180000; // 3 минуты
        const firstBackPurchases = purchaseEvents.filter(e => 
            e.timestamp >= firstBackThreshold && e.timestamp < firstBackThreshold + 60000
        );
        
        firstBackPurchases.forEach(e => {
            if (!firstBackItems.includes(e.itemId)) {
                firstBackItems.push(e.itemId);
            }
        });

        // Полный порядок покупки полных предметов (исключая компоненты)
        // Компоненты: 1001-1082, 2003-2055, 3000-3099 (частично)
        const COMPONENT_IDS = new Set([
            1001, 1004, 1006, 1011, 1018, 1026, 1027, 1028, 1029, 1031, 1033, 1036, 1037, 1038, 1042, 1043, 1051, 1052, 1053, 1054, 1055, 1056, 1057, 1058, 1082,
            2003, 2031, 2033, 2055, 2138, 2139, 2140,
            3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011, 3012, 3013, 3014, 3015, 3016, 3017, 3018, 3019, 3020, 3021, 3022, 3023, 3024, 3025, 3026, 3027, 3028, 3029, 3030, 3031, 3032, 3033, 3034, 3035, 3036, 3037, 3038, 3039, 3040, 3041, 3042, 3043, 3044, 3045, 3046, 3047, 3048, 3049, 3050, 3051, 3052, 3053, 3054, 3055, 3056, 3057, 3058, 3059, 3060, 3061, 3062, 3063, 3064, 3065, 3066, 3067, 3068, 3069, 3070, 3071, 3072, 3073, 3074, 3075, 3076, 3077, 3078, 3079, 3080, 3081, 3082, 3083, 3084, 3085, 3086, 3087, 3088, 3089, 3090, 3091, 3092, 3093, 3094, 3095, 3096, 3097, 3098, 3099
        ]);

        const fullItemPurchases = [];
        const purchasedItems = new Set();
        
        purchaseEvents.forEach(e => {
            // Пропускаем компоненты, варды и зелья
            if (COMPONENT_IDS.has(e.itemId) || 
                (e.itemId >= 2000 && e.itemId < 2200) ||  // Расходники
                e.itemId === 3340 || e.itemId === 3364) {  // Trinkets
                return;
            }
            
            // Добавляем только уникальные полные предметы в порядке покупки
            if (!purchasedItems.has(e.itemId)) {
                purchasedItems.add(e.itemId);
                fullItemPurchases.push({
                    itemId: e.itemId,
                    timestamp: e.timestamp,
                    minutes: e.minutes
                });
            }
        });

        return {
            startingItems,
            firstBackItems,
            fullItemOrder: fullItemPurchases.map(p => p.itemId),
            itemPurchaseTimeline: fullItemPurchases
        };
    } catch (error) {
        return null;
    }
}

// === ДОБАВЛЕНИЕ ИГРЫ В ДАННЫЕ ===
function addGameToData(gameData) {
    const { championId, role } = gameData;
    
    if (!collectedData[championId]) {
        collectedData[championId] = {};
    }
    if (!collectedData[championId][role]) {
        collectedData[championId][role] = { games: [], totalGames: 0 };
    }
    
    collectedData[championId][role].games.push(gameData);
    collectedData[championId][role].totalGames++;
    
    if (!progress.championGames[championId]) {
        progress.championGames[championId] = 0;
    }
    progress.championGames[championId]++;
}

// === ПРОВЕРКА - НУЖНО ЛИ ЕЩЁ ИГР ===
function needMoreGames(championId) {
    return (progress.championGames[championId] || 0) < CONFIG.GAMES_PER_CHAMPION;
}

// === СОХРАНЕНИЕ ПРОГРЕССА ===
function saveProgress() {
    progress.lastSaved = Date.now();
    fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(collectedData, null, 2), 'utf8');
}

// === ЗАГРУЗКА ПРОГРЕССА ===
function loadProgress() {
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
        try {
            progress = JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf8'));
            console.log(`📊 Progress loaded: ${Object.keys(progress.championGames).length} champions`);
            
            // СБРОС прогресса чемпионов для нового сбора
            // Оставляем только processedPuuids (чтобы не дублировать игроков)
            console.log(`🔄 Resetting champion games for new collection...`);
            progress.championGames = {};
        } catch (e) {}
    }

    if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
        try {
            collectedData = JSON.parse(fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf8'));
            console.log(`📦 Data loaded: ${Object.keys(collectedData).length} champions`);
        } catch (e) {}
    }
}

// === СТАТИСТИКА СЕССИИ ===
function printSessionStats() {
    const duration = ((Date.now() - sessionStartTime) / 1000).toFixed(1);
    const h = Math.floor(duration / 3600);
    const m = Math.floor((duration % 3600) / 60);
    const s = Math.floor(duration % 60);
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 SESSION STATISTICS');
    console.log('='.repeat(70));
    console.log(`⏱️  Duration: ${h}h ${m}m ${s}s`);
    console.log(`📡 Requests: ${requestCounter}`);
    console.log(`🏆 Champions: ${Object.keys(collectedData).length}`);
    console.log(`🎮 Total games: ${Object.values(progress.championGames).reduce((a,b)=>a+b, 0)}`);
    console.log('='.repeat(70) + '\n');
}

// === ОСНОВНОЙ СБОР ===
async function collectData() {
    sessionStartTime = Date.now();
    
    console.log('\n🎮 FINAL TEST DATA COLLECTOR');
    console.log('='.repeat(70));
    console.log(`🎯 Games per champion: ${CONFIG.GAMES_PER_CHAMPION}`);
    console.log(`⏱️  Delay: ${CONFIG.REQUEST_DELAY_MS}ms`);
    console.log(`📁 Output: ${CONFIG.OUTPUT_FILE}`);
    console.log('='.repeat(70) + '\n');
    
    loadProgress();
    
    // 1. Получаем Мастер лигу
    console.log('1️⃣ Fetching Master League...');
    let masterLeague;
    try {
        masterLeague = await riotRequest(
            `https://${CONFIG.REGION}.api.riotgames.com/lol/league/v4/masterleagues/by-queue/RANKED_SOLO_5x5`
        );
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        printSessionStats();
        return;
    }
    
    if (!masterLeague?.entries) {
        console.error('❌ No Master league data');
        printSessionStats();
        return;
    }
    
    console.log(`✅ ${masterLeague.entries.length} players\n`);
    
    // 2. Собираем игры
    let gamesCollected = Object.values(progress.championGames).reduce((a,b)=>a+b, 0);
    let playersProcessed = progress.processedPuuids.length;
    
    for (const entry of masterLeague.entries) {
        const puuid = entry.puuid;
        const summonerName = entry.summonerName;
        
        if (!puuid) continue;
        if (progress.processedPuuids.includes(puuid)) continue;
        
        // Проверяем есть ли ещё чемпионы которым нужны игры
        const championsNeedingGames = Object.keys(collectedData).filter(
            c => needMoreGames(c)
        );
        
        // Если все чемпионы собрали по 10 игр - останавливаемся
        if (championsNeedingGames.length === 0 && gamesCollected > 0) {
            console.log('\n✅ All champions have 10 games each!\n');
            break;
        }
        
        playersProcessed++;
        
        try {
            // Получаем ID игр (последние 20 для разнообразия)
            const matchIds = await riotRequest(
                `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20&queue=420`
            );
            
            if (!matchIds || matchIds.length === 0) {
                progress.processedPuuids.push(puuid);
                continue;
            }
            
            // Берём первые 5 игр
            for (let i = 0; i < Math.min(5, matchIds.length); i++) {
                const matchId = matchIds[i];
                
                const match = await riotRequest(
                    `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/${matchId}`
                );
                
                if (!match?.info) continue;
                
                const participant = match.info.participants.find(p => p.puuid === puuid);
                if (!participant) continue;
                
                const championId = String(participant.championId);
                const role = participant.teamPosition || 'UNKNOWN';
                
                // Проверяем нужны ли ещё игры этому чемпиону
                if (!needMoreGames(championId)) continue;

                // Извлекаем skill order
                const skillOrder = await extractSkillOrder(matchId, participant.participantId);
                
                // Извлекаем порядок покупки предметов
                const itemPurchases = await extractItemPurchases(matchId, participant.participantId);

                // Создаём объект игры
                const gameData = {
                    matchId,
                    puuid,
                    summonerName,
                    championId,
                    role,
                    win: participant.win,
                    items: [participant.item0, participant.item1, participant.item2,
                           participant.item3, participant.item4, participant.item5].filter(it => it !== 0),
                    summoners: [participant.summoner1Id, participant.summoner2Id],
                    perks: {
                        primary: participant.perks?.styles?.[0]?.style,
                        keystone: participant.perks?.styles?.[0]?.selections?.[0]?.perk,
                        sub: participant.perks?.styles?.[1]?.style,
                        primaryRunes: participant.perks?.styles?.[0]?.selections?.map(s => s.perk) || [],
                        secondaryRunes: participant.perks?.styles?.[1]?.selections?.map(s => s.perk) || [],
                        shards: participant.perks?.statPerks ? [
                            participant.perks.statPerks.offense,
                            participant.perks.statPerks.flex,
                            participant.perks.statPerks.defense
                        ] : []
                    },
                    kda: {
                        kills: participant.kills || 0,
                        deaths: participant.deaths || 0,
                        assists: participant.assists || 0
                    },
                    cs: (participant.totalMinionsKilled || 0) + (participant.neutralMinionsKilled || 0),
                    gameDuration: (match.info.gameDuration || 0) * 1000,
                    skillOrder,
                    itemPurchases  // Порядок покупки предметов
                };
                
                // Добавляем в данные
                addGameToData(gameData);
                gamesCollected++;
                
                // Выводим прогресс
                const champGames = progress.championGames[championId];
                const status = champGames >= CONFIG.GAMES_PER_CHAMPION ? '✅' : '📊';
                console.log(`${status} ${championId} ${role}: ${champGames}/${CONFIG.GAMES_PER_CHAMPION} games`);
                
                // Проверяем skill order
                if (skillOrder && skillOrder.byLevel) {
                    const total = skillOrder.Q.length + skillOrder.W.length + skillOrder.E.length + skillOrder.R.length;
                    const hasMax = skillOrder.Q.length === 5 || skillOrder.W.length === 5 || skillOrder.E.length === 5;
                    const rLevels = skillOrder.R.length;
                    const realistic = total >= 15 && hasMax && rLevels >= 2;
                    if (!realistic) {
                        console.log(`   ⚠️ Unrealistic SO: Q:${skillOrder.Q.length}x W:${skillOrder.W.length}x E:${skillOrder.E.length}x R:${rLevels}x`);
                    }
                }
                
                // Сохраняем каждые 10 игр
                if (gamesCollected % 10 === 0) {
                    saveProgress();
                }
                
                // Задержка
                await new Promise(r => setTimeout(r, CONFIG.REQUEST_DELAY_MS));
            }
            
            progress.processedPuuids.push(puuid);
            
            // Сохраняем каждые 5 игроков
            if (playersProcessed % 5 === 0) {
                saveProgress();
                console.log(`\n💾 Saved progress (${playersProcessed} players processed)\n`);
            }
            
        } catch (error) {
            console.error(`❌ ${summonerName}: ${error.message}`);
            progress.processedPuuids.push(puuid);
        }
    }
    
    // Финальное сохранение
    saveProgress();
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 COLLECTION COMPLETE!');
    console.log('='.repeat(70));
    console.log(`📊 Players processed: ${playersProcessed}`);
    console.log(`🏆 Champions: ${Object.keys(collectedData).length}`);
    console.log(`🎮 Total games: ${gamesCollected}`);
    
    // Статистика по чемпионам
    console.log('\n📊 Champions breakdown:');
    Object.entries(collectedData).forEach(([champId, roles]) => {
        const totalGames = Object.values(roles).reduce((sum, r) => sum + r.totalGames, 0);
        const roleList = Object.keys(roles).join(', ');
        console.log(`   ${champId}: ${totalGames} games (${roleList})`);
    });
    
    printSessionStats();
}

// === ОБРАБОТКА ПРЕРЫВАНИЙ ===
process.on('SIGINT', () => {
    console.log('\n\n⚠️  SIGINT (Ctrl+C)');
    saveProgress();
    printSessionStats();
    console.log('✅ Progress saved. Exiting.');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n⚠️  SIGTERM');
    saveProgress();
    printSessionStats();
    process.exit(0);
});

// === ЗАПУСК ===
collectData().catch(err => {
    console.error('\n💥 CRASH:', err.message);
    console.error(err.stack);
    saveProgress();
    printSessionStats();
    process.exit(1);
});
