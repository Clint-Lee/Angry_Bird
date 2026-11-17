(function () {
    'use strict';

    const E = window.RicochetLabEngine;
    const AudioSys = window.RicochetLabAudio;
    const { ARENA, CHAPTERS, LEVELS, PADDLE_ANGLES, SPRING_NORMALS } = E;

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const el = {
        chapterPill: document.getElementById('chapterPill'),
        stageTitle: document.getElementById('stageTitle'),
        totalStarsLabel: document.getElementById('totalStarsLabel'),
        btnLevels: document.getElementById('btnLevels'),
        btnResetAll: document.getElementById('btnResetAll'),
        btnMute: document.getElementById('btnMute'),
        hudShots: document.getElementById('hudShots'),
        hudStars: document.getElementById('hudStars'),
        hudBounces: document.getElementById('hudBounces'),
        canvasTip: document.getElementById('canvasTip'),
        hintText: document.getElementById('hintText'),
        btnToolPaddle: document.getElementById('btnToolPaddle'),
        btnToolSpring: document.getElementById('btnToolSpring'),
        countPaddle: document.getElementById('countPaddle'),
        countSpring: document.getElementById('countSpring'),
        angleReadout: document.getElementById('angleReadout'),
        angleSlider: document.getElementById('angleSlider'),
        btnAngleMinus: document.getElementById('btnAngleMinus'),
        btnAnglePlus: document.getElementById('btnAnglePlus'),
        btnLaunch: document.getElementById('btnLaunch'),
        btnKeepRetry: document.getElementById('btnKeepRetry'),
        btnClearGadgets: document.getElementById('btnClearGadgets'),
        levelsModal: document.getElementById('levelsModal'),
        chaptersList: document.getElementById('chaptersList'),
        btnCloseLevels: document.getElementById('btnCloseLevels'),
        resultModal: document.getElementById('resultModal'),
        resultBadge: document.getElementById('resultBadge'),
        resultTitle: document.getElementById('resultTitle'),
        resultStars: document.getElementById('resultStars'),
        resultDesc: document.getElementById('resultDesc'),
        resStarsVal: document.getElementById('resStarsVal'),
        resBouncesVal: document.getElementById('resBouncesVal'),
        resSpareVal: document.getElementById('resSpareVal'),
        btnResultPrimary: document.getElementById('btnResultPrimary'),
        btnResultRetry: document.getElementById('btnResultRetry'),
        btnResultLevels: document.getElementById('btnResultLevels')
    };

    const audio = new AudioSys();
    let save = loadSave();
    audio.setMuted(save.muted);

    let session = null;
    let selectedTool = 'paddle';
    let hoveredSlotId = null;
    let draggingAim = false;
    let clock = 0;
    let shakePower = 0;

    const particles = [];
    const shockRings = [];
    const popups = [];

    // Background stars parallax field
    const bgStars = Array.from({ length: 48 }, (_, i) => ({
        x: ((i * 97 + 23) % (ARENA.width - 40)) + 20,
        y: ((i * 151 + 41) % (ARENA.height - 40)) + 20,
        r: (i % 3 === 0) ? 1.5 : 0.9,
        phase: i * 0.7
    }));

    function loadSave() {
        try {
            const raw = JSON.parse(localStorage.getItem(E.SAVE_KEY) || 'null');
            return E.normalizeSave(raw);
        } catch {
            return E.normalizeSave(null);
        }
    }

    function persistSave() {
        try {
            localStorage.setItem(E.SAVE_KEY, JSON.stringify(save));
        } catch {
            // ignore storage quota errors
        }
    }

    function resizeCanvasHiDpi() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = ARENA.width * dpr;
        canvas.height = ARENA.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function pickDefaultTool() {
        const inv = session.level.inventory;
        if ((inv.paddle || 0) > 0 && (inv.spring || 0) === 0) {
            selectedTool = 'paddle';
        } else if ((inv.spring || 0) > 0 && (inv.paddle || 0) === 0) {
            selectedTool = 'spring';
        } else {
            selectedTool = (inv.paddle || 0) > 0 ? 'paddle' : 'spring';
        }
    }

    function loadLevel(index, keepModalClosed = true) {
        const idx = Math.max(0, Math.min(LEVELS.length - 1, index));
        save.currentLevelIndex = idx;
        persistSave();

        session = E.createSession(idx);
        particles.length = 0;
        shockRings.length = 0;
        popups.length = 0;
        shakePower = 0;
        pickDefaultTool();

        if (keepModalClosed) {
            el.resultModal.classList.add('hidden');
            el.levelsModal.classList.add('hidden');
        }
        syncUI();
    }

    function syncUI() {
        const lvl = session.level;
        const ch = CHAPTERS.find((c) => c.id === lvl.chapter) || CHAPTERS[0];
        el.chapterPill.textContent = `CH.${ch.id} ${ch.name}`;
        el.chapterPill.style.borderColor = `${ch.accent}66`;
        el.chapterPill.style.color = ch.accent;
        el.stageTitle.textContent = `${lvl.label} · ${lvl.name}`;
        el.totalStarsLabel.textContent = `${E.totalStars(save)} / ${LEVELS.length * 3}`;
        el.hintText.textContent = lvl.hint;
        el.btnMute.textContent = save.muted ? '🔇' : '🔊';

        el.hudShots.innerHTML = `弹药: <b>${session.shotsLeft}</b>`;
        el.hudStars.innerHTML = `星核: <b>${session.starsCollected} / ${session.starsTotal}</b>`;
        el.hudBounces.innerHTML = `折射: <b>${session.totalBounces}</b>`;

        const rem = session.getRemainingCounts();
        const inv = lvl.inventory;

        el.countPaddle.textContent = inv.paddle > 0 ? `x${rem.paddle}` : '无';
        el.countSpring.textContent = inv.spring > 0 ? `x${rem.spring}` : '无';

        el.btnToolPaddle.classList.toggle('active', selectedTool === 'paddle');
        el.btnToolSpring.classList.toggle('active', selectedTool === 'spring');
        el.btnToolPaddle.classList.toggle('exhausted', inv.paddle === 0);
        el.btnToolSpring.classList.toggle('exhausted', inv.spring === 0);

        el.angleSlider.min = String(lvl.launcher.minDeg);
        el.angleSlider.max = String(lvl.launcher.maxDeg);
        el.angleSlider.value = String(Math.round(session.aimDeg));
        el.angleReadout.textContent = `${Math.round(session.aimDeg)}°`;

        const planning = session.state === 'planning';
        el.btnLaunch.disabled = !planning || session.shotsLeft <= 0;
        el.angleSlider.disabled = !planning;
        el.btnAngleMinus.disabled = !planning;
        el.btnAnglePlus.disabled = !planning;
        el.canvasTip.textContent = planning
            ? '点击蓝图锚点放置/旋转机关 · 拖动空白处瞄准 · 右键拆除'
            : '能量钢珠运行中...';
    }

    function addParticles(x, y, color, count, speed = 150, size = 3) {
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const spd = speed * (0.4 + Math.random() * 0.8);
            particles.push({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: 0.45 + Math.random() * 0.35,
                maxLife: 0.8,
                color,
                size: size * (0.7 + Math.random() * 0.6),
                shard: false
            });
        }
    }

    function addGlassShards(x, y, w, h) {
        for (let i = 0; i < 16; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 80 + Math.random() * 210;
            particles.push({
                x: x + (Math.random() - 0.5) * Math.min(w, 24),
                y: y + (Math.random() - 0.5) * Math.min(h, 24),
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 40,
                life: 0.55 + Math.random() * 0.3,
                maxLife: 0.85,
                color: i % 2 === 0 ? '#bae6fd' : '#38bdf8',
                size: 5 + Math.random() * 5,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 14,
                shard: true
            });
        }
    }

    function handleEvents(events) {
        for (const ev of events) {
            if (ev.type === 'paddle' || ev.type === 'spring' || ev.type === 'bumper') {
                audio.playBounce(ev.type);
                const clr = ev.type === 'spring' ? '#34d399' : (ev.type === 'bumper' ? '#f472b6' : '#38bdf8');
                addParticles(ev.x, ev.y, clr, 9, 130, 2.5);
                shockRings.push({ x: ev.x, y: ev.y, r: 6, maxR: 34, color: clr, alpha: 0.9 });
            } else if (ev.type === 'wall') {
                if ((ev.speed || 0) > 120) {
                    audio.playBounce('wall');
                    addParticles(ev.x, ev.y, '#94a3b8', 5, 90, 2);
                }
            } else if (ev.type === 'glass') {
                audio.playGlass();
                addGlassShards(ev.x, ev.y, ev.w || 20, ev.h || 20);
                shockRings.push({ x: ev.x, y: ev.y, r: 10, maxR: 52, color: '#bae6fd', alpha: 0.95 });
                shakePower = Math.max(shakePower, 4);
            } else if (ev.type === 'tnt') {
                audio.playTnt();
                addParticles(ev.x, ev.y, '#f97316', 24, 240, 4.2);
                addParticles(ev.x, ev.y, '#fde047', 12, 170, 3);
                shockRings.push({ x: ev.x, y: ev.y, r: 12, maxR: ev.radius || 115, color: '#fb923c', alpha: 1 });
                popups.push({ x: ev.x, y: ev.y - 12, text: 'BOOM!', color: '#fb923c', life: 0.9 });
                shakePower = Math.max(shakePower, 9);
            } else if (ev.type === 'star') {
                audio.playStar(ev.collected);
                addParticles(ev.x, ev.y, '#fde047', 16, 170, 3.4);
                shockRings.push({ x: ev.x, y: ev.y, r: 6, maxR: 44, color: '#fbbf24', alpha: 0.95 });
                popups.push({ x: ev.x, y: ev.y - 10, text: `★ ${ev.collected}/${ev.total}`, color: '#fde047', life: 0.85 });
                if (ev.collected >= ev.total) {
                    const ex = session.level.exit;
                    shockRings.push({ x: ex.x, y: ex.y, r: 12, maxR: 62, color: '#34d399', alpha: 1 });
                    popups.push({ x: ex.x, y: ex.y - 26, text: '出口已激活!', color: '#34d399', life: 1.1 });
                }
            } else if (ev.type === 'key') {
                audio.playStar(4);
                addParticles(ev.x, ev.y, '#38bdf8', 14, 150, 3);
                popups.push({ x: ev.x, y: ev.y - 12, text: '闸门解锁!', color: '#38bdf8', life: 1.0 });
            } else if (ev.type === 'portal') {
                audio.playPlace();
                addParticles(ev.fromX, ev.fromY, '#c084fc', 12, 130, 3);
                addParticles(ev.x, ev.y, '#38bdf8', 14, 150, 3);
                shockRings.push({ x: ev.x, y: ev.y, r: 8, maxR: 46, color: '#c084fc', alpha: 0.95 });
            } else if (ev.type === 'win') {
                onLevelWin();
            } else if (ev.type === 'nextShot') {
                popups.push({
                    x: session.level.launcher.x + 28,
                    y: session.level.launcher.y - 24,
                    text: `剩余 ${ev.shotsLeft} 发`,
                    color: '#38bdf8',
                    life: 1.0
                });
            } else if (ev.type === 'hazard' || ev.type === 'drain') {
                if (ev.type === 'hazard') {
                    addParticles(ev.x, ev.y, '#fb7185', 18, 190, 3.5);
                    shakePower = Math.max(shakePower, 6);
                }
            }
        }
        if (session.state === 'lost' && el.resultModal.classList.contains('hidden')) {
            onLevelLoss();
        }
        syncUI();
    }

    function onLevelWin() {
        audio.playWin();
        const stars = session.evaluateStars();
        const lvlId = session.level.id;
        save.levelStars[lvlId] = Math.max(save.levelStars[lvlId] || 0, stars);
        if (save.unlockedLevel < lvlId + 1 && lvlId < LEVELS.length) {
            save.unlockedLevel = lvlId + 1;
        }
        persistSave();

        const rem = session.getRemainingCounts();
        const spare = rem.paddle + rem.spring;

        el.resultBadge.textContent = 'EXPERIMENT COMPLETE';
        el.resultBadge.classList.remove('loss');
        el.resultTitle.textContent = `${session.level.label} 通关成功！`;
        el.resultStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        el.resultDesc.textContent = stars === 3
            ? '轨迹精妙绝伦，以极高效率达成三星实验评分！'
            : '实验成功！尝试减少折射次数或节省机关即可冲击 3 星。';
        el.resStarsVal.textContent = `${session.starsCollected} / ${session.starsTotal}`;
        el.resBouncesVal.textContent = `${session.totalBounces}`;
        el.resSpareVal.textContent = `${spare}`;

        const hasNext = session.levelIndex < LEVELS.length - 1;
        el.btnResultPrimary.textContent = hasNext ? '挑战下一关 →' : '全关卡制霸 · 返回目录';
        el.btnResultPrimary.onclick = () => {
            if (hasNext) loadLevel(session.levelIndex + 1);
            else {
                el.resultModal.classList.add('hidden');
                openLevelsModal();
            }
        };
        el.btnResultRetry.textContent = '再刷更高星级';
        el.resultModal.classList.remove('hidden');
    }

    function onLevelLoss() {
        audio.playFail();
        el.resultBadge.textContent = 'TRAJECTORY FAILED';
        el.resultBadge.classList.add('loss');
        el.resultTitle.textContent = '差一点就成功了';
        el.resultStars.textContent = '☆☆☆';
        el.resultDesc.textContent = session.lossReason || '再微调下机关方向或发射角度试试！';
        el.resStarsVal.textContent = `${session.starsCollected} / ${session.starsTotal}`;
        el.resBouncesVal.textContent = `${session.totalBounces}`;
        const rem = session.getRemainingCounts();
        el.resSpareVal.textContent = `${rem.paddle + rem.spring}`;

        el.btnResultPrimary.textContent = '微调重射（保留机关）';
        el.btnResultPrimary.onclick = () => {
            el.resultModal.classList.add('hidden');
            session.resetShotOnly();
            syncUI();
        };
        el.btnResultRetry.textContent = '彻底重开本关';
        el.resultModal.classList.remove('hidden');
    }

    function openLevelsModal() {
        el.chaptersList.innerHTML = '';
        for (const ch of CHAPTERS) {
            const block = document.createElement('div');
            block.className = 'chapter-block';
            block.innerHTML = `
                <div class="chapter-block-head">
                    <h3 style="color:${ch.accent}">CH.${ch.id} · ${ch.name}</h3>
                    <span>${ch.subtitle}</span>
                </div>
            `;
            const grid = document.createElement('div');
            grid.className = 'level-grid';
            LEVELS.filter((l) => l.chapter === ch.id).forEach((lvl) => {
                const idx = LEVELS.indexOf(lvl);
                const unlocked = lvl.id <= save.unlockedLevel;
                const stars = save.levelStars[lvl.id] || 0;
                const tile = document.createElement('button');
                tile.type = 'button';
                tile.className = 'level-tile' + (idx === session.levelIndex ? ' current' : '');
                tile.disabled = !unlocked;
                tile.innerHTML = `
                    <div class="level-tile-top">
                        <span>${lvl.label}</span>
                        <span class="level-tile-stars">${unlocked ? ('★'.repeat(stars) + '☆'.repeat(3 - stars)) : '🔒'}</span>
                    </div>
                    <div class="level-tile-name">${lvl.name}</div>
                `;
                tile.addEventListener('click', () => loadLevel(idx));
                grid.appendChild(tile);
            });
            block.appendChild(grid);
            el.chaptersList.appendChild(block);
        }
        el.levelsModal.classList.remove('hidden');
    }

    // Pointer Mapping
    function getArenaCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((clientX - rect.left) / rect.width) * ARENA.width,
            y: ((clientY - rect.top) / rect.height) * ARENA.height
        };
    }

    function findSlotAt(pt) {
        let best = null;
        let bestD = 30;
        for (const slot of session.level.slots) {
            const d = Math.hypot(pt.x - slot.x, pt.y - slot.y);
            if (d < bestD) {
                bestD = d;
                best = slot;
            }
        }
        return best;
    }

    function aimAtPoint(pt) {
        const l = session.level.launcher;
        const dx = pt.x - l.x;
        const dy = pt.y - l.y;
        if (Math.hypot(dx, dy) < 10) return;
        let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        // Handle wrapping nicely around minDeg..maxDeg
        if (deg < l.minDeg - 180) deg += 360;
        if (deg > l.maxDeg + 180) deg -= 360;
        session.setAimDeg(deg);
        syncUI();
    }

    canvas.addEventListener('pointerdown', (e) => {
        if (session.state !== 'planning') return;
        const pt = getArenaCoords(e.clientX, e.clientY);
        const slot = findSlotAt(pt);

        if (e.button === 2 && slot) {
            if (session.removeGadget(slot.id)) {
                audio.playPlace();
                syncUI();
            }
            return;
        }

        if (slot) {
            const existing = session.placements.get(slot.id);
            const toolToUse = existing ? existing.type : selectedTool;
            const res = session.placeOrRotateGadget(slot.id, toolToUse);
            if (!res) {
                // Fallback to whichever tool has remaining count
                const alt = toolToUse === 'paddle' ? 'spring' : 'paddle';
                const altRes = session.placeOrRotateGadget(slot.id, alt);
                if (altRes) {
                    selectedTool = alt;
                    audio.playPlace();
                } else {
                    popups.push({ x: slot.x, y: slot.y - 18, text: '该机关已用完', color: '#fb7185', life: 0.75 });
                }
            } else {
                audio.playPlace();
            }
            syncUI();
            return;
        }

        draggingAim = true;
        canvas.setPointerCapture(e.pointerId);
        aimAtPoint(pt);
    });

    canvas.addEventListener('pointermove', (e) => {
        const pt = getArenaCoords(e.clientX, e.clientY);
        const slot = findSlotAt(pt);
        hoveredSlotId = slot ? slot.id : null;
        if (draggingAim && session.state === 'planning') {
            aimAtPoint(pt);
        }
    });

    canvas.addEventListener('pointerup', (e) => {
        if (draggingAim) {
            draggingAim = false;
            try { canvas.releasePointerCapture(e.pointerId); } catch {}
        }
    });

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Control Bindings
    el.btnToolPaddle.addEventListener('click', () => {
        selectedTool = 'paddle';
        syncUI();
    });
    el.btnToolSpring.addEventListener('click', () => {
        selectedTool = 'spring';
        syncUI();
    });
    el.angleSlider.addEventListener('input', () => {
        if (session.state !== 'planning') return;
        session.setAimDeg(Number(el.angleSlider.value));
        syncUI();
    });
    el.btnAngleMinus.addEventListener('click', () => {
        if (session.state !== 'planning') return;
        session.setAimDeg(session.aimDeg - 1);
        syncUI();
    });
    el.btnAnglePlus.addEventListener('click', () => {
        if (session.state !== 'planning') return;
        session.setAimDeg(session.aimDeg + 1);
        syncUI();
    });

    function triggerLaunch() {
        if (session.state !== 'planning') return;
        if (session.launch()) {
            audio.playLaunch();
            syncUI();
        }
    }

    el.btnLaunch.addEventListener('click', triggerLaunch);
    el.btnKeepRetry.addEventListener('click', () => {
        el.resultModal.classList.add('hidden');
        session.resetShotOnly();
        syncUI();
    });
    el.btnClearGadgets.addEventListener('click', () => {
        if (session.state !== 'planning') {
            session.resetShotOnly();
        }
        session.placements.clear();
        audio.playPlace();
        syncUI();
    });
    el.btnResetAll.addEventListener('click', () => loadLevel(session.levelIndex));
    el.btnLevels.addEventListener('click', openLevelsModal);
    el.btnCloseLevels.addEventListener('click', () => el.levelsModal.classList.add('hidden'));
    el.btnResultLevels.addEventListener('click', () => {
        el.resultModal.classList.add('hidden');
        openLevelsModal();
    });
    el.btnResultRetry.addEventListener('click', () => {
        if (session.state === 'lost') {
            loadLevel(session.levelIndex);
        } else {
            el.resultModal.classList.add('hidden');
            session.resetShotOnly();
            syncUI();
        }
    });
    el.btnMute.addEventListener('click', () => {
        save.muted = !save.muted;
        audio.setMuted(save.muted);
        persistSave();
        syncUI();
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && el.levelsModal.classList.contains('hidden') && el.resultModal.classList.contains('hidden')) {
            e.preventDefault();
            triggerLaunch();
        } else if (e.key === 'r' || e.key === 'R') {
            if (session) {
                el.resultModal.classList.add('hidden');
                session.resetShotOnly();
                syncUI();
            }
        }
    });

    // Canvas Rendering
    function drawStarShape(cx, cy, outerR, innerR, points, rot = -Math.PI / 2) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const a = rot + (i * Math.PI) / points;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    function drawBackground() {
        const ch = CHAPTERS.find((c) => c.id === session.level.chapter) || CHAPTERS[0];
        const grad = ctx.createRadialGradient(ARENA.width * 0.5, ARENA.height * 0.35, 30, ARENA.width * 0.5, ARENA.height * 0.45, 420);
        grad.addColorStop(0, `${ch.accent}1a`);
        grad.addColorStop(1, '#070b15');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, ARENA.width, ARENA.height);

        // Blueprint grid
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
        ctx.lineWidth = 1;
        for (let x = 32; x < ARENA.width; x += 32) {
            ctx.beginPath();
            ctx.moveTo(x, ARENA.topY);
            ctx.lineTo(x, ARENA.floorY);
            ctx.stroke();
        }
        for (let y = 32; y < ARENA.height; y += 32) {
            ctx.beginPath();
            ctx.moveTo(ARENA.wallL, y);
            ctx.lineTo(ARENA.wallR, y);
            ctx.stroke();
        }

        // Twinkling deep stars
        for (const st of bgStars) {
            const a = 0.25 + 0.35 * Math.sin(clock * 1.8 + st.phase);
            ctx.fillStyle = `rgba(226, 232, 240, ${a.toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Lab enclosure walls + glowing energy drain floor
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(ARENA.wallL, ARENA.topY, ARENA.wallR - ARENA.wallL, ARENA.floorY - ARENA.topY);

        const drainGrad = ctx.createLinearGradient(ARENA.wallL, ARENA.floorY - 10, ARENA.wallL, ARENA.floorY);
        drainGrad.addColorStop(0, 'rgba(251, 113, 133, 0)');
        drainGrad.addColorStop(1, 'rgba(251, 113, 133, 0.28)');
        ctx.fillStyle = drainGrad;
        ctx.fillRect(ARENA.wallL + 1, ARENA.floorY - 12, ARENA.wallR - ARENA.wallL - 2, 12);
    }

    function drawObstacles() {
        for (const o of session.obstacles) {
            if (!o.alive) continue;

            if (o.kind === 'wall') {
                const g = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y + o.h);
                g.addColorStop(0, '#334155');
                g.addColorStop(1, '#1e293b');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.roundRect(o.x, o.y, o.w, o.h, 6);
                ctx.fill();
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.48)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else if (o.kind === 'crate') {
                ctx.fillStyle = '#78350f';
                ctx.beginPath();
                ctx.roundRect(o.x, o.y, o.w, o.h, 6);
                ctx.fill();
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
                ctx.beginPath();
                ctx.moveTo(o.x + 5, o.y + 5);
                ctx.lineTo(o.x + o.w - 5, o.y + o.h - 5);
                ctx.moveTo(o.x + o.w - 5, o.y + 5);
                ctx.lineTo(o.x + 5, o.y + o.h - 5);
                ctx.stroke();
            } else if (o.kind === 'glass') {
                ctx.save();
                ctx.fillStyle = 'rgba(125, 211, 252, 0.24)';
                ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(o.x, o.y, o.w, o.h, 4);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (o.kind === 'spike') {
                ctx.save();
                ctx.fillStyle = 'rgba(244, 63, 94, 0.26)';
                ctx.fillRect(o.x, o.y, o.w, o.h);
                ctx.strokeStyle = '#fb7185';
                ctx.lineWidth = 2;
                const step = 12;
                ctx.beginPath();
                for (let sx = o.x; sx <= o.x + o.w; sx += step) {
                    const top = ((sx - o.x) / step) % 2 === 0;
                    ctx.lineTo(sx, top ? o.y + 2 : o.y + o.h - 2);
                }
                ctx.stroke();
                ctx.restore();
            } else if (o.kind === 'gate') {
                ctx.save();
                if (o.open) {
                    ctx.setLineDash([4, 5]);
                    ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
                    ctx.strokeRect(o.x, o.y, o.w, o.h);
                } else {
                    const pulse = 0.55 + 0.35 * Math.sin(clock * 7);
                    ctx.fillStyle = `rgba(245, 158, 11, ${pulse * 0.45})`;
                    ctx.fillRect(o.x, o.y, o.w, o.h);
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(o.x, o.y, o.w, o.h);
                }
                ctx.restore();
            } else if (o.kind === 'bumper') {
                const glow = ctx.createRadialGradient(o.x, o.y, 4, o.x, o.y, o.r + 8);
                glow.addColorStop(0, '#f472b6');
                glow.addColorStop(0.7, '#be185d');
                glow.addColorStop(1, 'rgba(244, 114, 182, 0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(o.x, o.y, o.r + 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fbcfe8';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(o.x, o.y, o.r - 2, 0, Math.PI * 2);
                ctx.stroke();
            } else if (o.kind === 'tnt') {
                const pulse = 1 + 0.08 * Math.sin(clock * 8);
                ctx.save();
                ctx.translate(o.x, o.y);
                ctx.scale(pulse, pulse);
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(0, 0, o.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fde047';
                ctx.lineWidth = 2.2;
                ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('TNT', 0, 1);
                ctx.restore();
            } else if (o.kind === 'gravity') {
                ctx.save();
                const rg = ctx.createRadialGradient(o.x, o.y, o.r * 0.5, o.x, o.y, o.pullRadius);
                rg.addColorStop(0, 'rgba(168, 85, 247, 0.34)');
                rg.addColorStop(0.6, 'rgba(139, 92, 246, 0.12)');
                rg.addColorStop(1, 'rgba(139, 92, 246, 0)');
                ctx.fillStyle = rg;
                ctx.beginPath();
                ctx.arc(o.x, o.y, o.pullRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
                ctx.setLineDash([6, 8]);
                ctx.beginPath();
                ctx.arc(o.x, o.y, o.pullRadius * 0.68, clock * 0.9, clock * 0.9 + Math.PI * 1.7);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = '#090514';
                ctx.strokeStyle = '#c084fc';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (o.kind === 'portal') {
                ctx.save();
                ctx.translate(o.x, o.y);
                ctx.rotate(clock * 2.4);
                const g = ctx.createRadialGradient(0, 0, 2, 0, 0, o.r + 6);
                g.addColorStop(0, '#f0abfc');
                g.addColorStop(0.55, '#8b5cf6');
                g.addColorStop(1, 'rgba(56, 189, 248, 0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(0, 0, o.r + 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#e879f9';
                ctx.lineWidth = 2.2;
                ctx.setLineDash([7, 5]);
                ctx.beginPath();
                ctx.arc(0, 0, o.r - 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    function drawExitAndItems() {
        const ex = session.level.exit;
        ctx.save();
        ctx.translate(ex.x, ex.y);
        const open = session.exitOpen;
        const glowR = open ? ex.r + 14 : ex.r + 4;
        const eg = ctx.createRadialGradient(0, 0, 3, 0, 0, glowR);
        eg.addColorStop(0, open ? '#6ee7b7' : '#475569');
        eg.addColorStop(0.6, open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(71, 85, 105, 0.28)');
        eg.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(0, 0, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(clock * (open ? 2.8 : 0.6));
        ctx.strokeStyle = open ? '#34d399' : '#64748b';
        ctx.lineWidth = open ? 3 : 2;
        ctx.setLineDash(open ? [8, 5] : [4, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, ex.r - 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = open ? '#ecfdf5' : '#94a3b8';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.rotate(-clock * (open ? 2.8 : 0.6));
        ctx.fillText(open ? 'EXIT' : 'LOCKED', 0, 1);
        ctx.restore();

        for (const item of session.items) {
            if (item.collected) continue;
            const bob = Math.sin(clock * 4 + item.x * 0.05) * 2.5;
            if (item.kind === 'star') {
                ctx.save();
                ctx.translate(item.x, item.y + bob);
                const sg = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
                sg.addColorStop(0, 'rgba(253, 224, 71, 0.65)');
                sg.addColorStop(1, 'rgba(253, 224, 71, 0)');
                ctx.fillStyle = sg;
                ctx.beginPath();
                ctx.arc(0, 0, 20, 0, Math.PI * 2);
                ctx.fill();

                drawStarShape(0, 0, 12.5, 5.5, 5, -Math.PI / 2 + Math.sin(clock * 2) * 0.12);
                ctx.fillStyle = '#fde047';
                ctx.fill();
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            } else if (item.kind === 'key') {
                ctx.save();
                ctx.translate(item.x, item.y + bob);
                ctx.fillStyle = '#38bdf8';
                ctx.strokeStyle = '#bae6fd';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(-4, 0, 6.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(2.5, 0);
                ctx.lineTo(13, 0);
                ctx.lineTo(13, 5);
                ctx.moveTo(9, 0);
                ctx.lineTo(9, 4);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    function drawSlotsAndGadgets() {
        for (const slot of session.level.slots) {
            const p = session.placements.get(slot.id);
            const isHover = hoveredSlotId === slot.id && session.state === 'planning';

            // Slot blueprint socket
            ctx.save();
            ctx.translate(slot.x, slot.y);
            ctx.strokeStyle = isHover ? '#38bdf8' : 'rgba(56, 189, 248, 0.42)';
            ctx.lineWidth = isHover ? 2 : 1.3;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            if (!p) {
                ctx.fillStyle = isHover ? 'rgba(56, 189, 248, 0.2)' : 'rgba(56, 189, 248, 0.08)';
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(186, 230, 253, 0.72)';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('+', 0, 1);
            } else if (p.type === 'paddle') {
                ctx.rotate(PADDLE_ANGLES[p.rot & 3]);
                const g = ctx.createLinearGradient(-36, -6, 36, 6);
                g.addColorStop(0, '#0284c7');
                g.addColorStop(0.5, '#38bdf8');
                g.addColorStop(1, '#0284c7');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.roundRect(-36, -6, 72, 12, 6);
                ctx.fill();
                ctx.strokeStyle = '#e0f2fe';
                ctx.lineWidth = 1.6;
                ctx.stroke();
            } else if (p.type === 'spring') {
                ctx.fillStyle = '#059669';
                ctx.beginPath();
                ctx.roundRect(-26, -7, 52, 14, 7);
                ctx.fill();
                ctx.strokeStyle = '#6ee7b7';
                ctx.lineWidth = 1.8;
                ctx.stroke();

                // Directional thrust arrow
                const dir = SPRING_NORMALS[p.rot & 3];
                const ang = Math.atan2(dir.ny, dir.nx);
                ctx.save();
                ctx.rotate(ang);
                ctx.strokeStyle = '#a7f3d0';
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(8, 0);
                ctx.lineTo(24, 0);
                ctx.lineTo(18, -5);
                ctx.moveTo(24, 0);
                ctx.lineTo(18, 5);
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }
    }

    function drawLauncherAndPreview() {
        const l = session.level.launcher;
        if (session.state === 'planning') {
            const pts = session.predictArc(3);
            ctx.save();
            for (let i = 1; i < pts.length; i += 2) {
                const alpha = Math.max(0.06, 0.65 * (1 - i / pts.length));
                ctx.fillStyle = `rgba(125, 211, 252, ${alpha.toFixed(2)})`;
                ctx.beginPath();
                ctx.arc(pts[i].x, pts[i].y, 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        const rad = (session.aimDeg * Math.PI) / 180;
        ctx.save();
        ctx.translate(l.x, l.y);

        // Turret ring
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cannon barrel
        ctx.rotate(rad);
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.roundRect(0, -6, 26, 12, 4);
        ctx.fill();
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
    }

    function drawBallAndTrail() {
        if (session.trail.length > 1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 1; i < session.trail.length; i++) {
                const p0 = session.trail[i - 1];
                const p1 = session.trail[i];
                const t = i / session.trail.length;
                ctx.strokeStyle = `rgba(56, 189, 248, ${(t * 0.55).toFixed(2)})`;
                ctx.lineWidth = Math.max(1.5, ARENA.marbleR * 1.4 * t);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
            }
            ctx.restore();
        }

        const b = session.ball;
        if (!b) return;
        ctx.save();
        const halo = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.r + 12);
        halo.addColorStop(0, 'rgba(224, 242, 254, 0.95)');
        halo.addColorStop(0.5, 'rgba(56, 189, 248, 0.55)');
        halo.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 12, 0, Math.PI * 2);
        ctx.fill();

        const core = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, b.r);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.65, '#38bdf8');
        core.addColorStop(1, '#0369a1');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function updateAndDrawEffects(dt) {
        for (let i = shockRings.length - 1; i >= 0; i--) {
            const r = shockRings[i];
            r.r += (r.maxR - r.r) * Math.min(1, dt * 11);
            r.alpha -= dt * 2.5;
            if (r.alpha <= 0.02) {
                shockRings.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.strokeStyle = r.color;
            ctx.globalAlpha = Math.max(0, r.alpha);
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            p.vy += 260 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            if (p.shard) {
                p.rot += p.vRot * dt;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.beginPath();
                ctx.moveTo(0, -p.size);
                ctx.lineTo(p.size * 0.7, p.size * 0.6);
                ctx.lineTo(-p.size * 0.7, p.size * 0.4);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        for (let i = popups.length - 1; i >= 0; i--) {
            const pop = popups[i];
            pop.life -= dt;
            pop.y -= 28 * dt;
            if (pop.life <= 0) {
                popups.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.globalAlpha = Math.min(1, pop.life * 1.4);
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = pop.color;
            ctx.fillText(pop.text, pop.x, pop.y);
            ctx.restore();
        }
    }

    let lastTs = performance.now();
    function frame(ts) {
        const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
        lastTs = ts;
        clock += dt;

        if (session && session.state === 'flying') {
            const events = session.step(dt);
            if (events.length > 0) handleEvents(events);
        }

        ctx.save();
        if (shakePower > 0.2) {
            ctx.translate((Math.random() - 0.5) * shakePower, (Math.random() - 0.5) * shakePower);
            shakePower *= Math.pow(0.02, dt);
        } else {
            shakePower = 0;
        }

        drawBackground();
        drawObstacles();
        drawExitAndItems();
        drawSlotsAndGadgets();
        drawLauncherAndPreview();
        drawBallAndTrail();
        updateAndDrawEffects(dt);
        ctx.restore();

        requestAnimationFrame(frame);
    }

    resizeCanvasHiDpi();
    window.addEventListener('resize', resizeCanvasHiDpi);
    loadLevel(save.currentLevelIndex || 0);
    requestAnimationFrame(frame);
})();
