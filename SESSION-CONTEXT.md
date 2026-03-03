# 🎮 LoL Stats EUW - Project Context for New Session

## 📋 PROJECT OVERVIEW

### Goal
Web application for analyzing League of Legends player statistics (EUW region, Master+ rank). Displays champion builds, runes, skill orders, and pro builds from cached game data.

### Tech Stack
- **Backend:** Node.js, Express
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Data:** Local DataDragon repository for assets (champions, items, runes, summoners)
- **API:** Riot API v5 (Match v5, Timeline v5, League v4)

### Architecture
- Modular frontend JS in `public/js/`
- Global state in `AppState`
- Server caches data from Riot API and serves to frontend
- Language: English (en_US)

---

## 📁 CURRENT FILE STRUCTURE

```
c:\project/
├── server.js                          # Express server, serves cached stats
├── unified-collector.js               # Collects stats + skill orders (NEW - correct logic)
├── final-test-collector.js            # Collects 10 games per champion (NEW)
├── complete-collector.js              # Test collector for N games
├── convert-test-data.js               # Converts final-test-data to server format
├── test-10-skill-orders.js            # Test skill order on 10 games
├── debug-timeline.js                  # Debug timeline API
├── validate-skill-orders.js           # Validate skill orders
├── .env                               # RIOT_API_KEY and config
├── package.json                       # Dependencies
│
├── public/
│   ├── index.html                     # Main page
│   ├── styles.css                     # Styles
│   ├── ddragon/                       # DataDragon assets
│   └── js/
│       ├── config.js                  # Config (API URLs, CDN paths)
│       ├── state.js                   # Global state (AppState.globalData, AppState.db)
│       ├── utils.js                   # Helpers (colors, tooltips)
│       ├── data-loader.js             # Loads JSON from DataDragon
│       ├── skill-order.js             # Skill order patterns
│       ├── render-skills.js           # Renders skill table
│       ├── render-runes.js            # Renders runes
│       ├── render-detail.js           # Renders champion detail card (MODIFIED)
│       ├── render-list.js             # Renders champion list
│       └── main.js                    # Entry point
│
└── cache/
    ├── full-analytics-stats.json      # MAIN CACHE - server reads from this
    ├── final-test-data.json           # Raw collected data (170 champs, 1537 games)
    ├── full-analytics-progress.json   # Collection progress
    └── ... (other cache files)
```

---

## ✅ WHAT'S WORKING NOW

### 1. Data Collection (CORRECT)
- **File:** `unified-collector.js`, `final-test-collector.js`
- **Logic:** 
  - Fetches Master league players
  - Gets match data + timeline for each game
  - Extracts skill orders from Timeline API
  - **participantId is SAME in Match and Timeline API (1-10, NOT 0-9)**
  - Saves items, runes, summoners, KDA, CS, skill orders

### 2. Skill Order Extraction (CORRECT)
```javascript
// Correct logic in unified-collector.js
const participantId = participant.participantId;  // NOT participantId - 1!
const skillOrder = await extractSkillOrder(matchId, participantId);

// Returns:
{
  byLevel: ['Q', 'E', 'W', 'Q', 'Q', 'R', ...],  // Order by level 1-18
  Q: [1, 2, 3, 4, 5],  // How many times Q was leveled
  W: [1, 2, 3, 4, 5],
  E: [1, 2, 3],
  R: [1, 2, 3]
}
```

### 3. Data Format (CORRECT)
```json
{
  "43": {
    "id": "43",
    "roles": {
      "UTILITY": {
        "games": 10,
        "wins": 6,
        "builds": {
          "3190-3107|8229": {
            "games": 5,
            "wins": 3,
            "items": [3190, 3107, ...],
            "summoner1": 4,
            "summoner2": 14,
            "perks": {...},
            "skillOrders": [  // ARRAY of skill orders
              {
                "byLevel": ["Q", "E", "W", ...],
                "Q": [1,2,3,4,5],
                "W": [...],
                "E": [...],
                "R": [...]
              }
            ]
          }
        }
      }
    },
    "matches": [...]  // For Pro Builds display
  }
}
```

### 4. Current Cache Status
- **File:** `cache/full-analytics-stats.json`
- **Champions:** 170
- **Total Games:** 1537
- **Skill Orders:** ✅ Present and CORRECT in data

---

## ❌ CURRENT PROBLEM

### Issue: Skill Orders Not Displaying on Frontend

**Symptom:**
- Console shows: `skillOrders: 0`, `so: undefined`
- UI shows: "⚠️ No skill order data available"
- But data EXISTS in `full-analytics-stats.json`

**Root Cause:**
The `render-detail.js` is looking for `skillOrders` array but it's EMPTY in the builds that are being displayed.

**Debug Output:**
```
Build: 2 games
skillOrders: 0
so: undefined
```

**Possible Causes:**
1. **server.js** is not including `skillOrders` when formatting data for frontend
2. **convert-test-data.js** didn't properly copy `skillOrders` to builds
3. **render-detail.js** is looking at wrong build index

---

## 🔧 FILES THAT NEED FIXING

### 1. server.js (Lines 60-100)
**Problem:** May not be passing `skillOrders` from builds to frontend

**Check:** The `formatStatsForFrontend()` function - ensure it copies `skillOrders` array

### 2. convert-test-data.js (Lines 40-80)
**Problem:** May not be copying `skillOrders` correctly during conversion

**Check:** The build creation loop - ensure `skillOrders: []` is populated

### 3. public/js/render-detail.js (Lines 280-320)
**Current Code:**
```javascript
const so = currentBuild?.skillOrders && currentBuild.skillOrders.length > 0 
    ? currentBuild.skillOrders[0] 
    : currentBuild?.typicalSkillOrder;
```

**This is CORRECT** - but `skillOrders` array is empty

---

## 🎯 IMMEDIATE ACTION ITEMS

### Priority 1: Fix Skill Order Display
1. **Check server.js** - verify `skillOrders` is passed to frontend
2. **Check convert-test-data.js** - verify `skillOrders` is copied during conversion
3. **Add debug logging** to server.js to see what's being sent

### Priority 2: Complete Data Collection
- Current: 170 champions, 1537 games
- Target: 170+ champions, 10 games each = ~1700 games
- Continue running `final-test-collector.js` until complete

### Priority 3: Frontend Improvements
- Display skill order correctly
- Show multiple builds per champion
- Show pro builds with skill orders

---

## 📝 KEY LEARNINGS (DON'T REPEAT MISTAKES)

### 1. participantId is 1-indexed in BOTH APIs
```javascript
// WRONG:
const participantId = participant.participantId - 1;

// CORRECT:
const participantId = participant.participantId;  // Same in Match and Timeline!
```

### 2. Skill Order Format
```javascript
// Store as:
{
  byLevel: ['Q', 'E', 'W', 'Q', 'Q', 'R', ...],  // For display
  Q: [1, 2, 3, 4, 5],  // For counting
  W: [...],
  E: [...],
  R: [...]
}
```

### 3. Cache File Priority
```javascript
const CACHE_FILES = [
    'cache/full-analytics-stats.json',  // Primary
    'cache/stats.json'                    // Fallback
];
```

---

## 🚀 QUICK START COMMANDS

### Start Collection
```bash
node final-test-collector.js
```

### Convert Data
```bash
node convert-test-data.js
```

### Start Server
```bash
node server.js
```

### Check Cache
```bash
node -e "const d=JSON.parse(require('fs').readFileSync('cache/full-analytics-stats.json','utf8')); console.log('Champions:', Object.keys(d).length);"
```

---

## 📞 NEXT STEPS FOR NEW SESSION

1. **Debug why skillOrders array is empty in builds**
   - Check convert-test-data.js line ~60
   - Check server.js formatStatsForFrontend()
   
2. **Verify data flow:**
   ```
   final-test-collector.js → final-test-data.json
   ↓
   convert-test-data.js → full-analytics-stats.json
   ↓
   server.js → API /api/stats
   ↓
   render-detail.js → Display
   ```

3. **Fix the broken link** - likely in convert-test-data.js or server.js

---

## 📚 DOCUMENTATION FILES

- `DEPLOYMENT-FINAL.md` - Full deployment guide
- `PROJECT-STRUCTURE.md` - Project structure
- `CLEANUP-COMPLETE.md` - Cleanup summary
- `cache/final-test-data.json` - Raw collected data
- `cache/full-analytics-stats.json` - Server-ready data

---

## ⚠️ KNOWN ISSUES

1. **Skill orders not displaying** - array is empty (THIS IS THE MAIN ISSUE)
2. **Some games have unrealistic skill orders** - early surrenders, data issues
3. **Summoner names are "Summoner"** - not collected from API
4. **1537 games collected** - need ~1700 for 10 per champion

---

## 🎯 SUCCESS CRITERIA

When working correctly:
1. Open http://localhost:3000
2. Click any champion
3. Scroll to "Skills" section
4. See skill order grid: `L1: Q, L2: W, L3: E, L4: Q, ...`
5. See summary: `Q: 5x  W: 5x  E: 5x  R: 3x`

---

**END OF CONTEXT DOCUMENT**

Start new session with this prompt and continue debugging the skillOrders display issue.
