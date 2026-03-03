import { CONFIG } from './config.js';
import { AppState } from './state.js';
import { getRoleColor } from './utils.js';
import { renderChampionDetail } from './render-detail.js';

// Текущие фильтры
let currentRoleFilter = 'ALL';
let currentSearchQuery = '';

// Инициализация фильтров (вызывается из main.js)
export function initFilters() {
    const filterContainer = document.getElementById('role-filters');
    if (!filterContainer) return;
    
    const roles = ['ALL', 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
    
    filterContainer.innerHTML = roles.map(role => {
        const isActive = role === currentRoleFilter;
        const bgColor = role === 'ALL' ? '#3b82f6' : getRoleColor(role);
        const borderColor = isActive ? '#fbbf24' : 'transparent';
        const boxShadow = isActive ? `0 0 12px ${bgColor}88` : 'none';
        
        return `
            <button data-role="${role}"
                    style="background:${bgColor}; color:white; border:2px solid ${borderColor};
                           padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px;
                           font-weight:${isActive ? 'bold' : 'normal'}; transition:all 0.2s;
                           box-shadow: ${boxShadow};"
                    onmouseenter="this.style.transform='scale(1.05)'; this.style.boxShadow='0 0 15px ${bgColor}AA'"
                    onmouseleave="this.style.transform='scale(1)'; this.style.boxShadow='${boxShadow}'">
                ${role === 'ALL' ? '🏆 Все' : role}
            </button>
        `;
    }).join('');
    
    // Обработчики кликов
    filterContainer.querySelectorAll('button[data-role]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentRoleFilter = e.target.dataset.role;
            renderList();
            initFilters(); // Перерисовать кнопки для обновления подсветки
        });
    });
}

// Инициализация поиска (вызывается из main.js)
export function initSearch() {
    const searchInput = document.getElementById('champion-search');
    if (!searchInput) return;
    
    searchInput.value = currentSearchQuery;
    
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase().trim();
        renderList();
    });
}

export function renderList() {
    const listEl = document.getElementById('champions-list');
    if (!listEl || !AppState.globalData) {
        if(listEl) listEl.innerHTML = '<div style="text-align:center; color:#888;">No data</div>';
        return;
    }

    let champions = AppState.globalData.champions;
    let arr = Object.values(champions);

    // Фильтр по роли
    if (currentRoleFilter !== 'ALL') {
        arr = arr.filter(champ => champ.primary_role === currentRoleFilter);
    }
    
    // Поиск по имени
    if (currentSearchQuery) {
        arr = arr.filter(champ => {
            const champInfo = AppState.db.champions[champ.id];
            const champName = champInfo ? champInfo.name.toLowerCase() : `champ_${champ.id}`.toLowerCase();
            return champName.includes(currentSearchQuery);
        });
    }

    if (arr.length === 0) {
        const msg = currentSearchQuery 
            ? `No champions found for "${currentSearchQuery}"`
            : `No ${currentRoleFilter} champions in cache`;
        listEl.innerHTML = `<div style="text-align:center; color:#888; padding:40px;">${msg}</div>`;
        return;
    }

    listEl.innerHTML = '';
    
    // Сортировка по количеству игр
    arr.sort((a, b) => (b.total_games || 0) - (a.total_games || 0));
    
    arr.forEach(champ => {
        const role = champ.primary_role;
        const stats = champ.roles[role];
        if (!stats) return;
        const winColor = stats.win_rate >= 50 ? '#4ade80' : '#f87171';

        const champInfo = AppState.db.champions[champ.id];
        const champName = champInfo ? champInfo.name : `Champ_${champ.id}`;
        const fileName = champInfo ? champInfo.file : `${champ.id}.png`;
        const imgUrl = `${CONFIG.DDRAGON_BASE}/img/champion/${fileName}`;

        const card = document.createElement('div');
        card.className = 'champ-card';
        card.style.cssText = 'cursor:pointer; background:#1e293b; padding:10px; border-radius:8px; border:1px solid #334155; display:flex; align-items:center; margin-bottom:10px; transition:transform 0.2s;';
        card.onmouseenter = () => card.style.transform = 'scale(1.02)';
        card.onmouseleave = () => card.style.transform = 'scale(1)';
        card.onclick = () => navigateToDetail(champ.id, role);

        // Получаем цвет роли через функцию
        const roleColor = getRoleColor(role);

        card.innerHTML = `
            <div style="position:relative; margin-right:15px; flex-shrink:0;">
                <img src="${imgUrl}" style="width:50px; height:50px; border-radius:8px; border:2px solid #555; background:#000; display:block;" onerror="this.style.background='#500'">
                <div style="position:absolute; bottom:-6px; right:-6px; width:22px; height:22px; border-radius:50%; background:${roleColor}; border:2px solid #27272a; color:white; font-size:11px; display:flex; align-items:center; justify-content:center; font-weight:bold; box-shadow: 0 2px 8px ${roleColor}66;">${role[0]}</div>
            </div>
            <div style="flex:1; min-width:0;">
                <div style="font-weight:700; font-size:16px; color:#fff;">${champName}</div>
                <div style="font-size:13px; color:#a1a1aa; display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                    <span style="background:#3f3f46; padding:2px 6px; border-radius:4px; font-size:11px; color:${roleColor}; font-weight:bold;">${role}</span>
                    <span style="color:${winColor}; font-weight:bold;">${stats.win_rate}% WR</span>
                    <span style="color:#71717a;">${stats.games} games</span>
                </div>
            </div>
        `;
        listEl.appendChild(card);
    });
    
    // Показываем счетчик
    const totalCount = Object.values(AppState.globalData.champions).length;
    const filteredCount = arr.length;
    const counterEl = document.getElementById('champion-counter');
    if (counterEl) {
        counterEl.textContent = filteredCount === totalCount 
            ? `${totalCount} champions`
            : `${filteredCount} / ${totalCount} champions`;
    }
}

function navigateToDetail(champId, initialRole) {
    const champ = AppState.globalData.champions[champId];
    if (!champ) return;

    document.getElementById('view-list').classList.add('hidden');
    document.getElementById('view-list').style.display = 'none';

    const viewDetail = document.getElementById('view-detail');
    viewDetail.classList.remove('hidden');
    viewDetail.style.display = 'block';

    document.getElementById('back-btn').style.display = 'block';
    document.getElementById('page-title').textContent = AppState.db.champions[champId]?.name || champ.name;

    renderChampionDetail(champ, initialRole);
    window.scrollTo(0, 0);
}

// Экспортируем функцию навигации для использования в backBtn
window.navigateToDetail = navigateToDetail;

// Экспортируем текущие фильтры для внешнего использования
export { currentRoleFilter, currentSearchQuery };