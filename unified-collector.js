/**
 * LoL Stats EUW - Unified Collector (Stats + Skill Order)
 * 
 * Собирает ВСЁ сразу:
 * - Предметы, руны, заклинания
 * - Порядок прокачки умений (skill order)
 * - Pro builds с Timeline данными
 * 
 * Запуск: node unified-collector.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

// === КОНФИГУРАЦИЯ ===
const CONFIG = {
    RIOT_API_KEY: process.env.RIOT_API_KEY,
    REGION: 'euw1',
    REGION_ROUTE: 'europe',
    
    // Лимиты сбора
    TARGET_GAMES_PER_CHAMPION: parseInt(process.env.TARGET_GAMES) || 1000,
    MAX_PLAYERS_PER_RUN: parseInt(process.env.MAX_PLAYERS) || 200,
    GAMES_PER_PLAYER: parseInt(process.env.GAMES_PER_PLAYER) || 20,
    
    // Фильтр по тиру (только Master+)
    INCLUDE_MASTER: true,
    INCLUDE_GRANDMASTER: true,
    INCLUDE_CHALLENGER: true,
    
    // Собирать skill order для каждой игры
    COLLECT_SKILL_ORDER: true,
    
    // Rate limiting
    REQUEST_DELAY_MS: parseInt(process.env.REQUEST_DELAY) || 2000,  // 2 сек (безопасно для 2 запросов)
    RATE_LIMIT_RETRY_DELAY_MS: 12000,
    MAX_RETRIES: 5,
    REQUEST_TIMEOUT_MS: 20000,
    
    // Кэширование
    CACHE_RANKS: true,
    AUTO_SAVE_EVERY_N_PLAYERS: 5,
    
    // Логирование
    DEBUG_LOGS: process.env.DEBUG_LOGS === 'true',
    LOG_TO_FILE: true,
    LOG_TO_CONSOLE: process.env.LOG_TO_CONSOLE !== 'false',
    
    // Пути
    CACHE_DIR: process.env.CACHE_DIR || path.join(__dirname, 'cache'),
    STATS_FILE: process.env.STATS_FILE || path.join(__dirname, 'cache', 'full-analytics-stats.json'),
    PROGRESS_FILE: process.env.PROGRESS_FILE || path.join(__dirname, 'cache', 'unified-progress.json'),
    SKILL_ORDERS_FILE: process.env.SKILL_ORDERS_FILE || path.join(__dirname, 'cache', 'skill-orders.json'),
    LOG_FILE: process.env.LOG_FILE || path.join(__dirname, 'cache', 'unified-collector.log')
};

// Создаём папку кэша
if (!fs.existsSync(CONFIG.CACHE_DIR)) {
    fs.mkdirSync(CONFIG.CACHE_DIR, { recursive: true });
}

if (!CONFIG.RIOT_API_KEY) {
    console.error('❌ ERROR: RIOT_API_KEY not found in .env');
    process.exit(1);
}

// === ГЛОБАЛЬНОЕ СОСТОЯНИЕ ===
let collectedStats = {};
let skillOrders = {};
let progress = {
    processedPuuids: [],
    totalGamesCollected: 0,
    championsGamesCount: {},
    skillOrdersCollected: 0,
    lastSavedTimestamp: null
};
let ranksCache = {};
let playerTierCache = {};

let requestCounter = 0;
let errorCounter = 0;
let rateLimitHits = 0;
let sessionStartTime = 0;

// === ЛОГИРОВАНИЕ ===
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}`;
    
    if (CONFIG.LOG_TO_CONSOLE) {
        console.log(logLine);
    }
    
    if (CONFIG.LOG_TO_FILE && CONFIG.LOG_FILE) {
        try {
            fs.appendFileSync(CONFIG.LOG_FILE, logLine + '\n', 'utf8');
        } catch (e) {}
    }
}

// === ЗАГРУЗКА/СОХРАНЕНИЕ ===
function loadProgress() {
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
        try {
            progress = JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf8'));
            log(`📊 Progress loaded: ${progress.processedPuuids.length} players, ${progress.totalGamesCollected} games, ${progress.skillOrdersCollected} skill orders`, 'INFO');
        } catch (e) {}
    }
    
    if (fs.existsSync(CONFIG.SKILL_ORDERS_FILE)) {
        try {
            skillOrders = JSON.parse(fs.readFileSync(CONFIG.SKILL_ORDERS_FILE, 'utf8'));
            log(`📦 Skill orders loaded: ${Object.keys(skillOrders).length}`, 'INFO');
        } catch (e) {}
    }
    
    if (fs.existsSync(CONFIG.STATS_FILE)) {
        try {
            collectedStats = JSON.parse(fs.readFileSync(CONFIG.STATS_FILE, 'utf8'));
            log(`📦 Stats loaded: ${Object.keys(collectedStats).length} champions`, 'INFO');
        } catch (e) {}
    }
}

function saveProgress() {
    progress.lastSavedTimestamp = Date.now();
    fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
    fs.writeFileSync(CONFIG.SKILL_ORDERS_FILE, JSON.stringify(skillOrders, null, 2), 'utf8');
    fs.writeFileSync(CONFIG.STATS_FILE, JSON.stringify(collectedStats, null, 2), 'utf8');
    log(`💾 Progress saved`, 'INFO');
}

// === RIOT API REQUEST ===
async function riotRequest(url, retryCount = 0) {
    requestCounter++;
    
    try {
        const res = await axios.get(url, {
            headers: {
                'X-Riot-Token': CONFIG.RIOT_API_KEY,
                'User-Agent': 'LoL-Unified-Collector/3.0'
            },
            httpsAgent: insecureAgent,
            timeout: CONFIG.REQUEST_TIMEOUT_MS
        });
        
        return res.data;
    } catch (error) {
        errorCounter++;
        
        if (error.response) {
            const status = error.response.status;
            
            if (status === 429) {
                rateLimitHits++;
                const retryAfter = error.response.headers['retry-after'] || 12;
                log(`🚫 RATE LIMIT! Waiting ${retryAfter}s...`, 'WARN');
                await new Promise(r => setTimeout(r, retryAfter * 1000));
                return riotRequest(url, retryCount + 1);
            }
            
            if (status === 403) throw new Error('403 Forbidden - Check API key');
            if (status === 404) return null;
            if (status === 401) throw new Error('401 Unauthorized');
        }
        
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
            if (retryCount < CONFIG.MAX_RETRIES) {
                log(`⏳ ${error.code}. Retry ${retryCount + 1}/${CONFIG.MAX_RETRIES}...`, 'WARN');
                await new Promise(r => setTimeout(r, 2000));
                return riotRequest(url, retryCount + 1);
            }
        }
        
        throw error;
    }
}

// === ПОЛУЧЕНИЕ РАНГА ===
async function getPlayerRank(puuid) {
    if (CONFIG.CACHE_RANKS && playerTierCache[puuid]) {
        const c = playerTierCache[puuid];
        const eligible = 
            (c.tier === 'CHALLENGER' && CONFIG.INCLUDE_CHALLENGER) ||
            (c.tier === 'GRANDMASTER' && CONFIG.INCLUDE_GRANDMASTER) ||
            (c.tier === 'MASTER' && CONFIG.INCLUDE_MASTER);
        return { ...c, eligible };
    }
    
    try {
        const entries = await riotRequest(
            `https://${CONFIG.REGION}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`
        );
        
        if (!entries || entries.length === 0) {
            playerTierCache[puuid] = { rank: 'Unranked', tier: 'Unranked', lp: 0 };
            return { ...playerTierCache[puuid], eligible: false };
        }
        
        const solo = entries.find(e => e.queueType === 'RANKED_SOLO_5x5');
        if (solo) {
            const { tier, rank, leaguePoints: lp } = solo;
            playerTierCache[puuid] = { rank: `${tier} ${rank}`, tier, lp };
            const eligible = 
                (tier === 'CHALLENGER' && CONFIG.INCLUDE_CHALLENGER) ||
                (tier === 'GRANDMASTER' && CONFIG.INCLUDE_GRANDMASTER) ||
                (tier === 'MASTER' && CONFIG.INCLUDE_MASTER);
            return { ...playerTierCache[puuid], eligible };
        }
        
        return { rank: 'Unranked', tier: 'Unranked', lp: 0, eligible: false };
    } catch (error) {
        return { rank: 'Unknown', tier: 'Unknown', lp: 0, eligible: false };
    }
}

// === ИЗВЛЕЧЕНИЕ SKILL ORDER ===
async function extractSkillOrder(matchId, participantId) {
    if (!CONFIG.COLLECT_SKILL_ORDER) return null;

    try {
        const timeline = await riotRequest(
            `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`
        );

        if (!timeline?.info?.frames) return null;

        // Собираем SKILL_LEVEL_UP события
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

        // Сортируем по времени
        events.sort((a, b) => a.timestamp - b.timestamp);

        // Создаём массив прокачки по уровням (1-18)
        const skillOrderByLevel = new Array(18).fill(null);
        let levelIndex = 0;

        events.forEach(event => {
            if (event.skill > 0 && event.skill < 5 && levelIndex < 18) {
                skillOrderByLevel[levelIndex] = event.skill; // 1=Q, 2=W, 3=E, 4=R
                levelIndex++;
            }
        });

        // Сохраняем как объект с уровнями
        const skillOrder = {
            byLevel: skillOrderByLevel.map(s => s === 1 ? 'Q' : s === 2 ? 'W' : s === 3 ? 'E' : s === 4 ? 'R' : null).filter(s => s),
            Q: [], W: [], E: [], R: []
        };

        // Считаем сколько раз прокачали каждый скилл
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

// === ДОБАВЛЕНИЕ ИГРЫ ===
function addGameToStats(champId, role, participant, puuid, matchId, gameDurationMs, playerRank, playerTier, skillOrder) {
    if (!champId || !role || role === 'UNKNOWN') return false;
    
    const id = String(champId);
    if (!collectedStats[id]) {
        collectedStats[id] = { id, roles: {}, total_games: 0, matches: [] };
    }
    if (!collectedStats[id].roles[role]) {
        collectedStats[id].roles[role] = { games: 0, wins: 0, builds: {} };
    }
    
    const items = [participant.item0, participant.item1, participant.item2,
                   participant.item3, participant.item4, participant.item5].filter(it => it !== 0);
    
    let primary = 0, keystone = 0, sub = 0;
    let primaryRunes = [], secondaryRunes = [], shards = [];
    
    if (participant.perks?.styles) {
        if (participant.perks.styles.length > 0) {
            const s = participant.perks.styles[0];
            primary = s.style;
            s.selections.forEach(sel => primaryRunes.push(sel.perk));
            if (s.selections.length) keystone = s.selections[0].perk;
        }
        if (participant.perks.styles.length > 1) {
            const s = participant.perks.styles[1];
            sub = s.style;
            s.selections.forEach(sel => secondaryRunes.push(sel.perk));
        }
        if (participant.perks.statPerks) {
            shards = [participant.perks.statPerks.offense, participant.perks.statPerks.flex, participant.perks.statPerks.defense];
        }
    }
    
    const buildKey = `${items.slice(0, 2).join('-')}|${keystone}`;
    const roleData = collectedStats[id].roles[role];
    
    roleData.games++;
    if (participant.win) roleData.wins++;
    collectedStats[id].total_games++;
    progress.totalGamesCollected++;
    
    if (!roleData.builds[buildKey]) {
        roleData.builds[buildKey] = { 
            games: 0, 
            wins: 0, 
            items, 
            summoner1: participant.summoner1Id, 
            summoner2: participant.summoner2Id, 
            perks: { primary, keystone, sub, primaryRunes, secondaryRunes, shards },
            skillOrders: []  // Массив skill orders для этого билда
        };
    }
    roleData.builds[buildKey].games++;
    if (participant.win) roleData.builds[buildKey].wins++;
    
    // Добавляем skill order если есть
    if (skillOrder) {
        roleData.builds[buildKey].skillOrders.push({
            matchId,
            skillOrder
        });
        progress.skillOrdersCollected++;
    }
    
    // Сохраняем в matches для Pro Builds (только с skill order)
    if (collectedStats[id].matches.length < 100 && skillOrder) {
        collectedStats[id].matches.push({
            matchId, puuid, summonerName: participant.summonerName || 'Unknown',
            playerRank, playerTier, role, win: participant.win, items,
            summoner1: participant.summoner1Id, summoner2: participant.summoner2Id,
            perks: { primary, keystone, sub, primaryRunes, secondaryRunes, shards },
            kills: participant.kills || 0, deaths: participant.deaths || 0, assists: participant.assists || 0,
            cs: (participant.totalMinionsKilled || 0) + (participant.neutralMinionsKilled || 0),
            gameDuration: gameDurationMs,
            skillOrder,  // Skill order для Pro Builds
            tier: participant.challengeData?.challengeScores?.tier || 'Unknown'
        });
    }
    
    // Сохраняем в отдельный skill orders файл
    if (skillOrder) {
        skillOrders[matchId] = {
            timestamp: Date.now(),
            skillOrder,
            champId: id,
            role
        };
    }
    
    if (!progress.championsGamesCount[id]) progress.championsGamesCount[id] = 0;
    progress.championsGamesCount[id]++;
    
    return true;
}

// === ОСНОВНОЙ СБОР ===
async function collectData() {
    sessionStartTime = Date.now();
    
    log('='.repeat(70), 'INFO');
    log('🎮 LoL Stats EUW - UNIFIED COLLECTOR (Stats + Skill Order)', 'INFO');
    log('='.repeat(70), 'INFO');
    log(`🎯 Target: ${CONFIG.TARGET_GAMES_PER_CHAMPION} games/champion`, 'INFO');
    log(`👥 Players: ${CONFIG.MAX_PLAYERS_PER_RUN}`, 'INFO');
    log(`🎮 Games/player: ${CONFIG.GAMES_PER_PLAYER}`, 'INFO');
    log(`⏱️  Delay: ${CONFIG.REQUEST_DELAY_MS}ms`, 'INFO');
    log(`📊 Collect Skill Order: ${CONFIG.COLLECT_SKILL_ORDER ? 'YES' : 'NO'}`, 'INFO');
    log('='.repeat(70), 'INFO');
    
    loadProgress();
    
    log('1️⃣ Fetching Master League...', 'INFO');
    let masterLeague;
    try {
        masterLeague = await riotRequest(`https://${CONFIG.REGION}.api.riotgames.com/lol/league/v4/masterleagues/by-queue/RANKED_SOLO_5x5`);
    } catch (error) {
        log(`❌ Master league error: ${error.message}`, 'ERROR');
        return;
    }
    
    if (!masterLeague?.entries) {
        log('❌ No Master league data', 'ERROR');
        return;
    }
    
    const newEntries = masterLeague.entries.filter(e => !progress.processedPuuids.includes(e.puuid));
    log(`✅ Master league: ${masterLeague.entries.length} players`, 'INFO');
    log(`🆕 New: ${newEntries.length} players`, 'INFO');
    
    if (newEntries.length === 0) {
        log('ℹ️  All players processed', 'INFO');
        saveProgress();
        return;
    }
    
    const targets = newEntries.slice(0, CONFIG.MAX_PLAYERS_PER_RUN);
    log(`📋 Processing: ${targets.length} players\n`, 'INFO');
    
    let totalMatches = 0;
    let processedCount = 0;
    
    for (let i = 0; i < targets.length; i++) {
        const entry = targets[i];
        const puuid = entry.puuid;
        const summonerName = entry.summonerName;
        
        if (!puuid || progress.processedPuuids.includes(puuid)) continue;
        
        processedCount++;
        
        try {
            const playerInfo = await getPlayerRank(puuid);
            
            if (!playerInfo.eligible) {
                progress.lowTierSkipped = (progress.lowTierSkipped || 0) + 1;
                progress.processedPuuids.push(puuid);
                continue;
            }
            
            log(`🎯 ${summonerName}: ${playerInfo.rank} (${playerInfo.lp} LP)`, 'INFO');
            
            const matchIds = await riotRequest(
                `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${CONFIG.GAMES_PER_PLAYER}&queue=420`
            );
            
            if (!matchIds || matchIds.length === 0) {
                progress.processedPuuids.push(puuid);
                continue;
            }
            
            for (let matchIdx = 0; matchIdx < matchIds.length; matchIdx++) {
                const matchId = matchIds[matchIdx];
                
                // 1. Получаем данные матча
                const match = await riotRequest(
                    `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/${matchId}`
                );
                
                if (!match || !match.info) continue;
                
                const participant = match.info.participants.find(p => p.puuid === puuid);
                if (!participant) continue;
                
                // participantId в Match и Timeline API одинаковый (1-10)
                const participantId = participant.participantId;
                
                // 3. Извлекаем skill order (если включено)
                let skillOrder = null;
                if (CONFIG.COLLECT_SKILL_ORDER) {
                    skillOrder = await extractSkillOrder(matchId, participantId);
                    if (skillOrder) {
                        log(`   ✅ ${matchId}: Q[${skillOrder.Q.join(',')}] W[${skillOrder.W.join(',')}] E[${skillOrder.E.join(',')}] R[${skillOrder.R.join(',')}]`, 'DEBUG');
                    }
                }
                
                // 4. Добавляем игру в статистику
                const champId = String(participant.championId);
                const currentGames = progress.championsGamesCount[champId] || 0;
                
                if (currentGames < CONFIG.TARGET_GAMES_PER_CHAMPION) {
                    const gameDurationMs = (match.info.gameDuration || 0) * 1000;
                    const added = addGameToStats(
                        champId, 
                        participant.teamPosition, 
                        participant, 
                        puuid, 
                        matchId, 
                        gameDurationMs, 
                        playerInfo.rank,
                        playerInfo.tier,
                        skillOrder
                    );
                    
                    if (added) {
                        totalMatches++;
                        const gamesCount = progress.championsGamesCount[champId];
                        const status = gamesCount >= CONFIG.TARGET_GAMES_PER_CHAMPION ? '✅' : '📊';
                        const soStatus = skillOrder ? ' +SO' : '';
                        log(`   ${status}${soStatus} ${champId} (${participant.teamPosition}) | ${gamesCount}/${CONFIG.TARGET_GAMES_PER_CHAMPION}`, 'INFO');
                    }
                }
                
                if (matchIdx < matchIds.length - 1) {
                    await new Promise(r => setTimeout(r, CONFIG.REQUEST_DELAY_MS));
                }
            }
            
            progress.processedPuuids.push(puuid);
            
            if (processedCount % CONFIG.AUTO_SAVE_EVERY_N_PLAYERS === 0) {
                saveProgress();
            }
            
            if (i < targets.length - 1) {
                await new Promise(r => setTimeout(r, CONFIG.REQUEST_DELAY_MS));
            }
            
        } catch (err) {
            log(`   ❌ ${summonerName}: ${err.message}`, 'ERROR');
            progress.processedPuuids.push(puuid);
        }
    }
    
    saveProgress();
    
    log('='.repeat(70), 'INFO');
    log(`🎉 COLLECTION COMPLETE!`, 'INFO');
    log(`📊 Players: ${processedCount}`, 'INFO');
    log(`🎮 Games: ${totalMatches}`, 'INFO');
    log(`📈 Total: ${progress.totalGamesCollected}`, 'INFO');
    log(`🏆 Champions: ${Object.keys(collectedStats).length}`, 'INFO');
    log(`📊 Skill orders: ${progress.skillOrdersCollected}`, 'INFO');
    log('='.repeat(70), 'INFO');
}

// === ОБРАБОТКА ПРЕРЫВАНИЙ ===
process.on('SIGINT', () => { log('\n⚠️  SIGINT', 'WARN'); saveProgress(); process.exit(0); });
process.on('SIGTERM', () => { log('\n⚠️  SIGTERM', 'WARN'); saveProgress(); process.exit(0); });

// === ЗАПУСК ===
collectData().catch(err => { 
    log(`💥 CRASH: ${err.message}`, 'ERROR'); 
    log(err.stack, 'ERROR');
    saveProgress(); 
    process.exit(1); 
});
