/**
 * Re-collect Skill Orders
 * 
 * Удаляет старые skill orders и собирает заново с правильной логикой
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, 'cache');
const STATS_FILE = path.join(CACHE_DIR, 'full-analytics-stats.json');

console.log('\n🔄 RE-COLLECTING SKILL ORDERS\n');
console.log('='.repeat(70) + '\n');

const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));

// Очищаем старые skill orders из matches
let clearedCount = 0;

Object.values(stats).forEach(champ => {
    if (champ.matches) {
        champ.matches.forEach(match => {
            if (match.skillOrder) {
                delete match.skillOrder;
                clearedCount++;
            }
        });
    }
});

console.log(`🗑️  Cleared ${clearedCount} old skill orders\n`);

// Сохраняем
console.log('💾 Saving...\n');
fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));

console.log('='.repeat(70));
console.log('✅ READY FOR RE-COLLECTION!');
console.log('='.repeat(70) + '\n');
console.log('Now run: node unified-collector.js\n');
