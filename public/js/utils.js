import { CONFIG } from './config.js';
import { AppState } from './state.js';

export function getRoleColor(role) {
    const colors = {
        'TOP': '#ef4444',      // Красный
        'JUNGLE': '#22c55e',   // Зелёный
        'MID': '#3b82f6',      // Синий
        'MIDDLE': '#3b82f6',   // Синий (алиас)
        'ADC': '#eab308',      // Жёлтый
        'BOTTOM': '#eab308',   // Жёлтый (алиас)
        'SUPPORT': '#14b8a6',  // Бирюзовый
        'UTILITY': '#14b8a6',  // Бирюзовый (алиас)
        'UNKNOWN': '#71717a'   // Серый
    };
    return colors[role] || '#71717a';
}

export function setStatus(status) {
    const flagEl = document.getElementById('status-flag');
    if (!flagEl) return;
    const icons = { 'green': '🟢', 'red': '🔴', 'yellow': '🟡', 'gray': '⚪' };
    flagEl.className = `status-flag status-${status}`;
    flagEl.textContent = icons[status] || '⚪';
}

// Тултипы
window.showTooltip = function(e, title, desc) {
    const tooltip = document.getElementById('game-tooltip');
    if (!tooltip || !title) return;
    
    const safeTitle = title ? title.replace(/"/g, '&quot;') : '';
    const safeDesc = desc ? desc.replace(/"/g, '&quot;') : '';
    
    tooltip.innerHTML = `<div class="tooltip-title">${safeTitle}</div><div class="tooltip-desc">${safeDesc}</div>`;
    tooltip.style.display = 'block';
    
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

// Модальное окно
window.openDetailModal = function(type, id, data) {
    const overlay = document.getElementById('detail-modal');
    if (!overlay) return;

    let title = '', subtitle = '', desc = '', imgSrc = '', stats = '';

    if (type === 'item') {
        const item = AppState.db.items[id];
        if (!item) return;
        title = item.name;
        subtitle = `Item ID: ${id}`;
        desc = item.desc;
        imgSrc = `${CONFIG.DDRAGON_BASE}/img/item/${item.file}`;
        stats = item.stats || '';
    } else if (type === 'rune') {
        const rune = AppState.db.runes[id];
        if (!rune) return;
        title = rune.name;
        subtitle = rune.style || 'Stat Mod';
        desc = rune.desc;
        imgSrc = `${CONFIG.DDRAGON_BASE}/img/${rune.path}`;
    } else if (type === 'summoner') {
        const sp = AppState.db.summoners[id];
        if (!sp) return;
        title = sp.name;
        subtitle = 'Summoner Spell';
        desc = sp.desc;
        imgSrc = `${CONFIG.DDRAGON_BASE}/img/spell/${sp.file}`;
    } else if (type === 'champion_skill') {
        title = data.name;
        subtitle = data.key === 'Passive' ? 'Passive Ability' : `Ability (${data.key})`;
        desc = data.description ? data.description.replace(/<[^>]*>?/gm, '') : '';
        const folder = data.key === 'Passive' ? 'passive' : 'spell';
        imgSrc = `${CONFIG.DDRAGON_BASE}/img/${folder}/${data.image.full}`;
    } else if (type === 'pro_match_item') {
        // Для предметов из Pro Builds - просто показываем картинку
        imgSrc = data.img;
        title = data.name;
        subtitle = 'Item';
        desc = data.desc || '';
    }

    document.getElementById('modal-img').src = imgSrc;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-subtitle').textContent = subtitle;
    document.getElementById('modal-desc').innerHTML = desc;
    document.getElementById('modal-stats').textContent = stats;

    overlay.style.display = 'flex';
};

window.closeDetailModal = function() {
    const overlay = document.getElementById('detail-modal');
    if (overlay) overlay.style.display = 'none';
};