(function () {
    'use strict';

    const E = window.AdventureTycoonEngine;
    const AudioSys = window.AdventureTycoonAudio;
    const { MATERIALS, RECIPES, ZONES } = E;

    const canvas = document.getElementById('shopCanvas');
    const ctx = canvas.getContext('2d');
    const W = 680;
    const H = 340;

    const el = {
        shopLevelBadge: document.getElementById('shopLevelBadge'),
        goldVal: document.getElementById('goldVal'),
        repVal: document.getElementById('repVal'),
        maxGoldVal: document.getElementById('maxGoldVal'),
        btnPrestige: document.getElementById('btnPrestige'),
        btnMute: document.getElementById('btnMute'),
        vipBanner: document.getElementById('vipBanner'),
        vipDesc: document.getElementById('vipDesc'),
        vipTimer: document.getElementById('vipTimer'),
        btnFulfillVip: document.getElementById('btnFulfillVip'),
        matStrip: document.getElementById('matStrip'),
        zonesList: document.getElementById('zonesList'),
        recipesList: document.getElementById('recipesList'),
        upgradesList: document.getElementById('upgradesList'),
        shelfCapText: document.getElementById('shelfCapText'),
        prestigeMultText: document.getElementById('prestigeMultText'),
        offlineToast: document.getElementById('offlineToast')
    };

    const UPGRADE_META = [
        { key: 'craftSpeed', name: '精致坩埚', desc: '加快炼造工坊出货速度' },
        { key: 'priceBoost', name: '奢华招牌', desc: '全商品售价 +18% / 级' },
        { key: 'heroSpeed', name: '疾风战靴', desc: '加速冒险探索并返回更多材料' },
        { key: 'shelfCap', name: '红木展柜', desc: '每种商品库存上限 +3' },
        { key: 'autoExpedition', name: '自动探索领队', desc: '雇佣领队自动循环冒险采材' },
        { key: 'autoCraft', name: '自动炼金学徒', desc: '自动按顾客需求补充货架' },
        { key: 'autoCheckout', name: '金牌收银精灵', desc: '顾客进店有货即刻秒结账!' }
    ];

    const audio = new AudioSys();
    let saved = loadSave();
    audio.setMuted(saved.muted);

    const engine = E.createSimulation(saved);
    const offlineGained = engine.applyOfflineEarnings();
    if (offlineGained > 0) {
        el.offlineToast.textContent = `🌙 离线冒险收益：店员为你赚取了 +${offlineGained.toLocaleString()} G!`;
        el.offlineToast.classList.remove('hidden');
        setTimeout(() => el.offlineToast.classList.add('hidden'), 4500);
    }

    let clock = 0;
    let persistTimer = 0;
    const popups = [];
    const particles = [];

    function loadSave() {
        try {
            return E.normalizeSave(JSON.parse(localStorage.getItem(E.SAVE_KEY) || 'null'));
        } catch {
            return E.normalizeSave(null);
        }
    }

    function persistSave() {
        try {
            localStorage.setItem(E.SAVE_KEY, JSON.stringify(engine.state));
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

    function spawnBurst(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
            const spd = 60 + Math.random() * 90;
            particles.push({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 35,
                r: 2 + Math.random() * 2,
                color,
                life: 0.45
            });
        }
    }

    function renderPanels() {
        const st = engine.state;
        const sim = engine.sim;

        el.shopLevelBadge.textContent = `Lv.${st.shopLevel} · 分店×${st.prestigeCount}`;
        el.goldVal.textContent = `${st.gold.toLocaleString()} G`;
        el.repVal.textContent = String(st.reputation);
        el.maxGoldVal.textContent = `${st.maxGoldHeld.toLocaleString()} G`;
        el.btnMute.textContent = st.muted ? '🔇' : '🔊';
        el.shelfCapText.textContent = `货架上限: ${engine.getShelfCap()}`;
        const mult = ((1 + st.prestigeCount * 0.35) * (1 + st.upgrades.priceBoost * 0.18)).toFixed(2);
        el.prestigeMultText.textContent = `售价倍率 ×${mult}`;

        el.btnPrestige.disabled = st.totalGoldEarned < 3000;
        el.btnPrestige.title = st.totalGoldEarned >= 3000
            ? '点击开启新分店转生，永久 +35% 售价'
            : `累计赚取 3,000 G 后解锁分店转生（当前 ${st.totalGoldEarned}/3000）`;

        // VIP Order Bar
        if (sim.vipOrder) {
            const o = sim.vipOrder;
            const rDef = RECIPES.find((r) => r.id === o.recipeId) || RECIPES[0];
            el.vipBanner.classList.remove('hidden');
            el.vipDesc.textContent = `需求：${rDef.icon} ${rDef.name} ×${o.qty}（库存 ${st.stock[rDef.id] || 0}） · 奖励 ${o.rewardGold} G + ${o.rewardRep}⭐`;
            el.vipTimer.textContent = `${Math.ceil(o.timeLeft)}s`;
            el.btnFulfillVip.disabled = (st.stock[rDef.id] || 0) < o.qty;
        } else {
            el.vipBanner.classList.add('hidden');
        }

        // Materials Strip
        el.matStrip.innerHTML = '';
        MATERIALS.forEach((m) => {
            const chip = document.createElement('div');
            chip.className = 'mat-chip';
            chip.innerHTML = `<span>${m.icon} ${m.name}</span><b>${st.materials[m.id] || 0}</b>`;
            el.matStrip.appendChild(chip);
        });

        // Zones List
        el.zonesList.innerHTML = '';
        ZONES.forEach((z) => {
            const unlocked = st.unlockedZones.includes(z.id);
            const active = st.activeZone === z.id;
            const exploring = sim.expedition.active && sim.expedition.zoneId === z.id;
            const dropSummary = Object.entries(z.drops).map(([m, q]) => {
                const md = MATERIALS.find((x) => x.id === m);
                return `${md ? md.icon : ''}+${q}`;
            }).join(' ');
            const row = document.createElement('div');
            row.className = 'row-card' + (active ? ' active-zone' : '');
            row.innerHTML = `
                <div class="row-info">
                    <strong>${z.icon} ${z.name}</strong>
                    <small>掉落 ${dropSummary} · 耗时 ${z.duration}s</small>
                </div>
            `;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = unlocked ? (exploring ? 'row-btn gold-btn' : 'row-btn green-btn') : 'row-btn';
            if (!unlocked) {
                btn.textContent = `解锁 ${z.unlockCost}G`;
                btn.disabled = st.gold < z.unlockCost;
                btn.onclick = () => {
                    if (engine.unlockZone(z.id)) {
                        audio.playCoin();
                        persistSave();
                        renderPanels();
                    }
                };
            } else {
                btn.textContent = exploring ? '⚡ 加速' : (active ? '⚔️ 出发' : '切换并出发');
                btn.onclick = () => {
                    st.activeZone = z.id;
                    engine.startExpedition(z.id);
                    audio.playCraft();
                    renderPanels();
                };
            }
            row.appendChild(btn);
            el.zonesList.appendChild(row);
        });

        // Recipes List
        el.recipesList.innerHTML = '';
        const cap = engine.getShelfCap();
        RECIPES.forEach((r) => {
            const costText = Object.entries(r.cost).map(([m, q]) => {
                const md = MATERIALS.find((x) => x.id === m);
                return `${md ? md.icon : ''}${q}`;
            }).join('+');
            const curStock = st.stock[r.id] || 0;
            const isCrafting = sim.crafting.active && sim.crafting.recipeId === r.id;
            const canMake = Object.entries(r.cost).every(([m, q]) => (st.materials[m] || 0) >= q) && curStock < cap;
            const row = document.createElement('div');
            row.className = 'row-card';
            row.innerHTML = `
                <div class="row-info">
                    <strong>${r.icon} ${r.name} · 售 ${engine.getSellPrice(r.id)}G</strong>
                    <small>配方 ${costText} · 货架 ${curStock}/${cap}</small>
                </div>
            `;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'row-btn' + (isCrafting ? ' gold-btn' : '');
            btn.textContent = isCrafting ? '⚡ 催促' : '炼造 +1';
            btn.disabled = !isCrafting && !canMake;
            btn.onclick = () => {
                if (engine.startCraft(r.id)) {
                    audio.playCraft();
                    renderPanels();
                }
            };
            row.appendChild(btn);
            el.recipesList.appendChild(row);
        });

        // Upgrades List
        el.upgradesList.innerHTML = '';
        UPGRADE_META.forEach((u) => {
            const lv = st.upgrades[u.key] || 0;
            const isAuto = u.key.startsWith('auto');
            const maxed = isAuto && lv >= 1;
            const cost = engine.upgradeCost(u.key, lv);
            const row = document.createElement('div');
            row.className = 'row-card';
            row.innerHTML = `
                <div class="row-info">
                    <strong>${u.name} ${maxed ? '(已雇佣)' : `Lv.${lv}`}</strong>
                    <small>${u.desc}</small>
                </div>
            `;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'row-btn gold-btn';
            btn.textContent = maxed ? '已激活 ✓' : `${cost} G`;
            btn.disabled = maxed || st.gold < cost;
            btn.onclick = () => {
                if (engine.buyUpgrade(u.key)) {
                    audio.playCoin();
                    persistSave();
                    renderPanels();
                }
            };
            row.appendChild(btn);
            el.upgradesList.appendChild(row);
        });
    }

    function handleSimEvents(events) {
        let changed = false;
        for (const ev of events) {
            if (ev.type === 'loot') {
                changed = true;
                audio.playLoot();
                spawnBurst(105, 175, '#4ade80', 14);
                const msg = Object.entries(ev.drops).map(([m, q]) => {
                    const md = MATERIALS.find((x) => x.id === m);
                    return `${md ? md.icon : ''}+${q}`;
                }).join(' ');
                popups.push({ x: 105, y: 120, text: `凯旋! ${msg}`, color: '#4ade80', life: 1.2 });
            } else if (ev.type === 'crafted') {
                changed = true;
                audio.playCraft();
                const rDef = RECIPES.find((r) => r.id === ev.recipeId);
                spawnBurst(305, 185, '#38bdf8', 10);
                popups.push({ x: 305, y: 140, text: `${rDef ? rDef.icon : ''} +1 上架`, color: '#38bdf8', life: 0.95 });
            } else if (ev.type === 'sale') {
                changed = true;
                audio.playCoin();
                spawnBurst(ev.x, ev.y - 12, '#fde047', 12);
                popups.push({ x: ev.x, y: ev.y - 26, text: `+${ev.gold} G!`, color: '#fde047', life: 1.1 });
            } else if (ev.type === 'impatient') {
                changed = true;
                popups.push({ x: ev.x, y: ev.y - 24, text: '等太久了 😤', color: '#fb7185', life: 0.9 });
            }
        }
        if (changed) {
            persistSave();
            renderPanels();
        }
    }

    // Canvas Interactive Click (Portal / Workbench / Direct Customer Serve!)
    canvas.addEventListener('pointerdown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * W;
        const y = ((e.clientY - rect.top) / rect.height) * H;

        if (x < 210) {
            const res = engine.startExpedition();
            if (res) {
                audio.playCraft();
                spawnBurst(x, y, '#4ade80', 6);
                renderPanels();
            }
        } else if (x < 405) {
            if (engine.sim.crafting.active) {
                engine.startCraft(engine.sim.crafting.recipeId);
                audio.playCraft();
                spawnBurst(x, y, '#38bdf8', 6);
            } else {
                for (const rec of RECIPES) {
                    if (engine.startCraft(rec.id)) {
                        audio.playCraft();
                        renderPanels();
                        break;
                    }
                }
            }
        } else {
            // Try serving matching waiting customer nearest click
            const events = [];
            let served = false;
            for (const c of engine.sim.customers) {
                if (c.phase === 'waiting' && Math.hypot(x - c.x, y - c.y) < 55) {
                    if (engine.serveCustomer(c.id, events)) {
                        served = true;
                        break;
                    }
                }
            }
            if (!served) engine.serveCustomer(null, events);
            if (events.length > 0) handleSimEvents(events);
        }
    });

    el.btnFulfillVip.addEventListener('click', () => {
        const res = engine.fulfillVipOrder();
        if (res) {
            audio.playCoin();
            spawnBurst(W / 2, 120, '#fbbf24', 24);
            popups.push({ x: W / 2, y: 100, text: `👑 +${res.gold} G · +${res.rep}⭐`, color: '#fde047', life: 1.4 });
            persistSave();
            renderPanels();
        }
    });

    el.btnPrestige.addEventListener('click', () => {
        if (engine.prestigeRebirth()) {
            audio.playLoot();
            spawnBurst(W / 2, H / 2, '#fde047', 30);
            popups.push({ x: W / 2, y: H / 2, text: '✨ 分店开幕! 永久售价加成!', color: '#fde047', life: 1.5 });
            persistSave();
            renderPanels();
        }
    });

    el.btnMute.addEventListener('click', () => {
        engine.state.muted = !engine.state.muted;
        audio.setMuted(engine.state.muted);
        persistSave();
        renderPanels();
    });

    // Canvas Living World Renderer
    function drawScene() {
        const st = engine.state;
        const sim = engine.sim;

        // 1. Exterior Dungeon Sky -> Warm Wooden Shop Floor -> Street
        const g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, '#0f1c2e');
        g.addColorStop(0.29, '#192338');
        g.addColorStop(0.31, '#312119');
        g.addColorStop(0.95, '#251a14');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Floor plank grid lines
        ctx.fillStyle = '#3b281d';
        ctx.fillRect(210, 210, W - 210, H - 210);
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        for (let py = 230; py < H; py += 26) {
            ctx.beginPath();
            ctx.moveTo(210, py);
            ctx.lineTo(W, py);
            ctx.stroke();
        }

        // 2. Left Zone: Glowing Dungeon Portal
        const zDef = ZONES.find((z) => z.id === st.activeZone) || ZONES[0];
        ctx.save();
        ctx.translate(105, 175);
        const pg = ctx.createRadialGradient(0, 0, 8, 0, 0, 62);
        pg.addColorStop(0, '#4ade80');
        pg.addColorStop(0.55, 'rgba(56, 189, 248, 0.45)');
        pg.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(0, 0, 62, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(clock * (sim.expedition.active ? 2.8 : 0.7));
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Hero chibis walking into portal
        const expProg = sim.expedition.active ? sim.expedition.progress / sim.expedition.duration : 0;
        const heroX = sim.expedition.active ? (180 - Math.sin(expProg * Math.PI) * 75) : 175;
        const heroY = 235 + Math.abs(Math.sin(clock * 6)) * (sim.expedition.active ? -5 : -1);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(heroX, heroY - 12, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.fillRect(heroX - 7, heroY, 14, 16);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${zDef.icon} ${zDef.name}`, 105, 86);
        // Progress bar under portal
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(45, 265, 120, 10);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(45, 265, 120 * expProg, 10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText(sim.expedition.active ? '探险中 (点击加速)' : '点击传送门出发!', 105, 294);

        // 3. Center Zone: Alchemy Forge Workbench & Display Shelves
        ctx.fillStyle = '#5c3c28';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(235, 145, 140, 72, 10);
        ctx.fill();
        ctx.stroke();

        const craftProg = sim.crafting.active ? sim.crafting.progress / sim.crafting.duration : 0;
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('⚗️ 工坊炼造台', 305, 166);
        if (sim.crafting.active) {
            const rDef = RECIPES.find((r) => r.id === sim.crafting.recipeId);
            ctx.fillText(`${rDef ? rDef.icon : ''} 炼制中...`, 305, 186);
        } else {
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('点击炼造 / 催促', 305, 186);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(250, 196, 110, 9);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(250, 196, 110 * craftProg, 9);

        // Shelf icons along top of shop
        RECIPES.forEach((r, idx) => {
            const sx = 240 + idx * 96;
            const sy = 56;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.32)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.roundRect(sx, sy, 84, 54, 10);
            ctx.fill();
            ctx.stroke();
            ctx.font = '20px sans-serif';
            ctx.fillText(r.icon, sx + 22, sy + 32);
            ctx.font = 'bold 13px sans-serif';
            ctx.fillStyle = (st.stock[r.id] || 0) > 0 ? '#4ade80' : '#fb7185';
            ctx.fillText(`×${st.stock[r.id] || 0}`, sx + 58, sy + 34);
        });

        // 4. Right Zone: Town Customers Queue
        ctx.fillStyle = '#475569';
        ctx.fillRect(420, 145, 230, 14);
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('💰 结账柜台（点击待购顾客收银）', 535, 136);

        for (const c of sim.customers) {
            const bob = Math.sin(clock * 7 + c.id) * 2.5;
            ctx.save();
            ctx.translate(c.x, c.y + bob);
            ctx.fillStyle = c.coatColor;
            ctx.beginPath();
            ctx.roundRect(-12, -8, 24, 24, 6);
            ctx.fill();
            ctx.fillStyle = '#fde68a';
            ctx.beginPath();
            ctx.arc(0, -16, 10, 0, Math.PI * 2);
            ctx.fill();

            if (c.phase === 'waiting') {
                const rDef = RECIPES.find((r) => r.id === c.desiredId) || RECIPES[0];
                const hasStock = (st.stock[c.desiredId] || 0) > 0;
                // Speech bubble
                ctx.fillStyle = hasStock ? '#ecfdf5' : '#fff1f2';
                ctx.strokeStyle = hasStock ? '#22c55e' : '#fb7185';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.roundRect(-20, -56, 40, 26, 8);
                ctx.fill();
                ctx.stroke();
                ctx.font = '15px sans-serif';
                ctx.fillText(rDef.icon, 0, -38);

                // Patience bar
                const ratio = Math.max(0, c.patience / c.maxPatience);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(-16, 20, 32, 5);
                ctx.fillStyle = ratio > 0.35 ? '#4ade80' : '#fb7185';
                ctx.fillRect(-16, 20, 32 * ratio, 5);
            }
            ctx.restore();
        }

        // Particles & Floating Popups
        for (const p of particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life * 2.2);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        for (const pop of popups) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, pop.life * 1.3);
            ctx.font = 'bold 14px sans-serif';
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

        const events = engine.step(dt);
        if (events.length > 0) handleSimEvents(events);

        // Refresh VIP countdown & particle decay cleanly
        if (engine.sim.vipOrder) {
            el.vipTimer.textContent = `${Math.ceil(engine.sim.vipOrder.timeLeft)}s`;
        }
        persistTimer += dt;
        if (persistTimer > 4) {
            persistTimer = 0;
            persistSave();
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
            else {
                p.vy += 200 * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
            }
        }
        for (let i = popups.length - 1; i >= 0; i--) {
            const pop = popups[i];
            pop.life -= dt;
            pop.y -= 26 * dt;
            if (pop.life <= 0) popups.splice(i, 1);
        }

        drawScene();
        requestAnimationFrame(frame);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    renderPanels();
    requestAnimationFrame(frame);
})();

