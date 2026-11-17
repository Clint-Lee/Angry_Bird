(function () {
    'use strict';

    const E = window.FruitMergeEngine;
    const AudioCls = window.FruitMergeAudio;

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const previewCanvas = document.getElementById('nextPreviewCanvas');
    const previewCtx = previewCanvas.getContext('2d');
    const jarFrame = document.getElementById('jarFrame');

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = E.ARENA.width * DPR;
    canvas.height = E.ARENA.height * DPR;

    const audio = new AudioCls();

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
        } catch { /* ignore storage quota errors */ }
    }

    let world = null;
    let lastDropAt = 0;
    let activeTool = null; // null | 'wand' | 'spoon'
    let hoverBodyId = null;
    let pointerDownInside = false;
    let rafId = null;
    let lastTs = 0;

    // Visual particle, juice splash & popup effects
    const particles = [];
    const splashes = [];
    const rings = [];
    const popups = [];
    let jarKickTimer = 0;

    // DOM elements
    const scoreValEl = document.getElementById('scoreVal');
    const goalLabelEl = document.getElementById('goalLabel');
    const goalValEl = document.getElementById('goalVal');
    const nextNameTextEl = document.getElementById('nextNameText');
    const stagePillEl = document.getElementById('stagePill');
    const movesBadgeEl = document.getElementById('movesBadge');
    const missionDescEl = document.getElementById('missionDesc');
    const dangerMeterWrapEl = document.getElementById('dangerMeterWrap');
    const dangerFillEl = document.getElementById('dangerFill');
    const comboPillEl = document.getElementById('comboPill');
    const toolBannerEl = document.getElementById('toolBanner');
    const toolBannerTextEl = document.getElementById('toolBannerText');
    const countWandEl = document.getElementById('countWand');
    const countSpoonEl = document.getElementById('countSpoon');
    const countShakeEl = document.getElementById('countShake');
    const energyTextEl = document.getElementById('energyText');
    const energyFillEl = document.getElementById('energyFill');
    const dexStripEl = document.getElementById('dexStrip');

    function tierLabel(tier) {
        const def = E.TIERS[tier] || E.TIERS[0];
        return save.theme === 'critters' ? def.critterName : def.fruitName;
    }

    function buildDexStrip() {
        dexStripEl.innerHTML = '';
        E.TIERS.forEach((def) => {
            const unlocked = def.tier <= Math.max(save.highestTier, world ? world.maxTierSeen : 0);
            const node = document.createElement('div');
            node.className = 'dex-node' + (unlocked ? ' unlocked' : '');
            node.title = `${def.tier + 1}阶 ${tierLabel(def.tier)}`;
            const dot = document.createElement('span');
            dot.className = 'dex-dot';
            dot.style.background = `radial-gradient(circle at 32% 28%, ${def.rim}, ${def.colorA} 45%, ${def.colorB} 100%)`;
            const lbl = document.createElement('span');
            lbl.textContent = unlocked ? tierLabel(def.tier).slice(0, 3) : '???';
            node.appendChild(dot);
            node.appendChild(lbl);
            dexStripEl.appendChild(node);
        });
    }

    function renderNextPreview() {
        const w = 60;
        const h = 60;
        previewCtx.clearRect(0, 0, w, h);
        if (!world) return;
        const def = E.TIERS[world.nextTier];
        drawEntityArt(previewCtx, w / 2, h / 2 + 2, 18, world.nextTier, 0, {
            happy: false, worried: false, blinking: false, falling: false, frozen: false
        });
        nextNameTextEl.textContent = tierLabel(def.tier);
    }

    function syncHud(scoreBump) {
        if (!world) return;
        if (scoreBump) {
            scoreValEl.classList.remove('pop');
            void scoreValEl.offsetWidth;
            scoreValEl.classList.add('pop');
        }
        scoreValEl.textContent = world.score.toLocaleString();
        if (world.score > save.endlessHighScore) {
            save.endlessHighScore = world.score;
            persistSave();
            const nr = document.getElementById('newRecordTag');
            if (nr) nr.hidden = false;
        }
        goalLabelEl.childNodes[0].textContent = '历史最高 MAX ';
        goalValEl.textContent = save.endlessHighScore.toLocaleString();
        stagePillEl.textContent = '经典无尽高分';
        movesBadgeEl.textContent = `已落 ${world.dropsUsed} 枚`;
        missionDescEl.textContent = `最高合体：${tierLabel(world.maxTierSeen)} · 两颗大西瓜触碰更可引爆超级满贯！`;

        const ratio = Math.min(1, world.overflowTime / world.overflowLimit);
        dangerFillEl.style.width = `${Math.round(ratio * 100)}%`;
        dangerMeterWrapEl.classList.toggle('is-alert', world.inDanger || ratio > 0.15);
        dangerMeterWrapEl.querySelector('span').textContent = world.inDanger ? '即将溢出！' : '警戒线安全';

        if (world.combo >= 2 && world.comboTimer > 0) {
            comboPillEl.hidden = false;
            comboPillEl.textContent = `连消 ×${world.combo}`;
        } else {
            comboPillEl.hidden = true;
        }

        countWandEl.textContent = String(world.tools.wand);
        countSpoonEl.textContent = String(world.tools.spoon);
        countShakeEl.textContent = String(world.tools.shake);
        document.getElementById('toolWand').disabled = world.tools.wand <= 0;
        document.getElementById('toolSpoon').disabled = world.tools.spoon <= 0;
        document.getElementById('toolShake').disabled = world.tools.shake <= 0;
        energyTextEl.textContent = `${world.energy}/${world.energyGoal}`;
        energyFillEl.style.width = `${Math.round((world.energy / world.energyGoal) * 100)}%`;

        renderNextPreview();
        buildDexStrip();
    }

    function setActiveTool(tool) {
        if (activeTool === tool) tool = null;
        activeTool = tool;
        document.getElementById('toolWand').classList.toggle('is-armed', activeTool === 'wand');
        document.getElementById('toolSpoon').classList.toggle('is-armed', activeTool === 'spoon');
        if (activeTool === 'wand') {
            toolBannerEl.hidden = false;
            toolBannerTextEl.textContent = '🪄 点击罐内任意未满阶果实，直接进化 +1 阶！';
        } else if (activeTool === 'spoon') {
            toolBannerEl.hidden = false;
            toolBannerTextEl.textContent = '🥄 点击罐内任意未冰封果实，立即挖走腾出空位！';
        } else {
            toolBannerEl.hidden = true;
        }
    }

    function spawnJuiceBurst(x, y, color, count, radiusScale) {
        const n = count || 14;
        const sc = radiusScale || 1;
        for (let i = 0; i < n; i++) {
            const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.45;
            const spd = (95 + Math.random() * 200) * sc;
            particles.push({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 52,
                r: 2.6 + Math.random() * 4.2,
                color,
                life: 0.45 + Math.random() * 0.25,
                maxLife: 0.70
            });
        }
        if (splashes.length < 18) {
            const lobes = [];
            for (let k = 0; k < 6; k++) {
                const a = (Math.PI * 2 * k) / 6 + Math.random() * 0.4;
                lobes.push({ dx: Math.cos(a) * (14 + Math.random() * 14) * sc, dy: Math.sin(a) * (14 + Math.random() * 14) * sc, r: (5 + Math.random() * 6) * sc });
            }
            splashes.push({ x, y, r: 22 * sc, color, lobes, life: 0.9, maxLife: 0.9 });
        }
        rings.push({ x, y, r: 8, maxR: 52 * sc, color, life: 0.36, maxLife: 0.36 });
    }

    function spawnPopup(x, y, text, color) {
        popups.push({ x, y, text, color: color || '#ea580c', life: 0.95, maxLife: 0.95 });
    }

    function startSession() {
        world = E.createWorld({ mode: 'endless' });
        particles.length = 0;
        splashes.length = 0;
        rings.length = 0;
        popups.length = 0;
        lastDropAt = performance.now() - 100;
        const nr = document.getElementById('newRecordTag');
        if (nr) nr.hidden = true;
        setActiveTool(null);
        document.getElementById('resultModal').hidden = true;
        syncHud(false);
    }

    function openResultModal() {
        const modal = document.getElementById('resultModal');
        const emojiEl = document.getElementById('resultEmoji');
        const titleEl = document.getElementById('resultTitle');
        const subEl = document.getElementById('resultSub');
        const prevMax = save.endlessHighScore;
        const isNewRecord = world.score >= prevMax && world.score > 0;
        if (world.score > save.endlessHighScore) {
            save.endlessHighScore = world.score;
        }
        save.gamesPlayed = (save.gamesPlayed || 0) + 1;
        persistSave();
        audio.playLoss();
        document.getElementById('resScore').textContent = world.score.toLocaleString();
        document.getElementById('resCombo').textContent = `×${Math.max(1, world.bestCombo)}`;
        document.getElementById('resMerges').textContent = String(world.merges);

        emojiEl.textContent = isNewRecord ? '🏆' : '🍉';
        titleEl.textContent = isNewRecord ? '刷新历史最高 MAX！' : '果罐已满 · 本局结束';
        subEl.textContent = `历史最高 MAX：${save.endlessHighScore.toLocaleString()} 分 · 最高合成：${tierLabel(world.maxTierSeen)}`;
        modal.hidden = false;
    }

    /* ---------------- Canvas Vector Art Renderer ---------------- */

    function drawEntityArt(c, x, y, r, tier, angle, state) {
        const def = E.TIERS[tier] || E.TIERS[0];
        c.save();
        c.translate(x, y);
        c.rotate(angle || 0);

        if (state && state.squash > 0) {
            const sx = 1 + state.squash * 0.28;
            const sy = 1 - state.squash * 0.22;
            c.scale(sx, sy);
        }

        // Outer soft drop shadow + ambient rim aura for large fruits
        if (tier >= 8) {
            c.beginPath();
            c.arc(0, 0, r + 4, 0, Math.PI * 2);
            c.fillStyle = tier === 10 ? 'rgba(250, 204, 21, 0.20)' : 'rgba(52, 211, 153, 0.14)';
            c.fill();
        }
        c.beginPath();
        c.arc(0, 3, r, 0, Math.PI * 2);
        c.fillStyle = 'rgba(120, 53, 15, 0.18)';
        c.fill();

        // Main volumetric spherical gradient
        const grad = c.createRadialGradient(-r * 0.32, -r * 0.34, r * 0.08, 0, 0, r);
        grad.addColorStop(0, def.rim);
        grad.addColorStop(0.42, def.colorA);
        grad.addColorStop(0.88, def.colorB);
        grad.addColorStop(1, def.colorB);
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.fillStyle = grad;
        c.fill();

        // Subtle warm bounced rim light along lower arc for true 3D depth
        c.beginPath();
        c.arc(0, 0, Math.max(2, r - 1.5), 0.25 * Math.PI, 0.78 * Math.PI);
        c.strokeStyle = 'rgba(255, 255, 255, 0.26)';
        c.lineWidth = Math.max(1.5, r * 0.06);
        c.stroke();

        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.lineWidth = Math.max(1.3, r * 0.055);
        c.strokeStyle = 'rgba(255, 255, 255, 0.48)';
        c.stroke();

        // Theme details
        if (save.theme === 'critters') {
            drawCritterDetails(c, r, tier, def);
        } else {
            drawFruitDetails(c, r, tier);
        }

        // Crisp upper specular highlight crescent + pinpoint glint
        c.beginPath();
        c.ellipse(-r * 0.32, -r * 0.38, r * 0.30, r * 0.14, -0.52, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255, 255, 255, 0.48)';
        c.fill();
        c.beginPath();
        c.arc(-r * 0.46, -r * 0.20, Math.max(1.2, r * 0.065), 0, Math.PI * 2);
        c.fillStyle = 'rgba(255, 255, 255, 0.42)';
        c.fill();

        // Expressive Eyes & Mouth
        drawCuteFace(c, r, state);

        // Ice Seal Overlay for frozen puzzle fruits
        if (state && state.frozen) {
            c.save();
            c.beginPath();
            c.arc(0, 0, r + 3, 0, Math.PI * 2);
            c.fillStyle = 'rgba(186, 230, 253, 0.48)';
            c.fill();
            c.lineWidth = 2.4;
            c.strokeStyle = '#e0f2fe';
            c.stroke();
            c.strokeStyle = 'rgba(255, 255, 255, 0.78)';
            c.lineWidth = 1.6;
            c.beginPath();
            c.moveTo(-r * 0.55, -r * 0.35);
            c.lineTo(r * 0.1, r * 0.18);
            c.lineTo(r * 0.52, -r * 0.28);
            c.stroke();
            c.restore();
        }

        c.restore();
    }

    function drawFruitDetails(c, r, tier) {
        c.save();
        if (tier === 0) {
            // Cherry: curved stem + bright cherry leaf + top crease
            c.strokeStyle = '#65a30d';
            c.lineWidth = Math.max(1.8, r * 0.11);
            c.lineCap = 'round';
            c.beginPath();
            c.moveTo(0, -r * 0.72);
            c.quadraticCurveTo(r * 0.14, -r * 1.15, r * 0.35, -r * 1.24);
            c.stroke();
            c.beginPath();
            c.ellipse(r * 0.28, -r * 0.98, r * 0.26, r * 0.12, -0.35, 0, Math.PI * 2);
            c.fillStyle = '#4ade80';
            c.fill();
        } else if (tier === 1) {
            // Strawberry: golden seeds with shadow dots + 5-petal emerald calyx
            for (let i = 0; i < 8; i++) {
                const a = (i * 0.78) + 0.35;
                const rad = (i % 2 === 0 ? 0.56 : 0.34) * r;
                const sx = Math.cos(a) * rad;
                const sy = Math.sin(a) * rad + r * 0.12;
                c.fillStyle = 'rgba(127, 29, 29, 0.35)';
                c.beginPath();
                c.arc(sx, sy + 0.9, 1.5, 0, Math.PI * 2);
                c.fill();
                c.fillStyle = '#fef08a';
                c.beginPath();
                c.ellipse(sx, sy, 1.3, 1.8, a * 0.2, 0, Math.PI * 2);
                c.fill();
            }
            c.fillStyle = '#16a34a';
            for (let k = -2; k <= 2; k++) {
                c.beginPath();
                c.ellipse(k * r * 0.18, -r * 0.80, r * 0.18, r * 0.08, k * 0.28, 0, Math.PI * 2);
                c.fill();
            }
        } else if (tier === 2) {
            // Grape: clustered velvety berry highlights + curly vine
            c.save();
            c.beginPath();
            c.arc(0, 0, r * 0.94, 0, Math.PI * 2);
            c.clip();
            const orbs = [[-0.36, -0.25, 0.34], [0.34, -0.22, 0.32], [-0.28, 0.34, 0.32], [0.30, 0.32, 0.30], [0, 0.45, 0.28]];
            for (const [ox, oy, rr] of orbs) {
                const g = c.createRadialGradient(ox * r - 2, oy * r - 2, 1, ox * r, oy * r, rr * r);
                g.addColorStop(0, 'rgba(237, 233, 254, 0.28)');
                g.addColorStop(1, 'rgba(91, 33, 182, 0.18)');
                c.fillStyle = g;
                c.beginPath();
                c.arc(ox * r, oy * r, rr * r, 0, Math.PI * 2);
                c.fill();
            }
            c.restore();
            c.strokeStyle = '#65a30d';
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(0, -r * 0.84);
            c.bezierCurveTo(r * 0.2, -r * 1.15, -r * 0.15, -r * 1.25, r * 0.18, -r * 1.28);
            c.stroke();
        } else if (tier === 3) {
            // Tangerine: citrus dimple stipples + green navel leaf
            c.fillStyle = 'rgba(180, 83, 9, 0.24)';
            for (let i = 0; i < 14; i++) {
                const a = i * 2.39996;
                const d = Math.sqrt((i + 1) / 15) * r * 0.78;
                c.beginPath();
                c.arc(Math.cos(a) * d, Math.sin(a) * d, 1.3, 0, Math.PI * 2);
                c.fill();
            }
            c.fillStyle = '#15803d';
            c.beginPath();
            c.arc(0, -r * 0.84, r * 0.11, 0, Math.PI * 2);
            c.fill();
            c.beginPath();
            c.ellipse(r * 0.22, -r * 0.90, r * 0.20, r * 0.09, -0.35, 0, Math.PI * 2);
            c.fillStyle = '#4ade80';
            c.fill();
        } else if (tier === 4) {
            // Fuji Apple: creamy golden blush + vertical stripe glaze + stem & leaf
            c.save();
            c.beginPath();
            c.arc(0, 0, r * 0.95, 0, Math.PI * 2);
            c.clip();
            const cheek = c.createRadialGradient(r * 0.32, r * 0.28, 2, r * 0.32, r * 0.28, r * 0.68);
            cheek.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
            cheek.addColorStop(1, 'rgba(254, 240, 138, 0)');
            c.fillStyle = cheek;
            c.fillRect(-r, -r, r * 2, r * 2);
            c.restore();
            c.strokeStyle = '#78350f';
            c.lineWidth = Math.max(2, r * 0.08);
            c.lineCap = 'round';
            c.beginPath();
            c.moveTo(0, -r * 0.72);
            c.quadraticCurveTo(r * 0.08, -r * 1.02, r * 0.16, -r * 1.10);
            c.stroke();
            c.beginPath();
            c.ellipse(r * 0.24, -r * 0.92, r * 0.24, r * 0.11, -0.45, 0, Math.PI * 2);
            c.fillStyle = '#22c55e';
            c.fill();
        } else if (tier === 5) {
            // Sweet Pear: warm rosy blush + subtle russet freckles + top leaf
            c.save();
            c.beginPath();
            c.arc(0, 0, r * 0.95, 0, Math.PI * 2);
            c.clip();
            const blush = c.createRadialGradient(r * 0.38, r * 0.18, 2, r * 0.38, r * 0.18, r * 0.55);
            blush.addColorStop(0, 'rgba(251, 113, 133, 0.32)');
            blush.addColorStop(1, 'rgba(251, 113, 133, 0)');
            c.fillStyle = blush;
            c.fillRect(-r, -r, r * 2, r * 2);
            c.fillStyle = 'rgba(146, 64, 14, 0.22)';
            for (let i = 0; i < 12; i++) {
                const a = i * 1.9 + 0.5;
                const d = (0.35 + (i % 4) * 0.14) * r;
                c.beginPath();
                c.arc(Math.cos(a) * d, Math.sin(a) * d, 1.3, 0, Math.PI * 2);
                c.fill();
            }
            c.restore();
            c.strokeStyle = '#78350f';
            c.lineWidth = 2.4;
            c.beginPath();
            c.moveTo(0, -r * 0.80);
            c.lineTo(0, -r * 1.08);
            c.stroke();
        } else if (tier === 6) {
            // Peach: creamy sunlit tip + soft vertical cleft dimple + twin leaves
            c.save();
            c.beginPath();
            c.arc(0, 0, r * 0.95, 0, Math.PI * 2);
            c.clip();
            const tip = c.createRadialGradient(-r * 0.25, -r * 0.35, 2, 0, 0, r);
            tip.addColorStop(0, 'rgba(255, 251, 235, 0.42)');
            tip.addColorStop(1, 'rgba(255, 251, 235, 0)');
            c.fillStyle = tip;
            c.fillRect(-r, -r, r * 2, r * 2);
            c.strokeStyle = 'rgba(190, 24, 93, 0.24)';
            c.lineWidth = 2.2;
            c.beginPath();
            c.moveTo(0, -r * 0.92);
            c.quadraticCurveTo(r * 0.14, -r * 0.45, 0, -r * 0.16);
            c.stroke();
            c.restore();
            c.fillStyle = '#22c55e';
            for (const dir of [-1, 1]) {
                c.beginPath();
                c.ellipse(dir * r * 0.20, -r * 0.92, r * 0.22, r * 0.09, dir * 0.4, 0, Math.PI * 2);
                c.fill();
            }
        } else if (tier === 7) {
            // Pineapple: crisp diamond crosshatch + scale centers + spiky emerald crown
            c.save();
            c.beginPath();
            c.arc(0, 0, r * 0.92, 0, Math.PI * 2);
            c.clip();
            c.strokeStyle = 'rgba(146, 64, 14, 0.34)';
            c.lineWidth = 1.8;
            const step = r * 0.38;
            for (let d = -r * 1.6; d <= r * 1.6; d += step) {
                c.moveTo(d, -r); c.lineTo(d + r * 1.1, r);
                c.moveTo(d + r * 1.1, -r); c.lineTo(d, r);
            }
            c.stroke();
            c.restore();
            // Emerald spiky crown above top edge
            c.fillStyle = '#15803d';
            for (let k = -2; k <= 2; k++) {
                c.beginPath();
                c.moveTo(k * r * 0.13 - r * 0.08, -r * 0.84);
                c.lineTo(k * r * 0.20, -r * (1.28 - Math.abs(k) * 0.08));
                c.lineTo(k * r * 0.13 + r * 0.08, -r * 0.84);
                c.closePath();
                c.fill();
            }
        } else if (tier === 8) {
            // Coconut: tropical jade rind + subtle white equatorial highlight + hibiscus leaf
            c.save();
            c.beginPath();
            c.arc(0, 0, r * 0.94, 0, Math.PI * 2);
            c.clip();
            c.strokeStyle = 'rgba(6, 78, 59, 0.28)';
            c.lineWidth = 2.2;
            for (const off of [-0.52, -0.18, 0.18, 0.52]) {
                c.beginPath();
                c.moveTo(off * r, -r * 0.95);
                c.quadraticCurveTo(off * r * 1.25, 0, off * r, r * 0.95);
                c.stroke();
            }
            c.restore();
            // Cute coconut straw & tropical leaf
            c.strokeStyle = '#fef3c7';
            c.lineWidth = 4;
            c.lineCap = 'round';
            c.beginPath();
            c.moveTo(r * 0.24, -r * 0.78);
            c.lineTo(r * 0.38, -r * 1.12);
            c.lineTo(r * 0.55, -r * 1.14);
            c.stroke();
        } else if (tier === 9 || tier === 10) {
            // Cantaloupe netted cork lines OR King Watermelon jagged stripes + jeweled crown
            c.save();
            c.beginPath();
            c.arc(0, 0, r * 0.95, 0, Math.PI * 2);
            c.clip();
            if (tier === 9) {
                c.strokeStyle = 'rgba(236, 252, 203, 0.42)';
                c.lineWidth = 1.6;
                for (let d = -r * 1.5; d <= r * 1.5; d += r * 0.34) {
                    c.beginPath();
                    c.moveTo(d, -r);
                    c.bezierCurveTo(d + r * 0.25, -r * 0.2, d - r * 0.25, r * 0.2, d, r);
                    c.stroke();
                    c.beginPath();
                    c.moveTo(-r, d);
                    c.bezierCurveTo(-r * 0.2, d + r * 0.2, r * 0.2, d - r * 0.2, r, d);
                    c.stroke();
                }
            } else {
                // Iconic jagged watermelon tiger stripes
                c.strokeStyle = 'rgba(6, 78, 59, 0.56)';
                c.lineWidth = Math.max(4, r * 0.085);
                c.lineCap = 'round';
                c.lineJoin = 'round';
                for (const off of [-0.56, -0.22, 0.16, 0.52]) {
                    c.beginPath();
                    c.moveTo(off * r, -r * 0.92);
                    for (let stepY = -0.6; stepY <= 0.8; stepY += 0.35) {
                        const jx = (Math.round(stepY * 10) % 2 === 0 ? 0.09 : -0.06) * r;
                        c.lineTo((off + jx / r * 0.6) * r + jx, stepY * r);
                    }
                    c.stroke();
                }
            }
            c.restore();

            if (tier === 10) {
                // Golden King Crown with ruby gem
                c.fillStyle = '#fde047';
                c.strokeStyle = '#ca8a04';
                c.lineWidth = 1.6;
                c.beginPath();
                c.moveTo(-16, -r + 4);
                c.lineTo(-12, -r - 12);
                c.lineTo(-4, -r - 4);
                c.lineTo(0, -r - 15);
                c.lineTo(4, -r - 4);
                c.lineTo(12, -r - 12);
                c.lineTo(16, -r + 4);
                c.closePath();
                c.fill();
                c.stroke();
                c.fillStyle = '#ef4444';
                c.beginPath();
                c.arc(0, -r - 4, 2.6, 0, Math.PI * 2);
                c.fill();
            }
        }
        c.restore();
    }

    function drawCritterDetails(c, r, tier, def) {
        c.save();
        // Cute round/pointy ears per tier
        c.fillStyle = def.colorA;
        c.strokeStyle = def.colorB;
        c.lineWidth = 1.4;
        if (tier === 2) {
            // Bunny long ears
            for (const dir of [-1, 1]) {
                c.beginPath();
                c.ellipse(dir * r * 0.42, -r * 0.92, r * 0.18, r * 0.42, dir * 0.25, 0, Math.PI * 2);
                c.fill();
                c.stroke();
            }
        } else {
            for (const dir of [-1, 1]) {
                c.beginPath();
                c.arc(dir * r * 0.62, -r * 0.62, r * 0.26, 0, Math.PI * 2);
                c.fill();
                c.stroke();
                c.beginPath();
                c.arc(dir * r * 0.62, -r * 0.62, r * 0.14, 0, Math.PI * 2);
                c.fillStyle = '#fecdd3';
                c.fill();
                c.fillStyle = def.colorA;
            }
        }
        if (tier === 10) {
            c.fillStyle = '#fde047';
            c.beginPath();
            c.moveTo(-14, -r + 4);
            c.lineTo(-9, -r - 11);
            c.lineTo(0, -r - 3);
            c.lineTo(9, -r - 11);
            c.lineTo(14, -r + 4);
            c.closePath();
            c.fill();
        }
        c.restore();
    }

    function drawCuteFace(c, r, state) {
        const eyeDist = r * 0.29;
        const eyeY = -r * 0.04;
        const eyeR = Math.max(1.8, r * 0.088);

        // Rosy blush cheeks
        c.fillStyle = 'rgba(255, 107, 129, 0.36)';
        c.beginPath();
        c.ellipse(-eyeDist * 1.4, eyeY + r * 0.16, r * 0.14, r * 0.08, 0, 0, Math.PI * 2);
        c.ellipse(eyeDist * 1.4, eyeY + r * 0.16, r * 0.14, r * 0.08, 0, 0, Math.PI * 2);
        c.fill();

        c.strokeStyle = '#2b190e';
        c.fillStyle = '#2b190e';
        c.lineWidth = Math.max(1.4, r * 0.055);
        c.lineCap = 'round';

        if (state && state.happy) {
            // Cheerful ^_^ eyes
            for (const dir of [-1, 1]) {
                c.beginPath();
                c.arc(dir * eyeDist, eyeY + 1, eyeR * 1.25, Math.PI * 1.15, Math.PI * 1.85);
                c.stroke();
            }
        } else if (state && state.worried) {
            // Sweating >_< eyes
            for (const dir of [-1, 1]) {
                c.beginPath();
                c.moveTo(dir * eyeDist - eyeR, eyeY - eyeR * 0.6);
                c.lineTo(dir * eyeDist + eyeR, eyeY + eyeR * 0.6);
                c.moveTo(dir * eyeDist + eyeR, eyeY - eyeR * 0.6);
                c.lineTo(dir * eyeDist - eyeR, eyeY + eyeR * 0.6);
                c.stroke();
            }
        } else if (state && state.blinking) {
            for (const dir of [-1, 1]) {
                c.beginPath();
                c.moveTo(dir * eyeDist - eyeR, eyeY);
                c.lineTo(dir * eyeDist + eyeR, eyeY);
                c.stroke();
            }
        } else {
            for (const dir of [-1, 1]) {
                c.beginPath();
                c.arc(dir * eyeDist, eyeY, eyeR, 0, Math.PI * 2);
                c.fill();
                c.fillStyle = '#fff';
                c.beginPath();
                c.arc(dir * eyeDist - eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.36, 0, Math.PI * 2);
                c.fill();
                c.fillStyle = '#2b190e';
            }
        }

        // Tiny cute mouth
        if (state && state.falling) {
            c.beginPath();
            c.arc(0, eyeY + r * 0.21, Math.max(1.8, r * 0.08), 0, Math.PI * 2);
            c.fill();
        } else if (state && state.worried) {
            c.beginPath();
            c.arc(0, eyeY + r * 0.28, r * 0.14, Math.PI * 1.2, Math.PI * 1.8);
            c.stroke();
        } else {
            c.beginPath();
            c.arc(-r * 0.06, eyeY + r * 0.15, r * 0.075, 0.1, Math.PI - 0.1);
            c.arc(r * 0.06, eyeY + r * 0.15, r * 0.075, 0.1, Math.PI - 0.1);
            c.stroke();
        }
    }

    function renderFrame(dt) {
        ctx.save();
        ctx.scale(DPR, DPR);
        if (jarKickTimer > 0) {
            jarKickTimer = Math.max(0, jarKickTimer - dt);
        }
        const shakeAmt = (world && world.shakeVisualTimer > 0 ? world.shakeVisualTimer * 10 : 0) + (jarKickTimer * 14);
        if (shakeAmt > 0.05) {
            const sx = (Math.random() - 0.5) * shakeAmt;
            const sy = (Math.random() - 0.5) * shakeAmt * 0.7;
            ctx.translate(sx, sy);
        }
        const W = E.ARENA.width;
        const H = E.ARENA.height;

        // Warm glass jar interior backdrop
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#fffaf0');
        bgGrad.addColorStop(0.75, '#fef3dd');
        bgGrad.addColorStop(1, '#fbe6c2');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Wooden shelf floor
        ctx.fillStyle = '#d97706';
        ctx.fillRect(0, E.ARENA.floorY, W, H - E.ARENA.floorY);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(0, E.ARENA.floorY, W, 3);

        // Subtle side wall borders inside jar
        ctx.fillStyle = 'rgba(217, 119, 6, 0.11)';
        ctx.fillRect(0, 0, E.ARENA.wallL, E.ARENA.floorY);
        ctx.fillRect(E.ARENA.wallR, 0, W - E.ARENA.wallR, E.ARENA.floorY);

        // Danger threshold line
        const pulse = world && world.inDanger ? (0.45 + 0.45 * Math.sin(performance.now() * 0.012)) : 0.32;
        ctx.save();
        ctx.setLineDash([7, 6]);
        ctx.lineWidth = world && world.inDanger ? 2.4 : 1.6;
        ctx.strokeStyle = world && world.inDanger ? `rgba(220, 38, 38, ${pulse})` : 'rgba(234, 88, 12, 0.34)';
        ctx.beginPath();
        ctx.moveTo(E.ARENA.wallL, E.ARENA.dangerY);
        ctx.lineTo(E.ARENA.wallR, E.ARENA.dangerY);
        ctx.stroke();
        ctx.restore();

        if (!world) {
            ctx.restore();
            return;
        }

        // Drop guide line & ghost prediction ring when playing without tool armed
        if (world.status === 'playing' && !activeTool && (world.dropsLeft === null || world.dropsLeft > 0)) {
            const pred = world.predictDropY(world.aimX, world.currentTier);
            const curDef = E.TIERS[world.currentTier];

            ctx.save();
            ctx.setLineDash([4, 5]);
            ctx.strokeStyle = 'rgba(234, 88, 12, 0.35)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(pred.x, E.ARENA.spawnY + curDef.r + 4);
            ctx.lineTo(pred.x, pred.y - curDef.r);
            ctx.stroke();

            // Ghost landing circle
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = curDef.colorA;
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.arc(pred.x, pred.y, curDef.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Held fruit ready at top
            drawEntityArt(ctx, pred.x, E.ARENA.spawnY, curDef.r, world.currentTier, 0, {
                happy: false, worried: false, blinking: false, falling: false, frozen: false
            });
        }

        // Static bumper pegs
        for (const p of world.pegs) {
            const pg = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 2, p.x, p.y, p.r);
            pg.addColorStop(0, '#fde68a');
            pg.addColorStop(0.55, '#d97706');
            pg.addColorStop(1, '#78350f');
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = pg;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fffbeb';
            ctx.stroke();
        }

        // Dynamic fruits / critters
        for (const b of world.bodies) {
            const blinkMod = (b.blinkPhase % 3.6);
            drawEntityArt(ctx, b.x, b.y, b.r, b.tier, b.angle, {
                squash: b.squash,
                happy: b.happyTimer > 0,
                worried: world.inDanger && b.y - b.r < E.ARENA.dangerY + 34,
                blinking: blinkMod > 3.45,
                falling: b.vy > 280,
                frozen: b.frozen
            });

            if (activeTool && b.id === hoverBodyId && !b.frozen) {
                const allowed = activeTool === 'spoon' || (activeTool === 'wand' && b.tier < E.TIERS.length - 1);
                if (allowed) {
                    ctx.save();
                    ctx.setLineDash([5, 4]);
                    ctx.lineWidth = 2.6;
                    ctx.strokeStyle = activeTool === 'wand' ? '#db2777' : '#0284c7';
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, b.r + 5, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }

        // Translucent fruit juice splash decals on merges
        for (let i = splashes.length - 1; i >= 0; i--) {
            const sp = splashes[i];
            sp.life -= dt;
            if (sp.life <= 0) { splashes.splice(i, 1); continue; }
            const alpha = Math.min(0.24, (sp.life / sp.maxLife) * 0.28);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = sp.color;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
            ctx.fill();
            for (const lb of sp.lobes) {
                ctx.beginPath();
                ctx.arc(sp.x + lb.dx, sp.y + lb.dy, lb.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Expanding rings
        for (let i = rings.length - 1; i >= 0; i--) {
            const rg = rings[i];
            rg.life -= dt;
            if (rg.life <= 0) { rings.splice(i, 1); continue; }
            const p = 1 - rg.life / rg.maxLife;
            ctx.save();
            ctx.globalAlpha = (1 - p) * 0.72;
            ctx.strokeStyle = rg.color;
            ctx.lineWidth = 3 * (1 - p) + 1;
            ctx.beginPath();
            ctx.arc(rg.x, rg.y, rg.r + (rg.maxR - rg.r) * p, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Juice droplet particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.life -= dt;
            if (pt.life <= 0) { particles.splice(i, 1); continue; }
            pt.vy += 420 * dt;
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            ctx.save();
            ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Floating score/combo text
        for (let i = popups.length - 1; i >= 0; i--) {
            const pp = popups[i];
            pp.life -= dt;
            if (pp.life <= 0) { popups.splice(i, 1); continue; }
            pp.y -= 36 * dt;
            ctx.save();
            ctx.globalAlpha = Math.min(1, pp.life / 0.35);
            ctx.font = '800 15px Fredoka, "Noto Sans SC", sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = '#fff';
            ctx.strokeText(pp.text, pp.x, pp.y);
            ctx.fillStyle = pp.color;
            ctx.fillText(pp.text, pp.x, pp.y);
            ctx.restore();
        }

        // Subtle glass glare highlight overlay
        const glare = ctx.createLinearGradient(0, 0, 56, 0);
        glare.addColorStop(0, 'rgba(255,255,255,0.28)');
        glare.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glare;
        ctx.fillRect(10, 12, 24, E.ARENA.floorY - 24);

        ctx.restore();
    }

    function processEvents(events) {
        let scoreChanged = false;
        for (const ev of events) {
            if (ev.type === 'bounce') {
                audio.playBounce(ev.speed);
                if (ev.speed > 175 && particles.length < 140) {
                    const puffCount = ev.speed > 340 ? 5 : 3;
                    for (let i = 0; i < puffCount; i++) {
                        const ang = (Math.PI * 2 * i) / puffCount + Math.random() * 0.8;
                        const spd = 28 + Math.random() * 65;
                        particles.push({
                            x: ev.x,
                            y: ev.y,
                            vx: Math.cos(ang) * spd,
                            vy: Math.sin(ang) * spd - 24,
                            r: 1.8 + Math.random() * 2.2,
                            color: 'rgba(255, 250, 235, 0.9)',
                            life: 0.24 + Math.random() * 0.14,
                            maxLife: 0.38
                        });
                    }
                }
            } else if (ev.type === 'peg') {
                audio.playPeg();
                rings.push({ x: ev.x, y: ev.y, r: 10, maxR: 32, color: '#fbbf24', life: 0.22, maxLife: 0.22 });
            } else if (ev.type === 'merge') {
                const def = E.TIERS[ev.tier];
                scoreChanged = true;
                save.highestTier = Math.max(save.highestTier, ev.tier);
                if (ev.tier === 10) save.totalWatermelons = (save.totalWatermelons || 0) + 1;
                persistSave();
                audio.playMerge(ev.tier, ev.combo);
                spawnJuiceBurst(ev.x, ev.y, def.juice, 14 + ev.tier, 1 + ev.tier * 0.08);
                rings.push({ x: ev.x, y: ev.y, r: def.r * 0.6, maxR: def.r * 2.1 + 24, color: def.rim, life: 0.32, maxLife: 0.32 });
                if (ev.tier >= 6) {
                    jarKickTimer = Math.max(jarKickTimer, Math.min(0.24, 0.08 + (ev.tier - 5) * 0.03));
                }
                const msg = ev.combo >= 2 ? `+${ev.scoreDelta} · ${ev.combo}连消!` : `+${ev.scoreDelta}`;
                spawnPopup(ev.x, ev.y - 10, msg, ev.combo >= 2 ? '#e11d48' : '#d97706');
            } else if (ev.type === 'grandSlam') {
                scoreChanged = true;
                audio.playGrandSlam();
                jarKickTimer = 0.35;
                spawnJuiceBurst(ev.x, ev.y, '#22c55e', 34, 2.2);
                spawnJuiceBurst(ev.x, ev.y, '#fde047', 22, 1.9);
                spawnPopup(ev.x, ev.y - 16, `👑 大西瓜满贯 +${ev.scoreDelta}!`, '#15803d');
            } else if (ev.type === 'thaw') {
                audio.playThaw();
                spawnJuiceBurst(ev.x, ev.y, '#7dd3fc', 16, 1.15);
                spawnPopup(ev.x, ev.y - 12, '❄️ 寒冰解封！', '#0284c7');
            } else if (ev.type === 'toolEarned') {
                const names = { wand: '升阶魔棒', spoon: '美味小勺', shake: '晃一晃' };
                spawnPopup(E.ARENA.width * 0.5, 96, `🎁 充能满额：+1 ${names[ev.tool] || '道具'}`, '#059669');
            }
        }
        return scoreChanged;
    }

    function tick(ts) {
        if (!lastTs) lastTs = ts;
        const dt = Math.min(0.035, Math.max(0.001, (ts - lastTs) / 1000));
        lastTs = ts;

        if (world && world.status === 'playing') {
            const events = world.step(dt);
            const scoreChanged = processEvents(events);
            syncHud(scoreChanged);
            if (world.status !== 'playing') {
                openResultModal();
            }
        }
        renderFrame(dt);
        rafId = requestAnimationFrame(tick);
    }

    /* ---------------- Input Handling ---------------- */

    function canvasPoint(ev) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((ev.clientX - rect.left) / rect.width) * E.ARENA.width,
            y: ((ev.clientY - rect.top) / rect.height) * E.ARENA.height
        };
    }

    function findBodyAt(px, py) {
        if (!world) return null;
        for (let i = world.bodies.length - 1; i >= 0; i--) {
            const b = world.bodies[i];
            const dx = px - b.x;
            const dy = py - b.y;
            if (dx * dx + dy * dy <= (b.r + 6) * (b.r + 6)) {
                return b;
            }
        }
        return null;
    }

    canvas.addEventListener('pointerdown', (ev) => {
        if (!world || world.status !== 'playing') return;
        try { canvas.setPointerCapture(ev.pointerId); } catch {}
        const pt = canvasPoint(ev);
        pointerDownInside = true;
        if (activeTool) {
            const hit = findBodyAt(pt.x, pt.y);
            hoverBodyId = hit ? hit.id : null;
        } else {
            world.setAimX(pt.x);
        }
    });

    canvas.addEventListener('pointermove', (ev) => {
        if (!world || world.status !== 'playing') return;
        const pt = canvasPoint(ev);
        if (activeTool) {
            const hit = findBodyAt(pt.x, pt.y);
            hoverBodyId = hit ? hit.id : null;
        } else {
            world.setAimX(pt.x);
        }
    });

    canvas.addEventListener('pointerup', (ev) => {
        if (!pointerDownInside || !world || world.status !== 'playing') return;
        pointerDownInside = false;
        const pt = canvasPoint(ev);

        if (activeTool) {
            const hit = findBodyAt(pt.x, pt.y);
            if (!hit) {
                setActiveTool(null);
                return;
            }
            if (activeTool === 'spoon') {
                const scooped = world.useSpoon(hit.id);
                if (scooped) {
                    const def = E.TIERS[scooped.tier];
                    audio.playTool();
                    spawnJuiceBurst(scooped.x, scooped.y, def.juice, 14, 1);
                    spawnPopup(scooped.x, scooped.y - 8, '🥄 已挖走', '#0284c7');
                    setActiveTool(null);
                    syncHud(false);
                }
            } else if (activeTool === 'wand') {
                const res = world.useWand(hit.id);
                if (res && res.upgraded) {
                    const def = E.TIERS[res.upgraded.tier];
                    audio.playMerge(res.upgraded.tier, 2);
                    spawnJuiceBurst(res.upgraded.x, res.upgraded.y, def.juice, 18, 1.2);
                    spawnPopup(res.upgraded.x, res.upgraded.y - 12, `🪄 升至${tierLabel(res.upgraded.tier)}!`, '#db2777');
                    processEvents(res.events || []);
                    setActiveTool(null);
                    syncHud(true);
                    if (world.status !== 'playing') openResultModal();
                }
            }
            return;
        }

        const now = performance.now();
        if (now - lastDropAt < 240) return;
        world.setAimX(pt.x);
        const dropped = world.drop(pt.x);
        if (dropped) {
            lastDropAt = now;
            audio.playDrop();
            syncHud(false);
        }
    });

    canvas.addEventListener('pointercancel', () => { pointerDownInside = false; });

    window.addEventListener('keydown', (ev) => {
        if (!world || world.status !== 'playing') return;
        if (!document.getElementById('resultModal').hidden) return;
        if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') {
            ev.preventDefault();
            world.setAimX(world.aimX - 18);
        } else if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D') {
            ev.preventDefault();
            world.setAimX(world.aimX + 18);
        } else if (ev.key === ' ' || ev.key === 'Enter' || ev.key === 'ArrowDown') {
            ev.preventDefault();
            const now = performance.now();
            if (now - lastDropAt >= 240 && !activeTool) {
                const dropped = world.drop(world.aimX);
                if (dropped) {
                    lastDropAt = now;
                    audio.playDrop();
                    syncHud(false);
                }
            }
        }
    });

    /* ---------------- Wire UI Buttons ---------------- */

    document.getElementById('btnRestart').addEventListener('click', () => startSession());
    document.getElementById('btnCancelTool').addEventListener('click', () => setActiveTool(null));

    document.getElementById('toolWand').addEventListener('click', () => setActiveTool('wand'));
    document.getElementById('toolSpoon').addEventListener('click', () => setActiveTool('spoon'));
    document.getElementById('toolShake').addEventListener('click', () => {
        if (!world || world.status !== 'playing') return;
        if (world.useShake()) {
            audio.playTool();
            jarFrame.classList.remove('is-shaking');
            void jarFrame.offsetWidth;
            jarFrame.classList.add('is-shaking');
            spawnPopup(E.ARENA.width * 0.5, 136, '🌀 罐身摇晃！', '#d97706');
            setActiveTool(null);
            syncHud(false);
        }
    });

    function syncThemeUi() {
        const isCritters = save.theme === 'critters';
        document.getElementById('themeBadgeIcon').textContent = isCritters ? '🐱' : '🍓';
        document.getElementById('themeBadgeLabel').textContent = isCritters ? '萌宠' : '鲜果';
        document.getElementById('subtitleLabel').textContent = isCritters
            ? '经典无尽物理萌宠大合成 · 冲击历史 MAX 高分'
            : '经典无尽物理甜心大合成 · 冲击历史 MAX 高分';
    }

    document.getElementById('btnToggleTheme').addEventListener('click', () => {
        save.theme = save.theme === 'critters' ? 'fruit' : 'critters';
        persistSave();
        syncThemeUi();
        syncHud(false);
    });

    function syncMuteBtn() {
        document.getElementById('btnMute').textContent = save.muted ? '🔇' : '🔊';
    }

    document.getElementById('btnMute').addEventListener('click', () => {
        save.muted = !save.muted;
        audio.setMuted(save.muted);
        persistSave();
        syncMuteBtn();
    });

    document.getElementById('btnResultRetry').addEventListener('click', () => {
        startSession();
    });

    // Resolve back-to-arcade link cleanly
    const backBtn = document.getElementById('btnBackArcade');
    if (backBtn) {
        backBtn.href = window.location.pathname.includes('/games/arcade') ? '/games/arcade/' : '../';
    }

    // Boot
    syncThemeUi();
    syncMuteBtn();
    startSession();
    rafId = requestAnimationFrame(tick);

    window.__fruitMerge = {
        getWorld: () => world,
        dropAt: (x) => {
            if (!world) return null;
            const b = world.drop(x);
            if (b) syncHud(false);
            return b;
        },
        step: (sec) => {
            const steps = Math.max(1, Math.round((sec || 0.016) * 60));
            for (let i = 0; i < steps; i++) {
                const ev = world.step(1 / 60);
                processEvents(ev);
            }
            syncHud(false);
        }
    };
})();
