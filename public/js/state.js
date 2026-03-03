// Глобальное состояние приложения
export const AppState = {
    globalData: null,
    db: {
        champions: {},
        items: {},
        summoners: {},
        runes: {},      // Плоский список ID -> Data
        runeTrees: {}   // Структура деревьев для отрисовки
    }
};