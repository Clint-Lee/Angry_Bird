(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AdventureTycoonEngine = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SAVE_KEY = 'cloudeave_adventure_tycoon_v1';

    const MATERIALS = [
        { id: 'herb', name: '月光草', icon: '🌿', color: '#4ade80' },
        { id: 'ore', name: '精铁矿', icon: '⛏️', color: '#94a3b8' },
        { id: 'crystal', name: '星辉晶', icon: '💎', color: '#38bdf8' },
        { id: 'scale', name: '火龙鳞', icon: '🔥', color: '#fb7185' }
    ];

    const RECIPES = [
        { id: 'potion', name: '生命药水', icon: '🧪', price: 28, craftTime: 1.8, cost: { herb: 1 }, tier: 1 },
        { id: 'sword', name: '精铁长剑', icon: '⚔️', price: 88, craftTime: 3.0, cost: { ore: 1, herb: 1 }, tier: 2 },
        { id: 'staff', name: '秘银法杖', icon: '🪄', price: 245, craftTime: 4.5, cost: { crystal: 1, ore: 1 }, tier: 3 },
        { id: 'armor', name: '龙鳞战甲', icon: '🛡️', price: 720, craftTime: 6.2, cost: { scale: 1, crystal: 1 }, tier: 4 }
    ];

    const ZONES = [
        { id: 'glade', name: '翠绿林地', icon: '🌲', duration: 3.2, unlockCost: 0, drops: { herb: 2 } },
        { id: 'mine', name: '矮人矿坑', icon: '🪨', duration: 4.5, unlockCost: 120, drops: { herb: 1, ore: 2 } },
        { id: 'ruins', name: '星辉遗迹', icon: '🏛️', duration: 5.8, unlockCost: 650, drops: { ore: 1, crystal: 2 } },
        { id: 'peak', name: '烈焰龙巢', icon: '🌋', duration: 7.2, unlockCost: 2400, drops: { crystal: 1, scale: 2 } }
    ];

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function createDefaultState() {
        return {
            gold: 60,
            totalGoldEarned: 60,
            maxGoldHeld: 60,
            reputation: 0,
            shopLevel: 1,
            prestigeCount: 0,
            muted: false,
            materials: { herb: 4, ore: 1, crystal: 0, scale: 0 },
            stock: { potion: 2, sword: 0, staff: 0, armor: 0 },
            unlockedZones: ['glade'],
            activeZone: 'glade',
            upgrades: {
                craftSpeed: 0,      // reduces craft time
                priceBoost: 0,      // increases selling price
                heroSpeed: 0,       // speeds expedition
                shelfCap: 0,        // max shelf stock per recipe
                autoExpedition: 0,  // hires expedition manager
                autoCraft: 0,       // hires alchemy apprentice
                autoCheckout: 0     // speeds customer checkout & spawns VIP
            },
            ordersCompleted: 0,
            customersServed: 0,
            expeditionsRun: 0,
            lastTimestamp: Date.now()
        };
    }

    function normalizeSave(raw) {
        const def = createDefaultState();
        if (!raw || typeof raw !== 'object') return def;

        const clean = {
            ...def,
            gold: Math.max(0, Math.floor(Number(raw.gold) || 0)),
            totalGoldEarned: Math.max(0, Math.floor(Number(raw.totalGoldEarned) || 0)),
            maxGoldHeld: Math.max(0, Math.floor(Number(raw.maxGoldHeld) || 0)),
            reputation: Math.max(0, Math.floor(Number(raw.reputation) || 0)),
            shopLevel: clamp(Math.floor(Number(raw.shopLevel) || 1), 1, 99),
            prestigeCount: Math.max(0, Math.floor(Number(raw.prestigeCount) || 0)),
            muted: !!raw.muted,
            ordersCompleted: Math.max(0, Math.floor(Number(raw.ordersCompleted) || 0)),
            customersServed: Math.max(0, Math.floor(Number(raw.customersServed) || 0)),
            expeditionsRun: Math.max(0, Math.floor(Number(raw.expeditionsRun) || 0)),
            lastTimestamp: Number(raw.lastTimestamp) || Date.now()
        };

        if (raw.materials && typeof raw.materials === 'object') {
            MATERIALS.forEach((m) => {
                clean.materials[m.id] = Math.max(0, Math.floor(Number(raw.materials[m.id]) || 0));
            });
        }
        if (raw.stock && typeof raw.stock === 'object') {
            RECIPES.forEach((r) => {
                clean.stock[r.id] = Math.max(0, Math.floor(Number(raw.stock[r.id]) || 0));
            });
        }
        if (Array.isArray(raw.unlockedZones)) {
            const validIds = new Set(ZONES.map((z) => z.id));
            const set = new Set(['glade']);
            raw.unlockedZones.forEach((id) => { if (validIds.has(id)) set.add(id); });
            clean.unlockedZones = Array.from(set);
        }
        if (clean.unlockedZones.includes(raw.activeZone)) {
            clean.activeZone = raw.activeZone;
        }
        if (raw.upgrades && typeof raw.upgrades === 'object') {
            Object.keys(clean.upgrades).forEach((k) => {
                clean.upgrades[k] = clamp(Math.floor(Number(raw.upgrades[k]) || 0), 0, 20);
            });
        }
        clean.maxGoldHeld = Math.max(clean.maxGoldHeld, clean.gold);
        clean.totalGoldEarned = Math.max(clean.totalGoldEarned, clean.gold);
        return clean;
    }

    function upgradeCost(key, curLevel) {
        const base = {
            craftSpeed: 55,
            priceBoost: 75,
            heroSpeed: 65,
            shelfCap: 85,
            autoExpedition: 160,
            autoCraft: 220,
            autoCheckout: 180
        }[key] || 100;
        const mult = key.startsWith('auto') ? 2.4 : 1.55;
        return Math.round(base * Math.pow(mult, curLevel));
    }

    function createSimulation(savedState) {
        const state = normalizeSave(savedState);

        // Live runtime entities for interactive Canvas floor
        const sim = {
            state,
            expedition: { active: false, zoneId: state.activeZone, progress: 0, duration: 3.2 },
            crafting: { active: false, recipeId: null, progress: 0, duration: 2.0 },
            customers: [],
            vipOrder: null,
            nextCustomerIn: 0.8,
            nextVipIn: 14,
            rushTimer: 0,
            rushCooldown: 0,
            idCounter: 1
        };

        function triggerRush() {
            if (sim.rushTimer > 0 || sim.rushCooldown > 0) return false;
            sim.rushTimer = 10;
            sim.rushCooldown = 26;
            if (sim.customers.length < 4) spawnCustomer();
            return true;
        }

        function priceMultiplier() {
            const prestigeBonus = 1 + state.prestigeCount * 0.35;
            const boostBonus = 1 + state.upgrades.priceBoost * 0.18;
            const rushBonus = sim.rushTimer > 0 ? 1.35 : 1.0;
            return prestigeBonus * boostBonus * rushBonus;
        }

        function getSellPrice(recipeId) {
            const r = RECIPES.find((x) => x.id === recipeId) || RECIPES[0];
            return Math.round(r.price * priceMultiplier());
        }

        function getShelfCap() {
            return 5 + state.upgrades.shelfCap * 3;
        }

        function canAffordCost(costObj) {
            for (const [mat, qty] of Object.entries(costObj)) {
                if ((state.materials[mat] || 0) < qty) return false;
            }
            return true;
        }

        function earnGold(amount) {
            const val = Math.max(0, Math.round(amount));
            state.gold += val;
            state.totalGoldEarned += val;
            state.maxGoldHeld = Math.max(state.maxGoldHeld, state.gold);
            state.shopLevel = Math.max(1, 1 + Math.floor(Math.sqrt(state.reputation / 6)));
            return val;
        }

        function startExpedition(zoneId) {
            const targetZone = zoneId || state.activeZone;
            if (!state.unlockedZones.includes(targetZone)) return false;
            if (sim.expedition.active) {
                // Clicking while exploring boosts expedition slightly!
                sim.expedition.progress = Math.min(sim.expedition.duration, sim.expedition.progress + 0.45);
                return 'boost';
            }
            const zDef = ZONES.find((z) => z.id === targetZone) || ZONES[0];
            const spdFactor = 1 / (1 + state.upgrades.heroSpeed * 0.22);
            sim.expedition = {
                active: true,
                zoneId: zDef.id,
                progress: 0,
                duration: Math.max(1.0, zDef.duration * spdFactor)
            };
            return true;
        }

        function startCraft(recipeId) {
            const rDef = RECIPES.find((r) => r.id === recipeId);
            if (!rDef) return false;
            if (sim.crafting.active) {
                // Active rush tap finishes craft faster
                sim.crafting.progress = Math.min(sim.crafting.duration, sim.crafting.progress + 0.45);
                return 'boost';
            }
            if ((state.stock[rDef.id] || 0) >= getShelfCap()) return false;
            if (!canAffordCost(rDef.cost)) return false;

            for (const [mat, qty] of Object.entries(rDef.cost)) {
                state.materials[mat] -= qty;
            }
            const spdFactor = 1 / (1 + state.upgrades.craftSpeed * 0.24);
            sim.crafting = {
                active: true,
                recipeId: rDef.id,
                progress: 0,
                duration: Math.max(0.65, rDef.craftTime * spdFactor)
            };
            return true;
        }

        function unlockZone(zoneId) {
            if (state.unlockedZones.includes(zoneId)) {
                state.activeZone = zoneId;
                return true;
            }
            const zDef = ZONES.find((z) => z.id === zoneId);
            if (!zDef || state.gold < zDef.unlockCost) return false;
            state.gold -= zDef.unlockCost;
            state.unlockedZones.push(zoneId);
            state.activeZone = zoneId;
            return true;
        }

        function buyUpgrade(key) {
            if (!(key in state.upgrades)) return false;
            const cur = state.upgrades[key];
            if (key.startsWith('auto') && cur >= 1) return false;
            const cost = upgradeCost(key, cur);
            if (state.gold < cost) return false;
            state.gold -= cost;
            state.upgrades[key] = cur + 1;
            return true;
        }

        function spawnCustomer() {
            // Pick a recipe the shop can realistically craft or has in stock
            const available = RECIPES.filter((r) => {
                if ((state.stock[r.id] || 0) > 0) return true;
                return Object.keys(r.cost).every((m) =>
                    ZONES.some((z) => state.unlockedZones.includes(z.id) && (z.drops[m] || 0) > 0)
                );
            });
            const desired = available[Math.floor(Math.random() * available.length)] || RECIPES[0];
            sim.customers.push({
                id: sim.idCounter++,
                x: 680,
                y: 255 + (sim.customers.length % 3) * 32,
                desiredId: desired.id,
                phase: 'entering', // 'entering' | 'waiting' | 'checkout' | 'leaving'
                patience: 18,
                maxPatience: 18,
                happy: true,
                coatColor: ['#38bdf8', '#f59e0b', '#a855f7', '#fb7185', '#4ade80'][sim.idCounter % 5]
            });
        }

        function spawnVipOrder() {
            const eligible = RECIPES.filter((r) =>
                Object.keys(r.cost).every((m) => state.unlockedZones.includes('mine') || r.tier <= 1 || r.id === 'sword')
            );
            const r = eligible[Math.floor(Math.random() * eligible.length)] || RECIPES[0];
            const qty = r.tier <= 2 ? 2 : 1;
            sim.vipOrder = {
                recipeId: r.id,
                qty,
                rewardGold: Math.round(getSellPrice(r.id) * qty * 1.85),
                rewardRep: 6 + r.tier * 3,
                timeLeft: 32
            };
        }

        function serveCustomer(customerId, events) {
            const cust = customerId
                ? sim.customers.find((c) => c.id === customerId)
                : sim.customers.find((c) => c.phase === 'waiting' && (state.stock[c.desiredId] || 0) > 0);
            if (!cust || cust.phase === 'leaving') return false;
            if ((state.stock[cust.desiredId] || 0) <= 0) return false;

            state.stock[cust.desiredId] -= 1;
            const earned = earnGold(getSellPrice(cust.desiredId));
            state.reputation += 2;
            state.customersServed += 1;
            cust.phase = 'leaving';
            cust.happy = true;
            events.push({ type: 'sale', x: cust.x, y: cust.y, gold: earned, recipeId: cust.desiredId });
            return true;
        }

        function fulfillVipOrder() {
            if (!sim.vipOrder) return null;
            const o = sim.vipOrder;
            if ((state.stock[o.recipeId] || 0) < o.qty) return null;
            state.stock[o.recipeId] -= o.qty;
            const gold = earnGold(o.rewardGold);
            state.reputation += o.rewardRep;
            state.ordersCompleted += 1;
            sim.vipOrder = null;
            sim.nextVipIn = 18;
            return { type: 'vip', gold, rep: o.rewardRep };
        }

        function prestigeRebirth() {
            if (state.totalGoldEarned < 3000) return false;
            const nextPrestige = state.prestigeCount + 1;
            const keepMax = state.maxGoldHeld;
            const keepTotal = state.totalGoldEarned;
            const keepServed = state.customersServed;
            const keepOrders = state.ordersCompleted;
            const fresh = createDefaultState();
            Object.assign(state, fresh, {
                gold: 120 + nextPrestige * 80,
                prestigeCount: nextPrestige,
                maxGoldHeld: keepMax,
                totalGoldEarned: keepTotal,
                customersServed: keepServed,
                ordersCompleted: keepOrders
            });
            sim.customers.length = 0;
            sim.expedition.active = false;
            sim.crafting.active = false;
            sim.vipOrder = null;
            return true;
        }

        function applyOfflineEarnings() {
            const now = Date.now();
            const elapsedSec = clamp((now - state.lastTimestamp) / 1000, 0, 3600 * 4);
            state.lastTimestamp = now;
            if (elapsedSec < 12) return 0;
            const hasAuto = state.upgrades.autoExpedition > 0 && state.upgrades.autoCraft > 0;
            const ratePerSec = hasAuto ? (4 + state.upgrades.priceBoost * 3 + state.prestigeCount * 6) : 0.8;
            const gained = Math.round(elapsedSec * ratePerSec);
            if (gained > 0) earnGold(gained);
            return gained;
        }

        function step(dt) {
            const cleanDt = clamp(dt, 0, 0.25);
            const events = [];
            state.lastTimestamp = Date.now();

            // 1. Expedition progress
            if (!sim.expedition.active && state.upgrades.autoExpedition > 0) {
                startExpedition(state.activeZone);
            }
            if (sim.expedition.active) {
                sim.expedition.progress += cleanDt;
                if (sim.expedition.progress >= sim.expedition.duration) {
                    const zDef = ZONES.find((z) => z.id === sim.expedition.zoneId) || ZONES[0];
                    sim.expedition.active = false;
                    sim.expedition.progress = 0;
                    state.expeditionsRun += 1;
                    const gained = {};
                    Object.entries(zDef.drops).forEach(([mat, qty]) => {
                        const bonus = state.upgrades.heroSpeed >= 3 ? 1 : 0;
                        state.materials[mat] = (state.materials[mat] || 0) + qty + bonus;
                        gained[mat] = qty + bonus;
                    });
                    let chestGold = 0;
                    if (state.expeditionsRun % 4 === 0) {
                        chestGold = earnGold(Math.round(28 * (1 + state.prestigeCount * 0.35)));
                    }
                    events.push({ type: 'loot', zoneId: zDef.id, drops: gained, chestGold });
                }
            }

            if (sim.rushTimer > 0) sim.rushTimer = Math.max(0, sim.rushTimer - cleanDt);
            if (sim.rushCooldown > 0) sim.rushCooldown = Math.max(0, sim.rushCooldown - cleanDt);

            // 2. Crafting progress & auto-craft helper
            if (!sim.crafting.active && state.upgrades.autoCraft > 0) {
                // Prioritize stocked needs or highest unlocked craftable recipe
                const needed = sim.customers.find((c) => c.phase === 'waiting' && (state.stock[c.desiredId] || 0) === 0);
                const candidates = needed
                    ? [RECIPES.find((r) => r.id === needed.desiredId), ...RECIPES.slice().reverse()]
                    : RECIPES.slice().reverse();
                for (const rec of candidates) {
                    if (rec && startCraft(rec.id)) break;
                }
            }
            if (sim.crafting.active) {
                sim.crafting.progress += cleanDt;
                if (sim.crafting.progress >= sim.crafting.duration) {
                    const rId = sim.crafting.recipeId;
                    sim.crafting.active = false;
                    sim.crafting.progress = 0;
                    const cap = getShelfCap();
                    const cur = state.stock[rId] || 0;
                    const isMasterwork = Math.random() < 0.16 && cur + 2 <= cap;
                    const addQty = isMasterwork ? 2 : 1;
                    state.stock[rId] = cur + addQty;
                    events.push({ type: 'crafted', recipeId: rId, qty: addQty, masterwork: isMasterwork });
                }
            }

            // 3. Customers flow
            sim.nextCustomerIn -= cleanDt * (sim.rushTimer > 0 ? 1.9 : 1.0);
            if (sim.nextCustomerIn <= 0 && sim.customers.length < 4) {
                spawnCustomer();
                sim.nextCustomerIn = Math.max(1.6, 3.6 - state.shopLevel * 0.08);
            }

            for (let i = sim.customers.length - 1; i >= 0; i--) {
                const c = sim.customers[i];
                if (c.phase === 'entering') {
                    const slotX = 435 + (i % 3) * 58;
                    c.x += (slotX - c.x) * Math.min(1, cleanDt * 4.5);
                    if (Math.abs(c.x - slotX) < 5) c.phase = 'waiting';
                } else if (c.phase === 'waiting') {
                    c.patience -= cleanDt;
                    if ((state.stock[c.desiredId] || 0) > 0 && state.upgrades.autoCheckout > 0) {
                        serveCustomer(c.id, events);
                    } else if (c.patience <= 0) {
                        c.phase = 'leaving';
                        c.happy = false;
                        events.push({ type: 'impatient', x: c.x, y: c.y });
                    }
                } else if (c.phase === 'leaving') {
                    c.x += 170 * cleanDt;
                    if (c.x > 710) sim.customers.splice(i, 1);
                }
            }

            // 4. VIP Special Merchant Order
            if (!sim.vipOrder) {
                sim.nextVipIn -= cleanDt;
                if (sim.nextVipIn <= 0) spawnVipOrder();
            } else {
                sim.vipOrder.timeLeft -= cleanDt;
                if (sim.vipOrder.timeLeft <= 0) {
                    sim.vipOrder = null;
                    sim.nextVipIn = 14;
                }
            }

            return events;
        }

        return {
            state,
            sim,
            triggerRush,
            startExpedition,
            startCraft,
            unlockZone,
            buyUpgrade,
            serveCustomer,
            fulfillVipOrder,
            prestigeRebirth,
            applyOfflineEarnings,
            getSellPrice,
            getShelfCap,
            upgradeCost,
            step
        };
    }

    return {
        SAVE_KEY,
        MATERIALS,
        RECIPES,
        ZONES,
        createDefaultState,
        normalizeSave,
        upgradeCost,
        createSimulation
    };
});
