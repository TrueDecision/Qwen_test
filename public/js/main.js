import { AppState } from './state.js';
import { setStatus } from './utils.js';
import { loadGameData, loadStats } from './data-loader.js';
import { renderList, initFilters, initSearch } from './render-list.js';
import { CONFIG } from './config.js';

// Делаем CONFIG доступным глобально для inline HTML событий (onclick и т.д.)
window.CONFIG = CONFIG;

async function initApp() {
    setStatus('gray');
    const listEl = document.getElementById('champions-list');
    if (listEl) listEl.innerHTML = '<div style="text-align:center; padding:40px; color:#888;">Loading databases...</div>';

    // 1. Load Game Data (Champions, Items, Runes)
    const dataLoaded = await loadGameData();
    if (!dataLoaded) {
        setStatus('red');
        if (listEl) listEl.innerHTML = '<div style="color:red; text-align:center;">Error loading game data. Check console.</div>';
        return;
    }

    // 2. Load Match Stats
    const statsLoaded = await loadStats();
    if (!statsLoaded) {
        setStatus('red');
        if (listEl) listEl.innerHTML = '<div style="color:red; text-align:center;">Error loading match stats.</div>';
        return;
    }

    // 3. Update UI
    const metaEl = document.getElementById('header-meta');
    if (metaEl && AppState.globalData) {
        metaEl.textContent = `${AppState.globalData.total_matches_analyzed} games | Patch Live`;
    }

    setStatus('green');
    
    // 4. Инициализация фильтров и поиска
    initFilters();
    initSearch();
    
    // 5. Рендер списка
    renderList();

    console.log('🚀 App initialized successfully');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);

document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('view-detail').classList.add('hidden');
    document.getElementById('view-detail').style.display = 'none';

    const viewList = document.getElementById('view-list');
    viewList.classList.remove('hidden');
    viewList.style.display = 'block';

    document.getElementById('back-btn').style.display = 'none';
    document.getElementById('page-title').textContent = 'LoL Stats EUW';
    
    // Сбрасываем фильтры при возврате? Можно оставить как есть
    // initFilters();
    // initSearch();
    // renderList();
    
    window.scrollTo(0, 0);
});