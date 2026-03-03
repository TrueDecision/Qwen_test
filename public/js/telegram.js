// Telegram Web Apps интеграция
export function initTelegram() {
    if (!window.Telegram || !window.Telegram.WebApp) {
        console.log('Not running in Telegram');
        return false;
    }

    const tg = window.Telegram.WebApp;

    // Сообщаем Telegram что приложение готово
    tg.ready();

    // Разворачиваем на весь экран
    tg.expand();

    // Добавляем класс для Telegram темы
    document.body.classList.add('telegram-theme');

    // Настраиваем цвета под тему Telegram
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#0f172a');
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#f1f5f9');
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#7c3aed');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');

    // Настраиваем MainButton (главная кнопка внизу)
    tg.MainButton.setParams({
        text: 'REFRESH STATS',
        color: tg.themeParams.button_color || '#7c3aed',
        text_color: tg.themeParams.button_text_color || '#ffffff'
    });

    // Обработчик нажатия на MainButton
    tg.MainButton.onClick(() => {
        location.reload();
    });

    // Показываем MainButton после загрузки данных
    window.showTelegramMainButton = function() {
        tg.MainButton.show();
    };

    // Haptic feedback (вибрация)
    window.hapticFeedback = function(type = 'light') {
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred(type);
        }
    };

    // BackButton для навигации
    tg.BackButton.onClick(() => {
        if (window.closeDetailModal) {
            const modal = document.getElementById('detail-modal');
            if (modal && modal.style.display === 'flex') {
                window.closeDetailModal();
                return;
            }
        }
        if (document.getElementById('back-btn') && document.getElementById('back-btn').style.display !== 'none') {
            document.getElementById('back-btn').click();
        }
    });

    console.log('Telegram Mini App initialized');
    return true;
}

// Экспорт для использования в main.js
export const TelegramAPI = window.Telegram?.WebApp || null;
