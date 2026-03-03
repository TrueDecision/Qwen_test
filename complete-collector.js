/**
 * Complete Data Collector - Stats + Skill Orders
 * 
 * Собирает ВСЁ за один проход:
 * - Предметы, руны, заклинания
 * - KDA, CS, длительность
 * - Skill Order (порядок прокачки)
 * 
 * Запуск: node complete-collector.js [количество_игр]
 * Пример: node complete-collector.js 10
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
    MAX_GAMES: parseInt(process.argv[2]) || 10,  // Из командной строки
    REQUEST_DELAY_MS: 2000,
    REQUEST_TIMEOUT_MS: 20000,
    OUTPUT_FILE: path.join(__dirname, 'test-games-output.json')
};

// === RIOT API REQUEST ===
async function riotRequest(url, retryCount = 0) {
    try {
        const res = await axios.get(url, {
            headers: {
                'X-Riot-Token': CONFIG.RIOT_API_KEY,
                'User-Agent': 'Complete-Collector/1.0'
            },
            httpsAgent: insecureAgent,
            timeout: CONFIG.REQUEST_TIMEOUT_MS
        });
        return res.data;
    } catch (error) {
        if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'] || 12;
            console.log(`🚫 Rate limit! Waiting ${retryAfter}s...`);
            await new Promise(r => setTimeout(r, retryAfter * 1000));
            return riotRequest(url, retryCount + 1);
        }
        if (error.response?.status === 404) return null;
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
                skillOrderByLevel[levelIndex] = event.skill;
                levelIndex++;
            }
        });

        // Сохраняем как объект
        const skillOrder = {
            byLevel: skillOrderByLevel.map(s => 
                s === 1 ? 'Q' : s === 2 ? 'W' : s === 3 ? 'E' : s === 4 ? 'R' : null
            ).filter(s => s),
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

// === СБОР ДАННЫХ ===
async function collectGames() {
    console.log('\n🎮 COMPLETE DATA COLLECTOR\n');
    console.log('='.repeat(70));
    console.log(`🎯 Games to collect: ${CONFIG.MAX_GAMES}`);
    console.log(`⏱️  Delay: ${CONFIG.REQUEST_DELAY_MS}ms`);
    console.log('='.repeat(70) + '\n');

    // 1. Получаем Мастер лигу
    console.log('1️⃣ Fetching Master League...');
    const masterLeague = await riotRequest(
        `https://${CONFIG.REGION}.api.riotgames.com/lol/league/v4/masterleagues/by-queue/RANKED_SOLO_5x5`
    );

    if (!masterLeague?.entries) {
        console.error('❌ No Master league data');
        return;
    }

    console.log(`   ✅ ${masterLeague.entries.length} players\n`);

    // 2. Собираем игры
    const collectedGames = [];
    let gamesCollected = 0;
    let playersProcessed = 0;

    for (const entry of masterLeague.entries) {
        if (gamesCollected >= CONFIG.MAX_GAMES) break;
        
        const puuid = entry.puuid;
        const summonerName = entry.summonerName;
        
        if (!puuid) continue;
        playersProcessed++;

        try {
            // Получаем ID игр
            const matchIds = await riotRequest(
                `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=5&queue=420`
            );

            if (!matchIds || matchIds.length === 0) continue;

            // Берём первую игру
            const matchId = matchIds[0];
            
            // Получаем данные матча
            const match = await riotRequest(
                `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/${matchId}`
            );

            if (!match?.info) continue;

            // Находим участника
            const participant = match.info.participants.find(p => p.puuid === puuid);
            if (!participant) continue;

            console.log(`${gamesCollected + 1}. ${summonerName} - ${participant.championId} (${participant.teamPosition})`);

            // Извлекаем skill order
            const skillOrder = await extractSkillOrder(matchId, participant.participantId);

            // Сохраняем данные
            const gameData = {
                matchId,
                summonerName,
                championId: participant.championId,
                role: participant.teamPosition,
                win: participant.win,
                // Предметы (6 слотов)
                items: [participant.item0, participant.item1, participant.item2,
                       participant.item3, participant.item4, participant.item5].filter(it => it !== 0),
                // Заклинания
                summoners: [participant.summoner1Id, participant.summoner2Id],
                // Руны
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
                // KDA
                kda: {
                    kills: participant.kills,
                    deaths: participant.deaths,
                    assists: participant.assists
                },
                // CS
                cs: (participant.totalMinionsKilled || 0) + (participant.neutralMinionsKilled || 0),
                // Длительность
                gameDuration: (match.info.gameDuration || 0) * 1000,
                // Skill Order
                skillOrder: skillOrder
            };

            collectedGames.push(gameData);
            gamesCollected++;

            // Показываем ВСЕ данные
            console.log(`   Champion: ${participant.championId} (${participant.teamPosition})`);
            console.log(`   Win: ${participant.win ? 'WIN' : 'LOSE'}`);
            console.log(`   Items: ${gameData.items.join(', ')}`);
            console.log(`   Summoners: ${gameData.summoners.join(', ')}`);
            console.log(`   Runes:`);
            console.log(`      Primary: ${gameData.perks.primary} (Keystone: ${gameData.perks.keystone})`);
            console.log(`      Secondary: ${gameData.perks.sub}`);
            console.log(`      Primary Runes: ${gameData.perks.primaryRunes.join(', ') || 'none'}`);
            console.log(`      Secondary Runes: ${gameData.perks.secondaryRunes.join(', ') || 'none'}`);
            console.log(`      Shards: ${gameData.perks.shards.join(', ') || 'none'}`);
            console.log(`   KDA: ${gameData.kda.kills}/${gameData.kda.deaths}/${gameData.kda.assists}`);
            console.log(`   CS: ${gameData.cs}`);
            console.log(`   Duration: ${Math.round(gameData.gameDuration / 60000)} min`);
            
            // Skill order
            if (skillOrder && skillOrder.byLevel) {
                console.log(`   Skill Order: ${skillOrder.byLevel.join(' → ')}`);
                console.log(`   Summary: Q:${skillOrder.Q.length}x W:${skillOrder.W.length}x E:${skillOrder.E.length}x R:${skillOrder.R.length}x`);
                
                // Проверка реалистичности
                const total = skillOrder.Q.length + skillOrder.W.length + skillOrder.E.length + skillOrder.R.length;
                const hasMax = skillOrder.Q.length === 5 || skillOrder.W.length === 5 || skillOrder.E.length === 5;
                const rLevels = skillOrder.R.length;
                const realistic = total >= 15 && hasMax && rLevels >= 2;
                console.log(`   ${realistic ? '✅' : '⚠️'} Realistic: ${realistic ? 'YES' : 'NO'} (Total: ${total}, Max: ${hasMax ? 'YES' : 'NO'}, R: ${rLevels})`);
            } else {
                console.log(`   ⚠️ No skill order data`);
            }
            console.log('');

            // Задержка
            if (gamesCollected < CONFIG.MAX_GAMES) {
                await new Promise(r => setTimeout(r, CONFIG.REQUEST_DELAY_MS));
            }

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    }

    // 3. Сохраняем результат
    console.log('='.repeat(70));
    console.log(`\n💾 Saving to ${CONFIG.OUTPUT_FILE}...\n`);
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(collectedGames, null, 2));

    console.log('📊 RESULTS:');
    console.log(`   Games collected: ${collectedGames.length}`);
    console.log(`   Players processed: ${playersProcessed}`);
    
    const withSkillOrder = collectedGames.filter(g => g.skillOrder).length;
    console.log(`   With skill order: ${withSkillOrder}`);
    
    const realistic = collectedGames.filter(g => {
        const so = g.skillOrder;
        if (!so || !so.byLevel) return false;
        const total = so.Q.length + so.W.length + so.E.length + so.R.length;
        const hasMax = so.Q.length === 5 || so.W.length === 5 || so.E.length === 5;
        const rLevels = so.R.length;
        return total >= 15 && hasMax && rLevels >= 2;
    }).length;
    
    console.log(`   Realistic skill orders: ${realistic}`);
    console.log('\n' + '='.repeat(70) + '\n');
}

// === ЗАПУСК ===
collectGames().catch(err => {
    console.error('\n💥 CRASH:', err.message);
    process.exit(1);
});
