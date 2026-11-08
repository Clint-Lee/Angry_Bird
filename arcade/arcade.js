// Web Mini-Games Arcade Platform Controller
// Reads player progress from localStorage and manages dynamic shortcuts

(function () {
    const STORAGE_KEY = 'tianshu_angry_birds_save_v2';

    function loadAngryBirdsData() {
        let data = null;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) data = JSON.parse(raw);
        } catch (e) {
            console.warn('Failed to parse arcade save data:', e);
        }

        if (!data || typeof data !== 'object') {
            data = {
                currentLevelIndex: 0,
                unlockedLevels: [0],
                levelScores: {},
                levelStars: {}
            };
        }

        // Check legacy keys fallback
        try {
            const legacyLevel = parseInt(localStorage.getItem('ab_current_level') || '0', 10);
            if (!isNaN(legacyLevel) && legacyLevel > 0 && !data.currentLevelIndex) {
                data.currentLevelIndex = legacyLevel;
            }
            const legacyScores = JSON.parse(localStorage.getItem('ab_highscores') || '{}');
            data.levelScores = Object.assign({}, legacyScores, data.levelScores || {});
            const legacyStars = JSON.parse(localStorage.getItem('ab_stars') || '{}');
            data.levelStars = Object.assign({}, legacyStars, data.levelStars || {});
        } catch (e) { }

        return data;
    }

    const LEVEL_NAMES = [
        '1-1 初试锋芒', '1-2 摇摇欲坠', '1-3 猪王行宫',
        '2-1 峡谷哨站', '2-2 风滚草迷局', '2-3 金字塔要塞',
        '3-1 极地哨卡', '3-2 冰峰雪崩', '3-3 晶簇熔炉',
        '4-1 铁壁护城河', '4-2 攻城重锤', '4-3 皇家花岗岩棱堡', '4-4 终局决战：绿猪帝皇'
    ];

    function updateLobbyUI() {
        const data = loadAngryBirdsData();

        // 1. Calculate Stars
        let totalStars = 0;
        let clearedCount = 0;
        let totalScore = 0;
        const totalLevels = 13;
        const maxStars = totalLevels * 3;

        Object.keys(data.levelStars || {}).forEach(k => {
            const s = data.levelStars[k] || 0;
            if (s > 0) {
                totalStars += s;
                clearedCount++;
            }
        });

        Object.keys(data.levelScores || {}).forEach(k => {
            totalScore += (data.levelScores[k] || 0);
        });

        const currentLvlIdx = Math.max(0, Math.min(data.currentLevelIndex || 0, totalLevels - 1));
        const currentLvlName = LEVEL_NAMES[currentLvlIdx] || `第 ${currentLvlIdx + 1} 关`;

        // 2. Unlocked count
        const unlockedCount = Array.isArray(data.unlockedLevels) ? data.unlockedLevels.length : Math.max(1, clearedCount + 1);

        // 3. Update DOM
        const starsEl = document.getElementById('abTotalStars');
        if (starsEl) starsEl.innerText = `${totalStars} / ${maxStars} ⭐`;

        const lvlEl = document.getElementById('abCurrentLvl');
        if (lvlEl) lvlEl.innerText = currentLvlName;

        const scoreEl = document.getElementById('abTotalScore');
        if (scoreEl) scoreEl.innerText = `${totalScore.toLocaleString()} 分`;

        const unlockedEl = document.getElementById('abUnlockedCount');
        if (unlockedEl) unlockedEl.innerText = `${Math.min(totalLevels, unlockedCount)} / ${totalLevels} 关`;

        // 4. Update Resume Button text and path
        const resumeSub = document.getElementById('btnPlaySubtitle');
        if (resumeSub) {
            resumeSub.innerText = `(继续 ${currentLvlName})`;
        }

        // Dynamically resolve play game link based on environment
        const playUrl = window.location.pathname.includes('/games/arcade')
            ? '/games/arcade/angry-birds/'
            : (window.location.pathname.includes('/arcade') ? '../index.html' : './angry-birds/');

        const btnResume = document.getElementById('btnResumePlay');
        if (btnResume) btnResume.href = playUrl;
        const btnFresh = document.getElementById('btnFreshPlay');
        if (btnFresh) {
            btnFresh.href = playUrl;
            btnFresh.addEventListener('click', (e) => {
                data.currentLevelIndex = 0;
                try {
                    localStorage.setItem('ab_current_level', '0');
                    if (data) {
                        data.currentLevelIndex = 0;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                    }
                } catch (err) { }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateLobbyUI);
    } else {
        updateLobbyUI();
    }
})();
