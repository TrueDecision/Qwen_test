# 🚀 LoL Stats EUW - Session Context Prompt

## 📋 PROJECT OVERVIEW

**LoL Stats EUW** - Web application for analyzing League of Legends player statistics (EUW region, Master+ rank). Displays champion builds, runes, skill orders, item purchase timelines, and pro builds from cached game data.

### Tech Stack
- **Backend:** Node.js, Express (serverless on Vercel)
- **Frontend:** Vanilla JavaScript (ES6+ modules), HTML5, CSS3
- **Data:** DataDragon for assets, Riot API v5 for collection
- **Deployment:** Vercel (serverless functions + static hosting)
- **Region:** EUW
- **Rank:** Master+

---

## ✅ CURRENT PROJECT STATE (as of 2026-03-04)

### ✅ WORKING FEATURES

1. **Data Collection** (`final-test-collector.js`)
   - Collects 100 games per champion
   - Extracts: items, runes, summoners, KDA, CS, duration
   - **Skill Order** from Timeline API (correct participantId logic)
   - **Item Purchase Timeline** - exact order of purchases with timestamps
   - Saves to `cache/final-test-data.json`

2. **Data Conversion** (`convert-test-data.js`)
   - Converts raw data to server format
   - **Frequency Analysis** - item pick rates, win rates, avg position
   - **Starting Items** - top 3 starting item combinations
   - **Boots Analysis** - separate boots statistics
   - Saves to `cache/full-analytics-stats.json`

3. **Frontend Display**
   - Champion list with role filters
   - Champion detail page with:
     - **Starting Items** block (top 3 combinations with %)
     - **Item Build Order** with arrows
     - **Boots Section** (separate block with OR logic)
     - **Item Statistics** (detailed frequency analysis with tooltips)
     - **Skill Order Table** (scrollable, sticky headers, opaque background)
     - **Runes** (primary + secondary trees)
     - **Pro Builds** (recent high LP games with item purchase timeline)
   - **CHANGES** button - shows latest updates modal
   - **GOALS** button - shows project roadmap modal
   - **EARLY ACCESS** badge (fixed top bar)

4. **Pro Builds Features**
   - Starting items display
   - **Item Purchase Order** with timestamps (e.g., "7:00 - Everfrost")
   - Full build display
   - Summoner spells
   - Runes with tooltips
   - KDA, CS, game duration
   - Player names (from collected data)

5. **Item Logic**
   - **Mutually Exclusive Items** (`item-groups.js`):
     - Doran's items (only 1)
     - Support items (only 1)
     - Boots (only 1)
     - Jungle items (only 1)
     - Hydra group (only 1)
     - Sheen group (only 1)
     - Defensive/Mythic (only 1)
     - Armor Penetration (only 1)
     - Spellshield (only 1)
   - **Item Equivalents** (don't conflict):
     - Manamune ↔ Muramana
     - Archangel's Staff ↔ Seraph's Embrace

6. **Telegram Mini App Integration**
   - Auto-detect Telegram WebApp
   - Theme adaptation
   - MainButton for refresh
   - BackButton support
   - Haptic feedback

---

## 📁 PROJECT STRUCTURE

```
c:\project/
│
├── server.js                      # Express server for Vercel
├── final-test-collector.js        # Data collector (100 games/champ)
├── convert-test-data.js           # Data converter
├── package.json                   # Dependencies
├── vercel.json                    # Vercel configuration
├── .env                           # Riot API key (DO NOT COMMIT!)
├── .gitignore                     # Git exclusions
├── .vercelignore                  # Vercel exclusions
│
├── public/                        # Static files
│   ├── index.html                 # Main page
│   ├── styles.css                 # Styles
│   ├── ddragon/                   # DataDragon assets
│   │   ├── img/                   # Images
│   │   └── data/en_US/            # JSON data
│   └── js/                        # JavaScript modules
│       ├── config.js              # API URLs, settings
│       ├── state.js               # Global state (AppState)
│       ├── utils.js               # Helpers, tooltips, modals
│       ├── data-loader.js         # DataDragon + API loading
│       ├── item-groups.js         # Mutually exclusive items
│       ├── skill-order.js         # Skill order logic + rendering
│       ├── render-skills.js       # Skill table rendering
│       ├── render-runes.js        # Rune rendering
│       ├── render-detail.js       # Champion detail rendering
│       ├── render-list.js         # Champion list rendering
│       ├── telegram.js            # Telegram Mini App
│       └── main.js                # Entry point
│
├── cache/
│   └── full-analytics-stats.json  # ⭐ MAIN DATA FILE for Vercel
│
└── docs/
    ├── CHANGELOG.md               # Version history
    ├── DEPLOYMENT-DOCS.md         # Deployment guide
    ├── VERCEL-DEPLOYMENT.md       # Vercel instructions
    └── PROJECT-STRUCTURE.md       # This file
```

---

## 🔄 DATA FLOW

```
Riot Games API
     ↓
final-test-collector.js (on separate server)
     ↓
cache/final-test-data.json (raw data with summonerName, puuid, itemPurchases)
     ↓
convert-test-data.js (local conversion)
     ↓
cache/full-analytics-stats.json (server-ready format)
     ↓
git add + commit + push
     ↓
GitHub → Vercel (auto-deploy)
     ↓
server.js → GET /api/stats
     ↓
Frontend (public/js/*.js)
     ↓
User Interface
```

---

## 🎯 KEY FILES TO KNOW

### Data Collection
- **`final-test-collector.js`** - Main collector with:
  - `extractSkillOrder()` - Skill order from Timeline
  - `extractItemPurchases()` - Item purchase timeline
  - Collects: summonerName, puuid, rank

### Data Conversion
- **`convert-test-data.js`** - Converter with:
  - Starting items frequency analysis
  - Item frequency analysis (pick rate, win rate, position)
  - Boots frequency analysis
  - Typical build formation

### Frontend
- **`public/js/render-detail.js`** - Champion detail rendering:
  - Starting items block
  - Item build with arrows
  - Boots section
  - Item statistics with tooltips
  - Pro Builds with purchase timeline

- **`public/js/item-groups.js`** - Item exclusivity logic:
  - `canAddItem()` - Check compatibility
  - `getConflictingItems()` - Get conflicts
  - `ITEM_EQUIVALENTS` - Manamune/Muramana etc.

- **`public/js/skill-order.js`** - Skill order:
  - `getSkillOrder()` - Get from builds or fallback
  - `fillIncompleteSkillOrder()` - Fill to level 18
  - Scrollable table with sticky headers

---

## 🚀 DEPLOYMENT PROCESS

### Initial Setup (Done)
```bash
# 1. Collect data on separate server
node final-test-collector.js

# 2. Convert locally
node convert-test-data.js

# 3. Commit and push
git add cache/full-analytics-stats.json
git commit -m "Update stats"
git push origin main

# Vercel auto-deploys in 2-3 minutes
```

### Update Data
```bash
# On collection server:
rm cache/final-test-data.json
rm cache/final-test-progress.json
node final-test-collector.js

# Download and convert:
# (download final-test-data.json)
node convert-test-data.js

# Push:
git add cache/full-analytics-stats.json
git commit -m "Update: New data"
git push
```

---

## 🎨 UI FEATURES

### Top Bar (Fixed)
- 🎯 **GOALS** button - Project roadmap (7 goals, 1 completed)
- 📝 **CHANGES** button - Latest updates modal
- ⚠ **EARLY ACCESS** badge (red, pulsing)

### Champion Detail
1. **Starting Items** - Top 3 combinations with pick rates
2. **Item Build Order** - Core items with arrows (→)
3. **Boots Section** - Separate block with OR logic
4. **Item Statistics** - Grid with pick rate, position, win rate
5. **Skill Order Table** - Scrollable, sticky headers, opaque background
6. **Pro Builds** - Expandable matches with:
   - Starting items
   - **Item Purchase Timeline** (time + item)
   - Full build
   - Runes
   - KDA, CS, duration

### Tooltips
- Item hover → description (not % pick rate)
- Item Statistics → full description
- Boots → full description
- Max width 280px, auto-positioning

### Modals
- **Item Detail** - Split into ⚡ Stats + ✨ Passive sections
- **Changes** - Latest updates with testing checklist
- **Goals** - Project roadmap with checkboxes

---

## 📊 DATA STRUCTURE

### Game Data (final-test-data.json)
```javascript
{
  matchId: "EUW1_7742811199",
  puuid: "fgfpQ4qnvx3i3lk_...",
  summonerName: "Mac Freakbert",
  championId: "1",
  role: "MIDDLE",
  win: false,
  items: [3175, 3118, 4646, 1056, 3089],
  summoners: [4, 14],
  perks: {
    primary: 8100,
    keystone: 8112,
    sub: 8200,
    primaryRunes: [8112, 8126, 8140, 8105],
    secondaryRunes: [8226, 8237],
    shards: [5005, 5008, 5011]
  },
  kda: { kills: 3, deaths: 8, assists: 5 },
  cs: 234,
  gameDuration: 1714000,
  skillOrder: {
    byLevel: ['Q', 'E', 'W', 'Q', 'Q', 'R', ...],
    Q: [1, 2, 3, 4, 5],
    W: [2, 18],
    E: [3, 13, 16, 18],
    R: [8, 17]
  },
  itemPurchases: {
    startingItems: [1055, 2003],
    firstBackItems: [1036],
    fullItemOrder: [3175, 3118, 4646],
    itemPurchaseTimeline: [
      { itemId: 1055, timestamp: 45000, minutes: 0 },
      { itemId: 3175, timestamp: 420000, minutes: 7 }
    ]
  }
}
```

---

## ⚠️ KNOWN ISSUES / TODO

### Priority 1 (In Progress)
- [ ] Collect summonerName and rank in final-test-collector.js ✅ DONE
- [ ] Display item purchase timeline in Pro Builds ✅ DONE
- [ ] Starting items frequency analysis ✅ DONE

### Priority 2 (Future)
- [ ] OTP (One Trick Pony) games - 10 games from top OTP players
- [ ] Deep analytics - runes/items based on team composition
- [ ] Player analytics - account history, win rates, OTPs
- [ ] Live lobby integration - like Porofessor/OP.GG

### Priority 3 (Nice to Have)
- [ ] Item build win rate correlation
- [ ] Counter picks display
- [ ] Synergy picks display

---

## 🔧 QUICK COMMANDS

### Check Data
```bash
# Check cache file
node -e "const d=JSON.parse(require('fs').readFileSync('cache/full-analytics-stats.json','utf8')); console.log('Champions:', Object.keys(d).length);"

# Check skill orders
node -e "const d=JSON.parse(require('fs').readFileSync('cache/full-analytics-stats.json','utf8')); const c=Object.values(d)[0]; const r=Object.values(c.roles)[0]; const b=Object.values(r.builds)[0]; console.log('skillOrders:', b.skillOrders?.length||0);"

# Check item purchases
node -e "const d=JSON.parse(require('fs').readFileSync('cache/full-analytics-stats.json','utf8')); const m=Object.values(d)[0].matches[0]; console.log('itemPurchases:', m.itemPurchases??"Has data":"No data");"
```

### Git Commands
```bash
# Standard push
git add .
git commit -m "Message"
git push origin main

# Force push (if needed)
git push -f origin main

# Check status
git status
```

---

## 🎯 NEXT SESSION TASKS

1. **Verify item purchase timeline display** in Pro Builds
2. **Test starting items frequency** accuracy
3. **Add summoner rank display** in Pro Builds (if collected)
4. **Optimize item purchase timeline** display (show all items, not just 8)
5. **Add filters** for Pro Builds (sort by LP, date, etc.)

---

## 📞 CONTINUE FROM HERE

**To continue development:**

1. Read this file for context
2. Check `PROJECT-STRUCTURE.md` for file locations
3. Check `CHANGELOG.md` for recent changes
4. Check `DEPLOYMENT-DOCS.md` for deployment process

**Current focus:** Item purchase timeline and starting items analysis

---

**Session Date:** 2026-03-04  
**Version:** 1.1.0  
**Status:** ✅ Production Ready - Item Purchase Timeline Implemented
