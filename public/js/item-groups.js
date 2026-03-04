/**
 * Логика взаимоисключающих предметов
 * Некоторые предметы исключают друг друга - можно иметь только один из группы
 */

// Группы взаимоисключающих предметов
export const MUTUALLY_EXCLUSIVE_ITEMS = {
    // Doran's предметы - только 1
    dorans: [1055, 1056, 1054],  // Doran's Blade, Doran's Ring, Doran's Shield
    
    // Саппорт предметы - только 1
    support: [
        3850, 3851, 3853,  // Relic Shield line
        3854, 3855, 3857,  // Spellthief line
        3858, 3859, 3860,  // Steel Shoulderguards line
        3861, 3862, 3863,  // Spectral Sickle line
        3864, 3865, 3866,  // Ancient Coin line
        3867, 3868, 3869,  // Shurelya's line
        3870, 3871, 4005   // Other support
    ],
    
    // Сапоги - только 1
    boots: [
        3006,  // Berserker's Greaves
        3009,  // Boots of Swiftness
        3020,  // Sorcerer's Shoes
        3047,  // Plated Steelcaps
        3111,  // Mercury's Treads
        3117,  // Mobility Boots
        3158   // Ionian Boots of Lucidity
    ],
    
    // Лесник предметы - только 1
    jungle: [
        1039,  // Hunter's Machete
        1041,  // Emberknife
        6691,  // Mosstominator
        6692,  // Scorchclaw Pup
        6693,  // Challenging Smite
        6694,  // Chilling Smite
        6695,  // Stalking Blade
        6696   // Challenging Smite (upgraded)
    ],
    
    // Hydra группа - только 1
    hydra: [
        3074,  // Ravenous Hydra
        3748,  // Titanic Hydra
        6609,  // Profane Hydra
        6333,  // Stridebreaker
        3077   // Tiamat
    ],
    
    // Sheen группа - только 1
    sheen: [
        3078,  // Trinity Force
        3100,  // Lich Bane
        3025,  // Iceborn Gauntlet
        3031,  // Essence Reaver
        6692,  // Duskblade of Draktharr
        6693   // Dawnbringer
    ],
    
    // Защитные / Мифические - только 1
    defensive_mythic: [
        3053,  // Sterak's Gage
        3156,  // Maw of Malmortius
        3119,  // Protoplasm Harness
        3003,  // Archangel's Staff
        3040,  // Seraph's Embrace (Archangel upgrade)
        6673,  // Immortal Shieldbow
        3078,  // Trinity Force
        3100   // Lich Bane
    ],
    
    // Armor Penetration - только 1
    armor_pen: [
        3033,  // Mortal Reminder
        6694,  // Serylda's Grudge
        3071,  // Black Cleaver
        3036,  // Lord Dominik's Regards
        3124   // Terminus
    ],
    
    // Spellshield - только 1
    spellshield: [
        3102,  // Banshee's Veil
        3179   // Edge of Night
    ],
    
    // Manamune/Muramana (один предмет, разные стадии)
    manamune_line: [3004, 3042],  // Manamune, Muramana
    
    // Archangel/Seraph (один предмет, разные стадии)
    archangel_line: [3003, 3040]  // Archangel's Staff, Seraph's Embrace
};

// Предметы которые являются upgrade других (не считаются за отдельные)
export const ITEM_UPGRADES = {
    3042: 3004,  // Muramana → Manamune
    3040: 3003,  // Seraph's Embrace → Archangel's Staff
    3026: 3156,  // Guardian Angel → Maw (пример)
};

// Обратный маппинг - какой группе принадлежит предмет
const itemToGroup = {};
Object.entries(MUTUALLY_EXCLUSIVE_ITEMS).forEach(([groupName, items]) => {
    items.forEach(itemId => {
        itemToGroup[itemId] = groupName;
    });
});

// Предметы которые считаются "одним и тем же" для статистики
export const ITEM_EQUIVALENTS = {
    3004: [3042],  // Manamune = Muramana
    3042: [3004],  // Muramana = Manamune
    3003: [3040],  // Archangel's = Seraph's
    3040: [3003],  // Seraph's = Archangel's
};

/**
 * Получить "базовый" предмет (если это апгрейд)
 * @param {number} itemId - ID предмета
 * @returns {number} - ID базового предмета или тот же ID
 */
export function getBaseItem(itemId) {
    return ITEM_UPGRADES[itemId] || itemId;
}

/**
 * Проверка можно ли добавить предмет к текущим
 * @param {number} newItemId - ID предмета который хотим добавить
 * @param {number[]} currentItems - Текущие предметы
 * @returns {boolean} - Можно ли добавить
 */
export function canAddItem(newItemId, currentItems = []) {
    const newGroup = itemToGroup[newItemId];
    
    // Если предмет не в группе - можно добавлять
    if (!newGroup) return true;
    
    // Проверяем есть ли уже предмет из этой группы
    const hasConflictingItem = currentItems.some(itemId => {
        const existingGroup = itemToGroup[itemId];
        
        // Если это эквивалентные предметы (Manamune/Muramana) - не конфликт
        if (ITEM_EQUIVALENTS[newItemId]?.includes(itemId)) {
            return false;
        }
        
        return existingGroup === newGroup && itemId !== newItemId;
    });
    
    return !hasConflictingItem;
}

/**
 * Получить конфликтующие предметы для данного
 * @param {number} itemId - ID предмета
 * @param {number[]} currentItems - Текущие предметы
 * @returns {number[]} - Список конфликтующих предметов
 */
export function getConflictingItems(itemId, currentItems = []) {
    const group = itemToGroup[itemId];
    if (!group) return [];
    
    return MUTUALLY_EXCLUSIVE_ITEMS[group].filter(id => 
        currentItems.includes(id) && 
        id !== itemId && 
        !ITEM_EQUIVALENTS[itemId]?.includes(id)
    );
}

/**
 * Получить название группы предмета
 * @param {number} itemId - ID предмета
 * @returns {string|null} - Название группы или null
 */
export function getItemGroup(itemId) {
    return itemToGroup[itemId] || null;
}

/**
 * Получить все предметы из той же группы
 * @param {number} itemId - ID предмета
 * @returns {number[]} - Все предметы группы
 */
export function getGroupItems(itemId) {
    const group = itemToGroup[itemId];
    if (!group) return [];
    return MUTUALLY_EXCLUSIVE_ITEMS[group] || [];
}

/**
 * Получить все группы предметов
 * @returns {Object} - Все группы
 */
export function getAllGroups() {
    return MUTUALLY_EXCLUSIVE_ITEMS;
}
