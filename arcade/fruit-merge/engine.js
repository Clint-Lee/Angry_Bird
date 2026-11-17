(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.FruitMergeEngine = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SAVE_KEY = 'cloudeave_fruit_merge_v1';

    const ARENA = {
        width: 420,
        height: 620,
        wallL: 12,
        wallR: 408,
        floorY: 604,
        dangerY: 112,
        spawnY: 54,
        gravity: 1380,
        subSteps: 6,
        solverIterations: 4,
        maxDropTier: 4
    };

    const TIERS = [
        {
            tier: 0, r: 16, score: 2,
            fruitName: '小樱桃', critterName: '奶糖鼠',
            colorA: '#ff6b81', colorB: '#c0183a', rim: '#ff9eb0', juice: '#ff4757'
        },
        {
            tier: 1, r: 22, score: 6,
            fruitName: '红草莓', critterName: '布丁喵',
            colorA: '#ff5252', colorB: '#b71c1c', rim: '#ff8a80', juice: '#ff5252'
        },
        {
            tier: 2, r: 28, score: 12,
            fruitName: '紫葡萄', critterName: '芋泥兔',
            colorA: '#a78bfa', colorB: '#5b21b6', rim: '#ddd6fe', juice: '#8b5cf6'
        },
        {
            tier: 3, r: 35, score: 20,
            fruitName: '砂糖橘', critterName: '脆脆柴',
            colorA: '#ffb347', colorB: '#d95b00', rim: '#ffe082', juice: '#ff9100'
        },
        {
            tier: 4, r: 42, score: 30,
            fruitName: '红富士', critterName: '青柠狐',
            colorA: '#fb7185', colorB: '#be123c', rim: '#fecdd3', juice: '#f43f5e'
        },
        {
            tier: 5, r: 50, score: 45,
            fruitName: '香甜梨', critterName: '团子企鹅',
            colorA: '#fde047', colorB: '#b45309', rim: '#fef08a', juice: '#eab308'
        },
        {
            tier: 6, r: 58, score: 65,
            fruitName: '水蜜桃', critterName: '草莓猪',
            colorA: '#fda4af', colorB: '#db2777', rim: '#ffe4e6', juice: '#f472b6'
        },
        {
            tier: 7, r: 68, score: 90,
            fruitName: '金菠萝', critterName: '蜂蜜熊',
            colorA: '#facc15', colorB: '#a16207', rim: '#fef9c3', juice: '#eab308'
        },
        {
            tier: 8, r: 78, score: 125,
            fruitName: '青椰子', critterName: '小熊猫',
            colorA: '#34d399', colorB: '#047857', rim: '#a7f3d0', juice: '#10b981'
        },
        {
            tier: 9, r: 90, score: 170,
            fruitName: '哈密瓜', critterName: '糯米虎',
            colorA: '#bef264', colorB: '#3f6212', rim: '#ecfccb', juice: '#84cc16'
        },
        {
            tier: 10, r: 104, score: 260,
            fruitName: '黄金西瓜', critterName: '皇冠狮',
            colorA: '#4ade80', colorB: '#15803d', rim: '#bbf7d0', juice: '#22c55e'
        }
    ];

    const CHAPTERS = [
        { id: 1, name: '晨露果园', subtitle: '掌握双果连消手感，突破障碍开启甜心进化', accent: '#f97316' },
        { id: 2, name: '冰霜甜品屋', subtitle: '活用弹跳木栓与周边合成，解封冻住的果实', accent: '#38bdf8' },
        { id: 3, name: '皇家金瓜祭', subtitle: '步数精算与连锁翻倍，冲击黄金大西瓜', accent: '#10b981' }
    ];

    const LEVELS = [
        {
            id: 1, chapter: 1, label: '1-1', name: '樱桃初遇',
            goalText: '合成 1 颗红富士 (5阶)', targetTier: 4, targetScore: 120,
            maxDrops: null, pegs: [],
            preset: [
                { tier: 2, x: 165, y: 560 }, { tier: 2, x: 255, y: 560 },
                { tier: 1, x: 210, y: 570 }
            ]
        },
        {
            id: 2, chapter: 1, label: '1-2', name: '蜜桃香气',
            goalText: '合成 1 颗水蜜桃 (7阶)', targetTier: 6, targetScore: 360,
            maxDrops: null, pegs: [],
            preset: [
                { tier: 3, x: 140, y: 558 }, { tier: 3, x: 280, y: 558 },
                { tier: 4, x: 210, y: 552 }
            ]
        },
        {
            id: 3, chapter: 1, label: '1-3', name: '双木分流',
            goalText: '避开木栓分流，合成金菠萝 (8阶)', targetTier: 7, targetScore: 550,
            maxDrops: null,
            pegs: [{ x: 142, y: 292, r: 16 }, { x: 278, y: 292, r: 16 }],
            preset: [{ tier: 4, x: 210, y: 552 }]
        },
        {
            id: 4, chapter: 1, label: '1-4', name: '限时步算',
            goalText: '24 步内达到 520 分并合成香甜梨', targetTier: 5, targetScore: 520,
            maxDrops: 24, pegs: [{ x: 210, y: 310, r: 15 }],
            preset: [
                { tier: 3, x: 130, y: 560 }, { tier: 3, x: 290, y: 560 }
            ]
        },
        {
            id: 5, chapter: 2, label: '2-1', name: '破冰救樱',
            goalText: '在冰果旁触发合成以解冻全部 2 颗冰果', targetTier: null, targetScore: 420,
            requireThaw: true, maxDrops: null, pegs: [],
            preset: [
                { tier: 3, x: 120, y: 564, frozen: true },
                { tier: 3, x: 300, y: 564, frozen: true }
            ]
        },
        {
            id: 6, chapter: 2, label: '2-2', name: '极光漏斗',
            goalText: '解冻底部冰果并合成水蜜桃', targetTier: 6, targetScore: 680,
            requireThaw: true, maxDrops: null,
            pegs: [{ x: 118, y: 270, r: 16 }, { x: 302, y: 270, r: 16 }, { x: 210, y: 372, r: 18 }],
            preset: [
                { tier: 4, x: 210, y: 556, frozen: true },
                { tier: 2, x: 145, y: 572 }
            ]
        },
        {
            id: 7, chapter: 2, label: '2-3', name: '三栓迷阵',
            goalText: '合成青椰子 (9阶) 且达到 950 分', targetTier: 8, targetScore: 950,
            maxDrops: null,
            pegs: [
                { x: 152, y: 254, r: 15 }, { x: 268, y: 254, r: 15 },
                { x: 210, y: 368, r: 16 }
            ],
            preset: [{ tier: 5, x: 160, y: 548 }, { tier: 5, x: 260, y: 548 }]
        },
        {
            id: 8, chapter: 2, label: '2-4', name: '冰封三子',
            goalText: '融化 3 颗寒霜水果，32 步内拿到 1100 分', targetTier: null, targetScore: 1100,
            requireThaw: true, maxDrops: 32,
            pegs: [{ x: 210, y: 288, r: 17 }],
            preset: [
                { tier: 2, x: 105, y: 572, frozen: true },
                { tier: 3, x: 210, y: 564, frozen: true },
                { tier: 2, x: 315, y: 572, frozen: true }
            ]
        },
        {
            id: 9, chapter: 3, label: '3-1', name: '哈密奇缘',
            goalText: '合成 1 颗巨无霸哈密瓜 (10阶)', targetTier: 9, targetScore: 1400,
            maxDrops: null,
            pegs: [{ x: 126, y: 316, r: 15 }, { x: 294, y: 316, r: 15 }],
            preset: [
                { tier: 6, x: 148, y: 540 },
                { tier: 6, x: 272, y: 540 }
            ]
        },
        {
            id: 10, chapter: 3, label: '3-2', name: '步步生甜',
            goalText: '30 步内达到 1750 分且解冻冰心蜜桃', targetTier: null, targetScore: 1750,
            requireThaw: true, maxDrops: 30,
            pegs: [{ x: 160, y: 268, r: 14 }, { x: 260, y: 268, r: 14 }],
            preset: [
                { tier: 6, x: 210, y: 542, frozen: true },
                { tier: 4, x: 112, y: 556 },
                { tier: 4, x: 308, y: 556 }
            ]
        },
        {
            id: 11, chapter: 3, label: '3-3', name: '金瓜前哨',
            goalText: '冲击终极黄金西瓜 (11阶)', targetTier: 10, targetScore: 2200,
            maxDrops: null,
            pegs: [{ x: 96, y: 256, r: 14 }, { x: 324, y: 256, r: 14 }],
            preset: [
                { tier: 7, x: 136, y: 530 },
                { tier: 7, x: 284, y: 530 },
                { tier: 5, x: 210, y: 548 }
            ]
        },
        {
            id: 12, chapter: 3, label: '3-4', name: '果王传说',
            goalText: '融化所有冰果并合出黄金大西瓜', targetTier: 10, targetScore: 2800,
            requireThaw: true, maxDrops: null,
            pegs: [{ x: 152, y: 252, r: 14 }, { x: 268, y: 252, r: 14 }],
            preset: [
                { tier: 8, x: 156, y: 520 },
                { tier: 8, x: 264, y: 520 },
                { tier: 3, x: 56, y: 564, frozen: true },
                { tier: 3, x: 364, y: 564, frozen: true }
            ]
        }
    ];

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function createWorld(options) {
        const opts = options || {};
        const mode = opts.mode === 'campaign' ? 'campaign' : 'endless';
        const levelIndex = clamp(Number(opts.levelIndex) || 0, 0, LEVELS.length - 1);
        const level = mode === 'campaign' ? LEVELS[levelIndex] : null;
        const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;

        let nextBodyId = 1;
        let stepCounter = 0;

        const bodies = [];
        const pegs = (level && Array.isArray(level.pegs))
            ? level.pegs.map((p) => ({ x: p.x, y: p.y, r: p.r || 15 }))
            : [];

        if (level && Array.isArray(level.preset)) {
            for (const p of level.preset) {
                const t = clamp(p.tier, 0, TIERS.length - 1);
                const def = TIERS[t];
                bodies.push({
                    id: nextBodyId++,
                    tier: t,
                    r: def.r,
                    x: clamp(p.x, ARENA.wallL + def.r, ARENA.wallR - def.r),
                    y: clamp(p.y, ARENA.dangerY + def.r + 12, ARENA.floorY - def.r),
                    vx: 0,
                    vy: 0,
                    angle: 0,
                    angVel: 0,
                    age: 2.0,
                    frozen: !!p.frozen,
                    squash: 0,
                    happyTimer: 0,
                    blinkPhase: rng() * 6,
                    bornStep: 0
                });
            }
        }

        function pickSpawnTier() {
            const roll = rng();
            if (roll < 0.30) return 0;
            if (roll < 0.58) return 1;
            if (roll < 0.80) return 2;
            if (roll < 0.94) return 3;
            return 4;
        }

        const world = {
            mode,
            levelIndex,
            level,
            bodies,
            pegs,
            score: 0,
            merges: 0,
            grandSlams: 0,
            maxTierSeen: bodies.reduce((m, b) => Math.max(m, b.tier), 0),
            dropsUsed: 0,
            dropsLeft: (level && level.maxDrops) ? level.maxDrops : null,
            currentTier: pickSpawnTier(),
            nextTier: pickSpawnTier(),
            aimX: ARENA.width * 0.5,
            combo: 0,
            comboTimer: 0,
            bestCombo: 0,
            energy: 0,
            energyGoal: 12,
            tools: { wand: 1, spoon: 1, shake: 1 },
            overflowTime: 0,
            overflowLimit: 2.8,
            inDanger: false,
            settleTimer: 0,
            shakeVisualTimer: 0,
            status: 'playing', // 'playing' | 'won' | 'lost'
            lossReason: ''
        };

        function getDropBounds(tier) {
            const r = TIERS[clamp(tier, 0, TIERS.length - 1)].r;
            return { minX: ARENA.wallL + r + 2, maxX: ARENA.wallR - r - 2, r };
        }

        world.setAimX = function (x) {
            const b = getDropBounds(world.currentTier);
            world.aimX = clamp(Number(x) || ARENA.width * 0.5, b.minX, b.maxX);
            return world.aimX;
        };

        world.predictDropY = function (x, tier) {
            const t = clamp(tier == null ? world.currentTier : tier, 0, TIERS.length - 1);
            const r = TIERS[t].r;
            const cx = clamp(x == null ? world.aimX : x, ARENA.wallL + r + 2, ARENA.wallR - r - 2);
            let minY = ARENA.floorY - r;

            for (const b of world.bodies) {
                const sumR = r + b.r;
                const dx = cx - b.x;
                if (Math.abs(dx) < sumR) {
                    const dy = Math.sqrt(sumR * sumR - dx * dx);
                    const candidate = b.y - dy;
                    if (candidate > ARENA.spawnY && candidate < minY) {
                        minY = candidate;
                    }
                }
            }
            for (const p of world.pegs) {
                const sumR = r + p.r;
                const dx = cx - p.x;
                if (Math.abs(dx) < sumR) {
                    const dy = Math.sqrt(sumR * sumR - dx * dx);
                    const candidate = p.y - dy;
                    if (candidate > ARENA.spawnY && candidate < minY) {
                        minY = candidate;
                    }
                }
            }
            return { x: cx, y: minY, r };
        };

        world.drop = function (xOverride) {
            if (world.status !== 'playing') return null;
            if (world.dropsLeft !== null && world.dropsLeft <= 0) return null;

            const tier = world.currentTier;
            const def = TIERS[tier];
            const b = getDropBounds(tier);
            const spawnX = clamp(xOverride != null ? xOverride : world.aimX, b.minX, b.maxX);
            world.aimX = spawnX;

            const body = {
                id: nextBodyId++,
                tier,
                r: def.r,
                x: spawnX,
                y: ARENA.spawnY,
                vx: (rng() - 0.5) * 18,
                vy: 120,
                angle: (rng() - 0.5) * 0.25,
                angVel: (rng() - 0.5) * 1.4,
                age: 0,
                frozen: false,
                squash: 0.20,
                happyTimer: 0,
                blinkPhase: rng() * 6,
                bornStep: stepCounter
            };

            world.bodies.push(body);
            world.dropsUsed += 1;
            if (world.dropsLeft !== null) {
                world.dropsLeft = Math.max(0, world.dropsLeft - 1);
                world.settleTimer = 1.65;
            }
            world.maxTierSeen = Math.max(world.maxTierSeen, tier);
            world.currentTier = world.nextTier;
            world.nextTier = pickSpawnTier();
            world.setAimX(world.aimX);
            return body;
        };

        function thawNearby(cx, cy, mergeRadius, events) {
            const reach = mergeRadius + 58;
            let thawed = 0;
            for (const b of world.bodies) {
                if (!b.frozen) continue;
                const dx = b.x - cx;
                const dy = b.y - cy;
                if (dx * dx + dy * dy <= (reach + b.r) * (reach + b.r)) {
                    b.frozen = false;
                    b.vy = -120;
                    b.squash = 0.28;
                    b.happyTimer = 1.4;
                    thawed += 1;
                    events.push({ type: 'thaw', x: b.x, y: b.y, r: b.r, tier: b.tier });
                }
            }
            return thawed;
        }

        function grantEnergy(events) {
            world.energy += 1;
            if (world.energy >= world.energyGoal) {
                world.energy = 0;
                const keys = ['spoon', 'shake', 'wand'];
                let pick = keys[0];
                for (const k of keys) {
                    if (world.tools[k] < world.tools[pick]) pick = k;
                }
                if (world.tools[pick] < 5) {
                    world.tools[pick] += 1;
                    events.push({ type: 'toolEarned', tool: pick });
                }
            }
        }

        function resolveMerges(events) {
            const removed = new Set();
            const additions = [];
            let mergedAny = true;
            let pass = 0;

            while (mergedAny && pass < 4) {
                mergedAny = false;
                pass += 1;
                const len = world.bodies.length;
                for (let i = 0; i < len; i++) {
                    const a = world.bodies[i];
                    if (removed.has(a.id) || a.frozen) continue;
                    for (let j = i + 1; j < len; j++) {
                        const b = world.bodies[j];
                        if (removed.has(b.id) || b.frozen) continue;
                        if (a.tier !== b.tier) continue;
                        if (a.bornStep === stepCounter || b.bornStep === stepCounter) continue;

                        const dx = b.x - a.x;
                        const dy = b.y - a.y;
                        const maxD = a.r + b.r + 1.2;
                        if (dx * dx + dy * dy > maxD * maxD) continue;

                        removed.add(a.id);
                        removed.add(b.id);
                        mergedAny = true;

                        const midX = (a.x + b.x) * 0.5;
                        const midY = (a.y + b.y) * 0.5;

                        world.merges += 1;
                        if (world.comboTimer > 0) {
                            world.combo += 1;
                        } else {
                            world.combo = 1;
                        }
                        world.comboTimer = 1.65;
                        world.bestCombo = Math.max(world.bestCombo, world.combo);

                        const mult = 1 + Math.min(4, (world.combo - 1) * 0.35);

                        if (a.tier >= TIERS.length - 1) {
                            // Grand Slam: two Giant Watermelons explode into joy & points!
                            const pts = Math.round(300 * mult);
                            world.score += pts;
                            world.grandSlams += 1;
                            if (world.tools.wand < 5) world.tools.wand += 1;
                            thawNearby(midX, midY, 180, events);
                            events.push({
                                type: 'grandSlam',
                                x: midX, y: midY,
                                scoreDelta: pts,
                                combo: world.combo,
                                tier: a.tier
                            });
                            // Gentle radial push
                            for (const other of world.bodies) {
                                if (removed.has(other.id) || other.frozen) continue;
                                const ox = other.x - midX;
                                const oy = other.y - midY;
                                const od = Math.hypot(ox, oy) || 1;
                                if (od < 240) {
                                    const f = (1 - od / 240) * 320;
                                    other.vx += (ox / od) * f;
                                    other.vy += (oy / od) * f - 80;
                                }
                            }
                        } else {
                            const nextTier = a.tier + 1;
                            const nextDef = TIERS[nextTier];
                            const pts = Math.round(nextDef.score * mult);
                            world.score += pts;
                            world.maxTierSeen = Math.max(world.maxTierSeen, nextTier);
                            if (nextTier >= 8) grantEnergy(events);
                            if (nextTier === TIERS.length - 1 && world.tools.spoon < 5) {
                                world.tools.spoon += 1;
                            }

                            const spawned = {
                                id: nextBodyId++,
                                tier: nextTier,
                                r: nextDef.r,
                                x: clamp(midX, ARENA.wallL + nextDef.r, ARENA.wallR - nextDef.r),
                                y: clamp(midY, ARENA.dangerY - 20, ARENA.floorY - nextDef.r),
                                vx: clamp((a.vx + b.vx) * 0.45, -220, 220),
                                vy: -68,
                                angle: (a.angle + b.angle) * 0.5,
                                angVel: clamp((a.angVel + b.angVel) * 0.5, -6, 6),
                                age: 0.45,
                                frozen: false,
                                squash: 0.40,
                                happyTimer: 1.4,
                                blinkPhase: rng() * 6,
                                bornStep: stepCounter
                            };

                            // Merge outward shockwave: nudges nearby fruits so stacks shift & chain naturally
                            const blastR = nextDef.r * 2.35 + 34;
                            const basePush = 115 + nextDef.r * 1.25;
                            for (const other of world.bodies) {
                                if (removed.has(other.id) || other.frozen) continue;
                                const ox = other.x - spawned.x;
                                const oy = other.y - spawned.y;
                                const od = Math.hypot(ox, oy) || 0.001;
                                if (od < blastR) {
                                    const falloff = 1 - od / blastR;
                                    const massRatio = clamp(nextDef.r / Math.max(12, other.r), 0.45, 1.85);
                                    const imp = basePush * falloff * massRatio;
                                    other.vx += (ox / od) * imp;
                                    other.vy += (oy / od) * imp - 35 * falloff;
                                    other.angVel += (ox >= 0 ? 1 : -1) * falloff * 1.8;
                                }
                            }

                            additions.push(spawned);
                            thawNearby(spawned.x, spawned.y, nextDef.r, events);
                            grantEnergy(events);
                            events.push({
                                type: 'merge',
                                x: spawned.x, y: spawned.y,
                                r: nextDef.r,
                                tier: nextTier,
                                scoreDelta: pts,
                                combo: world.combo
                            });
                        }
                        break;
                    }
                }
                if (removed.size > 0 || additions.length > 0) {
                    world.bodies = world.bodies.filter((b) => !removed.has(b.id));
                    for (const nb of additions) world.bodies.push(nb);
                    additions.length = 0;
                    removed.clear();
                }
            }
        }

        world.useSpoon = function (bodyId) {
            if (world.status !== 'playing' || world.tools.spoon <= 0) return false;
            const idx = world.bodies.findIndex((b) => b.id === bodyId && !b.frozen);
            if (idx < 0) return false;
            const removed = world.bodies.splice(idx, 1)[0];
            world.tools.spoon -= 1;
            world.overflowTime = Math.max(0, world.overflowTime - 1.2);
            return removed;
        };

        world.useWand = function (bodyId) {
            if (world.status !== 'playing' || world.tools.wand <= 0) return null;
            const idx = world.bodies.findIndex((b) => b.id === bodyId && !b.frozen && b.tier < TIERS.length - 1);
            if (idx < 0) return null;
            const b = world.bodies[idx];
            const nextTier = b.tier + 1;
            const nextDef = TIERS[nextTier];
            b.tier = nextTier;
            b.r = nextDef.r;
            b.x = clamp(b.x, ARENA.wallL + b.r, ARENA.wallR - b.r);
            b.y = clamp(b.y, ARENA.dangerY + 10, ARENA.floorY - b.r);
            b.vy = -95;
            b.squash = 0.34;
            b.happyTimer = 1.5;
            world.score += nextDef.score;
            world.maxTierSeen = Math.max(world.maxTierSeen, nextTier);
            world.tools.wand -= 1;

            const events = [];
            stepCounter += 1;
            b.bornStep = -1;
            thawNearby(b.x, b.y, b.r, events);
            resolveMerges(events);
            return { upgraded: b, events };
        };

        world.useShake = function () {
            if (world.status !== 'playing' || world.tools.shake <= 0) return false;
            world.tools.shake -= 1;
            world.shakeVisualTimer = 0.55;
            for (const b of world.bodies) {
                if (b.frozen) continue;
                b.vy -= 170 + rng() * 110;
                b.vx += (rng() - 0.5) * 260;
                b.angVel += (rng() - 0.5) * 4;
                b.squash = 0.2;
            }
            return true;
        };

        function checkCampaignOutcome() {
            if (world.mode !== 'campaign' || !level || world.status !== 'playing') return;
            const frozenCount = world.bodies.filter((b) => b.frozen).length;
            const targetOk = level.targetTier == null || world.bodies.some((b) => !b.frozen && b.tier >= level.targetTier);
            const scoreOk = level.targetScore == null || world.score >= level.targetScore;
            const thawOk = !level.requireThaw || frozenCount === 0;

            if (targetOk && scoreOk && thawOk) {
                world.status = 'won';
                return;
            }

            if (world.dropsLeft !== null && world.dropsLeft <= 0 && world.settleTimer <= 0) {
                const maxSpeedSq = world.bodies.reduce((m, b) => Math.max(m, b.vx * b.vx + b.vy * b.vy), 0);
                if (maxSpeedSq < 450 || world.settleTimer <= -0.9) {
                    world.status = 'lost';
                    world.lossReason = '步数已用尽，未达成关卡目标';
                }
            }
        }

        world.step = function (dtInput) {
            if (world.status !== 'playing') return [];
            const dt = clamp(Number(dtInput) || 1 / 60, 0.001, 0.04);
            const subDt = dt / ARENA.subSteps;
            const events = [];

            stepCounter += 1;

            if (world.comboTimer > 0) {
                world.comboTimer = Math.max(0, world.comboTimer - dt);
                if (world.comboTimer === 0) world.combo = 0;
            }
            if (world.shakeVisualTimer > 0) {
                world.shakeVisualTimer = Math.max(0, world.shakeVisualTimer - dt);
            }
            if (world.dropsLeft !== null && world.dropsLeft <= 0) {
                world.settleTimer -= dt;
            }

            for (const b of world.bodies) {
                b.age += dt;
                b.squash = Math.max(0, b.squash - dt * 2.2);
                b.happyTimer = Math.max(0, b.happyTimer - dt);
                b.blinkPhase += dt;
            }

            for (let s = 0; s < ARENA.subSteps; s++) {
                // 1. Integrate gravity, minimal air drag & angular motion
                const airDrag = 1 - 0.14 * subDt;
                const spinAirDrag = 1 - 0.28 * subDt;
                for (const b of world.bodies) {
                    if (b.frozen) continue;
                    b.vy += ARENA.gravity * subDt;
                    b.vx *= airDrag;
                    b.vy *= airDrag;
                    b.x += b.vx * subDt;
                    b.y += b.vy * subDt;
                    b.angle += b.angVel * subDt;
                    b.angVel *= spinAirDrag;
                }

                // 2. Multi-iteration rigid-body impulse & position solver
                const iters = ARENA.solverIterations;
                const n = world.bodies.length;
                for (let iter = 0; iter < iters; iter++) {
                    // 2a. Walls, Floor & Pegs
                    for (const b of world.bodies) {
                        if (b.frozen) continue;
                        const m = b.r * b.r;
                        const invM = 1 / m;
                        const invI = 2 / (m * b.r * b.r); // Solid disk I = 0.5 * m * r^2

                        // Left / Right Glass Walls
                        if (b.x - b.r < ARENA.wallL) {
                            b.x = ARENA.wallL + b.r;
                            if (b.vx < 0) {
                                const rest = -b.vx > 55 ? 0.30 : 0.0;
                                const jn = -(1 + rest) * b.vx * m;
                                b.vx += jn * invM;
                                // Vertical slip along left wall: contact at (-r, 0), vt = vy - angVel * r
                                const vt = b.vy - b.angVel * b.r;
                                const jt = clamp(-vt / (3 * invM), -0.14 * jn, 0.14 * jn);
                                b.vy += jt * invM;
                                b.angVel -= (jt * b.r) * invI;
                            }
                        } else if (b.x + b.r > ARENA.wallR) {
                            b.x = ARENA.wallR - b.r;
                            if (b.vx > 0) {
                                const rest = b.vx > 55 ? 0.30 : 0.0;
                                const jn = (1 + rest) * b.vx * m; // magnitude
                                b.vx -= jn * invM;
                                // Vertical slip along right wall: contact at (+r, 0), vt = vy + angVel * r
                                const vt = b.vy + b.angVel * b.r;
                                const jt = clamp(-vt / (3 * invM), -0.14 * jn, 0.14 * jn);
                                b.vy += jt * invM;
                                b.angVel += (jt * b.r) * invI;
                            }
                        }

                        // Floor contact with true rolling friction (no artificial glue!)
                        if (b.y + b.r > ARENA.floorY) {
                            b.y = ARENA.floorY - b.r;
                            if (iter === 0 && b.vy > 95 && events.length < 10) {
                                events.push({ type: 'bounce', speed: b.vy, x: b.x, y: ARENA.floorY });
                            }
                            if (b.vy > 0) {
                                if (iter === 0 && b.vy > 110) {
                                    b.squash = Math.max(b.squash, Math.min(0.20, b.vy / 2200));
                                }
                                const rest = b.vy > 55 ? 0.28 : 0.0;
                                const jn = (1 + rest) * b.vy * m;
                                b.vy = -b.vy * rest;

                                // Contact point at bottom (0, +r): vt = vx - angVel * r
                                const vt = b.vx - b.angVel * b.r;
                                const maxFric = Math.max(jn * 0.22, m * ARENA.gravity * subDt * 0.22);
                                const jt = clamp(-vt / (3 * invM), -maxFric, maxFric);
                                b.vx += jt * invM;
                                b.angVel -= (jt * b.r) * invI;

                                // Subtle rolling resistance so fruits roll smoothly and eventually settle
                                if (iter === 0) {
                                    const rollDamp = 1 - 0.55 * subDt;
                                    b.vx *= rollDamp;
                                    b.angVel *= rollDamp;
                                }
                            }
                        }

                        // Pegs (infinite mass static bumpers)
                        for (const p of world.pegs) {
                            const dx = b.x - p.x;
                            const dy = b.y - p.y;
                            const minD = b.r + p.r;
                            const d2 = dx * dx + dy * dy;
                            if (d2 < minD * minD) {
                                const d = Math.sqrt(d2) || 0.001;
                                const nx = dx / d;
                                const ny = dy / d;
                                const overlap = minD - d;
                                b.x += nx * overlap;
                                b.y += ny * overlap;

                                const vn = b.vx * nx + b.vy * ny;
                                if (vn < 0) {
                                    const rest = -vn > 45 ? 0.46 : 0.05;
                                    const jn = -(1 + rest) * vn * m;
                                    b.vx += jn * invM * nx;
                                    b.vy += jn * invM * ny;

                                    const tx = -ny;
                                    const ty = nx;
                                    // Peg contact on b is at -b.r*(nx, ny) -> rim tangential contrib is -b.angVel*b.r
                                    const vt = (b.vx * tx + b.vy * ty) - b.angVel * b.r;
                                    const jt = clamp(-vt / (3 * invM), -0.22 * jn, 0.22 * jn);
                                    b.vx += jt * invM * tx;
                                    b.vy += jt * invM * ty;
                                    b.angVel -= (jt * b.r) * invI;

                                    if (iter === 0 && -vn > 100 && events.length < 10) {
                                        events.push({ type: 'peg', x: p.x, y: p.y, speed: -vn });
                                    }
                                }
                            }
                        }
                    }

                    // 2b. Circle-circle dynamic rigid-body resolution (action-reaction + spin)
                    for (let i = 0; i < n; i++) {
                        const a = world.bodies[i];
                        const massA = a.frozen ? 1e9 : a.r * a.r;
                        const invMA = a.frozen ? 0 : 1 / massA;
                        const invIA = a.frozen ? 0 : 2 / (massA * a.r * a.r);

                        for (let j = i + 1; j < n; j++) {
                            const b = world.bodies[j];
                            const dx = b.x - a.x;
                            const dy = b.y - a.y;
                            const minD = a.r + b.r;
                            const d2 = dx * dx + dy * dy;
                            if (d2 >= minD * minD) continue;

                            const d = Math.sqrt(d2) || 0.001;
                            const nx = dx / d;
                            const ny = dy / d;
                            const overlap = minD - d;

                            const massB = b.frozen ? 1e9 : b.r * b.r;
                            const invMB = b.frozen ? 0 : 1 / massB;
                            const invIB = b.frozen ? 0 : 2 / (massB * b.r * b.r);
                            const invSum = invMA + invMB;
                            if (invSum <= 0) continue;

                            // Smooth Baumgarte separation across solver iterations
                            const corr = Math.max(0, overlap - 0.08) * 0.46 / invSum;
                            a.x -= nx * corr * invMA;
                            a.y -= ny * corr * invMA;
                            b.x += nx * corr * invMB;
                            b.y += ny * corr * invMB;

                            const rvx = b.vx - a.vx;
                            const rvy = b.vy - a.vy;
                            const vn = rvx * nx + rvy * ny;
                            if (vn < 0) {
                                const restitution = -vn > 70 ? 0.24 : 0.02;
                                const jn = -(1 + restitution) * vn / invSum;
                                a.vx -= jn * invMA * nx;
                                a.vy -= jn * invMA * ny;
                                b.vx += jn * invMB * nx;
                                b.vy += jn * invMB * ny;

                                // Contact tangential velocity including surface rotation of both circles
                                const tx = -ny;
                                const ty = nx;
                                const vt = (rvx * tx + rvy * ty) - (a.angVel * a.r + b.angVel * b.r);
                                const invEffT = invMA + invMB + (a.r * a.r) * invIA + (b.r * b.r) * invIB;
                                const mu = 0.085; // Low fruit-skin friction so fruits roll off curved tops into gaps
                                const jt = clamp(-vt / invEffT, -jn * mu, jn * mu);

                                a.vx -= jt * invMA * tx;
                                a.vy -= jt * invMA * ty;
                                b.vx += jt * invMB * tx;
                                b.vy += jt * invMB * ty;

                                a.angVel -= (jt * a.r) * invIA;
                                b.angVel -= (jt * b.r) * invIB;

                                if (iter === 0 && -vn > 110) {
                                    const sq = Math.min(0.16, (-vn) / 2400);
                                    if (!a.frozen) a.squash = Math.max(a.squash, sq);
                                    if (!b.frozen) b.squash = Math.max(b.squash, sq);
                                    if (events.length < 10) {
                                        events.push({ type: 'bounce', speed: -vn, x: a.x + nx * a.r, y: a.y + ny * a.r });
                                    }
                                }
                            }
                        }
                    }
                }

                // 3. Final boundary clamp & gentle sleep threshold (only at near-zero micro-jitter)
                for (const b of world.bodies) {
                    if (b.frozen) continue;
                    b.x = clamp(b.x, ARENA.wallL + b.r, ARENA.wallR - b.r);
                    if (b.y + b.r > ARENA.floorY) b.y = ARENA.floorY - b.r;
                    if (Math.abs(b.vx) < 2.2 && Math.abs(b.vy) < 2.2 && Math.abs(b.angVel) < 0.06) {
                        b.vx *= 0.88;
                        b.angVel *= 0.86;
                    }
                }

                resolveMerges(events);
            }

            // Danger / Overflow detection (only settled fruits count)
            let touchingDanger = false;
            for (const b of world.bodies) {
                if (b.age > 1.25 && b.y - b.r < ARENA.dangerY) {
                    touchingDanger = true;
                    break;
                }
            }
            world.inDanger = touchingDanger;
            if (touchingDanger) {
                world.overflowTime += dt;
                if (world.overflowTime >= world.overflowLimit) {
                    world.status = 'lost';
                    world.lossReason = '果实溢出警戒线太久啦';
                }
            } else {
                world.overflowTime = Math.max(0, world.overflowTime - dt * 2.2);
            }

            checkCampaignOutcome();
            return events;
        };

        world.evaluateStars = function () {
            if (world.mode !== 'campaign' || !level || world.status !== 'won') return 0;
            const bonusTarget = (level.targetScore || 500) * 1.45;
            if (world.score >= bonusTarget || world.bestCombo >= 3) return 3;
            if (world.score >= (level.targetScore || 400) * 1.15) return 2;
            return 1;
        };

        return world;
    }

    function normalizeSave(raw) {
        const clean = {
            theme: raw && raw.theme === 'critters' ? 'critters' : 'fruit',
            muted: !!(raw && raw.muted),
            endlessHighScore: Math.max(0, Math.floor(Number(raw && raw.endlessHighScore) || 0)),
            highestTier: clamp(Math.floor(Number(raw && raw.highestTier) || 0), 0, TIERS.length - 1),
            gamesPlayed: Math.max(0, Math.floor(Number(raw && raw.gamesPlayed) || 0)),
            totalWatermelons: Math.max(0, Math.floor(Number(raw && raw.totalWatermelons) || 0)),
            unlockedLevel: clamp(Math.floor(Number(raw && raw.unlockedLevel) || 1), 1, LEVELS.length),
            currentLevelIndex: clamp(Math.floor(Number(raw && raw.currentLevelIndex) || 0), 0, LEVELS.length - 1),
            levelStars: {},
            levelScores: {}
        };
        if (raw && raw.levelStars && typeof raw.levelStars === 'object') {
            for (const lvl of LEVELS) {
                const s = Number(raw.levelStars[lvl.id]);
                if (s > 0) clean.levelStars[lvl.id] = clamp(Math.floor(s), 1, 3);
            }
        }
        if (raw && raw.levelScores && typeof raw.levelScores === 'object') {
            for (const lvl of LEVELS) {
                const sc = Number(raw.levelScores[lvl.id]);
                if (sc > 0) clean.levelScores[lvl.id] = Math.floor(sc);
            }
        }
        return clean;
    }

    function totalCampaignStars(save) {
        if (!save || !save.levelStars) return 0;
        return Object.values(save.levelStars).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }

    return {
        SAVE_KEY,
        ARENA,
        TIERS,
        CHAPTERS,
        LEVELS,
        createWorld,
        normalizeSave,
        totalCampaignStars
    };
});
