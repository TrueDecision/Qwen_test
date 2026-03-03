console.log('>>> LoL Stats App (Final Fixed UI & Logic) <<<');

const CONFIG = {
    API_BASE: 'http://localhost:3000/api',
    DDRAGON_BASE: '/ddragon',
    LANG: 'en_US'
};

let globalData = null;
let db = {
    champions: {},
    items: {},
    summoners: {},
    runes: {},
    runeTrees: {}
};

// Элементы DOM
const viewList = document.getElementById('view-list');
const viewDetail = document.getElementById('view-detail');
const listEl = document.getElementById('champions-list');
const detailEl = document.getElementById('detail-content');
const backBtn = document.getElementById('back-btn');
const pageTitle = document.getElementById('page-title');
const headerMeta = document.getElementById('header-meta');
const flagEl = document.getElementById('status-flag');

// --- ГЛОБАЛЬНЫЕ ФУНКЦИИ TOOLTIP (ИСПРАВЛЕНИЕ ОШИБКИ) ---
// Вынесены сюда, чтобы быть доступными из любого HTML-генератора
window.showTooltip = function(e, title, desc) {
    const tooltip = document.getElementById('game-tooltip');
    if (!tooltip || !title) return;
    
    const safeTitle = title.replace(/"/g, '&quot;');
    const safeDesc = desc ? desc.replace(/"/g, '&quot;') : '';
    
    tooltip.innerHTML = `<div class="tooltip-title">${safeTitle}</div><div class="tooltip-desc">${safeDesc}</div>`;
    tooltip.style.display = 'block';
    
    // Позиционирование
    let x = e.clientX + 15;
    let y = e.clientY + 15;
    
    const rect = tooltip.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - 15;
    if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - 15;
    
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
};

window.hideTooltip = function() {
    const tooltip = document.getElementById('game-tooltip');
    if (tooltip) tooltip.style.display = 'none';
};

// --- СТИЛИ (CSS-in-JS) ---
const styles = `
    <style>
        /* Tooltip Styles */
        #game-tooltip {
            position: fixed; 
            background: rgba(15, 23, 42, 0.98); 
            border: 1px solid #fbbf24;
            color: #f1f5f9; 
            padding: 10px; 
            border-radius: 6px; 
            max-width: 280px;
            pointer-events: none; 
            z-index: 9999; 
            display: none; 
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.7);
            font-family: sans-serif; 
            font-size: 12px; 
            line-height: 1.4;
        }
        .tooltip-title { font-weight: bold; color: #fbbf24; margin-bottom: 4px; font-size: 13px; border-bottom: 1px solid #334155; padding-bottom: 2px; }
        .tooltip-desc { color: #cbd5e1; white-space: pre-line; }

        /* Skill Table Compact Styles */
        .skill-table-container {
            margin-top: 15px;
            overflow-x: hidden; /* No scroll */
            border: 1px solid #334155;
            border-radius: 6px;
            background: #0f172a;
            font-size: 11px;
        }
        .skill-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed; /* Fix width */
        }
        .skill-table th, .skill-table td {
            border: 1px solid #334155;
            padding: 4px 2px; /* Minimal padding */
            text-align: center;
            color: #cbd5e1;
            vertical-align: middle;
        }
        .skill-table th {
            background: #1e293b;
            color: #94a3b8;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
        }
        .skill-icon-cell {
            width: 40px; /* Narrower column for icons */
            padding: 4px !important;
        }
        .skill-icon-img {
            width: 28px;
            height: 28px;
            border-radius: 4px;
            border: 1px solid #475569;
            cursor: pointer;
            transition: transform 0.2s;
            display: block;
            margin: 0 auto;
        }
        .skill-icon-img:hover { transform: scale(1.15); border-color: #fbbf24; }
        
        .skill-point {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #334155;
            display: inline-block;
            margin: 0 auto;
        }
        .skill-point.active {
            background: #fbbf24;
            box-shadow: 0 0 6px rgba(251, 191, 36, 0.8);
            transform: scale(1.2);
        }
        
        /* Color coding for rows */
        .row-q { border-left: 3px solid #ef4444 !important; }
        .row-w { border-left: 3px solid #3b82f6 !important; }
        .row-e { border-left: 3px solid #eab308 !important; }
        .row-r { border-left: 3px solid #a855f7 !important; }
        .row-p { border-left: 3px solid #f97316 !important; }
    </style>
`;
document.head.insertAdjacentHTML('beforeend', styles);

// --- HELPERS ---
function getRoleColor(role) {
    const colors = { 'TOP': '#d97706', 'JUNGLE': '#16a34a', 'MIDDLE': '#2563eb', 'BOTTOM': '#db2777', 'UTILITY': '#0891b2', 'UNKNOWN': '#71717a' };
    return colors[role] || '#71717a';
}

function setStatus(status) {
    if (!flagEl) return;
    const icons = { 'green': '🟢', 'red': '🔴', 'yellow': '🟡', 'gray': '⚪' };
    flagEl.className = `status-flag status-${status}`;
    flagEl.textContent = icons[status] || '⚪';
}

function getStyleName(styleId) {
    const map = { 8000: 'Precision', 8100: 'Domination', 8200: 'Sorcery', 8300: 'Inspiration', 8400: 'Resolve' };
    return map[styleId] || 'Unknown';
}

backBtn.addEventListener('click', () => {
    viewDetail.classList.add('hidden'); 
    viewList.classList.remove('hidden');
    backBtn.style.display = 'none'; 
    pageTitle.textContent = 'LoL Stats EUW'; 
    window.scrollTo(0, 0);
});

function navigateToDetail(champId, initialRole) {
    const champ = globalData.champions[champId];
    if (!champ) return;
    viewList.classList.add('hidden'); 
    viewDetail.classList.remove('hidden');
    backBtn.style.display = 'block'; 
    pageTitle.textContent = db.champions[champId]?.name || champ.name;
    renderChampionDetail(champ, initialRole); 
    window.scrollTo(0, 0);
}

async function init() {
    setStatus('gray');
    listEl.innerHTML = '<div style="text-align:center; padding:40px; color:#888;">Загрузка баз данных...</div>';

    try {
        const lang = CONFIG.LANG;
        const base = `${CONFIG.DDRAGON_BASE}/data/${lang}`;

        // 1. CHAMPIONS
        console.log(`📥 Loading championFull.json (${lang})...`);
        const champRes = await fetch(`${base}/championFull.json`);
        if (champRes.ok) {
            const json = await champRes.json();
            Object.values(json.data).forEach(c => {
                db.champions[c.key] = {
                    name: c.name,
                    file: c.image.full,
                    title: c.title,
                    lore: c.lore ? c.lore.substring(0, 300) + '...' : '',
                    spells: c.spells || [],
                    passive: c.passive
                };
            });
            console.log(`✅ Champions: ${Object.keys(db.champions).length}`);
        }

        // 2. ITEMS
        console.log(`📥 Loading item.json (${lang})...`);
        const itemRes = await fetch(`${base}/item.json`);
        if (itemRes.ok) {
            const json = await itemRes.json();
            Object.keys(json.data).forEach(id => {
                const item = json.data[id];
                const cleanDesc = item.description ? item.description.replace(/<[^>]*>?/gm, ' ') : '';
                db.items[id] = {
                    name: item.name,
                    desc: cleanDesc,
                    file: item.image.full,
                    stats: item.plaintext || ''
                };
            });
            console.log(`✅ Items: ${Object.keys(db.items).length}`);
        }

        // 3. SUMMONERS
        console.log(`📥 Loading summoner.json (${lang})...`);
        const sumRes = await fetch(`${base}/summoner.json`);
        if (sumRes.ok) {
            const json = await sumRes.json();
            const idMap = { 
                '1': 'SummonerBoost', '3': 'SummonerExhaust', '4': 'SummonerFlash', 
                '6': 'SummonerHaste', '7': 'SummonerHeal', '11': 'SummonerSmite', 
                '12': 'SummonerTeleport', '13': 'SummonerMana', '14': 'SummonerDot', 
                '21': 'SummonerBarrier', '32': 'SummonerSnowball' 
            };
            
            Object.values(json.data).forEach(s => {
                const cleanDesc = s.description ? s.description.replace(/<[^>]*>?/gm, ' ') : '';
                db.summoners[s.key] = {
                    name: s.name,
                    desc: cleanDesc,
                    file: s.image.full
                };
            });
            Object.entries(idMap).forEach(([numId, keyName]) => {
                if (db.summoners[keyName]) {
                    db.summoners[numId] = db.summoners[keyName];
                }
            });
            console.log(`✅ Summoners: ${Object.keys(db.summoners).length}`);
        }

        // 4. RUNES
        console.log(`📥 Loading runesReforged.json (${lang})...`);
        const runeRes = await fetch(`${base}/runesReforged.json`);
        if (runeRes.ok) {
            const trees = await runeRes.json();
            
            trees.forEach(tree => {
                db.runeTrees[tree.id] = {
                    name: tree.name,
                    slots: tree.slots || []
                };

                if (tree.slots) {
                    tree.slots.forEach(slot => {
                        if (slot.runes) {
                            slot.runes.forEach(rune => {
                                const id = String(rune.id);
                                db.runes[id] = {
                                    name: rune.name,
                                    path: rune.icon,
                                    style: tree.name,
                                    desc: rune.shortDesc || rune.longDesc || ''
                                };
                            });
                        }
                    });
                }
            });
            
            // Stat Shards Manual Map
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
                    db.runes[id] = {
                        name: s.name,
                        path: `perk-images/StatMods/${s.file}`,
                        style: 'StatMods',
                        desc: s.desc
                    };
                }
            });
            console.log(`✅ Runes & Shards loaded`);
        }

        // 5. STATS
        console.log('📥 Loading match stats...');
        const response = await fetch(`${CONFIG.API_BASE}/stats`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        globalData = await response.json();
        
        console.log('✅ Ready! Matches:', globalData.total_matches_analyzed);
        headerMeta.textContent = `${globalData.total_matches_analyzed} игр`;
        setStatus('green');
        renderList(globalData.champions);

    } catch (error) {
        console.error('❌ Critical Error:', error);
        setStatus('red');
        listEl.innerHTML = `<div style="color:red; text-align:center; padding:20px;">Error: ${error.message}</div>`;
    }
}

function renderList(champions) {
    listEl.innerHTML = '';
    const arr = Object.values(champions);
    if (arr.length === 0) { 
        listEl.innerHTML = '<div style="text-align:center; color:#888;">No data</div>'; 
        return; 
    }

    arr.forEach(champ => {
        const role = champ.primary_role;
        const stats = champ.roles[role];
        if (!stats) return;
        const winColor = stats.win_rate >= 50 ? '#4ade80' : '#f87171';
        
        const champInfo = db.champions[champ.id];
        const champName = champInfo ? champInfo.name : `Champ_${champ.id}`;
        const fileName = champInfo ? champInfo.file : `${champ.id}.png`;
        const imgUrl = `${CONFIG.DDRAGON_BASE}/img/champion/${fileName}`;
        
        const card = document.createElement('div');
        card.className = 'champ-card';
        card.style.cursor = 'pointer';
        card.onclick = () => navigateToDetail(champ.id, role);

        card.innerHTML = `
            <div style="position:relative; margin-right:15px; flex-shrink:0;">
                <img src="${imgUrl}" style="width:50px; height:50px; border-radius:8px; border:2px solid #555; background:#000; display:block;" onerror="this.style.background='#500'">
                <div style="position:absolute; bottom:-6px; right:-6px; width:22px; height:22px; border-radius:50%; background:${getRoleColor(role)}; border:2px solid #27272a; color:white; font-size:11px; display:flex; align-items:center; justify-content:center; font-weight:bold;">${role[0]}</div>
            </div>
            <div style="flex:1; min-width:0;">
                <div style="font-weight:700; font-size:16px; color:#fff;">${champName}</div>
                <div style="font-size:13px; color:#a1a1aa; display:flex; gap:6px; align-items:center;">
                    <span style="background:#3f3f46; padding:2px 6px; border-radius:4px; font-size:11px;">${role}</span>
                    <span style="color:${winColor}; font-weight:bold;">${stats.win_rate}%</span>
                    <span style="color:#71717a;">${stats.games} games</span>
                </div>
            </div>
        `;
        listEl.appendChild(card);
    });
}

function renderChampionDetail(champ, currentRoleKey) {
    const stats = champ.roles[currentRoleKey];
    const builds = Object.values(stats.builds).sort((a, b) => b.games - a.games);
    
    const champInfo = db.champions[champ.id];
    const champName = champInfo ? champInfo.name : `Champ_${champ.id}`;
    const fileName = champInfo ? champInfo.file : `${champ.id}.png`;
    const champImgUrl = `${CONFIG.DDRAGON_BASE}/img/champion/${fileName}`;

    let html = `
        <div style="display:flex; align-items:center; gap:15px; margin-bottom:20px;">
            <img src="${champImgUrl}" style="width:64px; height:64px; border-radius:8px; border:2px solid #555; background:#000;" onerror="this.style.background='#500'">
            <div>
                <h2 style="margin:0; font-size:24px; color:#fff;">${champName}</h2>
                <div style="display:inline-block; margin-top:5px; padding:2px 8px; border-radius:4px; background:${getRoleColor(currentRoleKey)}; color:white; font-size:12px; font-weight:bold;">${currentRoleKey}</div>
            </div>
        </div>
        ${champInfo?.lore ? `<div style="margin-bottom:20px; font-size:13px; color:#94a3b8; font-style:italic; background:#1e293b; padding:15px; border-radius:6px; border-left:3px solid #fbbf24;">"${champInfo.lore}"</div>` : ''}
    `;

    if (!stats.is_reliable) {
        html += `<div style="background:#7f1d1d; color:#fca5a5; padding:10px; border-radius:6px; margin-bottom:15px; text-align:center;">⚠️ Low data: ${stats.games} games.</div>`;
    }

    if (builds.length > 0) {
        const mainBuild = builds[0];
        const usagePercent = ((mainBuild.games / stats.games) * 100).toFixed(1);
        const winRate = ((mainBuild.wins / mainBuild.games) * 100).toFixed(1);
        const winClass = winRate >= 50 ? 'win-rate-good' : 'win-rate-bad';
        const perks = mainBuild.perks || {};
        
        // Normalize selected IDs to Strings for reliable comparison
        const selectedIds = new Set([
            ...(perks.primaryRunes || []),
            ...(perks.secondaryRunes || []),
            ...(perks.shards || [])
        ].map(String));

        // --- HELPER: Summoner Spells ---
        const renderSummoner = (id) => {
            const sp = db.summoners[String(id)];
            if (!sp) return `<div style="width:36px; height:36px; background:#1e293b; border-radius:4px;"></div>`;
            const url = `${CONFIG.DDRAGON_BASE}/img/spell/${sp.file}`;
            return `<div style="text-align:center; cursor:pointer;" onmouseenter="(e) => showTooltip(e, '${sp.name}', '${sp.desc.replace(/'/g, "\\'")}') " onmouseleave="hideTooltip()">
                <img src="${url}" style="width:36px; height:36px; border:2px solid #fbbf24; border-radius:4px; background:#0f172a;" onerror="this.style.background='#500'">
                <div style="font-size:9px; color:#cbd5e1; margin-top:2px;">${sp.name}</div>
            </div>`;
        };

        // --- HELPER: Items ---
        const renderItem = (id) => {
            const item = db.items[String(id)];
            if (!item) return '';
            const name = item.name;
            const desc = item.desc;
            const file = item.file;
            const url = `${CONFIG.DDRAGON_BASE}/img/item/${file}`;
            
            return `<div style="text-align:center; margin-right:4px; position:relative;">
                <img src="${url}" style="width:32px; height:32px; background:#333; border:1px solid #475569; border-radius:4px; cursor:pointer;" 
                     onmouseenter="(e) => showTooltip(e, '${name.replace(/'/g, "\\'")}', '${desc.replace(/'/g, "\\'")}') " onmouseleave="hideTooltip()" onerror="this.style.background='#500'">
                <div style="font-size:8px; color:#888; margin-top:1px; max-width:35px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</div>
            </div>`;
        };

        // --- HELPER: Runes (Fixed Highlighting) ---
        const renderRuneIcon = (runeId, size = 26) => {
            const strId = String(runeId);
            const rune = db.runes[strId];
            if (!rune) return `<div style="width:${size}px;height:${size}px;background:#1e293b;border-radius:50%"></div>`;
            
            // Strict string comparison
            const isSelected = selectedIds.has(strId);
            const url = `${CONFIG.DDRAGON_BASE}/img/${rune.path}`;
            
            const opacity = isSelected ? '1' : '0.3';
            const border = isSelected ? '2px solid #fbbf24' : '1px solid #334155';
            const shadow = isSelected ? '0 0 8px rgba(251, 191, 36, 0.6)' : 'none';
            const scale = isSelected ? 'scale(1.15)' : 'scale(1)';

            return `<div style="position:relative; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; margin:1px; cursor:pointer;"
                     onmouseenter="(e) => showTooltip(e, '${rune.name.replace(/'/g, "\\'")}', '${rune.desc.replace(/'/g, "\\'")}') " onmouseleave="hideTooltip()">
                <img src="${url}" 
                     style="width:100%; height:100%; border-radius:50%; background:#0f172a; border:${border}; box-shadow:${shadow}; 
                            opacity:${opacity}; transition:all 0.2s; transform:${scale};" 
                     onerror="this.style.visibility='hidden'; this.style.background='#334155'">
            </div>`;
        };

        // --- HELPER: Skills Table (Compact & No Scroll) ---
        const renderSkillTable = () => {
            if (!champInfo || !champInfo.spells) return '';
            
            const spells = champInfo.spells; // Q, W, E, R usually
            const passive = champInfo.passive;
            
            // Create a map of Level -> Spell Key based on standard max order logic if server doesn't send exact sequence
            // For now, we just display the available spells and their descriptions in a compact grid
            // Since we don't have exact level-up sequence from server, we show static info
            
            let tableHtml = `<div class="skill-table-container"><table class="skill-table"><thead><tr><th class="skill-icon-cell">Skill</th>`;
            
            // Header: Levels 1-18 (Compressed visually)
            for(let i=1; i<=18; i++) {
                tableHtml += `<th style="width:2.5%;">${i}</th>`;
            }
            tableHtml += `</tr></thead><tbody>`;

            // Helper to generate row
            const generateRow = (key, spellData, rowClass) => {
                if (!spellData) return '';
                const sName = spellData.name;
                const sDesc = spellData.description ? spellData.description.replace(/<[^>]*>?/gm, '') : '';
                const sImg = `${CONFIG.DDRAGON_BASE}/img/spell/${spellData.image.full}`;
                
                // Mock logic for highlighting: 
                // Q: 1, 4, 7, 10, 13
                // W: 2, 5, 8, 12, 14
                // E: 3, 9, 15, 17, 18
                // R: 6, 11, 16
                // P: 1
                const levels = [];
                if (key === 'Q') levels = [1, 4, 7, 10, 13];
                else if (key === 'W') levels = [2, 5, 8, 12, 14];
                else if (key === 'E') levels = [3, 9, 15, 17, 18];
                else if (key === 'R') levels = [6, 11, 16];
                else if (key === 'P') levels = [1];

                let row = `<tr class="${rowClass}"><td class="skill-icon-cell">
                    <img src="${sImg}" class="skill-icon-img" onmouseenter="(e) => showTooltip(e, '${sName}', '${sDesc.replace(/'/g, "\\'")}') " onmouseleave="hideTooltip()">
                    <div style="font-size:9px; font-weight:bold; margin-top:2px; color:#fbbf24;">${key}</div>
                </td>`;
                
                for(let i=1; i<=18; i++) {
                    const isActive = levels.includes(i);
                    row += `<td>${isActive ? '<div class="skill-point active"></div>' : ''}</td>`;
                }
                row += `</tr>`;
                return row;
            };

            // Render Rows
            spells.forEach(spell => {
                if (spell.key === 'Passive') {
                    tableHtml += generateRow('P', spell, 'row-p');
                } else {
                    tableHtml += generateRow(spell.key, spell, `row-${spell.key.toLowerCase()}`);
                }
            });
            
            // Ensure Passive is rendered if not in spells array but exists
            if (passive && !spells.find(s => s.key === 'Passive')) {
                 tableHtml += generateRow('P', passive, 'row-p');
            }

            tableHtml += `</tbody></table></div>`;
            return tableHtml;
        };

        html += `
            <div style="background:#1e293b; padding:15px; border-radius:8px; border:1px solid #334155;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #334155; padding-bottom:8px;">
                    <span style="font-weight:bold; color:#fbbf24; font-size:14px;">Main Build</span>
                    <span style="background:#334155; padding:2px 6px; border-radius:4px; font-size:11px; color:#fff;">${usagePercent}%</span>
                </div>
                <div style="margin-bottom:15px; font-size:13px;">Win Rate: <strong style="color:${winRate >= 50 ? '#4ade80' : '#f87171'}">${winRate}%</strong> <span style="color:#94a3b8; font-size:11px;">(${mainBuild.wins}W / ${mainBuild.games}G)</span></div>

                <!-- SUMMONER SPELLS -->
                <div style="margin-bottom:15px;">
                    <div style="font-size:11px; color:#cbd5e1; margin-bottom:6px; text-transform:uppercase;">Summoner Spells</div>
                    <div style="display:flex; gap:8px; background:#0f172a; padding:8px; border-radius:6px; width:fit-content; border:1px solid #1e293b;">
                        ${renderSummoner(mainBuild.summoner1)}
                        ${renderSummoner(mainBuild.summoner2)}
                    </div>
                </div>

                <!-- ITEMS -->
                <div style="margin-bottom:15px;">
                    <div style="font-size:11px; color:#cbd5e1; margin-bottom:6px; text-transform:uppercase;">Items</div>
                    <div style="display:flex; gap:2px; flex-wrap:wrap; align-items:center; background:#0f172a; padding:8px; border-radius:6px; border:1px solid #1e293b;">
                        ${mainBuild.items.length > 0 
                            ? mainBuild.items.map((id, idx) => renderItem(id)).join('') 
                            : '<span style="color:#64748b; font-size:10px;">No items</span>'}
                    </div>
                </div>

                <!-- SKILLS TABLE -->
                <div style="margin-bottom:15px;">
                    <div style="font-size:11px; color:#cbd5e1; margin-bottom:6px; text-transform:uppercase;">Skill Order</div>
                    ${renderSkillTable()}
                </div>

                <!-- RUNES -->
                <div style="border-top:1px solid #334155; padding-top:10px;">
                    <div style="font-size:11px; color:#cbd5e1; margin-bottom:8px; text-transform:uppercase;">Runes</div>
                    <div style="display:flex; gap:12px; flex-wrap:wrap;">
                        ${renderTreeBySlots(perks.primary, '#fbbf24')}
                        ${renderTreeBySlots(perks.sub, '#a78bfa')}
                    </div>
                    
                    <!-- Stat Shards Row -->
                    <div style="margin-top:10px; padding-top:8px; border-top:1px dashed #334155;">
                         <div style="font-size:10px; color:#94a3b8; margin-bottom:4px;">Stat Mods</div>
                         <div style="display:flex; gap:4px; justify-content:center;">
                            ${(perks.shards || []).map(id => renderRuneIcon(id, 22)).join('')}
                         </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        html += `<div style="text-align:center; color:#888; padding:20px;">No build data</div>`;
    }

    detailEl.innerHTML = html;
    window.currentChampData = champ;
    window.renderCurrentRole = (role) => renderChampionDetail(champ, role);
}

// Helper to render Rune Trees
function renderTreeBySlots(styleId, colorHex) {
    const tree = db.runeTrees[styleId];
    if (!tree || !tree.slots) return '';
    
    // Secondary trees skip the first slot (Keystone)
    const isSecondary = styleId !== (window.currentChampData?.roles[Object.keys(window.currentChampData.roles)[0]]?.builds[0]?.perks?.primary);
    const slotsToRender = isSecondary ? tree.slots.slice(1) : tree.slots;

    let htmlTree = `
        <div style="flex:1; min-width:140px;">
            <div style="font-size:12px; color:${colorHex}; margin-bottom:6px; font-weight:bold; text-transform:uppercase; border-bottom:1px solid #334155; padding-bottom:3px;">
                ${tree.name}${isSecondary ? ' (Sec)' : ''}
            </div>
            <div style="display:flex; flex-direction:column; gap:4px; background:#0f172a; padding:6px; border-radius:6px; border:1px solid #1e293b;">
    `;
    
    slotsToRender.forEach((slot, idx) => {
        if (!slot.runes) return;
        htmlTree += `<div style="display:flex; gap:3px; justify-content:center; flex-wrap:wrap;">`;
        slot.runes.forEach(runeData => {
            htmlTree += renderRuneIcon(runeData.id, 24);
        });
        htmlTree += `</div>`;
        if (idx < slotsToRender.length - 1) {
            htmlTree += `<div style="height:1px; background:#1e293b; margin:1px 0;"></div>`;
        }
    });

    htmlTree += `</div></div>`;
    return htmlTree;
}

window.addEventListener('DOMContentLoaded', init);