import { CONFIG } from './config.js';
import { AppState } from './state.js';
import { getRoleColor } from './utils.js';
import { renderSkillsTable, renderPassiveSkill } from './render-skills.js';

function renderSummoner(id) {
    const sp = AppState.db.summoners[id];
    if (!sp) return `<div style="width:36px; height:36px; background:#1e293b; border-radius:4px;"></div>`;
    const url = `${CONFIG.DDRAGON_BASE}/img/spell/${sp.file}`;
    return `<div style="text-align:center; cursor:pointer;" onclick="window.openDetailModal('summoner', '${id}')">
        <img src="${url}" style="width:36px; height:36px; border:2px solid #fbbf24; border-radius:4px; background:#0f172a;" 
             onmouseenter="(e) => window.showTooltip(e, '${sp.name}', '${sp.desc.replace(/'/g, "\\'")}') " onmouseleave="window.hideTooltip()">
        <div style="font-size:9px; color:#cbd5e1; margin-top:2px;">${sp.name}</div>
    </div>`;
}

// Глобальная функция для рендеринга иконки руны с подсветкой
// selectedSet - Set с ID выбранных рун для подсветки
function renderRuneIcon(runeId, size = 28, selectedSet = null) {
    const strId = String(runeId);
    const rune = AppState.db.runes[strId];
    if (!rune) return `<div style="width:${size}px;height:${size}px;background:#1e293b;border-radius:50%"></div>`;

    // Если selectedSet не передан, пробуем получить из текущего билда
    let isSelected = false;
    if (selectedSet) {
        isSelected = selectedSet.has(strId);
    } else {
        const currentChamp = window.currentChampData;
        if (currentChamp) {
            const role = currentChamp.primary_role;
            const stats = currentChamp.roles[role];
            const mainBuild = stats ? Object.values(stats.builds)[0] : null;
            if (mainBuild) {
                const allSelected = new Set([
                    ...(mainBuild.perks?.primaryRunes||[]),
                    ...(mainBuild.perks?.secondaryRunes||[]),
                    ...(mainBuild.perks?.shards||[])
                ].map(String));
                isSelected = allSelected.has(strId);
            }
        }
    }

    const url = `${CONFIG.DDRAGON_BASE}/img/${rune.path}`;
    const opacity = isSelected ? '1' : '0.3';
    const border = isSelected ? '2px solid #fbbf24' : '1px solid #334155';
    const shadow = isSelected ? '0 0 10px rgba(251, 191, 36, 0.6)' : 'none';
    const scale = isSelected ? 'scale(1.1)' : 'scale(1)';

    return `<div style="position:relative; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; margin:1px; cursor:pointer;"
             onclick="window.openDetailModal('rune', '${strId}')">
        <img src="${url}"
             style="width:100%; height:100%; border-radius:50%; background:#0f172a; border:${border}; box-shadow:${shadow};
                    opacity:${opacity}; transition:all 0.2s; transform:${scale};"
             onmouseenter="(e) => window.showTooltip(e, '${rune.name.replace(/'/g, "\\'")}', '${rune.desc.replace(/'/g, "\\'")}') " onmouseleave="window.hideTooltip()"
             onerror="this.style.visibility='hidden'; this.style.background='#334155'">
    </div>`;
}

// Глобальное состояние для текущего выбранного билда и роли
window.currentBuildIndex = 0;
window.currentDetailRole = null;

export function renderChampionDetail(champ, currentRoleKey, buildIndex = 0) {
    const stats = champ.roles[currentRoleKey];
    const builds = Object.values(stats.builds).sort((a, b) => b.games - a.games);
    
    // Сохраняем текущую роль и индекс билда
    window.currentDetailRole = currentRoleKey;
    window.currentBuildIndex = buildIndex;

    const champInfo = AppState.db.champions[champ.id];
    const champName = champInfo ? champInfo.name : `Champ_${champ.id}`;
    const fileName = champInfo ? champInfo.file : `${champ.id}.png`;
    const champImgUrl = `${CONFIG.DDRAGON_BASE}/img/champion/${fileName}`;
    
    // === КНОПКИ ПЕРЕКЛЮЧЕНИЯ РОЛЕЙ (для мультирольности) ===
    let roleButtonsHtml = '';
    // Показываем все роли у которых есть игры (>= 15% от общей суммы)
    const totalRoleGames = Object.values(champ.roles).reduce((sum, r) => sum + (r.games || 0), 0);
    const availableRoles = Object.keys(champ.roles).filter(role => {
        const roleGames = champ.roles[role]?.games || 0;
        const percent = totalRoleGames > 0 ? (roleGames / totalRoleGames) * 100 : 0;
        return percent >= 15; // Показываем только роли с 15%+ игр
    });
    
    if (availableRoles.length > 1) {
        roleButtonsHtml = `<div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">`;
        availableRoles.forEach(role => {
            const roleData = champ.roles[role];
            const roleGames = roleData?.games || 0;
            const rolePercent = totalRoleGames > 0 ? ((roleGames / totalRoleGames) * 100).toFixed(1) : 0;
            const isActive = role === currentRoleKey;
            const bgColor = isActive ? getRoleColor(role) : '#334155';
            const borderColor = isActive ? '#fbbf24' : 'transparent';

            // Проверяем что есть данные для этой роли
            const hasData = roleData && roleData.builds && Object.keys(roleData.builds).length > 0;

            roleButtonsHtml += `
                <button onclick="window.switchChampRole('${role}')"
                        style="background:${bgColor}; color:white; border:2px solid ${borderColor};
                               padding:4px 10px; border-radius:4px; cursor:${hasData ? 'pointer' : 'not-allowed'}; font-size:11px;
                               font-weight:${isActive ? 'bold' : 'normal'}; transition:all 0.2s; opacity: ${hasData ? 1 : 0.6};"
                        onmouseenter="this.style.transform='${hasData ? 'scale(1.05)' : 'scale(1)'}'"
                        onmouseleave="this.style.transform='scale(1)'">
                    ${role} (${rolePercent}%, ${roleGames} игр)
                </button>
            `;
        });
        roleButtonsHtml += `</div>`;
    }

    let html = `
        <div style="display:flex; align-items:center; gap:15px; margin-bottom:20px; flex-wrap:wrap; position:relative;">
            <img src="${champImgUrl}" style="width:64px; height:64px; border-radius:8px; border:2px solid #555; background:#000;" onerror="this.style.background='#500'">
            <div style="flex:1;">
                <h2 style="margin:0; font-size:24px; color:#fff;">${champName}</h2>
                <div style="display:inline-block; margin-top:5px; padding:2px 8px; border-radius:4px; background:${getRoleColor(currentRoleKey)}; color:white; font-size:12px; font-weight:bold;">${currentRoleKey}</div>
                ${roleButtonsHtml}
            </div>
            <div style="position:absolute; right:0; top:0; color:#ef4444; font-weight:bold; font-size:10px; letter-spacing:1px; animation:pulse 2s infinite;">⚠ EARLY ACCESS</div>
            <button onclick="window.toggleProBuilds('${champ.id}', '${currentRoleKey}')"
                    style="background:#7c3aed; color:white; border:none; padding:10px 16px; border-radius:8px;
                           cursor:pointer; font-size:13px; font-weight:bold; display:flex; align-items:center; gap:8px;
                           transition:all 0.2s;"
                    onmouseenter="this.style.transform='scale(1.05)'; this.style.background='#8b5cf6'"
                    onmouseleave="this.style.transform='scale(1)'; this.style.background='#7c3aed'">
                <span>🏆</span> Pro Builds
            </button>
        </div>
        <div id="pro-builds-container" style="margin-bottom:20px;"></div>
        ${champInfo?.lore ? `<div style="margin-bottom:20px; font-size:13px; color:#94a3b8; font-style:italic; background:#1e293b; padding:15px; border-radius:6px; border-left:3px solid #fbbf24;">"${champInfo.lore}"</div>` : ''}
    `;

    if (!stats.is_reliable) {
        html += `<div style="background:#7f1d1d; color:#fca5a5; padding:10px; border-radius:6px; margin-bottom:15px; text-align:center;">⚠️ Low data: ${stats.games} games.</div>`;
    }

    if (builds.length > 0) {
        const currentBuild = builds[buildIndex] || builds[0];
        const usagePercent = stats.games > 0 ? ((currentBuild.games / stats.games) * 100).toFixed(1) : '0';
        const winRate = currentBuild.games > 0 ? ((currentBuild.wins / currentBuild.games) * 100).toFixed(1) : '0';
        const perks = currentBuild.perks || {};

        // Создаем Set для подсветки рун
        const primaryRuneSet = new Set([
            ...(perks.primaryRunes || []),
            ...(perks.shards || [])
        ].map(String));
        const secondaryRuneSet = new Set([
            ...(perks.secondaryRunes || []),
            ...(perks.shards || [])
        ].map(String));
        const shardsSet = new Set((perks.shards || []).map(String));

        // === ВКЛАДКИ БИЛДОВ ===
        // Показываем основной билд + альтернативные с 15%+ популярностью
        const significantBuilds = builds.filter((b, idx) => {
            const percent = (b.games / stats.games) * 100;
            return idx === 0 || percent >= 15;
        });

        if (significantBuilds.length > 1) {
            html += `<div style="margin-bottom:20px;">
                <div style="font-size:12px; color:#cbd5e1; margin-bottom:8px; text-transform:uppercase;">Builds</div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">`;

            significantBuilds.forEach((build, idx) => {
                const buildPercent = ((build.games / stats.games) * 100).toFixed(1);
                const buildWinRate = ((build.wins / build.games) * 100).toFixed(1);
                const isActive = builds.indexOf(build) === buildIndex;
                const buildPerks = build.perks || {};

                // Иконка кестоуна и вторичной ветки
                const keystoneIcon = buildPerks.keystone
                    ? (AppState.db.runes[String(buildPerks.keystone)]?.icon || '')
                    : '';
                const subTreeIcon = buildPerks.sub
                    ? (AppState.db.runeTrees[String(buildPerks.sub)]?.icon || '')
                    : '';
                
                const bgColor = isActive ? '#fbbf24' : '#1e293b';
                const borderColor = isActive ? '#fbbf24' : '#334155';
                const textColor = isActive ? '#0f172a' : '#cbd5e1';
                
                html += `
                    <button onclick="window.switchBuild(${builds.indexOf(build)})"
                            style="background:${bgColor}; border:2px solid ${borderColor}; color:${textColor};
                                   padding:8px 12px; border-radius:8px; cursor:pointer; display:flex; 
                                   align-items:center; gap:8px; font-size:12px; font-weight:${isActive ? 'bold' : 'normal'};
                                   transition:all 0.2s;"
                            onmouseenter="this.style.transform='scale(1.03)'" 
                            onmouseleave="this.style.transform='scale(1)'">
                        <div style="display:flex; align-items:center;">
                            ${keystoneIcon ? `<img src="${CONFIG.DDRAGON_BASE}/img/${keystoneIcon}" style="width:20px; height:20px; border-radius:50%; margin-right:6px;">` : ''}
                            ${subTreeIcon ? `<img src="${CONFIG.DDRAGON_BASE}/img/${subTreeIcon}" style="width:18px; height:18px; border-radius:50%; opacity:0.8;">` : ''}
                        </div>
                        <div style="text-align:left;">
                            <div>${buildPercent}%</div>
                            <div style="font-size:10px; color:${isActive ? '#64748b' : '#64748b'};">${buildWinRate}% WR</div>
                        </div>
                    </button>
                `;
            });
            
            html += `</div></div>`;
        }

        // Предметы со стрелками
        const renderItem = (id, isLast) => {
            const item = AppState.db.items[id];
            if (!item) return '';
            const name = item.name;
            const desc = item.desc;
            const file = item.file;
            const url = `${CONFIG.DDRAGON_BASE}/img/item/${file}`;
            
            let htmlPart = `<div style="display:flex; align-items:center;">`;
            htmlPart += `<div style="text-align:center; position:relative;">
                <img src="${url}" style="width:36px; height:36px; background:#333; border:1px solid #475569; border-radius:4px; cursor:pointer;"
                     onclick="window.openDetailModal('item', '${id}')"
                     onmouseenter="(e) => window.showTooltip(e, '${name.replace(/'/g, "\\'")}', '${desc.replace(/'/g, "\\'")}') " onmouseleave="window.hideTooltip()" onerror="this.style.background='#500'">
                <div style="font-size:11px; color:#cbd5e1; margin-top:3px; max-width:45px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</div>
            </div>`;
            
            if (!isLast) {
                htmlPart += `<svg style="width:20px; height:20px; fill:#475569; margin:0 2px; flex-shrink:0;" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>`;
            }
            htmlPart += `</div>`;
            return htmlPart;
        };

        html += `
            <div style="background:#1e293b; padding:20px; border-radius:8px; border:1px solid #334155;">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #334155; padding-bottom:10px;">
                    <span style="font-weight:bold; color:#fbbf24; font-size:16px;">Build Details</span>
                    <span style="background:#334155; padding:4px 8px; border-radius:4px; font-size:12px; color:#fff;">${usagePercent}% pick</span>
                </div>
                <div style="margin-bottom:20px; display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
                    <div>Win Rate: <strong style="color:${winRate >= 50 ? '#4ade80' : '#f87171'}">${winRate}%</strong></div>
                    <div style="color:#64748b;">(${currentBuild.wins}W / ${currentBuild.games}G)</div>
                </div>

                <!-- SUMMONER SPELLS & RUNES (Первый блок) -->
                <div style="margin-bottom:20px;">
                    <!-- Summoner Spells -->
                    <div style="margin-bottom:15px;">
                        <div style="font-size:12px; color:#cbd5e1; margin-bottom:8px; text-transform:uppercase;">Summoner Spells</div>
                        <div style="display:flex; gap:10px; background:#0f172a; padding:10px; border-radius:8px; width:fit-content; border:1px solid #1e293b;">
                            ${renderSummoner(currentBuild.summoner1)}
                            ${renderSummoner(currentBuild.summoner2)}
                        </div>
                    </div>

                    <!-- Runes -->
                    <div style="border-top:1px solid #334155; padding-top:15px;">
                        <div style="font-size:12px; color:#cbd5e1; margin-bottom:10px; text-transform:uppercase;">Runes</div>
                        <div style="display:flex; gap:15px; flex-wrap:wrap;">
                            ${renderTreeBySlots(perks.primary, '#fbbf24', primaryRuneSet)}
                            ${renderTreeBySlots(perks.sub, '#a78bfa', secondaryRuneSet)}
                        </div>

                        <!-- Stat Shards -->
                        <div style="margin-top:15px; border-top:1px solid #334155; padding-top:10px;">
                            <div style="font-size:11px; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Stat Mods</div>
                            <div style="display:flex; gap:5px; justify-content:center; background:#0f172a; padding:8px; border-radius:6px; width:fit-content; border:1px solid #1e293b;">
                                ${(perks.shards || []).map(id => renderRuneIcon(id, 24, shardsSet)).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SKILLS (Passive + Table) -->
                <div style="margin-bottom:20px;">
                    <div style="font-size:12px; color:#cbd5e1; margin-bottom:8px; text-transform:uppercase;">Skills</div>
                    ${renderPassiveSkill(champ.id)}
                    <div style="font-size:11px; color:#94a3b8; margin-bottom:8px;">Skill Order</div>
                    ${renderSkillsTable(champ.id, currentRoleKey, stats.builds, buildIndex)}
                </div>

                <!-- ITEMS -->
                <div style="margin-bottom:20px;">
                    <div style="font-size:12px; color:#cbd5e1; margin-bottom:8px; text-transform:uppercase;">Item Build Order</div>
                    ${(() => {
                        const builds = Object.values(stats.builds);
                        const currentBuild = builds[buildIndex] || builds[0];
                        const freqAnalysis = currentBuild?.frequencyAnalysis;

                        // Отображаем предметы с частотным анализом
                        const items = currentBuild?.items || [];
                        
                        // Выделяем сапоги из списка
                        const bootsIds = freqAnalysis?.boots?.map(b => b.id) || [];
                        const nonBootsItems = items.filter(id => !bootsIds.includes(id));
                        const bootsItems = items.filter(id => bootsIds.includes(id));

                        // Стрелка между предметами
                        const arrow = '<div style="color:#475569; font-size:18px; font-weight:bold;">→</div>';

                        return `
                        <!-- Стартовые предметы -->
                        ${freqAnalysis?.startingItems && freqAnalysis.startingItems.length > 0 ? `
                        <div style="margin-bottom:12px;">
                            <div style="font-size:11px; color:#94a3b8; margin-bottom:6px; text-transform:uppercase;">Starting Items</div>
                            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                ${freqAnalysis.startingItems.map((start, idx) => `
                                    <div style="background:#1e293b; padding:6px 10px; border-radius:6px; border:1px solid #334155; display:flex; align-items:center; gap:6px;">
                                        ${start.items.map(itemId => {
                                            const item = AppState.db.items[String(itemId)];
                                            const itemImg = item ? `${CONFIG.DDRAGON_BASE}/img/item/${item.file}` : '';
                                            return itemImg ? `<img src="${itemImg}" style="width:24px; height:24px; border-radius:4px;" title="${item.name}">` : '';
                                        }).join('')}
                                        <div style="font-size:9px; color:#64748b; margin-left:4px;">${start.percent}%</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Основные предметы -->
                        <div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center; background:#0f172a; padding:10px; border-radius:8px; border:1px solid #1e293b;">
                            ${nonBootsItems.length > 0
                                ? nonBootsItems.map((id, idx) => {
                                    const item = AppState.db.items[String(id)];
                                    const itemImg = item ? `${CONFIG.DDRAGON_BASE}/img/item/${item.file}` : '';
                                    const itemName = item ? item.name : '';
                                    const itemDesc = item ? item.desc : '';
                                    const freqInfo = freqAnalysis?.items?.find(f => f.id === id);
                                    const freqPercent = freqInfo ? freqInfo.percent : null;
                                    const isBoots = freqAnalysis?.boots?.some(b => b.id === id);

                                    return `
                                        <div style="display:flex; align-items:center; gap:4px;">
                                            <div style="text-align:center; position:relative;"
                                                onmouseenter="window.showTooltip(event, '${itemName.replace(/'/g, "\\'")}', '${itemDesc ? itemDesc.replace(/'/g, "\\'") : ''}')"
                                                onmouseleave="window.hideTooltip()">
                                                <img src="${itemImg}" style="width:36px; height:36px; border-radius:4px; border:${isBoots ? '2px solid #fbbf24' : '1px solid #475569'};">
                                                ${freqPercent ? `<div style="font-size:8px; color:#64748b; text-align:center; margin-top:2px;">${freqPercent}%</div>` : ''}
                                            </div>
                                            ${idx < nonBootsItems.length - 1 ? arrow : ''}
                                        </div>
                                    `;
                                }).join('')
                                : '<span style="color:#64748b; font-size:12px;">No items</span>'}
                        </div>
                        
                        <!-- Сапоги отдельно -->
                        ${bootsItems.length > 0 ? `
                        <div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center; background:#1e293b; padding:10px; border-radius:8px; border:1px solid #334155; margin-top:8px;">
                            <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; margin-right:8px;">Boots:</div>
                            ${bootsItems.map((id, idx) => {
                                const item = AppState.db.items[String(id)];
                                const itemImg = item ? `${CONFIG.DDRAGON_BASE}/img/item/${item.file}` : '';
                                const itemName = item ? item.name : '';
                                const itemDesc = item ? item.desc : '';
                                const bootInfo = freqAnalysis?.boots?.find(b => b.id === id);
                                const freqPercent = bootInfo ? bootInfo.percent : null;

                                return `
                                    <div style="display:flex; align-items:center; gap:4px;">
                                        <div style="text-align:center; position:relative;"
                                            onmouseenter="window.showTooltip(event, '${itemName.replace(/'/g, "\\'")}', '${itemDesc ? itemDesc.replace(/'/g, "\\'") : ''}')"
                                            onmouseleave="window.hideTooltip()">
                                            <img src="${itemImg}" style="width:36px; height:36px; border-radius:4px; border:2px solid #fbbf24;">
                                            ${freqPercent ? `<div style="font-size:8px; color:#64748b; text-align:center; margin-top:2px;">${freqPercent}%</div>` : ''}
                                        </div>
                                        ${idx < bootsItems.length - 1 && bootsItems.length > 1 ? '<div style="color:#475569; font-size:14px;">OR</div>' : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        ` : ''}

                        <!-- Детальная статистика предметов -->
                        ${freqAnalysis ? `
                        <div style="margin-top:12px; background:#1e293b; padding:12px; border-radius:8px; border:1px solid #334155;">
                            <div style="font-size:11px; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Item Statistics</div>
                            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:8px;">
                                ${(freqAnalysis.items || []).filter(item => !bootsIds.includes(item.id)).map(item => {
                                    const itemData = AppState.db.items[String(item.id)];
                                    const itemImg = itemData ? `${CONFIG.DDRAGON_BASE}/img/item/${itemData.file}` : '';
                                    const itemName = itemData?.name || 'Unknown';
                                    const itemDesc = itemData?.desc || '';
                                    return `
                                    <div style="display:flex; align-items:center; gap:8px; background:#0f172a; padding:6px; border-radius:6px; cursor:pointer;"
                                         onmouseenter="window.showTooltip(event, '${itemName.replace(/'/g, "\\'")}', '${itemDesc ? itemDesc.replace(/'/g, "\\'").substring(0, 200) : ''}')"
                                         onmouseleave="window.hideTooltip()">
                                        <img src="${itemImg}" style="width:28px; height:28px; border-radius:4px;">
                                        <div style="flex:1; min-width:0;">
                                            <div style="font-size:10px; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${itemName}</div>
                                            <div style="font-size:9px; color:#64748b;">${item.percent}% • ${item.avgPosition} pos</div>
                                        </div>
                                    </div>`;
                                }).join('')}
                            </div>

                            <!-- Сапоги -->
                            ${freqAnalysis.boots && freqAnalysis.boots.length > 0 ? `
                            <div style="margin-top:10px; padding-top:10px; border-top:1px solid #334155;">
                                <div style="font-size:10px; color:#94a3b8; margin-bottom:6px; text-transform:uppercase;">Boots Options</div>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                    ${freqAnalysis.boots.map(boot => {
                                        const bootData = AppState.db.items[String(boot.id)];
                                        const bootImg = bootData ? `${CONFIG.DDRAGON_BASE}/img/item/${bootData.file}` : '';
                                        const bootName = bootData?.name || 'Boots';
                                        const bootDesc = bootData?.desc || '';
                                        return `
                                        <div style="display:flex; align-items:center; gap:6px; background:#0f172a; padding:6px 10px; border-radius:6px; border:1px solid #475569; cursor:pointer;"
                                             onmouseenter="window.showTooltip(event, '${bootName.replace(/'/g, "\\'")}', '${bootDesc ? bootDesc.replace(/'/g, "\\'").substring(0, 200) : ''}')"
                                             onmouseleave="window.hideTooltip()">
                                            <img src="${bootImg}" style="width:24px; height:24px; border-radius:4px;">
                                            <div>
                                                <div style="font-size:10px; color:#f1f5f9;">${bootName}</div>
                                                <div style="font-size:9px; color:#64748b;">${boot.percent}% pick</div>
                                            </div>
                                        </div>`;
                                    }).join('')}
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}
                        `;
                    })()}
                </div>
            </div>
        `;
    } else {
        html += `<div style="text-align:center; color:#888; padding:20px;">No build data</div>`;
    }

    document.getElementById('detail-content').innerHTML = html;
    window.currentChampData = champ;
    window.renderCurrentRole = (role) => renderChampionDetail(champ, role, window.currentBuildIndex);
}

// Переключение между ролями чемпиона (для мультирольности)
window.switchChampRole = function(role) {
    const champ = window.currentChampData;
    if (!champ) return;
    
    // Проверяем что роль существует и есть данные
    const roleData = champ.roles[role];
    if (!roleData || !roleData.builds || Object.keys(roleData.builds).length === 0) {
        console.warn(`⚠️ Нет данных для роли ${role} на чемпионе ${champ.id}`);
        return;
    }
    
    window.currentDetailRole = role;
    window.currentBuildIndex = 0; // Сбрасываем на первый билд
    renderChampionDetail(champ, role, 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Переключение между билдами
window.switchBuild = function(buildIndex) {
    const champ = window.currentChampData;
    if (!champ) return;

    const role = window.currentDetailRole || champ.primary_role;
    renderChampionDetail(champ, role, buildIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Переключение Pro Builds
window.toggleProBuilds = async function(champId, role) {
    const container = document.getElementById('pro-builds-container');
    if (!container) return;
    
    // Если уже открыто - закрываем
    if (container.dataset.isOpen === 'true') {
        container.innerHTML = '';
        container.dataset.isOpen = 'false';
        return;
    }
    
    // Показываем загрузку
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">Loading pro builds...</div>';
    container.dataset.isOpen = 'true';
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/pro-builds/${champId}?role=${role}`);
        const data = await response.json();
        
        if (!data.matches || data.matches.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">No pro builds available</div>';
            return;
        }
        
        renderProBuilds(container, data.matches, champId);
    } catch (error) {
        console.error('Error loading pro builds:', error);
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#f87171;">Error loading pro builds</div>';
        container.dataset.isOpen = 'false';
    }
};

// Рендер Pro Builds списка
function renderProBuilds(container, matches, champId) {
    const champInfo = AppState.db.champions[champId];
    const champName = champInfo ? champInfo.name : champId;
    
    let html = `
        <div style="background:#1e293b; border-radius:8px; border:1px solid #334155; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#0f172a; border-bottom:1px solid #334155;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="color:#fbbf24; font-weight:bold; font-size:14px;">🏆 Pro Builds - ${champName}</span>
                    <span style="color:#64748b; font-size:12px;">${matches.length} games</span>
                </div>
                <button onclick="document.getElementById('pro-builds-container').innerHTML=''; document.getElementById('pro-builds-container').dataset.isOpen='false'"
                        style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:18px;"
                        onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='#94a3b8'">&times;</button>
            </div>
            <div style="max-height:500px; overflow-y:auto;">
    `;
    
    matches.forEach((match, idx) => {
        const winColor = match.win ? '#4ade80' : '#f87171';
        const kda = `${match.kills}/${match.deaths}/${match.assists}`;
        const cs = match.cs || 0;
        // gameDuration приходит в миллисекундах, конвертируем в минуты
        const duration = Math.round((match.gameDuration || 0) / 60000);

        // Стартовые предметы (первые 2-3)
        const startingItems = (match.items || []).slice(0, 3);

        // Иконка кестоуна
        const keystoneId = match.perks?.keystone;
        const keystoneIcon = keystoneId && AppState.db.runes[String(keystoneId)]
            ? AppState.db.runes[String(keystoneId)].icon
            : '';

        // Иконка вторичной ветки
        const subTreeId = match.perks?.sub;
        const subTreeIcon = subTreeId && AppState.db.runeTrees[String(subTreeId)]
            ? AppState.db.runeTrees[String(subTreeId)].icon
            : '';
        
        // Проверка данных для отладки
        if (!match.summonerName || match.summonerName === 'Unknown') {
            console.warn('⚠️ Missing summonerName in match:', match);
        }
        if (duration === 0) {
            console.warn('⚠️ gameDuration is 0 or missing:', match.gameDuration, match);
        }
        
        const rowBg = idx % 2 === 0 ? '#1e293b' : '#0f172a';
        
        html += `
            <div style="border-bottom:1px solid #334155;">
                <div style="display:grid; grid-template-columns: 1fr 100px 120px 80px 140px 40px; align-items:center; 
                            padding:10px 16px; background:${rowBg}; cursor:pointer; transition:background 0.2s;"
                     onclick="window.toggleProMatch(${idx})"
                     onmouseenter="this.style.background='#334155'" onmouseleave="this.style.background='${rowBg}'">
                    <!-- Игрок и KDA -->
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="text-align:left;">
                            <div style="font-weight:bold; color:#f1f5f9; font-size:13px;">${match.summonerName || 'Unknown'}</div>
                            <div style="font-size:11px; color:#64748b;">${match.playerRank || ''} • ${kda} • ${cs} CS</div>
                        </div>
                    </div>
                    
                    <!-- Руны и предметы -->
                    <div style="display:flex; align-items:center; gap:8px; justify-content:center;">
                        <!-- Руны -->
                        <div style="display:flex; gap:3px; align-items:center;">
                            ${keystoneIcon ? `<img src="${CONFIG.DDRAGON_BASE}/img/${keystoneIcon}" style="width:24px; height:24px; border-radius:50%;" title="Keystone">` : ''}
                            ${(match.perks?.primaryRunes || []).slice(0, 3).map(runeId => {
                                const rune = AppState.db.runes[String(runeId)];
                                const runeIcon = rune ? `${CONFIG.DDRAGON_BASE}/img/${rune.path}` : '';
                                const runeName = rune ? rune.name : '';
                                return runeIcon ? `<img src="${runeIcon}" style="width:16px; height:16px; border-radius:50%; opacity:0.8;" title="${runeName}">` : '';
                            }).join('')}
                            ${subTreeIcon ? `<img src="${CONFIG.DDRAGON_BASE}/img/${subTreeIcon}" style="width:20px; height:20px; border-radius:50%; opacity:0.7;" title="Secondary Tree">` : ''}
                            ${(match.perks?.secondaryRunes || []).slice(0, 2).map(runeId => {
                                const rune = AppState.db.runes[String(runeId)];
                                const runeIcon = rune ? `${CONFIG.DDRAGON_BASE}/img/${rune.path}` : '';
                                const runeName = rune ? rune.name : '';
                                return runeIcon ? `<img src="${runeIcon}" style="width:14px; height:14px; border-radius:50%; opacity:0.6;" title="${runeName}">` : '';
                            }).join('')}
                        </div>
                    </div>

                    <!-- Предметы (только первые 3 для компактности) -->
                    <div style="display:flex; gap:4px; justify-content:center;">
                        ${(match.items || []).slice(0, 3).map(itemId => {
                            const item = AppState.db.items[String(itemId)];
                            const itemImg = item ? `${CONFIG.DDRAGON_BASE}/img/item/${item.file}` : '';
                            const itemName = item ? item.name : '';
                            const itemDesc = item ? item.desc : '';
                            return itemImg
                                ? `<img src="${itemImg}" style="width:22px; height:22px; border-radius:4px; border:1px solid #475569; cursor:pointer;"
                                    title="${itemName.replace(/"/g, '&quot;')}"
                                    onclick="window.openDetailModal('pro_match_item', null, {img: '${itemImg}', name: '${itemName.replace(/'/g, "\\'")}', desc: '${itemDesc.replace(/'/g, "\\'")}'})"
                                    onmouseenter="window.showTooltip(event, '${itemName.replace(/'/g, "\\'")}', '${itemDesc.replace(/'/g, "\\'") || ''}')"
                                    onmouseleave="window.hideTooltip()">`
                                : '';
                        }).join('')}
                    </div>
                    
                    <!-- Результат -->
                    <div style="text-align:center;">
                        <span style="color:${winColor}; font-weight:bold; font-size:12px;">${match.win ? 'WIN' : 'LOSE'}</span>
                        <div style="font-size:10px; color:#64748b;">${duration} min</div>
                    </div>
                    
                    <!-- Стрелка -->
                    <div style="text-align:center; color:#64748b;" id="arrow-${idx}">▼</div>
                </div>
                
                <!-- Раскрывающаяся детальная информация -->
                <div id="pro-match-detail-${idx}" style="display:none; padding:16px; background:#0f172a; border-bottom:1px solid #334155;">
                    <div style="display:flex; gap:20px; flex-wrap:wrap;">
                        <!-- Стартовые предметы -->
                        <div>
                            <div style="font-size:11px; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Starting Items</div>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                ${startingItems.map(itemId => {
                                    const item = AppState.db.items[String(itemId)];
                                    const itemImg = item ? `${CONFIG.DDRAGON_BASE}/img/item/${item.file}` : '';
                                    const itemName = item ? item.name : '';
                                    return itemImg
                                        ? `<img src="${itemImg}" style="width:32px; height:32px; border-radius:4px; border:1px solid #fbbf24;" title="${itemName}">`
                                        : '';
                                }).join('')}
                            </div>
                        </div>

                        <!-- Порядок покупки предметов -->
                        ${match.itemPurchases?.itemPurchaseTimeline && match.itemPurchases.itemPurchaseTimeline.length > 0 ? `
                        <div>
                            <div style="font-size:11px; color:#fbbf24; margin-bottom:8px; text-transform:uppercase;">Item Purchase Order</div>
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                ${match.itemPurchases.itemPurchaseTimeline.map((purchase, idx) => {
                                    const item = AppState.db.items[String(purchase.itemId)];
                                    const itemImg = item ? `${CONFIG.DDRAGON_BASE}/img/item/${item.file}` : '';
                                    const itemName = item ? item.name : '';
                                    return `
                                        <div style="display:flex; align-items:center; gap:8px; background:#1e293b; padding:4px 8px; border-radius:4px;">
                                            <div style="font-size:9px; color:#64748b; min-width:35px;">${purchase.minutes}:00</div>
                                            <img src="${itemImg}" style="width:24px; height:24px; border-radius:4px;" title="${itemName}">
                                            <div style="font-size:10px; color:#cbd5e1;">${itemName}</div>
                                        </div>
                                    `;
                                }).slice(0, 8).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Полные предметы -->
                        <div>
                            <div style="font-size:11px; color:#64748b; margin-bottom:8px; text-transform:uppercase;">Full Build</div>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                ${(match.items || []).map(itemId => {
                                    const item = AppState.db.items[String(itemId)];
                                    const itemImg = item ? `${CONFIG.DDRAGON_BASE}/img/item/${item.file}` : '';
                                    const itemName = item ? item.name : '';
                                    const itemDesc = item ? item.desc : '';
                                    return itemImg
                                        ? `<div style="text-align:center; cursor:pointer;"
                                            onclick="window.openDetailModal('pro_match_item', null, {img: '${itemImg}', name: '${itemName.replace(/'/g, "\\'")}', desc: '${itemDesc.replace(/'/g, "\\'")}'})"
                                            onmouseenter="window.showTooltip(event, '${itemName.replace(/'/g, "\\'")}', '')"
                                            onmouseleave="window.hideTooltip()">
                                            <img src="${itemImg}" style="width:32px; height:32px; border-radius:4px; border:1px solid #475569;">
                                           </div>`
                                        : '';
                                }).join('')}
                            </div>
                        </div>
                        
                        <!-- Заклинания -->
                        <div>
                            <div style="font-size:11px; color:#64748b; margin-bottom:8px; text-transform:uppercase;">Summoners</div>
                            <div style="display:flex; gap:6px;">
                                ${[match.summoner1, match.summoner2].map(spId => {
                                    const sp = AppState.db.summoners[String(spId)];
                                    const spImg = sp ? `${CONFIG.DDRAGON_BASE}/img/spell/${sp.file}` : '';
                                    return spImg ? `<img src="${spImg}" style="width:32px; height:32px; border-radius:4px; border:2px solid #fbbf24;">` : '';
                                }).join('')}
                            </div>
                        </div>
                        
                        <!-- Руны подробно -->
                        <div style="flex:1; min-width:200px;">
                            <div style="font-size:11px; color:#64748b; margin-bottom:8px; text-transform:uppercase;">Runes</div>
                            <div style="display:flex; gap:15px; flex-wrap:wrap;">
                                ${match.perks?.primary ? renderMiniTree(String(match.perks.primary), match.perks.primaryRunes) : ''}
                                ${match.perks?.sub ? renderMiniTree(String(match.perks.sub), match.perks.secondaryRunes) : ''}
                            </div>
                        </div>
                        
                        <!-- Статистика -->
                        <div style="text-align:right;">
                            <div style="font-size:11px; color:#64748b;">Game Length</div>
                            <div style="color:#f1f5f9; font-weight:bold;">${duration} minutes</div>
                            <div style="font-size:11px; color:#64748b; margin-top:8px;">Tier</div>
                            <div style="color:#fbbf24; font-weight:bold;">${match.tier || 'Unknown'}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div></div>`;
    container.innerHTML = html;
}

// Рендер мини-дерева рун
function renderMiniTree(treeId, runeIds = []) {
    if (!treeId) return '';
    const tree = AppState.db.runeTrees[String(treeId)];
    if (!tree) {
        console.warn('⚠️ Tree not found:', treeId, 'Available:', Object.keys(AppState.db.runeTrees));
        return '';
    }

    const treeIcon = tree.icon ? `${CONFIG.DDRAGON_BASE}/img/${tree.icon}` : '';

    let html = `<div style="display:flex; flex-direction:column; align-items:center; gap:4px;">`;
    if (treeIcon) {
        html += `<img src="${treeIcon}" style="width:28px; height:28px; border-radius:50%;">`;
    }
    html += `<div style="display:flex; gap:3px; flex-wrap:wrap;">`;

    (runeIds || []).forEach(runeId => {
        const rune = AppState.db.runes[String(runeId)];
        if (rune && rune.path) {
            html += `<img src="${CONFIG.DDRAGON_BASE}/img/${rune.path}" style="width:18px; height:18px; border-radius:50%;" title="${rune.name}">`;
        }
    });

    html += `</div></div>`;
    return html;
}

// Переключение детали про матча
window.toggleProMatch = function(idx) {
    const detail = document.getElementById(`pro-match-detail-${idx}`);
    const arrow = document.getElementById(`arrow-${idx}`);
    if (!detail || !arrow) return;
    
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        detail.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
};

// Helper внутри файла (можно вынести в utils, но пока оставим тут для изоляции)
// styleId - ID дерева рун, colorHex - цвет заголовка, selectedSet - Set с ID выбранных рун для подсветки
function renderTreeBySlots(styleId, colorHex, selectedSet = null) {
    const tree = AppState.db.runeTrees[styleId];
    if (!tree || !tree.slots) return '';
    const slotsToRender = tree.slots;

    let htmlTree = `
        <div style="flex:1; min-width:200px;">
            <div style="font-size:14px; color:${colorHex}; margin-bottom:10px; font-weight:bold; text-transform:uppercase; border-bottom:1px solid #334155; padding-bottom:5px;">
                ${tree.name}
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; background:#0f172a; padding:10px; border-radius:8px; border:1px solid #1e293b;">
    `;
    slotsToRender.forEach((slot, idx) => {
        if (!slot.runes) return;
        htmlTree += `<div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap;">`;
        slot.runes.forEach(runeData => {
            // Передаем selectedSet для подсветки только выбранных рун в этой ветке
            htmlTree += renderRuneIcon(runeData.id, 28, selectedSet);
        });
        htmlTree += `</div>`;
        if (idx < slotsToRender.length - 1) {
            htmlTree += `<div style="height:1px; background:#1e293b; margin:2px 0;"></div>`;
        }
    });
    htmlTree += `</div></div>`;
    return htmlTree;
}