(function () {
    'use strict';

    const E = window.CandyRopeEngine;
    const AudioSys = window.CandyRopeAudio;
    const { ARENA, CHAPTERS, LEVELS } = E;

    const canvas = document.getElementById('ropeCanvas');
    const ctx = canvas.getContext('2d');

    const el = {
        chapterPill: document.getElementById('chapterPill'),
        stageTitle: document.getElementById('stageTitle'),
        totalStarsVal: document.getElementById('totalStarsVal'),
        btnLevels: document.getElementById('btnLevels'),
        btnRetry: document.getElementById('btnRetry'),
        btnMute: document.getElementById('btnMute'),
        hintToast: document.getElementById('hintToast'),
        levelsModal: document.getElementById('levelsModal'),
        chaptersWrap: document.getElementById('chaptersWrap'),
        btnCloseLevels: document.getElementById('btnCloseLevels'),
        resultModal: document.getElementById('resultModal'),
        resBadge: document.getElementById('resBadge'),
        resTitle: document.getElementById('resTitle'),
        resStars: document.getElementById('resStars'),
        resDesc: document.getElementById('resDesc'),
        btnResPrimary: document.getElementById('btnResPrimary'),
        btnResRetry: document.getElementById('btnResRetry')
    };

    const audio = new AudioSys();
    let save = loadSave();
    audio.setMuted(save.muted);

    let session = null;
    let clock = 0;
    let isSlicing = false;
    let lastPtr = null;

    const sliceTrail = [];
    const particles = [];
    const windPuffs = [];

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
        } catch {
            // ignore storage errors
        }
    }

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = ARENA.width * dpr;
        canvas.height = ARENA.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function startLevel(idx) {
        const cleanIdx = Math.max(0, Math.min(LEVELS.length - 1, idx));
        save.currentLevelIndex = cleanIdx;
        persistSave();
        session = E.createSession(cleanIdx);
        sliceTrail.length = 0;
        particles.length = 0;
        windPuffs.length = 0;
        el.levelsModal.classList.add('hidden');
        el.resultModal.classList.add('hidden');
        syncUI();
    }

    function syncUI() {
        const lvl = session.level;
        const ch = CHAPTERS.find((c) => c.id === lvl.chapter) || CHAPTERS[0];
        el.chapterPill.textContent = `盒子 ${ch.id} · ${ch.name}`;
        el.chapterPill.style.color = ch.accent;
        el.stageTitle.textContent = `${lvl.label} · ${lvl.name}`;
        el.totalStarsVal.textContent = `${E.totalStars(save)} / ${LEVELS.length * 3}`;
        el.hintToast.textContent = lvl.hint;
        el.btnMute.textContent = save.muted ? '🔇' : '🔊';

        for (let i = 0; i < 3; i++) {
            const starEl = document.getElementById(`hs${i}`);
            if (starEl) {
                const on = i < session.starsCollected;
                starEl.textContent = on ? '★' : '☆';
                starEl.classList.toggle('earned', on);
            }
        }
    }

    function spawnParticles(x, y, color, count = 12, spd = 140) {
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const s = spd * (0.4 + Math.random() * 0.8);
            particles.push({
                x, y,
                vx: Math.cos(ang) * s,
                vy: Math.sin(ang) * s - 35,
                r: 2.2 + Math.random() * 2.5,
                color,
                life: 0.45 + Math.random() * 0.25,
                maxLife: 0.7
            });
        }
    }

    function handleEvents(events) {
        for (const ev of events) {
            if (ev.type === 'cut') {
                audio.playCut();
                spawnParticles(ev.x, ev.y, '#fde68a', 7, 90);
            } else if (ev.type === 'pop') {
                audio.playPop();
                spawnParticles(ev.x, ev.y, '#bae6fd', 12, 130);
            } else if (ev.type === 'capture') {
                audio.playPop();
            } else if (ev.type === 'blow') {
                audio.playBlow();
                for (let i = 0; i < 6; i++) {
                    windPuffs.push({
                        x: ev.x + ev.dx * 22,
                        y: ev.y + ev.dy * 22 + (Math.random() - 0.5) * 18,
                        vx: ev.dx * (260 + i * 24),
                        vy: ev.dy * (260 + i * 24),
                        life: 0.35
                    });
                }
            } else if (ev.type === 'star') {
                audio.playStar(ev.count);
                spawnParticles(ev.x, ev.y, '#fde047', 16, 175);
                syncUI();
            } else if (ev.type === 'portal') {
                audio.playPop();
                spawnParticles(ev.fromX, ev.fromY, '#c084fc', 10, 120);
                spawnParticles(ev.x, ev.y, '#38bdf8', 12, 140);
            } else if (ev.type === 'pad') {
                audio.playCut();
                spawnParticles(ev.x, ev.y, '#4ade80', 10, 120);
            } else if (ev.type === 'win') {
                onWin();
            } else if (ev.type === 'lose') {
                onLose();
            }
        }
    }

    function onWin() {
        audio.playChompWin();
        spawnParticles(session.omnom.x, session.omnom.y - 12, '#4ade80', 22, 180);
        const stars = Math.max(0, Math.min(3, session.starsCollected));
        const lvlId = session.level.id;
        save.levelStars[lvlId] = Math.max(save.levelStars[lvlId] || 0, stars);
        if (save.unlockedLevel < lvlId + 1 && lvlId < LEVELS.length) {
            save.unlockedLevel = lvlId + 1;
        }
        persistSave();
        syncUI();

        el.resBadge.textContent = 'DELICIOUS TREAT!';
        el.resBadge.classList.remove('loss');
        el.resTitle.textContent = `${session.level.label} 过关成功！`;
        el.resStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        el.resDesc.textContent = stars === 3
            ? '集齐全部三颗金星，完美甜品喂食！'
            : '萌怪吃到了糖果！尝试调整时机收齐 3 颗星星吧。';

        const hasNext = session.levelIndex < LEVELS.length - 1;
        el.btnResPrimary.textContent = hasNext ? '下一关 →' : '全关卡通关 · 选关';
        el.btnResPrimary.onclick = () => {
            if (hasNext) startLevel(session.levelIndex + 1);
            else {
                el.resultModal.classList.add('hidden');
                openLevelsModal();
            }
        };
        el.resultModal.classList.remove('hidden');
    }

    function onLose() {
        audio.playFail();
        el.resBadge.textContent = 'CANDY LOST';
        el.resBadge.classList.add('loss');
        el.resTitle.textContent = '糖果没有送到嘴里…';
        el.resStars.textContent = '🍬💨';
        el.resDesc.textContent = session.lossReason || '再来一次，注意把握剪绳和点破气泡的时机！';
        el.btnResPrimary.textContent = '再来一局 ↻';
        el.btnResPrimary.onclick = () => startLevel(session.levelIndex);
        el.resultModal.classList.remove('hidden');
    }

    function openLevelsModal() {
        el.chaptersWrap.innerHTML = '';
        for (const ch of CHAPTERS) {
            const block = document.createElement('div');
            block.className = 'chapter-block';
            block.innerHTML = `<div class="chapter-head"><h3 style="color:${ch.accent}">盒子 ${ch.id} · ${ch.name}</h3><span>${ch.subtitle}</span></div>`;
            const grid = document.createElement('div');
            grid.className = 'lvl-grid';
            LEVELS.filter((l) => l.chapter === ch.id).forEach((lvl) => {
                const idx = LEVELS.indexOf(lvl);
                const unlocked = lvl.id <= save.unlockedLevel;
                const st = save.levelStars[lvl.id] || 0;
                const tile = document.createElement('button');
                tile.type = 'button';
                tile.className = 'lvl-tile' + (idx === session.levelIndex ? ' current' : '');
                tile.disabled = !unlocked;
                tile.innerHTML = `
                    <div class="lvl-top">
                        <span>${lvl.label}</span>
                        <span class="lvl-stars">${unlocked ? ('★'.repeat(st) + '☆'.repeat(3 - st)) : '🔒'}</span>
                    </div>
                    <strong>${lvl.name}</strong>
                `;
                tile.addEventListener('click', () => startLevel(idx));
                grid.appendChild(tile);
            });
            block.appendChild(grid);
            el.chaptersWrap.appendChild(block);
        }
        el.levelsModal.classList.remove('hidden');
    }

    function toArena(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((clientX - rect.left) / rect.width) * ARENA.width,
            y: ((clientY - rect.top) / rect.height) * ARENA.height
        };
    }

    canvas.addEventListener('pointerdown', (e) => {
        if (!session || session.state !== 'playing') return;
        const pt = toArena(e.clientX, e.clientY);

        // Check tap-interactive gadgets first: Bubble or Air Cushion!
        const popEv = session.popBubble(pt);
        if (popEv.length > 0) {
            handleEvents(popEv);
            return;
        }
        const blowEv = session.blowCushion(pt);
        if (blowEv.length > 0) {
            handleEvents(blowEv);
            return;
        }

        isSlicing = true;
        lastPtr = pt;
        sliceTrail.push({ x: pt.x, y: pt.y, life: 0.16 });
        try { canvas.setPointerCapture(e.pointerId); } catch {}
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!isSlicing || !session || session.state !== 'playing') return;
        const pt = toArena(e.clientX, e.clientY);
        if (lastPtr) {
            const ev = session.sliceLine(lastPtr.x, lastPtr.y, pt.x, pt.y);
            if (ev.length > 0) handleEvents(ev);
        }
        lastPtr = pt;
        sliceTrail.push({ x: pt.x, y: pt.y, life: 0.16 });
    });

    const endSlice = () => {
        isSlicing = false;
        lastPtr = null;
    };
    canvas.addEventListener('pointerup', endSlice);
    canvas.addEventListener('pointercancel', endSlice);

    el.btnRetry.addEventListener('click', () => startLevel(session.levelIndex));
    el.btnResRetry.addEventListener('click', () => startLevel(session.levelIndex));
    el.btnLevels.addEventListener('click', openLevelsModal);
    el.btnCloseLevels.addEventListener('click', () => el.levelsModal.classList.add('hidden'));
    el.btnMute.addEventListener('click', () => {
        save.muted = !save.muted;
        audio.setMuted(save.muted);
        persistSave();
        syncUI();
    });

    window.addEventListener('keydown', (e) => {
        if ((e.key === 'r' || e.key === 'R') && session) {
            startLevel(session.levelIndex);
        }
    });

    // Artwork Drawing
    function drawStarPoly(cx, cy, outerR, innerR, pts, rot) {
        ctx.beginPath();
        for (let i = 0; i < pts * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const a = rot + (i * Math.PI) / pts;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    function drawBoxBackground() {
        const g = ctx.createLinearGradient(0, 0, 0, ARENA.height);
        g.addColorStop(0, '#f3dec0');
        g.addColorStop(0.55, '#e2c496');
        g.addColorStop(1, '#c59e6b');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, ARENA.width, ARENA.height);

        // Soft cardboard crease lines & stitched inner frame
        ctx.strokeStyle = 'rgba(120, 82, 46, 0.12)';
        ctx.lineWidth = 2;
        ctx.strokeRect(18, 18, ARENA.width - 36, ARENA.height - 36);
        ctx.setLineDash([7, 7]);
        ctx.strokeStyle = 'rgba(120, 82, 46, 0.25)';
        ctx.strokeRect(12, 12, ARENA.width - 24, ARENA.height - 24);
        ctx.setLineDash([]);
    }

    function drawOmnom() {
        const o = session.omnom;
        ctx.save();
        ctx.translate(o.x, o.y);

        // Sitting shadow
        ctx.fillStyle = 'rgba(60, 35, 16, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, o.r + 6, o.r * 1.15, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cute green monster body
        const bg = ctx.createRadialGradient(-6, -8, 4, 0, 0, o.r + 6);
        bg.addColorStop(0, '#86efac');
        bg.addColorStop(0.6, '#22c55e');
        bg.addColorStop(1, '#15803d');
        ctx.fillStyle = bg;
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.roundRect(-o.r, -o.r * 0.9, o.r * 2, o.r * 1.85, 16);
        ctx.fill();
        ctx.stroke();

        // Antenna tuft
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -o.r * 0.9);
        ctx.quadraticCurveTo(6, -o.r - 12, 11, -o.r - 7);
        ctx.stroke();

        // Big expressive eyes
        [-10, 10].forEach((ex) => {
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#14532d';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(ex, -12, 7.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            const ang = Math.atan2(session.candy.y - o.y, session.candy.x - (o.x + ex));
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(ex + Math.cos(ang) * 2.4, -12 + Math.sin(ang) * 2.4, 3.3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Wide mouth reacts excitedly when candy approaches!
        const openH = 4 + o.mouthOpen * 16;
        ctx.fillStyle = '#450a0a';
        ctx.beginPath();
        ctx.ellipse(0, 8, 17, openH, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cute little white teeth
        ctx.fillStyle = '#fff';
        for (let tx = -10; tx <= 10; tx += 7) {
            ctx.beginPath();
            ctx.moveTo(tx - 2.5, 8 - openH + 1);
            ctx.lineTo(tx + 2.5, 8 - openH + 1);
            ctx.lineTo(tx, 8 - openH + 6);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    function drawGadgets() {
        // Spikes
        for (const sp of session.spikes) {
            ctx.save();
            ctx.fillStyle = '#475569';
            ctx.fillRect(sp.x, sp.y + 8, sp.w, sp.h - 8);
            ctx.fillStyle = '#94a3b8';
            for (let sx = sp.x; sx < sp.x + sp.w - 8; sx += 12) {
                ctx.beginPath();
                ctx.moveTo(sx, sp.y + 10);
                ctx.lineTo(sx + 6, sp.y - 3);
                ctx.lineTo(sx + 12, sp.y + 10);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        // Bouncy Pads
        for (const pad of session.pads) {
            ctx.save();
            ctx.translate(pad.x, pad.y);
            ctx.rotate(pad.angle);
            const bounce = pad.bounceTimer > 0 ? 1.12 : 1;
            ctx.scale(bounce, 1 / bounce);
            ctx.fillStyle = '#0ea5e9';
            ctx.strokeStyle = '#bae6fd';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(-pad.w * 0.5, -pad.h * 0.5, pad.w, pad.h, 8);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Magic Top Hat Portals
        for (const p of session.portals) {
            ctx.save();
            ctx.translate(p.x, p.y);
            const g = ctx.createRadialGradient(0, 0, 4, 0, 0, p.r + 6);
            g.addColorStop(0, '#c084fc');
            g.addColorStop(0.65, '#4c1d95');
            g.addColorStop(1, 'rgba(139, 92, 246, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, p.r + 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2.2;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, p.r - 2, clock * 2.5, clock * 2.5 + Math.PI * 1.8);
            ctx.stroke();
            ctx.restore();
        }

        // Auto-grab anchor rings
        for (const ar of session.autoRopes) {
            if (ar.triggered) continue;
            ctx.save();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = 'rgba(234, 88, 12, 0.45)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(ar.ax, ar.ay, ar.triggerR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.arc(ar.ax, ar.ay, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Squeezable Air Cushions
        for (const c of session.cushions) {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(Math.atan2(c.dy, c.dx));
            const squeeze = c.puffTimer > 0 ? 0.84 : 1;
            ctx.scale(squeeze, 1 / squeeze);
            ctx.fillStyle = '#0284c7';
            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(-4, 0, 22, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Nozzle
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.roundRect(14, -6, 12, 12, 3);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawStarsAndRopes() {
        for (const st of session.stars) {
            if (st.collected) continue;
            ctx.save();
            ctx.translate(st.x, st.y + Math.sin(clock * 3.5 + st.id) * 2.5);
            const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
            g.addColorStop(0, 'rgba(253, 224, 71, 0.72)');
            g.addColorStop(1, 'rgba(253, 224, 71, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, 24, 0, Math.PI * 2);
            ctx.fill();

            drawStarPoly(0, 0, st.r, st.r * 0.44, 5, -Math.PI / 2 + clock * 0.8);
            ctx.fillStyle = '#fde047';
            ctx.fill();
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Ropes + anchor pins
        for (const r of session.ropes) {
            ctx.save();
            ctx.globalAlpha = r.cut ? r.cutFade : 1;
            if (ctx.globalAlpha > 0.02 && r.points.length >= 2) {
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 4.2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(r.points[0].x, r.points[0].y);
                for (let i = 1; i < r.points.length; i++) {
                    ctx.lineTo(r.points[i].x, r.points[i].y);
                }
                ctx.stroke();

                ctx.strokeStyle = '#d97706';
                ctx.lineWidth = 1.6;
                ctx.stroke();
            }
            ctx.fillStyle = '#475569';
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(r.ax, r.ay, 7.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }

    function drawCandyAndBubbles() {
        const c = session.candy;
        ctx.save();
        ctx.translate(c.x, c.y);

        // Swirled Red-White Hard Candy
        const cg = ctx.createRadialGradient(-5, -5, 2, 0, 0, c.r + 2);
        cg.addColorStop(0, '#fff1f2');
        cg.addColorStop(0.45, '#fb7185');
        cg.addColorStop(1, '#e11d48');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(0, 0, c.r, 0, Math.PI * 2);
        ctx.fill();

        // Swirling candy stripes
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, c.r * 0.62, 0.3, Math.PI * 0.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, c.r * 0.62, Math.PI + 0.3, Math.PI * 1.9);
        ctx.stroke();

        ctx.strokeStyle = '#9f1239';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, c.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Floating Soap Bubbles (drawn over candy!)
        for (const b of session.bubbles) {
            if (b.popped) continue;
            ctx.save();
            const g = ctx.createRadialGradient(b.x - 8, b.y - 8, 3, b.x, b.y, b.r);
            g.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
            g.addColorStop(0.7, 'rgba(125, 211, 252, 0.25)');
            g.addColorStop(1, 'rgba(56, 189, 248, 0.55)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(224, 242, 254, 0.88)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
    }

    function updateAndDrawFx(dt) {
        // Slice ribbon
        for (let i = sliceTrail.length - 1; i >= 0; i--) {
            sliceTrail[i].life -= dt;
            if (sliceTrail[i].life <= 0) sliceTrail.splice(i, 1);
        }
        if (sliceTrail.length > 1) {
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sliceTrail[0].x, sliceTrail[0].y);
            for (let i = 1; i < sliceTrail.length; i++) ctx.lineTo(sliceTrail[i].x, sliceTrail[i].y);
            ctx.stroke();
            ctx.restore();
        }

        for (let i = windPuffs.length - 1; i >= 0; i--) {
            const w = windPuffs[i];
            w.life -= dt;
            if (w.life <= 0) { windPuffs.splice(i, 1); continue; }
            w.x += w.vx * dt;
            w.y += w.vy * dt;
            ctx.save();
            ctx.globalAlpha = w.life * 2.8;
            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(w.x, w.y, 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            p.vy += 280 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    let lastTs = performance.now();
    function frame(ts) {
        const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
        lastTs = ts;
        clock += dt;

        if (session && session.state === 'playing') {
            const events = session.step(dt);
            if (events.length > 0) handleEvents(events);
        }

        drawBoxBackground();
        if (session) {
            drawGadgets();
            drawStarsAndRopes();
            drawOmnom();
            drawCandyAndBubbles();
        }
        updateAndDrawFx(dt);

        requestAnimationFrame(frame);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    startLevel(save.currentLevelIndex || 0);
    requestAnimationFrame(frame);
})();

