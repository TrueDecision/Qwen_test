/**
 * Convert final-test-data.json to server format
 * 
 * ПРАВИЛЬНЫЙ АНАЛИЗ БИЛДОВ ПО ВАШЕМУ ПРОМТУ:
 * 
 * 1. Фильтр по роли (самый высокий приоритет)
 * 2. Иерархический анализ рун:
 *    - Основное древо → Краеугольный камень → Малые руны (по слотам) → Вторичная ветка → Руны вторички → Адаптивные бонусы
 * 3. Анализ предметов:
 *    - Стартовый набор (первые 1-2 минуты)
 *    - Core Build (последовательность первых 3 легендарных предметов)
 *    - Сапоги (самые популярные + минута покупки)
 *    - Финишная сборка (6 предметов)
 * 4. Анализ прокачки скиллов (приоритет максимизации)
 * 5. Анализ призывных заклинаний (пары)
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'cache', 'final-test-data.json');
const OUTPUT_FILE = path.join(__dirname, 'cache', 'full-analytics-stats.json');

// === КОНФИГУРАЦИЯ ===
const BOOTS_IDS = new Set([3006, 3009, 3020, 3047, 3111, 3117, 3158]);
const STARTING_ITEMS = new Set([
    // Doran's
    1055, 1056, 1054,
    // Лесник
    1039, 1041,
    // Саппорт
    3850, 3851, 3854, 3858,
    // Зелья и старт
    2003, 2031, 2033, 2055,
    // Меч
    1036
]);
// Аксессуары (варды) — исключать из стартовых наборов
const TRINKET_IDS = new Set([3340, 3363, 3364]); // Stealth Ward, Farsight Alteration, Oracle Lens
// Предметы которые считаются "первыми предметами" (не стартовые, не сапоги, не компоненты)
const FIRST_ITEM_CANDIDATES = new Set([
    // Mythics
    6617, 6653, 6655, 6656, 6657, 6660, 6661, 6662, 6664, 6665, 6666, 6667, 6670, 6671, 6672, 6673, 6675, 6676, 6677,
    3001, 3003, 3004, 3011, 3015, 3026, 3031, 3033, 3036, 3040, 3042, 3046, 3050, 3053, 3059, 3065, 3068, 3071, 3072, 3074, 3075,
    3078, 3083, 3089, 3091, 3094, 3095, 3100, 3102, 3107, 3109, 3110, 3115, 3116, 3119, 3121, 3124, 3133, 3135, 3139, 3140, 3142,
    3143, 3144, 3146, 3147, 3151, 3152, 3153, 3156, 3157, 3161, 3165, 3179, 3180, 3181, 3190, 3193, 3222, 3504, 3508, 3513,
    3599, 3742, 3814, 4005, 4401, 4403, 4628, 4629, 4630, 4632, 4633, 4636, 4637, 4638, 4643, 4644, 4645, 6029, 6035, 6333,
    6609, 6610, 6616, 6630, 6631, 6632, 6650, 6651, 6652, 6660, 6661, 6662, 6664, 6665, 6666, 6667,
    6670, 6671, 6672, 6673, 6675, 6676, 6677, 6691, 6692, 6693, 6694, 6695, 6696, 6700
]);

console.log('\n🔄 CONVERTING DATA FORMAT (HIERARCHICAL BUILD ANALYSIS)\n');

const testData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
const serverFormat = {};

let totalChamps = 0;
let totalGames = 0;

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

// Группировка массива по ключу
function groupBy(array, keyFn) {
    return array.reduce((acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});
}

// Подсчёт частоты значений в массиве
function countFrequency(array, keyFn) {
    const counts = {};
    array.forEach(item => {
        const key = keyFn(item);
        counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
}

// Получить топ-N элементов из объекта частот
function getTopN(freqObj, n) {
    return Object.entries(freqObj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);
}

// ============================================================================
// АНАЛИЗ РУН (ИЕРАРХИЧЕСКИЙ ПОДХОД)
// ============================================================================

function analyzeRunes(games) {
    try {
        if (!games || games.length === 0) return null;

        // Извлекаем perks из игр, правильно обрабатывая структуру
        const perksList = games.map(g => {
            const perks = g.perks;
            if (!perks || !perks.primary) {
                return null;
            }
            return {
                primary: perks.primary,
                keystone: perks.keystone,
                sub: perks.sub,
                // primaryRunes может быть массивом объектов или чисел
                primaryRunes: Array.isArray(perks.primaryRunes)
                    ? perks.primaryRunes.map(r => typeof r === 'object' ? r.perk : r)
                    : [],
                // secondaryRunes может быть массивом объектов или чисел
                secondaryRunes: Array.isArray(perks.secondaryRunes)
                    ? perks.secondaryRunes.map(r => typeof r === 'object' ? r.perk : r)
                    : [],
                shards: perks.shards || []
            };
        }).filter(p => p && p.primary);

        if (perksList.length === 0) return null;

        // ШАГ 1: Найти самое популярное Основное древо
        const primaryTreeCounts = countFrequency(perksList, p => p.primary);
        const [mostPopularPrimaryTree] = getTopN(primaryTreeCounts, 1);
        const primaryTreeId = mostPopularPrimaryTree ? parseInt(mostPopularPrimaryTree[0]) : perksList[0].primary;

        // Фильтруем игры с этим основным древом
        const gamesWithPrimaryTree = perksList.filter(p => p.primary === primaryTreeId);
        if (gamesWithPrimaryTree.length === 0) return null;

        // ШАГ 2: Среди игр с этим древом найти самый популярный Краеугольный камень
        const keystoneCounts = countFrequency(gamesWithPrimaryTree, p => p.keystone);
        const [mostPopularKeystone] = getTopN(keystoneCounts, 1);
        const keystoneId = mostPopularKeystone ? parseInt(mostPopularKeystone[0]) : gamesWithPrimaryTree[0].keystone;

        // Фильтруем игры с этим кестоуном
        const gamesWithKeystone = gamesWithPrimaryTree.filter(p => p.keystone === keystoneId);
        if (gamesWithKeystone.length === 0) return null;

        // ШАГ 3: Найти самые популярные малые руны для основной ветки (по слотам)
        const runeSlotCounts = [[], [], [], []];
        gamesWithKeystone.forEach(p => {
            const runes = p.primaryRunes || [];
            runes.forEach((runeId, idx) => {
                if (idx < 4 && runeId) {
                    runeSlotCounts[idx][runeId] = (runeSlotCounts[idx][runeId] || 0) + 1;
                }
            });
        });

        const primaryRunes = [
            keystoneId,
            ...runeSlotCounts.slice(1, 4).map(slotCounts => {
                const top = getTopN(slotCounts, 1)[0];
                return top ? parseInt(top[0]) : 0;
            })
        ];

        // ШАГ 4: Найти самую популярную вторичную ветку
        const subTreeCounts = countFrequency(gamesWithKeystone, p => p.sub);
        const [mostPopularSubTree] = getTopN(subTreeCounts, 1);
        const subTreeId = mostPopularSubTree ? parseInt(mostPopularSubTree[0]) : (gamesWithKeystone[0].sub || 0);

        const gamesWithSubTree = gamesWithKeystone.filter(p => p.sub === subTreeId);

        // ШАГ 5: Найти самые популярные руны во вторичной ветке (топ-2)
        let secondaryRunes = [];
        if (gamesWithSubTree && gamesWithSubTree.length > 0) {
            const secondaryRuneCounts = {};
            gamesWithSubTree.forEach(p => {
                (p.secondaryRunes || []).forEach(runeId => {
                    if (runeId) {
                        secondaryRuneCounts[runeId] = (secondaryRuneCounts[runeId] || 0) + 1;
                    }
                });
            });
            const topSecondary = getTopN(secondaryRuneCounts, 2);
            secondaryRunes = topSecondary.map(x => parseInt(x[0]));
        }

        // ШАГ 6: Найти самые популярные адаптивные бонусы (3 ячейки)
        const shardCounts = [[], [], []];
        gamesWithKeystone.forEach(p => {
            const shards = p.shards || [];
            shards.forEach((shardId, idx) => {
                if (idx < 3 && shardId) {
                    shardCounts[idx][shardId] = (shardCounts[idx][shardId] || 0) + 1;
                }
            });
        });

        const shards = shardCounts.map(slotCounts => {
            const top = getTopN(slotCounts, 1)[0];
            return top ? parseInt(top[0]) : 0;
        });

        return {
            primary: parseInt(primaryTreeId),
            keystone: parseInt(keystoneId),
            primaryRunes: primaryRunes.map(x => parseInt(x)),
            sub: parseInt(subTreeId),
            secondaryRunes: secondaryRunes,
            shards: shards
        };
    } catch (error) {
        return null;
    }
}

// ============================================================================
// АНАЛИЗ ПРЕДМЕТОВ
// ============================================================================

function analyzeItems(games, role) {
    if (!games || games.length === 0) return null;

    // === СТАРТОВЫЕ ПРЕДМЕТЫ ===
    // Анализируем первые 1-2 минуты игры (до первого возврата)
    // Исключаем варды — их покупают всегда, это не часть билда
    const startingItemCombos = {};

    games.forEach(game => {
        const itemPurchases = game.itemPurchases;
        if (!itemPurchases) return;

        // Берем startingItems и исключаем варды
        let startingItems = (itemPurchases.startingItems || [])
            .filter(id => !TRINKET_IDS.has(id));

        // Если startingItems пустой после фильтрации, берем из timeline
        if (startingItems.length === 0) {
            startingItems = (itemPurchases.itemPurchaseTimeline || [])
                .filter(p => p.minutes <= 2 && !TRINKET_IDS.has(p.itemId))
                .map(p => p.itemId);
        }

        if (startingItems.length > 0) {
            const key = startingItems.slice().sort().join('-');
            if (!startingItemCombos[key]) {
                startingItemCombos[key] = { count: 0, wins: 0, items: startingItems };
            }
            startingItemCombos[key].count++;
            if (game.win) startingItemCombos[key].wins++;
        }
    });

    const topStartingItems = Object.values(startingItemCombos)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(s => ({
            items: s.items,
            count: s.count,
            percent: games.length > 0 ? ((s.count / games.length) * 100).toFixed(1) : 0,
            winRate: s.count > 0 ? ((s.wins / s.count) * 100).toFixed(1) : 0
        }));

    // === ЧАСТОТНЫЙ АНАЛИЗ ВСЕХ ПРЕДМЕТОВ ===
    // Считаем частоту каждого предмета из финальных предметов игры
    const itemFrequency = {};
    const itemPositions = {};

    games.forEach((game, gameIdx) => {
        const items = game.items || [];
        
        // Считаем каждый предмет в финальном билде
        items.forEach((itemId, idx) => {
            if (!itemFrequency[itemId]) {
                itemFrequency[itemId] = { count: 0, positions: [], wins: 0 };
            }
            itemFrequency[itemId].count++;
            itemFrequency[itemId].positions.push(idx);
            if (game.win) itemFrequency[itemId].wins++;
        });
    });

    // === CORE BUILD (последовательность первых 3 легендарных предметов) ===
    // Анализируем порядок покупки первых предметов (исключая сапоги и стартовые)
    const coreBuildSequences = {};

    games.forEach(game => {
        const itemPurchases = game.itemPurchases;

        // Получаем порядок покупки предметов из timeline
        let purchaseOrder = [];
        if (itemPurchases && itemPurchases.itemPurchaseTimeline) {
            purchaseOrder = itemPurchases.itemPurchaseTimeline
                .sort((a, b) => a.timestamp - b.timestamp)
                .map(p => p.itemId);
        } else {
            purchaseOrder = game.items || [];
        }

        // Фильтруем только "первые предметы" (не сапоги, не стартовые, не варды)
        const coreItems = purchaseOrder.filter(id =>
            !BOOTS_IDS.has(id) && !STARTING_ITEMS.has(id) && !TRINKET_IDS.has(id)
        );

        // Берем первые 3 для последовательности
        const coreSequence = coreItems.slice(0, 3);
        if (coreSequence.length >= 2) {
            const seqKey = coreSequence.join('-');
            coreBuildSequences[seqKey] = (coreBuildSequences[seqKey] || 0) + 1;
        }
    });

    // Находим самую популярную последовательность
    const [topSequence] = getTopN(coreBuildSequences, 1);
    let coreBuildOrder = topSequence ? topSequence[0].split('-').map(x => parseInt(x)) : [];

    // Если последовательностей мало, формируем по частоте предметов (исключая сапоги и стартовые)
    if (coreBuildOrder.length < 3) {
        coreBuildOrder = Object.entries(itemFrequency)
            .filter(([id]) => !BOOTS_IDS.has(Number(id)) && !STARTING_ITEMS.has(Number(id)) && !TRINKET_IDS.has(Number(id)))
            .sort((a, b) => {
                if (b[1].count !== a[1].count) return b[1].count - a[1].count;
                // Сортируем по средней позиции (раньше купленные primero)
                const aAvg = a[1].positions.reduce((s, x) => s + x, 0) / a[1].positions.length;
                const bAvg = b[1].positions.reduce((s, x) => s + x, 0) / b[1].positions.length;
                return aAvg - bAvg;
            })
            .slice(0, 3)
            .map(x => parseInt(x[0]));
    }

    // === САПОГИ ===
    const bootsFrequency = {};
    const bootsPurchaseTimes = {};

    games.forEach(game => {
        const itemPurchases = game.itemPurchases;
        if (itemPurchases && itemPurchases.itemPurchaseTimeline) {
            itemPurchases.itemPurchaseTimeline.forEach(p => {
                if (BOOTS_IDS.has(p.itemId)) {
                    bootsFrequency[p.itemId] = (bootsFrequency[p.itemId] || 0) + 1;
                    if (!bootsPurchaseTimes[p.itemId]) {
                        bootsPurchaseTimes[p.itemId] = [];
                    }
                    bootsPurchaseTimes[p.itemId].push(p.minutes);
                }
            });
        }
        
        // Также проверяем финальные предметы
        (game.items || []).forEach(id => {
            if (BOOTS_IDS.has(id) && !bootsFrequency[id]) {
                bootsFrequency[id] = (bootsFrequency[id] || 0) + 1;
            }
        });
    });

    const totalBootsGames = Object.values(bootsFrequency).reduce((a, b) => a + b, 0);
    const topBoots = Object.entries(bootsFrequency)
        .map(([id, count]) => ({
            id: parseInt(id),
            count,
            percent: totalBootsGames > 0 ? ((count / totalBootsGames) * 100).toFixed(1) : 0,
            avgPurchaseTime: bootsPurchaseTimes[id] 
                ? (bootsPurchaseTimes[id].reduce((a, b) => a + b, 0) / bootsPurchaseTimes[id].length).toFixed(1)
                : 'N/A'
        }))
        .sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent));

    // === ФИНИШНАЯ СБОРКА (6 предметов) ===
    // Находим самую частую комбинацию из 6 предметов
    const fullBuildCombos = {};

    games.forEach(game => {
        // Берем финальные предметы, исключая стартовые и варды
        const items = (game.items || []).filter(id =>
            !STARTING_ITEMS.has(id) && !TRINKET_IDS.has(id)
        );
        if (items.length >= 5) {
            // Сортируем для группировки одинаковых комбинаций
            const comboKey = items.slice(0, 6).sort().join('-');
            fullBuildCombos[comboKey] = (fullBuildCombos[comboKey] || 0) + 1;
        }
    });

    const [topFullBuild] = getTopN(fullBuildCombos, 1);
    // fullBuildItems это отсортированный массив ID (для комбинации)
    const fullBuildItems = topFullBuild ? topFullBuild[0].split('-').map(x => parseInt(x)) : [];

    // === ФОРМИРУЕМ ИТОГОВЫЙ БИЛД ===
    // Берем предметы из itemFrequency, отсортированные по позиции покупки
    // Это даст правильный порядок предметов в билде
    const itemsByPosition = Object.entries(itemFrequency)
        .filter(([id]) => {
            const itemId = Number(id);
            // Исключаем: варды, стартовые предметы, сапоги, компоненты
            // Оставляем только финальные предметы из FIRST_ITEM_CANDIDATES
            return FIRST_ITEM_CANDIDATES.has(itemId);
        })
        .sort((a, b) => {
            // Сначала по средней позиции (возрастание)
            const aAvg = a[1].positions.reduce((s, x) => s + x, 0) / a[1].positions.length;
            const bAvg = b[1].positions.reduce((s, x) => s + x, 0) / b[1].positions.length;
            if (aAvg !== bAvg) return aAvg - bAvg;
            // Потом по частоте (убывание)
            return b[1].count - a[1].count;
        })
        .map(x => parseInt(x[0]));

    // finalBuildOrder = топ-5 предметов по позиции + сапог (если есть)
    let finalBuildOrder = itemsByPosition.slice(0, 5);
    
    // Добавляем самый популярный сапог на позицию 1 (после первого предмета)
    if (topBoots.length > 0 && topBoots[0].percent >= 40) {
        finalBuildOrder.splice(1, 0, topBoots[0].id);
    }

    // Частотный анализ для отображения
    const itemsWithStats = Object.entries(itemFrequency)
        .map(([id, stats]) => ({
            id: parseInt(id),
            count: stats.count,
            percent: games.length > 0 ? ((stats.count / games.length) * 100).toFixed(1) : 0,
            avgPosition: (stats.positions.reduce((a, b) => a + b, 0) / stats.positions.length).toFixed(2),
            winRate: stats.count > 0 ? ((stats.wins / stats.count) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return parseFloat(a.avgPosition) - parseFloat(b.avgPosition);
        });

    return {
        startingItems: topStartingItems,
        coreBuildOrder: coreBuildOrder,
        boots: topBoots,
        fullBuild: fullBuildItems,
        finalBuildOrder: finalBuildOrder,
        items: itemsWithStats.slice(0, 10)
    };
}

// ============================================================================
// АНАЛИЗ ПРИЗЫВНЫХ ЗАКЛИНАНИЙ
// ============================================================================

function analyzeSummoners(games, role) {
    if (!games || games.length === 0) return { summoner1: 4, summoner2: 14 };

    const summonerPairs = {};
    
    games.forEach(game => {
        const s1 = game.summoners?.[0] || game.summoner1;
        const s2 = game.summoners?.[1] || game.summoner2;
        if (s1 && s2) {
            // Нормализуем пару (сортируем для консистентности)
            const pair = [s1, s2].sort().join('-');
            summonerPairs[pair] = (summonerPairs[pair] || 0) + 1;
        }
    });

    const [topPair] = getTopN(summonerPairs, 1);
    if (topPair) {
        const [s1, s2] = topPair[0].split('-').map(x => parseInt(x));
        return { summoner1: s1, summoner2: s2 };
    }

    // Fallback для джунглей
    if (role === 'JUNGLE') {
        return { summoner1: 11, summoner2: 4 }; // Smite + Flash
    }
    
    return { summoner1: 4, summoner2: 14 }; // Flash + Teleport/Ignite
}

// ============================================================================
// АНАЛИЗ ПРОКАЧКИ СКИЛЛОВ
// ============================================================================

function analyzeSkillOrders(games) {
    if (!games || games.length === 0) return null;

    const skillOrders = games
        .map(g => g.skillOrder)
        .filter(so => so && so.byLevel);

    if (skillOrders.length === 0) return null;

    // Находим самый популярный порядок прокачки (по первым 6 уровням)
    const sequenceCounts = {};
    skillOrders.forEach(so => {
        const seq = (so.byLevel || []).slice(0, 6).join('-');
        if (seq) {
            sequenceCounts[seq] = (sequenceCounts[seq] || 0) + 1;
        }
    });

    const [topSequence] = getTopN(sequenceCounts, 1);
    let topSkillOrder = topSequence ? skillOrders.find(so =>
        (so.byLevel || []).slice(0, 6).join('-') === topSequence[0]
    ) : skillOrders[0];

    // === ДОЗАПОЛНЕНИЕ SKILL ORDER ДО 18 УРОВНЯ ===
    // Если skill order обрывается раньше 18 уровня, дозаполняем его
    let byLevel = topSkillOrder?.byLevel || [];
    
    if (byLevel.length < 18) {
        // Считаем сколько раз уже прокачан каждый навык
        const skillCounts = { Q: 0, W: 0, E: 0, R: 0 };
        byLevel.forEach(s => { if (s) skillCounts[s]++; });

        // Определяем приоритет максимизации по текущему skill order
        const skillFirstLevel = { Q: null, W: null, E: null, R: null };
        byLevel.forEach((s, idx) => {
            if (s && skillFirstLevel[s] === null) {
                skillFirstLevel[s] = idx + 1;
            }
        });

        // Сортируем Q, W, E по первому уровню прокачки (приоритет максимизации)
        const priorityOrder = ['Q', 'W', 'E']
            .filter(s => skillFirstLevel[s] !== null)
            .sort((a, b) => skillFirstLevel[a] - skillFirstLevel[b]);

        // Дозаполняем до 18 уровней
        for (let lvl = byLevel.length + 1; lvl <= 18; lvl++) {
            // R всегда на 6, 11, 16 если ещё не взят
            if ((lvl === 6 || lvl === 11 || lvl === 16) && skillCounts.R < 3) {
                byLevel.push('R');
                skillCounts.R++;
            } else {
                // Берем следующий навык по приоритету, который ещё не максимален (5 уровней)
                for (const skill of priorityOrder) {
                    if (skillCounts[skill] < 5) {
                        byLevel.push(skill);
                        skillCounts[skill]++;
                        break;
                    }
                }
            }
        }
    }

    // Пересчитываем skillPriority из дозаполненного byLevel
    const skillMaxOrder = { Q: [], W: [], E: [], R: [] };
    byLevel.forEach((s, idx) => {
        if (s && !skillMaxOrder[s].includes(idx + 1)) {
            skillMaxOrder[s].push(idx + 1);
        }
    });

    const skillPriority = Object.entries(skillMaxOrder)
        .filter(([skill]) => skill !== 'R')
        .sort((a, b) => {
            const aFirst = skillMaxOrder[a[0]].length > 0 ? Math.min(...skillMaxOrder[a[0]]) : 999;
            const bFirst = skillMaxOrder[b[0]].length > 0 ? Math.min(...skillMaxOrder[b[0]]) : 999;
            return aFirst - bFirst;
        })
        .map(([skill]) => skill);

    return {
        byLevel: byLevel,
        skillPriority: skillPriority,
        allOrders: skillOrders.slice(0, 10)
    };
}

// ============================================================================
// ОСНОВНОЙ ЦИКЛ КОНВЕРТАЦИИ
// ============================================================================

Object.entries(testData).forEach(([champId, roles]) => {
    const champData = {
        id: champId,
        roles: {},
        total_games: 0,
        matches: []
    };

    Object.entries(roles).forEach(([role, roleData]) => {
        const games = roleData.games || [];
        let roleWins = 0;
        let roleGames = 0;

        games.forEach(game => {
            roleGames++;
            if (game.win) roleWins++;
        });

        // === ИЕРАРХИЧЕСКИЙ АНАЛИЗ ===
        
        // 1. Анализ рун
        const runes = analyzeRunes(games);

        // 2. Анализ предметов
        const items = analyzeItems(games, role);

        // 3. Анализ призывных заклинаний
        const summoners = analyzeSummoners(games, role);

        // 4. Анализ прокачки скиллов
        const skillOrder = analyzeSkillOrders(games);

        // === СОЗДАЁМ БИЛД ДЛЯ РОЛИ ===
        const builds = {};
        const buildKey = 'typical';

        // Создаём дозаполненный skill order для билда
        const filledSkillOrder = skillOrder ? {
            byLevel: skillOrder.byLevel || [],
            Q: [], W: [], E: [], R: []
        } : null;
        
        if (filledSkillOrder) {
            // Пересчитываем Q, W, E, R из byLevel
            (filledSkillOrder.byLevel || []).forEach((s, idx) => {
                if (s) filledSkillOrder[s].push(idx + 1);
            });
        }

        builds[buildKey] = {
            games: roleGames,
            wins: roleWins,
            items: items?.finalBuildOrder || [],
            summoner1: summoners.summoner1,
            summoner2: summoners.summoner2,
            perks: runes || {},
            skillOrders: filledSkillOrder ? [filledSkillOrder] : [],  // Используем дозаполненный skill order
            skillPriority: skillOrder?.skillPriority || [],
            frequencyAnalysis: items ? {
                startingItems: items.startingItems,
                coreBuildOrder: items.coreBuildOrder,
                boots: items.boots,
                items: items.items
            } : null
        };

        // Добавляем в matches для Pro Builds
        games.forEach(game => {
            if (champData.matches.length < 100) {
                champData.matches.push({
                    matchId: game.matchId,
                    puuid: game.puuid || 'unknown',
                    summonerName: game.summonerName || 'Pro Player',
                    playerRank: game.rank || 'Master+',
                    playerTier: 'MASTER',
                    role,
                    win: game.win,
                    items: game.items,
                    summoner1: game.summoners?.[0] || game.summoner1,
                    summoner2: game.summoners?.[1] || game.summoner2,
                    perks: game.perks || {},
                    kills: game.kda?.kills || 0,
                    deaths: game.kda?.deaths || 0,
                    assists: game.kda?.assists || 0,
                    cs: game.cs || 0,
                    gameDuration: game.gameDuration || 0,
                    skillOrder: game.skillOrder,
                    itemPurchases: game.itemPurchases,
                    tier: 'Master+'
                });
            }
        });

        champData.roles[role] = {
            win_rate: roleGames > 0 ? parseFloat(((roleWins / roleGames) * 100).toFixed(1)) : 0,
            games: roleGames,
            wins: roleWins,
            is_reliable: roleGames >= 3,
            builds,
            totalBuilds: Object.keys(builds).length,
            skillPriority: skillOrder?.skillPriority || []
        };

        champData.total_games += roleGames;
        totalGames += roleGames;
    });

    serverFormat[champId] = champData;
    totalChamps++;

    if (totalChamps % 20 === 0) {
        console.log(`   Converted ${totalChamps} champions...`);
    }
});

console.log('\n💾 Saving...\n');
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(serverFormat, null, 2));

console.log('='.repeat(70));
console.log('✅ CONVERSION COMPLETE!');
console.log('='.repeat(70));
console.log(`🏆 Champions: ${totalChamps}`);
console.log(`🎮 Total games: ${totalGames}`);
console.log(`📁 Output: ${OUTPUT_FILE}`);
console.log('='.repeat(70) + '\n');
