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
        '1-1 初试锋芒', '1-2 极速穿云', '1-3 滚石危机', '1-4 双子木阁', '1-5 玻璃迷阵',
        '1-6 飞镖首秀', '1-7 三重木亭', '1-8 军火木库', '1-9 阶梯哨所', '1-10 桥梁合围',
        '1-11 坚木堡垒', '1-12 倒挂三角', '1-13 悬空木舍', '1-14 连环哨塔', '1-15 牧场总领 (BOSS)',
        '2-1 爆破专家', '2-2 空投轰炸', '2-3 弹跳奇兵', '2-4 峡谷碉堡', '2-5 悬崖栈道',
        '2-6 碎石金字塔', '2-7 炸药库奇袭', '2-8 巨石横梁', '2-9 鹰击长空', '2-10 拱门要塞',
        '2-11 吊桥锁链', '2-12 峡谷双雄', '2-13 地底坑道', '2-14 乱石穿空', '2-15 峡谷总管 (BOSS)',
        '3-1 寒冰水晶宫', '3-2 极光跳跃', '3-3 冰壁雪崩', '3-4 双重弹跳', '3-5 冰川迷宫',
        '3-6 寒冰吊桥', '3-7 冻土巨坑', '3-8 冰柱倾颓', '3-9 逆向反弹', '3-10 冰晶双塔',
        '3-11 雪峰重炮', '3-12 极地金字塔', '3-13 浮冰连环', '3-14 极寒要塞', '3-15 冰冠司令 (BOSS)',
        '4-1 钟摆破城', '4-2 巨无霸登场', '4-3 连环炼狱', '4-4 皇家门楼', '4-5 护城河卫所',
        '4-6 地牢暗室', '4-7 箭塔合围', '4-8 弹跳王廷', '4-9 钢铁重装', '4-10 皇冠吊灯',
        '4-11 绝壁棱堡', '4-12 铁壁铜墙', '4-13 炼狱熔炉', '4-14 禁卫总督', '4-15 猪王决战 (FINAL BOSS)'
    ];

    function updateLobbyUI() {
        const data = loadAngryBirdsData();

        // 1. Calculate Stars
        let totalStars = 0;
        let clearedCount = 0;
        let totalScore = 0;
        const totalLevels = 75;
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
        const wNum = Math.floor(currentLvlIdx / 15) + 1;
        const lNum = (currentLvlIdx % 15) + 1;
        const currentLvlName = LEVEL_NAMES[currentLvlIdx] || `${wNum}-${lNum} 关卡`;

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
