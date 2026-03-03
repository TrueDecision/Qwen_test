import { CONFIG } from './config.js';
import { AppState } from './state.js';

export async function loadGameData() {
    console.log('📥 Loading game data...');
    const base = `${CONFIG.DDRAGON_BASE}/data/${CONFIG.LANG}`;
    const { db } = AppState;

    try {
        // 1. Champions
        const champRes = await fetch(`${base}/championFull.json`);
        if (champRes.ok) {
            const json = await champRes.json();
            Object.values(json.data).forEach(c => {
                db.champions[c.key] = {
                    name: c.name, file: c.image.full, title: c.title,
                    lore: c.lore ? c.lore.substring(0, 300) + '...' : '',
                    spells: c.spells || [], passive: c.passive
                };
            });
            console.log(`✅ Champions: ${Object.keys(db.champions).length}`);
        }

        // 2. Items
        const itemRes = await fetch(`${base}/item.json`);
        if (itemRes.ok) {
            const json = await itemRes.json();
            Object.keys(json.data).forEach(id => {
                const item = json.data[id];
                const cleanDesc = item.description ? item.description.replace(/<[^>]*>?/gm, ' ') : '';
                db.items[id] = { name: item.name, desc: cleanDesc, file: item.image.full, stats: item.plaintext || '' };
            });
            console.log(`✅ Items: ${Object.keys(db.items).length}`);
        }

        // 3. Summoners
        const sumRes = await fetch(`${base}/summoner.json`);
        if (sumRes.ok) {
            const json = await sumRes.json();
            const idMap = { 
                '4': 'SummonerFlash', '7': 'SummonerHeal', '11': 'SummonerSmite', 
                '14': 'SummonerDot', '21': 'SummonerBarrier', '32': 'SummonerTeleport', 
                '6': 'SummonerHaste', '54': 'SummonerSnowball' 
            };
            Object.values(json.data).forEach(s => {
                const cleanDesc = s.description ? s.description.replace(/<[^>]*>?/gm, ' ') : '';
                db.summoners[s.key] = { name: s.name, desc: cleanDesc, file: s.image.full };
            });
            Object.entries(idMap).forEach(([numId, keyName]) => {
                if (db.summoners[keyName]) db.summoners[numId] = db.summoners[keyName];
            });
            console.log(`✅ Summoners: ${Object.keys(db.summoners).length}`);
        }

        // 4. Runes
        const runeRes = await fetch(`${base}/runesReforged.json`);
        if (runeRes.ok) {
            const trees = await runeRes.json();
            trees.forEach(tree => {
                db.runeTrees[tree.id] = { name: tree.name, slots: tree.slots || [] };
                if (tree.slots) {
                    tree.slots.forEach(slot => {
                        if (slot.runes) {
                            slot.runes.forEach(rune => {
                                const id = String(rune.id);
                                db.runes[id] = { name: rune.name, path: rune.icon, style: tree.name, desc: rune.shortDesc || rune.longDesc || '' };
                            });
                        }
                    });
                }
            });
            
            // Stat Shards Hardcoded Map
            const shardMap = {
                '5008': { name: 'Adaptive Force', file: 'StatModsAdaptiveForceIcon.png', desc: '+9 Adaptive Force' },
                '5005': { name: 'Attack Speed', file: 'StatModsAttackSpeedIcon.png', desc: '+10% Attack Speed' },
                '5007': { name: 'Ability Haste', file: 'StatModsCDRScalingIcon.png', desc: '+8 Ability Haste' },
                '5010': { name: 'Move Speed', file: 'StatModsMovementSpeedIcon.png', desc: '+Move Speed' },
                '5001': { name: 'Health Scaling', file: 'StatModsHealthScalingIcon.png', desc: '+10-180 Health' },
                '5011': { name: 'Health Plus', file: 'StatModsHealthPlusIcon.png', desc: '+15-140 Health' },
                '5013': { name: 'Tenacity', file: 'StatModsTenacityIcon.png', desc: '+Tenacity' },
                '5002': { name: 'Armor', file: 'StatModsArmorIcon.png', desc: '+6 Armor' },
                '5003': { name: 'Magic Resist', file: 'StatModsMagicResIcon.png', desc: '+8 Magic Resist' }
            };
            Object.entries(shardMap).forEach(([id, s]) => {
                if (!db.runes[id]) {
                    db.runes[id] = { name: s.name, path: `perk-images/StatMods/${s.file}`, style: 'StatMods', desc: s.desc };
                }
            });
            console.log(`✅ Runes & Shards loaded`);
        }
        return true;
    } catch (e) {
        console.error('❌ Error loading game data:', e);
        return false;
    }
}

export async function loadStats() {
    console.log('📥 Loading match stats...');
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/stats`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        AppState.globalData = await response.json();
        console.log('✅ Stats loaded:', AppState.globalData.total_matches_analyzed);
        return true;
    } catch (e) {
        console.error('❌ Error loading stats:', e);
        return false;
    }
}