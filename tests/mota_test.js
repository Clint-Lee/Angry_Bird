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

console.log('\n[1] Magic Tower 30 Floors (15x15) Structural Integrity & Math');
test('All 30 floors exist, are 15x15, 100% connected, and place Bosses every 10th floor', () => {
    assert.strictEqual(Engine.GRID, 15);
    assert.strictEqual(Engine.TOTAL_FLOORS, 30);
    assert.strictEqual(Engine.FLOOR_TEMPLATES.length, 30);

    const g = Engine.createSession();
    Engine.FLOOR_TEMPLATES.forEach((tpl, idx) => {
        const fNum = idx + 1;
        assert.strictEqual(tpl.floor, fNum);
        assert.strictEqual(tpl.map.length, 15);
        tpl.map.forEach((row, r) => assert.strictEqual(row.length, 15, `Floor ${fNum} row ${r} len ${row.length}`));

        const flat = tpl.map.join('');
        if (fNum < 30) assert.ok(flat.includes('U'), `Floor ${fNum} missing stairs_up`);
        if (fNum > 1) assert.ok(flat.includes('S'), `Floor ${fNum} missing stairs_down`);

        // Boss check every 10 floors
        if (fNum === 10) assert.ok(flat.includes('Z'), 'Floor 10 must contain Boss Z');
        if (fNum === 20) assert.ok(flat.includes('Q'), 'Floor 20 must contain Boss Q');
        if (fNum === 30) assert.ok(flat.includes('M'), 'Floor 30 must contain Final Boss M');

        // Verify 100% tile connectivity
        const fObj = g.state.floors[fNum];
        const sp = fObj.startPos;
        const q = [sp], vis = new Set([`${sp.x},${sp.y}`]);
        while (q.length) {
            const c = q.shift();
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const nx = c.x + dx, ny = c.y + dy, nk = `${nx},${ny}`;
                if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15 || vis.has(nk) || fObj.grid[ny][nx] === 1) continue;
                vis.add(nk); q.push({ x: nx, y: ny });
            }
        }
        for (let y = 0; y < 15; y++) {
            for (let x = 0; x < 15; x++) {
                if (fObj.grid[y][x] === 0) assert.ok(vis.has(`${x},${y}`), `Floor ${fNum} cell (${x},${y}) disconnected!`);
            }
        }
    });
});

test('Unbeatable monster blocks movement with clear reason, while winnable builds battle timeline', () => {
    const g = Engine.createSession();
    const resNoBreak = Engine.calculateBattle({ hp: 1000, atk: 12, def: 10 }, { hp: 155, atk: 46, def: 15 });
    assert.strictEqual(resNoBreak.canWin, false);
    assert.strictEqual(resNoBreak.reason, 'no_break');
    assert.strictEqual(resNoBreak.atkNeeded, 4);

    const resLowHp = Engine.calculateBattle({ hp: 50, atk: 20, def: 10 }, { hp: 200, atk: 35, def: 5 });
    assert.strictEqual(resLowHp.canWin, false);
    assert.strictEqual(resLowHp.reason, 'low_hp');

    const timeline = Engine.buildBattleTimeline({ hp: 500, atk: 20, def: 10 }, { hp: 45, atk: 16, def: 2 });
    assert.ok(timeline.length >= 3);
    assert.strictEqual(timeline[0].actor, 'hero');
    assert.strictEqual(timeline[timeline.length - 1].enemyHp, 0);

    // Move & undo check (Floor 1 starts at 7,13 -> move left to 6,13)
    const r = g.step(-1, 0);
    assert.ok(r.ok);
    assert.strictEqual(g.state.player.x, 6);
    assert.strictEqual(g.undo(), true);
    assert.strictEqual(g.state.player.x, 7);
});

console.log('\n[2] Full Tower 1F -> 30F Simulated Playthrough (Softlock & Balance Proof)');
test('Simulated hero navigates all 30 floors (15x15), beats 10F/20F/30F Bosses cleanly', () => {
    const g = Engine.createSession();

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

    let iterations = 0;
    let keyBuys = 0;

    while (!g.state.player.won && iterations < 2200) {
        iterations++;
        const f = g.currentFloorData();
        const hits = reachableOnFloor(f, g.state.player.x, g.state.player.y);

        const freeLoot = hits.find(h => h.ent.type === 'item' || h.ent.type === 'key');
        if (freeLoot) { walkAndTrigger(freeLoot.path); continue; }

        const flyerHit = hits.find(h => h.ent.type === 'npc' && h.ent.sub === 'flyer');
        if (flyerHit) { g.unlockFlyer(flyerHit.key); continue; }

        const altarHit = hits.find(h => h.ent.type === 'npc' && h.ent.sub === 'altar_gold');
        if (altarHit && g.state.player.gold >= g.goldAltarCost()) {
            if (g.state.player.hp < 700) g.buyGoldAltar('hp');
            else if (g.state.player.atk <= g.state.player.def + 8) g.buyGoldAltar('atk');
            else g.buyGoldAltar('def');
            continue;
        }
        const sageHit = hits.find(h => h.ent.type === 'npc' && h.ent.sub === 'altar_exp');
        if (sageHit && g.state.player.exp >= 30) {
            if (g.state.player.exp >= 80 && g.state.player.hp < 1200) g.buyExpSage('level');
            else if (g.state.player.atk <= g.state.player.def + 4) g.buyExpSage('atk');
            else g.buyExpSage('def');
            continue;
        }

        const winnableEnemies = hits
            .filter(h => h.ent.type === 'enemy')
            .map(h => ({ h, calc: Engine.calculateBattle(g.state.player, h.ent) }))
            .filter(x => x.calc.canWin && (x.calc.damage === 0 || x.calc.damage < g.state.player.hp * 0.45))
            .sort((a, b) => a.calc.damage - b.calc.damage);

        if (winnableEnemies.length && (winnableEnemies[0].calc.damage <= 40 || !hits.some(h => h.ent.type === 'door' && (g.state.player.keys[h.ent.keyType] || 0) > 0))) {
            walkAndTrigger(winnableEnemies[0].h.path);
            continue;
        }

        const openableDoors = hits
            .filter(h => h.ent.type === 'door' && (g.state.player.keys[h.ent.keyType] || 0) > 0)
            .sort((a, b) => ({ yellow: 1, blue: 2, red: 3 }[a.ent.keyType]) - ({ yellow: 1, blue: 2, red: 3 }[b.ent.keyType]));
        if (openableDoors.length) { walkAndTrigger(openableDoors[0].path); continue; }

        if (winnableEnemies.length) { walkAndTrigger(winnableEnemies[0].h.path); continue; }

        const anyWinnable = hits
            .filter(h => h.ent.type === 'enemy')
            .map(h => ({ h, calc: Engine.calculateBattle(g.state.player, h.ent) }))
            .filter(x => x.calc.canWin)
            .sort((a, b) => a.calc.damage - b.calc.damage);
        if (anyWinnable.length) { walkAndTrigger(anyWinnable[0].h.path); continue; }

        const up = hits.find(h => h.ent.type === 'stairs_up');
        if (up) { walkAndTrigger(up.path); continue; }

        let didLower = false;
        const maxV = Math.max(...g.state.player.visitedFloors);
        for (let fn = 1; fn <= maxV; fn++) {
            if (g.state.player.hasFlyer && g.currentFloorData().floor !== fn) {
                g.teleport(fn, fn === 1 ? 'stairs_up' : 'stairs_down');
            }
            const lh = reachableOnFloor(g.currentFloorData(), g.state.player.x, g.state.player.y);
            const loot = lh.find(h => h.ent.type === 'item' || h.ent.type === 'key');
            if (loot) { walkAndTrigger(loot.path); didLower = true; break; }
            const sg = lh.find(h => h.ent.type === 'npc' && h.ent.sub === 'altar_gold');
            if (sg && g.state.player.gold >= g.goldAltarCost()) {
                g.buyGoldAltar(g.state.player.atk <= g.state.player.def + 6 ? 'atk' : 'def');
                didLower = true; break;
            }
            const sk = lh.find(h => h.ent.type === 'npc' && h.ent.sub === 'key_shop');
            if (sk && g.state.player.gold >= 35 && keyBuys < 40) {
                keyBuys++;
                if (g.state.player.keys.blue === 0 && g.state.player.gold >= 95) g.buyKey('blue');
                else g.buyKey('yellow');
                didLower = true; break;
            }
            const se = lh.find(h => h.ent.type === 'npc' && h.ent.sub === 'altar_exp');
            if (se && g.state.player.exp >= 30) { g.buyExpSage('atk'); didLower = true; break; }
            const lowEn = lh
                .filter(h => h.ent.type === 'enemy')
                .map(h => ({ h, calc: Engine.calculateBattle(g.state.player, h.ent) }))
                .filter(x => x.calc.canWin && x.calc.damage <= g.state.player.hp * 0.45)
                .sort((a, b) => a.calc.damage - b.calc.damage)[0];
            if (lowEn) { walkAndTrigger(lowEn.h.path); didLower = true; break; }
            const lowDr = lh.find(h => h.ent.type === 'door' && (g.state.player.keys[h.ent.keyType] || 0) > 0);
            if (lowDr) { walkAndTrigger(lowDr.path); didLower = true; break; }
        }
        if (didLower) continue;
        break;
    }

    console.log(`    [Sim] Floor=${g.state.currentFloor}/30, Won=${g.state.player.won}, HP=${g.state.player.hp}, ATK=${g.state.player.atk}, DEF=${g.state.player.def}, Gold=${g.state.player.gold}, Keys=${JSON.stringify(g.state.player.keys)}, Kills=${g.state.player.kills}`);
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
