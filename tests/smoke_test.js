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
ok(levels.length === 75, 'GAME_LEVELS has 75 levels (got ' + levels.length + ')');
ok(worlds.length === 5, 'GAME_WORLDS has 5 worlds (got ' + worlds.length + ')');

const worldIds = worlds.map((w) => w.id).sort();
ok(JSON.stringify(worldIds) === JSON.stringify(['castle', 'desert', 'meadow', 'snow', 'volcano']),
    'world ids are meadow/desert/snow/castle/volcano: ' + worldIds.join(','));

const byWorld = {};
levels.forEach((lv) => { byWorld[lv.world] = (byWorld[lv.world] || 0) + 1; });
const all15 = Object.keys(byWorld).length === 5 && Object.values(byWorld).every((c) => c === 15);
ok(all15, 'each of the 5 worlds contains exactly 15 levels: ' + JSON.stringify(byWorld));

const worldIndex = { meadow: 1, desert: 2, snow: 3, castle: 4, volcano: 5 };
let worldLevelOk = true;
levels.forEach((lv) => {
    if (!/^\d+-\d+$/.test(lv.worldLevel || '')) worldLevelOk = false;
    const prefix = worldIndex[lv.world] + '-';
    if (!(lv.worldLevel || '').startsWith(prefix)) worldLevelOk = false;
    if (typeof lv.id !== 'number') worldLevelOk = false;
    if (!(lv.world in worldIndex)) worldLevelOk = false;
});
ok(worldLevelOk, 'every level has a numeric id, a valid world, and a matching W-L worldLevel label');

// The code-side fallback constant in game.js must agree with the real count.
const gameJs = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
ok(/GAME_LEVELS\.length : 75/.test(gameJs),
    'game.js fallback total-levels constant is 75 (not a stale 60)');

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
const worldsToTest = ['meadow', 'desert', 'castle', 'snow', 'volcano'];
// Simulate the three worlds that DO ship images so the image-draw path is exercised.
['meadow', 'desert', 'castle'].forEach((w) => { renderer.images['bg_' + w] = { __mockImg: true }; });
let bgOk = true;
worldsToTest.forEach((w) => {
    const ctx = makeMockCtx();
    try {
        renderer.drawWorldBackground(ctx, w, { x: 0, zoom: 1 }, 1280, 720, 2000, 660, 1.2);
    } catch (e) {
        bgOk = false;
        console.log('    threw for ' + w + ': ' + e.message);
    }
    if (!ctx.calls.length) bgOk = false;
});
ok(bgOk, 'drawWorldBackground renders all 5 worlds without throwing and issues draw calls');
ok(!renderer.images['bg_snow'] && !renderer.images['bg_volcano'],
    'snow/volcano still resolved via procedural fallback (no image registered)');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n----------------------------------------');
console.log(checks + ' checks, ' + failures + ' failure(s).');
if (failures > 0) {
    process.exit(1);
}
console.log('SMOKE TEST OK');
