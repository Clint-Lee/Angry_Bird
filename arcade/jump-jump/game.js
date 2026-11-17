(function () {
    'use strict';

    const E = window.JumpJumpEngine;
    const AudioSys = window.JumpJumpAudio;
    const { CONFIG } = E;

    const canvas = document.getElementById('jumpCanvas');
    const ctx = canvas.getContext('2d');
    const W = 520;
    const H = 640;

    const el = {
        scoreVal: document.getElementById('scoreVal'),
        bestVal: document.getElementById('bestVal'),
        streakVal: document.getElementById('streakVal'),
        btnRestart: document.getElementById('btnRestart'),
        btnMute: document.getElementById('btnMute'),
        overModal: document.getElementById('overModal'),
        overBadge: document.getElementById('overBadge'),
        overTitle: document.getElementById('overTitle'),
        overScore: document.getElementById('overScore'),
        overBest: document.getElementById('overBest'),
        overJumps: document.getElementById('overJumps'),
        overCombo: document.getElementById('overCombo'),
        btnPlayAgain: document.getElementById('btnPlayAgain')
    };

    const audio = new AudioSys();
    let save = loadSave();
    audio.setMuted(save.muted);

    let game = null;
    let clock = 0;
    let holdPointerId = null;
    let spaceHeld = false;

    const particles = [];
    const rings = [];
    const popups = [];

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
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function startNewRun() {
        audio.stopCharge();
        holdPointerId = null;
        spaceHeld = false;
        game = E.createSession();
        particles.length = 0;
        rings.length = 0;
        popups.length = 0;
        el.overModal.classList.add('hidden');
        syncUI();
    }

    function syncUI() {
        const s = game.session;
        el.scoreVal.textContent = s.score.toLocaleString();
        el.bestVal.textContent = save.bestScore.toLocaleString();
        el.streakVal.textContent = `×${s.bullseyeStreak}`;
        el.btnMute.textContent = save.muted ? '🔇' : '🔊';
    }

    // Isometric Projection (Y-up world coords -> Canvas screen coords)
    function iso(wx, wy, wz) {
        const cam = game.session.camera;
        const dx = wx - cam.x;
        const dz = wz - cam.z;
        const sx = W * 0.5 + (dx - dz) * 0.82;
        const sy = H * 0.61 - (dx + dz) * 0.44 - wy;
        return { x: sx, y: sy };
    }

    function spawnParticles(wx, wy, wz, color, count = 12) {
        const p = iso(wx, wy, wz);
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const spd = 70 + Math.random() * 110;
            particles.push({
                x: p.x,
                y: p.y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 45,
                r: 2.5 + Math.random() * 2.5,
                color,
                life: 0.48 + Math.random() * 0.25,
                maxLife: 0.72
            });
        }
    }

    function handleEvents(events) {
        const s = game.session;
        for (const ev of events) {
            if (ev.type === 'land') {
                audio.playLand(ev.bullseye, ev.streak);
                const pt = iso(ev.x, 0, ev.z);
                if (ev.bullseye) {
                    rings.push({ x: pt.x, y: pt.y, r: 8, maxR: 62, color: '#f59e0b', life: 0.55 });
                    spawnParticles(ev.x, 0, ev.z, '#fde047', 16);
                    popups.push({ x: pt.x, y: pt.y - 34, text: `正中靶心 +${ev.points}!`, color: '#b45309', life: 1.0 });
                } else {
                    rings.push({ x: pt.x, y: pt.y, r: 6, maxR: 34, color: '#38bdf8', life: 0.35 });
                    popups.push({ x: pt.x, y: pt.y - 26, text: `+${ev.points}`, color: '#0369a1', life: 0.85 });
                }
                if (s.score > save.bestScore) {
                    save.bestScore = s.score;
                    persistSave();
                }
                syncUI();
            } else if (ev.type === 'bonus') {
                audio.playBonus();
                const pt = iso(ev.x, 20, ev.z);
                rings.push({ x: pt.x, y: pt.y, r: 10, maxR: 84, color: '#10b981', life: 0.65 });
                spawnParticles(ev.x, 12, ev.z, '#4ade80', 22);
                popups.push({ x: pt.x, y: pt.y - 42, text: `✨ ${ev.name} 彩蛋 +${ev.bonus}!`, color: '#047857', life: 1.35 });
                if (s.score > save.bestScore) {
                    save.bestScore = s.score;
                    persistSave();
                }
                syncUI();
            } else if (ev.type === 'stay') {
                audio.playLand(false, 0);
            } else if (ev.type === 'miss') {
                audio.playFall();
            } else if (ev.type === 'lose') {
                onGameOver();
            }
        }
    }

    function onGameOver() {
        const s = game.session;
        const prevBest = save.bestScore;
        const isNewRec = s.score >= prevBest && s.score > 0;
        save.bestScore = Math.max(save.bestScore, s.score);
        save.maxJumps = Math.max(save.maxJumps, s.jumps);
        save.bestCombo = Math.max(save.bestCombo, s.maxBullseyeStreak);
        save.gamesPlayed += 1;
        persistSave();
        syncUI();

        el.overBadge.textContent = isNewRec ? 'NEW MAX RECORD!' : 'GAME OVER';
        el.overBadge.classList.toggle('new-rec', isNewRec);
        el.overTitle.textContent = isNewRec ? '🏆 刷新历史最高 MAX！' : '脚滑跌落了…';
        el.overScore.textContent = s.score.toLocaleString();
        el.overBest.textContent = save.bestScore.toLocaleString();
        el.overJumps.textContent = `${s.jumps} 步`;
        el.overCombo.textContent = `×${s.maxBullseyeStreak}`;
        el.overModal.classList.remove('hidden');
    }

    // Dual-Input Charging: BOTH Mouse/Touch Hold AND Spacebar Hold!
    function triggerStartCharge() {
        if (!game || game.session.state !== 'idle') return;
        if (game.beginCharge()) {
            audio.startCharge();
        }
    }

    function triggerReleaseJump() {
        if (!game || game.session.state !== 'charging') return;
        audio.stopCharge();
        game.releaseJump();
    }

    canvas.addEventListener('pointerdown', (e) => {
        if (holdPointerId !== null) return;
        holdPointerId = e.pointerId;
        try { canvas.setPointerCapture(e.pointerId); } catch {}
        triggerStartCharge();
    });

    const endPointer = (e) => {
        if (holdPointerId === null || (e.pointerId !== undefined && e.pointerId !== holdPointerId)) return;
        holdPointerId = null;
        triggerReleaseJump();
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (!el.overModal.classList.contains('hidden')) return;
            if (!e.repeat && !spaceHeld) {
                spaceHeld = true;
                triggerStartCharge();
            }
        } else if ((e.key === 'r' || e.key === 'R' || e.key === 'Enter') && !el.overModal.classList.contains('hidden')) {
            startNewRun();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' && spaceHeld) {
            e.preventDefault();
            spaceHeld = false;
            triggerReleaseJump();
        }
    });

    el.btnRestart.addEventListener('click', startNewRun);
    el.btnPlayAgain.addEventListener('click', startNewRun);
    el.btnMute.addEventListener('click', () => {
        save.muted = !save.muted;
        audio.setMuted(save.muted);
        persistSave();
        syncUI();
    });

    // Isometric 2.5D Scene Renderer
    function drawBackground() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#eef7f0');
        g.addColorStop(0.55, '#dbeafe');
        g.addColorStop(1, '#ede9fe');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    function drawPlatform(p) {
        const sinkY = -p.squish * 34;
        const baseY = sinkY;
        const botY = -p.height - sinkY * 0.15;

        // Ground shadow under platform
        const shadowBase = iso(p.x + 12, -p.height - 6, p.z - 10);
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
        ctx.beginPath();
        ctx.ellipse(shadowBase.x, shadowBase.y + 8, p.halfW * 1.15, p.halfW * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.isRound) {
            const topC = iso(p.x, baseY, p.z);
            const botC = iso(p.x, botY, p.z);
            const rx = p.halfW * 1.14;
            const ry = p.halfW * 0.62;

            ctx.fillStyle = p.colorRight;
            ctx.beginPath();
            ctx.ellipse(botC.x, botC.y, rx, ry, 0, 0, Math.PI);
            ctx.lineTo(topC.x - rx, topC.y);
            ctx.lineTo(topC.x + rx, topC.y);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = p.colorTop;
            ctx.beginPath();
            ctx.ellipse(topC.x, topC.y, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(15,23,42,0.12)';
            ctx.stroke();
        } else {
            const hw = p.halfW;
            const hd = p.halfD;
            // 4 top corners
            const tN = iso(p.x + hw, baseY, p.z + hd);
            const tE = iso(p.x + hw, baseY, p.z - hd);
            const tS = iso(p.x - hw, baseY, p.z - hd);
            const tW = iso(p.x - hw, baseY, p.z + hd);

            // 3 visible bottom corners
            const bE = iso(p.x + hw, botY, p.z - hd);
            const bS = iso(p.x - hw, botY, p.z - hd);
            const bW = iso(p.x - hw, botY, p.z + hd);

            // Left visible face (tW - tS - bS - bW)
            ctx.fillStyle = p.colorLeft;
            ctx.beginPath();
            ctx.moveTo(tW.x, tW.y); ctx.lineTo(tS.x, tS.y);
            ctx.lineTo(bS.x, bS.y); ctx.lineTo(bW.x, bW.y);
            ctx.closePath();
            ctx.fill();

            // Right visible face (tS - tE - bE - bS)
            ctx.fillStyle = p.colorRight;
            ctx.beginPath();
            ctx.moveTo(tS.x, tS.y); ctx.lineTo(tE.x, tE.y);
            ctx.lineTo(bE.x, bE.y); ctx.lineTo(bS.x, bS.y);
            ctx.closePath();
            ctx.fill();

            // Top face
            ctx.fillStyle = p.colorTop;
            ctx.beginPath();
            ctx.moveTo(tN.x, tN.y); ctx.lineTo(tE.x, tE.y);
            ctx.lineTo(tS.x, tS.y); ctx.lineTo(tW.x, tW.y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(15,23,42,0.12)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        // Special Bonus Decoration & Stay-Timer Ring
        const centerPt = iso(p.x, baseY, p.z);
        if (p.special) {
            ctx.save();
            ctx.fillStyle = p.accent;
            ctx.beginPath();
            ctx.ellipse(centerPt.x, centerPt.y, 16, 9, 0, 0, Math.PI * 2);
            ctx.fill();

            if (!p.bonusAwarded) {
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`+${p.special.bonus}`, centerPt.x, centerPt.y + 4);
            }
            ctx.restore();
        } else {
            // Subtle center bullseye dot
            ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
            ctx.beginPath();
            ctx.ellipse(centerPt.x, centerPt.y, 6, 3.2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawPlayerPiece() {
        const s = game.session;
        const p = s.player;
        const shadowPt = iso(p.x, 0, p.z);
        const heroPt = iso(p.x, Math.max(-90, p.y), p.z);

        // Shadow on surface below
        ctx.save();
        const shadowScale = Math.max(0.45, 1 - Math.max(0, p.y) / 170);
        ctx.fillStyle = `rgba(15, 23, 42, ${(0.25 * shadowScale).toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(shadowPt.x, shadowPt.y + 2, 13 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Charge halo + Stay bonus progress halo
        if (s.state === 'charging') {
            const ratio = s.chargeTime / CONFIG.maxChargeSec;
            ctx.save();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.72)';
            ctx.lineWidth = 2.5;
            const ringR = 32 - ratio * 16;
            ctx.beginPath();
            ctx.ellipse(shadowPt.x, shadowPt.y, ringR, ringR * 0.56, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (s.state === 'idle' && s.stayTimer > 0) {
            const prog = Math.min(1, s.stayTimer / CONFIG.bonusStayTime);
            ctx.save();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.ellipse(shadowPt.x, shadowPt.y, 24, 14, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
            ctx.stroke();
            ctx.restore();
        }

        // Sleek Chess-Piece Character with Charge Squash & Mid-air Flip!
        const chargeRatio = s.state === 'charging' ? (s.chargeTime / CONFIG.maxChargeSec) : 0;
        const scaleY = 1 - chargeRatio * 0.42;
        const scaleX = 1 + chargeRatio * 0.24;

        ctx.save();
        ctx.translate(heroPt.x, heroPt.y);
        ctx.rotate(s.state === 'falling' || s.state === 'lost' ? p.fallTilt : p.flipRot);
        ctx.scale(scaleX, scaleY);

        // Piece conical body
        const bg = ctx.createLinearGradient(-12, -40, 12, 0);
        bg.addColorStop(0, '#4f46e5');
        bg.addColorStop(0.6, '#312e81');
        bg.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.quadraticCurveTo(-10, -22, -5, -30);
        ctx.lineTo(5, -30);
        ctx.quadraticCurveTo(10, -22, 12, 0);
        ctx.closePath();
        ctx.fill();

        // Piece head sphere
        const hg = ctx.createRadialGradient(-3, -41, 1, 0, -38, 10);
        hg.addColorStop(0, '#818cf8');
        hg.addColorStop(1, '#312e81');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(0, -38, 9.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function updateAndDrawFx(dt) {
        for (let i = rings.length - 1; i >= 0; i--) {
            const r = rings[i];
            r.r += (r.maxR - r.r) * Math.min(1, dt * 8);
            r.life -= dt;
            if (r.life <= 0) { rings.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = Math.max(0, r.life * 1.6);
            ctx.strokeStyle = r.color;
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.r, r.r * 0.56, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            p.vy += 260 * dt;
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
            pop.y -= 28 * dt;
            if (pop.life <= 0) { popups.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = Math.min(1, pop.life * 1.4);
            ctx.font = 'bold 16px sans-serif';
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

        if (game && game.session.state !== 'lost') {
            const ev = game.step(dt);
            if (ev.length > 0) handleEvents(ev);
        }

        drawBackground();
        if (game) {
            // Painter's order: draw back-to-front by isometric depth (x + z descending)
            const sorted = game.session.platforms.slice().sort((a, b) => (b.x + b.z) - (a.x + a.z));
            for (const p of sorted) drawPlatform(p);
            drawPlayerPiece();
        }
        updateAndDrawFx(dt);

        requestAnimationFrame(frame);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    startNewRun();
    requestAnimationFrame(frame);
})();
