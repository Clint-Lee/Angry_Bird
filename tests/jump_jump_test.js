'use strict';

const assert = require('assert');
const Engine = require('../arcade/jump-jump/engine.js');
const AudioCls = require('../arcade/jump-jump/audio.js');

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

function chargeAndJump(g, holdTime) {
    assert.strictEqual(g.beginCharge(), true);
    let rem = holdTime;
    while (rem > 0) {
        const dt = Math.min(0.02, rem);
        g.step(dt);
        rem -= dt;
    }
    g.releaseJump();
}

console.log('\n[1] Jump Jump Physics, Bullseye Combos & Bonus Cubes');
test('Exact hold duration lands dead-center on next platform for +2 bullseye score', () => {
    const g = Engine.createSession({ seed: 1234 });
    const target = g.session.platforms[1];
    const dist = Math.hypot(target.x - g.session.player.x, target.z - g.session.player.z);
    const holdTime = (dist - Engine.CONFIG.baseDist) / Engine.CONFIG.chargeRate;

    chargeAndJump(g, holdTime);

    let landedEv = null;
    for (let i = 0; i < 40; i++) {
        const ev = g.step(0.02);
        const found = ev.find((e) => e.type === 'land');
        if (found) landedEv = found;
        if (g.session.state === 'idle') break;
    }
    assert.ok(landedEv, 'Should land on platform 1');
    assert.strictEqual(landedEv.bullseye, true, 'Exact hold should score bullseye');
    assert.strictEqual(g.session.score, 2);
    assert.strictEqual(g.session.bullseyeStreak, 1);
    assert.strictEqual(g.session.platforms.length, 3, 'Should spawn next procedural platform');
});

test('Consecutive bullseyes compound score (+2, +4) & overshooting triggers fall/lost', () => {
    const g = Engine.createSession({ seed: 5678 });
    for (let jump = 0; jump < 2; jump++) {
        const curIdx = g.session.currentIndex;
        const nextP = g.session.platforms[curIdx + 1];
        const dist = Math.hypot(nextP.x - g.session.player.x, nextP.z - g.session.player.z);
        const holdTime = (dist - Engine.CONFIG.baseDist) / Engine.CONFIG.chargeRate;
        chargeAndJump(g, holdTime);
        for (let i = 0; i < 40; i++) {
            g.step(0.02);
            if (g.session.state === 'idle') break;
        }
    }
    assert.strictEqual(g.session.score, 6, 'Two bullseyes should score 2 + 4 = 6');
    assert.strictEqual(g.session.maxBullseyeStreak, 2);

    // Overcharge jump -> miss & lose
    chargeAndJump(g, Engine.CONFIG.maxChargeSec);
    for (let i = 0; i < 120; i++) {
        g.step(0.02);
        if (g.session.state === 'lost') break;
    }
    assert.strictEqual(g.session.state, 'lost');
});

test('Special platform stay bonus triggers after 1.15s wait & Audio routes via limiter', () => {
    const g = Engine.createSession({ seed: 999 });
    // Force platform 1 to be special vinyl box
    g.session.platforms[1].special = Engine.SPECIAL_TYPES[0];
    const target = g.session.platforms[1];
    const dist = Math.hypot(target.x, target.z);
    chargeAndJump(g, (dist - Engine.CONFIG.baseDist) / Engine.CONFIG.chargeRate);
    for (let i = 0; i < 40; i++) {
        g.step(0.02);
        if (g.session.state === 'idle') break;
    }
    let bonusEv = null;
    for (let i = 0; i < 80; i++) {
        const ev = g.step(0.02);
        const f = ev.find((e) => e.type === 'bonus');
        if (f) bonusEv = f;
    }
    assert.ok(bonusEv, 'Staying on special block should award bonus points');
    assert.ok(g.session.score >= 17);

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
    assert.ok(destConnected, 'JumpJumpAudio must route through DynamicsCompressorNode');
    delete global.window;
});

console.log('\n----------------------------------------');
console.log(`${passed} checks passed, ${failed} failures. ${failed === 0 ? 'JUMP JUMP TEST OK' : ''}`);
if (failed > 0) process.exit(1);
