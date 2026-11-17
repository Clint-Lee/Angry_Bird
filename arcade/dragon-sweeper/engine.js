(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.DragonSweeperEngine = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SAVE_KEY = 'cloudeave_dragon_sweeper_v1';

    const MONSTERS = {
        1: { lv: 1, name: '史莱姆', eng: 'Slime', color: '#4ade80', score: 100, desc: '游荡的粘液怪，战力 Lv.1 即刻秒杀' },
        2: { lv: 2, name: '暗影蝙蝠', eng: 'Bat', color: '#38bdf8', score: 220, desc: '洞窟翼兽，建议升至 Lv.2 再猎杀' },
        3: { lv: 3, name: '哥布林', eng: 'Goblin', color: '#a3e635', score: 380, desc: '狡猾的短斧掠夺者，强行越级会受反伤' },
        4: { lv: 4, name: '骷髅战斧', eng: 'Skeleton', color: '#e2e8f0', score: 620, desc: '亡灵重甲兵，建议寻找铁匠升级后迎战' },
        5: { lv: 5, name: '血翼石像鬼', eng: 'Gargoyle', color: '#c084fc', score: 950, desc: '高阶守护雕像，注意利用数字线索避让' },
        6: { lv: 6, name: '黑曜魔像', eng: 'Golem', color: '#fb923c', score: 1400, desc: '熔岩锻造的重型守卫，近乎Boss的压迫力' },
        7: { lv: 7, name: '炎狱魔龙', eng: 'Abyss Dragon', color: '#fb7185', score: 3000, desc: '地城领主 BOSS！将其讨伐即可宣告征服本层' }
    };

    const ITEMS = {
        potion: { kind: 'potion', name: '圣光药水', short: '+3 HP', color: '#f43f5e' },
        forge: { kind: 'forge', name: '秘银锻造台', short: '+1 战力', color: '#38bdf8' },
        shield: { kind: 'shield', name: '壁垒圣盾', short: '+3 护盾', color: '#fbbf24' },
        scroll: { kind: 'scroll', name: '鹰眼卷轴', short: '+1 扫描', color: '#c084fc' },
        chest: { kind: 'chest', name: '远古金币箱', short: '+2 XP', color: '#fde047' }
    };

    const STAGES = [
        {
            id: 1, label: '1-1', name: '翠林前哨', rows: 6, cols: 6, hp: 6, scrolls: 2, bossLv: 5,
            subtitle: '沿安全区数字线索追猎 Lv.1~3 小怪升级，再击败 Lv.5 石像鬼首领！',
            monsters: { 1: 5, 2: 4, 3: 3, 4: 1 },
            items: { potion: 2, forge: 1, shield: 1, chest: 2 },
            rocks: [[1, 1], [4, 4]], seed: 1011
        },
        {
            id: 2, label: '1-2', name: '幽暗矿坑', rows: 6, cols: 6, hp: 6, scrolls: 2, bossLv: 6,
            subtitle: '石柱隔断矿道！合理使用「鹰眼卷轴」定位并击倒 Lv.6 黑曜魔像',
            monsters: { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 },
            items: { potion: 2, forge: 1, shield: 1, chest: 2 },
            rocks: [[1, 4], [2, 1], [4, 3]], seed: 2023
        },
        {
            id: 3, label: '1-3', name: '枯骨地穴', rows: 7, cols: 7, hp: 7, scrolls: 2, bossLv: 7,
            subtitle: '传说炎狱魔龙 (Lv.7) 首次现身！稳步累积 XP 与锻造台后再迎战巨龙',
            monsters: { 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 },
            items: { potion: 3, forge: 2, shield: 1, chest: 2, scroll: 1 },
            rocks: [[1, 1], [1, 5], [5, 1], [5, 5]], seed: 3037
        },
        {
            id: 4, label: '1-4', name: '霜冻哨塔', rows: 7, cols: 7, hp: 7, scrolls: 1, bossLv: 7,
            subtitle: '中阶怪密度骤增！务必先标记高危格，用算术排除法锁定低阶怪',
            monsters: { 1: 5, 2: 5, 3: 5, 4: 4, 5: 2, 6: 1 },
            items: { potion: 3, forge: 2, shield: 2, chest: 2, scroll: 1 },
            rocks: [[0, 3], [3, 0], [3, 6], [6, 3]], seed: 4049
        },
        {
            id: 5, label: '1-5', name: '黑曜堡垒', rows: 8, cols: 8, hp: 7, scrolls: 1, bossLv: 7,
            subtitle: '8×8 双翼神殿，利用血药保留战术续航，必要时可故意硬抗低阶怪突围',
            monsters: { 1: 7, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2 },
            items: { potion: 3, forge: 2, shield: 2, chest: 3, scroll: 1 },
            rocks: [[2, 2], [2, 5], [5, 2], [5, 5], [3, 4]], seed: 5051
        },
        {
            id: 6, label: '1-6', name: '血月回廊', rows: 8, cols: 8, hp: 6, scrolls: 1, bossLv: 7,
            subtitle: '初始生命仅 6 点！错踩一次高等级守护者就会触发致命连环伤害',
            monsters: { 1: 6, 2: 6, 3: 5, 4: 5, 5: 4, 6: 2 },
            items: { potion: 3, forge: 2, shield: 2, chest: 3, scroll: 1 },
            rocks: [[1, 3], [2, 3], [5, 4], [6, 4], [4, 1], [4, 6]], seed: 6067
        },
        {
            id: 7, label: '1-7', name: '炼狱前庭', rows: 9, cols: 9, hp: 7, scrolls: 1, bossLv: 7,
            subtitle: '9×9 大型禁区！三尊黑曜魔像护卫龙巢，先搜寻角落锻造台提升战力',
            monsters: { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3 },
            items: { potion: 4, forge: 2, shield: 2, chest: 4, scroll: 2 },
            rocks: [[1, 1], [1, 7], [4, 4], [7, 1], [7, 7], [2, 4], [6, 4]], seed: 7079
        },
        {
            id: 8, label: '1-8', name: '炎狱龙巢 · 终试', rows: 9, cols: 9, hp: 6, scrolls: 1, bossLv: 7,
            subtitle: '大师级地城考验：有限血量 + 高密度精英魔物群，精准推演斩杀红龙！',
            monsters: { 1: 7, 2: 7, 3: 7, 4: 6, 5: 5, 6: 4 },
            items: { potion: 4, forge: 2, shield: 2, chest: 4, scroll: 2 },
            rocks: [[2, 2], [2, 6], [4, 1], [4, 7], [6, 2], [6, 6], [1, 4], [7, 4]], seed: 8089
        }
    ];

    function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function shuffle(arr, rng) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    }

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function xpNeededFor(atk) {
        return atk * 3;
    }

    function buildEndlessConfig(floorNum, carryScore, seedOverride) {
        const f = Math.max(1, Math.floor(Number(floorNum) || 1));
        const size = f <= 2 ? 7 : (f <= 5 ? 8 : 9);
        const bossLv = f === 1 ? 6 : 7;
        const mCounts = {
            1: 6 + Math.min(3, f),
            2: 5 + Math.min(3, f),
            3: 4 + Math.min(4, f),
            4: 3 + Math.min(4, f),
            5: 2 + Math.min(4, f),
            6: Math.min(5, 1 + Math.floor(f / 2))
        };
        const rockCoords = size === 7
            ? [[1, 1], [1, 5], [5, 1], [5, 5]]
            : size === 8
                ? [[2, 2], [2, 5], [5, 2], [5, 5]]
                : [[1, 4], [4, 1], [4, 7], [7, 4], [2, 2], [6, 6]];

        return {
            id: 100 + f,
            label: `深渊 ${f} 层`,
            name: f === 1 ? '无尽试炼起点' : `烈狱深渊 B${f}`,
            subtitle: '无尽挑战模式：不断斩杀魔物累积 MAX 最高分，每层讨伐首领即晋级下层！',
            rows: size,
            cols: size,
            hp: 7,
            scrolls: 2,
            bossLv,
            monsters: mCounts,
            items: { potion: 3, forge: 2, shield: 2, chest: 3, scroll: 1 },
            rocks: rockCoords,
            seed: Number.isFinite(seedOverride) ? seedOverride : (90001 + f * 7919),
            carryScore: carryScore || 0
        };
    }

    function createSession(options = {}) {
        const mode = options.mode === 'endless' ? 'endless' : 'stage';
        const stageIndex = clamp(Math.floor(Number(options.stageIndex) || 0), 0, STAGES.length - 1);
        const endlessFloor = Math.max(1, Math.floor(Number(options.endlessFloor) || 1));

        const cfg = mode === 'endless'
            ? buildEndlessConfig(endlessFloor, options.carryScore || 0, options.seed)
            : STAGES[stageIndex];

        const seed = Number.isFinite(options.seed) ? options.seed : cfg.seed;
        const rng = mulberry32(seed);
        const rows = cfg.rows;
        const cols = cfg.cols;

        // Safe opening pocket around (sr, sc) so Turn 1 always has logical deductions
        const sr = Math.floor(rows * 0.52);
        const sc = Math.floor(cols * 0.35);

        const rockSet = new Set(cfg.rocks.map(([r, c]) => `${r},${c}`));
        // Never put rocks directly on safe start 3x3
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                rockSet.delete(`${sr + dr},${sc + dc}`);
            }
        }

        const safeZone = new Set();
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const rr = sr + dr;
                const cc = sc + dc;
                if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
                    safeZone.add(`${rr},${cc}`);
                }
            }
        }

        const cells = Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => ({
                r, c,
                kind: rockSet.has(`${r},${c}`) ? 'rock' : 'empty',
                monsterLv: 0,
                boss: false,
                itemKind: null,
                revealed: rockSet.has(`${r},${c}`),
                slain: false,
                itemTaken: false,
                scanned: false,
                mark: null, // null | 'flag' | '?' | '1'..'7'
                threatSum: 0,
                threatCount: 0,
                confirmPending: false
            }))
        );

        const availableOuter = [];
        const availableInner = [];
        const farCandidates = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const key = `${r},${c}`;
                if (rockSet.has(key)) continue;
                const dist = Math.abs(r - sr) + Math.abs(c - sc);
                if (safeZone.has(key)) {
                    availableInner.push(cells[r][c]);
                } else {
                    availableOuter.push(cells[r][c]);
                    if (dist >= Math.max(3, Math.floor((rows + cols) * 0.35))) {
                        farCandidates.push(cells[r][c]);
                    }
                }
            }
        }

        shuffle(availableInner, rng);
        shuffle(availableOuter, rng);
        shuffle(farCandidates, rng);

        // 1. Place Boss away from start pocket
        const bossCell = farCandidates[0] || availableOuter[0];
        bossCell.kind = 'monster';
        bossCell.monsterLv = cfg.bossLv;
        bossCell.boss = true;

        // Place remaining monsters in availableOuter
        const outerCursor = { idx: 0 };
        const placedSet = new Set([bossCell]);
        function nextOuterCell() {
            while (outerCursor.idx < availableOuter.length) {
                const candidate = availableOuter[outerCursor.idx++];
                if (!placedSet.has(candidate)) {
                    placedSet.add(candidate);
                    return candidate;
                }
            }
            return null;
        }

        // Put two friendly Lv.1 Slimes right near the start edge to seed early XP & clean clue deduction
        const nearRing = availableOuter.filter((cell) => Math.abs(cell.r - sr) <= 2 && Math.abs(cell.c - sc) <= 2 && !placedSet.has(cell));
        shuffle(nearRing, rng);

        const monsterEntries = [];
        Object.keys(cfg.monsters).sort((a, b) => Number(a) - Number(b)).forEach((lvKey) => {
            const lv = Number(lvKey);
            const cnt = cfg.monsters[lvKey] || 0;
            for (let i = 0; i < cnt; i++) monsterEntries.push(lv);
        });

        let slimesToPlaceNear = Math.min(2, nearRing.length, monsterEntries.filter((lv) => lv === 1).length);
        for (let i = 0; i < monsterEntries.length; i++) {
            const lv = monsterEntries[i];
            let target = null;
            if (lv === 1 && slimesToPlaceNear > 0) {
                target = nearRing.shift();
                if (target) {
                    placedSet.add(target);
                    slimesToPlaceNear--;
                }
            }
            if (!target) target = nextOuterCell();
            if (!target) break;
            target.kind = 'monster';
            target.monsterLv = lv;
        }

        // 2. Place helpful tactical items (mostly outer, plus 1 chest/potion occasionally reachable quickly)
        const itemEntries = [];
        Object.entries(cfg.items || {}).forEach(([kind, cnt]) => {
            for (let i = 0; i < cnt; i++) itemEntries.push(kind);
        });
        shuffle(itemEntries, rng);

        for (const kind of itemEntries) {
            const cell = nextOuterCell();
            if (!cell) break;
            cell.kind = 'item';
            cell.itemKind = kind;
        }

        const hero = {
            xpLevel: 1,
            bonusAtk: 0,
            atk: 1,
            hp: cfg.hp,
            maxHp: cfg.hp,
            shield: 0,
            xp: 0,
            xpNext: xpNeededFor(1),
            scrolls: cfg.scrolls,
            kills: 0,
            damageTaken: 0
        };

        const session = {
            mode,
            stageIndex,
            endlessFloor,
            cfg,
            seed,
            rows,
            cols,
            cells,
            hero,
            state: 'playing', // 'playing' | 'won' | 'lost'
            lossReason: '',
            score: cfg.carryScore || 0,
            turnCount: 0,
            bossCell,
            totalMonsters: 0,
            slainMonsters: 0
        };

        // Count monsters
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (cells[r][c].kind === 'monster') session.totalMonsters++;
            }
        }

        function getNeighbors(r, c) {
            const out = [];
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                        out.push(cells[nr][nc]);
                    }
                }
            }
            return out;
        }

        function recomputeClues() {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cell = cells[r][c];
                    let sum = 0;
                    let cnt = 0;
                    for (const nb of getNeighbors(r, c)) {
                        if (nb.kind === 'monster' && !nb.slain) {
                            sum += nb.monsterLv;
                            cnt += 1;
                        }
                    }
                    cell.threatSum = sum;
                    cell.threatCount = cnt;
                }
            }
        }

        function floodOpen(startR, startC, events) {
            const queue = [cells[startR][startC]];
            const visited = new Set([`${startR},${startC}`]);
            while (queue.length > 0) {
                const cur = queue.shift();
                if (!cur.revealed && cur.kind !== 'monster' && cur.kind !== 'rock') {
                    cur.revealed = true;
                    cur.mark = null;
                    events.push({ type: 'reveal', r: cur.r, c: cur.c, kind: cur.kind, itemKind: cur.itemKind });
                    if (cur.kind === 'empty') session.score += 15;
                }
                if (cur.kind === 'empty' && cur.threatCount === 0) {
                    for (const nb of getNeighbors(cur.r, cur.c)) {
                        const key = `${nb.r},${nb.c}`;
                        if (visited.has(key)) continue;
                        if (nb.kind === 'rock' || nb.kind === 'monster' || nb.mark === 'flag') continue;
                        visited.add(key);
                        queue.push(nb);
                    }
                }
            }
        }

        function grantXp(amount, events, srcCell) {
            hero.xp += amount;
            while (hero.xp >= hero.xpNext) {
                hero.xp -= hero.xpNext;
                hero.xpLevel += 1;
                hero.atk = hero.xpLevel + hero.bonusAtk;
                hero.maxHp += 1;
                hero.hp = Math.min(hero.maxHp, hero.hp + 2);
                hero.xpNext = xpNeededFor(hero.xpLevel);
                session.score += 250;
                events.push({ type: 'levelup', atk: hero.atk, hp: hero.hp, maxHp: hero.maxHp, r: srcCell.r, c: srcCell.c });
            }
        }

        function engageMonster(cell, events) {
            const lv = cell.monsterLv;
            const mDef = MONSTERS[lv] || MONSTERS[1];
            cell.revealed = true;
            cell.mark = null;
            cell.confirmPending = false;

            if (hero.atk < lv) {
                const rawDmg = (lv - hero.atk) * 2;
                let blocked = 0;
                let hpDmg = rawDmg;
                if (hero.shield > 0) {
                    blocked = Math.min(hero.shield, rawDmg);
                    hero.shield -= blocked;
                    hpDmg -= blocked;
                }
                hero.hp = Math.max(0, hero.hp - hpDmg);
                hero.damageTaken += hpDmg;
                events.push({ type: 'hurt', r: cell.r, c: cell.c, hpDmg, blocked, monsterLv: lv, monsterName: mDef.name });
                if (hero.hp <= 0) {
                    session.state = 'lost';
                    session.lossReason = `被 Lv.${lv} ${mDef.name} 反击阵亡！（当前战力仅 Lv.${hero.atk}）`;
                    events.push({ type: 'lose', reason: session.lossReason });
                    return;
                }
            }

            cell.slain = true;
            session.slainMonsters += 1;
            hero.kills += 1;
            session.score += mDef.score;
            recomputeClues();
            events.push({ type: 'slay', r: cell.r, c: cell.c, lv, boss: cell.boss, name: mDef.name, score: mDef.score });
            grantXp(lv, events, cell);

            if (cell.boss) {
                const hpBonus = hero.hp * 150 + hero.shield * 80;
                session.score += hpBonus;
                session.state = 'won';
                events.push({ type: 'win', hpBonus, score: session.score });
            }
        }

        function collectItem(cell, events) {
            if (cell.itemTaken) return;
            cell.itemTaken = true;
            const kind = cell.itemKind;
            if (kind === 'potion') {
                const heal = Math.min(hero.maxHp - hero.hp, 3);
                hero.hp += heal;
                session.score += heal > 0 ? 120 : 200;
                events.push({ type: 'item', kind, r: cell.r, c: cell.c, text: heal > 0 ? `+${heal} HP` : '满血奖励 +200' });
            } else if (kind === 'forge') {
                hero.bonusAtk += 1;
                hero.atk = hero.xpLevel + hero.bonusAtk;
                session.score += 300;
                events.push({ type: 'item', kind, r: cell.r, c: cell.c, text: `战力提升 Lv.${hero.atk}!` });
            } else if (kind === 'shield') {
                hero.shield += 3;
                session.score += 180;
                events.push({ type: 'item', kind, r: cell.r, c: cell.c, text: '+3 护盾' });
            } else if (kind === 'scroll') {
                hero.scrolls += 1;
                session.score += 180;
                events.push({ type: 'item', kind, r: cell.r, c: cell.c, text: '+1 鹰眼卷轴' });
            } else if (kind === 'chest') {
                session.score += 400;
                events.push({ type: 'item', kind, r: cell.r, c: cell.c, text: '+2 XP & 400分' });
                grantXp(2, events, cell);
            }
        }

        recomputeClues();
        // Open guaranteed safe starting pocket before Turn 1
        floodOpen(sr, sc, []);
        cells[sr][sc].revealed = true;

        session.getNeighbors = getNeighbors;

        session.revealCell = function (r, c, opts = {}) {
            if (session.state !== 'playing') return [];
            if (r < 0 || r >= rows || c < 0 || c >= cols) return [];
            const cell = cells[r][c];
            if (cell.kind === 'rock') return [];
            if (!cell.revealed && cell.mark === 'flag') {
                return [{ type: 'blockedFlag', r, c }];
            }

            const events = [];
            session.turnCount += 1;

            // Already revealed cell handling
            if (cell.revealed) {
                if (cell.kind === 'monster' && !cell.slain) {
                    // Revealed via Eagle Scroll: warn once before dangerous over-level strike unless force=true
                    if (hero.atk < cell.monsterLv && !cell.confirmPending && !opts.force) {
                        cell.confirmPending = true;
                        const predDmg = (cell.monsterLv - hero.atk) * 2;
                        events.push({ type: 'warn', r, c, dmg: predDmg, monsterLv: cell.monsterLv });
                        return events;
                    }
                    engageMonster(cell, events);
                    return events;
                }
                if (cell.kind === 'item' && !cell.itemTaken) {
                    collectItem(cell, events);
                    return events;
                }
                if (cell.kind === 'empty' && cell.threatCount === 0) {
                    // Chord-open any newly cleared unmarked safe neighbors!
                    for (const nb of getNeighbors(r, c)) {
                        if (!nb.revealed && nb.kind !== 'rock' && nb.mark !== 'flag') {
                            floodOpen(nb.r, nb.c, events);
                        }
                    }
                    return events;
                }
                if (cell.kind === 'empty' && cell.threatCount > 0) {
                    // Safe chord open when all remaining adjacent threats are accounted for
                    // either by a player flag/tag OR by Eagle-Scroll scanned living monsters.
                    const nbs = getNeighbors(r, c);
                    const accountedThreats = nbs.filter((n) =>
                        (!n.revealed && n.kind !== 'rock' && (n.mark === 'flag' || (n.mark && Number(n.mark) > 0))) ||
                        (n.revealed && n.kind === 'monster' && !n.slain)
                    );
                    const hiddenSafeCandidates = nbs.filter((n) => !n.revealed && n.kind !== 'rock' && !n.mark);
                    if (accountedThreats.length === cell.threatCount && hiddenSafeCandidates.length > 0) {
                        for (const nb of hiddenSafeCandidates) {
                            if (nb.kind === 'monster' && !nb.slain) {
                                engageMonster(nb, events);
                                if (session.state !== 'playing') break;
                            } else {
                                floodOpen(nb.r, nb.c, events);
                            }
                        }
                    }
                    return events;
                }
                return events;
            }

            // Unrevealed cell handling
            if (cell.kind === 'monster' && !cell.slain) {
                engageMonster(cell, events);
                return events;
            }

            if (cell.kind === 'item') {
                cell.revealed = true;
                cell.mark = null;
                events.push({ type: 'reveal', r, c, kind: 'item', itemKind: cell.itemKind });
                return events;
            }

            floodOpen(r, c, events);
            return events;
        };

        session.toggleMark = function (r, c, explicitMark) {
            if (session.state !== 'playing') return false;
            if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
            const cell = cells[r][c];
            if (cell.revealed || cell.kind === 'rock') return false;

            if (explicitMark !== undefined) {
                cell.mark = cell.mark === explicitMark ? null : explicitMark;
                return true;
            }
            // Cycle: null -> 'flag' -> '?' -> null
            if (!cell.mark) cell.mark = 'flag';
            else if (cell.mark === 'flag') cell.mark = '?';
            else cell.mark = null;
            return true;
        };

        session.useScroll = function (r, c) {
            if (session.state !== 'playing' || hero.scrolls <= 0) return [];
            if (r < 0 || r >= rows || c < 0 || c >= cols) return [];
            hero.scrolls -= 1;
            const events = [{ type: 'scrollCast', r, c }];

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const rr = r + dr;
                    const cc = c + dc;
                    if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
                    const cell = cells[rr][cc];
                    if (cell.kind === 'rock' || (cell.revealed && cell.kind !== 'monster')) continue;
                    if (cell.kind === 'monster' && !cell.slain) {
                        cell.revealed = true;
                        cell.scanned = true;
                        cell.mark = null;
                        events.push({ type: 'scoutMonster', r: rr, c: cc, lv: cell.monsterLv, boss: cell.boss });
                    } else if (cell.kind === 'item') {
                        cell.revealed = true;
                        cell.mark = null;
                        events.push({ type: 'reveal', r: rr, c: cc, kind: 'item', itemKind: cell.itemKind });
                    } else {
                        floodOpen(rr, cc, events);
                    }
                }
            }
            return events;
        };

        session.evaluateStars = function () {
            if (session.state !== 'won') return 0;
            const killRatio = session.totalMonsters > 0 ? session.slainMonsters / session.totalMonsters : 1;
            if (hero.damageTaken <= 2 || (hero.damageTaken <= 4 && killRatio >= 0.7)) return 3;
            if (hero.damageTaken <= 8 || killRatio >= 0.5) return 2;
            return 1;
        };

        return session;
    }

    function normalizeSave(raw) {
        const clean = {
            muted: !!(raw && raw.muted),
            unlockedStage: clamp(Math.floor(Number(raw && raw.unlockedStage) || 1), 1, STAGES.length),
            currentStageIndex: clamp(Math.floor(Number(raw && raw.currentStageIndex) || 0), 0, STAGES.length - 1),
            stageStars: {},
            endlessHighScore: Math.max(0, Math.floor(Number(raw && raw.endlessHighScore) || 0)),
            endlessMaxFloor: Math.max(1, Math.floor(Number(raw && raw.endlessMaxFloor) || 1)),
            dragonsSlain: Math.max(0, Math.floor(Number(raw && raw.dragonsSlain) || 0))
        };
        if (raw && raw.stageStars && typeof raw.stageStars === 'object') {
            for (const st of STAGES) {
                const s = Number(raw.stageStars[st.id]);
                if (s > 0) clean.stageStars[st.id] = clamp(Math.floor(s), 1, 3);
            }
        }
        return clean;
    }

    function totalStageStars(save) {
        if (!save || !save.stageStars) return 0;
        return Object.values(save.stageStars).reduce((s, v) => s + (Number(v) || 0), 0);
    }

    return {
        SAVE_KEY,
        MONSTERS,
        ITEMS,
        STAGES,
        createSession,
        normalizeSave,
        totalStageStars,
        xpNeededFor
    };
});
