/**
 * Debug Timeline API
 * 
 * Показывает что возвращает Timeline API
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

async function debugTimeline() {
    console.log('\n🔍 DEBUG TIMELINE API\n');
    console.log('='.repeat(70) + '\n');

    const testMatchId = 'EUW1_7758083954';

    try {
        // 1. Получаем данные матча
        console.log('1️⃣ Fetching match data...');
        const matchRes = await axios.get(
            `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/${testMatchId}`,
            {
                headers: { 'X-Riot-Token': CONFIG.RIOT_API_KEY, 'User-Agent': 'Debug/1.0' },
                httpsAgent: insecureAgent,
                timeout: 20000
            }
        );

        // Берём первого участника
        const participant = matchRes.data.info.participants[0];
        const matchParticipantId = participant.participantId; // Match API: 1-10
        const champId = participant.championId;
        const role = participant.teamPosition;

        console.log(`   🏆 Champion: ${champId} - ${role}`);
        console.log(`   Match API participantId: ${matchParticipantId}`);
        console.log('');

        // 2. Получаем Timeline
        console.log('2️⃣ Fetching timeline...');
        const timelineRes = await axios.get(
            `https://${CONFIG.REGION_ROUTE}.api.riotgames.com/lol/match/v5/matches/${testMatchId}/timeline`,
            {
                headers: { 'X-Riot-Token': CONFIG.RIOT_API_KEY, 'User-Agent': 'Debug/1.0' },
                httpsAgent: insecureAgent,
                timeout: 20000
            }
        );

        const frames = timelineRes.data.info.frames;
        console.log(`   📊 Frames: ${frames.length}`);
        console.log('');

        // 3. Ищем SKILL_LEVEL_UP события для ВСЕХ участников
        console.log('3️⃣ Searching for ALL SKILL_LEVEL_UP events...\n');

        const allParticipantEvents = {};

        frames.forEach((frame, frameIdx) => {
            if (frame.events) {
                const skillEvents = frame.events.filter(e => 
                    e.type === 'SKILL_LEVEL_UP' || e.eventType === 'SKILL_LEVEL_UP'
                );

                skillEvents.forEach(e => {
                    const pId = e.participantId;
                    if (!allParticipantEvents[pId]) allParticipantEvents[pId] = [];
                    allParticipantEvents[pId].push({
                        frame: frameIdx,
                        skill: e.skillSlot,
                        timestamp: e.timestamp
                    });
                });
            }
        });

        console.log('Events by participant:\n');
        Object.entries(allParticipantEvents).forEach(([pId, events]) => {
            const marker = (pId === matchParticipantId || pId === (matchParticipantId - 1).toString()) ? ' ← OUR PARTICIPANT' : '';
            console.log(`   Participant ${pId}: ${events.length} events${marker}`);
        });
        console.log('');

        // 4. Пробуем оба participantId
        const possibleIds = [matchParticipantId, matchParticipantId - 1];
        
        for (const testId of possibleIds) {
            const events = allParticipantEvents[testId];
            if (events && events.length > 1) {
                console.log(`✅ Found! Using participantId: ${testId}\n`);
                
                console.log('   Skill events:');
                events.forEach(e => {
                    const skillName = e.skill === 1 ? 'Q' : e.skill === 2 ? 'W' : e.skill === 3 ? 'E' : e.skill === 4 ? 'R' : '?';
                    console.log(`      Frame ${e.frame}: Skill ${skillName} (${e.skill}) at ${e.timestamp}ms`);
                });
                console.log('');
                
                // 5. Конвертируем в skill order
                console.log('4️⃣ Converting to skill order...\n');
                
                events.sort((a, b) => a.timestamp - b.timestamp);
                
                // Создаём массив прокачки по уровням (1-18)
                const skillOrder = new Array(18).fill(null);
                let levelIndex = 0;
                
                events.forEach(e => {
                    if (e.skill > 0 && e.skill < 5 && levelIndex < 18) {
                        const skillName = e.skill === 1 ? 'Q' : e.skill === 2 ? 'W' : e.skill === 3 ? 'E' : 'R';
                        skillOrder[levelIndex] = skillName;
                        levelIndex++;
                    }
                });
                
                console.log('   Result (by level):');
                for (let i = 0; i < 18; i++) {
                    if (skillOrder[i]) {
                        console.log(`      Level ${i + 1}: ${skillOrder[i]}`);
                    }
                }
                console.log('');
                
                // Считаем сколько раз прокачали каждый скилл
                const skillCount = { Q: 0, W: 0, E: 0, R: 0 };
                skillOrder.forEach(s => { if (s) skillCount[s]++; });
                
                console.log('   Summary:');
                console.log(`      Q: ${skillCount.Q} times`);
                console.log(`      W: ${skillCount.W} times`);
                console.log(`      E: ${skillCount.E} times`);
                console.log(`      R: ${skillCount.R} times`);
                console.log('');
                
                const totalPoints = skillCount.Q + skillCount.W + skillCount.E + skillCount.R;
                const hasMaxSkill = skillCount.Q === 5 || skillCount.W === 5 || skillCount.E === 5;
                const rLevels = skillCount.R;
                const realistic = totalPoints >= 15 && hasMaxSkill && rLevels >= 2;
                
                console.log(`   ✅ Realistic: ${realistic ? 'YES' : 'NO'}`);
                console.log(`      Total points: ${totalPoints}`);
                console.log(`      Max skill: ${hasMaxSkill ? 'YES' : 'NO'}`);
                console.log(`      R levels: ${rLevels}`);
                
                break;
            }
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
        }
    }
}

debugTimeline();
