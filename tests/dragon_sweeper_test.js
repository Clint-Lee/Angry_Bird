'use strict';

const assert = require('assert');
const Engine = require('../arcade/dragon-sweeper/engine.js');
const AudioCls = require('../arcade/dragon-sweeper/audio.js');

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

console.log('\n[1] Dungeon Stages, Safe Start & Clue Math');
test('8 handcrafted stages and 7 monster tiers defined cleanly', () => {
    assert.strictEqual(Engine.STAGES.length, 8);
    assert.strictEqual(Object.keys(Engine.MONSTERS).length, 7);
    Engine.STAGES.forEach((st, idx) => {
        const s = Engine.createSession({ mode: 'stage', stageIndex: idx });
        assert.ok(s.bossCell && s.bossCell.boss && s.bossCell.monsterLv === st.bossLv, `${st.label} missing Boss`);
        // At least 4 tiles must already be safely opened on start so Turn 1 never guesses
        let openCount = 0;
        for (let r = 0; r < s.rows; r++) {
            for (let c = 0; c < s.cols; c++) {
                const cell = s.cells[r][c];
                if (cell.revealed && cell.kind !== 'rock') openCount++;
                // Verify threatSum & threatCount exactness on every cell
                let expSum = 0, expCnt = 0;
                for (const nb of s.getNeighbors(r, c)) {
                    if (nb.kind === 'monster' && !nb.slain) {
                        expSum += nb.monsterLv;
                        expCnt++;
                    }
                }
                assert.strictEqual(cell.threatSum, expSum, `${st.label} (${r},${c}) sum mismatch`);
                assert.strictEqual(cell.threatCount, expCnt, `${st.label} (${r},${c}) cnt mismatch`);
            }
        }
        assert.ok(openCount >= 4, `${st.label} openCount=${openCount} too small`);
    });
});

console.log('\n[2] Anti-Random-Click Punishment & RPG Progression');
test('Attacking over-leveled boss blindly at ATK Lv.1 kills or severely wounds Hero', () => {
    const s = Engine.createSession({ mode: 'stage', stageIndex: 2 }); // 1-3 Boss Lv.7
    assert.strictEqual(s.hero.atk, 1);
    const ev = s.revealCell(s.bossCell.r, s.bossCell.c);
    assert.ok(ev.some((e) => e.type === 'hurt'), 'Missing over-level hurt event');
    assert.strictEqual(s.state, 'lost', 'Lv.1 hero hitting Lv.7 Dragon (12 dmg vs 7 HP) must lose');
});

test('Sequentially slaying Lv.1->boss monsters upgrades ATK and defeats Boss across all 8 stages', () => {
    Engine.STAGES.forEach((st, idx) => {
        const s = Engine.createSession({ mode: 'stage', stageIndex: idx });
        for (let r = 0; r < s.rows; r++) {
            for (let c = 0; c < s.cols; c++) {
                const cell = s.cells[r][c];
                if (cell.kind === 'item' && (cell.itemKind === 'forge' || cell.itemKind === 'shield' || cell.itemKind === 'chest')) {
                    s.revealCell(r, c);
                    s.revealCell(r, c);
                }
            }
        }
        for (let tier = 1; tier < st.bossLv; tier++) {
            for (let r = 0; r < s.rows; r++) {
                for (let c = 0; c < s.cols; c++) {
                    const cell = s.cells[r][c];
                    if (cell.kind === 'monster' && !cell.slain && !cell.boss && cell.monsterLv <= s.hero.atk) {
                        s.revealCell(r, c);
                    }
                }
            }
        }
        assert.ok(s.hero.atk >= st.bossLv, `${st.label} hero ATK=${s.hero.atk} should reach >= Boss Lv.${st.bossLv}`);
        const winEv = s.revealCell(s.bossCell.r, s.bossCell.c);
        assert.strictEqual(s.state, 'won', `${st.label} failed to win`);
        assert.ok(winEv.some((e) => e.type === 'win'));
        if (idx === 0) assert.strictEqual(s.evaluateStars(), 3, 'Unscathed 1-1 boss kill must yield 3 stars');
    });
});

console.log('\n[3] Flags, Eagle Scroll Safety, Endless Abyss & Audio Limiter');
test('Flag mark blocks accidental clicks; Eagle Scroll reveals monsters without damage', () => {
    const s = Engine.createSession({ mode: 'stage', stageIndex: 3 });
    const br = s.bossCell.r, bc = s.bossCell.c;
    assert.strictEqual(s.toggleMark(br, bc, 'flag'), true);
    const blocked = s.revealCell(br, bc);
    assert.strictEqual(blocked[0].type, 'blockedFlag');
    assert.strictEqual(s.hero.hp, s.hero.maxHp, 'Flagged tile must protect Hero');

    const scEv = s.useScroll(br, bc);
    assert.ok(scEv.some((e) => e.type === 'scrollCast'));
    assert.strictEqual(s.bossCell.revealed, true);
    assert.strictEqual(s.bossCell.slain, false);
    assert.strictEqual(s.hero.hp, s.hero.maxHp, 'Scroll must never hurt Hero');

    // First click on scroll-revealed strong boss triggers warn prompt without instant suicide
    const warnEv = s.revealCell(br, bc);
    assert.strictEqual(warnEv[0].type, 'warn');
    assert.strictEqual(s.state, 'playing');
});

test('Endless mode & normalizeSave preserve MAX high score and Audio connects limiter', () => {
    const endless = Engine.createSession({ mode: 'endless', endlessFloor: 3, carryScore: 4200 });
    assert.strictEqual(endless.mode, 'endless');
    assert.strictEqual(endless.score >= 4200, true);

    const save = Engine.normalizeSave({ endlessHighScore: 9950, dragonsSlain: 4, unlockedStage: 99 });
    assert.strictEqual(save.endlessHighScore, 9950);
    assert.strictEqual(save.dragonsSlain, 4);
    assert.strictEqual(save.unlockedStage, Engine.STAGES.length);

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
    assert.ok(destConnected, 'DragonSweeperAudio must route through DynamicsCompressorNode');
    delete global.window;
});

console.log('\n----------------------------------------');
console.log(`${passed} checks passed, ${failed} failures. ${failed === 0 ? 'DRAGON SWEEPER TEST OK' : ''}`);
if (failed > 0) process.exit(1);
