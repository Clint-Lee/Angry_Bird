(function () {
    'use strict';

    const E = window.PrismLoomEngine;
    const AudioCls = window.PrismLoomAudio;
    const canvas = document.getElementById('prismCanvas');
    const ctx = canvas.getContext('2d');
    const audio = new AudioCls();

    const BOARD_PX = 520;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = BOARD_PX * DPR;
    canvas.height = BOARD_PX * DPR;

    function loadSave() {
        try {
            const raw = localStorage.getItem(E.SAVE_KEY);
            return E.normalizeSave(raw ? JSON.parse(raw) : {});
        } catch {
            return E.normalizeSave({});
        }
    }

    let save = loadSave();
    audio.setMuted(save.muted);

    function persistSave() {
        try {
            localStorage.setItem(E.SAVE_KEY, JSON.stringify(save));
        } catch { /* ignore storage errors */ }
    }

    // Visual state
    let currentMode = 'campaign';
    let session = null;
    let levelStartAt = performance.now();
    let hoverCell = null;
    let hintTarget = null;
    let hintTimer = 0;
    let lastLitCount = 0;
    let winOpened = false;

    const visualRotMap = new Map();
    const sparks = [];
    const starsBg = Array.from({ length: 48 }, (_, idx) => ({
        x: ((idx * 173 + 29) % 520),
        y: ((idx * 311 + 57) % 520),
        r: 0.7 + (idx % 3) * 0.45,
        phase: idx * 0.7
    }));

    function cellKey(r, c) { return `${r},${c}`; }

    function spawnSparks(x, y, hexColor, count) {
        const n = count || 12;
        for (let i = 0; i < n; i++) {
            const ang = (Math.PI * 2 * i) / n + Math.random() * 0.45;
            const spd = 40 + Math.random() * 130;
            sparks.push({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                r: 1.5 + Math.random() * 2.3,
                color: hexColor,
                life: 0.45 + Math.random() * 0.25,
                maxLife: 0.7
            });
        }
    }

    function cellGeom() {
        const pad = 22;
        const rows = session ? session.rows : 6;
        const cols = session ? session.cols : 6;
        const inner = BOARD_PX - pad * 2;
        const cell = inner / Math.max(rows, cols);
        const offX = (BOARD_PX - cell * cols) * 0.5;
        const offY = (BOARD_PX - cell * rows) * 0.5;
        return { cell, offX, offY, rows, cols };
    }

    function cellCenter(r, c, g) {
        return {
            x: g.offX + (c + 0.5) * g.cell,
            y: g.offY + (r + 0.5) * g.cell
        };
    }

    function initVisualAngles() {
        visualRotMap.clear();
        if (!session) return;
        for (let r = 0; r < session.rows; r++) {
            for (let c = 0; c < session.cols; c++) {
                const t = session.grid[r][c];
                if (E.isRotatable(t)) {
                    visualRotMap.set(cellKey(r, c), t.rot === 0 ? -Math.PI * 0.25 : Math.PI * 0.25);
                }
            }
        }
    }

    function startSession(mode, levelIndex) {
        currentMode = mode === 'endless' ? 'endless' : 'campaign';
        if (typeof levelIndex === 'number') {
            save.currentLevelIndex = Math.max(0, Math.min(E.LEVELS.length - 1, levelIndex));
            persistSave();
        }
        const diff = Math.min(6, 1 + Math.floor(save.endlessSolved / 2));
        session = E.createSession({
            mode: currentMode,
            levelIndex: save.currentLevelIndex,
            difficulty: diff,
            seed: Date.now()
        });
        winOpened = false;
        hintTarget = null;
        hintTimer = 0;
        lastLitCount = session.trace.targetsLit;
        levelStartAt = performance.now();
        initVisualAngles();

        document.getElementById('winModal').hidden = true;
        document.getElementById('btnModeCampaign').classList.toggle('active', currentMode === 'campaign');
        document.getElementById('btnModeEndless').classList.toggle('active', currentMode === 'endless');
        document.getElementById('btnNextEndless').hidden = currentMode !== 'endless';
        syncHud();
    }

    function syncHud() {
        if (!session) return;
        const m = session.meta;
        document.getElementById('stageLabel').textContent = `${m.label} ${m.name}`;
        document.getElementById('movesVal').textContent = `${session.moves} / ${m.parMoves} 步`;
        document.getElementById('litVal').textContent = `${session.trace.targetsLit} / ${session.trace.targetsTotal}`;
        document.getElementById('hintText').textContent = m.hint;
        document.getElementById('btnUndo').disabled = session.undoStack.length === 0 || session.won;

        const pct = session.trace.targetsTotal > 0
            ? Math.round((session.trace.targetsLit / session.trace.targetsTotal) * 100)
            : 0;
        document.getElementById('litProgressFill').style.width = `${pct}%`;

        if (currentMode === 'campaign') {
            const ch = E.CHAPTERS.find((x) => x.id === m.chapter) || E.CHAPTERS[0];
            document.getElementById('chapterPill').textContent = `第 ${ch.id} 章 · ${ch.name}`;
            const bestM = save.bestMoves[m.id];
            document.getElementById('bestRecordLabel').textContent = bestM ? `最佳 ${bestM} 步` : '尚未通关';
        } else {
            document.getElementById('chapterPill').textContent = '无限星局 · 随机生成';
            document.getElementById('bestRecordLabel').textContent = `已破 ${save.endlessSolved} 局`;
        }
    }

    function handlePostMove(prevLit) {
        const g = cellGeom();
        const curLit = session.trace.targetsLit;
        if (curLit > prevLit) {
            audio.playCrystalChime(curLit - 1);
            for (const ts of session.trace.targetStates) {
                if (ts.lit) {
                    const p = cellCenter(ts.r, ts.c, g);
                    const col = (E.COLORS[ts.want] || E.COLORS[7]).hex;
                    spawnSparks(p.x, p.y, col, 10);
                }
            }
        }
        lastLitCount = curLit;
        syncHud();

        if (session.won && !winOpened) {
            winOpened = true;
            audio.playWin();
            for (const ts of session.trace.targetStates) {
                const p = cellCenter(ts.r, ts.c, g);
                const col = (E.COLORS[ts.want] || E.COLORS[7]).hex;
                spawnSparks(p.x, p.y, col, 22);
            }
            setTimeout(openWinModal, 360);
        }
    }

    function openWinModal() {
        const elapsed = Math.max(1, Math.round((performance.now() - levelStartAt) / 1000));
        const starsWrap = document.getElementById('winStars');
        const stars = starsWrap.querySelectorAll('.w-star');
        const nextBtn = document.getElementById('btnWinNext');

        document.getElementById('winMoves').textContent = `${session.moves} 步`;
        document.getElementById('winPar').textContent = `${session.meta.parMoves} 步`;
        document.getElementById('winTime').textContent = `${elapsed} 秒`;

        if (currentMode === 'campaign') {
            const earned = session.evaluateStars();
            const lvlId = session.meta.id;
            save.levelStars[lvlId] = Math.max(save.levelStars[lvlId] || 0, earned);
            if (!save.bestMoves[lvlId] || session.moves < save.bestMoves[lvlId]) {
                save.bestMoves[lvlId] = session.moves;
            }
            if (session.levelIndex + 1 >= save.unlockedLevel && save.unlockedLevel < E.LEVELS.length) {
                save.unlockedLevel = session.levelIndex + 2;
            }
            persistSave();

            starsWrap.style.display = 'flex';
            stars.forEach((s, i) => s.classList.toggle('lit', i < earned));
            document.getElementById('winEmoji').textContent = earned === 3 ? '👑' : '✨';
            document.getElementById('winTitle').textContent = `${session.meta.label} 共鸣完成！`;
            document.getElementById('winSub').textContent = earned === 3 ? '以最优步数完成全部星辰折射' : '挑战更少步数可拿满三星⭐';
            nextBtn.textContent = session.levelIndex + 1 < E.LEVELS.length ? '下一关 →' : '挑战无限星局';
        } else {
            save.endlessSolved += 1;
            persistSave();
            starsWrap.style.display = 'none';
            document.getElementById('winEmoji').textContent = '🌌';
            document.getElementById('winTitle').textContent = '星渊解谜达成！';
            document.getElementById('winSub').textContent = `累计破解 ${save.endlessSolved} 道随机星图`;
            nextBtn.textContent = '下一道星局 →';
        }
        syncHud();
        document.getElementById('winModal').hidden = false;
    }

    function openLevelsModal() {
        const container = document.getElementById('chaptersContainer');
        document.getElementById('levelsSummaryText').textContent = `已集齐 ${E.totalCampaignStars(save)} / ${E.LEVELS.length * 3} ⭐`;
        container.innerHTML = '';

        E.CHAPTERS.forEach((ch) => {
            const block = document.createElement('div');
            block.className = 'chapter-block';
            block.innerHTML = `<h3 style="color:${ch.accent}">● 第 ${ch.id} 章 · ${ch.name}</h3><p>${ch.subtitle}</p>`;
            const grid = document.createElement('div');
            grid.className = 'levels-grid';
            E.LEVELS.filter((l) => l.chapter === ch.id).forEach((lvl) => {
                const idx = E.LEVELS.findIndex((x) => x.id === lvl.id);
                const locked = lvl.id > save.unlockedLevel;
                const stars = save.levelStars[lvl.id] || 0;
                const btn = document.createElement('button');
                btn.className = 'lvl-btn' + (idx === save.currentLevelIndex && currentMode === 'campaign' ? ' is-current' : '');
                btn.disabled = locked;
                btn.innerHTML = `
                    <span class="lvl-num">${locked ? '🔒' : lvl.label}</span>
                    <span class="lvl-name">${lvl.name}</span>
                    <span class="lvl-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
                `;
                btn.addEventListener('click', () => {
                    document.getElementById('levelsModal').hidden = true;
                    startSession('campaign', idx);
                });
                grid.appendChild(btn);
            });
            block.appendChild(grid);
            container.appendChild(block);
        });
        document.getElementById('levelsModal').hidden = false;
    }

    /* ---------------- Canvas Optical Renderer ---------------- */

    function roundRectPath(c, x, y, w, h, r) {
        c.beginPath();
        if (typeof c.roundRect === 'function') c.roundRect(x, y, w, h, r);
        else c.rect(x, y, w, h);
    }

    function drawFrame(nowMs, dt) {
        const time = nowMs * 0.001;
        ctx.save();
        ctx.scale(DPR, DPR);

        // Deep cosmic observatory plate
        const bg = ctx.createRadialGradient(BOARD_PX * 0.5, BOARD_PX * 0.42, 40, BOARD_PX * 0.5, BOARD_PX * 0.5, BOARD_PX * 0.72);
        bg.addColorStop(0, '#0f172a');
        bg.addColorStop(1, '#040711');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, BOARD_PX, BOARD_PX);

        // Subtle twinkling starfield
        for (const st of starsBg) {
            const al = 0.16 + 0.22 * (0.5 + 0.5 * Math.sin(time * 1.4 + st.phase));
            ctx.fillStyle = `rgba(226, 232, 240, ${al})`;
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
            ctx.fill();
        }

        if (!session) {
            ctx.restore();
            return;
        }

        const g = cellGeom();
        const pad = 4;

        // 1. Glass Grid Cells
        for (let r = 0; r < g.rows; r++) {
            for (let c = 0; c < g.cols; c++) {
                const tile = session.grid[r][c];
                const x = g.offX + c * g.cell + pad;
                const y = g.offY + r * g.cell + pad;
                const s = g.cell - pad * 2;
                const isHover = hoverCell && hoverCell.r === r && hoverCell.c === c && E.isRotatable(tile);
                const isHinted = hintTimer > 0 && hintTarget && hintTarget.r === r && hintTarget.c === c;

                roundRectPath(ctx, x, y, s, s, 10);
                if (tile.type === 'block') {
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
                } else {
                    ctx.fillStyle = isHover ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.45)';
                    ctx.fill();
                    ctx.strokeStyle = isHinted
                        ? '#fbbf24'
                        : (isHover ? 'rgba(56, 189, 248, 0.65)' : (E.isRotatable(tile) ? 'rgba(148, 163, 184, 0.28)' : 'rgba(148, 163, 184, 0.10)'));
                }
                ctx.lineWidth = isHinted ? 2.4 : 1.2;
                ctx.stroke();

                if (E.isRotatable(tile)) {
                    const ctr = cellCenter(r, c, g);
                    ctx.save();
                    ctx.setLineDash([3, 3]);
                    ctx.strokeStyle = isHinted ? 'rgba(251, 191, 36, 0.72)' : 'rgba(148, 163, 184, 0.22)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(ctr.x, ctr.y, s * 0.36, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }

        // 2. Additive Multi-Pass Neon Photon Beams
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const seg of session.trace.segments) {
            const p1 = cellCenter(seg.r1, seg.c1, g);
            const p2 = cellCenter(seg.r2, seg.c2, g);
            const col = E.COLORS[seg.color] || E.COLORS[7];

            // Outer ambient glow
            ctx.strokeStyle = col.glow;
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Inner saturated core
            ctx.strokeStyle = col.hex;
            ctx.lineWidth = 5.2;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // White-hot filament
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Traveling photon beads along beam
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (len > 10) {
                const count = Math.max(1, Math.floor(len / 46));
                for (let k = 0; k < count; k++) {
                    const t = ((time * 1.45 + k / count) % 1);
                    const bx = p1.x + (p2.x - p1.x) * t;
                    const by = p1.y + (p2.y - p1.y) * t;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();

        // 3. Draw Optical Components on Top
        if (hintTimer > 0) hintTimer = Math.max(0, hintTimer - dt);

        for (let r = 0; r < g.rows; r++) {
            for (let c = 0; c < g.cols; c++) {
                const tile = session.grid[r][c];
                if (tile.type === 'empty') continue;
                const ctr = cellCenter(r, c, g);
                const rad = g.cell * 0.34;

                if (tile.type === 'block') {
                    roundRectPath(ctx, ctr.x - rad * 0.9, ctr.y - rad * 0.9, rad * 1.8, rad * 1.8, 7);
                    const bgB = ctx.createLinearGradient(ctr.x - rad, ctr.y - rad, ctr.x + rad, ctr.y + rad);
                    bgB.addColorStop(0, '#334155');
                    bgB.addColorStop(1, '#0f172a');
                    ctx.fillStyle = bgB;
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    continue;
                }

                if (tile.type === 'emitter') {
                    const col = E.COLORS[tile.color] || E.COLORS[7];
                    const ang = (tile.dir - 1) * (Math.PI * 0.5);
                    ctx.save();
                    ctx.translate(ctr.x, ctr.y);
                    ctx.rotate(ang);
                    ctx.fillStyle = '#1e293b';
                    ctx.strokeStyle = col.hex;
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.arc(0, 0, rad * 0.85, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Nozzle pointer right (+X after rotation)
                    ctx.fillStyle = col.hex;
                    ctx.beginPath();
                    ctx.moveTo(rad * 0.2, -rad * 0.36);
                    ctx.lineTo(rad * 0.96, 0);
                    ctx.lineTo(rad * 0.2, rad * 0.36);
                    ctx.closePath();
                    ctx.fill();

                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, rad * 0.32, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    continue;
                }

                if (tile.type === 'mirror' || tile.type === 'splitter') {
                    const key = cellKey(r, c);
                    const targetAng = tile.rot === 0 ? -Math.PI * 0.25 : Math.PI * 0.25;
                    let curAng = visualRotMap.has(key) ? visualRotMap.get(key) : targetAng;
                    curAng += (targetAng - curAng) * Math.min(1, dt * 18);
                    visualRotMap.set(key, curAng);

                    ctx.save();
                    ctx.translate(ctr.x, ctr.y);
                    ctx.rotate(curAng);

                    if (tile.type === 'mirror') {
                        roundRectPath(ctx, -rad * 1.15, -4.5, rad * 2.3, 9, 4.5);
                        const mg = ctx.createLinearGradient(0, -5, 0, 5);
                        mg.addColorStop(0, '#f8fafc');
                        mg.addColorStop(0.5, '#94a3b8');
                        mg.addColorStop(1, '#334155');
                        ctx.fillStyle = mg;
                        ctx.fill();
                        ctx.strokeStyle = '#38bdf8';
                        ctx.lineWidth = 1.4;
                        ctx.stroke();
                    } else {
                        // Half-silvered Splitter crystal blade
                        roundRectPath(ctx, -rad * 1.15, -4.5, rad * 2.3, 9, 4.5);
                        ctx.fillStyle = 'rgba(56, 189, 248, 0.34)';
                        ctx.fill();
                        ctx.strokeStyle = '#7dd3fc';
                        ctx.lineWidth = 1.8;
                        ctx.stroke();

                        ctx.fillStyle = '#e0f2fe';
                        ctx.beginPath();
                        ctx.moveTo(0, -7);
                        ctx.lineTo(7, 0);
                        ctx.lineTo(0, 7);
                        ctx.lineTo(-7, 0);
                        ctx.closePath();
                        ctx.fill();
                    }
                    ctx.restore();
                    continue;
                }

                if (tile.type === 'filter') {
                    const col = E.COLORS[tile.color] || E.COLORS[1];
                    ctx.save();
                    ctx.translate(ctr.x, ctr.y);
                    ctx.fillStyle = col.glow;
                    ctx.strokeStyle = col.hex;
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.moveTo(0, -rad * 0.95);
                    ctx.lineTo(rad * 0.95, 0);
                    ctx.lineTo(0, rad * 0.95);
                    ctx.lineTo(-rad * 0.95, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#fff';
                    ctx.font = '800 12px "Noto Sans SC", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(col.short, 0, 1);
                    ctx.restore();
                    continue;
                }

                if (tile.type === 'portal') {
                    ctx.save();
                    ctx.translate(ctr.x, ctr.y);
                    ctx.rotate(time * 2.2);
                    const ringGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, rad);
                    ringGrad.addColorStop(0, '#f0abfc');
                    ringGrad.addColorStop(0.55, 'rgba(192, 132, 252, 0.55)');
                    ringGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
                    ctx.fillStyle = ringGrad;
                    ctx.beginPath();
                    ctx.arc(0, 0, rad, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.strokeStyle = '#e879f9';
                    ctx.lineWidth = 2.4;
                    ctx.setLineDash([7, 5]);
                    ctx.beginPath();
                    ctx.arc(0, 0, rad * 0.78, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                    continue;
                }

                if (tile.type === 'target') {
                    const ts = session.trace.targetStates.find((x) => x.r === r && x.c === c);
                    const col = E.COLORS[tile.color] || E.COLORS[7];
                    const isLit = ts && ts.lit;
                    const isMismatch = ts && ts.mismatch;

                    ctx.save();
                    ctx.translate(ctr.x, ctr.y);
                    if (isLit) {
                        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, rad * 1.35);
                        glow.addColorStop(0, col.hex);
                        glow.addColorStop(0.5, col.glow);
                        glow.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = glow;
                        ctx.beginPath();
                        ctx.arc(0, 0, rad * 1.35, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    ctx.rotate(isLit ? time * 0.9 : 0);
                    ctx.beginPath();
                    const sides = 6;
                    for (let i = 0; i < sides; i++) {
                        const a = (i * Math.PI * 2) / sides;
                        const px = Math.cos(a) * rad * 0.86;
                        const py = Math.sin(a) * rad * 0.86;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fillStyle = isLit ? col.hex : 'rgba(15, 23, 42, 0.82)';
                    ctx.fill();
                    ctx.lineWidth = isLit ? 2.8 : 2.2;
                    ctx.strokeStyle = isMismatch ? '#fbbf24' : col.hex;
                    ctx.stroke();

                    // Inner facet highlight
                    ctx.rotate(isLit ? -time * 0.9 : 0);
                    ctx.fillStyle = isLit ? '#ffffff' : col.hex;
                    ctx.font = '800 11px "Noto Sans SC", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(isLit ? '★' : (isMismatch ? '!' : col.short), 0, 1);
                    ctx.restore();
                }
            }
        }

        // 4. Photon Sparks
        for (let i = sparks.length - 1; i >= 0; i--) {
            const sp = sparks[i];
            sp.life -= dt;
            if (sp.life <= 0) { sparks.splice(i, 1); continue; }
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            ctx.save();
            ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
            ctx.fillStyle = sp.color;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    let lastTs = 0;
    function loop(ts) {
        if (!lastTs) lastTs = ts;
        const dt = Math.min(0.04, Math.max(0.001, (ts - lastTs) / 1000));
        lastTs = ts;
        drawFrame(ts, dt);
        requestAnimationFrame(loop);
    }

    /* ---------------- Input & UI Wiring ---------------- */

    function pointerCell(ev) {
        if (!session) return null;
        const rect = canvas.getBoundingClientRect();
        const x = ((ev.clientX - rect.left) / rect.width) * BOARD_PX;
        const y = ((ev.clientY - rect.top) / rect.height) * BOARD_PX;
        const g = cellGeom();
        const c = Math.floor((x - g.offX) / g.cell);
        const r = Math.floor((y - g.offY) / g.cell);
        if (r < 0 || r >= g.rows || c < 0 || c >= g.cols) return null;
        return { r, c };
    }

    canvas.addEventListener('pointermove', (ev) => {
        hoverCell = pointerCell(ev);
    });
    canvas.addEventListener('pointerleave', () => { hoverCell = null; });

    canvas.addEventListener('pointerdown', (ev) => {
        if (!session || session.won) return;
        const cell = pointerCell(ev);
        if (!cell) return;
        const prevLit = session.trace.targetsLit;
        const res = session.rotateTile(cell.r, cell.c);
        if (res) {
            hintTarget = null;
            hintTimer = 0;
            audio.playRotate();
            const g = cellGeom();
            const p = cellCenter(cell.r, cell.c, g);
            spawnSparks(p.x, p.y, '#7dd3fc', 8);
            handlePostMove(prevLit);
        }
    });

    document.getElementById('btnUndo').addEventListener('click', () => {
        if (!session || session.won) return;
        const res = session.undo();
        if (res) {
            audio.playUndo();
            lastLitCount = session.trace.targetsLit;
            syncHud();
        }
    });

    document.getElementById('btnReset').addEventListener('click', () => {
        if (!session) return;
        session.reset();
        winOpened = false;
        hintTarget = null;
        lastLitCount = session.trace.targetsLit;
        initVisualAngles();
        audio.playUndo();
        syncHud();
    });

    document.getElementById('btnHint').addEventListener('click', () => {
        if (!session || session.won) return;
        const h = session.getHint();
        if (h) {
            hintTarget = { r: h.r, c: h.c };
            hintTimer = 2.6;
            audio.playHint();
        }
    });

    document.getElementById('btnNextEndless').addEventListener('click', () => startSession('endless'));
    document.getElementById('btnModeCampaign').addEventListener('click', () => startSession('campaign'));
    document.getElementById('btnModeEndless').addEventListener('click', () => startSession('endless'));
    document.getElementById('btnLevels').addEventListener('click', openLevelsModal);
    document.getElementById('btnCloseLevels').addEventListener('click', () => {
        document.getElementById('levelsModal').hidden = true;
    });

    document.getElementById('btnWinReplay').addEventListener('click', () => {
        document.getElementById('winModal').hidden = true;
        if (currentMode === 'campaign') {
            startSession('campaign', session.levelIndex);
        } else {
            session.reset();
            winOpened = false;
            syncHud();
        }
    });

    document.getElementById('btnWinNext').addEventListener('click', () => {
        document.getElementById('winModal').hidden = true;
        if (currentMode === 'campaign') {
            if (session.levelIndex + 1 < E.LEVELS.length) {
                startSession('campaign', session.levelIndex + 1);
            } else {
                startSession('endless');
            }
        } else {
            startSession('endless');
        }
    });

    const btnMute = document.getElementById('btnMute');
    function refreshMuteBtn() {
        btnMute.textContent = save.muted ? '🔇' : '🔊';
    }
    btnMute.addEventListener('click', () => {
        save.muted = !save.muted;
        audio.setMuted(save.muted);
        persistSave();
        refreshMuteBtn();
    });
    refreshMuteBtn();

    const btnBack = document.getElementById('btnBackArcade');
    if (btnBack) {
        btnBack.href = window.location.pathname.includes('/games/arcade') ? '/games/arcade/' : '../';
    }

    window.addEventListener('keydown', (ev) => {
        if (!session) return;
        if (ev.key === 'z' || ev.key === 'Z') {
            document.getElementById('btnUndo').click();
        } else if (ev.key === 'h' || ev.key === 'H') {
            document.getElementById('btnHint').click();
        } else if (ev.key === 'r' || ev.key === 'R') {
            document.getElementById('btnReset').click();
        } else if (ev.key === 'Escape') {
            document.getElementById('levelsModal').hidden = true;
        }
    });

    startSession('campaign', save.currentLevelIndex);
    requestAnimationFrame(loop);
})();
