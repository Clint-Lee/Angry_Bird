(function () {
    'use strict';

    const E = window.DragonSweeperEngine;
    const AudioSys = window.DragonSweeperAudio;
    const { MONSTERS, STAGES } = E;

    const canvas = document.getElementById('boardCanvas');
    const ctx = canvas.getContext('2d');
    const LOGICAL_SIZE = 520;

    const el = {
        modeBadge: document.getElementById('modeBadge'),
        stageTitle: document.getElementById('stageTitle'),
        btnModeStage: document.getElementById('btnModeStage'),
        btnModeEndless: document.getElementById('btnModeEndless'),
        endlessMaxVal: document.getElementById('endlessMaxVal'),
        btnStages: document.getElementById('btnStages'),
        btnRestart: document.getElementById('btnRestart'),
        btnMute: document.getElementById('btnMute'),
        heroAtkVal: document.getElementById('heroAtkVal'),
        heroHpVal: document.getElementById('heroHpVal'),
        heroShieldVal: document.getElementById('heroShieldVal'),
        heroXpText: document.getElementById('heroXpText'),
        heroXpFill: document.getElementById('heroXpFill'),
        scoreVal: document.getElementById('scoreVal'),
        toolDig: document.getElementById('toolDig'),
        toolFlag: document.getElementById('toolFlag'),
        toolScroll: document.getElementById('toolScroll'),
        scrollCount: document.getElementById('scrollCount'),
        stageSubtitle: document.getElementById('stageSubtitle'),
        monsterCodex: document.getElementById('monsterCodex'),
        stagesModal: document.getElementById('stagesModal'),
        stagesGrid: document.getElementById('stagesGrid'),
        btnCloseStages: document.getElementById('btnCloseStages'),
        resultModal: document.getElementById('resultModal'),
        resultBadge: document.getElementById('resultBadge'),
        resultTitle: document.getElementById('resultTitle'),
        resultStars: document.getElementById('resultStars'),
        resultDesc: document.getElementById('resultDesc'),
        resScore: document.getElementById('resScore'),
        resKills: document.getElementById('resKills'),
        resDamage: document.getElementById('resDamage'),
        btnResultPrimary: document.getElementById('btnResultPrimary'),
        btnResultRetry: document.getElementById('btnResultRetry')
    };

    const audio = new AudioSys();
    let save = loadSave();
    audio.setMuted(save.muted);

    let session = null;
    let actionMode = 'dig'; // 'dig' | 'flag' | 'scroll'
    let activeMarkTag = 'flag';
    let hoverCell = null;
    let clock = 0;
    let shakePower = 0;
    let endlessRunScore = 0;
    let endlessRunFloor = 1;

    const particles = [];
    const slashes = [];
    const popups = [];

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

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = LOGICAL_SIZE * dpr;
        canvas.height = LOGICAL_SIZE * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function startStage(idx) {
        const cleanIdx = Math.max(0, Math.min(STAGES.length - 1, idx));
        save.currentStageIndex = cleanIdx;
        persistSave();
        session = E.createSession({ mode: 'stage', stageIndex: cleanIdx });
        resetTransientFx();
        el.stagesModal.classList.add('hidden');
        el.resultModal.classList.add('hidden');
        syncUI();
    }

    function startEndless(floorNum, carryScore, randomSeed = true) {
        endlessRunFloor = Math.max(1, floorNum || 1);
        endlessRunScore = carryScore || 0;
        const seed = randomSeed ? ((Date.now() ^ (endlessRunFloor * 7919)) >>> 0) : undefined;
        session = E.createSession({
            mode: 'endless',
            endlessFloor: endlessRunFloor,
            carryScore: endlessRunScore,
            seed
        });
        resetTransientFx();
        el.stagesModal.classList.add('hidden');
        el.resultModal.classList.add('hidden');
        syncUI();
    }

    function resetTransientFx() {
        particles.length = 0;
        slashes.length = 0;
        popups.length = 0;
        shakePower = 0;
        actionMode = 'dig';
    }

    function syncUI() {
        const h = session.hero;
        el.btnModeStage.classList.toggle('active', session.mode === 'stage');
        el.btnModeEndless.classList.toggle('active', session.mode === 'endless');

        el.modeBadge.textContent = session.mode === 'endless'
            ? `无尽深渊 · 第 ${session.endlessFloor} 层`
            : `试炼第 ${session.stageIndex + 1} 层`;
        el.stageTitle.textContent = `${session.cfg.label} · ${session.cfg.name}`;
        el.stageSubtitle.textContent = session.cfg.subtitle;
        el.endlessMaxVal.textContent = save.endlessHighScore.toLocaleString();
        el.btnMute.textContent = save.muted ? '🔇' : '🔊';

        el.heroAtkVal.textContent = `Lv.${h.atk}`;
        el.heroHpVal.textContent = `${h.hp} / ${h.maxHp}`;
        el.heroShieldVal.textContent = String(h.shield);
        el.heroXpText.textContent = `${h.xp} / ${h.xpNext}`;
        el.heroXpFill.style.width = `${Math.min(100, Math.round((h.xp / Math.max(1, h.xpNext)) * 100))}%`;
        el.scoreVal.textContent = session.score.toLocaleString();

        el.scrollCount.textContent = `x${h.scrolls}`;
        el.toolScroll.disabled = h.scrolls <= 0 || session.state !== 'playing';
        el.toolDig.classList.toggle('active', actionMode === 'dig');
        el.toolFlag.classList.toggle('active', actionMode === 'flag');
        el.toolScroll.classList.toggle('active', actionMode === 'scroll');

        document.querySelectorAll('.tag-chip').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.mark === activeMarkTag);
        });

        // Sync live Monster Bestiary
        el.monsterCodex.innerHTML = '';
        Object.values(MONSTERS).forEach((m) => {
            const safe = h.atk >= m.lv;
            const dmg = (m.lv - h.atk) * 2;
            const row = document.createElement('div');
            row.className = 'monster-row';
            row.innerHTML = `
                <div class="monster-row-left">
                    <span class="lv-pill" style="background:${m.color}">Lv.${m.lv}</span>
                    <b>${m.name}</b>
                </div>
                <span class="${safe ? 'status-safe' : 'status-danger'}">
                    ${safe ? '✓ 可无伤秒杀' : `⚠ 强攻 -${dmg} HP`}
                </span>
            `;
            el.monsterCodex.appendChild(row);
        });
    }

    function cellCenter(r, c) {
        const pad = 14;
        const size = (LOGICAL_SIZE - pad * 2) / session.cols;
        return {
            x: pad + (c + 0.5) * size,
            y: pad + (r + 0.5) * size,
            size
        };
    }

    function spawnParticles(x, y, color, count = 12, speed = 150) {
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
            const spd = speed * (0.4 + Math.random() * 0.8);
            particles.push({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 30,
                r: 2 + Math.random() * 2.5,
                color,
                life: 0.4 + Math.random() * 0.3,
                maxLife: 0.7
            });
        }
    }

    function processEvents(events) {
        let revealedAny = false;
        for (const ev of events) {
            const pos = (ev.r !== undefined) ? cellCenter(ev.r, ev.c) : { x: LOGICAL_SIZE / 2, y: LOGICAL_SIZE / 2 };

            if (ev.type === 'reveal') {
                revealedAny = true;
                spawnParticles(pos.x, pos.y, '#94a3b8', 4, 80);
            } else if (ev.type === 'blockedFlag') {
                popups.push({ x: pos.x, y: pos.y - 10, text: '已插旗保护', color: '#fbbf24', life: 0.75 });
            } else if (ev.type === 'warn') {
                audio.playMark();
                popups.push({ x: pos.x, y: pos.y - 12, text: `⚠️ 将受 -${ev.dmg} HP · 再点确认`, color: '#fb7185', life: 1.15 });
            } else if (ev.type === 'slay') {
                audio.playSlash(ev.lv);
                slashes.push({ x: pos.x, y: pos.y, size: pos.size * 0.45, life: 0.28, maxLife: 0.28, color: ev.boss ? '#fde047' : '#f8fafc' });
                const clr = (MONSTERS[ev.lv] || MONSTERS[1]).color;
                spawnParticles(pos.x, pos.y, clr, ev.boss ? 28 : 12, ev.boss ? 210 : 140);
                popups.push({ x: pos.x, y: pos.y - 14, text: `+${ev.lv} XP`, color: '#4ade80', life: 0.85 });
                if (ev.boss) shakePower = 10;
            } else if (ev.type === 'hurt') {
                audio.playHurt();
                shakePower = Math.max(shakePower, 8);
                spawnParticles(pos.x, pos.y, '#fb7185', 16, 170);
                const msg = ev.hpDmg > 0 ? `-${ev.hpDmg} HP!` : `护盾格挡 ${ev.blocked}`;
                popups.push({ x: pos.x, y: pos.y - 18, text: msg, color: '#fb7185', life: 1.05 });
            } else if (ev.type === 'levelup') {
                audio.playLevelUp();
                spawnParticles(pos.x, pos.y, '#fde047', 20, 190);
                popups.push({ x: pos.x, y: pos.y - 26, text: `升级! 战力 Lv.${ev.atk}`, color: '#fde047', life: 1.25 });
            } else if (ev.type === 'item') {
                audio.playItem();
                spawnParticles(pos.x, pos.y, '#38bdf8', 12, 130);
                popups.push({ x: pos.x, y: pos.y - 12, text: ev.text, color: '#fde047', life: 0.95 });
            } else if (ev.type === 'scrollCast') {
                audio.playScroll();
                spawnParticles(pos.x, pos.y, '#c084fc', 18, 165);
                if (session.hero.scrolls <= 0) actionMode = 'dig';
            } else if (ev.type === 'win') {
                onWin();
            } else if (ev.type === 'lose') {
                onLose();
            }
        }
        if (revealedAny && !events.some((e) => e.type === 'slay' || e.type === 'item' || e.type === 'scrollCast')) {
            audio.playReveal();
        }
        if (session.mode === 'endless' && session.score > save.endlessHighScore) {
            save.endlessHighScore = session.score;
            persistSave();
        }
        syncUI();
    }

    function onWin() {
        audio.playWin();
        save.dragonsSlain = (save.dragonsSlain || 0) + 1;
        if (session.mode === 'endless') {
            save.endlessHighScore = Math.max(save.endlessHighScore, session.score);
            save.endlessMaxFloor = Math.max(save.endlessMaxFloor, session.endlessFloor + 1);
            persistSave();

            el.resultBadge.textContent = `ABYSS FLOOR ${session.endlessFloor} CLEARED`;
            el.resultBadge.classList.remove('loss');
            el.resultTitle.textContent = `深渊第 ${session.endlessFloor} 层制霸！`;
            el.resultStars.textContent = '🐉🔥👑';
            el.resultDesc.textContent = '首领已伏诛！保留当前战果与 MAX 高分冲刺下一深层。';
            el.resScore.textContent = session.score.toLocaleString();
            el.resKills.textContent = `${session.slainMonsters} / ${session.totalMonsters}`;
            el.resDamage.textContent = `${session.hero.damageTaken} HP`;
            el.btnResultPrimary.textContent = `深入第 ${session.endlessFloor + 1} 层 →`;
            el.btnResultPrimary.onclick = () => startEndless(session.endlessFloor + 1, session.score);
            el.btnResultRetry.textContent = '重开第 1 层';
            el.btnResultRetry.onclick = () => startEndless(1, 0);
            el.resultModal.classList.remove('hidden');
            return;
        }

        const stars = session.evaluateStars();
        const stId = session.cfg.id;
        save.stageStars[stId] = Math.max(save.stageStars[stId] || 0, stars);
        if (save.unlockedStage < stId + 1 && stId < STAGES.length) {
            save.unlockedStage = stId + 1;
        }
        persistSave();

        el.resultBadge.textContent = 'DUNGEON CONQUERED';
        el.resultBadge.classList.remove('loss');
        el.resultTitle.textContent = `${session.cfg.label} 讨伐成功！`;
        el.resultStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        el.resultDesc.textContent = stars === 3
            ? '零失误精密推演！几乎无伤斩杀地城首领！'
            : '成功讨伐首领！减少越级强攻伤害即可获得三星完美评价。';
        el.resScore.textContent = session.score.toLocaleString();
        el.resKills.textContent = `${session.slainMonsters} / ${session.totalMonsters}`;
        el.resDamage.textContent = `${session.hero.damageTaken} HP`;

        const hasNext = session.stageIndex < STAGES.length - 1;
        el.btnResultPrimary.textContent = hasNext ? '挑战下一层 →' : '全试炼通关 · 转战无尽深渊 🔥';
        el.btnResultPrimary.onclick = () => {
            if (hasNext) startStage(session.stageIndex + 1);
            else startEndless(1, 0);
        };
        el.btnResultRetry.textContent = '重挑战本层 ↻';
        el.btnResultRetry.onclick = () => startStage(session.stageIndex);
        el.resultModal.classList.remove('hidden');
    }

    function onLose() {
        audio.playLose();
        if (session.mode === 'endless' && session.score > save.endlessHighScore) {
            save.endlessHighScore = session.score;
            persistSave();
        }
        el.resultBadge.textContent = 'HERO FALLEN';
        el.resultBadge.classList.add('loss');
        el.resultTitle.textContent = '勇者倒下了…';
        el.resultStars.textContent = '💀';
        el.resultDesc.textContent = session.lossReason || '盲点踩到过强怪物！下次先利用数字与紫点个数排查低级怪。';
        el.resScore.textContent = session.score.toLocaleString();
        el.resKills.textContent = `${session.slainMonsters} / ${session.totalMonsters}`;
        el.resDamage.textContent = `${session.hero.damageTaken} HP`;

        el.btnResultPrimary.textContent = '再来一局 ↻';
        el.btnResultPrimary.onclick = () => {
            if (session.mode === 'endless') startEndless(1, 0);
            else startStage(session.stageIndex);
        };
        el.btnResultRetry.textContent = '切换关卡';
        el.btnResultRetry.onclick = () => {
            el.resultModal.classList.add('hidden');
            openStagesModal();
        };
        el.resultModal.classList.remove('hidden');
    }

    function openStagesModal() {
        el.stagesGrid.innerHTML = '';
        STAGES.forEach((st, idx) => {
            const unlocked = st.id <= save.unlockedStage;
            const stars = save.stageStars[st.id] || 0;
            const tile = document.createElement('button');
            tile.type = 'button';
            tile.className = 'stage-tile' + (session.mode === 'stage' && idx === session.stageIndex ? ' current' : '');
            tile.disabled = !unlocked;
            tile.innerHTML = `
                <div class="stage-tile-top">
                    <span>${st.label} (${st.rows}×${st.cols})</span>
                    <span class="stage-tile-stars">${unlocked ? ('★'.repeat(stars) + '☆'.repeat(3 - stars)) : '🔒'}</span>
                </div>
                <strong>${st.name}</strong>
                <small style="color:#94a3b8;font-size:11px;">Boss: Lv.${st.bossLv}</small>
            `;
            tile.addEventListener('click', () => startStage(idx));
            el.stagesGrid.appendChild(tile);
        });
        el.stagesModal.classList.remove('hidden');
    }

    // Input Handling
    function getCellFromPointer(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * LOGICAL_SIZE;
        const y = ((clientY - rect.top) / rect.height) * LOGICAL_SIZE;
        const pad = 14;
        const size = (LOGICAL_SIZE - pad * 2) / session.cols;
        const c = Math.floor((x - pad) / size);
        const r = Math.floor((y - pad) / size);
        if (r < 0 || r >= session.rows || c < 0 || c >= session.cols) return null;
        return { r, c };
    }

    canvas.addEventListener('pointerdown', (e) => {
        if (!session || session.state !== 'playing') return;
        const hit = getCellFromPointer(e.clientX, e.clientY);
        if (!hit) return;

        if (e.button === 2 || actionMode === 'flag') {
            if (session.toggleMark(hit.r, hit.c, e.button === 2 ? undefined : activeMarkTag)) {
                audio.playMark();
                syncUI();
            }
            return;
        }

        if (actionMode === 'scroll') {
            const ev = session.useScroll(hit.r, hit.c);
            if (ev.length > 0) processEvents(ev);
            return;
        }

        const ev = session.revealCell(hit.r, hit.c);
        if (ev.length > 0) processEvents(ev);
    });

    canvas.addEventListener('pointermove', (e) => {
        hoverCell = session ? getCellFromPointer(e.clientX, e.clientY) : null;
    });
    canvas.addEventListener('pointerleave', () => { hoverCell = null; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Buttons
    el.btnModeStage.addEventListener('click', () => startStage(save.currentStageIndex));
    el.btnModeEndless.addEventListener('click', () => startEndless(1, 0));
    el.btnStages.addEventListener('click', openStagesModal);
    el.btnCloseStages.addEventListener('click', () => el.stagesModal.classList.add('hidden'));
    el.btnRestart.addEventListener('click', () => {
        if (session.mode === 'endless') startEndless(1, 0);
        else startStage(session.stageIndex);
    });
    el.btnMute.addEventListener('click', () => {
        save.muted = !save.muted;
        audio.setMuted(save.muted);
        persistSave();
        syncUI();
    });

    el.toolDig.addEventListener('click', () => { actionMode = 'dig'; syncUI(); });
    el.toolFlag.addEventListener('click', () => { actionMode = 'flag'; syncUI(); });
    el.toolScroll.addEventListener('click', () => {
        if (session.hero.scrolls > 0) {
            actionMode = actionMode === 'scroll' ? 'dig' : 'scroll';
            syncUI();
        }
    });

    document.querySelectorAll('.tag-chip').forEach((btn) => {
        btn.addEventListener('click', () => {
            activeMarkTag = btn.dataset.mark;
            actionMode = 'flag';
            syncUI();
        });
    });

    window.addEventListener('keydown', (e) => {
        if (!session || session.state !== 'playing') return;
        if (e.key >= '1' && e.key <= '7') {
            activeMarkTag = e.key;
            actionMode = 'flag';
            syncUI();
        } else if (e.key === 'f' || e.key === 'F') {
            actionMode = actionMode === 'flag' ? 'dig' : 'flag';
            syncUI();
        }
    });

    // Vector Artwork Rendering
    function drawMonsterSprite(x, y, size, lv, boss) {
        const def = MONSTERS[lv] || MONSTERS[1];
        const bob = Math.sin(clock * (boss ? 4.5 : 3.2) + x * 0.05) * 1.6;
        ctx.save();
        ctx.translate(x, y + bob);
        const r = size * (boss ? 0.34 : 0.28);

        // Aura glow for Boss / High-tier
        if (lv >= 5) {
            const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.45);
            g.addColorStop(0, `${def.color}55`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
            ctx.fill();
        }

        // Silhouetted monster body per level
        ctx.fillStyle = def.color;
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1.8;

        if (lv === 1) {
            // Slime dome
            ctx.beginPath();
            ctx.moveTo(-r, r * 0.65);
            ctx.quadraticCurveTo(0, -r * 1.25, r, r * 0.65);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (lv === 2) {
            // Bat wings
            ctx.beginPath();
            ctx.moveTo(-r * 1.25, -r * 0.2);
            ctx.quadraticCurveTo(-r * 0.5, -r * 0.9, 0, -r * 0.25);
            ctx.quadraticCurveTo(r * 0.5, -r * 0.9, r * 1.25, -r * 0.2);
            ctx.lineTo(r * 0.7, r * 0.5);
            ctx.lineTo(0, r * 0.25);
            ctx.lineTo(-r * 0.7, r * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (lv === 3 || lv === 4) {
            // Horned / Skull helm circle
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = lv === 3 ? '#bef264' : '#cbd5e1';
            ctx.beginPath();
            ctx.moveTo(-r * 0.8, -r * 0.4);
            ctx.lineTo(-r * 1.25, -r * 0.85);
            ctx.lineTo(-r * 0.45, -r * 0.75);
            ctx.moveTo(r * 0.8, -r * 0.4);
            ctx.lineTo(r * 1.25, -r * 0.85);
            ctx.lineTo(r * 0.45, -r * 0.75);
            ctx.fill();
        } else if (boss) {
            // Abyss Dragon crowned crest
            ctx.beginPath();
            ctx.arc(0, 2, r * 0.95, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.moveTo(-r * 0.7, -r * 0.55);
            ctx.lineTo(-r * 0.95, -r * 1.25);
            ctx.lineTo(-r * 0.25, -r * 0.8);
            ctx.lineTo(0, -r * 1.32);
            ctx.lineTo(r * 0.25, -r * 0.8);
            ctx.lineTo(r * 0.95, -r * 1.25);
            ctx.lineTo(r * 0.7, -r * 0.55);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            // Gargoyle / Golem hexagon
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI) / 3 - Math.PI / 6;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // Angry Glowing Eyes
        ctx.fillStyle = boss ? '#fde047' : '#090d16';
        ctx.beginPath();
        ctx.arc(-r * 0.3, -r * 0.1, r * 0.16, 0, Math.PI * 2);
        ctx.arc(r * 0.3, -r * 0.1, r * 0.16, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawBoard() {
        ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
        const pad = 14;
        const size = (LOGICAL_SIZE - pad * 2) / session.cols;
        const h = session.hero;

        for (let r = 0; r < session.rows; r++) {
            for (let c = 0; c < session.cols; c++) {
                const cell = session.cells[r][c];
                const x = pad + c * size + 2;
                const y = pad + r * size + 2;
                const w = size - 4;
                const cx = x + w / 2;
                const cy = y + w / 2;
                const isHover = hoverCell && hoverCell.r === r && hoverCell.c === c && session.state === 'playing';
                const inScrollZone = actionMode === 'scroll' && hoverCell &&
                    Math.abs(hoverCell.r - r) <= 1 && Math.abs(hoverCell.c - c) <= 1;

                // Neighbor highlight if hovering a revealed clue tile
                const isNeighborOfHover = hoverCell && session.cells[hoverCell.r][hoverCell.c].revealed &&
                    session.cells[hoverCell.r][hoverCell.c].kind === 'empty' &&
                    session.cells[hoverCell.r][hoverCell.c].threatCount > 0 &&
                    Math.abs(hoverCell.r - r) <= 1 && Math.abs(hoverCell.c - c) <= 1 && !(hoverCell.r === r && hoverCell.c === c);

                ctx.save();

                if (cell.kind === 'rock') {
                    const rg = ctx.createLinearGradient(x, y, x + w, y + w);
                    rg.addColorStop(0, '#334155');
                    rg.addColorStop(1, '#1e293b');
                    ctx.fillStyle = rg;
                    ctx.beginPath();
                    ctx.roundRect(x, y, w, w, 8);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
                    ctx.lineWidth = 1.4;
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(148, 163, 184, 0.32)';
                    ctx.font = `bold ${Math.round(w * 0.36)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🪨', cx, cy + 1);
                    ctx.restore();
                    continue;
                }

                if (!cell.revealed) {
                    const g = ctx.createLinearGradient(x, y, x, y + w);
                    g.addColorStop(0, inScrollZone ? '#4c1d95' : (isHover ? '#313a59' : '#242942'));
                    g.addColorStop(1, inScrollZone ? '#2e1065' : '#16192b');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.roundRect(x, y, w, w, 8);
                    ctx.fill();

                    ctx.strokeStyle = inScrollZone
                        ? '#c084fc'
                        : (isNeighborOfHover ? '#fbbf24' : (isHover ? '#7dd3fc' : 'rgba(148, 163, 184, 0.22)'));
                    ctx.lineWidth = (inScrollZone || isNeighborOfHover || isHover) ? 2 : 1.2;
                    ctx.stroke();

                    if (cell.mark) {
                        ctx.font = `bold ${Math.round(w * 0.38)}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        if (cell.mark === 'flag') {
                            ctx.fillStyle = '#fb7185';
                            ctx.fillText('🚩', cx, cy + 1);
                        } else if (cell.mark === '?') {
                            ctx.fillStyle = '#fbbf24';
                            ctx.fillText('?', cx, cy + 1);
                        } else {
                            const lv = Number(cell.mark);
                            const col = (MONSTERS[lv] || MONSTERS[1]).color;
                            ctx.fillStyle = col;
                            ctx.fillText(`L${lv}`, cx, cy + 1);
                        }
                    }
                    ctx.restore();
                    continue;
                }

                // Revealed Tile Background
                ctx.fillStyle = '#0f1322';
                ctx.beginPath();
                ctx.roundRect(x, y, w, w, 8);
                ctx.fill();
                ctx.strokeStyle = isHover ? '#38bdf8' : 'rgba(148, 163, 184, 0.14)';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                if (cell.kind === 'monster' && !cell.slain) {
                    const safe = h.atk >= cell.monsterLv;
                    ctx.fillStyle = safe ? 'rgba(74, 222, 128, 0.12)' : 'rgba(244, 63, 94, 0.18)';
                    ctx.fill();
                    drawMonsterSprite(cx, cy - 3, w, cell.monsterLv, cell.boss);

                    // Top Level Pill + Slay/Warning tag
                    ctx.fillStyle = safe ? '#4ade80' : '#fb7185';
                    ctx.font = `bold ${Math.max(10, Math.round(w * 0.21))}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(safe ? `Lv.${cell.monsterLv}` : `Lv.${cell.monsterLv} (-${(cell.monsterLv - h.atk) * 2})`, cx, y + w - 8);
                } else if (cell.kind === 'item' && !cell.itemTaken) {
                    const icons = { potion: '❤️', forge: '⚔️', shield: '🛡️', scroll: '📜', chest: '💰' };
                    const tags = { potion: '+3HP', forge: '+1攻', shield: '+3盾', scroll: '+卷轴', chest: '+2XP' };
                    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * 0.45);
                    glow.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
                    glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
                    ctx.fillStyle = glow;
                    ctx.fillRect(x, y, w, w);

                    ctx.font = `${Math.round(w * 0.42)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(icons[cell.itemKind] || '✨', cx, cy - 4);
                    ctx.font = `bold ${Math.max(9, Math.round(w * 0.19))}px sans-serif`;
                    ctx.fillStyle = '#fde047';
                    ctx.fillText(tags[cell.itemKind] || '', cx, y + w - 8);
                } else if (cell.threatSum > 0) {
                    const sum = cell.threatSum;
                    const color = sum <= 2 ? '#4ade80' : (sum <= 5 ? '#38bdf8' : (sum <= 9 ? '#fbbf24' : '#fb7185'));
                    ctx.fillStyle = color;
                    ctx.font = `900 ${Math.round(w * 0.44)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(String(sum), cx, cy - 4);

                    // Threat Count pips along bottom!
                    const pips = Math.min(8, cell.threatCount);
                    const gap = Math.min(7, (w - 10) / Math.max(1, pips));
                    const startPx = cx - ((pips - 1) * gap) / 2;
                    ctx.fillStyle = '#c084fc';
                    for (let i = 0; i < pips; i++) {
                        ctx.beginPath();
                        ctx.arc(startPx + i * gap, y + w - 7, 2.2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (cell.kind === 'monster' && cell.slain) {
                    ctx.fillStyle = 'rgba(74, 222, 128, 0.35)';
                    ctx.font = `bold ${Math.round(w * 0.28)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('✓', cx, cy);
                } else {
                    ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
                    ctx.beginPath();
                    ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }
        }
    }

    function updateAndDrawFx(dt) {
        for (let i = slashes.length - 1; i >= 0; i--) {
            const s = slashes[i];
            s.life -= dt;
            if (s.life <= 0) { slashes.splice(i, 1); continue; }
            const a = s.life / s.maxLife;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 4 * a + 1;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x - s.size, s.y - s.size);
            ctx.lineTo(s.x + s.size, s.y + s.size);
            ctx.stroke();
            ctx.restore();
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            p.vy += 320 * dt;
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

        for (let i = popups.length - 1; i >= 0; i--) {
            const pop = popups[i];
            pop.life -= dt;
            pop.y -= 30 * dt;
            if (pop.life <= 0) { popups.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = Math.min(1, pop.life * 1.5);
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = 3;
            ctx.strokeText(pop.text, pop.x, pop.y);
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

        ctx.save();
        if (shakePower > 0.2) {
            ctx.translate((Math.random() - 0.5) * shakePower, (Math.random() - 0.5) * shakePower);
            shakePower *= Math.pow(0.02, dt);
        } else {
            shakePower = 0;
        }
        if (session) drawBoard();
        updateAndDrawFx(dt);
        ctx.restore();

        requestAnimationFrame(frame);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    startStage(save.currentStageIndex || 0);
    requestAnimationFrame(frame);
})();
