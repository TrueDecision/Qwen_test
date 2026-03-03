import { AppState } from './state.js';
import { renderSkillsTable } from './skill-order.js';

// Переэкспортируем renderSkillsTable из skill-order.js
export { renderSkillsTable };

// Отрисовка пассивного навыка (отдельный блок, не в таблице)
// Эта функция используется напрямую, а renderSkillsTable импортируется из skill-order.js
export function renderPassiveSkill(champKey) {
    const champ = AppState.db.champions[champKey];
    if (!champ || !champ.passive) return '';

    const pImg = `${window.CONFIG.DDRAGON_BASE}/img/passive/${champ.passive.image.full}`;

    return `
    <div style="background:#0f172a; padding:12px; border-radius:8px; border:1px solid #334155; margin-bottom:15px;">
        <div style="display:flex; align-items:center; gap:10px; cursor:pointer;"
             onclick="window.openDetailModal('champion_skill', null, ${JSON.stringify({...champ.passive, key:'Passive'}).replace(/"/g, '&quot;')})">
            <img src="${pImg}" style="width:40px; height:40px; border-radius:6px; border:2px solid #f97316; background:#1e293b;">
            <div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-weight:bold; color:#f97316; font-size:14px;">P - ${champ.passive.name}</span>
                </div>
                <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${champ.passive.description}</div>
            </div>
        </div>
    </div>`;
}