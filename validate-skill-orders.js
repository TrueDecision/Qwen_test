/**
 * Skill Order Validator
 * 
 * Показывает 10 случайных игр с их skill orders для проверки реалистичности
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, 'cache');
const STATS_FILE = path.join(CACHE_DIR, 'full-analytics-stats.json');

console.log('\n🔍 SKILL ORDER VALIDATOR\n');
console.log('='.repeat(70) + '\n');

const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));

// Собираем все матчи с skill orders
const allMatches = [];

Object.values(stats).forEach(champ => {
    if (champ.matches) {
        champ.matches.forEach(match => {
            if (match.skillOrder) {
                allMatches.push({
                    champId: champ.id,
                    role: match.role,
                    matchId: match.matchId,
                    skillOrder: match.skillOrder,
                    items: match.items,
                    perks: match.perks
                });
            }
        });
    }
});

console.log(`📊 Total matches with skill order: ${allMatches.length}\n`);

if (allMatches.length === 0) {
    console.log('❌ No matches with skill order found!\n');
    process.exit(1);
}

// Берём 10 случайных
const sample = allMatches.sort(() => Math.random() - 0.5).slice(0, 10);

console.log('🎲 RANDOM 10 GAMES:\n');

sample.forEach((match, i) => {
    console.log(`${i + 1}. ${match.champId} - ${match.role} (${match.matchId})`);
    console.log(`   Items: ${match.items.slice(0, 6).join(', ')}`);
    console.log(`   Runes: ${match.perks?.keystone || 'N/A'} (Primary: ${match.perks?.primary || 'N/A'}, Sub: ${match.perks?.sub || 'N/A'})`);
    console.log(`   Skill Order:`);
    console.log(`      Q: [${match.skillOrder.Q.join(', ')}]`);
    console.log(`      W: [${match.skillOrder.W.join(', ')}]`);
    console.log(`      E: [${match.skillOrder.E.join(', ')}]`);
    console.log(`      R: [${match.skillOrder.R.join(', ')}]`);
    
    // Проверка на реалистичность
    const totalPoints = match.skillOrder.Q.length + match.skillOrder.W.length + match.skillOrder.E.length + match.skillOrder.R.length;
    const hasMaxSkill = match.skillOrder.Q.length === 5 || match.skillOrder.W.length === 5 || match.skillOrder.E.length === 5;
    const rLevels = match.skillOrder.R.length;
    
    console.log(`   ✅ Realistic: ${totalPoints >= 15 && hasMaxSkill && rLevels >= 2 ? 'YES' : 'NO'} (Total: ${totalPoints} points, Max skill: ${hasMaxSkill ? 'YES' : 'NO'}, R: ${rLevels} levels)`);
    console.log('');
});

console.log('='.repeat(70));
console.log('\n💡 EXPECTED PATTERN:\n');
console.log('   - One skill should have 5 points (maxed)');
console.log('   - One skill should have 3-4 points');
console.log('   - One skill should have 1-2 points');
console.log('   - R should have 2-3 points (levels 6, 11, 16)');
console.log('   - Total: 15-18 skill points\n');
