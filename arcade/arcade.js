// Web Mini-Games Arcade Lobby Data Sync
(function () {
    'use strict';

    const AB_KEY = 'tianshu_angry_birds_save_v2';

    function readJson(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed === 'object') ? parsed : {};
        } catch {
            return {};
        }
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    }

    function resolveUrl(slug) {
        const onServer = window.location.pathname.includes('/games/arcade');
        if (slug === 'angry-birds') {
            return onServer
                ? '/games/arcade/angry-birds/'
                : (window.location.pathname.includes('/arcade') ? '../index.html' : './angry-birds/');
        }
        return onServer ? `/games/arcade/${slug}/` : `./${slug}/`;
    }

    function updateAngryBirds() {
        const data = readJson(AB_KEY);
        let levelStars = data.levelStars || {};
        let currentIdx = Number(data.currentLevelIndex) || 0;
        try {
            const legacyLvl = parseInt(localStorage.getItem('ab_current_level') || '0', 10);
            if (!isNaN(legacyLvl) && legacyLvl > 0 && !currentIdx) currentIdx = legacyLvl;
            const legacyStars = JSON.parse(localStorage.getItem('ab_stars') || '{}');
            levelStars = Object.assign({}, legacyStars, levelStars);
        } catch {}

        const totalLevels = 120;
        const maxStars = totalLevels * 3;
        const totalStars = Object.values(levelStars).reduce((s, v) => s + (Number(v) || 0), 0);
        const clampedIdx = Math.max(0, Math.min(currentIdx, totalLevels - 1));
        const wNum = Math.floor(clampedIdx / 15) + 1;
        const lNum = (clampedIdx % 15) + 1;

        setText('abSummary', `第 ${wNum}-${lNum} 关 · ${totalStars}/${maxStars} ⭐`);

        const url = resolveUrl('angry-birds');
        const linkCover = document.getElementById('linkCoverAb');
        if (linkCover) linkCover.href = url;
        const btnResume = document.getElementById('btnResumePlay');
        if (btnResume) {
            btnResume.href = url;
            btnResume.innerText = clampedIdx > 0 || totalStars > 0 ? `继续 ${wNum}-${lNum}` : '开始游戏';
        }
        const btnFresh = document.getElementById('btnFreshPlay');
        if (btnFresh) {
            btnFresh.href = url;
            btnFresh.addEventListener('click', () => {
                try {
                    localStorage.setItem('ab_current_level', '0');
                    const d = readJson(AB_KEY);
                    d.currentLevelIndex = 0;
                    localStorage.setItem(AB_KEY, JSON.stringify(d));
                } catch {}
            });
        }
    }

    function updateFruitMerge() {
        const fm = readJson('cloudeave_fruit_merge_v1');
        const best = Math.max(0, Math.floor(Number(fm.endlessHighScore) || 0));
        const games = Math.max(0, Math.floor(Number(fm.gamesPlayed) || 0));
        setText('fmSummary', `最高 ${best.toLocaleString()} 分 · ${games} 局`);

        const url = resolveUrl('fruit-merge');
        const link = document.getElementById('linkCoverFm');
        if (link) link.href = url;
        const btn = document.getElementById('btnPlayFruit');
        if (btn) btn.href = url;
    }

    function updateCutRope() {
        const cr = readJson('cloudeave_cut_rope_v1');
        const stars = Object.values(cr.levelStars || {}).reduce((s, v) => s + Math.min(3, Math.max(0, Number(v) || 0)), 0);
        const curLvl = Math.max(1, Math.min(36, (Number(cr.currentLevelIndex) || 0) + 1));
        setText('crSummary', `第 ${curLvl} 关 · ${stars} / 108 ⭐`);

        const url = resolveUrl('cut-rope');
        const link = document.getElementById('linkCoverCr');
        if (link) link.href = url;
        const btn = document.getElementById('btnPlayCutRope');
        if (btn) {
            btn.href = url;
            btn.innerText = stars > 0 ? `继续第 ${curLvl} 关` : '开始游戏';
        }
    }

    function updateAdventureTycoon() {
        const at = readJson('cloudeave_adventure_tycoon_v1');
        const hasSave = Object.keys(at).length > 0;
        const maxGold = hasSave ? Math.max(0, Math.floor(Number(at.maxGoldHeld) || Number(at.gold) || 0)) : 0;
        const shopLv = Math.max(1, Math.floor(Number(at.shopLevel) || 1));
        setText('atSummary', `Lv.${shopLv} · 峰值 ${maxGold.toLocaleString()} 金`);

        const url = resolveUrl('adventure-tycoon');
        const link = document.getElementById('linkCoverAt');
        if (link) link.href = url;
        const btn = document.getElementById('btnPlayTycoon');
        if (btn) {
            btn.href = url;
            btn.innerText = hasSave ? '继续经营' : '开始游戏';
        }
    }

    function updateJumpJump() {
        const jj = readJson('cloudeave_jump_jump_v1');
        const best = Math.max(0, Math.floor(Number(jj.bestScore) || 0));
        const games = Math.max(0, Math.floor(Number(jj.gamesPlayed) || 0));
        setText('jjSummary', `最高 ${best.toLocaleString()} 分 · ${games} 局`);

        const url = resolveUrl('jump-jump');
        const link = document.getElementById('linkCoverJj');
        if (link) link.href = url;
        const btn = document.getElementById('btnPlayJump');
        if (btn) btn.href = url;
    }

    function updateSokoban() {
        const sk = readJson('cloudeave_sokoban_v1');
        const stars = Object.values(sk.levelStars || {}).reduce((s, v) => s + Math.min(3, Math.max(0, Number(v) || 0)), 0);
        const curLvl = Math.max(1, Math.min(60, (Number(sk.currentLevelIndex) || 0) + 1));
        setText('skSummary', `第 ${curLvl} 关 · ${stars} / 180 ⭐`);

        const url = resolveUrl('sokoban');
        const link = document.getElementById('linkCoverSk');
        if (link) link.href = url;
        const btn = document.getElementById('btnPlaySokoban');
        if (btn) {
            btn.href = url;
            btn.innerText = stars > 0 ? `继续第 ${curLvl} 关` : '开始游戏';
        }
    }

    function updateMota() {
        const mt = readJson('cloudeave_mota_v2');
        const sess = (mt && mt.session && typeof mt.session === 'object') ? mt.session : null;
        const floor = sess ? Math.max(1, Math.min(30, Number(sess.currentFloor) || 1)) : 1;
        const lv = (sess && sess.player) ? Math.max(1, Number(sess.player.level) || 1) : 1;
        const won = !!(sess && sess.player && sess.player.won);
        setText('mtSummary', won ? `已通关 · Lv.${lv}` : `第 ${floor} / 30 层 · Lv.${lv}`);

        const url = resolveUrl('mota');
        const link = document.getElementById('linkCoverMt');
        if (link) link.href = url;
        const btn = document.getElementById('btnPlayMota');
        if (btn) {
            btn.href = url;
            btn.innerText = sess ? (won ? '再战魔塔' : `继续 ${floor}F`) : '开始游戏';
        }
    }

    function syncLobby() {
        updateAngryBirds();
        updateFruitMerge();
        updateCutRope();
        updateAdventureTycoon();
        updateJumpJump();
        updateSokoban();
        updateMota();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncLobby);
    } else {
        syncLobby();
    }
})();
