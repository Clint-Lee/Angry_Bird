'use strict';
const assert = require('node:assert/strict');
const E = require('../arcade/lumina-grid/engine');
const { LuminaAudio } = require('../arcade/lumina-grid/audio');

let checks = 0;
function check(cond, msg) {
    checks++;
    assert.ok(cond, msg);
    console.log('  PASS ', msg);
}

console.log('\n[1] Lumina Grid levels & geometry integrity');
check(E.CHAPTERS.length === 4, '4 chapters defined');
check(E.LEVELS.length === 24, '24 levels defined across 4 chapters');

const byWorld = {};
E.LEVELS.forEach((lv, idx) => {
    byWorld[lv.world] = (byWorld[lv.world] || 0) + 1;
    assert.equal(lv.id, idx + 1, `Level ${lv.id} id matches index`);
    assert.equal(lv.layout.length, 8, `${lv.name} layout has 8 rows`);
    assert.ok(lv.layout.every(r => r.length === 8 && /^[.#*12g]+$/.test(r)), `${lv.name} rows valid`);
    assert.ok(lv.starThresholds[0] === lv.goalScore && lv.starThresholds[0] < lv.starThresholds[1] && lv.starThresholds[1] < lv.starThresholds[2], `${lv.name} strict ascending stars`);

    const board = E.createLevelBoard(idx);
    const initialClears = E.findCompletedLines(board);
    assert.equal(initialClears.rows.length + initialClears.cols.length, 0, `${lv.name} has no pre-completed line on start`);

    // Every target or frost cell must belong to a row OR col that has empty space at start (reachable to complete!)
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = board[r][c];
            if (cell && (cell.kind === 'target' || cell.kind === 'frost')) {
                const rowHasEmpty = board[r].some(x => x === null);
                const colHasEmpty = board.some(row => row[c] === null);
                assert.ok(rowHasEmpty || colHasEmpty, `${lv.name} cell (${r},${c}) must lie on a completable row or col`);
            }
        }
    }
});
check(Object.keys(byWorld).length === 4 && Object.values(byWorld).every(v => v === 6), 'Each of 4 chapters contains exactly 6 levels');

console.log('\n[2] Placement, cross-clear & frost/target physics');
const board = E.createEmptyBoard();
for (let c = 0; c < 7; c++) board[2][c] = { kind: 'gem', color: 0 };
for (let r = 0; r < 7; r++) {
    if (r === 2) continue;
    board[r][7] = r === 0 ? { kind: 'target', color: 1 } : { kind: 'gem', color: 2 };
}
// Double-layer frost sits right at the intersection (2, 7) -> wait place frost at (2,7) makes it non-null so test adjacent:
// Instead leave (2,7) empty, put frost hp=2 at (2,5) and wall at (2,0), target at (0,7)! Wait: cross intersection damage test:
const crossBoard = E.createEmptyBoard();
for (let c = 0; c < 7; c++) crossBoard[3][c] = c === 3 ? { kind: 'wall' } : (c === 5 ? { kind: 'target', color: 2 } : { kind: 'gem', color: 1 });
for (let r = 0; r < 8; r++) {
    if (r !== 3 && r !== 7) crossBoard[r][6] = { kind: 'gem', color: 4 };
}
crossBoard[3][6] = null; // Leave intersection (3,6) open? No, place frost(hp=2) on row 3 OR place intersection with 2-cell piece!
const cross2 = E.createEmptyBoard();
for (let c = 0; c < 8; c++) {
    if (c === 6 || c === 7) continue;
    cross2[4][c] = c === 1 ? { kind: 'frost', hp: 1, color: 2 } : (c === 2 ? { kind: 'target', color: 0 } : { kind: 'gem', color: 1 });
}
for (let r = 0; r < 8; r++) {
    if (r === 4) continue;
    cross2[r][7] = r === 1 ? { kind: 'frost', hp: 2, color: 5 } : { kind: 'gem', color: 3 };
}
// Drop horizontal 2x1 bar at (4, 6) -> fills Row 4 AND Col 7 simultaneously!
const bar2 = E.SHAPES.find(s => s.id === 'dom_h');
const preview = E.previewPlacementClears(cross2, bar2, 4, 6);
check(preview.valid === true && preview.rows.includes(4) && preview.cols.includes(7), 'previewPlacementClears anticipates cross row+col clear without mutation');
check(cross2[4][6] === null && cross2[4][7] === null, 'previewPlacementClears does not mutate board');

const res = E.applyPlacement(cross2, { shape: bar2, color: 0 }, 4, 6, 1);
check(res.ok === true, 'applyPlacement succeeds at valid intersection');
check(res.isCrossClear === true && res.clearedLines === 2, 'Cross clear resolves both Row 4 and Col 7 atomically');
check(res.board[4][1] === null && res.meltedFrost === 1, 'hp=1 frost shatters cleanly');
check(res.board[4][2] === null && res.clearedTargets === 1, 'Star core target clears cleanly');
check(res.board[1][7] && res.board[1][7].kind === 'frost' && res.board[1][7].hp === 1, 'hp=2 frost cracks to hp=1 on single hit');
check(res.combo === 2 && res.scoreGain > 500, 'Combo increments and cross-clear bonus applies');

// Wall invariance check
const wallBoard = E.createLevelBoard(2); // 1-3 has corners '#'
for (let c = 1; c < 7; c++) wallBoard[0][c] = { kind: 'gem', color: 0 };
const dot = E.SHAPES.find(s => s.id === 'dot');
// Row 0 has # . . . . . . # -> wait c=1..6 filled, placing dot isn't needed because c=1..6 already filled; clear (0,6) first
wallBoard[0][6] = null;
const wRes = E.applyPlacement(wallBoard, { shape: dot, color: 1 }, 0, 6, 0);
check(wRes.ok && wRes.clearedRows.includes(0), 'Row with obsidian walls clears when all open cells fill');
check(wRes.board[0][0].kind === 'wall' && wRes.board[0][7].kind === 'wall', 'Obsidian wall bedrock survives line clear');
check(wRes.board[0][6] === null && wRes.board[0][1] === null, 'Placed gems along walled row clear cleanly');

console.log('\n[3] Tray dealing & deadlock detection');
for (let trial = 0; trial < 20; trial++) {
    const tray = E.dealTray(wallBoard);
    assert.equal(tray.length, 3);
    assert.ok(E.hasAnyValidMove(wallBoard, tray), 'dealt tray always contains at least 1 legal move when board has room');
}
check(true, 'dealTray guarantees >= 1 playable move across 20 random trials');

const fullBoard = E.createEmptyBoard();
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) fullBoard[r][c] = { kind: 'wall' };
check(!E.hasAnyValidMove(fullBoard, [{ shape: dot, color: 0, used: false }]), 'hasAnyValidMove returns false when board has zero empty cells');

console.log('\n[4] Audio limiter & sound synthesis');
function makeMockParam() { return { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }; }
const connects = [];
const mockAudioCtx = {
    currentTime: 0,
    state: 'running',
    destination: { __dest: true },
    createGain: () => ({ gain: makeMockParam(), connect(d) { connects.push(d); return d; } }),
    createDynamicsCompressor: () => ({ threshold: makeMockParam(), knee: makeMockParam(), ratio: makeMockParam(), attack: makeMockParam(), release: makeMockParam(), connect(d) { connects.push(d); return d; } }),
    createOscillator: () => ({ type: 'sine', frequency: makeMockParam(), connect() {}, start() {}, stop() {} }),
};
global.AudioContext = function () { return mockAudioCtx; };
const aud = new LuminaAudio();
aud.init();
aud.playPick();
aud.playPlace();
aud.playClear(2, 3, true);
aud.playFrostBreak(true);
aud.playWin();
aud.playGameOver();
check(connects.some(c => c && c.__dest), 'LuminaAudio routes master compressor to destination');

console.log(`\n----------------------------------------\n${checks} checks passed, 0 failures. LUMINA GRID TEST OK`);
