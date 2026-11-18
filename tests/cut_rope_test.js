'use strict';

const assert = require('assert');
const Engine = require('../arcade/cut-rope/engine.js');
const AudioCls = require('../arcade/cut-rope/audio.js');

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

console.log('\n[1] Candy Rope Lab Stages & Scripted Solutions');
test('6 chapters and 36 handcrafted levels defined cleanly', () => {
    assert.strictEqual(Engine.CHAPTERS.length, 6);
    assert.strictEqual(Engine.LEVELS.length, 36);
});

test('All 36 levels win with 3/3 stars via scripted slice/bubble/cushion actions', () => {
    Engine.LEVELS.forEach((lvl, idx) => {
        const s = Engine.createSession(idx);
        const done = new Set();
        for (let f = 0; f < 420; f++) {
            lvl.script.forEach((act, ai) => {
                if (!done.has(ai) && s.time >= act.t) {
                    done.add(ai);
                    if (act.act === 'cut') s.cutById(act.id);
                    else if (act.act === 'pop') s.popBubble(act.id);
                    else if (act.act === 'blow') s.blowCushion(act.id);
                }
            });
            s.step(1 / 60);
            if (s.state !== 'playing') break;
        }
        assert.strictEqual(s.state, 'won', `${lvl.label} state=${s.state} reason=${s.lossReason}`);
        assert.strictEqual(s.starsCollected, 3, `${lvl.label} stars=${s.starsCollected}/3`);
    });
});

test('Pointer line slicing detects rope intersections accurately & Audio routes via limiter', () => {
    const s = Engine.createSession(0);
    const ev = s.sliceLine(100, 120, 360, 120);
    assert.ok(ev.some((e) => e.type === 'cut' && e.id === 'r1'));
    assert.strictEqual(s.ropes[0].cut, true);

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
    assert.ok(destConnected, 'CandyRopeAudio must route through DynamicsCompressorNode');
    delete global.window;
});

console.log('\n----------------------------------------');
console.log(`${passed} checks passed, ${failed} failures. ${failed === 0 ? 'CUT ROPE TEST OK' : ''}`);
if (failed > 0) process.exit(1);

