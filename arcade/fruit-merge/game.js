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

    let currentMode = 'campaign';
    let world = null;
    let lastDropAt = 0;
    let activeTool = null; // null | 'wand' | 'spoon'
    let hoverBodyId = null;
    let pointerDownInside = false;
    let rafId = null;
    let lastTs = 0;

    // Visual particle & popup effects
    const particles = [];
    const rings = [];
    const popups = [];

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

        if (world.mode === 'campaign' && world.level) {
            goalLabelEl.textContent = '目标分数';
            goalValEl.textContent = (world.level.targetScore || 0).toLocaleString();
            stagePillEl.textContent = `${world.level.label} ${world.level.name}`;
            movesBadgeEl.textContent = world.dropsLeft === null ? '不限步数' : `剩余 ${world.dropsLeft} 步`;
            missionDescEl.textContent = world.level.goalText;
        } else {
            goalLabelEl.textContent = '无尽最高分';
            goalValEl.textContent = Math.max(save.endlessHighScore, world.score).toLocaleString();
            stagePillEl.textContent = '无尽大西瓜';
            movesBadgeEl.textContent = `已落 ${world.dropsUsed} 枚`;
            missionDescEl.textContent = '合成 11 阶黄金西瓜，两颗大西瓜触碰更可引爆超大满贯！';
        }

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
        for (let i = 0; i < n; i++) {
            const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.4;
            const spd = (90 + Math.random() * 190) * (radiusScale || 1);
            particles.push({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 45,
                r: 2.5 + Math.random() * 4,
                color,
                life: 0.42 + Math.random() * 0.25,
                maxLife: 0.65
            });
        }
        rings.push({ x, y, r: 8, maxR: 48 * (radiusScale || 1), color, life: 0.34, maxLife: 0.34 });
    }

    function spawnPopup(x, y, text, color) {
        popups.push({ x, y, text, color: color || '#ea580c', life: 0.95, maxLife: 0.95 });
    }

    function startSession(mode, levelIndex) {
        currentMode = mode === 'campaign' ? 'campaign' : 'endless';
        if (typeof levelIndex === 'number') {
            save.currentLevelIndex = Math.max(0, Math.min(E.LEVELS.length - 1, levelIndex));
            persistSave();
        }
        world = E.createWorld({
            mode: currentMode,
            levelIndex: save.currentLevelIndex
        });
        particles.length = 0;
        rings.length = 0;
        popups.length = 0;
        lastDropAt = performance.now() - 100;
        setActiveTool(null);
        document.getElementById('resultModal').hidden = true;
        document.getElementById('btnModeCampaign').classList.toggle('active', currentMode === 'campaign');
        document.getElementById('btnModeEndless').classList.toggle('active', currentMode === 'endless');
        syncHud(false);
    }

    function openResultModal() {
        const modal = document.getElementById('resultModal');
        const won = world.status === 'won';
        const emojiEl = document.getElementById('resultEmoji');
        const titleEl = document.getElementById('resultTitle');
        const subEl = document.getElementById('resultSub');
        const starsWrap = document.getElementById('resultStars');
        const stars = starsWrap.querySelectorAll('.r-star');
        const nextBtn = document.getElementById('btnResultNext');

        document.getElementById('resScore').textContent = world.score.toLocaleString();
        document.getElementById('resCombo').textContent = `×${Math.max(1, world.bestCombo)}`;
        document.getElementById('resMerges').textContent = String(world.merges);

        if (world.mode === 'campaign') {
            starsWrap.style.display = 'flex';
            if (won) {
                const earned = world.evaluateStars();
                const lvlId = world.level.id;
                save.levelStars[lvlId] = Math.max(save.levelStars[lvlId] || 0, earned);
                save.levelScores[lvlId] = Math.max(save.levelScores[lvlId] || 0, world.score);
                if (world.levelIndex + 1 >= save.unlockedLevel && save.unlockedLevel < E.LEVELS.length) {
                    save.unlockedLevel = world.levelIndex + 2;
                }
                persistSave();
                audio.playWin();

                emojiEl.textContent = earned === 3 ? '👑' : '🎉';
                titleEl.textContent = `${world.level.label} 通关大捷！`;
                subEl.textContent = `已解锁最高阶：${tierLabel(world.maxTierSeen)}`;
                stars.forEach((s, idx) => {
                    s.classList.toggle('lit', idx < earned);
                    s.style.animationDelay = `${idx * 0.12}s`;
                });
                nextBtn.style.display = 'block';
                nextBtn.textContent = world.levelIndex + 1 < E.LEVELS.length ? '下一关 →' : '挑战无尽模式';
            } else {
                audio.playLoss();
                emojiEl.textContent = '💦';
                titleEl.textContent = '差一点就成了！';
                subEl.textContent = world.lossReason || '调整落点角度再来一次吧';
                stars.forEach((s) => s.classList.remove('lit'));
                nextBtn.style.display = 'none';
            }
        } else {
            audio.playLoss();
            starsWrap.style.display = 'none';
            const isNewRecord = world.score > save.endlessHighScore;
            if (isNewRecord) {
                save.endlessHighScore = world.score;
                persistSave();
            }
            emojiEl.textContent = isNewRecord ? '🏆' : '🍉';
            titleEl.textContent = isNewRecord ? '刷新历史纪录！' : '甜蜜结算';
            subEl.textContent = `历史最高：${save.endlessHighScore.toLocaleString()} 分`;
            nextBtn.style.display = 'none';
        }
        modal.hidden = false;
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

        // Outer soft drop shadow
        c.beginPath();
        c.arc(0, 2, r, 0, Math.PI * 2);
        c.fillStyle = 'rgba(120, 53, 15, 0.14)';
        c.fill();

        // Main glossy gradient sphere
        const grad = c.createRadialGradient(-r * 0.32, -r * 0.32, r * 0.12, 0, 0, r);
        grad.addColorStop(0, def.rim);
        grad.addColorStop(0.45, def.colorA);
        grad.addColorStop(1, def.colorB);
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.fillStyle = grad;
        c.fill();
        c.lineWidth = Math.max(1.2, r * 0.055);
        c.strokeStyle = 'rgba(255, 255, 255, 0.42)';
        c.stroke();

        // Theme details
        if (save.theme === 'critters') {
            drawCritterDetails(c, r, tier, def);
        } else {
            drawFruitDetails(c, r, tier);
        }

        // Top glossy shine crescent
        c.beginPath();
        c.ellipse(-r * 0.3, -r * 0.36, r * 0.32, r * 0.16, -0.5, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255, 255, 255, 0.42)';
        c.fill();

        // Expressive Eyes & Mouth (keep faces mostly upright relative to body rotation? Keep with body for playful spin!)
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
        if (tier === 0 || tier === 4 || tier === 6) {
            // Stem + little leaf
            c.strokeStyle = '#65a30d';
            c.lineWidth = Math.max(1.5, r * 0.09);
            c.beginPath();
            c.moveTo(0, -r * 0.76);
            c.quadraticCurveTo(r * 0.12, -r * 1.05, r * 0.25, -r * 1.12);
            c.stroke();
            c.beginPath();
            c.ellipse(r * 0.24, -r * 0.92, r * 0.22, r * 0.11, -0.4, 0, Math.PI * 2);
            c.fillStyle = '#4ade80';
            c.fill();
        } else if (tier === 1) {
            // Strawberry golden seeds + calyx leaves
            c.fillStyle = '#fef08a';
            for (let i = 0; i < 6; i++) {
                const a = (i * 1.05) + 0.4;
                c.beginPath();
                c.arc(Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.45 + r * 0.1, 1.5, 0, Math.PI * 2);
                c.fill();
            }
            c.fillStyle = '#22c55e';
            for (let k = -1; k <= 1; k++) {
                c.beginPath();
                c.ellipse(k * r * 0.24, -r * 0.8, r * 0.2, r * 0.09, k * 0.3, 0, Math.PI * 2);
                c.fill();
            }
        } else if (tier === 2) {
            // Grape bubbly highlights
            c.fillStyle = 'rgba(255,255,255,0.16)';
            c.beginPath();
            c.arc(r * 0.28, r * 0.22, r * 0.34, 0, Math.PI * 2);
            c.arc(-r * 0.3, r * 0.25, r * 0.26, 0, Math.PI * 2);
            c.fill();
        } else if (tier === 7) {
            // Pineapple crosshatch
            c.strokeStyle = 'rgba(161, 98, 7, 0.32)';
            c.lineWidth = 1.6;
            c.beginPath();
            c.arc(0, 0, r * 0.82, 0, Math.PI * 2);
            c.clip();
            for (let d = -r * 1.4; d <= r * 1.4; d += r * 0.42) {
                c.moveTo(d, -r); c.lineTo(d + r, r);
                c.moveTo(d + r, -r); c.lineTo(d, r);
            }
            c.stroke();
        } else if (tier === 9 || tier === 10) {
            // Watermelon / Melon stripes
            c.strokeStyle = tier === 10 ? 'rgba(6, 95, 70, 0.48)' : 'rgba(77, 124, 15, 0.36)';
            c.lineWidth = Math.max(3, r * 0.09);
            c.lineCap = 'round';
            for (const off of [-0.46, 0, 0.46]) {
                c.beginPath();
                c.moveTo(off * r, -r * 0.78);
                c.quadraticCurveTo((off + 0.16) * r, 0, off * r, r * 0.78);
                c.stroke();
            }
            if (tier === 10) {
                // Tiny golden crown on King Watermelon
                c.fillStyle = '#fde047';
                c.beginPath();
                c.moveTo(-14, -r + 4);
                c.lineTo(-10, -r - 10);
                c.lineTo(0, -r - 2);
                c.lineTo(10, -r - 10);
                c.lineTo(14, -r + 4);
                c.closePath();
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
            } else if (ev.type === 'peg') {
                audio.playPeg();
            } else if (ev.type === 'merge') {
                const def = E.TIERS[ev.tier];
                scoreChanged = true;
                save.highestTier = Math.max(save.highestTier, ev.tier);
                persistSave();
                audio.playMerge(ev.tier, ev.combo);
                spawnJuiceBurst(ev.x, ev.y, def.juice, 14 + ev.tier, 1 + ev.tier * 0.08);
                const msg = ev.combo >= 2 ? `+${ev.scoreDelta} · ${ev.combo}连消!` : `+${ev.scoreDelta}`;
                spawnPopup(ev.x, ev.y - 10, msg, ev.combo >= 2 ? '#e11d48' : '#d97706');
            } else if (ev.type === 'grandSlam') {
                scoreChanged = true;
                audio.playGrandSlam();
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
        if (now - lastDropAt < 300) return;
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
        if (!document.getElementById('levelsModal').hidden || !document.getElementById('resultModal').hidden) return;
        if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') {
            ev.preventDefault();
            world.setAimX(world.aimX - 18);
        } else if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D') {
            ev.preventDefault();
            world.setAimX(world.aimX + 18);
        } else if (ev.key === ' ' || ev.key === 'Enter' || ev.key === 'ArrowDown') {
            ev.preventDefault();
            const now = performance.now();
            if (now - lastDropAt >= 300 && !activeTool) {
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

    document.getElementById('btnModeCampaign').addEventListener('click', () => startSession('campaign'));
    document.getElementById('btnModeEndless').addEventListener('click', () => startSession('endless'));
    document.getElementById('btnLevels').addEventListener('click', openLevelsModal);
    document.getElementById('btnCloseLevels').addEventListener('click', () => {
        document.getElementById('levelsModal').hidden = true;
    });
    document.getElementById('btnRestart').addEventListener('click', () => startSession(currentMode));
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
        document.getElementById('subtitleLabel').textContent = isCritters ? '2D物理萌宠泡泡大合成' : '2D物理甜心大合成';
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
        startSession(currentMode);
    });

    document.getElementById('btnResultNext').addEventListener('click', () => {
        if (world && world.levelIndex + 1 < E.LEVELS.length) {
            startSession('campaign', world.levelIndex + 1);
        } else {
            startSession('endless');
        }
    });

    // Resolve back-to-arcade link cleanly
    const backBtn = document.getElementById('btnBackArcade');
    if (backBtn) {
        backBtn.href = window.location.pathname.includes('/games/arcade') ? '/games/arcade/' : '../';
    }

    // Boot
    syncThemeUi();
    syncMuteBtn();
    startSession('campaign', save.currentLevelIndex);
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
