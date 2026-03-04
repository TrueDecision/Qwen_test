/**
 * Порядок прокачки умений для чемпионов
 *
 * Логика:
 * 1. Сначала 3 базовых навыка (Q, W, E) на уровнях 1-3
 * 2. Ульт на 6, 11, 16
 * 3. Остальные 15 уровней распределяются:
 *    - Приоритетный навык: 1 + 4 докачки = 5 уровней (макс)
 *    - Второй навык: 1 + 3 докачки = 4 уровня
 *    - Третий навык: 1 + 1 докачка = 2 уровня
 */

import { AppState } from './state.js';

// === ПАТТЕРНЫ ПРОКАЧКИ ===
// Формат: [уровни для Q, уровни для W, уровни для E, уровни для R]
// R всегда на 6, 11, 16

export const SKILL_PATTERNS = {
    // Стандартный: Q -> W -> E (ADC, Mages)
    // Q максим первым, W вторым, E последним
    STANDARD: {
        Q: [1, 4, 7, 10, 13, 15, 17],  // 7 уровней (макс)
        W: [2, 8, 12, 14, 18],          // 5 уровней
        E: [3, 5, 9],                    // 3 уровня
        R: [6, 11, 16]                   // 3 уровня
    },
    
    // Q -> E -> W (некоторые маги)
    STANDARD_E: {
        Q: [1, 4, 7, 10, 13, 15, 17],
        E: [2, 8, 12, 14, 18],
        W: [3, 5, 9],
        R: [6, 11, 16]
    },
    
    // W -> Q -> E (некоторые чемпионы)
    W_FIRST: {
        W: [1, 4, 7, 10, 13, 15, 17],
        Q: [2, 8, 12, 14, 18],
        E: [3, 5, 9],
        R: [6, 11, 16]
    },
    
    // E -> Q -> W (саппорты с контролем)
    SUPPORT: {
        E: [1, 4, 7, 10, 13, 15, 17],  // Максим контроль
        Q: [2, 8, 12, 14, 18],          // Второй приоритет
        W: [3, 5, 9],                    // Последним
        R: [6, 11, 16]
    },
    
    // E -> W -> Q (танки)
    TANK: {
        E: [1, 4, 7, 10, 13, 15, 17],  // Максим защиту/контроль
        W: [2, 8, 12, 14, 18],          // Второй
        Q: [3, 5, 9],                    // Последним
        R: [6, 11, 16]
    }
};

// === КЛАССИФИКАЦИЯ ЧЕМПИОНОВ ===
const CHAMPION_TYPES = {
    // Саппорты с контролем
    SUPPORT: ['12', '16', '25', '26', '37', '40', '41', '42', '44', '53', '89', '111', '117', '143', '161', '201', '223', '235', '254', '267', '350', '412', '432', '497', '526', '555', '888', '893', '901'],
    
    // Танки
    TANK: ['1', '2', '14', '36', '43', '54', '75', '78', '83', '86', '89', '111', '122', '141', '150', '161', '201', '202', '223', '240', '254', '266', '412', '516', '526', '555', '799', '800', '875', '888', '897'],
    
    // Маги с Q основным
    MAGE_Q: ['1', '34', '61', '63', '69', '74', '85', '90', '99', '101', '103', '112', '115', '126', '134', '142', '145', '157', '161', '238', '245', '246', '268', '350', '497', '517', '518', '615', '711', '777', '804', '875', '910'],
    
    // ADC
    ADC: ['21', '22', '51', '67', '81', '96', '110', '119', '145', '18', '202', '222', '236', '429', '498', '523', '895']
};

// === ОПРЕДЕЛЕНИЕ ТИПА ЧЕМПИОНА ===
export function getChampionType(champId, role) {
    // Приоритет по роли
    if (role === 'SUPPORT') return 'SUPPORT';
    if (role === 'TOP' && CHAMPION_TYPES.TANK.includes(champId)) return 'TANK';
    if (role === 'ADC' || role === 'BOTTOM') return 'STANDARD';
    if (role === 'MIDDLE' && CHAMPION_TYPES.MAGE_Q.includes(champId)) return 'STANDARD';
    
    // По списку чемпионов
    if (CHAMPION_TYPES.SUPPORT.includes(champId)) return 'SUPPORT';
    if (CHAMPION_TYPES.TANK.includes(champId)) return 'TANK';
    if (CHAMPION_TYPES.ADC.includes(champId)) return 'STANDARD';
    
    // По умолчанию
    return 'STANDARD';
}

// === ПОЛУЧЕНИЕ ПОРЯДКА ПРОКАЧКИ ===
// Теперь принимает builds и buildIndex для получения реальных skill orders
export function getSkillOrder(champId, role, builds = null, buildIndex = 0) {
    // Пытаемся получить реальный skill order из билдов
    if (builds && typeof builds === 'object' && !Array.isArray(builds)) {
        const buildList = Object.values(builds);
        const currentBuild = buildList[buildIndex] || buildList[0];
        if (currentBuild?.skillOrders && currentBuild.skillOrders.length > 0) {
            // Берём первый skill order и дозаполняем до 18 уровня
            const realSkillOrder = currentBuild.skillOrders[0];
            return fillIncompleteSkillOrder(realSkillOrder);
        }
    }

    // Фоллбэк на статический паттерн
    const champType = getChampionType(champId, role);
    return SKILL_PATTERNS[champType] || SKILL_PATTERNS.STANDARD;
}

// === ДОЗАПОЛНЕНИЕ SKILL ORDER ДО 18 УРОВНЯ ===
// Если skill order обрывается раньше 18 уровня, дозаполняем его
// следуя логике: сначала максим приоритетный навык, потом второй, потом третий
// R берётся высшим приоритетом на уровнях 6, 11, 16
export function fillIncompleteSkillOrder(skillOrder) {
    if (!skillOrder || !skillOrder.byLevel || skillOrder.byLevel.length === 0) {
        return SKILL_PATTERNS.STANDARD;
    }

    const byLevel = [...skillOrder.byLevel];

    // Пересчитываем Q, W, E, R из byLevel - это реальные уровни прокачки!
    const Q = [];
    const W = [];
    const E = [];
    const R = [];

    byLevel.forEach((skill, idx) => {
        const lvl = idx + 1;  // Уровни 1-18
        if (skill === 'Q') Q.push(lvl);
        else if (skill === 'W') W.push(lvl);
        else if (skill === 'E') E.push(lvl);
        else if (skill === 'R') R.push(lvl);
    });

    // Считаем сколько раз уже прокачан каждый навык
    const skillCounts = {
        Q: Q.length,
        W: W.length,
        E: E.length,
        R: R.length
    };

    // Максимальные уровни для каждого навыка
    const MAX_LEVELS = { Q: 5, W: 5, E: 5, R: 3 };

    // Определяем приоритет прокачки - только навыки, которые ещё не максималены
    // Сортируем по количеству уже прокачанных уровней (убывание)
    const priorityOrder = ['Q', 'W', 'E']
        .filter(skill => skillCounts[skill] < MAX_LEVELS[skill])  // Только не максималеные
        .sort((a, b) => skillCounts[b] - skillCounts[a]);

    // Дозаполняем до 18 уровней
    for (let lvl = byLevel.length + 1; lvl <= 18; lvl++) {
        // R всегда на 6, 11, 16 если ещё не взят
        if ((lvl === 6 || lvl === 11 || lvl === 16) && skillCounts.R < MAX_LEVELS.R) {
            byLevel.push('R');
            R.push(lvl);
            skillCounts.R++;
            continue;
        }

        // Пересчитываем приоритет после каждого уровня (навык может стать максималеным)
        const currentPriorityOrder = ['Q', 'W', 'E']
            .filter(skill => skillCounts[skill] < MAX_LEVELS[skill])
            .sort((a, b) => skillCounts[b] - skillCounts[a]);

        // Качаем приоритетный навык, который ещё не максимален
        let skilled = false;
        for (const skill of currentPriorityOrder) {
            if (skillCounts[skill] < MAX_LEVELS[skill]) {
                byLevel.push(skill);
                // Добавляем уровень в список прокачки этого навыка
                const newLevelList = [...(skill === 'Q' ? Q : skill === 'W' ? W : E), lvl];
                newLevelList.sort((a, b) => a - b);
                if (skill === 'Q') Q.length = 0, Q.push(...newLevelList);
                else if (skill === 'W') W.length = 0, W.push(...newLevelList);
                else E.length = 0, E.push(...newLevelList);
                skillCounts[skill]++;
                skilled = true;
                break;
            }
        }

        // Если все навыки максималены (не должно случиться), заполняем первым доступным
        if (!skilled) {
            const available = ['Q', 'W', 'E'].find(s => skillCounts[s] < MAX_LEVELS[s]);
            if (available) {
                byLevel.push(available);
                if (available === 'Q') Q.push(lvl);
                else if (available === 'W') W.push(lvl);
                else E.push(lvl);
                skillCounts[available]++;
            }
        }
    }

    return { byLevel, Q, W, E, R };
}

// === ОТРИСОВКА ТАБЛИЦЫ НАВЫКОВ ===
// Теперь принимает builds и buildIndex для получения реальных skill orders
export function renderSkillsTable(champKey, role = 'TOP', builds = null, buildIndex = 0) {
    const champ = AppState.db.champions[champKey];
    if (!champ || !champ.spells) return '';

    const spells = champ.spells;
    // Передаём builds и buildIndex в getSkillOrder
    const skillLevelOrder = getSkillOrder(champKey, role, builds, buildIndex);
    const champType = getChampionType(champKey, role);

    // Генерируем заголовок таблицы
    let headerRow = '<tr><th class="skill-icon-cell">Skill</th>';
    for(let i=1; i<=18; i++) headerRow += `<th style="width:24px; font-size:10px;">${i}</th>`;
    headerRow += '</tr>';

    let bodyRows = '';

    // Функция для генерации строки навыка
    const generateRow = (spell, key, rowClass, levelOrder) => {
        if (!spell) return '';
        const name = spell.name;
        const img = `${window.CONFIG.DDRAGON_BASE}/img/spell/${spell.image.full}`;

        let cells = '';
        for(let lvl=1; lvl<=18; lvl++) {
            const active = levelOrder.includes(lvl);
            cells += `<td>${active ? '<div class="skill-point active"></div>' : ''}</td>`;
        }

        return `
        <tr class="${rowClass}">
            <td style="text-align:left; padding:6px; background:#1e293b;">
                <div style="display:flex; align-items:center; gap:6px; cursor:pointer;"
                     onclick="window.openDetailModal('champion_skill', null, ${JSON.stringify({...spell, key}).replace(/"/g, '&quot;')})">
                    <img src="${img}" style="width:22px; height:22px; border-radius:4px; border:1px solid #475569;">
                    <span style="font-weight:bold; color:#fbbf24; font-size:13px;">${key}</span>
                </div>
                <div style="font-size:9px; color:#94a3b8; margin-top:2px;">${name}</div>
            </td>
            ${cells}
        </tr>`;
    };

    // Активные скиллы - определяем по индексу массива
    if (spells[0]) bodyRows += generateRow(spells[0], 'Q', 'row-q', skillLevelOrder['Q']);
    if (spells[1]) bodyRows += generateRow(spells[1], 'W', 'row-w', skillLevelOrder['W']);
    if (spells[2]) bodyRows += generateRow(spells[2], 'E', 'row-e', skillLevelOrder['E']);
    if (spells[3]) bodyRows += generateRow(spells[3], 'R', 'row-r', skillLevelOrder['R']);

    const patternName = champType === 'STANDARD' ? 'Q Max' : 
                        champType === 'SUPPORT' ? 'E Max (Support)' :
                        champType === 'TANK' ? 'E/W Max (Tank)' : 'Custom';

    return `
    <div class="skill-table-container">
        <table class="skill-table">
            <thead>${headerRow}</thead>
            <tbody>${bodyRows}</tbody>
        </table>
        <div style="font-size:9px; color:#64748b; margin-top:5px; text-align:center;">* ${patternName} skill order</div>
    </div>`;
}
