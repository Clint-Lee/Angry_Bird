(function () {
    'use strict';

    const E = window.LuminaEngine;
    const audio = window.luminaAudio;
    const STORAGE_KEY = 'cloudeave_lumina_grid_v1';

    // ── Persistent State ───────────────────────────────────────────
    function loadSave() {
        const fallback = {
            version: 1,
            unlockedLevel: 1,
            currentLevelIndex: 0,
            levelStars: {},
            levelScores: {},
            endlessHighScore: 0,
            endlessBestCombo: 0,
            endlessTotalLines: 0,
            soundEnabled: true,
        };
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return fallback;
            return {
                version: 1,
                unlockedLevel: Math.max(1, Math.min(E.LEVELS.length, Number(parsed.unlockedLevel) || 1)),
                currentLevelIndex: Math.max(0, Math.min(E.LEVELS.length - 1, Number(parsed.currentLevelIndex) || 0)),
                levelStars: (parsed.levelStars && typeof parsed.levelStars === 'object') ? parsed.levelStars : {},
                levelScores: (parsed.levelScores && typeof parsed.levelScores === 'object') ? parsed.levelScores : {},
                endlessHighScore: Math.max(0, Number(parsed.endlessHighScore) || 0),
                endlessBestCombo: Math.max(0, Number(parsed.endlessBestCombo) || 0),
                endlessTotalLines: Math.max(0, Number(parsed.endlessTotalLines) || 0),
                soundEnabled: parsed.soundEnabled !== false,
            };
        } catch {
            return fallback;
        }
    }

    function writeSave(save) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
        } catch { /* Ignore quota errors cleanly */ }
    }

    const save = loadSave();
    audio.setEnabled(save.soundEnabled);

    // ── Runtime State ──────────────────────────────────────────────
    const state = {
        mode: 'levels', // 'levels' | 'endless'
        levelIndex: save.currentLevelIndex,
        board: E.createEmptyBoard(),
        tray: [],
        score: 0,
        combo: 0,
        bestComboThisRun: 0,
        linesThisRun: 0,
        shuffleCharges: 1,
        shuffleProgress: 0, // 0..2 towards next charge (every 3 lines)
        maxShuffleCharges: 2,
        selectedSlot: null,
        hoverAnchor: null, // { row, col, valid, previewRows, previewCols }
        gameOver: false,
        won: false,
        drag: null, // { slotIndex, pointerId, startX, startY, curX, curY, active, offsetY }
        particles: [],
        beams: [],
        shockwaves: [],
        popups: [],
        cellBounce: {}, // "r,c" -> startTime
        pulseTime: 0,
        lastFrameTime: performance.now(),
    };

    // ── DOM References ─────────────────────────────────────────────
    const dom = {
        modeSubtitle: document.getElementById('modeSubtitle'),
        btnModeLevels: document.getElementById('btnModeLevels'),
        btnModeEndless: document.getElementById('btnModeEndless'),
        headerStarsTotal: document.getElementById('headerStarsTotal'),
        btnOpenChapters: document.getElementById('btnOpenChapters'),
        btnToggleSound: document.getElementById('btnToggleSound'),
        btnRestart: document.getElementById('btnRestart'),

        hudScore: document.getElementById('hudScore'),
        hudComboPill: document.getElementById('hudComboPill'),
        campaignStarWrap: document.getElementById('campaignStarWrap'),
        starProgressFill: document.getElementById('starProgressFill'),
        starMilestones: document.getElementById('starMilestones'),
        campaignGoals: document.getElementById('campaignGoals'),
        endlessGoals: document.getElementById('endlessGoals'),
        goalChips: document.getElementById('goalChips'),
        levelHint: document.getElementById('levelHint'),
        hudEndlessBest: document.getElementById('hudEndlessBest'),
        hudEndlessCombo: document.getElementById('hudEndlessCombo'),
        hudLinesCleared: document.getElementById('hudLinesCleared'),

        btnShuffleTray: document.getElementById('btnShuffleTray'),
        shuffleStatus: document.getElementById('shuffleStatus'),
        shuffleMeterFill: document.getElementById('shuffleMeterFill'),

        boardCanvas: document.getElementById('boardCanvas'),
        trayGrid: document.getElementById('trayGrid'),
        traySlots: [...document.querySelectorAll('.tray-slot')],
        selectedHint: document.getElementById('selectedHint'),
        dragGhostCanvas: document.getElementById('dragGhostCanvas'),

        levelModal: document.getElementById('levelModal'),
        btnCloseLevels: document.getElementById('btnCloseLevels'),
        chaptersContainer: document.getElementById('chaptersContainer'),

        resultModal: document.getElementById('resultModal'),
        resultBadge: document.getElementById('resultBadge'),
        resultStars: document.getElementById('resultStars'),
        resultTitle: document.getElementById('resultTitle'),
        resultDesc: document.getElementById('resultDesc'),
        resultScore: document.getElementById('resultScore'),
        resultCombo: document.getElementById('resultCombo'),
        resultBest: document.getElementById('resultBest'),
        btnResultPrimary: document.getElementById('btnResultPrimary'),
        btnResultRetry: document.getElementById('btnResultRetry'),
        btnResultChapters: document.getElementById('btnResultChapters'),
    };

    const boardCtx = dom.boardCanvas.getContext('2d');
    const ghostCtx = dom.dragGhostCanvas.getContext('2d');

    let boardMetrics = { cssSize: 440, pad: 12, gap: 5, cell: 48, step: 53 };

    function resizeBoardCanvas() {
        const frame = dom.boardCanvas.parentElement;
        if (!frame) return;
        const size = Math.max(240, Math.floor(frame.clientWidth - 20));
        const dpr = Math.min(2.5, window.devicePixelRatio || 1);
        dom.boardCanvas.width = Math.round(size * dpr);
        dom.boardCanvas.height = Math.round(size * dpr);
        dom.boardCanvas.style.width = `${size}px`;
        dom.boardCanvas.style.height = `${size}px`;
        boardCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const pad = Math.round(size * 0.025);
        const gap = Math.max(3, Math.round(size * 0.011));
        const usable = size - pad * 2 - gap * (E.BOARD_SIZE - 1);
        const cell = Math.floor(usable / E.BOARD_SIZE);
        const exactPad = Math.floor((size - (cell * E.BOARD_SIZE + gap * (E.BOARD_SIZE - 1))) / 2);
        boardMetrics = { cssSize: size, pad: exactPad, gap, cell, step: cell + gap };
    }

    // ── Game Lifecycle ─────────────────────────────────────────────
    function startCampaignLevel(index) {
        state.mode = 'levels';
        state.levelIndex = Math.max(0, Math.min(E.LEVELS.length - 1, index));
        save.currentLevelIndex = state.levelIndex;
        writeSave(save);

        state.board = E.createLevelBoard(state.levelIndex);
        state.tray = E.dealTray(state.board);
        state.score = 0;
        state.combo = 0;
        state.bestComboThisRun = 1;
        state.linesThisRun = 0;
        state.shuffleCharges = 1;
        state.shuffleProgress = 0;
        state.selectedSlot = null;
        state.hoverAnchor = null;
        state.gameOver = false;
        state.won = false;
        state.particles = [];
        state.beams = [];
        state.shockwaves = [];
        state.popups = [];
        state.cellBounce = {};

        dom.resultModal.classList.add('hidden');
        dom.levelModal.classList.add('hidden');
        syncHud();
        renderTray();
    }

    function startEndlessMode() {
        state.mode = 'endless';
        state.board = E.createEmptyBoard();
        state.tray = E.dealTray(state.board);
        state.score = 0;
        state.combo = 0;
        state.bestComboThisRun = 1;
        state.linesThisRun = 0;
        state.shuffleCharges = 1;
        state.shuffleProgress = 0;
        state.selectedSlot = null;
        state.hoverAnchor = null;
        state.gameOver = false;
        state.won = false;
        state.particles = [];
        state.beams = [];
        state.shockwaves = [];
        state.popups = [];
        state.cellBounce = {};

        dom.resultModal.classList.add('hidden');
        dom.levelModal.classList.add('hidden');
        syncHud();
        renderTray();
    }

    function totalEarnedStars() {
        return Object.values(save.levelStars).reduce((sum, n) => sum + (Number(n) || 0), 0);
    }

    // ── Drawing Helpers ────────────────────────────────────────────
    function roundRectPath(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

    function drawFacetedGem(ctx, x, y, size, colorObj, alpha = 1, kind = 'gem', hp = 1, pulse = 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        const r = Math.max(4, Math.round(size * 0.18));

        if (kind === 'wall') {
            roundRectPath(ctx, x, y, size, size, r);
            const g = ctx.createLinearGradient(x, y, x + size, y + size);
            g.addColorStop(0, '#334155');
            g.addColorStop(1, '#1e293b');
            ctx.fillStyle = g;
            ctx.fill();
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Subtle crosshatch motif
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x + size * 0.25, y + size * 0.25);
            ctx.lineTo(x + size * 0.75, y + size * 0.75);
            ctx.moveTo(x + size * 0.75, y + size * 0.25);
            ctx.lineTo(x + size * 0.25, y + size * 0.75);
            ctx.stroke();
            ctx.restore();
            return;
        }

        const c = colorObj || E.COLORS[2];
        // Outer body gradient
        roundRectPath(ctx, x, y, size, size, r);
        const grad = ctx.createLinearGradient(x, y, x + size, y + size);
        grad.addColorStop(0, c.light);
        grad.addColorStop(0.32, c.fill);
        grad.addColorStop(1, c.dark);
        ctx.fillStyle = grad;
        ctx.fill();

        // Top specular rim
        roundRectPath(ctx, x + 1, y + 1, size - 2, size - 2, Math.max(3, r - 1));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner faceted crystal bevel
        const pad = size * 0.18;
        roundRectPath(ctx, x + pad, y + pad, size - pad * 2, size - pad * 2, Math.max(2, r * 0.55));
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fill();

        if (kind === 'frost') {
            // Icy crystalline overlay
            roundRectPath(ctx, x, y, size, size, r);
            ctx.fillStyle = hp > 1 ? 'rgba(186, 230, 253, 0.42)' : 'rgba(224, 242, 254, 0.25)';
            ctx.fill();
            ctx.strokeStyle = '#bae6fd';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // Frost star / pip showing hp (1 or 2)
            ctx.fillStyle = '#ffffff';
            const cy = y + size * 0.5;
            if (hp > 1) {
                ctx.beginPath();
                ctx.arc(x + size * 0.37, cy, size * 0.1, 0, Math.PI * 2);
                ctx.arc(x + size * 0.63, cy, size * 0.1, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Single cracked frost shard
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(x + size * 0.28, y + size * 0.32);
                ctx.lineTo(x + size * 0.52, cy);
                ctx.lineTo(x + size * 0.72, y + size * 0.68);
                ctx.stroke();
            }
        } else if (kind === 'target') {
            // Golden pulsing star core inside crystal
            const cx = x + size * 0.5;
            const cy = y + size * 0.5;
            const scale = 1 + Math.sin(pulse * 4) * 0.08;
            const outerR = size * 0.3 * scale;
            const innerR = size * 0.12 * scale;
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const rad = i % 2 === 0 ? outerR : innerR;
                const angle = (i * Math.PI) / 4 - Math.PI / 2;
                const px = cx + Math.cos(angle) * rad;
                const py = cy + Math.sin(angle) * rad;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    function renderMiniPiece(canvas, piece, cellPx = 22) {
        const shape = piece.shape;
        const gap = 3;
        const pad = 6;
        const logicalW = shape.cols * cellPx + Math.max(0, shape.cols - 1) * gap + pad * 2;
        const logicalH = shape.rows * cellPx + Math.max(0, shape.rows - 1) * gap + pad * 2;
        const dpr = Math.min(2.5, window.devicePixelRatio || 1);

        canvas.width = Math.round(logicalW * dpr);
        canvas.height = Math.round(logicalH * dpr);
        canvas.style.width = `${logicalW}px`;
        canvas.style.height = `${logicalH}px`;

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, logicalW, logicalH);

        const cObj = E.COLORS[piece.color];
        for (const [dr, dc] of shape.cells) {
            drawFacetedGem(
                ctx,
                pad + dc * (cellPx + gap),
                pad + dr * (cellPx + gap),
                cellPx,
                cObj,
                1,
                'gem'
            );
        }
    }

    function renderTray() {
        const activeCount = state.tray.filter(p => !p.used).length;
        if (activeCount === 0 && !state.won && !state.gameOver) {
            state.tray = E.dealTray(state.board);
        }

        const canMoveAny = E.hasAnyValidMove(state.board, state.tray);
        let playableAny = false;

        dom.traySlots.forEach((slotEl, idx) => {
            const piece = state.tray[idx];
            slotEl.innerHTML = '';
            slotEl.classList.remove('is-selected', 'is-used', 'is-unplayable', 'is-dragging');
            if (!piece || piece.used) {
                slotEl.disabled = true;
                slotEl.classList.add('is-used');
                return;
            }
            const fits = E.canShapeFitAnywhere(state.board, piece.shape);
            if (fits) playableAny = true;
            slotEl.disabled = state.gameOver || state.won;
            if (!fits) slotEl.classList.add('is-unplayable');
            if (state.selectedSlot === idx) slotEl.classList.add('is-selected');
            if (state.drag && state.drag.active && state.drag.slotIndex === idx) {
                slotEl.classList.add('is-dragging');
            }

            const mini = document.createElement('canvas');
            const scalePx = Math.max(14, Math.min(21, Math.floor(66 / Math.max(piece.shape.rows, piece.shape.cols))));
            renderMiniPiece(mini, piece, scalePx);
            slotEl.appendChild(mini);
        });

        if (state.selectedSlot !== null && state.tray[state.selectedSlot] && !state.tray[state.selectedSlot].used) {
            dom.selectedHint.textContent = '已选中：点击或悬停上方棋盘放置';
        } else if (!playableAny && !state.won && !state.gameOver && state.shuffleCharges > 0) {
            dom.selectedHint.textContent = '无合适空位 · 点击右上「⚡ 换一批」救援';
        } else {
            dom.selectedHint.textContent = '';
        }

        if (!canMoveAny && !state.won && !state.gameOver && state.shuffleCharges <= 0) {
            triggerDefeat();
        }
    }

    function syncHud() {
        const level = E.LEVELS[state.levelIndex] || E.LEVELS[0];
        const obj = E.countBoardObjectives(state.board);

        dom.btnModeLevels.classList.toggle('active', state.mode === 'levels');
        dom.btnModeEndless.classList.toggle('active', state.mode === 'endless');
        dom.headerStarsTotal.textContent = `${totalEarnedStars()}/72 ⭐`;

        dom.hudScore.textContent = state.score.toLocaleString('zh-CN');
        if (state.combo >= 2) {
            dom.hudComboPill.textContent = `连消 ×${state.combo}`;
            dom.hudComboPill.classList.remove('hidden');
        } else {
            dom.hudComboPill.classList.add('hidden');
        }

        if (state.mode === 'levels') {
            const chap = E.CHAPTERS.find(c => c.id === level.world) || E.CHAPTERS[0];
            dom.modeSubtitle.textContent = `${level.name} · ${chap.name}`;
            dom.campaignStarWrap.classList.remove('hidden');
            dom.campaignGoals.classList.remove('hidden');
            dom.endlessGoals.classList.add('hidden');
            dom.levelHint.textContent = level.hint;

            const [s1, s2, s3] = level.starThresholds;
            const pct = Math.min(100, Math.round((state.score / s3) * 100));
            dom.starProgressFill.style.width = `${pct}%`;
            dom.starMilestones.innerHTML =
                `<span>1⭐ ${s1}</span><span>2⭐ ${s2}</span><span>3⭐ ${s3}</span>`;

            const chips = [];
            if (obj.targets > 0 || level.layout.some(r => r.includes('*'))) {
                chips.push(`<span class="goal-chip ${obj.targets === 0 ? 'is-done' : ''}">⭐ 剩余星核 <b>${obj.targets}</b></span>`);
            }
            if (obj.frosts > 0 || level.layout.some(r => r.includes('1') || r.includes('2'))) {
                chips.push(`<span class="goal-chip ${obj.frosts === 0 ? 'is-done' : ''}">❄️ 剩余霜晶 <b>${obj.frosts}</b></span>`);
            }
            const scoreDone = state.score >= level.goalScore;
            chips.push(`<span class="goal-chip ${scoreDone ? 'is-done' : ''}">🎯 目标分 <b>${state.score}/${level.goalScore}</b></span>`);
            dom.goalChips.innerHTML = chips.join('');
        } else {
            dom.modeSubtitle.textContent = '无尽挑战 · 连消冲击极限高分';
            dom.campaignStarWrap.classList.add('hidden');
            dom.campaignGoals.classList.add('hidden');
            dom.endlessGoals.classList.remove('hidden');
            dom.hudEndlessBest.textContent = Math.max(save.endlessHighScore, state.score).toLocaleString('zh-CN');
            dom.hudEndlessCombo.textContent = `×${Math.max(save.endlessBestCombo, state.bestComboThisRun)}`;
            dom.hudLinesCleared.textContent = `${state.linesThisRun} 行`;
        }

        dom.btnShuffleTray.disabled = state.shuffleCharges <= 0 || state.gameOver || state.won;
        dom.shuffleStatus.textContent = `充能 ${state.shuffleCharges}/${state.maxShuffleCharges}`;
        dom.shuffleMeterFill.style.width = `${Math.round((state.shuffleProgress / 3) * 100)}%`;

        dom.btnToggleSound.textContent = save.soundEnabled ? '🔊' : '🔇';
        dom.btnToggleSound.setAttribute('aria-pressed', String(save.soundEnabled));
    }

    function popScoreLabel() {
        dom.hudScore.classList.remove('is-popping');
        void dom.hudScore.offsetWidth;
        dom.hudScore.classList.add('is-popping');
    }

    // ── FX Spawning ────────────────────────────────────────────────
    function spawnClearEffects(outcome) {
        const { step, pad, cell } = boardMetrics;
        const half = cell / 2;

        for (const r of outcome.clearedRows) {
            state.beams.push({
                orientation: 'row',
                index: r,
                life: 0,
                maxLife: 0.42,
                color: outcome.isCrossClear ? '#facc15' : '#34d399',
            });
        }
        for (const c of outcome.clearedCols) {
            state.beams.push({
                orientation: 'col',
                index: c,
                life: 0,
                maxLife: 0.42,
                color: outcome.isCrossClear ? '#facc15' : '#38bdf8',
            });
        }

        for (const fx of outcome.effects) {
            const cx = pad + fx.c * step + half;
            const cy = pad + fx.r * step + half;
            const colorObj = E.COLORS[fx.color] || E.COLORS[2];
            const burst = fx.type === 'target-clear' ? 12 : 7;
            for (let i = 0; i < burst; i++) {
                const angle = (Math.PI * 2 * i) / burst + (Math.random() - 0.5) * 0.4;
                const speed = 70 + Math.random() * 140;
                state.particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 25,
                    size: 3 + Math.random() * 4.5,
                    color: fx.type === 'target-clear' ? '#fef08a' : (fx.type.startsWith('frost') ? '#bae6fd' : colorObj.light),
                    life: 0,
                    maxLife: 0.45 + Math.random() * 0.25,
                    rot: Math.random() * Math.PI,
                    vRot: (Math.random() - 0.5) * 10,
                });
            }
            if (fx.type === 'target-clear' || fx.type === 'frost-shatter') {
                state.shockwaves.push({
                    x: cx,
                    y: cy,
                    color: fx.type === 'target-clear' ? '#facc15' : '#7dd3fc',
                    life: 0,
                    maxLife: 0.46,
                });
            }
        }

        if (outcome.placedCells.length) {
            let sumX = 0;
            let sumY = 0;
            for (const [r, c] of outcome.placedCells) {
                sumX += pad + c * step + half;
                sumY += pad + r * step + half;
            }
            const px = Math.max(70, Math.min(boardMetrics.cssSize - 70, sumX / outcome.placedCells.length));
            const py = Math.max(40, sumY / outcome.placedCells.length - 10);
            let label = `+${outcome.scoreGain}`;
            if (outcome.isCrossClear) label = `十字共振 +${outcome.scoreGain}!`;
            else if (outcome.combo >= 2) label = `${outcome.combo} 连消 +${outcome.scoreGain}!`;
            else if (outcome.clearedLines >= 2) label = `多行清屏 +${outcome.scoreGain}!`;

            state.popups.push({
                x: px,
                y: py,
                text: label,
                color: outcome.isCrossClear ? '#fde047' : (outcome.clearedLines > 0 ? '#6ee7b7' : '#e2e8f0'),
                scale: outcome.clearedLines > 0 ? 1.15 : 0.9,
                life: 0,
                maxLife: outcome.clearedLines > 0 ? 0.95 : 0.6,
            });
        }
    }

    // ── Placement Execution ────────────────────────────────────────
    function tryPlaceAt(slotIndex, anchorRow, anchorCol) {
        if (state.gameOver || state.won) return false;
        const piece = state.tray[slotIndex];
        if (!piece || piece.used) return false;

        const outcome = E.applyPlacement(state.board, piece, anchorRow, anchorCol, state.combo);
        if (!outcome.ok) {
            audio.playInvalid();
            return false;
        }

        state.board = outcome.board;
        piece.used = true;
        state.selectedSlot = null;
        state.hoverAnchor = null;
        state.score += outcome.scoreGain;
        state.combo = outcome.combo;
        state.bestComboThisRun = Math.max(state.bestComboThisRun, state.combo || 1);
        state.linesThisRun += outcome.clearedLines;

        const nowMs = performance.now();
        for (const [r, c] of outcome.placedCells) {
            state.cellBounce[`${r},${c}`] = nowMs;
        }

        if (outcome.clearedLines > 0) {
            audio.playClear(outcome.clearedLines, state.combo, outcome.isCrossClear);
            if (outcome.meltedFrost > 0) audio.playFrostBreak(true);
            else if (outcome.effects.some(f => f.type === 'frost-crack')) audio.playFrostBreak(false);

            // Earn shuffle energy every 3 lines cleared
            let progress = state.shuffleProgress + outcome.clearedLines;
            while (progress >= 3 && state.shuffleCharges < state.maxShuffleCharges) {
                progress -= 3;
                state.shuffleCharges += 1;
            }
            state.shuffleProgress = state.shuffleCharges >= state.maxShuffleCharges ? 0 : progress;
        } else {
            audio.playPlace();
        }

        if (state.mode === 'endless') {
            if (state.score > save.endlessHighScore) save.endlessHighScore = state.score;
            if (state.bestComboThisRun > save.endlessBestCombo) save.endlessBestCombo = state.bestComboThisRun;
            save.endlessTotalLines += outcome.clearedLines;
            writeSave(save);
        }

        spawnClearEffects(outcome);
        popScoreLabel();

        if (state.mode === 'levels') {
            const evalRes = E.evaluateLevelStatus(state.levelIndex, state.board, state.score);
            if (evalRes.won) {
                syncHud();
                renderTray();
                triggerVictory(evalRes.stars);
                return true;
            }
        }

        if (state.tray.every(p => p.used)) {
            state.tray = E.dealTray(state.board);
        }

        syncHud();
        renderTray();
        return true;
    }

    function triggerVictory(stars) {
        state.won = true;
        audio.playWin();
        const level = E.LEVELS[state.levelIndex];
        const prevStars = Number(save.levelStars[level.id] || 0);
        const prevBest = Number(save.levelScores[level.id] || 0);
        const isNewBest = state.score > prevBest;
        save.levelStars[level.id] = Math.max(prevStars, stars);
        save.levelScores[level.id] = Math.max(prevBest, state.score);
        if (level.id >= save.unlockedLevel && level.id < E.LEVELS.length) {
            save.unlockedLevel = level.id + 1;
        }
        writeSave(save);
        syncHud();

        dom.resultBadge.textContent = isNewBest ? '新纪录 · 关卡达成' : '关卡达成';
        dom.resultBadge.classList.remove('is-fail');
        dom.resultStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        dom.resultTitle.textContent = state.levelIndex === E.LEVELS.length - 1 ? '全星域 24 关大满贯！' : `${level.name} 通过！`;
        dom.resultDesc.textContent = '目标星核与霜晶全部清除了！准备开启下一段星域探索。';
        dom.resultScore.textContent = state.score.toLocaleString('zh-CN');
        dom.resultCombo.textContent = `×${state.bestComboThisRun}`;
        dom.resultBest.textContent = save.levelScores[level.id].toLocaleString('zh-CN');

        const hasNext = state.levelIndex < E.LEVELS.length - 1;
        dom.btnResultPrimary.textContent = hasNext ? '下一关 →' : '挑战无尽模式 ♾️';
        dom.btnResultPrimary.classList.remove('hidden');
        dom.resultModal.classList.remove('hidden');
    }

    function triggerDefeat() {
        state.gameOver = true;
        audio.playGameOver();

        dom.resultBadge.textContent = state.mode === 'endless' ? '无尽挑战结束' : '棋盘已满 · 无可落子';
        dom.resultBadge.classList.add('is-fail');
        dom.resultStars.textContent = state.mode === 'endless' ? '♾️' : '💫';
        dom.resultTitle.textContent = state.mode === 'endless' ? `本局得分 ${state.score.toLocaleString('zh-CN')}` : '再试一次吧！';
        dom.resultDesc.textContent = state.mode === 'endless'
            ? '多留些成片空位迎接大块，下次定能刷新更高连消纪录！'
            : '注意先清理靠近边角与障碍墙的缝隙，避免过早被大块卡死。';
        dom.resultScore.textContent = state.score.toLocaleString('zh-CN');
        dom.resultCombo.textContent = `×${state.bestComboThisRun}`;
        const best = state.mode === 'endless'
            ? save.endlessHighScore
            : Number(save.levelScores[E.LEVELS[state.levelIndex].id] || state.score);
        dom.resultBest.textContent = best.toLocaleString('zh-CN');

        dom.btnResultPrimary.textContent = '重新挑战 ↻';
        dom.resultModal.classList.remove('hidden');
    }

    // ── Canvas Pointer & Drag Handling ─────────────────────────────
    function resolveBoardAnchor(clientX, clientY, shape, offsetY = 0) {
        const rect = dom.boardCanvas.getBoundingClientRect();
        const bx = clientX - rect.left;
        const by = clientY + offsetY - rect.top;
        const { step, pad, cssSize } = boardMetrics;
        if (bx < -step * 0.6 || bx > cssSize + step * 0.6 || by < -step * 0.6 || by > cssSize + step * 0.6) {
            return null;
        }
        const rawCol = Math.round((bx - pad) / step - shape.cols / 2);
        const rawRow = Math.round((by - pad) / step - shape.rows / 2);
        const preview = E.previewPlacementClears(state.board, shape, rawRow, rawCol);
        return {
            row: rawRow,
            col: rawCol,
            valid: preview.valid,
            previewRows: preview.rows,
            previewCols: preview.cols,
        };
    }

    function updateDragGhostPosition(clientX, clientY, offsetY) {
        dom.dragGhostCanvas.style.left = `${clientX}px`;
        dom.dragGhostCanvas.style.top = `${clientY + offsetY}px`;
    }

    dom.traySlots.forEach((slotEl, slotIdx) => {
        slotEl.addEventListener('pointerdown', (e) => {
            if (state.gameOver || state.won) return;
            const piece = state.tray[slotIdx];
            if (!piece || piece.used) return;
            e.preventDefault();
            audio.init();

            const offsetY = e.pointerType === 'touch' ? -56 : -10;
            state.drag = {
                slotIndex: slotIdx,
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                curX: e.clientX,
                curY: e.clientY,
                active: false,
                offsetY,
            };
        });
    });

    window.addEventListener('pointermove', (e) => {
        if (state.drag && e.pointerId === state.drag.pointerId) {
            state.drag.curX = e.clientX;
            state.drag.curY = e.clientY;
            const dist = Math.hypot(e.clientX - state.drag.startX, e.clientY - state.drag.startY);
            const piece = state.tray[state.drag.slotIndex];
            if (!state.drag.active && dist > 6 && piece && !piece.used) {
                state.drag.active = true;
                state.selectedSlot = state.drag.slotIndex;
                audio.playPick();
                renderMiniPiece(dom.dragGhostCanvas, piece, Math.max(24, Math.round(boardMetrics.cell * 0.86)));
                dom.dragGhostCanvas.classList.remove('hidden');
                renderTray();
            }
            if (state.drag.active && piece) {
                updateDragGhostPosition(e.clientX, e.clientY, state.drag.offsetY);
                state.hoverAnchor = resolveBoardAnchor(e.clientX, e.clientY, piece.shape, state.drag.offsetY);
            }
            return;
        }

        // Hover preview when a tray slot was click-selected
        if (!state.drag && state.selectedSlot !== null && !state.gameOver && !state.won) {
            const piece = state.tray[state.selectedSlot];
            if (piece && !piece.used) {
                const rect = dom.boardCanvas.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    state.hoverAnchor = resolveBoardAnchor(e.clientX, e.clientY, piece.shape, 0);
                } else {
                    state.hoverAnchor = null;
                }
            }
        }
    });

    function finishDrag(e) {
        if (!state.drag || e.pointerId !== state.drag.pointerId) return;
        const d = state.drag;
        state.drag = null;
        dom.dragGhostCanvas.classList.add('hidden');

        const piece = state.tray[d.slotIndex];
        if (!d.active) {
            // Treat as tap/click-to-select toggle
            state.selectedSlot = (state.selectedSlot === d.slotIndex) ? null : d.slotIndex;
            if (state.selectedSlot !== null) audio.playPick();
            state.hoverAnchor = null;
            renderTray();
            return;
        }

        if (piece && !piece.used) {
            const anchor = resolveBoardAnchor(e.clientX, e.clientY, piece.shape, d.offsetY);
            if (anchor && anchor.valid) {
                tryPlaceAt(d.slotIndex, anchor.row, anchor.col);
                return;
            }
        }
        state.hoverAnchor = null;
        renderTray();
    }

    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    dom.boardCanvas.addEventListener('pointerdown', (e) => {
        if (state.selectedSlot === null || state.gameOver || state.won) return;
        const piece = state.tray[state.selectedSlot];
        if (!piece || piece.used) return;
        audio.init();
        const anchor = resolveBoardAnchor(e.clientX, e.clientY, piece.shape, 0);
        if (anchor && anchor.valid) {
            tryPlaceAt(state.selectedSlot, anchor.row, anchor.col);
        } else if (anchor) {
            audio.playInvalid();
        }
    });

    dom.boardCanvas.addEventListener('pointerleave', () => {
        if (!state.drag) state.hoverAnchor = null;
    });

    // ── Chapter / Level Select UI ──────────────────────────────────
    function renderChaptersModal() {
        const html = E.CHAPTERS.map(chap => {
            const chapLevels = E.LEVELS.filter(lv => lv.world === chap.id);
            const tiles = chapLevels.map(lv => {
                const stars = Number(save.levelStars[lv.id] || 0);
                const unlocked = lv.id <= save.unlockedLevel;
                const isCurr = state.mode === 'levels' && E.LEVELS[state.levelIndex]?.id === lv.id;
                const starText = unlocked ? ('⭐'.repeat(stars) + '☆'.repeat(3 - stars)) : '🔒';
                return `
                    <button type="button" class="level-tile ${isCurr ? 'is-current' : ''}"
                            data-level-id="${lv.id}" ${unlocked ? '' : 'disabled'}>
                        <span class="level-num mono">${lv.world}-${((lv.id - 1) % 6) + 1}</span>
                        <span class="level-stars">${starText}</span>
                    </button>
                `;
            }).join('');
            return `
                <section class="chapter-card">
                    <div class="chapter-title-row">
                        <strong style="color:${chap.accent}">第 ${chap.id} 章 · ${chap.name}</strong>
                        <span>${chap.desc}</span>
                    </div>
                    <div class="levels-grid">${tiles}</div>
                </section>
            `;
        }).join('');
        dom.chaptersContainer.innerHTML = html;

        dom.chaptersContainer.querySelectorAll('.level-tile').forEach(btn => {
            btn.addEventListener('click', () => {
                const lvId = Number(btn.dataset.levelId);
                if (lvId >= 1) startCampaignLevel(lvId - 1);
            });
        });
    }

    // ── Button Listeners ───────────────────────────────────────────
    dom.btnModeLevels.addEventListener('click', () => startCampaignLevel(state.levelIndex));
    dom.btnModeEndless.addEventListener('click', startEndlessMode);
    dom.btnOpenChapters.addEventListener('click', () => {
        renderChaptersModal();
        dom.levelModal.classList.remove('hidden');
    });
    dom.btnCloseLevels.addEventListener('click', () => dom.levelModal.classList.add('hidden'));
    dom.levelModal.addEventListener('click', (e) => {
        if (e.target === dom.levelModal) dom.levelModal.classList.add('hidden');
    });

    dom.btnToggleSound.addEventListener('click', () => {
        save.soundEnabled = !save.soundEnabled;
        audio.setEnabled(save.soundEnabled);
        writeSave(save);
        syncHud();
        if (save.soundEnabled) audio.playPick();
    });

    dom.btnRestart.addEventListener('click', () => {
        if (state.mode === 'levels') startCampaignLevel(state.levelIndex);
        else startEndlessMode();
    });

    dom.btnShuffleTray.addEventListener('click', () => {
        if (state.shuffleCharges <= 0 || state.gameOver || state.won) return;
        audio.init();
        audio.playShuffle();
        state.shuffleCharges -= 1;
        state.selectedSlot = null;
        state.hoverAnchor = null;
        state.tray = E.dealTray(state.board);
        syncHud();
        renderTray();
    });

    dom.btnResultPrimary.addEventListener('click', () => {
        if (state.mode === 'levels' && state.won) {
            if (state.levelIndex < E.LEVELS.length - 1) startCampaignLevel(state.levelIndex + 1);
            else startEndlessMode();
        } else if (state.mode === 'levels') {
            startCampaignLevel(state.levelIndex);
        } else {
            startEndlessMode();
        }
    });
    dom.btnResultRetry.addEventListener('click', () => {
        if (state.mode === 'levels') startCampaignLevel(state.levelIndex);
        else startEndlessMode();
    });
    dom.btnResultChapters.addEventListener('click', () => {
        dom.resultModal.classList.add('hidden');
        renderChaptersModal();
        dom.levelModal.classList.remove('hidden');
    });

    // ── Main Render Loop ───────────────────────────────────────────
    function renderFrame(now) {
        const dt = Math.min(0.05, Math.max(0.001, (now - state.lastFrameTime) / 1000));
        state.lastFrameTime = now;
        state.pulseTime += dt;

        const { cssSize, pad, gap, cell, step } = boardMetrics;
        boardCtx.clearRect(0, 0, cssSize, cssSize);

        // Background board surface
        roundRectPath(boardCtx, 0, 0, cssSize, cssSize, 14);
        boardCtx.fillStyle = '#070d18';
        boardCtx.fill();

        const previewRows = new Set(state.hoverAnchor?.previewRows || []);
        const previewCols = new Set(state.hoverAnchor?.previewCols || []);

        // Empty slot cells + pre-clear glow lines
        for (let r = 0; r < E.BOARD_SIZE; r++) {
            for (let c = 0; c < E.BOARD_SIZE; c++) {
                const x = pad + c * step;
                const y = pad + r * step;
                const willClearLine = previewRows.has(r) || previewCols.has(c);

                roundRectPath(boardCtx, x, y, cell, cell, Math.max(4, Math.round(cell * 0.16)));
                if (willClearLine) {
                    boardCtx.fillStyle = 'rgba(16, 185, 129, 0.22)';
                    boardCtx.fill();
                    boardCtx.strokeStyle = 'rgba(110, 231, 183, 0.72)';
                    boardCtx.lineWidth = 1.4;
                    boardCtx.stroke();
                } else {
                    boardCtx.fillStyle = ((r + c) % 2 === 0) ? 'rgba(30, 41, 59, 0.62)' : 'rgba(22, 32, 48, 0.62)';
                    boardCtx.fill();
                    boardCtx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
                    boardCtx.lineWidth = 1;
                    boardCtx.stroke();
                }
            }
        }

        // Placed cells & obstacles
        for (let r = 0; r < E.BOARD_SIZE; r++) {
            for (let c = 0; c < E.BOARD_SIZE; c++) {
                const item = state.board[r][c];
                if (!item) continue;
                let x = pad + c * step;
                let y = pad + r * step;
                let size = cell;

                const bounceStart = state.cellBounce[`${r},${c}`];
                if (bounceStart) {
                    const elapsed = (now - bounceStart) / 1000;
                    if (elapsed < 0.22) {
                        const t = elapsed / 0.22;
                        const s = 0.76 + Math.sin(t * Math.PI * 0.5) * 0.24 + Math.sin(t * Math.PI) * 0.08;
                        const diff = (size * (1 - s)) / 2;
                        x += diff;
                        y += diff;
                        size *= s;
                    } else {
                        delete state.cellBounce[`${r},${c}`];
                    }
                }

                const cObj = item.color !== undefined ? E.COLORS[item.color] : E.COLORS[0];
                drawFacetedGem(boardCtx, x, y, size, cObj, 1, item.kind, item.hp || 1, state.pulseTime);

                if ((previewRows.has(r) || previewCols.has(c)) && item.kind !== 'wall') {
                    boardCtx.save();
                    roundRectPath(boardCtx, x, y, size, size, Math.max(4, Math.round(size * 0.18)));
                    boardCtx.strokeStyle = '#fde047';
                    boardCtx.lineWidth = 2;
                    boardCtx.stroke();
                    boardCtx.restore();
                }
            }
        }

        // Placement preview ghost footprint
        if (state.hoverAnchor && state.selectedSlot !== null) {
            const piece = state.tray[state.selectedSlot];
            if (piece && !piece.used) {
                const cObj = E.COLORS[piece.color];
                for (const [dr, dc] of piece.shape.cells) {
                    const gr = state.hoverAnchor.row + dr;
                    const gc = state.hoverAnchor.col + dc;
                    if (gr < 0 || gr >= E.BOARD_SIZE || gc < 0 || gc >= E.BOARD_SIZE) continue;
                    const gx = pad + gc * step;
                    const gy = pad + gr * step;
                    if (state.hoverAnchor.valid) {
                        drawFacetedGem(boardCtx, gx, gy, cell, cObj, 0.55, 'gem', 1, state.pulseTime);
                    } else {
                        boardCtx.save();
                        roundRectPath(boardCtx, gx, gy, cell, cell, Math.max(4, Math.round(cell * 0.16)));
                        boardCtx.fillStyle = 'rgba(244, 63, 94, 0.32)';
                        boardCtx.fill();
                        boardCtx.strokeStyle = 'rgba(253, 164, 175, 0.85)';
                        boardCtx.lineWidth = 1.5;
                        boardCtx.stroke();
                        boardCtx.restore();
                    }
                }
            }
        }

        // Sweeping laser beams across cleared lines
        for (let i = state.beams.length - 1; i >= 0; i--) {
            const b = state.beams[i];
            b.life += dt;
            if (b.life >= b.maxLife) {
                state.beams.splice(i, 1);
                continue;
            }
            const progress = b.life / b.maxLife;
            const alpha = (1 - progress) * 0.85;
            boardCtx.save();
            boardCtx.globalAlpha = alpha;
            boardCtx.fillStyle = b.color;
            boardCtx.shadowColor = b.color;
            boardCtx.shadowBlur = 18;
            if (b.orientation === 'row') {
                const y = pad + b.index * step + cell * (0.15 + progress * 0.25);
                const h = Math.max(2, cell * (0.7 - progress * 0.55));
                roundRectPath(boardCtx, pad, y, cssSize - pad * 2, h, 4);
                boardCtx.fill();
            } else {
                const x = pad + b.index * step + cell * (0.15 + progress * 0.25);
                const w = Math.max(2, cell * (0.7 - progress * 0.55));
                roundRectPath(boardCtx, x, pad, w, cssSize - pad * 2, 4);
                boardCtx.fill();
            }
            boardCtx.restore();
        }

        // Shockwave rings
        for (let i = state.shockwaves.length - 1; i >= 0; i--) {
            const sw = state.shockwaves[i];
            sw.life += dt;
            if (sw.life >= sw.maxLife) {
                state.shockwaves.splice(i, 1);
                continue;
            }
            const p = sw.life / sw.maxLife;
            boardCtx.save();
            boardCtx.globalAlpha = (1 - p) * 0.8;
            boardCtx.strokeStyle = sw.color;
            boardCtx.lineWidth = 3 * (1 - p);
            boardCtx.beginPath();
            boardCtx.arc(sw.x, sw.y, cell * (0.35 + p * 1.1), 0, Math.PI * 2);
            boardCtx.stroke();
            boardCtx.restore();
        }

        // Faceted shard particles
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
                state.particles.splice(i, 1);
                continue;
            }
            p.vy += 260 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rot += p.vRot * dt;
            const alpha = Math.max(0, 1 - p.life / p.maxLife);
            boardCtx.save();
            boardCtx.globalAlpha = alpha;
            boardCtx.translate(p.x, p.y);
            boardCtx.rotate(p.rot);
            boardCtx.fillStyle = p.color;
            boardCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            boardCtx.restore();
        }

        // Floating score & combo popups
        for (let i = state.popups.length - 1; i >= 0; i--) {
            const pop = state.popups[i];
            pop.life += dt;
            if (pop.life >= pop.maxLife) {
                state.popups.splice(i, 1);
                continue;
            }
            const p = pop.life / pop.maxLife;
            const y = pop.y - p * 34;
            const alpha = p < 0.7 ? 1 : (1 - (p - 0.7) / 0.3);
            boardCtx.save();
            boardCtx.globalAlpha = Math.max(0, alpha);
            boardCtx.font = `800 ${Math.round(16 * pop.scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
            boardCtx.textAlign = 'center';
            boardCtx.shadowColor = 'rgba(2, 6, 23, 0.9)';
            boardCtx.shadowBlur = 8;
            boardCtx.fillStyle = pop.color;
            boardCtx.fillText(pop.text, pop.x, y);
            boardCtx.restore();
        }

        requestAnimationFrame(renderFrame);
    }

    // ── Boot ───────────────────────────────────────────────────────
    window.addEventListener('resize', resizeBoardCanvas);
    resizeBoardCanvas();
    startCampaignLevel(save.currentLevelIndex);
    requestAnimationFrame(renderFrame);
})();
