/**
 * Логика взаимоисключающих предметов
 * Некоторые предметы исключают друг друга - можно иметь только один из группы
 */

// Группы взаимоисключающих предметов
export const MUTUALLY_EXCLUSIVE_ITEMS = {
    // Сапоги - только 1
    boots: [3006, 3009, 3020, 3047, 3111, 3117, 3158],
    
    // Тиамат группа - только 1
    tiamat: [3077, 6630, 6631, 6632],  // Tiamat, Goredrinker, Eclipse, Prowler's Claw
    
    // Sheen группа - только 1
    sheen: [3078, 3004, 3508, 6632],  // Trinity Force, Manamune, Essence Reaver, Prowler's Claw
    
    // Stormrazor группа - только 1
    stormrazor: [3094, 6671, 6672, 6673],  // Stormrazor, Galeforce, Kraken Slayer, Immortal Shieldbow
    
    // Hydra группа - только 1
    hydra: [3074, 3748, 6609, 6630],  // Ravenous Hydra, Titanic Hydra, Chemtank, Goredrinker
    
    // Support items - только 1
    support: [3850, 3851, 3853, 3854, 3855, 3857, 3858, 3859, 3860, 3861, 3862, 3863, 3864, 3865, 3866, 3867, 3868, 3869, 3870, 3871, 4005],
    
    // Jungle items - только 1
    jungle: [6691, 6692, 6693, 6694, 6695, 6696],  // Mosstominator, etc.
    
    // Crown группы - только 1
    crown: [6616, 6617],  // Everfrost, Crown of the Shattered Queen
};

// Обратный маппинг - какой группе принадлежит предмет
const itemToGroup = {};
Object.entries(MUTUALLY_EXCLUSIVE_ITEMS).forEach(([groupName, items]) => {
    items.forEach(itemId => {
        itemToGroup[itemId] = groupName;
    });
});

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
        return existingGroup === newGroup && itemId !== newItemId;
    });
    
    return !hasConflictingItem;
}

/**
 * Получить конфликтующие предметы для данного
 * @param {number} itemId - ID предмета
 * @returns {number[]} - Список конфликтующих предметов
 */
export function getConflictingItems(itemId, currentItems = []) {
    const group = itemToGroup[itemId];
    if (!group) return [];
    
    return MUTUALLY_EXCLUSIVE_ITEMS[group].filter(id => 
        currentItems.includes(id) && id !== itemId
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
