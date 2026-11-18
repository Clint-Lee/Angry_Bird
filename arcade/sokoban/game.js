(function () {
    'use strict';

    const E = window.SokobanEngine;
    const AudioSys = window.SokobanAudio;

    const canvas = document.getElementById('sokobanCanvas');
    const ctx = canvas.getContext('2d');
    const W = 560;
    const H = 520;

    const el = {
        lvlBadge: document.getElementById('lvlBadge'),
        lvlTitle: document.getElementById('lvlTitle'),
        movesVal: document.getElementById('movesVal'),
        bestVal: document.getElementById('bestVal'),
        btnLevels: document.getElementById('btnLevels'),
        btnUndo: document.getElementById('btnUndo'),
        btnReset: document.getElementById('btnReset'),
        btnMute: document.getElementById('btnMute'),
        deadlockBar: document.getElementById('deadlockBar'),
        levelsModal: document.getElementById('levelsModal'),
        chapterTabs: document.getElementById('chapterTabs'),
        levelsGrid: document.getElementById('levelsGrid'),
        btnCloseLevels: document.getElementById('btnCloseLevels'),
        winModal: document.getElementById('winModal'),
        winStars: document.getElementById('winStars'),
        winTitle: document.getElementById('winTitle'),
        winSub: document.getElementById('winSub'),
        btnNextLvl: document.getElementById('btnNextLvl'),
        btnReplayLvl: document.getElementById('btnReplayLvl')
    };

    const audio = new AudioSys();
    let save = loadSave();
    audio.setMuted(save.muted);

    let game = null;
    let walkQueue = [];
    let walkTimer = 0;

    // Smooth visual interpolation offsets for crisp tile transitions
    const anim = {
        px: 0,
        py: 0,
        boxOffset: new Map(), // key "x,y" -> { ox, oy }
        sparks: [],
        dust: []
    };
    let pointerStart = null;

    function loadSave() {
        try {
            return E.normalizeSave(JSON.parse(localStorage.getItem(E.SAVE_KEY) || 'null'));
        } catch {
            return E.normalizeSave(null);
        }
    }

    function persistSave() {
        try {
            localStorage.setItem(E.SAVE_KEY, JSON.stringify(save));
        } catch {}
    }

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function startLevel(idx) {
        const cleanIdx = Math.max(0, Math.min(E.LEVELS.length - 1, idx));
        save.currentLevelIndex = cleanIdx;
        persistSave();
        game = E.createSession(cleanIdx);
        walkQueue = [];
        anim.px = game.session.player.x;
        anim.py = game.session.player.y;
        anim.boxOffset.clear();
        anim.sparks.length = 0;
        anim.dust.length = 0;
        el.levelsModal.classList.add('hidden');
        el.winModal.classList.add('hidden');
        syncUI();
    }

    function syncUI() {
        const s = game.session;
        const best = save.bestMoves[s.level.id];
        el.lvlBadge.textContent = `第 ${s.level.id} / ${E.LEVELS.length} 关`;
        el.lvlTitle.textContent = s.level.name;
        el.movesVal.textContent = String(s.moves);
        el.bestVal.textContent = best ? `${best} 步` : `参考 ${s.level.par}`;
        el.btnUndo.disabled = s.history.length === 0;
        el.btnMute.textContent = save.muted ? '🔇' : '🔊';
        el.deadlockBar.classList.toggle('hidden', !game.isCornerDeadlocked() || s.won);
    }

    function getMetrics() {
        const s = game.session;
        const pad = 28;
        const tile = Math.min(54, Math.floor(Math.min((W - pad * 2) / s.cols, (H - pad * 2) / s.rows)));
        const offX = Math.floor((W - s.cols * tile) / 2);
        const offY = Math.floor((H - s.rows * tile) / 2);
        return { tile, offX, offY };
    }

    function spawnDust(gx, gy, color = 'rgba(214, 184, 141, 0.7)') {
        const { tile, offX, offY } = getMetrics();
        const cx = offX + (gx + 0.5) * tile;
        const cy = offY + (gy + 0.5) * tile;
        for (let i = 0; i < 6; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 25 + Math.random() * 45;
            anim.dust.push({
                x: cx, y: cy,
                vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                r: 2 + Math.random() * 2.5,
                color,
                life: 0.3
            });
        }
    }

    function performStep(dx, dy) {
        if (!game || game.session.won) return false;
        const res = game.move(dx, dy);
        if (!res.moved) return false;

        if (res.pushed) {
            audio.playPush(res.onGoal);
            const destKey = `${res.boxTo.x},${res.boxTo.y}`;
            anim.boxOffset.set(destKey, { ox: -dx, oy: -dy });
            spawnDust(res.boxFrom.x, res.boxFrom.y);
            if (res.onGoal) {
                const { tile, offX, offY } = getMetrics();
                const cx = offX + (res.boxTo.x + 0.5) * tile;
                const cy = offY + (res.boxTo.y + 0.5) * tile;
                for (let i = 0; i < 10; i++) {
                    const a = (Math.PI * 2 * i) / 10;
                    anim.sparks.push({ x: cx, y: cy, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.45 });
                }
            }
        } else {
            audio.playStep();
        }

        syncUI();
        if (res.won) onWin();
        return true;
    }

    function onWin() {
        walkQueue = [];
        audio.playWin();
        const s = game.session;
        const id = s.level.id;
        const stars = game.computeStars(s.moves);
        save.levelStars[id] = Math.max(save.levelStars[id] || 0, stars);
        save.bestMoves[id] = save.bestMoves[id] ? Math.min(save.bestMoves[id], s.moves) : s.moves;
        if (save.unlockedLevel < id + 1 && id < E.LEVELS.length) {
            save.unlockedLevel = id + 1;
        }
        persistSave();
        syncUI();

        el.winStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        el.winTitle.textContent = `第 ${id} 关 · ${s.level.name}`;
        el.winSub.textContent = `共走 ${s.moves} 步（参考最佳 ${s.level.par} 步）`;
        el.btnNextLvl.textContent = s.levelIndex < E.LEVELS.length - 1 ? '下一关 →' : '全部通关 · 选关';
        el.winModal.classList.remove('hidden');
    }

    const CHAPTERS = [
        { label: '1-15 基础', start: 0, end: 15 },
        { label: '16-30 中阶', start: 15, end: 30 },
        { label: '31-45 进阶', start: 30, end: 45 },
        { label: '46-60 宗师', start: 45, end: 60 }
    ];
    let selectedChapter = 0;

    function renderChapterLevels() {
        const chap = CHAPTERS[selectedChapter] || CHAPTERS[0];
        if (el.chapterTabs) {
            el.chapterTabs.innerHTML = '';
            CHAPTERS.forEach((c, cIdx) => {
                let cStars = 0;
                for (let i = c.start; i < c.end && i < E.LEVELS.length; i++) {
                    cStars += save.levelStars[E.LEVELS[i].id] || 0;
                }
                const tab = document.createElement('button');
                tab.type = 'button';
                tab.className = 'chap-pill' + (cIdx === selectedChapter ? ' active' : '');
                tab.textContent = `${c.label} (${cStars}/${(c.end - c.start) * 3}★)`;
                tab.onclick = () => {
                    selectedChapter = cIdx;
                    renderChapterLevels();
                };
                el.chapterTabs.appendChild(tab);
            });
        }

        el.levelsGrid.innerHTML = '';
        for (let idx = chap.start; idx < chap.end && idx < E.LEVELS.length; idx++) {
            const lvl = E.LEVELS[idx];
            const unlocked = lvl.id <= save.unlockedLevel;
            const stars = save.levelStars[lvl.id] || 0;
            const best = save.bestMoves[lvl.id];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'lvl-btn' + (idx === game.session.levelIndex ? ' active' : '');
            btn.disabled = !unlocked;
            btn.innerHTML = `
                <strong>${lvl.id}. ${lvl.name}</strong>
                <small>${stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : (unlocked ? '未通关' : '待解锁')}${best ? ' · ' + best + '步' : ''}</small>
            `;
            btn.onclick = () => startLevel(idx);
            el.levelsGrid.appendChild(btn);
        }
    }

    function openLevels() {
        selectedChapter = Math.min(CHAPTERS.length - 1, Math.floor((game ? game.session.levelIndex : 0) / 15));
        renderChapterLevels();
        el.levelsModal.classList.remove('hidden');
    }

    // Input: Keyboard + Click-to-Walk/Push + Touch Swipe + D-pad
    window.addEventListener('keydown', (e) => {
        if (!game) return;
        const dirs = {
            ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
            ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
            ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
            ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
        };
        if (dirs[e.key]) {
            e.preventDefault();
            walkQueue = [];
            performStep(dirs[e.key][0], dirs[e.key][1]);
        } else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
            e.preventDefault();
            walkQueue = [];
            if (game.undo()) { audio.playUndo(); syncUI(); }
        } else if (e.key === 'r' || e.key === 'R') {
            walkQueue = [];
            game.reset();
            anim.px = game.session.player.x;
            anim.py = game.session.player.y;
            anim.boxOffset.clear();
            syncUI();
        }
    });

    canvas.addEventListener('pointerdown', (e) => {
        if (!game || game.session.won) return;
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * W;
        const y = ((e.clientY - rect.top) / rect.height) * H;
        pointerStart = { x, y, t: performance.now() };
    });

    canvas.addEventListener('pointerup', (e) => {
        if (!pointerStart || !game || game.session.won) return;
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * W;
        const y = ((e.clientY - rect.top) / rect.height) * H;
        const dx = x - pointerStart.x;
        const dy = y - pointerStart.y;
        pointerStart = null;

        if (Math.hypot(dx, dy) > 22) {
            walkQueue = [];
            if (Math.abs(dx) > Math.abs(dy)) performStep(dx > 0 ? 1 : -1, 0);
            else performStep(0, dy > 0 ? 1 : -1);
            return;
        }

        // Tap/Click cell: either push adjacent cell or walk via BFS
        const { tile, offX, offY } = getMetrics();
        const gx = Math.floor((x - offX) / tile);
        const gy = Math.floor((y - offY) / tile);
        const s = game.session;
        const pdx = gx - s.player.x;
        const pdy = gy - s.player.y;
        if (Math.abs(pdx) + Math.abs(pdy) === 1) {
            walkQueue = [];
            performStep(pdx, pdy);
            return;
        }
        const path = game.findWalkPath(gx, gy);
        if (path && path.length > 0) {
            walkQueue = path;
            walkTimer = 0;
        }
    });

    document.querySelectorAll('.d-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const [dx, dy] = btn.dataset.dir.split(',').map(Number);
            walkQueue = [];
            performStep(dx, dy);
        });
    });

    el.btnUndo.addEventListener('click', () => {
        walkQueue = [];
        if (game && game.undo()) { audio.playUndo(); syncUI(); }
    });
    el.btnReset.addEventListener('click', () => {
        if (!game) return;
        walkQueue = [];
        game.reset();
        anim.px = game.session.player.x;
        anim.py = game.session.player.y;
        anim.boxOffset.clear();
        syncUI();
    });
    el.btnLevels.addEventListener('click', openLevels);
    el.btnCloseLevels.addEventListener('click', () => el.levelsModal.classList.add('hidden'));
    el.btnMute.addEventListener('click', () => {
        save.muted = !save.muted;
        audio.setMuted(save.muted);
        persistSave();
        syncUI();
    });
    el.btnNextLvl.addEventListener('click', () => {
        if (game.session.levelIndex < E.LEVELS.length - 1) startLevel(game.session.levelIndex + 1);
        else { el.winModal.classList.add('hidden'); openLevels(); }
    });
    el.btnReplayLvl.addEventListener('click', () => startLevel(game.session.levelIndex));

    // Tactile Warehouse Canvas Renderer
    function drawScene(dt) {
        ctx.fillStyle = '#181513';
        ctx.fillRect(0, 0, W, H);
        if (!game) return;

        const s = game.session;
        const { tile, offX, offY } = getMetrics();
        const r = Math.max(4, Math.floor(tile * 0.14));

        // 1. Floor tiles + Target Goal plates
        for (const fk of s.floors) {
            const [gx, gy] = fk.split(',').map(Number);
            const x = offX + gx * tile;
            const y = offY + gy * tile;
            const checker = (gx + gy) % 2 === 0;
            ctx.fillStyle = checker ? '#3c342e' : '#362e29';
            ctx.fillRect(x, y, tile, tile);
            ctx.strokeStyle = 'rgba(0,0,0,0.18)';
            ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);

            if (s.goals.has(fk)) {
                const filled = s.boxes.has(fk);
                const cx = x + tile * 0.5;
                const cy = y + tile * 0.5;
                ctx.fillStyle = filled ? 'rgba(52, 211, 153, 0.25)' : 'rgba(245, 158, 11, 0.18)';
                ctx.beginPath();
                ctx.arc(cx, cy, tile * 0.28, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = filled ? '#34d399' : '#f59e0b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, cy, tile * 0.16, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // 2. Brick Stone Walls (depth-beveled)
        for (const wk of s.walls) {
            const [gx, gy] = wk.split(',').map(Number);
            const x = offX + gx * tile;
            const y = offY + gy * tile;
            ctx.fillStyle = '#57534e';
            ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
            // Brick horizontal highlight & mortar joints
            ctx.fillStyle = '#78716c';
            ctx.fillRect(x + 2, y + 2, tile - 4, Math.max(6, tile * 0.24));
            ctx.fillStyle = '#44403c';
            ctx.fillRect(x + 2, y + tile - 6, tile - 4, 4);
            ctx.strokeStyle = 'rgba(0,0,0,0.28)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 2, y + tile * 0.52); ctx.lineTo(x + tile - 2, y + tile * 0.52);
            ctx.moveTo(x + tile * 0.5, y + tile * 0.26); ctx.lineTo(x + tile * 0.5, y + tile * 0.52);
            ctx.moveTo(x + tile * 0.25, y + tile * 0.52); ctx.lineTo(x + tile * 0.25, y + tile - 2);
            ctx.stroke();
        }

        // 3. Wooden Crates (with smoothed slide + brass lock highlight on goal)
        for (const bk of s.boxes) {
            const [gx, gy] = bk.split(',').map(Number);
            const off = anim.boxOffset.get(bk);
            let ox = 0, oy = 0;
            if (off) {
                const decay = Math.exp(-dt * 24);
                off.ox *= decay;
                off.oy *= decay;
                if (Math.hypot(off.ox, off.oy) < 0.01) anim.boxOffset.delete(bk);
                ox = off.ox;
                oy = off.oy;
            }
            const onGoal = s.goals.has(bk);
            const pad = Math.max(3, Math.floor(tile * 0.09));
            const x = offX + (gx + ox) * tile + pad;
            const y = offY + (gy + oy) * tile + pad;
            const sz = tile - pad * 2;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.34)';
            ctx.fillRect(x + 2, y + 4, sz, sz);

            // Crate Body
            ctx.fillStyle = onGoal ? '#15803d' : '#b46f35';
            ctx.fillRect(x, y, sz, sz);
            ctx.fillStyle = onGoal ? '#22c55e' : '#d68f4d';
            ctx.fillRect(x + 4, y + 4, sz - 8, sz - 8);

            // Diagonal wood brace
            ctx.strokeStyle = onGoal ? '#166534' : '#854d1c';
            ctx.lineWidth = Math.max(2, tile * 0.06);
            ctx.beginPath();
            ctx.moveTo(x + 5, y + 5); ctx.lineTo(x + sz - 5, y + sz - 5);
            ctx.moveTo(x + sz - 5, y + 5); ctx.lineTo(x + 5, y + sz - 5);
            ctx.stroke();

            // Corner brass rivets
            ctx.fillStyle = onGoal ? '#fef08a' : '#f59e0b';
            for (const [rx, ry] of [[x + 4, y + 4], [x + sz - 4, y + 4], [x + 4, y + sz - 4], [x + sz - 4, y + sz - 4]]) {
                ctx.beginPath();
                ctx.arc(rx, ry, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 4. Interpolated Warehouse Keeper Sprite
        const lerpRate = Math.min(1, dt * 22);
        anim.px += (s.player.x - anim.px) * lerpRate;
        anim.py += (s.player.y - anim.py) * lerpRate;
        const pcx = offX + (anim.px + 0.5) * tile;
        const pcy = offY + (anim.py + 0.5) * tile;
        const pr = tile * 0.34;

        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.beginPath();
        ctx.ellipse(pcx, pcy + pr * 0.85, pr * 0.85, pr * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cap + Body + Eyes facing move direction
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(pcx + s.player.dirX * pr * 0.16, pcy + s.player.dirY * pr * 0.14, pr * 0.62, 0, Math.PI * 2);
        ctx.fill();
        // Hardhat rim
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(pcx, pcy - pr * 0.22, pr * 0.72, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        const exOff = s.player.dirX * pr * 0.24;
        const eyOff = s.player.dirY * pr * 0.24;
        ctx.beginPath();
        ctx.arc(pcx + exOff - pr * 0.2, pcy + eyOff, Math.max(1.8, pr * 0.12), 0, Math.PI * 2);
        ctx.arc(pcx + exOff + pr * 0.2, pcy + eyOff, Math.max(1.8, pr * 0.12), 0, Math.PI * 2);
        ctx.fill();

        // 5. Dust & Goal Spark FX
        for (let i = anim.dust.length - 1; i >= 0; i--) {
            const d = anim.dust[i];
            d.life -= dt;
            if (d.life <= 0) { anim.dust.splice(i, 1); continue; }
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            ctx.fillStyle = d.color;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r * (d.life / 0.3), 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = anim.sparks.length - 1; i >= 0; i--) {
            const sp = anim.sparks[i];
            sp.life -= dt;
            if (sp.life <= 0) { anim.sparks.splice(i, 1); continue; }
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            ctx.fillStyle = `rgba(250, 204, 21, ${(sp.life * 2).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    let lastTs = performance.now();
    function frame(ts) {
        const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
        lastTs = ts;

        if (walkQueue.length > 0 && game && !game.session.won) {
            walkTimer += dt;
            if (walkTimer >= 0.065) {
                walkTimer = 0;
                const step = walkQueue.shift();
                if (!performStep(step[0], step[1])) walkQueue = [];
            }
        }

        drawScene(dt);
        requestAnimationFrame(frame);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    startLevel(save.currentLevelIndex || 0);
    requestAnimationFrame(frame);
})();

