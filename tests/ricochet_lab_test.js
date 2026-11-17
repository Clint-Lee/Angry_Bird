'use strict';

const assert = require('assert');
const Engine = require('../arcade/ricochet-lab/engine.js');
const Audio = require('../arcade/ricochet-lab/audio.js');

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
}

console.log('\n[1] Ricochet Lab Levels Integrity & Anti-Trivial Verification');
test('3 chapters and 12 handcrafted levels defined cleanly', () => {
    assert.strictEqual(Engine.CHAPTERS.length, 3);
    assert.strictEqual(Engine.LEVELS.length, 12);
    for (const ch of Engine.CHAPTERS) {
        assert.strictEqual(Engine.LEVELS.filter((l) => l.chapter === ch.id).length, 4);
    }
});

test('Blank/default unconfigured launch NEVER trivially wins any level', () => {
    for (let i = 0; i < Engine.LEVELS.length; i++) {
        const s = Engine.createSession(i);
        for (let shot = 0; shot < s.level.shots; shot++) {
            if (s.state !== 'planning') break;
            s.launch();
            for (let t = 0; t < 480 && s.state === 'flying'; t++) {
                s.step(1 / 60);
            }
        }
        assert.notStrictEqual(s.state, 'won', `Level ${s.level.label} trivially won without player setup!`);
    }
});

test('Every single level (1-1 through 3-4) wins deterministically with its authored solution', () => {
    for (let i = 0; i < Engine.LEVELS.length; i++) {
        const s = Engine.createSession(i);
        s.applySolution();
        const angles = s.level.solution.angles || [s.level.solution.angleDeg];

        for (let shot = 0; shot < s.level.shots; shot++) {
            if (s.state !== 'planning') break;
            const deg = angles[Math.min(shot, angles.length - 1)];
            s.setAimDeg(deg);
            s.launch();
            for (let t = 0; t < 480 && s.state === 'flying'; t++) {
                s.step(1 / 60);
            }
            if (s.state === 'won') break;
        }
        assert.strictEqual(
            s.state,
            'won',
            `Level ${s.level.label} (${s.level.name}) did not win! state=${s.state}, stars=${s.starsCollected}/${s.starsTotal}, reason=${s.lossReason}, lastBall=${JSON.stringify(s.ball)}`
        );
    }
});

console.log('\n[2] Gadget Placement, PredictArc, Reset & Audio Limiter');
test('Gadget inventory enforces count limits, rotation, removal and resetShotOnly', () => {
    const s = Engine.createSession(0); // 1 paddle
    const rem0 = s.getRemainingCounts();
    assert.strictEqual(rem0.paddle, 1);

    const p1 = s.placeOrRotateGadget('s1', 'paddle');
    assert.ok(p1 && p1.action === 'place');
    assert.strictEqual(s.getRemainingCounts().paddle, 0);

    // Cannot place a second paddle when budget is 0
    assert.strictEqual(s.placeOrRotateGadget('s2', 'paddle'), null);

    // Rotate occupied slot
    const rotBefore = s.placements.get('s1').rot;
    const p2 = s.placeOrRotateGadget('s1');
    assert.strictEqual(p2.action, 'rotate');
    assert.strictEqual(s.placements.get('s1').rot, (rotBefore + 1) & 3);

    // Remove restores budget
    assert.strictEqual(s.removeGadget('s1'), true);
    assert.strictEqual(s.getRemainingCounts().paddle, 1);
});

test('predictArc returns clean preview points matching initial motion', () => {
    const s = Engine.createSession(0);
    s.applySolution();
    const pts = s.predictArc(2);
    assert.ok(pts.length >= 6);
    assert.strictEqual(pts[0].x, s.level.launcher.x);
});

test('normalizeSave clamps bounds and RicochetLabAudio connects limiter', () => {
    const clean = Engine.normalizeSave({ unlockedLevel: 99, levelStars: { 1: 5 } });
    assert.strictEqual(clean.unlockedLevel, 12);
    assert.strictEqual(clean.levelStars[1], 3);

    const calls = [];
    global.window = {
        AudioContext: class {
            constructor() {
                this.currentTime = 0;
                this.state = 'running';
                this.destination = { kind: 'dest' };
            }
            createGain() {
                return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} }, connect(d) { calls.push(['gain', d.kind]); } };
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
    const audio = new Audio();
    audio.playStar(2);
    assert.ok(calls.some((c) => c[0] === 'gain' && c[1] === 'limiter'));
    assert.ok(calls.some((c) => c[0] === 'limiter' && c[1] === 'dest'));
    delete global.window;
});

console.log(`\n----------------------------------------\n${passed} checks passed, 0 failures. RICOCHET LAB TEST OK\n`);
