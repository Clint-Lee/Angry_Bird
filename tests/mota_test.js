'use strict';

const assert = require('assert');
const Engine = require('../arcade/mota/engine.js');
const AudioCls = require('../arcade/mota/audio.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  PASS  ' + name);
    } catch (err) {
        failed++;
        console.error('  FAIL  ' + name + ' -> ' + err.message);
    }
}

console.log('\n[1] Magic Tower 21 Floors Structural Integrity & Math');
test('All 21 floors exist, are 11x11, and include required stairs', () => {
    assert.strictEqual(Engine.FLOOR_TEMPLATES.length, Engine.TOTAL_FLOORS);
    Engine.FLOOR_TEMPLATES.forEach((tpl, idx) => {
        const expectedFloor = idx + 1;
        assert.strictEqual(tpl.floor, expectedFloor);
        assert.strictEqual(tpl.map.length, Engine.GRID);
        tpl.map.forEach((row) => assert.strictEqual(row.length, Engine.GRID, `Floor ${expectedFloor} row length mismatch`));

        const flat = tpl.map.join('');
        if (expectedFloor < Engine.TOTAL_FLOORS) {
            assert.ok(flat.includes('U'), `Floor ${expectedFloor} missing stairs_up (U)`);
        }
        if (expectedFloor > 1) {
            assert.ok(flat.includes('S'), `Floor ${expectedFloor} missing stairs_down (S)`);
        }
    });
    assert.ok(Engine.FLOOR_TEMPLATES[20].map.join('').includes('M'), 'Floor 21 must have Final Boss (M)');
});

test('Battle math, attack breakpoint threshold, and undo stack work accurately', () => {
    const g = Engine.createSession();
    const resZero = Engine.calculateBattle({ hp: 1000, atk: 12, def: 10 }, { hp: 140, atk: 44, def: 13 });
    assert.strictEqual(resZero.canWin, false);
    assert.strictEqual(resZero.atkNeeded, 2);

    const r = g.step(-1, 0); // move from (5,9) to (4,9)
    assert.ok(r.ok);
    assert.strictEqual(g.state.player.x, 4);
    assert.strictEqual(g.undo(), true);
    assert.strictEqual(g.state.player.x, 5);
});

console.log('\n[2] Full Tower 1F -> 21F Simulated Playthrough (Softlock & Balance Proof)');
test('Simulated tactical hero navigates all 21 floors, shops wisely, and defeats Final Boss', () => {
    const g = Engine.createSession();

    // Multi-floor BFS / greedy tactical agent: collects safe free items, keys, unlocks doors,
    // fights lowest-damage affordable monsters, upgrades at Gold Altar / EXP Sage / Flyer, and climbs stairs.
    function reachableOnFloor(floorObj, startX, startY) {
        const q = [{ x: startX, y: startY, path: [] }];
        const vis = new Set([`${startX},${startY}`]);
        const hits = [];
        let h = 0;
        while (h < q.length) {
            const cur = q[h++];
            for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                const nx = cur.x + dx;
                const ny = cur.y + dy;
                const nk = `${nx},${ny}`;
                if (nx < 0 || nx >= Engine.GRID || ny < 0 || ny >= Engine.GRID || vis.has(nk)) continue;
                if (floorObj.grid[ny][nx] === 1) continue;
                vis.add(nk);
                const ent = floorObj.entities.get(nk);
                const nextPath = cur.path.concat([[dx, dy]]);
                if (ent) {
                    hits.push({ key: nk, x: nx, y: ny, ent, path: nextPath });
                    // Blocking entities & stairs don't pass through accidentally
                    if (ent.type === 'door' || ent.type === 'enemy' || ent.type === 'npc' || ent.type === 'stairs_up' || ent.type === 'stairs_down') continue;
                }
                q.push({ x: nx, y: ny, path: nextPath });
            }
        }
        return hits;
    }

    function walkAndTrigger(path) {
        let lastRes = null;
        for (const [dx, dy] of path) {
            lastRes = g.step(dx, dy);
        }
        return lastRes;
    }

    // Check accessible NPCs/shops on current floor or unlock flyer & travel
    let iterations = 0;
    const interactedNpcs = new Set();

    while (!g.state.player.won && iterations < 1200) {
        iterations++;
        const f = g.currentFloorData();
        const hits = reachableOnFloor(f, g.state.player.x, g.state.player.y);

        // 1. Free items & keys immediately
        const freeLoot = hits.find(h => h.ent.type === 'item' || h.ent.type === 'key');
        if (freeLoot) {
            walkAndTrigger(freeLoot.path);
            continue;
        }

        // 2. Talk to Flyer NPC once
        const flyerHit = hits.find(h => h.ent.type === 'npc' && h.ent.sub === 'flyer');
        if (flyerHit) {
            g.unlockFlyer(flyerHit.key);
            continue;
        }

        // 3. Use reachable Gold Altar / EXP Sage when affordable
        const altarHit = hits.find(h => h.ent.type === 'npc' && h.ent.sub === 'altar_gold');
        if (altarHit && g.state.player.gold >= g.goldAltarCost()) {
            // Buy balanced ATK/DEF/HP
            if (g.state.player.hp < 500) g.buyGoldAltar('hp');
            else if (g.state.player.atk <= g.state.player.def + 6) g.buyGoldAltar('atk');
            else g.buyGoldAltar('def');
            continue;
        }
        const sageHit = hits.find(h => h.ent.type === 'npc' && h.ent.sub === 'altar_exp');
        if (sageHit && g.state.player.exp >= 30) {
            if (g.state.player.exp >= 80 && g.state.player.hp < 900) g.buyExpSage('level');
            else if (g.state.player.atk <= g.state.player.def + 4) g.buyExpSage('atk');
            else g.buyExpSage('def');
            continue;
        }

        // 4. Fight zero-cost or very low-damage enemies (<= 15% current HP, saving HP before Bosses)
        const winnableEnemies = hits
            .filter(h => h.ent.type === 'enemy')
            .map(h => ({ h, calc: Engine.calculateBattle(g.state.player, h.ent) }))
            .filter(x => x.calc.canWin && (x.calc.damage === 0 || x.calc.damage < g.state.player.hp * 0.45))
            .sort((a, b) => a.calc.damage - b.calc.damage);

        if (winnableEnemies.length && (winnableEnemies[0].calc.damage <= 25 || !hits.some(h => h.ent.type === 'door' && (g.state.player.keys[h.ent.keyType] || 0) > 0))) {
            walkAndTrigger(winnableEnemies[0].h.path);
            continue;
        }

        // 5. Open reachable door if we have the key (prefer yellow -> blue -> red)
        const openableDoors = hits
            .filter(h => h.ent.type === 'door' && (g.state.player.keys[h.ent.keyType] || 0) > 0)
            .sort((a, b) => {
                const rank = { yellow: 1, blue: 2, red: 3 };
                return rank[a.ent.keyType] - rank[b.ent.keyType];
            });
        if (openableDoors.length) {
            walkAndTrigger(openableDoors[0].path);
            continue;
        }

        // 6. Fight any remaining winnable enemy (including Boss!)
        if (winnableEnemies.length) {
            walkAndTrigger(winnableEnemies[0].h.path);
            continue;
        }
        const anyWinnable = hits
            .filter(h => h.ent.type === 'enemy')
            .map(h => ({ h, calc: Engine.calculateBattle(g.state.player, h.ent) }))
            .filter(x => x.calc.canWin)
            .sort((a, b) => a.calc.damage - b.calc.damage);
        if (anyWinnable.length) {
            walkAndTrigger(anyWinnable[0].h.path);
            continue;
        }

        // 7. Climb stairs up if available and higher floor unvisited or needed
        const up = hits.find(h => h.ent.type === 'stairs_up');
        if (up) {
            walkAndTrigger(up.path);
            continue;
        }

        // 8. If stuck on current floor (e.g., locked red door or tough boss), scan previous visited floors for leftover items/altars/keys/monsters!
        let didActionOnLower = false;
        const origFloor = g.currentFloorData().floor;
        for (let fn = 1; fn <= Math.max(...g.state.player.visitedFloors); fn++) {
            const fo = g.state.floors[fn];
            if (!fo) continue;
            // Temporarily warp if flyer owned
            if (g.state.player.hasFlyer && fn !== origFloor) {
                g.teleport(fn, fn === 1 ? 'stairs_up' : 'stairs_down');
            }
            const lh = reachableOnFloor(g.currentFloorData(), g.state.player.x, g.state.player.y);
            const loot = lh.find(h => h.ent.type === 'item' || h.ent.type === 'key');
            if (loot) { walkAndTrigger(loot.path); didActionOnLower = true; break; }
            const shopG = lh.find(h => h.ent.type === 'npc' && h.ent.sub === 'altar_gold');
            if (shopG && g.state.player.gold >= g.goldAltarCost()) {
                g.buyGoldAltar(g.state.player.atk <= g.state.player.def + 6 ? 'atk' : 'def');
                didActionOnLower = true; break;
            }
            const shopK = lh.find(h => h.ent.type === 'npc' && h.ent.sub === 'key_shop');
            if (shopK && g.state.player.gold >= 35 && interactedNpcs.size < 200) {
                interactedNpcs.add(iterations);
                if (g.state.player.keys.red === 0 && g.state.player.gold >= 220) g.buyKey('red');
                else if (g.state.player.keys.blue === 0 && g.state.player.gold >= 95) g.buyKey('blue');
                else g.buyKey('yellow');
                didActionOnLower = true; break;
            }
            const shopE = lh.find(h => h.ent.type === 'npc' && h.ent.sub === 'altar_exp');
            if (shopE && g.state.player.exp >= 30) {
                g.buyExpSage('atk'); didActionOnLower = true; break;
            }
            const lowEnemy = lh
                .filter(h => h.ent.type === 'enemy')
                .map(h => ({ h, calc: Engine.calculateBattle(g.state.player, h.ent) }))
                .filter(x => x.calc.canWin && x.calc.damage <= g.state.player.hp * 0.4)
                .sort((a, b) => a.calc.damage - b.calc.damage)[0];
            if (lowEnemy) { walkAndTrigger(lowEnemy.h.path); didActionOnLower = true; break; }
            const lowDoor = lh.find(h => h.ent.type === 'door' && (g.state.player.keys[h.ent.keyType] || 0) > 0);
            if (lowDoor) { walkAndTrigger(lowDoor.path); didActionOnLower = true; break; }
        }
        if (didActionOnLower) continue;

        break;
    }

    console.log(`    [Sim] Floor=${g.state.currentFloor}/21, Won=${g.state.player.won}, HP=${g.state.player.hp}, ATK=${g.state.player.atk}, DEF=${g.state.player.def}, Gold=${g.state.player.gold}, Keys=${JSON.stringify(g.state.player.keys)}, Kills=${g.state.player.kills}`);
    assert.strictEqual(g.state.player.won, true, `Bot stopped at Floor ${g.state.currentFloor} with HP=${g.state.player.hp} ATK=${g.state.player.atk} DEF=${g.state.player.def}`);
});

test('Audio compressor limiter connects safely to destination', () => {
    let destConnected = false;
    const mockGain = { gain: { value: 0, setTargetAtTime() {} }, connect(n) { return n; } };
    const mockComp = {
        threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 },
        attack: { value: 0 }, release: { value: 0 },
        connect(d) { if (d && d.__dest) destConnected = true; return d; }
    };
    global.window = {
        AudioContext: class {
            constructor() { this.destination = { __dest: true }; this.currentTime = 0; this.state = 'running'; }
            createGain() { return mockGain; }
            createDynamicsCompressor() { return mockComp; }
        }
    };
    const audio = new AudioCls();
    audio.init();
    assert.ok(destConnected);
    delete global.window;
});

console.log('\n----------------------------------------');
console.log(`${passed} checks passed, ${failed} failures. ${failed === 0 ? 'MOTA TEST OK' : ''}`);
if (failed > 0) process.exit(1);
