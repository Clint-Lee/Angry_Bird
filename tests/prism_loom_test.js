'use strict';

const assert = require('assert');
const Engine = require('../arcade/prism-loom/engine.js');
const PrismAudio = require('../arcade/prism-loom/audio.js');

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
}

console.log('\n[1] Campaign Levels Solvability & Geometry Verification');
test('3 chapters and 15 levels defined cleanly with valid coordinates', () => {
    assert.strictEqual(Engine.CHAPTERS.length, 3);
    assert.strictEqual(Engine.LEVELS.length, 15);
    for (const lvl of Engine.LEVELS) {
        const seen = new Set();
        for (const t of lvl.tiles) {
            assert.ok(t.r >= 0 && t.r < lvl.rows && t.c >= 0 && t.c < lvl.cols, `Out of bounds in ${lvl.label}`);
            const key = `${t.r},${t.c}`;
            assert.ok(!seen.has(key), `Duplicate tile at ${key} in ${lvl.label}`);
            seen.add(key);
        }
    }
});

test('Every single campaign level (1-1 through 3-5) starts unsolved and solves cleanly via solution', () => {
    for (let i = 0; i < Engine.LEVELS.length; i++) {
        const lvl = Engine.LEVELS[i];
        const s = Engine.createSession({ mode: 'campaign', levelIndex: i });
        assert.strictEqual(s.won, false, `Level ${lvl.label} should not start already won`);

        let hintSteps = 0;
        while (!s.won && hintSteps < 20) {
            const h = s.getHint();
            assert.ok(h, `Level ${lvl.label} missing hint before win (lit ${s.trace.targetsLit}/${s.trace.targetsTotal})`);
            s.rotateTile(h.r, h.c);
            hintSteps++;
        }
        assert.strictEqual(s.won, true, `Level ${lvl.label} (${lvl.name}) did not solve cleanly! Lit ${s.trace.targetsLit}/${s.trace.targetsTotal}`);
        assert.ok(s.moves <= lvl.parMoves, `Level ${lvl.label} took ${s.moves} > par ${lvl.parMoves}`);
    }
});

console.log('\n[2] Ray Tracer Physics, Color Mixing, Splitters, Portals & Cycle Safety');
test('Closed 4-mirror loop never hangs and emits bounded trace segments', () => {
    const grid = Engine.createGrid(5, 5);
    grid[2][0] = { r: 2, c: 0, type: 'emitter', dir: 1, color: 1, rot: 0, pair: 0, locked: false, sol: null };
    grid[2][2] = { r: 2, c: 2, type: 'splitter', rot: 0, sol: 0, color: 0, dir: 0, pair: 0, locked: false }; // E -> N + E
    grid[0][2] = { r: 0, c: 2, type: 'mirror', rot: 1, sol: 1, color: 0, dir: 0, pair: 0, locked: false }; // N -> W
    grid[0][4] = { r: 0, c: 4, type: 'mirror', rot: 1, sol: 1, color: 0, dir: 0, pair: 0, locked: false };
    // Create pure 4-mirror box (1,1) / , (1,3) \ , (3,3) / , (3,1) \ fed by splitter
    grid[1][1] = { r: 1, c: 1, type: 'mirror', rot: 0, sol: 0, color: 0, dir: 0, pair: 0, locked: false };
    grid[1][3] = { r: 1, c: 3, type: 'mirror', rot: 1, sol: 1, color: 0, dir: 0, pair: 0, locked: false };
    grid[3][3] = { r: 3, c: 3, type: 'mirror', rot: 0, sol: 0, color: 0, dir: 0, pair: 0, locked: false };
    grid[3][1] = { r: 3, c: 1, type: 'mirror', rot: 1, sol: 1, color: 0, dir: 0, pair: 0, locked: false };
    grid[1][0] = { r: 1, c: 0, type: 'emitter', dir: 1, color: 4, rot: 0, pair: 0, locked: false, sol: null };
    const res = Engine.traceRays(grid, 5, 5);
    assert.ok(res.segments.length > 0 && res.segments.length < 100);
});

test('RGB color addition distinguishes mismatched partial colors from exact matches', () => {
    const s = Engine.createSession({ mode: 'campaign', levelIndex: 10 }); // 3-1 Gold target
    assert.strictEqual(s.won, false);
    // Rotate only red mirror -> Gold target receives Red only (mismatch)
    s.rotateTile(2, 3);
    assert.strictEqual(s.trace.targetsMismatched, 1);
    assert.strictEqual(s.won, false);
    // Rotate green mirror -> Gold target receives Red|Green (3) -> wins!
    s.rotateTile(3, 1);
    assert.strictEqual(s.trace.targetsMismatched, 0);
    assert.strictEqual(s.won, true);
});

test('Undo and Reset restore exact prior tile state and move count', () => {
    const s = Engine.createSession({ mode: 'campaign', levelIndex: 1 });
    const startRot = s.grid[2][1].rot;
    s.rotateTile(2, 1);
    assert.strictEqual(s.moves, 1);
    assert.strictEqual(s.grid[2][1].rot, startRot ^ 1);
    s.undo();
    assert.strictEqual(s.moves, 0);
    assert.strictEqual(s.grid[2][1].rot, startRot);
    s.rotateTile(2, 1);
    s.rotateTile(2, 4);
    assert.strictEqual(s.moves, 2);
    s.reset();
    assert.strictEqual(s.moves, 0);
    assert.strictEqual(s.won, false);
});

console.log('\n[3] Procedural Endless Puzzle Generator Verification');
test('30 seeded procedural puzzles all start unsolved and solve to 100% win via getHint()', () => {
    for (let seed = 101; seed <= 130; seed++) {
        const diff = ((seed - 101) % 6) + 1;
        const s = Engine.createSession({ mode: 'endless', difficulty: diff, seed });
        assert.strictEqual(s.won, false, `Seed ${seed} started solved!`);
        let steps = 0;
        while (!s.won && steps < 25) {
            const h = s.getHint();
            if (!h) break;
            s.rotateTile(h.r, h.c);
            steps++;
        }
        assert.strictEqual(s.won, true, `Seed ${seed} failed to solve via hints`);
    }
});

console.log('\n[4] Save Normalization & Audio Limiter');
test('normalizeSave clamps bounds and PrismLoomAudio uses DynamicsCompressorNode', () => {
    const clean = Engine.normalizeSave({ unlockedLevel: 99, levelStars: { 1: 5, 2: 2 }, endlessSolved: -3 });
    assert.strictEqual(clean.unlockedLevel, 15);
    assert.strictEqual(clean.levelStars[1], 3);
    assert.strictEqual(clean.endlessSolved, 0);

    const calls = [];
    global.window = {
        AudioContext: class {
            constructor() {
                this.currentTime = 0;
                this.state = 'running';
                this.destination = { kind: 'dest' };
            }
            createGain() {
                const node = { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} }, connect(d) { calls.push(['gain', d.kind]); } };
                return node;
            }
            createDynamicsCompressor() {
                return { kind: 'limiter', threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, connect(d) { calls.push(['limiter', d.kind]); } };
            }
            createOscillator() {
                return { type: 'sine', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
            }
            resume() { return Promise.resolve(); }
        }
    };
    const audio = new PrismAudio();
    audio.playCrystalChime(2);
    assert.ok(calls.some((c) => c[0] === 'gain' && c[1] === 'limiter'));
    assert.ok(calls.some((c) => c[0] === 'limiter' && c[1] === 'dest'));
    delete global.window;
});

console.log(`\n----------------------------------------\n${passed} checks passed, 0 failures. PRISM LOOM TEST OK\n`);
