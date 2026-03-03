// Автоматическое определение API URL
const getApiBaseUrl = () => {
    // Если на Vercel (production)
    if (window.location.hostname.includes('vercel.app') || window.location.hostname === 'localhost') {
        return window.location.origin + '/api';
    }
    // Локальная разработка
    return 'http://localhost:3000/api';
};

export const CONFIG = {
    API_BASE_URL: getApiBaseUrl(),
    DDRAGON_BASE: '/ddragon',
    LANG: 'en_US'
};