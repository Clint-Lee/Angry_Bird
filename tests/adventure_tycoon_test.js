'use strict';

const assert = require('assert');
const Engine = require('../arcade/adventure-tycoon/engine.js');
const AudioCls = require('../arcade/adventure-tycoon/audio.js');

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

console.log('\n[1] Adventure Tycoon Economy, Expedition & Crafting');
test('Expedition gathers dungeon materials cleanly over time', () => {
    const sim = Engine.createSimulation();
    const herbBefore = sim.state.materials.herb;
    assert.strictEqual(sim.startExpedition('glade'), true);
    let looted = false;
    for (let i = 0; i < 40; i++) {
        const ev = sim.step(0.15);
        if (ev.some((e) => e.type === 'loot')) looted = true;
    }
    assert.ok(looted);
    assert.ok(sim.state.materials.herb >= herbBefore + 2);
});

test('Crafting & serving waiting customer earns gold, rep, and updates maxGoldHeld', () => {
    const sim = Engine.createSimulation({ gold: 60, stock: { potion: 2 } });
    assert.strictEqual(sim.startCraft('potion'), true);
    let crafted = false;
    for (let i = 0; i < 30; i++) {
        const ev = sim.step(0.15);
        if (ev.some((e) => e.type === 'crafted')) crafted = true;
    }
    assert.ok(crafted);
    assert.strictEqual(sim.state.stock.potion, 3);

    sim.sim.customers.push({
        id: 99, x: 450, y: 260, desiredId: 'potion', phase: 'waiting', patience: 15, maxPatience: 15
    });
    const ev = [];
    assert.strictEqual(sim.serveCustomer(99, ev), true);
    assert.strictEqual(sim.state.stock.potion, 2);
    assert.ok(sim.state.gold > 60);
    assert.strictEqual(sim.state.maxGoldHeld, sim.state.gold);
    assert.strictEqual(sim.state.reputation, 2);
});

console.log('\n[2] Upgrades, Zones, Prestige & Audio Limiter');
test('Upgrades, Zone unlocks, Prestige multiplier and Audio Limiter work cleanly', () => {
    const sim = Engine.createSimulation({ gold: 5000, totalGoldEarned: 5000 });
    assert.strictEqual(sim.unlockZone('mine'), true);
    assert.strictEqual(sim.buyUpgrade('priceBoost'), true);
    assert.ok(sim.getSellPrice('potion') > 28);
    assert.strictEqual(sim.prestigeRebirth(), true);
    assert.strictEqual(sim.state.prestigeCount, 1);
    assert.ok(sim.state.maxGoldHeld >= 5000);

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
    assert.ok(destConnected, 'AdventureTycoonAudio must route through DynamicsCompressorNode');
    delete global.window;
});

console.log('\n----------------------------------------');
console.log(`${passed} checks passed, ${failed} failures. ${failed === 0 ? 'ADVENTURE TYCOON TEST OK' : ''}`);
if (failed > 0) process.exit(1);
