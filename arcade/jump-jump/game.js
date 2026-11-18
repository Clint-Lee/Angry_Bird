(function () {
    'use strict';

    const E = window.JumpJumpEngine;
    const AudioSys = window.JumpJumpAudio;
    const { CONFIG } = E;

    const canvas = document.getElementById('jumpCanvas');
    const ctx = canvas.getContext('2d');
    const W = 660;
    const H = 680;

    const el = {
        scoreVal: document.getElementById('scoreVal'),
        bestVal: document.getElementById('bestVal'),
        streakWrap: document.getElementById('streakWrap'),
        streakVal: document.getElementById('streakVal'),
        whisperHint: document.getElementById('whisperHint'),
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
    const chargeDots = [];
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
        chargeDots.length = 0;
        rings.length = 0;
        popups.length = 0;
        el.overModal.classList.add('hidden');
        el.whisperHint.classList.remove('fade-out');
        syncUI();
    }

    function syncUI() {
        const s = game.session;
        el.scoreVal.textContent = s.score.toLocaleString();
        el.bestVal.textContent = save.bestScore.toLocaleString();
        el.streakWrap.hidden = s.bullseyeStreak < 1;
        el.streakVal.textContent = `×${s.bullseyeStreak}`;
        el.btnMute.textContent = save.muted ? '🔇' : '🔊';
        if (s.jumps > 0) {
            el.whisperHint.classList.add('fade-out');
        }
    }

    // Authentic Isometric Projection (world x right-up, z left-up, y vertical)
    function iso(wx, wy, wz) {
        const cam = game.session.camera;
        const dx = wx - cam.x;
        const dz = wz - cam.z;
        const sx = W * 0.5 + (dx - dz) * 0.92;
        const sy = H * 0.61 - (dx + dz) * 0.49 - wy;
        return { x: sx, y: sy };
    }

    function spawnLandingParticles(wx, wy, wz, color, count) {
        const p = iso(wx, wy, wz);
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
            const spd = 55 + Math.random() * 95;
            particles.push({
                x: p.x,
                y: p.y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd * 0.56 - 24,
                r: 2 + Math.random() * 2.2,
                color,
                life: 0.46 + Math.random() * 0.2,
                maxLife: 0.66
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
                    rings.push({ x: pt.x, y: pt.y, r: 6, maxR: 64, color: 'rgba(255,255,255,0.9)', lineW: 3, life: 0.58 });
                    rings.push({ x: pt.x, y: pt.y, r: 4, maxR: 40, color: 'rgba(245,158,11,0.78)', lineW: 2, life: 0.46 });
                    spawnLandingParticles(ev.x, 0, ev.z, '#ffffff', 14);
                    popups.push({ x: pt.x, y: pt.y - 46, text: `+${ev.points}`, sub: ev.streak > 1 ? `连击 ×${ev.streak}` : '', color: '#1e293b', life: 0.95 });
                } else {
                    rings.push({ x: pt.x, y: pt.y, r: 5, maxR: 32, color: 'rgba(255,255,255,0.75)', lineW: 2.2, life: 0.36 });
                    popups.push({ x: pt.x, y: pt.y - 38, text: `+${ev.points}`, sub: ev.nearEdge ? '险!' : '', color: '#334155', life: 0.78 });
                }
                if (s.score > save.bestScore) {
                    save.bestScore = s.score;
                    persistSave();
                }
                syncUI();
            } else if (ev.type === 'bonus') {
                audio.playBonus();
                const pt = iso(ev.x, 12, ev.z);
                rings.push({ x: pt.x, y: pt.y, r: 8, maxR: 78, color: 'rgba(16,185,129,0.85)', lineW: 3, life: 0.65 });
                spawnLandingParticles(ev.x, 8, ev.z, '#10b981', 16);
                popups.push({ x: pt.x, y: pt.y - 52, text: `+${ev.bonus}`, sub: ev.name, color: '#047857', life: 1.25 });
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
        const isNewRec = s.score > 0 && s.score >= prevBest;
        save.bestScore = Math.max(save.bestScore, s.score);
        save.maxJumps = Math.max(save.maxJumps, s.jumps);
        save.bestCombo = Math.max(save.bestCombo, s.maxBullseyeStreak);
        save.gamesPlayed += 1;
        persistSave();
        syncUI();

        el.overBadge.textContent = isNewRec ? '新纪录' : '本局结束';
        el.overBadge.classList.toggle('new-rec', isNewRec);
        el.overTitle.textContent = isNewRec ? '刷新历史最高分' : '本局得分';
        el.overScore.textContent = s.score.toLocaleString();
        el.overBest.textContent = save.bestScore.toLocaleString();
        el.overJumps.textContent = `${s.jumps} 步`;
        el.overCombo.textContent = `×${s.maxBullseyeStreak}`;
        el.overModal.classList.remove('hidden');
    }

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
            if (!el.overModal.classList.contains('hidden')) {
                if (!e.repeat) startNewRun();
                return;
            }
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

    // Studio Pastel Environment Backdrop
    function drawBackground() {
        const jumps = game ? game.session.jumps : 0;
        const phase = Math.floor(jumps / 12) % 3;
        const bgStops = [
            ['#dbe8da', '#edf3ec'],
            ['#dae4f1', '#eef3fa'],
            ['#ede2d6', '#f7f1ea']
        ][phase];

        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, bgStops[0]);
        g.addColorStop(1, bgStops[1]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Soft ambient studio geometric bokeh
        const t = performance.now() * 0.0006;
        ctx.save();
        for (let i = 0; i < 6; i++) {
            const cx = ((i * 118) + Math.sin(t + i) * 18) % W;
            const cy = 64 + ((i * 86) % (H - 140)) + Math.cos(t * 1.2 + i) * 12;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
            ctx.beginPath();
            ctx.arc(cx, cy, 18 + (i % 3) * 11, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // Helper: Fill isometric parallelogram from affine top basis (origin + u + v)
    function drawIsoFace(x, y, z, duX, duZ, dvX, dvZ, fillStyle, wy = 0) {
        const a = iso(x, wy, z);
        const b = iso(x + duX, wy, z + duZ);
        const c = iso(x + duX + dvX, wy, z + dvZ);
        const d = iso(x + dvX, wy, z + dvZ);
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.closePath();
        ctx.fill();
    }

    function drawStandardDecor(p, baseY, botY) {
        const hw = p.halfW;
        const hd = p.halfD;
        if (p.style === 'grid') {
            ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
            const step = hw * 0.42;
            for (const sx of [-step, 0, step]) {
                for (const sz of [-step, 0, step]) {
                    const pt = iso(p.x + sx, baseY + 0.5, p.z + sz);
                    ctx.beginPath();
                    ctx.ellipse(pt.x, pt.y, 2.2, 1.2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (p.style === 'wood') {
            ctx.strokeStyle = 'rgba(146, 64, 14, 0.16)';
            ctx.lineWidth = 1.2;
            for (let i = -2; i <= 2; i++) {
                const offset = (i / 3) * hw;
                const a = iso(p.x - hw + 4, baseY, p.z + offset);
                const b = iso(p.x + hw - 4, baseY, p.z + offset);
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        } else if (p.style === 'slate') {
            // Subtle white rim inset on slate dark cube
            const i = hw * 0.72;
            const n = iso(p.x + i, baseY, p.z + i);
            const e = iso(p.x + i, baseY, p.z - i);
            const s = iso(p.x - i, baseY, p.z - i);
            const w = iso(p.x - i, baseY, p.z + i);
            ctx.strokeStyle = 'rgba(255,255,255,0.22)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y); ctx.lineTo(e.x, e.y);
            ctx.lineTo(s.x, s.y); ctx.lineTo(w.x, w.y);
            ctx.closePath();
            ctx.stroke();
        } else if (p.style === 'coaster') {
            // Subtle warm espresso coffee ring & center dot on ceramic top
            const ctr = iso(p.x, baseY, p.z);
            ctx.strokeStyle = 'rgba(180, 120, 72, 0.35)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(ctr.x, ctr.y, hw * 0.48, hw * 0.27, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (p.style === 'minimal' || p.style === 'cream') {
            // Clean architectural double-bevel band on side
            const bandTop = baseY - (baseY - botY) * 0.24;
            const b1 = iso(p.x - hw, bandTop, p.z + hd);
            const b2 = iso(p.x - hw, bandTop, p.z - hd);
            const b3 = iso(p.x + hw, bandTop, p.z - hd);
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b3.x, b3.y);
            ctx.stroke();
        }
    }

    function drawSpecialDecor(p, baseY, botY) {
        const hw = p.halfW;
        const hd = p.halfD;
        const kind = p.special.kind;
        const center = iso(p.x, baseY, p.z);

        if (kind === 'vinyl') {
            // Black spinning LP record & tonearm
            const rx = hw * 0.82;
            const ry = rx * 0.53;
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.16)';
            ctx.lineWidth = 1;
            for (const f of [0.8, 0.62, 0.44]) {
                ctx.beginPath();
                ctx.ellipse(center.x, center.y, rx * f, ry * f, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Spin sheen arc
            const spinA = clock * 2.4;
            ctx.strokeStyle = 'rgba(255,255,255,0.28)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(center.x, center.y, rx * 0.72, ry * 0.72, 0, spinA, spinA + 0.9);
            ctx.stroke();
            // Red center label
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.ellipse(center.x, center.y, rx * 0.25, ry * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.arc(center.x, center.y, 2, 0, Math.PI * 2);
            ctx.fill();
            // Metallic tonearm
            const armBase = iso(p.x + hw * 0.65, baseY, p.z + hd * 0.58);
            const armTip = iso(p.x + hw * 0.15, baseY, p.z + hd * 0.08);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(armBase.x, armBase.y);
            ctx.lineTo(armTip.x, armTip.y);
            ctx.stroke();
        } else if (kind === 'parcel') {
            // Brown kraft parcel tape cross top & shipping label on right face
            drawIsoFace(p.x - hw * 0.14, baseY, p.z - hd, hw * 0.28, 0, 0, hd * 2, '#f4d9a6', baseY);
            drawIsoFace(p.x - hw, baseY, p.z - hd * 0.12, hw * 2, 0, 0, hd * 0.24, 'rgba(244,217,166,0.72)', baseY);
            // Front parcel label
            const l1 = iso(p.x - hw * 0.2, baseY - 12, p.z - hd);
            const l2 = iso(p.x + hw * 0.45, baseY - 12, p.z - hd);
            const l3 = iso(p.x + hw * 0.45, baseY - 26, p.z - hd);
            const l4 = iso(p.x - hw * 0.2, baseY - 26, p.z - hd);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(l1.x, l1.y); ctx.lineTo(l2.x, l2.y);
            ctx.lineTo(l3.x, l3.y); ctx.lineTo(l4.x, l4.y);
            ctx.closePath();
            ctx.fill();
        } else if (kind === 'store') {
            // 24h Convenience Store striped canopy + warm window
            const stripes = 6;
            for (let i = 0; i < stripes; i++) {
                const f0 = i / stripes;
                const f1 = (i + 1) / stripes;
                const x0 = p.x - hw + f0 * hw * 2;
                const x1 = p.x - hw + f1 * hw * 2;
                const pA = iso(x0, baseY - 2, p.z - hd);
                const pB = iso(x1, baseY - 2, p.z - hd);
                const pC = iso(x1, baseY - 14, p.z - hd - 8);
                const pD = iso(x0, baseY - 14, p.z - hd - 8);
                ctx.fillStyle = (i % 2 === 0) ? '#ef4444' : '#ffffff';
                ctx.beginPath();
                ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y);
                ctx.lineTo(pC.x, pC.y); ctx.lineTo(pD.x, pD.y);
                ctx.closePath();
                ctx.fill();
            }
            // Illuminated 24h door window on right side
            const w1 = iso(p.x - hw * 0.45, baseY - 18, p.z - hd);
            const w2 = iso(p.x + hw * 0.45, baseY - 18, p.z - hd);
            const w3 = iso(p.x + hw * 0.45, botY + 2, p.z - hd);
            const w4 = iso(p.x - hw * 0.45, botY + 2, p.z - hd);
            ctx.fillStyle = '#bae6fd';
            ctx.beginPath();
            ctx.moveTo(w1.x, w1.y); ctx.lineTo(w2.x, w2.y);
            ctx.lineTo(w3.x, w3.y); ctx.lineTo(w4.x, w4.y);
            ctx.closePath();
            ctx.fill();
            // Subtle teal trim stripe
            const tA = iso(p.x - hw, baseY - 3, p.z + hd);
            const tB = iso(p.x - hw, baseY - 3, p.z - hd);
            const tC = iso(p.x + hw, baseY - 3, p.z - hd);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(tA.x, tA.y); ctx.lineTo(tB.x, tB.y); ctx.lineTo(tC.x, tC.y);
            ctx.stroke();
        } else if (kind === 'cube') {
            // Crisp 3x3 Rubik's Cube tiles across Top, Left & Right faces
            const colors = ['#ef4444', '#3b82f6', '#facc15', '#22c55e', '#f97316', '#ffffff'];
            const cell = (hw * 2) / 3;
            const pad = 2.2;
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    const col = colors[(r * 3 + c * 2) % colors.length];
                    drawIsoFace(
                        p.x - hw + c * cell + pad, baseY, p.z - hd + r * cell + pad,
                        cell - pad * 2, 0, 0, cell - pad * 2, col, baseY
                    );
                }
            }
            const hCell = (baseY - botY) / 3;
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    const yTop = baseY - r * hCell - 1.5;
                    const yBot = yTop - hCell + 3;
                    // Left face tiles
                    const z0 = p.z - hd + c * cell + pad;
                    const z1 = z0 + cell - pad * 2;
                    const la = iso(p.x - hw, yTop, z0), lb = iso(p.x - hw, yTop, z1);
                    const lc = iso(p.x - hw, yBot, z1), ld = iso(p.x - hw, yBot, z0);
                    ctx.fillStyle = colors[(r * 2 + c + 1) % colors.length];
                    ctx.beginPath();
                    ctx.moveTo(la.x, la.y); ctx.lineTo(lb.x, lb.y); ctx.lineTo(lc.x, lc.y); ctx.lineTo(ld.x, ld.y);
                    ctx.closePath(); ctx.fill();
                    // Right face tiles
                    const x0 = p.x - hw + c * cell + pad;
                    const x1 = x0 + cell - pad * 2;
                    const ra = iso(x0, yTop, p.z - hd), rb = iso(x1, yTop, p.z - hd);
                    const rc = iso(x1, yBot, p.z - hd), rd = iso(x0, yBot, p.z - hd);
                    ctx.fillStyle = colors[(r + c * 3 + 3) % colors.length];
                    ctx.beginPath();
                    ctx.moveTo(ra.x, ra.y); ctx.lineTo(rb.x, rb.y); ctx.lineTo(rc.x, rc.y); ctx.lineTo(rd.x, rd.y);
                    ctx.closePath(); ctx.fill();
                }
            }
        } else if (kind === 'clock') {
            // Classic analog clock face with live moving hands
            const rx = hw * 0.72;
            const ry = rx * 0.53;
            ctx.fillStyle = '#fffdf8';
            ctx.beginPath();
            ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            const minA = clock * 1.1;
            const hrA = clock * 0.18 - 0.8;
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(center.x + Math.cos(minA) * rx * 0.68, center.y + Math.sin(minA) * ry * 0.68);
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(center.x + Math.cos(hrA) * rx * 0.45, center.y + Math.sin(hrA) * ry * 0.45);
            ctx.stroke();
        }
    }

    function drawPlatform(p) {
        const dropOffset = p.spawnAnim > 0 ? Math.pow(p.spawnAnim, 2) * 140 : 0;
        const sinkY = -p.squish * 34;
        const baseY = sinkY + dropOffset;
        const botY = -p.height + dropOffset - sinkY * 0.15;

        // Cast ground shadow aligned with 45-deg top-left sun
        const shadowCenter = iso(p.x - 14, -p.height - 2, p.z + 16);
        ctx.save();
        ctx.fillStyle = 'rgba(20, 30, 45, 0.13)';
        if (p.isRound) {
            ctx.beginPath();
            ctx.ellipse(shadowCenter.x, shadowCenter.y + 4, p.halfW * 1.15, p.halfW * 0.60, -0.18, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const hw = p.halfW;
            const hd = p.halfD;
            const s1 = iso(p.x - hw - 18, -p.height - 2, p.z + hd + 18);
            const s2 = iso(p.x - hw, -p.height - 2, p.z - hd);
            const s3 = iso(p.x + hw, -p.height - 2, p.z - hd);
            const s4 = iso(p.x + hw - 18, -p.height - 2, p.z + hd + 18);
            ctx.beginPath();
            ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y);
            ctx.lineTo(s3.x, s3.y); ctx.lineTo(s4.x, s4.y);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        if (p.isRound) {
            const topC = iso(p.x, baseY, p.z);
            const botC = iso(p.x, botY, p.z);
            const rx = p.halfW * 1.18;
            const ry = p.halfW * 0.62;

            // Cylindrical shaded wall
            const cg = ctx.createLinearGradient(topC.x - rx, 0, topC.x + rx, 0);
            cg.addColorStop(0, p.colorLeft);
            cg.addColorStop(0.45, p.colorRight);
            cg.addColorStop(1, p.colorLeft);
            ctx.fillStyle = cg;
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
            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Subtle inner cylinder bevel + manhole radial slots on slate round pedestals
            ctx.strokeStyle = p.style === 'slate' ? 'rgba(255,255,255,0.22)' : 'rgba(15, 23, 42, 0.08)';
            ctx.beginPath();
            ctx.ellipse(topC.x, topC.y, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
            ctx.stroke();
            if (p.style === 'slate') {
                ctx.beginPath();
                ctx.ellipse(topC.x, topC.y, rx * 0.38, ry * 0.38, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else {
            const hw = p.halfW;
            const hd = p.halfD;
            const tN = iso(p.x + hw, baseY, p.z + hd);
            const tE = iso(p.x + hw, baseY, p.z - hd);
            const tS = iso(p.x - hw, baseY, p.z - hd);
            const tW = iso(p.x - hw, baseY, p.z + hd);

            const bE = iso(p.x + hw, botY, p.z - hd);
            const bS = iso(p.x - hw, botY, p.z - hd);
            const bW = iso(p.x - hw, botY, p.z + hd);

            ctx.fillStyle = p.colorLeft;
            ctx.beginPath();
            ctx.moveTo(tW.x, tW.y); ctx.lineTo(tS.x, tS.y);
            ctx.lineTo(bS.x, bS.y); ctx.lineTo(bW.x, bW.y);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = p.colorRight;
            ctx.beginPath();
            ctx.moveTo(tS.x, tS.y); ctx.lineTo(tE.x, tE.y);
            ctx.lineTo(bE.x, bE.y); ctx.lineTo(bS.x, bS.y);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = p.colorTop;
            ctx.beginPath();
            ctx.moveTo(tN.x, tN.y); ctx.lineTo(tE.x, tE.y);
            ctx.lineTo(tS.x, tS.y); ctx.lineTo(tW.x, tW.y);
            ctx.closePath();
            ctx.fill();

            // Top specular highlight edge
            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(tW.x, tW.y); ctx.lineTo(tS.x, tS.y); ctx.lineTo(tE.x, tE.y);
            ctx.stroke();

            if (p.special) {
                drawSpecialDecor(p, baseY, botY);
            } else {
                drawStandardDecor(p, baseY, botY);
            }
        }
    }

    function drawPlayerPiece() {
        const s = game.session;
        const p = s.player;
        const curPlat = s.platforms[s.currentIndex];
        const surfaceY = curPlat ? -curPlat.squish * 34 : 0;
        const shadowPt = iso(p.x, s.state === 'falling' || s.state === 'lost' ? -60 : surfaceY, p.z);
        const heroPt = iso(p.x, Math.max(-130, p.y), p.z);

        // Soft cast piece shadow
        if (s.state !== 'lost') {
            const shadowScale = Math.max(0.4, 1 - Math.max(0, p.y) / 160);
            ctx.save();
            ctx.fillStyle = `rgba(15, 23, 42, ${(0.22 * shadowScale).toFixed(2)})`;
            ctx.beginPath();
            ctx.ellipse(shadowPt.x - 4, shadowPt.y + 3, 14 * shadowScale, 7.5 * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Authentic inward swirling white charge particles + shrinking tension ring
        if (s.state === 'charging') {
            const chargeFrac = Math.min(1, s.chargeTime / CONFIG.maxChargeSec);
            const ringR = 26 - chargeFrac * 12;
            ctx.save();
            ctx.strokeStyle = chargeFrac > 0.7 ? 'rgba(245, 158, 11, 0.65)' : 'rgba(15, 23, 42, 0.25)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(shadowPt.x, shadowPt.y + 1, ringR, ringR * 0.54, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            if (Math.random() < 0.45) {
                const ang = Math.random() * Math.PI * 2;
                const r = 34 + Math.random() * 14;
                chargeDots.push({
                    x: shadowPt.x + Math.cos(ang) * r,
                    y: shadowPt.y + Math.sin(ang) * r * 0.56 - 6,
                    tx: shadowPt.x,
                    ty: shadowPt.y - 8,
                    life: 0.35
                });
            }
        } else if (s.state === 'idle' && s.stayTimer > 0) {
            const prog = Math.min(1, s.stayTimer / CONFIG.bonusStayTime);
            ctx.save();
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.88)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(shadowPt.x, shadowPt.y, 26, 14.5, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
            ctx.stroke();
            ctx.restore();
        }

        // Charge squash + Landing bounce squash + Edge wobble
        const chargeRatio = s.state === 'charging' ? (s.chargeTime / CONFIG.maxChargeSec) : 0;
        const squashAmt = Math.max(chargeRatio * 0.38, p.landSquash * 0.8);
        const scaleY = Math.max(0.56, 1 - squashAmt);
        const scaleX = 1 + squashAmt * 0.45;
        const wobbleAng = p.wobble > 0 ? Math.sin(p.wobble * Math.PI * 5) * p.wobble * 0.24 * p.wobbleDir : 0;

        ctx.save();
        ctx.translate(heroPt.x, heroPt.y);

        // Rotate around center of mass (0, -24) when flipping in air!
        if (s.state === 'jumping') {
            ctx.translate(0, -24);
            ctx.rotate(p.flipRot);
            ctx.translate(0, 24);
        } else if (s.state === 'falling' || s.state === 'lost') {
            ctx.rotate(p.fallTilt);
        } else if (wobbleAng) {
            ctx.rotate(wobbleAng);
        }

        ctx.scale(scaleX, scaleY);

        // Iconic WeChat "i" Chess Pawn Silhouette (slate-charcoal obsidian with 3D sheen)
        const bodyGrad = ctx.createLinearGradient(-12, -32, 12, 0);
        bodyGrad.addColorStop(0, '#474e68');
        bodyGrad.addColorStop(0.55, '#2b3042');
        bodyGrad.addColorStop(1, '#1a1d29');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-12.5, 0);
        ctx.quadraticCurveTo(-10.5, -15, -5.8, -28);
        ctx.quadraticCurveTo(0, -26.5, 5.8, -28);
        ctx.quadraticCurveTo(10.5, -15, 12.5, 0);
        ctx.quadraticCurveTo(0, 4, -12.5, 0);
        ctx.closePath();
        ctx.fill();

        // Subtle rim shine on left flank
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-10, -3);
        ctx.quadraticCurveTo(-8.5, -15, -4.6, -26);
        ctx.stroke();

        // Detached sphere head with 3D specular dot
        const headGrad = ctx.createRadialGradient(-3.5, -43, 1.5, 0, -40, 10.5);
        headGrad.addColorStop(0, '#646d8f');
        headGrad.addColorStop(0.55, '#2b3042');
        headGrad.addColorStop(1, '#161923');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(0, -40, 9.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function updateAndDrawFx(dt) {
        for (let i = chargeDots.length - 1; i >= 0; i--) {
            const d = chargeDots[i];
            d.life -= dt;
            if (d.life <= 0) { chargeDots.splice(i, 1); continue; }
            d.x += (d.tx - d.x) * Math.min(1, dt * 8);
            d.y += (d.ty - d.y) * Math.min(1, dt * 8);
            ctx.save();
            ctx.globalAlpha = Math.min(0.85, d.life * 2.4);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(d.x, d.y, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        for (let i = rings.length - 1; i >= 0; i--) {
            const r = rings[i];
            r.r += (r.maxR - r.r) * Math.min(1, dt * 7.5);
            r.life -= dt;
            if (r.life <= 0) { rings.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = Math.max(0, r.life * 1.6);
            ctx.strokeStyle = r.color;
            ctx.lineWidth = r.lineW || 2.5;
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.r, r.r * 0.54, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            p.vy += 240 * dt;
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
            ctx.globalAlpha = Math.min(1, pop.life * 1.45);
            ctx.textAlign = 'center';
            ctx.font = '800 20px sans-serif';
            ctx.fillStyle = pop.color;
            ctx.fillText(pop.text, pop.x, pop.y);
            if (pop.sub) {
                ctx.font = '700 12px sans-serif';
                ctx.fillText(pop.sub, pop.x, pop.y + 15);
            }
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
            const s = game.session;
            const chargeRatio = s.state === 'charging' ? (s.chargeTime / CONFIG.maxChargeSec) : 0;
            const camZoom = 1 + chargeRatio * 0.045;
            ctx.save();
            ctx.translate(W * 0.5, H * 0.58);
            ctx.scale(camZoom, camZoom);
            ctx.translate(-W * 0.5, -H * 0.58);

            // Painter's order: render back-to-front by isometric depth (x + z descending)
            // When falling below a block surface, sort player depth alongside platforms for natural occlusion!
            const items = s.platforms.map((p) => ({ kind: 'plat', depth: p.x + p.z, p }));
            const pDepth = (s.state === 'falling' || s.state === 'lost')
                ? (s.player.x + s.player.z)
                : -1e9;
            items.push({ kind: 'player', depth: pDepth });
            items.sort((a, b) => b.depth - a.depth);
            for (const it of items) {
                if (it.kind === 'plat') drawPlatform(it.p);
                else drawPlayerPiece();
            }

            // Floating music notes while waiting on vinyl turntable
            const curPlat = s.platforms[s.currentIndex];
            if (s.state === 'idle' && curPlat && curPlat.special && curPlat.special.kind === 'vinyl' && s.stayTimer > 0.1) {
                const pt = iso(curPlat.x, 42 + ((clock * 28) % 28), curPlat.z);
                ctx.save();
                ctx.font = 'bold 16px sans-serif';
                ctx.fillStyle = '#0f172a';
                ctx.fillText('♪', pt.x + Math.sin(clock * 5) * 10, pt.y);
                ctx.restore();
            }

            updateAndDrawFx(dt);
            ctx.restore();
        } else {
            updateAndDrawFx(dt);
        }

        requestAnimationFrame(frame);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    startNewRun();
    requestAnimationFrame(frame);
})();
