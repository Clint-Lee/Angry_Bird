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
        btnRushBell: document.getElementById('btnRushBell'),
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
        el.shelfCapText.textContent = `上限 ${engine.getShelfCap()}`;
        const mult = ((1 + st.prestigeCount * 0.35) * (1 + st.upgrades.priceBoost * 0.18) * (sim.rushTimer > 0 ? 1.35 : 1)).toFixed(2);
        el.prestigeMultText.textContent = `售价倍率 ×${mult}`;

        if (el.btnRushBell) {
            if (sim.rushTimer > 0) {
                el.btnRushBell.disabled = true;
                el.btnRushBell.textContent = `热卖中 ${Math.ceil(sim.rushTimer)}s`;
            } else if (sim.rushCooldown > 0) {
                el.btnRushBell.disabled = true;
                el.btnRushBell.textContent = `冷却 ${Math.ceil(sim.rushCooldown)}s`;
            } else {
                el.btnRushBell.disabled = false;
                el.btnRushBell.textContent = '🔔 招客热卖';
            }
        }

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
                popups.push({
                    x: 105, y: 120,
                    text: ev.chestGold > 0 ? `${msg} +宝箱 ${ev.chestGold}G!` : `凯旋! ${msg}`,
                    color: ev.chestGold > 0 ? '#facc15' : '#4ade80',
                    life: 1.3
                });
            } else if (ev.type === 'crafted') {
                changed = true;
                audio.playCraft();
                const rDef = RECIPES.find((r) => r.id === ev.recipeId);
                spawnBurst(305, 185, ev.masterwork ? '#facc15' : '#38bdf8', ev.masterwork ? 16 : 10);
                popups.push({
                    x: 305, y: 140,
                    text: ev.masterwork ? `★ 精品锻造 +${ev.qty}!` : `${rDef ? rDef.icon : ''} +1 上架`,
                    color: ev.masterwork ? '#fde047' : '#38bdf8',
                    life: 1.05
                });
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

    if (el.btnRushBell) {
        el.btnRushBell.addEventListener('click', () => {
            if (engine.triggerRush()) {
                audio.playCoin();
                spawnBurst(490, 145, '#facc15', 18);
                popups.push({ x: 490, y: 118, text: '🔔 招客热卖! 售价+35%', color: '#fde047', life: 1.4 });
                renderPanels();
            }
        });
    }

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

    // Hand-drawn RPG item artwork for shelves & bubbles
    function drawItemArt(id, x, y, scale = 1) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        if (id === 'potion') {
            ctx.fillStyle = '#e11d48';
            ctx.beginPath(); ctx.arc(0, 3, 9, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(-3.5, -9, 7, 5);
            ctx.fillStyle = '#d97706';
            ctx.fillRect(-3, -12, 6, 3);
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.beginPath(); ctx.arc(-3, 0, 2.5, 0, Math.PI * 2); ctx.fill();
        } else if (id === 'sword') {
            ctx.rotate(0.5);
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.moveTo(0, -15); ctx.lineTo(3.5, -9); ctx.lineTo(3, 5); ctx.lineTo(-3, 5); ctx.lineTo(-3.5, -9);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-8, 5, 16, 3);
            ctx.fillStyle = '#78350f';
            ctx.fillRect(-2, 8, 4, 7);
        } else if (id === 'staff') {
            ctx.rotate(0.35);
            ctx.fillStyle = '#92400e';
            ctx.fillRect(-2, -6, 4, 21);
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath(); ctx.arc(0, -10, 6.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath(); ctx.arc(-2, -12, 2, 0, Math.PI * 2); ctx.fill();
        } else if (id === 'armor') {
            ctx.fillStyle = '#b91c1c';
            ctx.beginPath();
            ctx.moveTo(-10, -10); ctx.lineTo(-4, -12); ctx.lineTo(0, -7); ctx.lineTo(4, -12); ctx.lineTo(10, -10);
            ctx.lineTo(9, 10); ctx.lineTo(-9, 10);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.restore();
    }

    // Canvas Living World Renderer
    function drawScene() {
        const st = engine.state;
        const sim = engine.sim;
        const rushOn = sim.rushTimer > 0;

        // 1. Exterior Stone Dungeon Courtyard -> Cozy Warm Timber Tavern Shop
        const g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, '#121826');
        g.addColorStop(0.3, '#1a2030');
        g.addColorStop(0.31, '#2b1e16');
        g.addColorStop(1, '#211610');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Warm plank floorboards
        ctx.fillStyle = '#3b281d';
        ctx.fillRect(212, 212, W - 212, H - 212);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        for (let py = 232; py < H; py += 24) {
            ctx.beginPath(); ctx.moveTo(212, py); ctx.lineTo(W, py); ctx.stroke();
        }
        // Separating timber beam column between dungeon portal & shop
        ctx.fillStyle = '#4a3121';
        ctx.fillRect(204, 0, 12, H);

        // 2. Left Zone: Stone Archway Dungeon Gate & Animated Knight Hero
        const zDef = ZONES.find((z) => z.id === st.activeZone) || ZONES[0];
        ctx.save();
        ctx.translate(104, 175);
        // Stone archway pillar silhouette
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, -14, 52, Math.PI, 0);
        ctx.lineTo(52, 62); ctx.lineTo(-52, 62);
        ctx.closePath();
        ctx.fill();
        const pg = ctx.createRadialGradient(0, 8, 6, 0, 8, 42);
        pg.addColorStop(0, zDef.id === 'peak' ? '#fb7185' : '#34d399');
        pg.addColorStop(0.65, 'rgba(56, 189, 248, 0.35)');
        pg.addColorStop(1, '#0f172a');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(0, 8, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate(clock * (sim.expedition.active ? 2.6 : 0.6));
        ctx.strokeStyle = '#6ee7b7';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.arc(0, 8, 30, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // Knight Sprite with cape & sword + shield
        const expProg = sim.expedition.active ? sim.expedition.progress / sim.expedition.duration : 0;
        const heroX = sim.expedition.active ? (176 - Math.sin(expProg * Math.PI) * 68) : 172;
        const heroY = 238 + Math.abs(Math.sin(clock * 7)) * (sim.expedition.active ? -4 : -1);
        ctx.save();
        ctx.translate(heroX, heroY);
        ctx.fillStyle = '#b91c1c'; // Cape
        ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(14, 16); ctx.lineTo(-2, 16); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#64748b'; // Armor chest + helmet
        ctx.fillRect(-7, 0, 14, 16);
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath(); ctx.arc(0, -10, 9.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ef4444'; // Helmet plume
        ctx.fillRect(-2, -23, 5, 5);
        ctx.restore();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${zDef.icon} ${zDef.name}`, 104, 82);
        ctx.fillStyle = 'rgba(0,0,0,0.48)';
        ctx.fillRect(44, 266, 120, 9);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(44, 266, 120 * expProg, 9);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText(sim.expedition.active ? '探险中 (点击加速)' : '点击传送门出发', 104, 292);

        // 3. Center Zone: Brick Alchemy Cauldron & Display Shelves with Drawn Gear
        // Hearth brick backdrop + warm flickering ember glow
        ctx.fillStyle = '#473024';
        ctx.beginPath(); ctx.roundRect(236, 134, 148, 86, 10); ctx.fill();
        const ember = ctx.createRadialGradient(310, 198, 2, 310, 194, 42);
        ember.addColorStop(0, `rgba(251, 146, 60, ${(0.34 + 0.14 * Math.sin(clock * 8)).toFixed(2)})`);
        ember.addColorStop(1, 'rgba(251, 146, 60, 0)');
        ctx.fillStyle = ember;
        ctx.fillRect(256, 150, 108, 68);
        // Brass simmering cauldron
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.arc(310, 178, 22, 0, Math.PI); ctx.fill();
        ctx.fillStyle = sim.crafting.active ? '#34d399' : '#0ea5e9';
        ctx.beginPath(); ctx.ellipse(310, 178, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
        // Rising glowing alchemy bubbles
        for (let b = 0; b < 4; b++) {
            const cyOff = (clock * (sim.crafting.active ? 26 : 12) + b * 9) % 24;
            const bx = 298 + b * 8 + Math.sin(clock * 4 + b) * 2.5;
            const by = 175 - cyOff;
            ctx.fillStyle = sim.crafting.active ? 'rgba(110, 231, 183, 0.65)' : 'rgba(125, 211, 252, 0.45)';
            ctx.beginPath();
            ctx.arc(bx, by, 2.6 - cyOff * 0.06, 0, Math.PI * 2);
            ctx.fill();
        }

        const craftProg = sim.crafting.active ? sim.crafting.progress / sim.crafting.duration : 0;
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 11.5px sans-serif';
        if (sim.crafting.active) {
            const rDef = RECIPES.find((r) => r.id === sim.crafting.recipeId);
            ctx.fillText(`锻造 ${rDef ? rDef.name : ''}`, 310, 154);
        } else {
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText('炼造台（点击加火）', 310, 154);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(256, 206, 108, 7);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(256, 206, 108 * craftProg, 7);

        // Wooden Top Display Shelves with Custom Drawn RPG Gear
        RECIPES.forEach((r, idx) => {
            const sx = 236 + idx * 106;
            const sy = 44;
            ctx.fillStyle = '#201610';
            ctx.strokeStyle = rushOn ? '#facc15' : 'rgba(217, 119, 6, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(sx, sy, 92, 56, 8);
            ctx.fill();
            ctx.stroke();
            drawItemArt(r.id, sx + 28, sy + 28, 1.05);
            ctx.font = 'bold 13px sans-serif';
            ctx.fillStyle = (st.stock[r.id] || 0) > 0 ? '#4ade80' : '#fb7185';
            ctx.fillText(`×${st.stock[r.id] || 0}`, sx + 66, sy + 33);
        });

        // 4. Right Zone: Oak Shop Counter + Customers
        ctx.fillStyle = rushOn ? '#b45309' : '#634129';
        ctx.fillRect(422, 146, 232, 14);
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 11.5px sans-serif';
        ctx.fillText(rushOn ? '🔥 热卖时段! 点击顾客秒结账' : '结账柜台（点击待购顾客收银）', 538, 136);

        for (const c of sim.customers) {
            const bob = Math.sin(clock * 7 + c.id) * 2.5;
            ctx.save();
            ctx.translate(c.x, c.y + bob);
            ctx.fillStyle = c.coatColor;
            ctx.beginPath(); ctx.roundRect(-12, -8, 24, 24, 6); ctx.fill();
            ctx.fillStyle = '#fde68a';
            ctx.beginPath(); ctx.arc(0, -16, 9.5, 0, Math.PI * 2); ctx.fill();
            // Distinct adventurer hood/hat per ID
            ctx.fillStyle = c.coatColor;
            ctx.beginPath(); ctx.arc(0, -19, 9.5, Math.PI, 0); ctx.fill();

            if (c.phase === 'waiting') {
                const hasStock = (st.stock[c.desiredId] || 0) > 0;
                ctx.fillStyle = hasStock ? '#ecfdf5' : '#fff1f2';
                ctx.strokeStyle = hasStock ? '#22c55e' : '#fb7185';
                ctx.lineWidth = 1.8;
                ctx.beginPath(); ctx.roundRect(-19, -58, 38, 28, 7); ctx.fill(); ctx.stroke();
                drawItemArt(c.desiredId, 0, -44, 0.85);

                const ratio = Math.max(0, c.patience / c.maxPatience);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(-15, 20, 30, 5);
                ctx.fillStyle = ratio > 0.35 ? '#4ade80' : '#fb7185';
                ctx.fillRect(-15, 20, 30 * ratio, 5);
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

        // Refresh VIP & Rush Bell countdown cleanly
        if (engine.sim.vipOrder) {
            el.vipTimer.textContent = `${Math.ceil(engine.sim.vipOrder.timeLeft)}s`;
        }
        if (el.btnRushBell) {
            const sim = engine.sim;
            if (sim.rushTimer > 0) {
                el.btnRushBell.disabled = true;
                el.btnRushBell.textContent = `热卖中 ${Math.ceil(sim.rushTimer)}s`;
            } else if (sim.rushCooldown > 0) {
                el.btnRushBell.disabled = true;
                el.btnRushBell.textContent = `冷却 ${Math.ceil(sim.rushCooldown)}s`;
            } else if (el.btnRushBell.disabled) {
                el.btnRushBell.disabled = false;
                el.btnRushBell.textContent = '🔔 招客热卖';
            }
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

