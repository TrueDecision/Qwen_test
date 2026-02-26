// API Configuration
const API_KEY = 'RGAPI-1ef7ef9f-2729-4f00-876a-8c4943b5cf1e';
const REGION = 'euw1'; // EU West region
const CHAMPION_API_URL = 'https://ddragon.leagueoflegends.com/cdn/14.10.1/data/en_US/champion.json';
const CHAMPION_IMAGE_BASE_URL = 'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/';
const STATIC_DATA_BASE_URL = 'https://ddragon.leagueoflegends.com/cdn/14.10.1/data/en_US/';

// Default roles mapping for champions
const DEFAULT_ROLES = {
    Aatrox: 'top',
    Ahri: 'mid',
    Akali: 'top',
    Alistar: 'support',
    Amumu: 'jungle',
    Anivia: 'mid',
    Annie: 'mid',
    Aphelios: 'adc',
    Ashe: 'adc',
    AurelionSol: 'mid',
    Azir: 'mid',
    Bard: 'support',
    Blitzcrank: 'support',
    Brand: 'mid',
    Braum: 'support',
    Caitlyn: 'adc',
    Camille: 'top',
    Cassiopeia: 'mid',
    Chogath: 'top',
    Corki: 'adc',
    Darius: 'top',
    Diana: 'jungle',
    DrMundo: 'top',
    Draven: 'adc',
    Ekko: 'mid',
    Elise: 'jungle',
    Evelynn: 'jungle',
    Ezreal: 'adc',
    Fiddlesticks: 'jungle',
    Fiora: 'top',
    Fizz: 'mid',
    Galio: 'top',
    Gangplank: 'top',
    Garen: 'top',
    Gnar: 'top',
    Gragas: 'jungle',
    Graves: 'jungle',
    Gwen: 'top',
    Hecarim: 'jungle',
    Heimerdinger: 'top',
    Illaoi: 'top',
    Irelia: 'top',
    Ivern: 'jungle',
    Janna: 'support',
    JarvanIV: 'jungle',
    Jax: 'top',
    Jayce: 'top',
    Jhin: 'adc',
    Jinx: 'adc',
    Kaisa: 'adc',
    Kalista: 'adc',
    Karma: 'support',
    Karthus: 'mid',
    Kassadin: 'mid',
    Katarina: 'mid',
    Kayle: 'top',
    Kayn: 'jungle',
    Kennen: 'top',
    Khazix: 'jungle',
    Kindred: 'jungle',
    Kled: 'top',
    KogMaw: 'adc',
    Leblanc: 'mid',
    LeeSin: 'jungle',
    Leona: 'support',
    Lissandra: 'mid',
    Lucian: 'adc',
    Lulu: 'support',
    Lux: 'mid',
    Malphite: 'top',
    Malzahar: 'mid',
    Maokai: 'top',
    MasterYi: 'jungle',
    MissFortune: 'adc',
    Mordekaiser: 'top',
    Morgana: 'support',
    Nami: 'support',
    Nasus: 'top',
    Nautilus: 'support',
    Neeko: 'mid',
    Nidalee: 'jungle',
    Nocturne: 'jungle',
    Nunu: 'jungle',
    Olaf: 'top',
    Orianna: 'mid',
    Ornn: 'top',
    Pantheon: 'jungle',
    Poppy: 'top',
    Pyke: 'support',
    Qiyana: 'top',
    Quinn: 'top',
    Rakan: 'support',
    Rammus: 'jungle',
    RekSai: 'jungle',
    Rell: 'support',
    Renekton: 'top',
    Rengar: 'jungle',
    Riven: 'top',
    Rumble: 'top',
    Ryze: 'mid',
    Samira: 'adc',
    Sejuani: 'jungle',
    Senna: 'support',
    Seraphine: 'support',
    Sett: 'top',
    Shaco: 'jungle',
    Shen: 'top',
    Shyvana: 'jungle',
    Singed: 'top',
    Sion: 'top',
    Sivir: 'adc',
    Skarner: 'jungle',
    Sona: 'support',
    Soraka: 'support',
    Swain: 'top',
    Sylas: 'mid',
    Syndra: 'mid',
    TahmKench: 'support',
    Taliyah: 'mid',
    Talon: 'mid',
    Taric: 'support',
    Teemo: 'top',
    Thresh: 'support',
    Tristana: 'adc',
    Trundle: 'top',
    Tryndamere: 'top',
    TwistedFate: 'mid',
    Twitch: 'adc',
    Udyr: 'jungle',
    Urgot: 'top',
    Varus: 'adc',
    Vayne: 'adc',
    Veigar: 'mid',
    Velkoz: 'mid',
    Vex: 'mid',
    Vi: 'jungle',
    Viktor: 'mid',
    Vladimir: 'top',
    Volibear: 'top',
    Warwick: 'jungle',
    Wukong: 'top',
    Xayah: 'adc',
    Xerath: 'mid',
    XinZhao: 'jungle',
    Yasuo: 'mid',
    Yone: 'top',
    Yorick: 'top',
    Yuumi: 'support',
    Zac: 'jungle',
    Zed: 'mid',
    Ziggs: 'mid',
    Zilean: 'support',
    Zoe: 'mid',
    Zyra: 'support'
};

// DOM elements
const championsContainer = document.getElementById('champions-container');
const championDetail = document.getElementById('champion-detail');
const championInfo = document.getElementById('champion-info');
const backButton = document.getElementById('back-button');

// Global variables
let championsData = {};
let championStats = {};

// Initialize the application
async function init() {
    try {
        // Show loading indicator
        championsContainer.innerHTML = '<div class="loading">Загрузка данных...</div>';
        
        // Load champion data
        const championsResponse = await fetch(CHAMPION_API_URL);
        const championsJson = await championsResponse.json();
        championsData = championsJson.data;

        // Get stats for all champions
        await loadAllChampionStats();

        // Render champion list
        renderChampionList();
    } catch (error) {
        console.error('Error initializing app:', error);
        championsContainer.innerHTML = '<div class="loading">Ошибка загрузки данных</div>';
    }
}

// Load statistics for all champions
async function loadAllChampionStats() {
    // For demonstration purposes, we'll simulate stats since we can't make real API calls
    // In a real implementation, you would need to fetch from Riot's API which requires authentication
    // and proper rate limiting
    
    for (const key in championsData) {
        const champion = championsData[key];
        // Simulate stats data
        championStats[champion.key] = {
            pickRate: Math.random() * 20 + 1, // Random pick rate between 1-21%
            winRate: Math.random() * 20 + 40, // Random win rate between 40-60%
        };
    }
}

// Render the list of champions
function renderChampionList() {
    championsContainer.innerHTML = '';
    
    for (const key in championsData) {
        const champion = championsData[key];
        const stats = championStats[champion.key] || { pickRate: 0, winRate: 0 };
        
        const championCard = document.createElement('div');
        championCard.className = 'champion-card';
        championCard.onclick = () => showChampionDetails(champion);
        
        championCard.innerHTML = `
            <img src="${CHAMPION_IMAGE_BASE_URL}${champion.image.full}" alt="${champion.name}" class="champion-icon">
            <div class="champion-info">
                <div class="champion-name">${champion.name}</div>
                <div class="champion-stats">
                    <span>Pick Rate: ${stats.pickRate.toFixed(2)}%</span>
                    <span>Win Rate: ${stats.winRate.toFixed(2)}%</span>
                </div>
            </div>
        `;
        
        championsContainer.appendChild(championCard);
    }
}

// Show champion details page
async function showChampionDetails(champion) {
    // Show loading indicator
    championInfo.innerHTML = '<div class="loading">Загрузка деталей чемпиона...</div>';
    
    // Switch to detail view
    document.getElementById('champion-list').style.display = 'none';
    championDetail.style.display = 'block';
    
    // Load and display champion details
    await loadChampionDetails(champion);
}

// Load champion details including talents and build
async function loadChampionDetails(champion) {
    // Determine default role for this champion
    const defaultRole = DEFAULT_ROLES[champion.id] || 'mid';
    
    // In a real implementation, we would fetch actual talent and build data
    // For now, we'll simulate this data
    const talents = [
        { name: 'Phase Rush', description: 'Gain movement speed after hitting an enemy champion 3 times.' },
        { name: 'Fleet Footwork', description: 'Attack and move speed after damaging an enemy.' },
        { name: 'Gathering Storm', description: 'Gain increasing AP over time.' }
    ];
    
    const build = [
        { name: 'Boots of Speed', image: 'placeholder_item.png' },
        { name: 'Doran\'s Blade', image: 'placeholder_item.png' },
        { name: 'Kraken Slayer', image: 'placeholder_item.png' }
    ];
    
    // Create HTML for champion details
    let detailsHTML = `
        <div class="champion-details">
            <h2>${champion.name} (${champion.title})</h2>
            <p>${champion.blurb}</p>
            
            <div class="talents-section">
                <div class="section-title">Таланты</div>
                ${talents.map(talent => `
                    <div class="talent-row">
                        <img src="placeholder_talent.png" alt="${talent.name}" class="talent-icon">
                        <div>
                            <strong>${talent.name}</strong>
                            <p>${talent.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="build-section">
                <div class="section-title">Сборка предметов</div>
                <div>
                    ${build.map(item => `
                        <div class="build-item">
                            <img src="${item.image}" alt="${item.name}">
                            <div>${item.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    championInfo.innerHTML = detailsHTML;
}

// Event listener for back button
backButton.addEventListener('click', () => {
    document.getElementById('champion-list').style.display = 'block';
    championDetail.style.display = 'none';
});

// Start the application
init();