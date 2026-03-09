@echo off
echo ========================================
echo   Cleaning unused DDragon assets
echo ========================================
echo.

cd /d "%~dp0"

:: Удаляем все языки кроме en_US и ru_RU
echo [1/4] Removing unused languages...
for %%d in (ar_AE bg_BG cs_CZ de_DE el_GR en_AU en_GB en_PH en_PL en_SG es_AR es_ES es_MX fr_FR hu_HU id_ID it_IT ja_JP ko_KR ms_MY nl_NL pl_PL pt_BR pt_PT ro_RO th_TH tr_TR vi_VN zh_CN zh_MY zh_TW) do (
    if exist "public\ddragon\data\%%d" (
        rmdir /s /q "public\ddragon\data\%%d"
        echo   Removed: public\ddragon\data\%%d
    )
)
echo   Kept: public\ddragon\data\en_US
echo   Kept: public\ddragon\data\ru_RU

:: Удаляем неиспользуемые папки изображений
echo.
echo [2/4] Removing unused image folders...
for %%d in (sprite map item_old feats item-modifiers) do (
    if exist "public\ddragon\img\%%d" (
        rmdir /s /q "public\ddragon\img\%%d"
        echo   Removed: public\ddragon\img\%%d
    )
)

:: Удаляем assets (дубликат ddragon)
echo.
echo [3/4] Removing duplicate assets folder...
if exist "public\assets" (
    rmdir /s /q "public\assets"
    echo   Removed: public\assets
)

:: Удаляем TFT и другие неиспользуемые JSON файлы
echo.
echo [4/4] Removing unused JSON files...
for %%f in (
    "public\ddragon\data\en_US\tft-*.json"
    "public\ddragon\data\en_US\mission-assets.json"
    "public\ddragon\data\en_US\ui.json"
    "public\ddragon\data\en_US\feats.json"
    "public\ddragon\data\en_US\profileicon.json"
    "public\ddragon\data\en_US\mastery.json"
    "public\ddragon\data\en_US\spellbuffs.json"
    "public\ddragon\data\en_US\sticker.json"
    "public\ddragon\data\en_US\stickers.json"
    "public\ddragon\data\en_US\summonerSpells.json"
    "public\ddragon\data\en_US\item_old.json"
    "public\ddragon\data\en_US\item-modifiers.json"
    "public\ddragon\data\en_US\challenges.json"
    "public\ddragon\data\en_US\language.json"
) do (
    if exist "%%f" (
        del /q "%%f"
        echo   Removed: %%f
    )
)

:: Удаляем старые папки с рунами
echo.
echo [5/5] Removing old rune folders...
for %%d in (
    PressTheAttack Kleptomancy GraspOfTheUndying FleetFootwork
    Predator GlacialAugment Guardian UnsealedSpellbook
    VeteranAftershock HailOfBlades Electrocute MasterKey
    PhaseRush FirstStrike DarkHarvest LethalTempo
    Conqueror SummonAery FlowofBattle ArcaneComet
    Inspiration Precision Domination Resolve Sorcery
    Chrysalis Celerity Overgrowth ManaflowBand
    Transcendence RelentlessHunter RavenousHunter
    GhostPoro EyeballCollection Scorch LastStand
    Waterwalking Unflinching LegendTenacity TheUltimateHat
    LegendHaste MirrorShell TimeWarpTonic CelestialBody
    DeepWard CheapShot CashBack UltimateHunter ZombieWard
    GrislyMementos PerfectTiming JackOfAllTrades StatMods
    Template SixthSense SuddenImpact FontOfLife
    ApproachVelocity PresenceOfMind Demolish
    BiscuitDelivery CosmicInsight CutDown CoupDeGrace
    TreasureHunter TasteOfBlood LegendBloodline
    HextechFlashtraption MagicalFootwear MinionDematerializer
    NimbusCloak IronSkin Conditioning BonePlating
    AbsoluteFocus IngeniousHunter Revitalize SecondWind
    GatheringStorm LegendAlacrity LastResort FuturesMarket
) do (
    if exist "public\ddragon\img\%%d" (
        rmdir /s /q "public\ddragon\img\%%d"
        echo   Removed: public\ddragon\img\%%d
    )
)

echo.
echo ========================================
echo   Cleaning complete!
echo ========================================
echo.
powershell -Command "Get-ChildItem 'public' -Recurse -File | Measure-Object -Property Length -Sum | Select-Object Count, @{Name='SizeMB';Expression={[math]::Round($_.Sum/1MB,2)}}"
echo.
pause
