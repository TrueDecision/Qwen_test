/**
 * Test Skill Order Collection - 10 games
 * 
 * Тестирует новую логику извлечения skill order на 10 случайных играх
 */

require('dotenv').config();
const axios = require('axios');
const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

const CONFIG = {
    RIOT_API_KEY: process.env.RIOT_API_KEY,
    REGION_ROUTE: 'europe'
};

// Тестовые матчи (возьмём из известных EUW матчей)
const TEST_MATCH_IDS = [
    'EUW1_7758083954',
    'EUW1_7757795359',
    'EUW1_7758300044',
    'EUW1_7755885816',
    'EUW1_7754958880',
    'EUW1_7758590407',
    'EUW1_7758320476',
    'EUW1_7757238806',
    'EUW1_7756840803',
    'EUW1_7755402569'
];

async function riotRequest(url) {
    return await axios.get(url, {
        headers: {
            'X-Riot-Token': CONFIG.RIOT_API_KEY,
            'User-Agent': 'SkillOrder-Test/1.0'
        },
        httpsAgent: insecureAgent,
        timeout: 20000
    });
}

async function extractSkillOrder(matchId, participantId) {
    try {
        const timeline = await riotRequest(
            `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`
        );

        if (!timeline?.data?.info?.frames) return null;

        // Собираем SKILL_LEVEL_UP события
        const events = [];
        timeline.data.info.frames.forEach(frame => {
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

        // Считаем какой по счёту этот скилл прокачивается
        const skillCount = { 1: 0, 2: 0, 3: 0, 4: 0 };
        const skillOrder = { Q: [], W: [], E: [], R: [] };
        const skillNames = { 1: 'Q', 2: 'W', 3: 'E', 4: 'R' };

        events.forEach(event => {
            if (event.skill > 0 && event.skill < 5) {
                skillCount[event.skill]++;
                const level = skillCount[event.skill]; // 1-я, 2-я, 3-я прокачка
                const skillName = skillNames[event.skill];
                skillOrder[skillName].push(level);
            }
        });

        return skillOrder;
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return null;
    }
}

async function testSkillOrders() {
    console.log('\n🧪 SKILL ORDER TEST - 10 GAMES\n');
    console.log('='.repeat(70) + '\n');

    let success = 0;
    let failed = 0;

    for (let i = 0; i < TEST_MATCH_IDS.length; i++) {
        const matchId = TEST_MATCH_IDS[i];
        console.log(`${i + 1}. ${matchId}...`);

        try {
            // Получаем данные матча
            const matchRes = await riotRequest(
                `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/${matchId}`
            );

            if (!matchRes?.data?.info?.participants || matchRes.data.info.participants.length === 0) {
                console.log('   ⚪ No participants');
                failed++;
                continue;
            }

            // Берём первого участника
            const participant = matchRes.data.info.participants[0];
            const participantId = participant.participantId; // Match и Timeline API используют 1-10
            const champId = participant.championId;
            const role = participant.teamPosition;

            console.log(`   🏆 ${champId} - ${role} (participantId: ${participantId})`);

            // Извлекаем skill order
            const skillOrder = await extractSkillOrder(matchId, participantId);

            if (!skillOrder) {
                console.log('   ❌ No skill order data');
                failed++;
                continue;
            }

            // Проверяем реалистичность
            const totalPoints = skillOrder.Q.length + skillOrder.W.length + skillOrder.E.length + skillOrder.R.length;
            const hasMaxSkill = skillOrder.Q.length === 5 || skillOrder.W.length === 5 || skillOrder.E.length === 5;
            const rLevels = skillOrder.R.length;
            const realistic = totalPoints >= 15 && hasMaxSkill && rLevels >= 2;

            // Создаём порядок по уровням
            const skillOrderByLevel = new Array(18).fill(null);
            let levelIdx = 0;
            events.forEach(e => {
                if (e.skill > 0 && e.skill < 5 && levelIdx < 18) {
                    skillOrderByLevel[levelIdx] = e.skill === 1 ? 'Q' : e.skill === 2 ? 'W' : e.skill === 3 ? 'E' : 'R';
                    levelIdx++;
                }
            });

            console.log('   Skill Order:');
            for (let i = 0; i < 18; i++) {
                if (skillOrderByLevel[i]) {
                    console.log(`      L${i+1}: ${skillOrderByLevel[i]}`);
                }
            }
            console.log(`   ✅ Realistic: ${realistic ? 'YES' : 'NO'} (Total: ${totalPoints}, Max: ${hasMaxSkill ? 'YES' : 'NO'}, R: ${rLevels})`);

            success++;

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            failed++;
        }

        // Задержка между запросами
        if (i < TEST_MATCH_IDS.length - 1) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`\n📊 RESULTS: ${success} success, ${failed} failed\n`);
    console.log('💡 EXPECTED PATTERN:');
    console.log('   - One skill: 5 points (maxed)');
    console.log('   - One skill: 3-4 points');
    console.log('   - One skill: 1-2 points');
    console.log('   - R: 2-3 points (levels 6, 11, 16)');
    console.log('   - Total: 15-18 skill points\n');
}

testSkillOrders().catch(console.error);
