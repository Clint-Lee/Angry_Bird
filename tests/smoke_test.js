// Static smoke test for Angry Birds Remastered.
// Zero third-party dependencies — uses Node's built-in `vm`-free Function wrapper
// plus lightweight mocks of the browser globals the game scripts touch.
//
// Verifies three things the brief asked for without a heavy framework:
//   1. Asset registration (SpriteRenderer registers the expected textures / bg images;
//      snow & volcano are intentionally image-less and handled procedurally).
//   2. Level structure (window.GAME_LEVELS = 75 levels across 5 worlds of 15 each).
//   3. Audio protection (master bus runs through a DynamicsCompressor limiter; the
//      35ms collision throttle exists and scopes only impact sounds; critical sounds
//      like explosion/launch/UI bypass the throttle).
//
// Run:  node tests/smoke_test.js

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;
let checks = 0;

// Controllable clock for the collision throttle (performance.now).
let nowMs = 1000;
const sandboxPerf = { now: () => nowMs };

function ok(cond, msg) {
    checks++;
    if (cond) {
        console.log('  PASS  ' + msg);
    } else {
        failures++;
        console.log('  FAIL  ' + msg);
    }
}

// ---------------------------------------------------------------------------
// Browser-global mocks
// ---------------------------------------------------------------------------
function makeParam(v) {
    return {
        value: v,
        setValueAtTime(x) { this.value = x; return this; },
        linearRampToValueAtTime() { return this; },
        exponentialRampToValueAtTime() { return this; },
    };
}

function makeMockAudioNode(kind) {
    const node = {
        __kind: kind || 'node',
        gain: makeParam(1),
        frequency: makeParam(440),
        Q: makeParam(1),
        threshold: makeParam(-24),
        knee: makeParam(30),
        ratio: makeParam(12),
        attack: makeParam(0.003),
        release: makeParam(0.25),
        type: 'sine',
        buffer: null,
        _connectedTo: [],
        connect(dest) { node._connectedTo.push(dest); return dest; },
        disconnect() {},
        start() {},
        stop() {},
    };
    return node;
}

let createdNodeCount = 0;
function counting(kind) {
    return function () {
        createdNodeCount++;
        return makeMockAudioNode(kind);
    };
}

class MockAudioContext {
    constructor() {
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.state = 'running';
        this.destination = { __isDestination: true };
    }
    createGain() { return counting('gain')(); }
    createOscillator() { return counting('osc')(); }
    createBiquadFilter() { return counting('filter')(); }
    createDynamicsCompressor() { return counting('compressor')(); }
    createBuffer(channels, len) { return { getChannelData: () => new Float32Array(len) }; }
    createBufferSource() { return counting('bufsrc')(); }
    resume() { this.state = 'running'; }
}

const imageSrcs = [];
class MockImage {
    constructor() { this.onload = null; this._src = ''; }
    set src(v) { this._src = v; imageSrcs.push(v); }
    get src() { return this._src; }
}

function makeMockCtx() {
    const calls = [];
    const rec = (name) => function () { calls.push(name); };
    const grad = { addColorStop() {} };
    const ctx = {
        calls,
        createLinearGradient: () => grad,
        createRadialGradient: () => grad,
        createPattern: () => ({}),
        fillRect: rec('fillRect'),
        strokeRect: rec('strokeRect'),
        beginPath: rec('beginPath'),
        closePath: rec('closePath'),
        moveTo: rec('moveTo'),
        lineTo: rec('lineTo'),
        quadraticCurveTo: rec('quadraticCurveTo'),
        arc: rec('arc'),
        ellipse: rec('ellipse'),
        fill: rec('fill'),
        stroke: rec('stroke'),
        save: rec('save'),
        restore: rec('restore'),
        translate: rec('translate'),
        rotate: rec('rotate'),
        scale: rec('scale'),
        clip: rec('clip'),
        setLineDash: rec('setLineDash'),
        drawImage: rec('drawImage'),
        fillText: rec('fillText'),
        roundRect: rec('roundRect'),
    };
    // Silent property setters used throughout the renderer.
    ['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'font',
        'textAlign', 'textBaseline', 'lineCap', 'lineJoin'].forEach((p) => {
        Object.defineProperty(ctx, p, { set() {}, get() { return ''; } });
    });
    return ctx;
}

const sandboxWindow = {
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
};
const sandboxDocument = {
    createElement: () => ({ getContext: () => makeMockCtx() }),
};
const sandboxSetTimeout = () => 0;

// ---------------------------------------------------------------------------
// Load the browser scripts into the shared sandbox
// ---------------------------------------------------------------------------
function loadScript(relPath) {
    const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
    // window / document / Image / setTimeout / performance are supplied; Math, Date,
    // console, Float32Array are Node globals available inside the Function.
    const fn = new Function('window', 'document', 'Image', 'setTimeout', 'performance', code);
    fn(sandboxWindow, sandboxDocument, MockImage, sandboxSetTimeout, sandboxPerf);
}

loadScript('audio.js');
loadScript('sprites.js');
loadScript('levels.js');

// ---------------------------------------------------------------------------
// 1. Asset registration
// ---------------------------------------------------------------------------
console.log('\n[1] Asset registration');
const expectedTextures = ['tex_wood.jpg', 'tex_stone.jpg', 'tex_ice.jpg', 'tex_tnt.jpg'];
const expectedBgs = ['bg_meadow.jpg', 'bg_desert.jpg', 'bg_castle.jpg'];
expectedTextures.forEach((f) =>
    ok(imageSrcs.includes('assets/' + f), 'registers texture asset assets/' + f));
expectedBgs.forEach((f) =>
    ok(imageSrcs.includes('assets/' + f), 'registers background image assets/' + f));
ok(!imageSrcs.includes('assets/bg_snow.jpg'),
    'snow has NO image registration (handled procedurally by design)');
ok(!imageSrcs.includes('assets/bg_volcano.jpg'),
    'volcano has NO image registration (handled procedurally by design)');

// ---------------------------------------------------------------------------
// 2. Level structure
// ---------------------------------------------------------------------------
console.log('\n[2] Level structure');
const levels = sandboxWindow.GAME_LEVELS || [];
const worlds = sandboxWindow.GAME_WORLDS || [];
ok(levels.length === 120, 'GAME_LEVELS has 120 levels (got ' + levels.length + ')');
ok(worlds.length === 8, 'GAME_WORLDS has 8 worlds (got ' + worlds.length + ')');

const worldIds = worlds.map((w) => w.id).sort();
ok(JSON.stringify(worldIds) === JSON.stringify(['bamboo', 'castle', 'desert', 'meadow', 'sky', 'snow', 'space', 'volcano']),
    'world ids include all 8 themes: ' + worldIds.join(','));

const byWorld = {};
levels.forEach((lv) => { byWorld[lv.world] = (byWorld[lv.world] || 0) + 1; });
const all15 = Object.keys(byWorld).length === 8 && Object.values(byWorld).every((c) => c === 15);
ok(all15, 'each of the 8 worlds contains exactly 15 levels: ' + JSON.stringify(byWorld));

const worldIndex = { meadow: 1, desert: 2, snow: 3, castle: 4, volcano: 5, bamboo: 6, sky: 7, space: 8 };
let worldLevelOk = true;
levels.forEach((lv) => {
    if (!/^\d+-\d+$/.test(lv.worldLevel || '')) worldLevelOk = false;
    const prefix = worldIndex[lv.world] + '-';
    if (!(lv.worldLevel || '').startsWith(prefix)) worldLevelOk = false;
    if (typeof lv.id !== 'number') worldLevelOk = false;
    if (!(lv.world in worldIndex)) worldLevelOk = false;
});
ok(worldLevelOk, 'every level has a numeric id, a valid world, and a matching W-L worldLevel label');

// Progressive outposts: validate geometry, metadata and monotonic score curves.
const pigRadius = { small: 17, normal: 22, helmet: 24, foreman: 27, king: 34 };
function recordLevel(level) {
    const objects = [];
    const add = (kind, x, y, w, h, material) => objects.push({ kind, x, y, w, h, material });
    const g = {
        addBlock: (x, y, w, h, material) => add('block', x, y, w, h, material),
        addPig: (x, y, type) => add('pig', x, y, (pigRadius[type] || 22) * 2, (pigRadius[type] || 22) * 2, type),
        addTNT: (x, y) => add('tnt', x, y, 42, 42),
        addBoulder: (x, y) => add('boulder', x, y, 44, 44),
        addRoof: (x, y, w, h, material) => add('roof', x, y, w, h, material),
        addStaticPlatform: (x, y, w, h) => add('platform', x, y, w, h),
        addBouncyPad: (x, y, w, h) => add('pad', x, y, w || 100, h || 20),
        addHangingTNT: (x, y) => add('hangingTnt', x, y, 42, 42),
        addPendulumBall: (x, y) => add('pendulum', x, y, 60, 60),
    };
    level.build(g, 660);
    return objects;
}
function bounds(o) {
    return { left: o.x - o.w / 2, right: o.x + o.w / 2, top: o.y - o.h / 2, bottom: o.y + o.h / 2 };
}
function overlaps(a, b) {
    const aa = bounds(a), bb = bounds(b);
    return aa.left < bb.right - 0.5 && aa.right > bb.left + 0.5 &&
        aa.top < bb.bottom - 0.5 && aa.bottom > bb.top + 0.5;
}
function takeLast(items, count) { return count > 0 ? items.slice(-count) : []; }
function expectedOutpost(stage) {
    if (stage < 4) return { blocks: 0, pigs: 0, tnts: 0 };
    const t = stage - 4;
    const tier = Math.floor(t / 2) + 1;   // 1..6
    const guardRank = tier + (t % 2);
    const hasFrontShield = guardRank >= 3;
    const hasRoofCap = guardRank >= 2;
    const hasRearButtress = guardRank >= 5;
    return {
        blocks: tier * 3 + (hasFrontShield ? 1 : 0) + (hasRearButtress ? 1 : 0) + (hasRoofCap ? 1 : 0),
        pigs: tier,
        tnts: 0,
        guardRank,
        hasFrontShield,
        hasRearButtress,
        hasRoofCap
    };
}
let progressionOk = true, geometryOk = true, separationOk = true, parCurveOk = true;
let difficultyOk = true, reachableOk = true, birdBudgetOk = true;
const SAFE_REACH_X = 1830;                      // 保持原速 LAUNCH_SPEED_NORMAL=0.066 下的安全射程上界
const lastPar = {};
const worldTrack = {};
let maxPigRightX = 0;
levels.forEach((lv) => {
    const p = lv.progression;
    const stage = Number(lv.worldLevel.split('-')[1]);
    const expected = expectedOutpost(stage);
    if (!p || p.stage !== stage || p.addedBlocks !== expected.blocks ||
        p.addedPigs !== expected.pigs || p.addedTnts !== expected.tnts) {
        progressionOk = false;
        console.log('    progression mismatch at ' + lv.worldLevel + ': ' + JSON.stringify(p));
    }
    const maxBirdsForStage = stage <= 3 ? 4 : (stage <= 9 ? 3 : (stage <= 14 ? 4 : 5));
    if (lv.birds.length > maxBirdsForStage) {
        birdBudgetOk = false;
        console.log('    bird budget too high at ' + lv.worldLevel + ': ' + lv.birds.length + ' > ' + maxBirdsForStage);
    }
    if (lastPar[lv.world] !== undefined && lv.parScore <= lastPar[lv.world]) parCurveOk = false;
    lastPar[lv.world] = lv.parScore;

    // 世界内难度必须单调不降，且第 15 关是全场最难
    const track = worldTrack[lv.world] || (worldTrack[lv.world] = { blocks: -1, pigs: -1, rank: -1 });
    if (p.addedBlocks < track.blocks || p.addedPigs < track.pigs || p.guardRank < track.rank) {
        difficultyOk = false;
        console.log('    difficulty regression at ' + lv.worldLevel);
    }
    track.blocks = p.addedBlocks;
    track.pigs = p.addedPigs;
    track.rank = p.guardRank;
    if (stage === 15 && (p.addedPigs < 6 || p.guardRank < 7 || p.tier < 6)) {
        difficultyOk = false;
        console.log('    final level is not the hardest at ' + lv.worldLevel);
    }

    const objects = recordLevel(lv);
    const outpost = [
        ...takeLast(objects.filter((o) => o.kind === 'block' || o.kind === 'roof'), expected.blocks),
        ...takeLast(objects.filter((o) => o.kind === 'pig'), expected.pigs),
        ...takeLast(objects.filter((o) => o.kind === 'tnt'), expected.tnts),
    ];
    const outpostSet = new Set(outpost);
    const base = objects.filter((o) => !outpostSet.has(o));
    if (outpost.length) {
        const baseRight = Math.max(...base.map((o) => bounds(o).right));
        const outpostLeft = Math.min(...outpost.map((o) => bounds(o).left));
        if (outpostLeft <= baseRight) {
            separationOk = false;
            console.log('    outpost intersects original footprint at ' + lv.worldLevel);
        }
    }
    objects.filter((o) => o.kind === 'pig').forEach((pig) => {
        maxPigRightX = Math.max(maxPigRightX, bounds(pig).right);
    });
    for (const o of outpost) {
        const b = bounds(o);
        if (b.left < 1650 || b.right > 1825 || b.top < -30 || b.bottom > 660.5) geometryOk = false;
        if (o.x > SAFE_REACH_X) reachableOk = false;
    }
    for (let i = 0; i < outpost.length; i++) {
        for (let j = i + 1; j < outpost.length; j++) {
            if (overlaps(outpost[i], outpost[j])) {
                geometryOk = false;
                console.log('    outpost overlap at ' + lv.worldLevel + ': ' + outpost[i].kind + '/' + outpost[j].kind);
            }
        }
    }
});
ok(progressionOk, 'all 120 levels expose the expected fortified outpost and support metadata');
ok(birdBudgetOk, 'levels enforce tougher bird caps (<=3 for stages 4-9, <=4 for 10-14, <=5 max)');
ok(difficultyOk, 'difficulty rises monotonically within each world and level 15 is the hardest');
ok(parCurveOk, 'parScore strictly increases through all 15 levels within every world');
ok(separationOk, 'every added outpost is fully separated from the shifted base fortress');
ok(geometryOk, 'added fortified structures stay in bounds with zero AABB overlaps');
ok(reachableOk, 'every added structure stays within normal-sling safe reach (x <= ' + SAFE_REACH_X + ')');

// ---------------------------------------------------------------------------
// 2b. Fullscreen & zoomed-viewport panoramic framing + UI checks
// ---------------------------------------------------------------------------
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const gameJsCheck = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
ok(!/id="bgmBtn"/.test(indexHtml) && !/id="soundBtn"/.test(indexHtml),
    'header BGM/SFX buttons moved cleanly out of top bar into Settings modal');
ok(/id="sfxToggleBtn"/.test(indexHtml) && /id="bgmToggleBtn"/.test(indexHtml),
    'Settings modal preserves SFX & BGM toggles');
ok(/const LAUNCH_SPEED_NORMAL\s*=\s*0\.066;/.test(gameJsCheck),
    'normal bird launch speed factor stays unchanged at 0.066');

function testFraming(vw, vh, rightEdge) {
    const leftAnchor = 8;
    const rightAnchor = Math.min(2240, Math.max(1820, rightEdge + 65));
    const spanX = Math.max(1780, rightAnchor - leftAnchor);
    const zoom = Math.max(0.24, Math.min(1.45, Math.min(vw / spanX, vh / 740)));
    const extraW = Math.max(0, vw / zoom - spanX);
    const camX = leftAnchor - extraW * 0.5;
    const camY = (660 + 46) - vh / zoom;
    const leftScreenX = (24 - camX) * zoom;
    const rightScreenX = (rightEdge - camX) * zoom;
    const groundScreenY = (660 - camY) * zoom;
    return leftScreenX >= -0.5 && rightScreenX <= vw + 0.5 && groundScreenY <= vh + 0.5;
}
const framingOk = [
    [2560, 1080], [1920, 960], [1280, 720], [960, 540], [760, 420], [600, 720]
].every(([vw, vh]) => testFraming(vw, vh, maxPigRightX));
ok(framingOk, 'responsive framing keeps left birds & rightmost pigs (' + Math.round(maxPigRightX) + 'px) inside viewport at every size/zoom');

// 弹道硬约束：用 game.js 的实际物理常量做纯数值积分（不启动游戏/浏览器），
// 证明普通弹弓能带着余量打到最远的新增目标，避免再次出现「看不见也打不到」的关卡。
const GRAVITY_STEP = 0.142 * 0.001 * Math.pow(1000 / 60, 2);
function maxFreeRange(speed) {
    let best = 0;
    for (let ang = 5; ang <= 80; ang += 0.5) {
        for (let mul = 0.5; mul <= 1; mul += 0.02) {
            const s = 124 * mul, a = ang * Math.PI / 180;
            let vx = Math.cos(a) * s * speed;
            let vy = -Math.sin(a) * s * speed;
            let x = 240, y = 660 - 142;
            for (let i = 0; i < 900; i++) {
                vx *= (1 - 0.0005);
                vy = vy * (1 - 0.0005) + GRAVITY_STEP;
                x += vx;
                y += vy;
                if (y >= 640) { if (x > best) best = x; break; }
            }
        }
    }
    return best;
}
const freeRange = maxFreeRange(0.066);
const farthestTarget = Math.max(...levels
    .filter((lv) => lv.progression && lv.progression.outpostX)
    .map((lv) => lv.progression.outpostX));
ok(freeRange >= farthestTarget + 60,
    'normal-sling free range (' + Math.round(freeRange) + ') clears farthest added target (' +
    farthestTarget + ') with >=60px margin');

// The code-side fallback constant in game.js must agree with the real count.
const gameJs = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
ok(/GAME_LEVELS\.length : 120/.test(gameJs),
    'game.js fallback total-levels constant is 120 (8 worlds x 15 levels)');

// ---------------------------------------------------------------------------
// 3. Audio protection
// ---------------------------------------------------------------------------
console.log('\n[3] Audio protection');
const soundFX = sandboxWindow.soundFX;
const requiredMethods = ['init', 'setEnabled', 'setBGMEnabled',
    'setSFXVolume', 'setBGMVolume', 'playClick', 'playLaunch', 'playExplosion',
    'playHitWood', 'playHitGlass', 'playHitStone', '_canPlayImpact'];
requiredMethods.forEach((m) =>
    ok(typeof soundFX[m] === 'function', 'public API method exists: soundFX.' + m));
// sfxOut / bgmOut are public getters (return the SFX/BGM output node), not methods.
ok('sfxOut' in soundFX && soundFX.sfxOut !== undefined, 'public API getter exists: soundFX.sfxOut');
ok('bgmOut' in soundFX && soundFX.bgmOut !== undefined, 'public API getter exists: soundFX.bgmOut');

soundFX.init();
ok(soundFX.masterGain && soundFX.limiter, 'init() builds masterGain and a bus limiter');
const connectsToDestination = soundFX.masterGain._connectedTo.some((d) => d && d.__isDestination);
ok(!connectsToDestination, 'masterGain does NOT connect directly to destination (goes through limiter)');
const limiterConnectsToDestination =
    soundFX.limiter && soundFX.limiter._connectedTo.some((d) => d && d.__isDestination);
ok(limiterConnectsToDestination, 'limiter connects to destination');

// 35ms collision throttle — only impact sounds are gated.
createdNodeCount = 0;
soundFX.playHitWood(1);
const afterFirst = createdNodeCount;
ok(afterFirst > 0, 'first impact sound within throttle window is allowed (nodes created)');

soundFX.playHitWood(1); // 0ms later -> should be throttled
ok(createdNodeCount === afterFirst, 'second impact within 35ms is throttled (no new nodes)');

nowMs += 40;
soundFX.playHitGlass(1);
ok(createdNodeCount > afterFirst, 'impact allowed again after >35ms');

// Critical sounds must bypass the throttle even inside a 35ms window.
nowMs += 40;
soundFX.playHitStone(1); // resets the throttle timestamp
const beforeCritical = createdNodeCount;
nowMs += 5; // still inside the 35ms window opened by the stone hit
soundFX.playExplosion(1);
soundFX.playLaunch('red');
soundFX.playClick();
ok(createdNodeCount > beforeCritical,
    'explosion / launch / UI click bypass the collision throttle');

// ---------------------------------------------------------------------------
// 4. Background rendering (no-throw for every world, image + procedural paths)
// ---------------------------------------------------------------------------
console.log('\n[4] Background rendering');
const renderer = sandboxWindow.spriteRenderer;
const worldsToTest = ['meadow', 'desert', 'castle', 'snow', 'volcano', 'bamboo', 'sky', 'space'];
// Simulate the three worlds that DO ship images so the image-draw path is exercised.
['meadow', 'desert', 'castle'].forEach((w) => { renderer.images['bg_' + w] = { __mockImg: true }; });
let bgOk = true;
worldsToTest.forEach((w) => {
    const ctx = makeMockCtx();
    try {
        renderer.drawWorldBackground(ctx, w, { x: 0, zoom: 1 }, 1280, 720, 2240, 660, 1.2);
    } catch (e) {
        bgOk = false;
        console.log('    threw for ' + w + ': ' + e.message);
    }
    if (!ctx.calls.length) bgOk = false;
});
ok(bgOk, 'drawWorldBackground renders all 8 worlds without throwing and issues draw calls');
ok(!renderer.images['bg_snow'] && !renderer.images['bg_volcano'] && !renderer.images['bg_bamboo'] && !renderer.images['bg_sky'] && !renderer.images['bg_space'],
    'snow/volcano/bamboo/sky/space resolved via procedural fallback (no image registered)');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n----------------------------------------');
console.log(checks + ' checks, ' + failures + ' failure(s).');
if (failures > 0) {
    process.exit(1);
}
console.log('SMOKE TEST OK');
