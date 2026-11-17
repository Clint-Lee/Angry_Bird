'use strict';

const assert = require('assert');
const Engine = require('../arcade/sokoban/engine.js');
const AudioCls = require('../arcade/sokoban/audio.js');

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

// Fast Sokoban BFS solver with corner deadlock pruning to prove every map solvable
function solveSokoban(level, maxStates = 350000) {
    const { walls, goals, boxes, player } = Engine.parseLevel(level);
    const goalKeySet = new Set(goals);
    const deadlockSet = new Set();
    for (let y = 0; y < level.map.length; y++) {
        for (let x = 0; x < level.map[y].length; x++) {
            const k = `${x},${y}`;
            if (walls.has(k) || goalKeySet.has(k)) continue;
            const wU = walls.has(`${x},${y - 1}`);
            const wD = walls.has(`${x},${y + 1}`);
            const wL = walls.has(`${x - 1},${y}`);
            const wR = walls.has(`${x + 1},${y}`);
            if ((wU || wD) && (wL || wR)) deadlockSet.add(k);
        }
    }

    function stateKey(px, py, boxArr) {
        return `${px},${py}|${boxArr.slice().sort().join(';')}`;
    }

    const startBoxes = Array.from(boxes);
    const startKey = stateKey(player.x, player.y, startBoxes);
    const queue = [{ px: player.x, py: player.y, boxes: startBoxes, moves: 0 }];
    const visited = new Set([startKey]);
    let head = 0;

    while (head < queue.length && visited.size < maxStates) {
        const cur = queue[head++];
        const curSet = new Set(cur.boxes);
        if (cur.boxes.every((b) => goalKeySet.has(b))) {
            return cur.moves;
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cur.px + dx;
            const ny = cur.py + dy;
            const nk = `${nx},${ny}`;
            if (walls.has(nk)) continue;
            let nextBoxes = cur.boxes;
            if (curSet.has(nk)) {
                const bx = nx + dx;
                const by = ny + dy;
                const bk = `${bx},${by}`;
                if (walls.has(bk) || curSet.has(bk) || deadlockSet.has(bk)) continue;
                nextBoxes = cur.boxes.map((b) => (b === nk ? bk : b));
            }
            const sk = stateKey(nx, ny, nextBoxes);
            if (!visited.has(sk)) {
                visited.add(sk);
                queue.push({ px: nx, py: ny, boxes: nextBoxes, moves: cur.moves + 1 });
            }
        }
    }
    return -1;
}

console.log('\n[1] Classic Sokoban 15 Stages Solvability & Mechanics');
test('All 15 levels have equal boxes and goals, and every single level is mathematically solvable', () => {
    assert.strictEqual(Engine.LEVELS.length, 15);
    Engine.LEVELS.forEach((lvl) => {
        const parsed = Engine.parseLevel(lvl);
        assert.strictEqual(parsed.boxes.size, parsed.goals.size, `${lvl.name}: boxes != goals`);
        assert.ok(parsed.boxes.size >= 2, `${lvl.name}: expected >=2 boxes`);
        const minMoves = solveSokoban(lvl);
        assert.ok(minMoves > 0, `${lvl.name} (id ${lvl.id}) failed solver! minMoves=${minMoves}`);
        assert.ok(lvl.par >= minMoves, `${lvl.name} par (${lvl.par}) < optimal (${minMoves})`);
    });
});

test('Push mechanics, Undo stack, BFS click-to-walk, and Audio limiter work cleanly', () => {
    const g = Engine.createSession(0);
    assert.strictEqual(g.session.moves, 0);
    g.move(-1, 0);
    const res = g.move(0, -1); // push left crate up onto goal in level 1
    assert.strictEqual(res.moved, true);
    assert.strictEqual(res.pushed, true);
    assert.strictEqual(g.session.moves, 2);
    assert.strictEqual(g.session.pushes, 1);
    assert.strictEqual(g.undo(), true);
    assert.strictEqual(g.undo(), true);
    assert.strictEqual(g.session.moves, 0);
    assert.strictEqual(g.session.pushes, 0);

    const walk = g.findWalkPath(1, 1);
    assert.ok(Array.isArray(walk) && walk.length >= 2);

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
console.log(`${passed} checks passed, ${failed} failures. ${failed === 0 ? 'SOKOBAN TEST OK' : ''}`);
if (failed > 0) process.exit(1);
