'use strict';

const assert = require('assert');
const Engine = require('../arcade/fruit-merge/engine.js');
const FruitMergeAudio = require('../arcade/fruit-merge/audio.js');

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
}

console.log('\n[1] Tiers, Chapters & 12 Levels Integrity');
test('11 tiers defined with strictly ascending radii and scores', () => {
    assert.strictEqual(Engine.TIERS.length, 11);
    for (let i = 1; i < Engine.TIERS.length; i++) {
        assert.ok(Engine.TIERS[i].r > Engine.TIERS[i - 1].r);
        assert.ok(Engine.TIERS[i].score > Engine.TIERS[i - 1].score);
    }
});

test('3 chapters & 12 handcrafted levels defined cleanly', () => {
    assert.strictEqual(Engine.CHAPTERS.length, 3);
    assert.strictEqual(Engine.LEVELS.length, 12);
    for (const ch of Engine.CHAPTERS) {
        assert.strictEqual(Engine.LEVELS.filter((l) => l.chapter === ch.id).length, 4);
    }
});

test('All level presets & pegs lie cleanly inside jar boundaries', () => {
    for (const lvl of Engine.LEVELS) {
        for (const p of (lvl.pegs || [])) {
            assert.ok(p.x - p.r >= Engine.ARENA.wallL && p.x + p.r <= Engine.ARENA.wallR);
            assert.ok(p.y > Engine.ARENA.dangerY && p.y + p.r < Engine.ARENA.floorY);
        }
        for (const item of (lvl.preset || [])) {
            const def = Engine.TIERS[item.tier];
            assert.ok(item.x - def.r >= Engine.ARENA.wallL && item.x + def.r <= Engine.ARENA.wallR);
        }
    }
});

console.log('\n[2] 2D Sub-Stepped Physics, Drop Prediction & Chain Merging');
test('predictDropY computes contact height without mutating world', () => {
    const w = Engine.createWorld({ mode: 'endless', rng: () => 0.1 });
    const predBefore = w.predictDropY(210, 0);
    assert.strictEqual(w.bodies.length, 0);
    assert.strictEqual(predBefore.y, Engine.ARENA.floorY - Engine.TIERS[0].r);
});

test('Dropping two matching fruits triggers exact merge and combo', () => {
    const w = Engine.createWorld({ mode: 'endless', rng: () => 0.0 });
    w.currentTier = 2;
    w.nextTier = 2;
    w.drop(210);
    for (let i = 0; i < 60; i++) w.step(1 / 60);
    w.currentTier = 2;
    w.drop(212);
    let mergedEvents = [];
    for (let i = 0; i < 60; i++) {
        mergedEvents = mergedEvents.concat(w.step(1 / 60).filter((e) => e.type === 'merge'));
    }
    assert.strictEqual(mergedEvents.length, 1);
    assert.strictEqual(mergedEvents[0].tier, 3);
    assert.strictEqual(w.bodies.length, 1);
    assert.strictEqual(w.bodies[0].tier, 3);
    assert.ok(w.score >= Engine.TIERS[3].score);
});

test('Two Giant Watermelons (tier 10) trigger Grand Slam celebration', () => {
    const w = Engine.createWorld({ mode: 'endless', rng: () => 0.1 });
    w.bodies.push(
        { id: 901, tier: 10, r: 104, x: 140, y: 495, vx: 20, vy: 0, angle: 0, angVel: 0, age: 2, frozen: false, squash: 0, happyTimer: 0, blinkPhase: 0, bornStep: 0 },
        { id: 902, tier: 10, r: 104, x: 320, y: 495, vx: -15, vy: 0, angle: 0, angVel: 0, age: 2, frozen: false, squash: 0, happyTimer: 0, blinkPhase: 0, bornStep: 0 }
    );
    const ev = w.step(1 / 60);
    const slam = ev.find((e) => e.type === 'grandSlam');
    assert.ok(slam, 'Expected grandSlam event');
    assert.strictEqual(w.bodies.length, 0);
    assert.strictEqual(w.grandSlams, 1);
    assert.ok(w.score >= 300);
});

test('Adjacent merge thaws frozen puzzle fruit', () => {
    const w = Engine.createWorld({ mode: 'campaign', levelIndex: 4, rng: () => 0.5 }); // 2-1 破冰救樱 (frozen at x=120, r=35)
    assert.strictEqual(w.bodies.filter((b) => b.frozen).length, 2);
    // Drop two fruits beside the left frozen orange on the flat floor (x=172, x=175)
    w.currentTier = 0;
    w.nextTier = 0;
    w.drop(172);
    for (let i = 0; i < 65; i++) w.step(1 / 60);
    w.currentTier = 0;
    w.drop(175);
    let thaws = [];
    for (let i = 0; i < 70; i++) {
        thaws = thaws.concat(w.step(1 / 60).filter((e) => e.type === 'thaw'));
    }
    assert.ok(thaws.length >= 1, 'Expected nearby frozen orange to thaw');
});

console.log('\n[3] Tools, Overflow Protection & Campaign Win Evaluation');
test('Wand upgrades unlocked fruit cleanly & spoon removes obstacle', () => {
    const w = Engine.createWorld({ mode: 'campaign', levelIndex: 0, rng: () => 0.0 });
    const firstId = w.bodies[0].id;
    const oldTier = w.bodies[0].tier;
    const res = w.useWand(firstId);
    assert.ok(res && res.upgraded.tier === oldTier + 1);
    assert.strictEqual(w.tools.wand, 0);
    const scooped = w.useSpoon(w.bodies[w.bodies.length - 1].id);
    assert.ok(scooped);
    assert.strictEqual(w.tools.spoon, 0);
});

test('Newly dropped fruit above danger line never causes premature loss; prolonged overflow triggers lost', () => {
    const w = Engine.createWorld({ mode: 'endless', rng: () => 0.0 });
    w.drop(210);
    for (let i = 0; i < 10; i++) w.step(1 / 60);
    assert.strictEqual(w.status, 'playing');

    // Place settled body above dangerY
    w.bodies.push({
        id: 999, tier: 4, r: 42, x: 210, y: 120, vx: 0, vy: 0,
        angle: 0, angVel: 0, age: 3.0, frozen: true, squash: 0, happyTimer: 0, blinkPhase: 0, bornStep: 0
    });
    for (let i = 0; i < 190; i++) w.step(1 / 60);
    assert.strictEqual(w.status, 'lost');
});

test('Fruit landing off-center rolls onto floor and continues rolling smoothly without gluing', () => {
    const w = Engine.createWorld({ mode: 'endless', rng: () => 0.5 });
    const baseDef = Engine.TIERS[4]; // r=42 at center floor
    w.bodies.push({
        id: 701, tier: 4, r: baseDef.r, x: 210, y: Engine.ARENA.floorY - baseDef.r,
        vx: 0, vy: 0, angle: 0, angVel: 0, age: 2.0, frozen: false, squash: 0, happyTimer: 0, blinkPhase: 0, bornStep: 0
    });
    w.currentTier = 1; // Strawberry r=22 dropped slightly right of center shoulder
    w.drop(236);
    for (let i = 0; i < 65; i++) w.step(1 / 60);
    const small = w.bodies.find((b) => b.tier === 1);
    assert.ok(small, 'Dropped strawberry should remain distinct from base apple');
    assert.ok(small.x > 250, `Expected fruit to roll rightward down shoulder onto floor, got x=${small.x.toFixed(1)}`);
    assert.ok(Math.abs(small.angVel) > 0.2 || Math.abs(small.angle) > 0.4, 'Expected rolling rotation on descent');
});

test('Heavy collision transfers realistic action-reaction velocity and angular spin', () => {
    const w = Engine.createWorld({ mode: 'endless', rng: () => 0.5 });
    const smallR = Engine.TIERS[1].r;
    const bigR = Engine.TIERS[6].r;
    w.bodies.push(
        { id: 801, tier: 1, r: smallR, x: 180, y: Engine.ARENA.floorY - smallR, vx: 0, vy: 0, angle: 0, angVel: 0, age: 1, frozen: false, squash: 0, happyTimer: 0, blinkPhase: 0, bornStep: 0 },
        { id: 802, tier: 6, r: bigR, x: 268, y: Engine.ARENA.floorY - bigR - 18, vx: -180, vy: 0, angle: 0, angVel: 0, age: 1, frozen: false, squash: 0, happyTimer: 0, blinkPhase: 0, bornStep: 0 }
    );
    for (let i = 0; i < 12; i++) w.step(1 / 60);
    const small = w.bodies.find((b) => b.id === 801);
    assert.ok(small.vx < -60, `Expected strong leftward reaction velocity on lighter fruit, got vx=${small.vx.toFixed(1)}`);
    assert.ok(Math.abs(small.angVel) > 0.5, `Expected angular spin after off-axis collision, got angVel=${small.angVel.toFixed(2)}`);
});

test('Merging two fruits generates outward shockwave push on neighboring fruit', () => {
    const w = Engine.createWorld({ mode: 'endless', rng: () => 0.5 });
    const r2 = Engine.TIERS[2].r;
    const r0 = Engine.TIERS[0].r;
    w.bodies.push(
        { id: 811, tier: 2, r: r2, x: 195, y: Engine.ARENA.floorY - r2, vx: 20, vy: 0, angle: 0, angVel: 0, age: 1, frozen: false, squash: 0, happyTimer: 0, blinkPhase: 0, bornStep: 0 },
        { id: 812, tier: 2, r: r2, x: 225, y: Engine.ARENA.floorY - r2, vx: -20, vy: 0, angle: 0, angVel: 0, age: 1, frozen: false, squash: 0, happyTimer: 0, blinkPhase: 0, bornStep: 0 },
        { id: 813, tier: 0, r: r0, x: 292, y: Engine.ARENA.floorY - r0, vx: 0, vy: 0, angle: 0, angVel: 0, age: 1, frozen: false, squash: 0, happyTimer: 0, blinkPhase: 0, bornStep: 0 }
    );
    w.step(1 / 60);
    const neighbor = w.bodies.find((b) => b.id === 813);
    assert.ok(neighbor.vx > 20, `Expected outward rightward shockwave impulse on neighbor, got vx=${neighbor.vx.toFixed(1)}`);
});

console.log('\n[4] Audio Compressor Limiter');
test('FruitMergeAudio connects master -> DynamicsCompressorNode -> destination', () => {
    const calls = [];
    global.window = {
        AudioContext: class {
            constructor() {
                this.currentTime = 0;
                this.state = 'running';
                this.destination = { kind: 'dest' };
            }
            createGain() {
                const node = {
                    gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} },
                    connect(dst) { calls.push([node.kind || 'gain', dst.kind]); }
                };
                return node;
            }
            createDynamicsCompressor() {
                const node = {
                    kind: 'limiter',
                    threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 },
                    connect(dst) { calls.push(['limiter', dst.kind]); }
                };
                return node;
            }
            createOscillator() {
                return {
                    type: 'sine',
                    frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
                    connect() {}, start() {}, stop() {}
                };
            }
            resume() { return Promise.resolve(); }
        }
    };
    const audio = new FruitMergeAudio();
    audio.playMerge(3, 2);
    assert.ok(calls.some((c) => c[0] === 'gain' && c[1] === 'limiter'));
    assert.ok(calls.some((c) => c[0] === 'limiter' && c[1] === 'dest'));
    delete global.window;
});

console.log(`\n----------------------------------------\n${passed} checks passed, 0 failures. FRUIT MERGE TEST OK\n`);
