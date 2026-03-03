function renderRunesSection(perks) {
    const { db } = AppState;
    if (!perks || (!perks.primary && !perks.shards)) return '';

    const selectedIds = new Set([
        ...(perks.primaryRunes || []),
        ...(perks.secondaryRunes || []),
        ...(perks.shards || [])
    ].map(String));

    const renderRuneIcon = (runeId, size = 28) => {
        const strId = String(runeId);
        const rune = db.runes[strId];
        if (!rune) return `<div style="width:${size}px;height:${size}px;background:#1e293b;border-radius:50%"></div>`;
        
        const isSelected = selectedIds.has(strId);
        const url = `${CONFIG.DDRAGON_BASE}/img/${rune.path}`;
        const opacity = isSelected ? '1' : '0.3';
        const border = isSelected ? '2px solid #fbbf24' : '1px solid #334155';
        const shadow = isSelected ? '0 0 10px rgba(251, 191, 36, 0.6)' : 'none';
        const scale = isSelected ? 'scale(1.1)' : 'scale(1)';

        return `<div style="position:relative; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; margin:1px; cursor:pointer;"
                 onmouseenter="(e) => showTooltip(e, '${rune.name.replace(/'/g, "\\'")}', '${rune.desc.replace(/'/g, "\\'")}') " onmouseleave="hideTooltip()">
            <img src="${url}" 
                 style="width:100%; height:100%; border-radius:50%; background:#0f172a; border:${border}; box-shadow:${shadow}; 
                        opacity:${opacity}; transition:all 0.2s; transform:${scale};" 
                 onerror="this.style.visibility='hidden'; this.style.background='#334155'">
        </div>`;
    };

    const renderTree = (styleId, colorHex) => {
        const tree = db.runeTrees[styleId];
        if (!tree || !tree.slots) return '';
        const slotsToRender = tree.slots; // Или slice(1) для secondary

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
            slot.runes.forEach(runeData => htmlTree += renderRuneIcon(runeData.id, 28));
            htmlTree += `</div>`;
            if (idx < slotsToRender.length - 1) htmlTree += `<div style="height:1px; background:#1e293b; margin:2px 0;"></div>`;
        });
        htmlTree += `</div></div>`;
        return htmlTree;
    };

    let html = `<div style="margin-bottom:20px;">
        <div style="font-size:12px; color:#cbd5e1; margin-bottom:10px; text-transform:uppercase;">Runes</div>
        <div style="display:flex; gap:15px; flex-wrap:wrap;">
            ${renderTree(perks.primary, '#fbbf24')}
            ${renderTree(perks.sub, '#a78bfa')}
        </div>
        
        <!-- Stat Shards -->
        <div style="margin-top:15px; border-top:1px solid #334155; padding-top:10px;">
            <div style="font-size:11px; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Stat Mods</div>
            <div style="display:flex; gap:4px; justify-content:center;">
                ${(perks.shards || []).map(id => renderRuneIcon(id, 24)).join('')}
            </div>
        </div>
    </div>`;

    return html;
}