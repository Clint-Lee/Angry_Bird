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
        '4-11 绝壁棱堡', '4-12 铁壁铜墙', '4-13 炼狱熔炉', '4-14 禁卫总督', '4-15 猪王决战 (FINAL BOSS)',
        '5-1 熔岩前哨', '5-2 盲区暗袭', '5-3 连锁爆燃', '5-4 浮岛要塞', '5-5 逆风回旋',
        '5-6 熔岩阶梯', '5-7 滚烫落石', '5-8 炽焰跳跃', '5-9 火山双子塔', '5-10 硫磺深坑',
        '5-11 熔岩钟摆', '5-12 地心穿刺', '5-13 熔岩迷宫', '5-14 巨兽狂怒', '5-15 熔岩领主决战',
        '6-1 山门试竹', '6-2 翠影琉璃', '6-3 竹鼓飞跃', '6-4 林间暗哨', '6-5 红灯悬阵',
        '6-6 青石滚崖', '6-7 双亭揽月', '6-8 禅钟铁球', '6-9 竹窗暗室', '6-10 幽篁跳台',
        '6-11 三柱重楼', '6-12 反锁竹阁', '6-13 石阵迷踪', '6-14 御竹大阵', '6-15 竹海仙王决战',
        '7-1 云端哨站', '7-2 虹晶玻璃塔', '7-3 云台弹跳', '7-4 天阙前防', '7-5 天灯爆阵',
        '7-6 浮石倾泻', '7-7 双岛联动', '7-8 星钟铁锤', '7-9 天窗狙击', '7-10 云梯连跃',
        '7-11 三翼云垒', '7-12 琉璃锁阵', '7-13 高空奇袭', '7-14 云海铁幕', '7-15 云霄猪王决战',
        '8-1 星港前哨', '8-2 晶体舱壁', '8-3 重力跳板', '8-4 星环战壕', '8-5 引力核雷',
        '8-6 陨石滚落', '8-7 双星堡垒', '8-8 轨道流星锤', '8-9 舱顶天窗', '8-10 星轨跃迁',
        '8-11 三重反应堆', '8-12 反物质锁舱', '8-13 星云重阵', '8-14 紫晶壁垒', '8-15 星际猪皇终战'
    ];

    function updateLobbyUI() {
        const data = loadAngryBirdsData();

        // 1. Calculate Stars
        let totalStars = 0;
        let clearedCount = 0;
        let totalScore = 0;
        const totalLevels = 120;
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

        const masteryPct = Math.round((totalStars / maxStars) * 100);
        const pctEl = document.getElementById('abMasteryPct');
        if (pctEl) pctEl.innerText = `${masteryPct}%`;
        const fillEl = document.getElementById('abMasteryFill');
        if (fillEl) fillEl.style.width = `${masteryPct}%`;

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

        // 5. Fruit Merge live stats sync
        updateFruitMergeCard();

        // 6. Cut the Rope live stats sync
        updateCutRopeCard();

        // 7. Adventure Shop Tycoon live stats sync
        updateAdventureTycoonCard();

        // 8. Jump Jump live stats sync
        updateJumpJumpCard();
    }

    function updateFruitMergeCard() {
        const FM_KEY = 'cloudeave_fruit_merge_v1';
        const TIER_NAMES = ['小樱桃', '红草莓', '紫葡萄', '砂糖橘', '红富士', '香甜梨', '水蜜桃', '金菠萝', '青椰子', '哈密瓜', '黄金西瓜'];
        let fm = null;
        try {
            const raw = localStorage.getItem(FM_KEY);
            if (raw) fm = JSON.parse(raw);
        } catch { fm = null; }
        if (!fm || typeof fm !== 'object') fm = {};

        const fmBest = Math.max(0, Number(fm.endlessHighScore) || 0);
        const maxTier = Math.max(0, Math.min(10, Number(fm.highestTier) || 0));
        const gamesPlayed = Math.max(0, Number(fm.gamesPlayed) || 0);
        const watermelons = Math.max(0, Number(fm.totalWatermelons) || 0);
        const tierPct = Math.round(((maxTier + 1) / 11) * 100);

        const bestEl = document.getElementById('fmEndlessBest');
        if (bestEl) bestEl.innerText = `${fmBest.toLocaleString()} 分`;
        const tierEl = document.getElementById('fmHighestTier');
        if (tierEl) tierEl.innerText = TIER_NAMES[maxTier] || '小樱桃';
        const gamesEl = document.getElementById('fmGamesPlayed');
        if (gamesEl) gamesEl.innerText = `${gamesPlayed} 局`;
        const melonEl = document.getElementById('fmWatermelons');
        if (melonEl) melonEl.innerText = `${watermelons} 颗`;
        const pctEl = document.getElementById('fmMasteryPct');
        if (pctEl) pctEl.innerText = `${tierPct}%`;
        const fillEl = document.getElementById('fmMasteryFill');
        if (fillEl) fillEl.style.width = `${tierPct}%`;

        const fmSub = document.getElementById('btnFruitSub');
        if (fmSub) fmSub.innerText = fmBest > 0 ? `(MAX纪录 ${fmBest.toLocaleString()} 分)` : '(经典无尽 · MAX最高分)';

        const btnFruit = document.getElementById('btnPlayFruit');
        if (btnFruit) {
            btnFruit.href = window.location.pathname.includes('/games/arcade')
                ? '/games/arcade/fruit-merge/'
                : './fruit-merge/';
        }
    }

    function readJsonSave(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed === 'object') ? parsed : {};
        } catch {
            return {};
        }
    }

    function resolveArcadeUrl(slug) {
        return window.location.pathname.includes('/games/arcade')
            ? `/games/arcade/${slug}/`
            : `./${slug}/`;
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    }

    function updateCutRopeCard() {
        const cr = readJsonSave('cloudeave_cut_rope_v1');
        const starsObj = (cr.levelStars && typeof cr.levelStars === 'object') ? cr.levelStars : {};
        const totalStars = Object.values(starsObj).reduce((s, v) => s + Math.min(3, Math.max(0, Number(v) || 0)), 0);
        const unlocked = Math.max(1, Math.min(12, Number(cr.unlockedLevel) || 1));
        const currentLvl = Math.max(1, Math.min(12, (Number(cr.currentLevelIndex) || 0) + 1));
        const pct = Math.round((totalStars / 36) * 100);

        setText('crTotalStars', `${totalStars} / 36 ⭐`);
        setText('crCurrentLvl', `第 ${currentLvl} 关`);
        setText('crUnlockedCount', `${unlocked} / 12 关`);
        setText('crMasteryText', `${pct}%`);
        const fillEl = document.getElementById('crMasteryFill');
        if (fillEl) fillEl.style.width = `${pct}%`;

        setText('btnCutRopeSub', totalStars > 0 ? `(继续第 ${currentLvl} 关 · ${totalStars}/36★)` : '(12道物理机关 · 36★收集)');
        const btn = document.getElementById('btnPlayCutRope');
        if (btn) btn.href = resolveArcadeUrl('cut-rope');
    }

    function updateAdventureTycoonCard() {
        const at = readJsonSave('cloudeave_adventure_tycoon_v1');
        const hasSave = Object.keys(at).length > 0;
        const curGold = hasSave ? Math.max(0, Math.floor(Number(at.gold) || 0)) : 0;
        const maxGold = hasSave ? Math.max(curGold, Math.floor(Number(at.maxGoldHeld) || 0)) : 0;
        const shopLv = Math.max(1, Math.floor(Number(at.shopLevel) || 1));
        const orders = Math.max(0, Math.floor(Number(at.ordersCompleted) || 0));
        const prestige = Math.max(0, Math.floor(Number(at.prestigeCount) || 0));
        const zones = Math.max(1, Math.min(4, Number(at.unlockedZones) || 1));
        const pct = Math.round((zones / 4) * 100);

        setText('atMaxGold', `${maxGold.toLocaleString()} 金`);
        setText('atCurGold', `${curGold.toLocaleString()} 金`);
        setText('atShopLv', `Lv.${shopLv}`);
        setText('atOrders', `${orders} 单 / ${prestige} 世`);
        setText('atMasteryText', `${pct}%`);
        const fillEl = document.getElementById('atMasteryFill');
        if (fillEl) fillEl.style.width = `${pct}%`;

        setText('btnTycoonSub', hasSave ? `(Lv.${shopLv} 商铺 · MAX ${maxGold.toLocaleString()} 金)` : '(探险搜材 · 炼金卖货 · 自动经营)');
        const btn = document.getElementById('btnPlayTycoon');
        if (btn) btn.href = resolveArcadeUrl('adventure-tycoon');
    }

    function updateJumpJumpCard() {
        const jj = readJsonSave('cloudeave_jump_jump_v1');
        const bestScore = Math.max(0, Math.floor(Number(jj.bestScore) || 0));
        const maxJumps = Math.max(0, Math.floor(Number(jj.maxJumps) || 0));
        const bestCombo = Math.max(0, Math.floor(Number(jj.bestCombo) || 0));
        const games = Math.max(0, Math.floor(Number(jj.gamesPlayed) || 0));

        setText('jjBestScore', `${bestScore.toLocaleString()} 分`);
        setText('jjMaxJumps', `${maxJumps} 跳`);
        setText('jjBestCombo', `${bestCombo} 连击`);
        setText('jjGames', `${games} 局`);

        setText('btnJumpSub', bestScore > 0 ? `(MAX纪录 ${bestScore.toLocaleString()} 分 · 连击 ${bestCombo}次)` : '(鼠标 / 空格双模蓄力 · MAX冲榜)');
        const btn = document.getElementById('btnPlayJump');
        if (btn) btn.href = resolveArcadeUrl('jump-jump');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateLobbyUI);
    } else {
        updateLobbyUI();
    }
})();
