// Angry Birds Remastered - Complete Engine & Game Controller
// Integrates Matter.js 2D Physics, HD Sprites, 10 Multi-World Levels, Web Audio Synthesizer

const {
    Engine,
    Bodies,
    Body,
    Composite,
    Constraint,
    Vector,
    Events,
    Query
} = Matter;

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const WORLD_WIDTH = 2050;
const WORLD_HEIGHT = 760;
const GROUND_Y = 660;
const SLING_POS = { x: 240, y: GROUND_Y - 142 };
const MAX_STRETCH = 124;

// Calibrated authentic Angry Birds ballistics: slower, graceful launch speed + exact long-range arc
const WORLD_GRAVITY_Y = 0.142;
const BIRD_AIR_FRICTION = 0.0005;
const LAUNCH_SPEED_NORMAL = 0.066;
const LAUNCH_SPEED_KING = 0.086;

// Classic Angry Birds rule: Red & Terence have NO mid-air tap skill!
const ACTIVE_ABILITY_BIRDS = new Set(['yellow', 'blue', 'bomb', 'matilda']);

// =========================================================================
// LOCALSTORAGE PROGRESSION & SETTINGS MANAGER
// =========================================================================
class SaveManager {
    static STORAGE_KEY = 'tianshu_angry_birds_save_v2';

    static load() {
        let data = null;
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) data = JSON.parse(raw);
        } catch (e) {
            console.warn('Failed to parse localStorage save data:', e);
        }

        if (!data || typeof data !== 'object') {
            data = {
                currentLevelIndex: 0,
                unlockedLevels: [0],
                levelScores: {},
                levelStars: {},
                settings: {
                    sfxVolume: 0.8,
                    bgmVolume: 0.5,
                    sfxEnabled: true,
                    bgmEnabled: false,
                    trajectoryGuide: true,
                    screenShake: true
                }
            };
        }

        // Migrate legacy localStorage keys if present
        try {
            const legacyLevel = parseInt(localStorage.getItem('ab_current_level') || '0', 10);
            if (!isNaN(legacyLevel) && legacyLevel > 0 && !data.currentLevelIndex) {
                data.currentLevelIndex = legacyLevel;
            }
            const legacyScores = JSON.parse(localStorage.getItem('ab_highscores') || '{}');
            data.levelScores = Object.assign({}, legacyScores, data.levelScores || {});
            const legacyStars = JSON.parse(localStorage.getItem('ab_stars') || '{}');
            data.levelStars = Object.assign({}, legacyStars, data.levelStars || {});
        } catch (e) {}

        // Ensure unlockedLevels is valid and always contains level 0
        if (!Array.isArray(data.unlockedLevels)) data.unlockedLevels = [0];
        if (!data.unlockedLevels.includes(0)) data.unlockedLevels.push(0);

        // If user already had stars on any level, unlock that level and its next
        Object.keys(data.levelStars || {}).forEach(k => {
            const idx = parseInt(k, 10);
            if (!isNaN(idx)) {
                if (!data.unlockedLevels.includes(idx)) data.unlockedLevels.push(idx);
                if (!data.unlockedLevels.includes(idx + 1)) data.unlockedLevels.push(idx + 1);
            }
        });

        // Ensure settings defaults
        data.settings = Object.assign({
            sfxVolume: 0.8,
            bgmVolume: 0.5,
            sfxEnabled: true,
            bgmEnabled: false,
            trajectoryGuide: true,
            screenShake: true
        }, data.settings || {});

        return data;
    }

    static save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            // Sync legacy keys for backward compatibility
            localStorage.setItem('ab_current_level', String(data.currentLevelIndex || 0));
            localStorage.setItem('ab_highscores', JSON.stringify(data.levelScores || {}));
            localStorage.setItem('ab_stars', JSON.stringify(data.levelStars || {}));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    }

    static reset() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem('ab_current_level');
            localStorage.removeItem('ab_highscores');
            localStorage.removeItem('ab_stars');
        } catch (e) {}
        return this.load();
    }
}

class AngryBirdsMaster {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = VIEW_WIDTH;
        this.canvas.height = VIEW_HEIGHT;

        // Matter.js 2D Physics Engine with tuned classic gravity & solver iterations
        this.engine = Engine.create({
            gravity: { x: 0, y: WORLD_GRAVITY_Y, scale: 0.001 },
            positionIterations: 8,
            velocityIterations: 8
        });
        this.world = this.engine.world;

        // Camera System with Widescreen Panoramic Zoom & Dynamic Panning
        this.camera = {
            x: 20,
            y: -20,
            zoom: 0.74, // Wide Panorama: shows slingshot on left & fortress on right simultaneously!
            targetX: 20,
            targetY: -20,
            targetZoom: 0.74,
            shake: 0,
            mode: 'wide' // 'wide' (0.74x panorama) or 'close' (0.90x cinematic)
        };

        // Persistent LocalStorage Progress & Settings
        this.saveData = SaveManager.load();
        const totalLevels = window.GAME_LEVELS ? window.GAME_LEVELS.length : 13;
        this.currentLevelIndex = Math.max(0, Math.min(this.saveData.currentLevelIndex || 0, totalLevels - 1));
        this.unlockedLevels = this.saveData.unlockedLevels || [0];
        this.highScores = this.saveData.levelScores || {};
        this.starsUnlocked = this.saveData.levelStars || {};
        this.settings = this.saveData.settings;
        this.selectedWorldTab = (window.GAME_LEVELS && window.GAME_LEVELS[this.currentLevelIndex])
            ? window.GAME_LEVELS[this.currentLevelIndex].world
            : 'meadow';

        // Apply audio settings to SoundFX synthesizer
        if (window.soundFX) {
            window.soundFX.setSFXVolume(this.settings.sfxVolume);
            window.soundFX.setBGMVolume(this.settings.bgmVolume);
            window.soundFX.setEnabled(this.settings.sfxEnabled);
            window.soundFX.setBGMEnabled(this.settings.bgmEnabled);
        }

        // Game State
        this.score = 0;
        this.levelScore = 0;
        this.state = 'AIMING'; // AIMING, DRAGGING, VICTORY_SETTLING, WON, LOST
        this.kingSlingActive = false;
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;
        this.levelStartTime = 0;
        this.pendingTimers = [];

        // Entities
        this.birdsQueue = [];
        this.currentBird = null;
        this.birdEntranceState = null; // Staged entrance animation (1.0s delay, anticipation squash, hop & landing)
        this.slingRecoil = null; // Slingshot elastic twang recoil oscillation
        this.slingBounce = null; // Slingshot pouch trampoline bounce when bird lands
        this.birdLandingSquash = null; // Squash and stretch on landing
        this.activeFlyingBirds = [];
        this.flightPathTrail = [];
        this.pigs = [];
        this.blocks = [];
        this.tnts = [];
        this.bouncyPads = [];
        this.constraints = [];
        this.particles = [];
        this.floatingTexts = [];
        this.smokeTrails = [];
        this.debrisEffects = [];

        // Mouse & Touch Input
        this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0, isDown: false };
        this.isDraggingSling = false;
        this.isPanningCamera = false;
        this.panStartX = 0;
        this.camStartX = 0;
        this.lastStretchDist = 0;
        this.lastStretchTime = 0;
        this.dragOffset = { x: 0, y: 0 };
        this.settleTimer = 0;
        this.lastTime = performance.now();

        // Setup
        this.initBoundaries();
        this.setupPhysicsEvents();
        this.setupInputListeners();
        this.setupUI();

        // Load level
        this.loadLevel(this.currentLevelIndex);

        // Run Main Loop
        requestAnimationFrame((t) => this.loop(t));
    }

    saveProgress() {
        this.saveData.currentLevelIndex = this.currentLevelIndex;
        this.saveData.unlockedLevels = Array.from(new Set(this.unlockedLevels));
        this.saveData.levelScores = this.highScores;
        this.saveData.levelStars = this.starsUnlocked;
        this.saveData.settings = this.settings;
        SaveManager.save(this.saveData);
    }

    // =========================================================================
    // PHYSICS WORLD SETUP & COLLISION DETECTORS
    // =========================================================================
    initBoundaries() {
        // Ground physics collider
        const ground = Bodies.rectangle(WORLD_WIDTH / 2, GROUND_Y + 50, WORLD_WIDTH + 600, 100, {
            isStatic: true,
            friction: 0.85,
            restitution: 0.05,
            label: 'ground'
        });

        // Left & Right world boundaries
        const leftWall = Bodies.rectangle(-120, WORLD_HEIGHT / 2, 200, WORLD_HEIGHT * 2, {
            isStatic: true,
            label: 'wall'
        });
        const rightWall = Bodies.rectangle(WORLD_WIDTH + 150, WORLD_HEIGHT / 2, 200, WORLD_HEIGHT * 2, {
            isStatic: true,
            label: 'wall'
        });

        Composite.add(this.world, [ground, leftWall, rightWall]);
    }

    addTimer(fn, ms) {
        const id = setTimeout(() => {
            this.pendingTimers = this.pendingTimers.filter(t => t !== id);
            fn();
        }, ms);
        this.pendingTimers.push(id);
        return id;
    }

    clearAllTimers() {
        this.pendingTimers.forEach(id => clearTimeout(id));
        this.pendingTimers = [];
    }

    setupPhysicsEvents() {
        // Track pre-impact velocity & apply realistic structural weight to non-bird dynamic bodies
        // (Birds remain on pure WORLD_GRAVITY_Y so aiming trajectory prediction is 100.0% exact!)
        Events.on(this.engine, 'beforeUpdate', () => {
            const bodies = Composite.allBodies(this.world);
            for (let i = 0; i < bodies.length; i++) {
                const b = bodies[i];
                if (b.isStatic || !b.customData) continue;
                b.customData.prevVel = { x: b.velocity.x, y: b.velocity.y };

                if (b.customData.type !== 'bird') {
                    Body.applyForce(b, b.position, {
                        x: 0,
                        y: 0.000105 * (b.mass || 1)
                    });
                }
            }
        });

        Events.on(this.engine, 'collisionStart', (e) => {
            e.pairs.forEach(pair => {
                this.handleCollision(pair.bodyA, pair.bodyB);
            });
        });
    }

    getBirdMaterialMultiplier(birdType, material) {
        // Authentic Classic Angry Birds Material Affinities:
        // - The Blues (blue): shatters Glass/Ice (3.8x), weak vs Stone (0.35x)
        // - Chuck (yellow): slices through Wood (3.8x), weak vs Stone (0.45x)
        // - Bomb (bomb): heavy iron shell crushes Stone (2.2x)
        // - Terence (terence): unstoppable juggernaut crushes everything (4.5x)
        // - Red (red): balanced classic brawler (1.35x wood/glass, 0.85x stone)
        if (birdType === 'terence') return 4.5;
        if (birdType === 'blue') {
            if (material === 'glass') return 3.8;
            if (material === 'wood') return 0.65;
            return 0.35;
        }
        if (birdType === 'yellow') {
            if (material === 'wood') return 3.8;
            if (material === 'glass') return 0.85;
            return 0.45;
        }
        if (birdType === 'bomb') {
            if (material === 'stone') return 2.2;
            return 1.4;
        }
        if (birdType === 'red') {
            if (material === 'stone') return 0.85;
            return 1.35;
        }
        return 1.0;
    }

    handleCollision(bodyA, bodyB) {
        const velA = bodyA.customData?.prevVel || bodyA.velocity;
        const velB = bodyB.customData?.prevVel || bodyB.velocity;
        const relSpeedPrev = Math.hypot(velA.x - velB.x, velA.y - velB.y);
        const relSpeedNow = Math.hypot(bodyA.velocity.x - bodyB.velocity.x, bodyA.velocity.y - bodyB.velocity.y);
        const relSpeed = Math.max(relSpeedPrev, relSpeedNow);

        // Initial 650ms tower-settling grace period on level load so micro-settling never chips HP or clicks
        const inSettlingGrace = (performance.now() - this.levelStartTime) < 650;
        const involvesBird = bodyA.customData?.type === 'bird' || bodyB.customData?.type === 'bird';
        if (inSettlingGrace && !involvesBird && relSpeed < 3.5) {
            return;
        }

        [bodyA, bodyB].forEach((target, idx) => {
            const hitter = idx === 0 ? bodyB : bodyA;
            if (!target.customData) return;
            const d = target.customData;

            // Bouncy Pad trampolines (calibrated for graceful world physics)
            if (d.type === 'bouncypad' && !hitter.isStatic) {
                d.bounceAnim = performance.now() / 1000;
                window.soundFX.playBounce();
                this.addCameraShake(3);
                const bounceNormal = { x: Math.sin(target.angle), y: -Math.cos(target.angle) };
                const curVel = hitter.customData?.prevVel || hitter.velocity;
                const speed = Math.max(8.8, Math.hypot(curVel.x, curVel.y) * 1.28);
                Body.setVelocity(hitter, {
                    x: bounceNormal.x * speed + curVel.x * 0.38,
                    y: bounceNormal.y * speed
                });
                return;
            }

            // Flag bird contact
            if (d.type === 'bird') {
                d.collided = true;
                // Bomb bird starts glowing red-hot fuse countdown on impact
                if (d.birdType === 'bomb' && !d.detonateTimer && !d.exploded) {
                    d.detonateTimer = this.addTimer(() => {
                        if (!d.exploded) this.detonateBomb(target);
                    }, 1000);
                }
            }

            // TNT explosive detonation
            if (d.type === 'tnt' && !d.exploded) {
                if (relSpeed > 1.9 || hitter.customData?.type === 'bird') {
                    this.detonateTNT(target);
                    return;
                }
            }

            // Egg Bomb detonation
            if (d.type === 'eggbomb' && !d.exploded) {
                if (relSpeed > 1.15) {
                    this.detonateEgg(target);
                    return;
                }
            }

            // Damage to Pigs
            if (d.type === 'pig' && !d.dead) {
                if (relSpeed > 1.12) {
                    const isTerence = hitter.customData?.birdType === 'terence';
                    const massFactor = isTerence ? Math.min(18, hitter.mass || 1) : Math.min(6.5, hitter.mass || 1);
                    const dmg = Math.pow(relSpeed, 1.38) * massFactor * 4.5;
                    const hpBefore = d.hp;
                    d.hp -= dmg;

                    // Knock off combat helmet if hp dropped below 55%
                    if (d.hasHelmet && d.hp / d.maxHp < 0.55) {
                        d.hasHelmet = false;
                        this.spawnHelmetDebris(target.position.x, target.position.y - d.radius * 0.6);
                    }

                    window.soundFX.playPigSqueak();
                    this.createSparks(target.position.x, target.position.y, '#bef264', 5);

                    // High impact slow-motion
                    if (relSpeed > 7.2) {
                        this.triggerSlowMo(0.25, 200);
                        this.addCameraShake(6);
                    }

                    if (d.hp <= 0) {
                        this.destroyPig(target);
                        // Carry-through momentum if bird crushed pig at speed
                        if (hitter.customData?.type === 'bird' && hitter.customData.prevVel) {
                            const pv = hitter.customData.prevVel;
                            const carry = isTerence ? 0.88 : Math.min(0.78, Math.max(0.45, 1 - hpBefore / (dmg * 1.4)));
                            Body.setVelocity(hitter, { x: pv.x * carry, y: pv.y * carry });
                        }
                    }
                }
            }

            // Damage to Destructible Blocks & Roofs
            if (d.type === 'block' && !d.dead && !target.isStatic) {
                if (relSpeed > 1.12) {
                    const birdType = hitter.customData?.birdType;
                    const materialMult = birdType ? this.getBirdMaterialMultiplier(birdType, d.material) : 1.0;

                    const isTerence = birdType === 'terence';
                    const massFactor = isTerence ? Math.min(18, hitter.mass || 1) : Math.min(6.5, hitter.mass || 1);
                    const dmg = Math.pow(relSpeed, 1.36) * massFactor * 3.3 * materialMult;
                    const hpBefore = d.hp;
                    d.hp -= dmg;

                    // Material sounds & sparks
                    if (d.material === 'wood') {
                        window.soundFX.playHitWood(Math.min(2.5, relSpeed / 3.8));
                        this.createSparks(target.position.x, target.position.y, '#d97706', 4);
                    } else if (d.material === 'glass') {
                        window.soundFX.playHitGlass(Math.min(2.5, relSpeed / 3.8));
                        this.createSparks(target.position.x, target.position.y, '#7dd3fc', 6);
                    } else if (d.material === 'stone') {
                        window.soundFX.playHitStone(Math.min(2.5, relSpeed / 3.8));
                        this.createSparks(target.position.x, target.position.y, '#94a3b8', 4);
                    }

                    if (d.hp <= 0) {
                        this.destroyBlock(target);

                        // Authentic Angry Birds Smash-Through Momentum!
                        // Birds plow cleanly through shattered glass/wood instead of bouncing backward off broken air
                        if (hitter.customData?.type === 'bird' && hitter.customData.prevVel) {
                            const pv = hitter.customData.prevVel;
                            const pvSpeed = Math.hypot(pv.x, pv.y);
                            if (pvSpeed > 1.8) {
                                const isSpecialistMatch =
                                    isTerence ||
                                    (birdType === 'blue' && d.material === 'glass') ||
                                    (birdType === 'yellow' && d.material === 'wood');
                                const baseCarry = isSpecialistMatch ? 0.84 : 0.62;
                                const overkillCarry = Math.min(0.88, Math.max(0.42, (1 - hpBefore / (dmg * 1.25)) * 0.3 + baseCarry * 0.75));
                                Body.setVelocity(hitter, {
                                    x: pv.x * overkillCarry,
                                    y: pv.y * overkillCarry
                                });
                            }
                        }
                    }
                }
            }
        });
    }

    // =========================================================================
    // DESTRUCTION & EXPLOSIONS
    // =========================================================================
    destroyPig(pigBody) {
        pigBody.customData.dead = true;
        const pos = pigBody.position;
        const pType = pigBody.customData.pigType;
        window.soundFX.playPigPop();

        const points = pType === 'king' ? 15000 : pType === 'foreman' ? 8000 : pType === 'helmet' ? 6000 : 5000;
        this.addScore(points, pos.x, pos.y);

        this.addCameraShake(pType === 'king' ? 14 : 6);
        this.createPigDebris(pos.x, pos.y, pigBody.customData.radius || 20);
        this.createScorePopup(`+${points}`, pos.x, pos.y - 10, '#facc15');

        // Check if King Pig was destroyed
        if (pType === 'king') {
            this.triggerSlowMo(0.15, 600);
            window.soundFX.playWin();
        }

        Composite.remove(this.world, pigBody);
        this.pigs = this.pigs.filter(p => p !== pigBody);
        this.checkWinLoss();
    }

    createPigDebris(x, y, radius) {
        // Green cloud puff
        this.createExplosionSmoke(x, y, '#bef264', 32);

        // 2 Flying Green Pig Ears tumbling into the air!
        [-1, 1].forEach(side => {
            this.particles.push({
                type: 'pigEar',
                x: x + side * 8,
                y: y - 8,
                vx: side * (2.2 + Math.random() * 3),
                vy: -5.5 - Math.random() * 3,
                radius: radius * 0.35,
                angle: 0,
                vRot: side * 0.22,
                alpha: 1.0,
                decay: 0.016,
                gravity: 0.22
            });
        });

        // 1 Flying Pig Snout!
        this.particles.push({
            type: 'pigSnout',
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2.5,
            vy: -6.5 - Math.random() * 2,
            radius: radius * 0.42,
            angle: 0,
            vRot: 0.16,
            alpha: 1.0,
            decay: 0.015,
            gravity: 0.22
        });

        // Golden comic stars bursting outwards!
        for (let i = 0; i < 5; i++) {
            const ang = (i / 5) * Math.PI * 2 + 0.3;
            this.particles.push({
                type: 'star',
                x: x,
                y: y,
                vx: Math.cos(ang) * 4.8,
                vy: Math.sin(ang) * 4.8 - 1.2,
                radius: 12,
                color: '#fde047',
                alpha: 1.0,
                decay: 0.032
            });
        }
    }

    destroyBlock(blockBody) {
        blockBody.customData.dead = true;
        const pos = blockBody.position;
        const mat = blockBody.customData.material;

        this.createBlockDebris(blockBody);
        this.addScore(mat === 'stone' ? 800 : mat === 'wood' ? 500 : 400, pos.x, pos.y);

        Composite.remove(this.world, blockBody);
        this.blocks = this.blocks.filter(b => b !== blockBody);
    }

    createBlockDebris(blockBody) {
        const { x, y } = blockBody.position;
        const d = blockBody.customData;
        const mat = d.material;
        const w = d.width || 30;
        const h = d.height || 30;

        if (mat === 'wood') {
            for (let i = 0; i < 6; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2.5 + Math.random() * 5.5;
                this.particles.push({
                    type: 'splinter',
                    x: x + (Math.random() - 0.5) * w * 0.6,
                    y: y + (Math.random() - 0.5) * h * 0.6,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 2.5,
                    w: 6 + Math.random() * 10,
                    h: 3 + Math.random() * 4,
                    angle: Math.random() * Math.PI,
                    vRot: (Math.random() - 0.5) * 0.35,
                    color: i % 2 === 0 ? '#b45309' : '#d97706',
                    alpha: 1.0,
                    decay: 0.016 + Math.random() * 0.01,
                    gravity: 0.22
                });
            }
        } else if (mat === 'stone') {
            for (let i = 0; i < 7; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2.0 + Math.random() * 5.0;
                this.particles.push({
                    type: 'stoneChunk',
                    x: x + (Math.random() - 0.5) * w * 0.6,
                    y: y + (Math.random() - 0.5) * h * 0.6,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 2.0,
                    radius: 4 + Math.random() * 6,
                    angle: Math.random() * Math.PI,
                    vRot: (Math.random() - 0.5) * 0.25,
                    color: i % 2 === 0 ? '#64748b' : '#94a3b8',
                    alpha: 1.0,
                    decay: 0.014 + Math.random() * 0.01,
                    gravity: 0.28
                });
            }
        } else if (mat === 'glass') {
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 3.0 + Math.random() * 6.5;
                this.particles.push({
                    type: 'shard',
                    x: x + (Math.random() - 0.5) * w * 0.6,
                    y: y + (Math.random() - 0.5) * h * 0.6,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 2.0,
                    size: 4 + Math.random() * 7,
                    angle: Math.random() * Math.PI,
                    vRot: (Math.random() - 0.5) * 0.4,
                    color: i % 2 === 0 ? '#e0f2fe' : '#7dd3fc',
                    alpha: 0.95,
                    decay: 0.02 + Math.random() * 0.015,
                    gravity: 0.2
                });
            }
        }

        // Comic impact star
        this.particles.push({
            type: 'star',
            x: x,
            y: y,
            vx: 0,
            vy: -0.5,
            radius: Math.min(26, Math.max(14, (w + h) * 0.22)),
            color: '#fef08a',
            alpha: 1.0,
            decay: 0.045
        });
    }

    createFeather(x, y, color = '#ef4444') {
        this.particles.push({
            type: 'feather',
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 1.5,
            vy: 0.8 + Math.random() * 1.0,
            swaySpeed: 4 + Math.random() * 3,
            swayAmp: 1.5 + Math.random() * 2,
            color: color,
            alpha: 0.9,
            decay: 0.014,
            angle: Math.random() * Math.PI
        });
    }

    detonateTNT(tntBody) {
        tntBody.customData.exploded = true;
        const pos = { x: tntBody.position.x, y: tntBody.position.y };
        window.soundFX.playExplosion(1.2);

        this.addCameraShake(16);
        this.triggerSlowMo(0.2, 350);
        this.createFireball(pos.x, pos.y, 160);
        this.addScore(4000, pos.x, pos.y);
        this.createScorePopup('+4000', pos.x, pos.y - 20, '#ef4444');

        this.applyRadialBlast(pos, 250, 0.08, 380);

        Composite.remove(this.world, tntBody);
        this.tnts = this.tnts.filter(t => t !== tntBody);
    }

    detonateBomb(bombBird) {
        bombBird.customData.exploded = true;
        const pos = { x: bombBird.position.x, y: bombBird.position.y };
        window.soundFX.playExplosion(1.4);

        this.addCameraShake(18);
        this.triggerSlowMo(0.2, 400);
        this.createFireball(pos.x, pos.y, 210);
        this.addScore(3000, pos.x, pos.y);

        this.applyRadialBlast(pos, 290, 0.095, 450);

        Composite.remove(this.world, bombBird);
        this.activeFlyingBirds = this.activeFlyingBirds.filter(b => b !== bombBird);
        if (this.currentBird === bombBird) this.currentBird = null;
        this.checkDefeatCondition();
    }

    detonateEgg(eggBody) {
        eggBody.customData.exploded = true;
        const pos = { x: eggBody.position.x, y: eggBody.position.y };
        window.soundFX.playExplosion(0.9);

        this.addCameraShake(11);
        this.createFireball(pos.x, pos.y, 140);
        this.addScore(2500, pos.x, pos.y);
        this.applyRadialBlast(pos, 220, 0.07, 320);

        Composite.remove(this.world, eggBody);
        this.blocks = this.blocks.filter(b => b !== eggBody);
    }

    applyRadialBlast(center, radius, forceMagnitude, maxDamage) {
        const bodies = Composite.allBodies(this.world);
        bodies.forEach(b => {
            if (b.isStatic || b.customData?.type === 'ground') return;
            const distVec = Vector.sub(b.position, center);
            const dist = Vector.magnitude(distVec);

            if (dist < radius && dist > 1) {
                const norm = Vector.normalise(distVec);
                const falloff = Math.pow(1 - dist / radius, 1.2);
                const impulse = Vector.mult(norm, forceMagnitude * falloff * (b.mass || 1));
                Body.applyForce(b, b.position, impulse);

                if (b.customData) {
                    const dmg = maxDamage * falloff;
                    if (b.customData.type === 'pig') {
                        b.customData.hp -= dmg;
                        if (b.customData.hp <= 0 && !b.customData.dead) {
                            this.destroyPig(b);
                        }
                    } else if (b.customData.type === 'block') {
                        b.customData.hp -= dmg;
                        if (b.customData.hp <= 0 && !b.customData.dead) {
                            this.destroyBlock(b);
                        }
                    } else if (b.customData.type === 'tnt' && !b.customData.exploded) {
                        this.addTimer(() => {
                            if (!b.customData.exploded) this.detonateTNT(b);
                        }, 55 + Math.random() * 80);
                    }
                }
            }
        });
    }

    // =========================================================================
    // LEVEL BUILDER HELPER METHODS (Invoked by levels.js)
    // =========================================================================
    addBlock(x, y, width, height, material) {
        let hp = 85;
        let density = 0.0022;
        let friction = 0.75;
        let restitution = 0.08;

        if (material === 'glass') {
            hp = 34;
            density = 0.0014;
            friction = 0.28;
            restitution = 0.25;
        } else if (material === 'stone') {
            hp = 260;
            density = 0.0058;
            friction = 0.88;
            restitution = 0.04;
        }

        const block = Bodies.rectangle(x, y, width, height, {
            density,
            friction,
            restitution,
            label: 'block',
            customData: {
                type: 'block',
                shape: 'rect',
                material,
                width,
                height,
                maxHp: hp,
                hp,
                dead: false
            }
        });

        Composite.add(this.world, block);
        this.blocks.push(block);
        return block;
    }

    addRoof(x, y, width, height, material) {
        const verts = [
            { x: 0, y: -height * (2 / 3) },
            { x: width / 2, y: height * (1 / 3) },
            { x: -width / 2, y: height * (1 / 3) }
        ];
        const roof = Bodies.fromVertices(x, y, [verts], {
            density: material === 'stone' ? 0.005 : 0.0022,
            friction: 0.78,
            restitution: 0.06,
            label: 'block',
            customData: {
                type: 'block',
                shape: 'roof',
                material,
                width,
                height,
                maxHp: material === 'stone' ? 240 : 100,
                hp: material === 'stone' ? 240 : 100,
                dead: false
            }
        });
        Composite.add(this.world, roof);
        this.blocks.push(roof);
        return roof;
    }

    addBoulder(x, y, radius, material = 'stone') {
        const boulder = Bodies.circle(x, y, radius, {
            density: 0.0075,
            friction: 0.45,
            restitution: 0.18,
            label: 'boulder',
            customData: {
                type: 'block',
                shape: 'boulder',
                material,
                radius,
                maxHp: 450,
                hp: 450,
                dead: false
            }
        });
        Composite.add(this.world, boulder);
        this.blocks.push(boulder);
        return boulder;
    }

    addPig(x, y, pigType = 'normal') {
        let radius = 22;
        let hp = 65;

        if (pigType === 'small') {
            radius = 16;
            hp = 38;
        } else if (pigType === 'helmet') {
            radius = 23;
            hp = 145;
        } else if (pigType === 'foreman') {
            radius = 26;
            hp = 180;
        } else if (pigType === 'king') {
            radius = 36;
            hp = 380;
        }

        const pig = Bodies.circle(x, y, radius, {
            density: 0.0028,
            friction: 0.65,
            restitution: 0.35,
            label: 'pig',
            customData: {
                type: 'pig',
                pigType,
                radius,
                maxHp: hp,
                hp,
                hasHelmet: pigType === 'helmet',
                dead: false,
                seed: Math.random() * 10
            }
        });

        Composite.add(this.world, pig);
        this.pigs.push(pig);
        return pig;
    }

    addTNT(x, y) {
        const size = 42;
        const tnt = Bodies.rectangle(x, y, size, size, {
            density: 0.0032,
            friction: 0.75,
            restitution: 0.15,
            label: 'tnt',
            customData: {
                type: 'tnt',
                size,
                exploded: false
            }
        });
        Composite.add(this.world, tnt);
        this.tnts.push(tnt);
        return tnt;
    }

    addStaticPlatform(x, y, width, height, angle = 0, material = 'stone') {
        const plat = Bodies.rectangle(x, y, width, height, {
            isStatic: true,
            angle,
            friction: 0.8,
            restitution: 0.1,
            label: 'platform',
            customData: {
                type: 'block',
                shape: 'rect',
                material,
                width,
                height,
                hp: Infinity,
                maxHp: Infinity
            }
        });
        Composite.add(this.world, plat);
        this.blocks.push(plat);
        return plat;
    }

    addBouncyPad(x, y, width, height, angle = 0) {
        const pad = Bodies.rectangle(x, y, width, height, {
            isStatic: true,
            angle,
            restitution: 1.8,
            friction: 0.1,
            label: 'bouncypad',
            customData: {
                type: 'bouncypad',
                width,
                height,
                bounceAnim: 0
            }
        });
        Composite.add(this.world, pad);
        this.bouncyPads.push(pad);
        return pad;
    }

    addHangingTNT(anchorX, anchorY, tntX, tntY) {
        const tnt = this.addTNT(tntX, tntY);
        const joint = Constraint.create({
            pointA: { x: anchorX, y: anchorY },
            bodyB: tnt,
            pointB: { x: 0, y: -tnt.customData.size / 2 },
            stiffness: 0.95,
            length: Math.hypot(tntX - anchorX, tntY - anchorY)
        });
        Composite.add(this.world, joint);
        this.constraints.push(joint);
    }

    addPendulumBall(anchorX, anchorY, ballX, ballY, radius) {
        const ball = Bodies.circle(ballX, ballY, radius, {
            density: 0.012, // massive steel iron
            friction: 0.3,
            restitution: 0.25,
            label: 'wreckingball',
            customData: {
                type: 'wreckingball',
                radius,
                material: 'stone',
                maxHp: Infinity,
                hp: Infinity
            }
        });
        Composite.add(this.world, ball);
        this.blocks.push(ball);

        const joint = Constraint.create({
            pointA: { x: anchorX, y: anchorY },
            bodyB: ball,
            stiffness: 0.98,
            length: Math.hypot(ballX - anchorX, ballY - anchorY)
        });
        Composite.add(this.world, joint);
        this.constraints.push(joint);
    }

    // =========================================================================
    // LEVEL LIFECYCLE & BIRDS MANAGEMENT
    // =========================================================================
    loadLevel(index) {
        if (!window.GAME_LEVELS || window.GAME_LEVELS.length === 0) return;
        this.clearAllTimers();
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;
        this.isDraggingSling = false;
        this.isPanningCamera = false;

        this.currentLevelIndex = Math.max(0, Math.min(index, window.GAME_LEVELS.length - 1));
        const levelData = window.GAME_LEVELS[this.currentLevelIndex];
        if (levelData) this.selectedWorldTab = levelData.world;
        this.saveProgress();

        // Remove ALL level bodies (including static platforms, bouncy pads & unlaunched sling bird!)
        const allBodies = Composite.allBodies(this.world);
        allBodies.forEach(b => {
            if (b.label !== 'ground' && b.label !== 'wall') {
                Composite.remove(this.world, b);
            }
        });
        this.constraints.forEach(c => Composite.remove(this.world, c));
        this.constraints = [];

        // Clear references
        this.pigs = [];
        this.blocks = [];
        this.tnts = [];
        this.bouncyPads = [];
        this.activeFlyingBirds = [];
        this.flightPathTrail = [];
        this.currentBird = null;
        this.birdEntranceState = null;
        this.slingRecoil = null;
        this.slingBounce = null;
        this.birdLandingSquash = null;
        this.particles = [];
        this.floatingTexts = [];
        this.smokeTrails = [];
        this.debrisEffects = [];

        this.levelScore = 0;
        this.levelStartTime = performance.now();
        this.state = 'AIMING';
        this.hideModal();

        // Build Level Layout
        levelData.build(this, GROUND_Y);

        // Populate Birds Queue & Place First Bird on Sling
        this.birdsQueue = [...levelData.birds];
        if (this.birdsQueue.length > 0) {
            const firstBird = this.birdsQueue.shift();
            this.prepareBirdOnSling(firstBird);
        }

        // Center camera: wide panoramic view
        this.camera.targetX = 20;
        this.camera.targetY = -20;
        this.camera.targetZoom = this.camera.mode === 'close' ? 0.90 : 0.74;

        this.updateHUD();
    }

    getBirdRadius(birdType) {
        if (birdType === 'blue') return 13;
        if (birdType === 'yellow') return 17;
        if (birdType === 'bomb') return 24;
        if (birdType === 'matilda') return 23;
        if (birdType === 'terence') return 34;
        return 18; // red
    }

    createBirdBody(x, y, birdType) {
        const radius = this.getBirdRadius(birdType);
        let density = 0.0042; // Red: solid classic mass for knocking over pillars

        if (birdType === 'blue') density = 0.0030;
        else if (birdType === 'yellow') density = 0.0036;
        else if (birdType === 'bomb') density = 0.0062;
        else if (birdType === 'matilda') density = 0.0040;
        else if (birdType === 'terence') density = 0.018; // Massive wrecking ball mass!

        const bird = Bodies.circle(x, y, radius, {
            density,
            friction: 0.75,
            frictionAir: BIRD_AIR_FRICTION,
            restitution: 0.38,
            isStatic: true,
            label: 'bird',
            customData: {
                type: 'bird',
                birdType,
                radius,
                inFlight: false,
                abilityUsed: false,
                collided: false,
                exploded: false,
                detonateTimer: null,
                lastTrailPos: null,
                trailCount: 0
            }
        });

        Composite.add(this.world, bird);
        return bird;
    }

    prepareBirdOnSling(birdType) {
        if (this.currentBird) {
            Composite.remove(this.world, this.currentBird);
        }
        this.currentBird = this.createBirdBody(SLING_POS.x, SLING_POS.y, birdType);
        if (this.state !== 'VICTORY_SETTLING' && this.state !== 'WON') {
            this.state = 'AIMING';
        }
        this.updateBirdsInventoryUI();
    }

    launchBird() {
        if (!this.currentBird) return;

        // Ensure 1.0x physics clock so trajectory matches aiming arc 1:1
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;

        const stretch = Vector.sub(SLING_POS, this.currentBird.position);
        const speedFactor = this.kingSlingActive ? LAUNCH_SPEED_KING : LAUNCH_SPEED_NORMAL;
        const launchVelocity = {
            x: stretch.x * speedFactor,
            y: stretch.y * speedFactor
        };

        const launchedBird = this.currentBird;
        this.currentBird = null;
        this.isDraggingSling = false;

        Body.setStatic(launchedBird, false);
        Body.setVelocity(launchedBird, launchVelocity);

        launchedBird.customData.inFlight = true;
        launchedBird.customData.launchTime = performance.now();
        launchedBird.customData.lastTrailPos = { x: launchedBird.position.x, y: launchedBird.position.y };
        launchedBird.customData.trailCount = 1;
        this.activeFlyingBirds.push(launchedBird);

        window.soundFX.playLaunch(launchedBird.customData.birdType);

        // Slingshot twang recoil vibration
        const dist = Math.hypot(stretch.x, stretch.y);
        this.slingRecoil = {
            startTime: performance.now(),
            power: Math.min(1.0, dist / MAX_STRETCH)
        };

        // Reset previous shot's reference trail and start recording this shot's clean pre-impact arc
        this.flightPathTrail = [{
            x: launchedBird.position.x,
            y: launchedBird.position.y,
            kind: 'dot',
            step: 0
        }];

        // Terence Ground Quake sound on launch
        if (launchedBird.customData.birdType === 'terence') {
            window.soundFX.playEarthquake();
            this.addCameraShake(7);
        }

        // Wait 1.0s before queuing and hopping the next bird onto the slingshot!
        this.scheduleNextBirdEntrance(1000);
    }

    scheduleNextBirdEntrance(delayMs = 1000) {
        if (this.birdsQueue.length === 0 || this.state === 'VICTORY_SETTLING' || this.state === 'WON') {
            this.updateBirdsInventoryUI();
            return;
        }

        const candidateType = this.birdsQueue[0];
        const startX = SLING_POS.x - 92; // Positioned neatly at the foot of the slingshot hillock!
        const startY = GROUND_Y - 12;

        this.birdEntranceState = {
            phase: 'waiting', // 'waiting' -> 'anticipating' -> 'hopping' -> 'landing'
            birdType: candidateType,
            queueStartTime: performance.now(),
            delayMs: delayMs,
            jumpStartTime: performance.now() + delayMs,
            jumpDuration: 540, // 540ms high graceful arc up onto the hillock slingshot
            startX: startX,
            startY: startY,
            targetX: SLING_POS.x,
            targetY: SLING_POS.y,
            groundShift: 0
        };
    }

    triggerBirdAbility(specificBird = null) {
        const bird = specificBird || this.activeFlyingBirds[this.activeFlyingBirds.length - 1];
        if (!bird || !bird.customData || !bird.customData.inFlight || bird.customData.abilityUsed || bird.customData.collided) {
            return;
        }

        const bData = bird.customData;
        // Authentic Angry Birds: Red and Terence have NO active mid-air tap skill!
        if (!ACTIVE_ABILITY_BIRDS.has(bData.birdType)) {
            return;
        }

        bData.abilityUsed = true;
        const pos = bird.position;
        const vel = bird.velocity;

        // Mark ability activation ring on persistent sky reference trail
        this.flightPathTrail.push({
            x: pos.x,
            y: pos.y,
            kind: 'ability',
            birdType: bData.birdType
        });

        if (bData.birdType === 'yellow') {
            // Chuck Super Sonic Dash: sharp forward burst calibrated to slice through wood!
            window.soundFX.playDash();
            this.addCameraShake(4);
            let dir = Vector.normalise(vel);
            if (Vector.magnitude(vel) < 0.3) dir = { x: 1, y: -0.15 };
            Body.setVelocity(bird, Vector.mult(dir, 13.8));
            this.createSparks(pos.x, pos.y, '#fde047', 22);

        } else if (bData.birdType === 'blue') {
            // The Blues Triple Split into 3 ice-shattering projectiles!
            window.soundFX.playSplit();
            const curVel = Vector.mult(bird.velocity, 1.06);
            Body.setVelocity(bird, curVel);
            const r = bData.radius;

            // Spawn Upper & Lower Blue birds
            [-0.18, 0.18].forEach(angOffset => {
                const rotVel = Vector.rotate(curVel, angOffset);
                const clone = Bodies.circle(pos.x, pos.y, r, {
                    density: bird.density,
                    friction: 0.7,
                    restitution: 0.4,
                    frictionAir: BIRD_AIR_FRICTION,
                    label: 'bird',
                    customData: {
                        type: 'bird',
                        birdType: 'blue',
                        radius: r,
                        inFlight: true,
                        abilityUsed: true,
                        collided: false,
                        launchTime: performance.now(),
                        lastTrailPos: { x: pos.x, y: pos.y },
                        trailCount: bData.trailCount || 1
                    }
                });
                Body.setVelocity(clone, rotVel);
                Composite.add(this.world, clone);
                this.activeFlyingBirds.push(clone);
            });
            this.createSparks(pos.x, pos.y, '#38bdf8', 18);

        } else if (bData.birdType === 'bomb') {
            // Instant Shockwave Blast!
            if (bData.detonateTimer) clearTimeout(bData.detonateTimer);
            this.detonateBomb(bird);

        } else if (bData.birdType === 'matilda') {
            // Matilda Drops Egg Bomb & Jet Rockets Upward!
            window.soundFX.playEggDrop();
            this.addCameraShake(5);

            // Spawn explosive egg
            const egg = Bodies.circle(pos.x, pos.y + 18, 14, {
                density: 0.005,
                restitution: 0.1,
                label: 'eggbomb',
                customData: {
                    type: 'eggbomb',
                    radius: 14,
                    exploded: false
                }
            });
            Body.setVelocity(egg, { x: vel.x * 0.18, y: Math.max(6.2, vel.y + 5.8) });
            Composite.add(this.world, egg);
            this.blocks.push(egg);

            // Matilda jet recoil boost (launches upward & forward!)
            Body.setVelocity(bird, { x: vel.x * 0.92 + 1.8, y: -7.2 });
            this.createExplosionSmoke(pos.x, pos.y + 15, '#fef08a', 15);
        }
    }

    scheduleNextBirdCheck() {
        this.checkDefeatCondition();
    }

    checkDefeatCondition() {
        if (this.state === 'WON' || this.state === 'LOST' || this.state === 'VICTORY_SETTLING') return;

        // Check win first if last pig died
        if (this.pigs.length === 0) {
            this.checkWinLoss();
            return;
        }

        // If birds remain in queue, entrance anim active, or ready on sling, cannot lose yet
        if (this.birdsQueue.length > 0 || this.currentBird || this.birdEntranceState) {
            return;
        }

        // If there are still active projectiles flying or bouncing
        if (this.activeFlyingBirds.length > 0) {
            return;
        }

        // Wait if falling rubble, rolling boulders, or egg bombs are still moving fast!
        const hasMovingRubble = this.blocks.some(b => !b.isStatic && Math.hypot(b.velocity.x, b.velocity.y) > 0.75) ||
                                this.pigs.some(p => Math.hypot(p.velocity.x, p.velocity.y) > 0.75);
        if (hasMovingRubble) {
            return;
        }

        // All birds used, all motion ceased, and pigs survived!
        if (this.pigs.length > 0) {
            this.state = 'LOST';
            window.soundFX.playLose();
            this.addTimer(() => {
                if (this.state === 'LOST') {
                    this.showGameOverModal(false);
                }
            }, 900);
        }
    }

    computeStarsForScore(score) {
        const levelData = window.GAME_LEVELS[this.currentLevelIndex];
        const par = levelData?.parScore || 30000;
        if (score >= par) return 3;
        if (score >= Math.round(par * 0.72)) return 2;
        return 1;
    }

    checkWinLoss() {
        if (this.pigs.length === 0 && this.state !== 'WON' && this.state !== 'VICTORY_SETTLING') {
            this.state = 'VICTORY_SETTLING';
            this.isDraggingSling = false;

            // Let collapsing fortress rubble finish shattering for 950ms, then pop each unused bird for +10,000!
            this.addTimer(() => {
                if (this.state !== 'VICTORY_SETTLING') return;

                // Gather every remaining unused bird & its world position for classic +10,000 celebration!
                const bonusBirds = [];
                if (this.currentBird) {
                    bonusBirds.push({
                        birdType: this.currentBird.customData.birdType,
                        x: this.currentBird.position.x,
                        y: this.currentBird.position.y,
                        clearCurrent: true
                    });
                }
                if (this.birdEntranceState) {
                    bonusBirds.push({
                        birdType: this.birdEntranceState.birdType,
                        x: this.birdEntranceState.startX,
                        y: this.birdEntranceState.startY - 18,
                        clearEntrance: true
                    });
                    // Note: if phase was 'waiting'/'anticipating', birdsQueue[0] IS birdEntranceState.birdType!
                    const remainingQueue = (this.birdEntranceState.phase === 'waiting' || this.birdEntranceState.phase === 'anticipating')
                        ? this.birdsQueue.slice(1)
                        : this.birdsQueue.slice(0);
                    remainingQueue.forEach((bType, idx) => {
                        bonusBirds.push({
                            birdType: bType,
                            x: (SLING_POS.x - 92) - (idx + 1) * 44,
                            y: GROUND_Y - 28,
                            popQueue: true
                        });
                    });
                } else {
                    this.birdsQueue.forEach((bType, idx) => {
                        bonusBirds.push({
                            birdType: bType,
                            x: (SLING_POS.x - 92) - idx * 44,
                            y: GROUND_Y - 28,
                            popQueue: true
                        });
                    });
                }

                // Staggered +10,000 unused bird celebration pops!
                bonusBirds.forEach((info, i) => {
                    this.addTimer(() => {
                        if (info.clearCurrent && this.currentBird) {
                            Composite.remove(this.world, this.currentBird);
                            this.currentBird = null;
                        }
                        if (info.clearEntrance) {
                            if (this.birdEntranceState && (this.birdEntranceState.phase === 'waiting' || this.birdEntranceState.phase === 'anticipating')) {
                                this.birdsQueue.shift();
                            }
                            this.birdEntranceState = null;
                        }
                        if (info.popQueue && this.birdsQueue.length > 0) {
                            this.birdsQueue.shift();
                        }
                        this.updateBirdsInventoryUI();

                        const fColor = info.birdType === 'yellow' ? '#facc15' :
                                       info.birdType === 'blue' ? '#38bdf8' :
                                       info.birdType === 'bomb' ? '#334155' :
                                       info.birdType === 'matilda' ? '#f8fafc' : '#ef4444';
                        for (let f = 0; f < 6; f++) {
                            this.createFeather(info.x + (Math.random() - 0.5) * 20, info.y - 10, fColor);
                        }
                        this.createSparks(info.x, info.y, '#fde047', 10);
                        if (window.soundFX?.playBirdHop) window.soundFX.playBirdHop();

                        this.addScore(10000, info.x, info.y);
                        this.createScorePopup('+10000', info.x, info.y - 24, '#4ade80');
                    }, i * 260);
                });

                const finishDelay = bonusBirds.length * 260 + 650;
                this.addTimer(() => {
                    this.state = 'WON';
                    window.soundFX.playWin();
                    const stars = this.computeStarsForScore(this.levelScore);
                    this.starsUnlocked[this.currentLevelIndex] = Math.max(this.starsUnlocked[this.currentLevelIndex] || 0, stars);

                    // Unlock next sequential level
                    const nextIdx = this.currentLevelIndex + 1;
                    if (window.GAME_LEVELS && nextIdx < window.GAME_LEVELS.length && !this.unlockedLevels.includes(nextIdx)) {
                        this.unlockedLevels.push(nextIdx);
                        if (window.soundFX?.playLevelUnlock) window.soundFX.playLevelUnlock();
                    }

                    this.saveProgress();
                    this.showGameOverModal(true, stars);
                }, finishDelay);
            }, 950);

            return true;
        }
        return false;
    }

    addScore(points, x, y) {
        this.score += points;
        this.levelScore += points;

        const best = this.highScores[this.currentLevelIndex] || 0;
        if (this.levelScore > best) {
            this.highScores[this.currentLevelIndex] = this.levelScore;
            this.saveProgress();
        }

        this.updateHUD();
    }

    triggerEarthquake() {
        // Mighty Quake power-up
        window.soundFX.playEarthquake();
        this.addCameraShake(24);
        this.triggerSlowMo(0.3, 800);
        this.blocks.forEach(b => {
            if (!b.isStatic) {
                Body.applyForce(b, b.position, {
                    x: (Math.random() - 0.5) * 0.05 * b.mass,
                    y: -0.06 * b.mass
                });
            }
        });
        this.pigs.forEach(p => {
            p.customData.hp -= 45;
            if (p.customData.hp <= 0 && !p.customData.dead) {
                this.destroyPig(p);
            }
        });
    }

    // =========================================================================
    // VISUAL PARTICLES & VFX
    // =========================================================================
    createFireball(x, y, radius) {
        // Shockwave ring
        this.debrisEffects.push({
            type: 'ring',
            x, y,
            radius: 10,
            maxRadius: radius,
            alpha: 1.0,
            color: '#f97316'
        });

        // Fire & smoke particles
        for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 9;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - 2,
                radius: 4 + Math.random() * 8,
                color: i % 2 === 0 ? '#ef4444' : '#facc15',
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.025
            });
        }
    }

    createExplosionSmoke(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 1.5 + Math.random() * 6;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - 1,
                radius: 3 + Math.random() * 6,
                color,
                alpha: 0.95,
                decay: 0.022 + Math.random() * 0.02
            });
        }
    }

    createSparks(x, y, color, count = 6) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                radius: 2 + Math.random() * 3,
                color,
                alpha: 1.0,
                decay: 0.035 + Math.random() * 0.03
            });
        }
    }

    spawnHelmetDebris(x, y) {
        this.createSparks(x, y, '#94a3b8', 10);
        this.particles.push({
            type: 'helmet',
            x,
            y,
            vx: -2.5 + Math.random() * 5,
            vy: -5.8 - Math.random() * 2,
            radius: 22,
            angle: 0,
            vRot: (Math.random() > 0.5 ? 1 : -1) * 0.22,
            alpha: 1.0,
            decay: 0.012,
            gravity: 0.22
        });
        this.createScorePopup('钢盔击飞!', x, y - 24, '#cbd5e1');
    }

    createScorePopup(text, x, y, color = '#fef08a') {
        this.floatingTexts.push({
            text, x, y,
            alpha: 1.0,
            color,
            vy: -1.5
        });
    }

    addCameraShake(amount) {
        if (this.settings && this.settings.screenShake === false) return;
        this.camera.shake = Math.min(30, this.camera.shake + amount);
    }

    triggerSlowMo(scale, durationMs) {
        this.targetTimeScale = scale;
        this.addTimer(() => {
            this.targetTimeScale = 1.0;
        }, durationMs);
    }

    // =========================================================================
    // INPUT LISTENERS & SLINGSHOT CONTROLS
    // =========================================================================
    setupInputListeners() {
        const toWorldCoords = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            const screenX = (clientX - rect.left) * (this.canvas.width / rect.width);
            const screenY = (clientY - rect.top) * (this.canvas.height / rect.height);

            // Invert camera transform
            const worldX = (screenX / this.camera.zoom) + this.camera.x;
            const worldY = (screenY / this.camera.zoom) + this.camera.y;
            return { screenX, screenY, worldX, worldY };
        };

        const onDown = (e) => {
            window.soundFX.init();
            if (this.state === 'VICTORY_SETTLING' || this.state === 'WON' || this.state === 'LOST') return;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const coords = toWorldCoords(clientX, clientY);

            this.mouse.isDown = true;
            this.mouse.worldX = coords.worldX;
            this.mouse.worldY = coords.worldY;

            // 1. Priority: if an active flying bird WITH an authentic tap ability is mid-air before collision, trigger it!
            const canTriggerBird = this.activeFlyingBirds.find(b =>
                b.customData &&
                b.customData.inFlight &&
                ACTIVE_ABILITY_BIRDS.has(b.customData.birdType) &&
                !b.customData.abilityUsed &&
                !b.customData.collided &&
                !b.customData.exploded
            );

            // Still allow grabbing the slingshot directly if next bird is already on the sling and user clicked right on the sling
            if (this.currentBird) {
                const distToBird = Math.hypot(coords.worldX - this.currentBird.position.x, coords.worldY - this.currentBird.position.y);
                const distToSling = Math.hypot(coords.worldX - SLING_POS.x, coords.worldY - SLING_POS.y);

                if (distToBird < 85 || distToSling < 90) {
                    this.state = 'DRAGGING';
                    this.isDraggingSling = true;
                    this.timeScale = 1.0;
                    this.targetTimeScale = 1.0;
                    this.lastStretchDist = 0;
                    this.lastStretchTime = performance.now();
                    window.soundFX.playStretch(0.3);
                    return;
                }
            }

            if (canTriggerBird) {
                this.triggerBirdAbility(canTriggerBird);
                return;
            }

            // Otherwise, pan screen overview
            this.isPanningCamera = true;
            this.panStartX = clientX;
            this.camStartX = this.camera.targetX;
        };

        const onMove = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const coords = toWorldCoords(clientX, clientY);

            this.mouse.worldX = coords.worldX;
            this.mouse.worldY = coords.worldY;

            if (this.isDraggingSling && this.currentBird) {
                let dragVec = {
                    x: coords.worldX - SLING_POS.x,
                    y: coords.worldY - SLING_POS.y
                };

                const dist = Math.hypot(dragVec.x, dragVec.y);
                if (dist > MAX_STRETCH) {
                    const factor = MAX_STRETCH / dist;
                    dragVec.x *= factor;
                    dragVec.y *= factor;
                }

                // Prevent dragging the bird below ground surface (makes high mortar angles effortless!)
                const birdR = this.currentBird.customData?.radius || 18;
                const maxDragY = (GROUND_Y - birdR - 4) - SLING_POS.y;
                if (dragVec.y > maxDragY) {
                    dragVec.y = maxDragY;
                }

                Body.setPosition(this.currentBird, {
                    x: SLING_POS.x + dragVec.x,
                    y: SLING_POS.y + dragVec.y
                });

                // Throttled rubber creak audio
                const clampedDist = Math.hypot(dragVec.x, dragVec.y);
                if (Math.abs(clampedDist - this.lastStretchDist) > 18 && (performance.now() - this.lastStretchTime > 120)) {
                    window.soundFX.playStretch(clampedDist / MAX_STRETCH);
                    this.lastStretchTime = performance.now();
                    this.lastStretchDist = clampedDist;
                }
            } else if (this.isPanningCamera) {
                const dx = (clientX - this.panStartX) / this.camera.zoom;
                this.camera.targetX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, this.camStartX - dx));
            }
        };

        const onUp = () => {
            this.isPanningCamera = false;
            if (this.isDraggingSling && this.currentBird) {
                this.isDraggingSling = false;
                this.mouse.isDown = false;
                const stretch = Vector.sub(SLING_POS, this.currentBird.position);
                const dist = Math.hypot(stretch.x, stretch.y);

                // Authentic cancel zone: only fire if pulled meaningfully backward (stretch.x > 10 && dist > 20)
                if (dist > 20 && stretch.x > 10) {
                    this.launchBird();
                } else {
                    // Gently snap bird back to slingshot pouch without wasting ammo
                    Body.setPosition(this.currentBird, SLING_POS);
                    this.slingBounce = { startTime: performance.now(), amplitude: 5 };
                    this.state = 'AIMING';
                }
            }
        };

        this.canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        this.canvas.addEventListener('touchstart', onDown, { passive: true });
        window.addEventListener('touchmove', onMove, { passive: true });
        window.addEventListener('touchend', onUp);

        // Desktop Keyboard Shortcuts: Space = Trigger Mid-Air Ability, R = Quick Restart Level
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                const canTriggerBird = this.activeFlyingBirds.find(b =>
                    b.customData &&
                    b.customData.inFlight &&
                    ACTIVE_ABILITY_BIRDS.has(b.customData.birdType) &&
                    !b.customData.abilityUsed &&
                    !b.customData.collided &&
                    !b.customData.exploded
                );
                if (canTriggerBird) {
                    e.preventDefault();
                    this.triggerBirdAbility(canTriggerBird);
                }
            } else if (e.key === 'r' || e.key === 'R') {
                this.loadLevel(this.currentLevelIndex);
            }
        });
    }

    setupUI() {
        // Navigation links
        const arcadeBtn = document.getElementById('arcadeLobbyBtn');
        if (arcadeBtn) {
            if (window.location.pathname.includes('/games/arcade/angry-birds')) {
                arcadeBtn.href = '/games/arcade/';
            } else if (window.location.pathname.includes('angry-birds')) {
                arcadeBtn.href = '../';
            } else {
                arcadeBtn.href = './arcade/index.html';
            }
        }
        const badgeBtn = document.getElementById('badgePortalBtn');
        if (badgeBtn) {
            badgeBtn.href = window.location.origin.includes('39.97.50.218') ? '/' : 'https://39.97.50.218:8080/';
        }

        // Initial HUD button states
        const soundBtn = document.getElementById('soundBtn');
        if (soundBtn) soundBtn.innerText = this.settings.sfxEnabled ? '🔊 音效: 开' : '🔇 音效: 关';
        const bgmBtn = document.getElementById('bgmBtn');
        if (bgmBtn) {
            bgmBtn.innerText = this.settings.bgmEnabled ? '🎵 音乐: 开' : '🎵 音乐: 关';
            bgmBtn.classList.toggle('active', this.settings.bgmEnabled);
        }

        // Restart button
        document.getElementById('restartBtn')?.addEventListener('click', () => {
            if (window.soundFX?.playClick) window.soundFX.playClick();
            this.loadLevel(this.currentLevelIndex);
        });

        // Sound SFX button
        soundBtn?.addEventListener('click', (e) => {
            this.settings.sfxEnabled = window.soundFX.toggle();
            e.currentTarget.innerText = this.settings.sfxEnabled ? '🔊 音效: 开' : '🔇 音效: 关';
            this.saveProgress();
        });

        // BGM Music button
        bgmBtn?.addEventListener('click', (e) => {
            this.settings.bgmEnabled = window.soundFX.toggleBGM();
            e.currentTarget.innerText = this.settings.bgmEnabled ? '🎵 音乐: 开' : '🎵 音乐: 关';
            e.currentTarget.classList.toggle('active', this.settings.bgmEnabled);
            this.saveProgress();
        });

        // King Sling power-up button
        document.getElementById('kingSlingBtn')?.addEventListener('click', (e) => {
            this.kingSlingActive = !this.kingSlingActive;
            e.currentTarget.classList.toggle('active', this.kingSlingActive);
            e.currentTarget.innerText = this.kingSlingActive ? '👑 黄金弹弓: 激活' : '👑 黄金弹弓';
            window.soundFX.playWin();
        });

        // Mighty Quake power-up button
        document.getElementById('earthquakeBtn')?.addEventListener('click', () => {
            this.triggerEarthquake();
        });

        // View Mode toggle button
        document.getElementById('viewModeBtn')?.addEventListener('click', (e) => {
            this.camera.mode = this.camera.mode === 'wide' ? 'close' : 'wide';
            const isWide = this.camera.mode === 'wide';
            e.currentTarget.innerText = isWide ? '🔍 视角: 全景' : '🎯 视角: 特写';
            e.currentTarget.classList.toggle('active', !isWide);
            this.camera.targetZoom = isWide ? 0.74 : 0.90;
            if (isWide) {
                this.camera.targetX = 20;
                this.camera.targetY = -20;
            }
        });

        // Level Select button
        document.getElementById('levelSelectBtn')?.addEventListener('click', () => {
            this.showLevelSelectModal();
        });
        document.getElementById('closeLevelSelectBtn')?.addEventListener('click', () => {
            this.hideModal();
        });

        // Settings modal button & close
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.showSettingsModal();
        });
        document.getElementById('closeSettingsBtn')?.addEventListener('click', () => {
            this.hideModal();
        });

        // Settings Controls Binding
        document.getElementById('sfxVolumeSlider')?.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            this.settings.sfxVolume = val / 100;
            window.soundFX?.setSFXVolume(this.settings.sfxVolume);
            const numEl = document.getElementById('sfxVolumeText');
            if (numEl) numEl.innerText = `${val}%`;
            this.saveProgress();
        });

        document.getElementById('bgmVolumeSlider')?.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            this.settings.bgmVolume = val / 100;
            window.soundFX?.setBGMVolume(this.settings.bgmVolume);
            const numEl = document.getElementById('bgmVolumeText');
            if (numEl) numEl.innerText = `${val}%`;
            this.saveProgress();
        });

        document.getElementById('sfxToggleBtn')?.addEventListener('click', (e) => {
            this.settings.sfxEnabled = !this.settings.sfxEnabled;
            window.soundFX?.setEnabled(this.settings.sfxEnabled);
            e.currentTarget.innerText = this.settings.sfxEnabled ? '开' : '关';
            e.currentTarget.classList.toggle('active', this.settings.sfxEnabled);
            const mainSoundBtn = document.getElementById('soundBtn');
            if (mainSoundBtn) mainSoundBtn.innerText = this.settings.sfxEnabled ? '🔊 音效: 开' : '🔇 音效: 关';
            this.saveProgress();
        });

        document.getElementById('bgmToggleBtn')?.addEventListener('click', (e) => {
            this.settings.bgmEnabled = !this.settings.bgmEnabled;
            window.soundFX?.setBGMEnabled(this.settings.bgmEnabled);
            e.currentTarget.innerText = this.settings.bgmEnabled ? '开' : '关';
            e.currentTarget.classList.toggle('active', this.settings.bgmEnabled);
            const mainBgmBtn = document.getElementById('bgmBtn');
            if (mainBgmBtn) {
                mainBgmBtn.innerText = this.settings.bgmEnabled ? '🎵 音乐: 开' : '🎵 音乐: 关';
                mainBgmBtn.classList.toggle('active', this.settings.bgmEnabled);
            }
            this.saveProgress();
        });

        document.getElementById('trajectoryToggleBtn')?.addEventListener('click', (e) => {
            this.settings.trajectoryGuide = this.settings.trajectoryGuide === false ? true : false;
            e.currentTarget.innerText = this.settings.trajectoryGuide ? '开启' : '关闭';
            e.currentTarget.classList.toggle('active', this.settings.trajectoryGuide);
            this.saveProgress();
        });

        document.getElementById('screenShakeToggleBtn')?.addEventListener('click', (e) => {
            this.settings.screenShake = this.settings.screenShake === false ? true : false;
            e.currentTarget.innerText = this.settings.screenShake ? '开启' : '关闭';
            e.currentTarget.classList.toggle('active', this.settings.screenShake);
            this.saveProgress();
        });

        document.getElementById('resetSaveDataBtn')?.addEventListener('click', () => {
            if (confirm('确定要清除所有关卡解锁进度、通关星星与历史最高分吗？此操作无法撤销！')) {
                this.saveData = SaveManager.reset();
                this.currentLevelIndex = 0;
                this.unlockedLevels = [0];
                this.highScores = {};
                this.starsUnlocked = {};
                this.settings = this.saveData.settings;
                this.hideModal();
                this.loadLevel(0);
            }
        });

        // Modal Action buttons
        document.getElementById('modalBtn')?.addEventListener('click', () => {
            if (this.state === 'WON') {
                if (this.currentLevelIndex < window.GAME_LEVELS.length - 1) {
                    this.loadLevel(this.currentLevelIndex + 1);
                } else {
                    this.loadLevel(0);
                }
            } else {
                this.loadLevel(this.currentLevelIndex);
            }
        });

        document.getElementById('modalRetryBtn')?.addEventListener('click', () => {
            this.hideModal();
            this.loadLevel(this.currentLevelIndex);
        });

        document.getElementById('modalSelectBtn')?.addEventListener('click', () => {
            this.hideModal();
            this.showLevelSelectModal();
        });
    }

    updateHUD() {
        const levelData = window.GAME_LEVELS[this.currentLevelIndex];
        const worldData = window.GAME_WORLDS.find(w => w.id === levelData.world);

        const lvlEl = document.getElementById('currentLevel');
        if (lvlEl) {
            lvlEl.innerText = levelData.name;
            lvlEl.style.background = worldData ? worldData.accent : '#f1c40f';
        }

        const scoreEl = document.getElementById('currentScore');
        if (scoreEl) scoreEl.innerText = this.levelScore;

        const bestEl = document.getElementById('highScore');
        if (bestEl) bestEl.innerText = this.highScores[this.currentLevelIndex] || 0;

        const subEl = document.getElementById('levelSubtitle');
        if (subEl) subEl.innerText = levelData.subtitle;

        // Live 3-Star Progress Bar on HUD
        const par = levelData?.parScore || 30000;
        const pct = Math.min(100, Math.round((this.levelScore / par) * 100));
        const fillEl = document.getElementById('starProgressFill');
        if (fillEl) fillEl.style.width = `${pct}%`;

        const hudStarsEl = document.getElementById('hudStars');
        if (hudStarsEl) {
            const earned = this.levelScore <= 0 ? 0 : (this.levelScore >= par ? 3 : this.levelScore >= Math.round(par * 0.72) ? 2 : 1);
            hudStarsEl.innerText = '⭐'.repeat(earned) + '☆'.repeat(3 - earned);
        }
    }

    updateBirdsInventoryUI() {
        const queueContainer = document.getElementById('birdsQueue');
        if (!queueContainer) return;
        queueContainer.innerHTML = '';

        if (this.currentBird) {
            const activeEl = document.createElement('div');
            activeEl.className = `bird-pill ${this.currentBird.customData.birdType} active`;
            activeEl.innerText = this.getBirdDisplayName(this.currentBird.customData.birdType);
            queueContainer.appendChild(activeEl);
        }

        this.birdsQueue.forEach(type => {
            const pill = document.createElement('div');
            pill.className = `bird-pill ${type}`;
            pill.innerText = this.getBirdDisplayName(type);
            queueContainer.appendChild(pill);
        });
    }

    getBirdDisplayName(type) {
        const map = {
            red: '怒红鸟',
            yellow: '飞镖黄',
            blue: '蓝弟弟',
            bomb: '炸弹黑',
            matilda: '白公主',
            terence: '泰伦斯'
        };
        return map[type] || type.toUpperCase();
    }

    showGameOverModal(won, stars = 1) {
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('modalTitle');
        const desc = document.getElementById('modalDesc');
        const starsEl = document.getElementById('modalStars');
        const btn = document.getElementById('modalBtn');
        const recordTag = document.getElementById('modalRecordTag');
        if (!modal) return;

        modal.classList.remove('hidden');

        if (won) {
            title.innerText = '关卡大捷！';
            title.style.color = '#4ade80';
            starsEl.innerText = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
            desc.innerText = `本关得分: ${this.levelScore} | 剩余小鸟奖励已结算！`;
            btn.innerText = this.currentLevelIndex < window.GAME_LEVELS.length - 1 ? '下一关 ➔' : '重玩全套 ↻';
            if (recordTag) recordTag.innerText = '💾 进度与得分已自动保存至本地';
        } else {
            title.innerText = '挑战失败';
            title.style.color = '#ef4444';
            starsEl.innerText = '💀';
            desc.innerText = '弹药耗尽，绿猪们还在嘲笑你！再来一次？';
            btn.innerText = '重新挑战 ↻';
            if (recordTag) recordTag.innerText = '💡 提示: 优先击破承重石块与TNT';
        }
    }

    hideModal() {
        const modal = document.getElementById('gameOverModal');
        if (modal) modal.classList.add('hidden');
        const levelModal = document.getElementById('levelSelectModal');
        if (levelModal) levelModal.classList.add('hidden');
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.classList.add('hidden');
    }

    showLevelSelectModal() {
        const modal = document.getElementById('levelSelectModal');
        const tabsContainer = document.getElementById('worldTabs');
        const introTitle = document.getElementById('worldIntroTitle');
        const introDesc = document.getElementById('worldIntroDesc');
        const list = document.getElementById('levelSelectList');
        if (!modal || !list) return;

        if (window.soundFX?.playMenuOpen) window.soundFX.playMenuOpen();

        // 1. Determine active world tab
        const currentWorld = (window.GAME_LEVELS && window.GAME_LEVELS[this.currentLevelIndex])
            ? window.GAME_LEVELS[this.currentLevelIndex].world
            : 'meadow';
        if (!this.selectedWorldTab) this.selectedWorldTab = currentWorld;

        // 2. Render World Tabs
        if (tabsContainer && window.GAME_WORLDS) {
            tabsContainer.innerHTML = '';
            window.GAME_WORLDS.forEach(w => {
                const worldLevels = window.GAME_LEVELS.filter(l => l.world === w.id);
                const worldStars = worldLevels.reduce((acc, l) => {
                    const idx = window.GAME_LEVELS.indexOf(l);
                    return acc + (this.starsUnlocked[idx] || 0);
                }, 0);
                const maxStars = worldLevels.length * 3;

                const tabBtn = document.createElement('button');
                tabBtn.className = `world-tab-btn ${this.selectedWorldTab === w.id ? 'active' : ''}`;
                tabBtn.innerHTML = `
                    <span>${w.themeIcon || '🌍'} ${w.name}</span>
                    <span class="tab-stars">⭐ ${worldStars}/${maxStars}</span>
                `;
                tabBtn.addEventListener('click', () => {
                    if (window.soundFX?.playClick) window.soundFX.playClick();
                    this.selectedWorldTab = w.id;
                    this.showLevelSelectModal();
                });
                tabsContainer.appendChild(tabBtn);
            });
        }

        // 3. Update World Intro Banner
        const activeWorldObj = window.GAME_WORLDS?.find(w => w.id === this.selectedWorldTab);
        if (introTitle && activeWorldObj) introTitle.innerText = `${activeWorldObj.themeIcon || ''} ${activeWorldObj.name}`;
        if (introDesc && activeWorldObj) introDesc.innerText = activeWorldObj.description;

        // 4. Render Level Cards for Selected World
        list.innerHTML = '';
        window.GAME_LEVELS.forEach((lvl, idx) => {
            if (lvl.world !== this.selectedWorldTab) return;

            const card = document.createElement('div');
            const isUnlocked = this.unlockedLevels.includes(idx);
            const stars = this.starsUnlocked[idx] || 0;
            const starText = stars > 0 ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : (isUnlocked ? '未通关' : '未解锁');
            const world = window.GAME_WORLDS.find(w => w.id === lvl.world) || {};
            const isCurrent = idx === this.currentLevelIndex;

            card.className = `level-select-card ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}`;
            card.innerHTML = `
                <div class="lvl-head">
                    <span class="lvl-num" style="background:${world.accent || '#facc15'}">${lvl.name}</span>
                    <span class="lvl-stars">${starText}</span>
                </div>
                <div class="lvl-desc">${lvl.subtitle}</div>
                <div class="lvl-score">
                    <span>${isUnlocked ? `历史最佳: ${(this.highScores[idx] || 0).toLocaleString()}` : '<span class="lvl-lock-hint">🔒 通关前一关后解锁</span>'}</span>
                    ${isCurrent ? '<span style="color:#4ade80;font-weight:800;">[进行中]</span>' : ''}
                </div>
            `;

            if (isUnlocked) {
                card.addEventListener('click', () => {
                    if (window.soundFX?.playClick) window.soundFX.playClick();
                    this.hideModal();
                    this.loadLevel(idx);
                });
            } else {
                card.title = '该关卡尚未解锁，请先通关前置关卡！';
                card.addEventListener('click', () => {
                    if (window.soundFX?.playCancel) window.soundFX.playCancel();
                });
            }

            list.appendChild(card);
        });

        modal.classList.remove('hidden');
    }

    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        if (window.soundFX?.playMenuOpen) window.soundFX.playMenuOpen();

        // 1. Sync controls to current settings
        const sfxSlider = document.getElementById('sfxVolumeSlider');
        const sfxText = document.getElementById('sfxVolumeText');
        const sfxToggle = document.getElementById('sfxToggleBtn');
        const bgmSlider = document.getElementById('bgmVolumeSlider');
        const bgmText = document.getElementById('bgmVolumeText');
        const bgmToggle = document.getElementById('bgmToggleBtn');
        const trajToggle = document.getElementById('trajectoryToggleBtn');
        const shakeToggle = document.getElementById('screenShakeToggleBtn');

        if (sfxSlider) sfxSlider.value = Math.round(this.settings.sfxVolume * 100);
        if (sfxText) sfxText.innerText = `${Math.round(this.settings.sfxVolume * 100)}%`;
        if (sfxToggle) {
            sfxToggle.innerText = this.settings.sfxEnabled ? '开' : '关';
            sfxToggle.classList.toggle('active', this.settings.sfxEnabled);
        }

        if (bgmSlider) bgmSlider.value = Math.round(this.settings.bgmVolume * 100);
        if (bgmText) bgmText.innerText = `${Math.round(this.settings.bgmVolume * 100)}%`;
        if (bgmToggle) {
            bgmToggle.innerText = this.settings.bgmEnabled ? '开' : '关';
            bgmToggle.classList.toggle('active', this.settings.bgmEnabled);
        }

        if (trajToggle) {
            const on = this.settings.trajectoryGuide !== false;
            trajToggle.innerText = on ? '开启' : '关闭';
            trajToggle.classList.toggle('active', on);
        }

        if (shakeToggle) {
            const on = this.settings.screenShake !== false;
            shakeToggle.innerText = on ? '开启' : '关闭';
            shakeToggle.classList.toggle('active', on);
        }

        // 2. Compute Lifetime Statistics from LocalStorage
        let totalStars = 0;
        let clearedCount = 0;
        let totalScore = 0;
        const totalLevels = window.GAME_LEVELS ? window.GAME_LEVELS.length : 13;
        const maxStars = totalLevels * 3;

        Object.keys(this.starsUnlocked).forEach(k => {
            const s = this.starsUnlocked[k] || 0;
            if (s > 0) {
                totalStars += s;
                clearedCount++;
            }
        });

        Object.keys(this.highScores).forEach(k => {
            totalScore += (this.highScores[k] || 0);
        });

        const starEl = document.getElementById('statStarsCount');
        if (starEl) starEl.innerText = `${totalStars} / ${maxStars} ⭐`;

        const clearedEl = document.getElementById('statLevelsCleared');
        if (clearedEl) clearedEl.innerText = `${clearedCount} / ${totalLevels}`;

        const scoreEl = document.getElementById('statTotalScore');
        if (scoreEl) scoreEl.innerText = `${totalScore.toLocaleString()} 分`;

        modal.classList.remove('hidden');
    }

    // =========================================================================
    // MAIN GAME LOOP & DYNAMIC CAMERA
    // =========================================================================
    loop(timestamp) {
        const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        // Smooth time-scale interpolation (for matrix slow-motion effects)
        this.timeScale += (this.targetTimeScale - this.timeScale) * 0.15;

        // Update Physics
        Engine.update(this.engine, (1000 / 60) * this.timeScale);

        // Update Logic, Camera & Effects
        this.update(dt, timestamp / 1000);

        // Render Everything
        this.render(timestamp / 1000);

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt, time) {
        const now = performance.now();

        // 1. Update Next Bird Entrance Animation (1.0s delay + anticipation squash + majestic hop)
        if (this.birdEntranceState) {
            const ent = this.birdEntranceState;
            const elapsedSinceQueue = now - ent.queueStartTime;

            if (ent.phase === 'waiting') {
                if (elapsedSinceQueue >= ent.delayMs - 220) {
                    ent.phase = 'anticipating';
                    // Anticipation dust puff at feet
                    this.createSparks(ent.startX, ent.startY + 6, '#fef3c7', 4);
                }
            } else if (ent.phase === 'anticipating') {
                if (now >= ent.jumpStartTime) {
                    ent.phase = 'hopping';
                    // Shift the candidate off the queue now that it is airborne
                    const candidateType = this.birdsQueue.shift();
                    this.updateBirdsInventoryUI();
                    ent.groundShift = 44; // Remaining queue birds will glide forward 44px
                    // Jump dust burst ring & jump chirp sound
                    this.createSparks(ent.startX, ent.startY + 6, '#ffffff', 8);
                    if (window.soundFX?.playBirdHop) window.soundFX.playBirdHop();
                }
            } else if (ent.phase === 'hopping') {
                // Smoothly decay remaining ground birds shift
                ent.groundShift += (0 - ent.groundShift) * 0.14;

                const jumpElapsed = now - ent.jumpStartTime;
                if (jumpElapsed >= ent.jumpDuration) {
                    // Landed in slingshot!
                    const landedType = ent.birdType;
                    this.birdEntranceState = null;
                    this.prepareBirdOnSling(landedType);

                    // Slingshot bounce & bird squash
                    this.slingBounce = { startTime: now, amplitude: 14 };
                    this.birdLandingSquash = { startTime: now, duration: 220 };

                    if (window.soundFX?.playBounce) window.soundFX.playBounce();
                    this.createSparks(SLING_POS.x, SLING_POS.y + 10, '#ffffff', 6);
                }
            }
        }

        // 2. Update Active Flying Birds
        for (let i = this.activeFlyingBirds.length - 1; i >= 0; i--) {
            const b = this.activeFlyingBirds[i];
            const bx = b.position.x;
            const by = b.position.y;
            const vel = b.velocity;
            const speed = Math.hypot(vel.x, vel.y);
            const flightTime = performance.now() - (b.customData.launchTime || performance.now());

            // Orient bird towards velocity vector while in air before collision
            if (speed > 0.8 && !b.customData.collided) {
                const ang = Math.atan2(vel.y, vel.x);
                Body.setAngle(b, ang);
                Body.setAngularVelocity(b, 0);
            }

            // In-flight falling feathers
            if (speed > 2.0 && !b.customData.collided) {
                if (!b.customData.lastFeatherTime || now - b.customData.lastFeatherTime > 240) {
                    b.customData.lastFeatherTime = now;
                    const fColor = b.customData.birdType === 'yellow' ? '#facc15' :
                                   b.customData.birdType === 'blue' ? '#38bdf8' :
                                   b.customData.birdType === 'bomb' ? '#334155' :
                                   b.customData.birdType === 'matilda' ? '#f8fafc' : '#ef4444';
                    this.createFeather(bx, by, fColor);
                }
            }

            // Flight smoke puff trail
            if (speed > 2.2 && !b.customData.collided) {
                this.smokeTrails.push({
                    x: bx,
                    y: by,
                    radius: (b.customData.radius || 18) * 0.26,
                    alpha: 0.45
                });
            }

            // Clean pre-impact flight path record (classic Angry Birds reference dots!)
            if (!b.customData.collided) {
                const lastPt = b.customData.lastTrailPos || { x: bx, y: by };
                const trailDist = Math.hypot(bx - lastPt.x, by - lastPt.y);
                if (trailDist > 26) {
                    const stepIdx = b.customData.trailCount || 0;
                    b.customData.trailCount = stepIdx + 1;
                    b.customData.lastTrailPos = { x: bx, y: by };
                    this.flightPathTrail.push({
                        x: bx,
                        y: by,
                        kind: 'dot',
                        step: stepIdx
                    });
                }
            }

            // Expiration conditions: off-screen or settled (calibrated for slower graceful flight)
            const isOffScreen = bx > WORLD_WIDTH + 90 || bx < -90 || by > GROUND_Y + 140;
            const isStopped = speed < 0.25 && flightTime > 2600;
            const isTimeout = flightTime > 9500;

            if (isOffScreen || isStopped || isTimeout) {
                this.createSparks(bx, by, '#ffffff', 8);
                Composite.remove(this.world, b);
                this.activeFlyingBirds.splice(i, 1);
            }
        }

        // 3. Camera Framing & Panoramic Overview
        if (this.camera.mode === 'wide') {
            this.camera.targetZoom = 0.74;
            this.camera.targetY = -20;
            let impactFocus = 0;
            if (this.activeFlyingBirds.length > 0) {
                const lead = this.activeFlyingBirds[this.activeFlyingBirds.length - 1];
                if (lead && lead.position.x > 950) {
                    impactFocus = Math.min(100, (lead.position.x - 950) * 0.22);
                }
            }
            this.camera.targetX = 20 + impactFocus;
        } else {
            // Close-up cinematic follow mode
            this.camera.targetZoom = 0.90;
            if (this.activeFlyingBirds.length > 0) {
                const lead = this.activeFlyingBirds[this.activeFlyingBirds.length - 1];
                const curZoom = this.camera.zoom;
                const maxCamX = Math.max(0, WORLD_WIDTH - VIEW_WIDTH / curZoom);
                this.camera.targetX = Math.max(0, Math.min(maxCamX, lead.position.x - (VIEW_WIDTH / curZoom) * 0.45));
                this.camera.targetY = Math.max(-50, Math.min(40, lead.position.y - (VIEW_HEIGHT / curZoom) * 0.52));
            } else if (this.currentBird) {
                this.camera.targetX = 40;
                this.camera.targetY = -20;
            }
        }

        // Check if level conditions were triggered
        this.checkDefeatCondition();

        // Camera smooth dampening
        this.camera.x += (this.camera.targetX - this.camera.x) * 0.08;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.08;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.06;

        // Camera shake decay
        if (this.camera.shake > 0) {
            this.camera.shake *= 0.88;
            if (this.camera.shake < 0.2) this.camera.shake = 0;
        }

        // Update smoke trails
        for (let i = this.smokeTrails.length - 1; i >= 0; i--) {
            const st = this.smokeTrails[i];
            st.radius += 0.25;
            st.alpha -= 0.015;
            if (st.alpha <= 0) this.smokeTrails.splice(i, 1);
        }

        // Update particles with rotation, tumble & sway
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity !== undefined ? p.gravity : 0.22;
            if (p.vRot) p.angle = (p.angle || 0) + p.vRot;
            if (p.type === 'feather') {
                p.x += Math.sin((time + i) * p.swaySpeed) * p.swayAmp * 0.15;
            }
            p.alpha -= p.decay;
            if (p.alpha <= 0 || p.y > GROUND_Y + 40) this.particles.splice(i, 1);
        }

        // Update shockwave rings
        for (let i = this.debrisEffects.length - 1; i >= 0; i--) {
            const ring = this.debrisEffects[i];
            ring.radius += (ring.maxRadius - ring.radius) * 0.14;
            ring.alpha -= 0.035;
            if (ring.alpha <= 0) this.debrisEffects.splice(i, 1);
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.015;
            if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    getSlingshotVibe() {
        const now = performance.now();
        let vx = 0;
        let vy = 0;

        if (this.slingRecoil) {
            const dt = (now - this.slingRecoil.startTime) / 1000;
            if (dt < 0.65) {
                const amp = this.slingRecoil.power * Math.exp(-dt * 6.5);
                vx = Math.sin(dt * 32) * amp * 20;
                vy = Math.cos(dt * 28) * amp * 10;
            } else {
                this.slingRecoil = null;
            }
        }

        if (this.slingBounce) {
            const dt = (now - this.slingBounce.startTime) / 1000;
            if (dt < 0.45) {
                const amp = this.slingBounce.amplitude * Math.exp(-dt * 8);
                vy += Math.sin(dt * 26) * amp;
            } else {
                this.slingBounce = null;
            }
        }

        if (vx !== 0 || vy !== 0) {
            return { x: vx, y: vy };
        }
        return null;
    }

    // =========================================================================
    // RENDERING PIPELINE (Screen space -> World Space -> VFX Layer)
    // =========================================================================
    render(time) {
        const levelData = window.GAME_LEVELS[this.currentLevelIndex];
        const worldKey = levelData ? levelData.world : 'meadow';

        // 1. Draw Parallax Background (Screen space)
        window.spriteRenderer.drawWorldBackground(
            this.ctx,
            worldKey,
            this.camera,
            VIEW_WIDTH,
            VIEW_HEIGHT,
            WORLD_WIDTH,
            GROUND_Y,
            time
        );

        // 2. Begin World Space Transform (Zoom, Pan, Screen Shake)
        this.ctx.save();
        const shakeX = (Math.random() - 0.5) * this.camera.shake;
        const shakeY = (Math.random() - 0.5) * this.camera.shake;
        this.ctx.translate(shakeX, shakeY);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // 3. Draw Foreground Ground Cap & Turf BEFORE slingshot mound so hillock blends over flat turf!
        window.spriteRenderer.drawForegroundGround(this.ctx, worldKey, WORLD_WIDTH, GROUND_Y, WORLD_HEIGHT);

        // 4. Draw Persistent Flight Path Trail & Full-Arc Aim Trajectory Guide
        this.drawFlightPathTrail();

        // 5. Back Slingshot Stand, Launcher Hillock & Rear Elastic Band
        const vibe = this.getSlingshotVibe();
        let pullPos = null;
        let slingBirdRadius = 18;

        if (this.isDraggingSling && this.currentBird) {
            pullPos = this.currentBird.position;
            slingBirdRadius = this.currentBird.customData?.radius || 18;
        } else if (this.currentBird && this.state === 'AIMING') {
            pullPos = vibe ? { x: SLING_POS.x + vibe.x, y: SLING_POS.y + vibe.y } : SLING_POS;
            slingBirdRadius = this.currentBird.customData?.radius || 18;
        } else if (vibe) {
            // Elastic snap recoil after bird launch
            pullPos = { x: SLING_POS.x + vibe.x, y: SLING_POS.y + vibe.y };
            slingBirdRadius = 0;
        }

        window.spriteRenderer.drawSlingshotBack(
            this.ctx,
            SLING_POS,
            GROUND_Y,
            pullPos,
            this.kingSlingActive,
            worldKey,
            MAX_STRETCH
        );

        // 6. Physics Entities (Chains, Blocks, Roofs, TNT, Boulders)
        window.spriteRenderer.drawPendulumAndChains(this.ctx, this.constraints);

        this.blocks.forEach(b => {
            if (b.customData?.type === 'eggbomb') {
                window.spriteRenderer.drawEggBomb(this.ctx, b);
            } else if (b.customData?.type === 'wreckingball') {
                window.spriteRenderer.drawWreckingBall(this.ctx, b);
            } else {
                window.spriteRenderer.drawBlock(this.ctx, b);
            }
        });

        this.tnts.forEach(t => window.spriteRenderer.drawTNT(this.ctx, t));
        this.bouncyPads.forEach(pad => window.spriteRenderer.drawBouncyPad(this.ctx, pad, time));

        // 7. Green Pigs (With real-time threat detection towards incoming birds!)
        const leadBird = this.activeFlyingBirds[0] || (this.isDraggingSling ? this.currentBird : null);
        const threatPos = leadBird ? leadBird.position : null;
        const isFast = leadBird ? Math.hypot(leadBird.velocity.x, leadBird.velocity.y) > 3.2 : false;

        this.pigs.forEach(p => window.spriteRenderer.drawPig(this.ctx, p, threatPos, isFast, time));

        // 8. Draw Full-Arc Aiming Trajectory ON TOP of background/fortress so reticle & dots are crystal clear!
        if (this.isDraggingSling && this.currentBird) {
            this.drawTrajectoryDots(time);
        }

        // 9. Smoke Trails
        this.drawSmokeTrails();

        // 10. Active Flying Birds
        this.activeFlyingBirds.forEach(b => {
            window.spriteRenderer.drawBird(this.ctx, b, time, 'flying');
        });

        // 11. Current Slingshot Bird, Hopping Bird & Reserve Queue
        if (this.currentBird) {
            let customScale = null;
            if (this.birdLandingSquash) {
                const sqElapsed = performance.now() - this.birdLandingSquash.startTime;
                if (sqElapsed < this.birdLandingSquash.duration) {
                    const p = sqElapsed / this.birdLandingSquash.duration;
                    const sq = Math.sin(p * Math.PI) * (1 - p) * 0.32;
                    customScale = { x: 1 + sq, y: 1 - sq };
                } else {
                    this.birdLandingSquash = null;
                }
            }
            window.spriteRenderer.drawBird(this.ctx, this.currentBird, time, this.isDraggingSling ? 'dragging' : 'idle', customScale);
        }
        this.drawHoppingBird(time);
        this.drawReserveBirdsOnGround(time);

        // 12. Front Slingshot Fork Prong & Near Elastic Band (True 3D Fork Depth!)
        window.spriteRenderer.drawSlingshotFront(
            this.ctx,
            SLING_POS,
            pullPos,
            slingBirdRadius,
            this.kingSlingActive
        );

        // 13. Debris, Particles & Floating Score Text
        this.drawShockwaveRings();
        this.drawParticles();
        this.drawFloatingScores();

        this.ctx.restore();

        // 14. Screen-Space Ability Hints (Only for Chuck / Blues / Bomb / Matilda!)
        this.drawScreenHints();
    }

    drawFlightPathTrail() {
        if (!this.flightPathTrail || this.flightPathTrail.length < 2) return;
        this.ctx.save();
        this.flightPathTrail.forEach((pt, i) => {
            if (pt.kind === 'ability') {
                // Mid-air ability activation burst ring (classic Angry Birds cloud/star marker)
                this.ctx.strokeStyle = '#0f172a';
                this.ctx.lineWidth = 3.5;
                this.ctx.beginPath();
                this.ctx.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
                this.ctx.stroke();

                this.ctx.strokeStyle = '#fde047';
                this.ctx.lineWidth = 2.2;
                this.ctx.beginPath();
                this.ctx.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
                this.ctx.stroke();
                return;
            }

            // Classic alternating large & small white puff dots with crisp dark outlines
            const stepNum = pt.step !== undefined ? pt.step : i;
            const r = (stepNum % 2 === 0) ? 4.4 : 2.8;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
            this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.62)';
            this.ctx.lineWidth = 1.6;
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });
        this.ctx.restore();
    }

    drawTrajectoryDots(time = 0) {
        if (!this.currentBird) return;
        if (this.settings && this.settings.trajectoryGuide === false) return;

        const stretch = Vector.sub(SLING_POS, this.currentBird.position);
        const dist = Math.hypot(stretch.x, stretch.y);

        // If inside safe cancel zone or pulled forward, show gentle cancel indicator
        if (dist <= 20 || stretch.x <= 10) {
            if (dist > 5) {
                this.ctx.save();
                this.ctx.font = '800 16px "Fredoka", sans-serif';
                this.ctx.fillStyle = '#cbd5e1';
                this.ctx.strokeStyle = '#0f172a';
                this.ctx.lineWidth = 3.5;
                this.ctx.textAlign = 'center';
                this.ctx.strokeText('↺ 松手取消发射', SLING_POS.x, SLING_POS.y - 54);
                this.ctx.fillText('↺ 松手取消发射', SLING_POS.x, SLING_POS.y - 54);
                this.ctx.restore();
            }
            return;
        }

        // Exact machine-precision Matter.js integration (matches real bird flight to < 0.001px!)
        const speedFactor = this.kingSlingActive ? LAUNCH_SPEED_KING : LAUNCH_SPEED_NORMAL;
        let vx = stretch.x * speedFactor;
        let vy = stretch.y * speedFactor;
        let simX = this.currentBird.position.x;
        let simY = this.currentBird.position.y;

        const dt = 1000 / 60;
        const gStep = WORLD_GRAVITY_Y * 0.001 * dt * dt;
        const airMul = 1 - BIRD_AIR_FRICTION;
        const birdR = this.currentBird.customData?.radius || 18;
        const hitProbeR = birdR * 0.58;

        const obstacles = [
            ...this.blocks,
            ...this.pigs,
            ...this.tnts,
            ...this.bouncyPads
        ];

        const pathPoints = [{ x: simX, y: simY }];
        const dotPoints = [];
        let impactPt = null;
        let hitTargetType = null;
        const maxSteps = 340;

        for (let i = 1; i <= maxSteps; i++) {
            vx = vx * airMul;
            vy = vy * airMul + gStep;
            simX += vx;
            simY += vy;

            pathPoints.push({ x: simX, y: simY });

            if (i >= 3 && i % 4 === 0) {
                dotPoints.push({ x: simX, y: simY, step: i });
            }

            // 1. Check Ground Impact
            if (simY + hitProbeR >= GROUND_Y) {
                impactPt = { x: simX, y: GROUND_Y - 2 };
                hitTargetType = 'ground';
                break;
            }

            // 2. Check Structure / Pig / TNT / BouncyPad Impact
            if (i >= 4 && simX > SLING_POS.x + 35) {
                const candidates = Query.region(obstacles, {
                    min: { x: simX - hitProbeR, y: simY - hitProbeR },
                    max: { x: simX + hitProbeR, y: simY + hitProbeR }
                });
                if (candidates.length > 0) {
                    const probePts = [
                        { x: simX, y: simY },
                        { x: simX + hitProbeR * 0.85, y: simY },
                        { x: simX, y: simY + hitProbeR * 0.85 },
                        { x: simX, y: simY - hitProbeR * 0.85 }
                    ];
                    let hitBody = null;
                    for (let p = 0; p < probePts.length; p++) {
                        const hits = Query.point(candidates, probePts[p]);
                        if (hits.length > 0) {
                            hitBody = hits[0];
                            break;
                        }
                    }
                    if (hitBody) {
                        impactPt = { x: simX, y: simY };
                        hitTargetType = hitBody.customData?.type || 'block';
                        break;
                    }
                }
            }

            if (simX > WORLD_WIDTH + 60) break;
        }

        this.ctx.save();

        // Layer A: Subtle luminous guide curve underneath dots so full parabola is Effortlessly readable
        if (pathPoints.length > 2) {
            this.ctx.strokeStyle = this.kingSlingActive
                ? 'rgba(253, 224, 71, 0.36)'
                : 'rgba(255, 255, 255, 0.28)';
            this.ctx.lineWidth = 3.2;
            this.ctx.setLineDash([8, 8]);
            this.ctx.beginPath();
            this.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
            for (let k = 1; k < pathPoints.length; k++) {
                this.ctx.lineTo(pathPoints[k].x, pathPoints[k].y);
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Layer B: High-contrast Outlined Sling-Scope Trajectory Dots (alternating rhythm!)
        const totalDots = Math.max(1, dotPoints.length);
        dotPoints.forEach((pt, idx) => {
            const progress = idx / totalDots;
            const alpha = Math.max(0.45, 1.0 - progress * 0.42);
            const isMajor = idx % 2 === 0;
            const r = isMajor
                ? Math.max(4.4, 6.6 - progress * 1.8)
                : Math.max(2.9, 4.3 - progress * 1.1);

            // Bold dark cartoon border for 100% visibility against bright sky & clouds
            this.ctx.fillStyle = this.kingSlingActive
                ? `rgba(253, 224, 71, ${alpha})`
                : `rgba(255, 255, 255, ${alpha})`;
            this.ctx.strokeStyle = `rgba(15, 23, 42, ${alpha * 0.92})`;
            this.ctx.lineWidth = 2.2;
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Warm golden core on major dots
            if (isMajor) {
                this.ctx.fillStyle = this.kingSlingActive
                    ? `rgba(255, 255, 255, ${alpha})`
                    : `rgba(250, 204, 21, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(pt.x, pt.y, r * 0.45, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // Layer C: Pulsing Target Bullseye Reticle at exact predicted impact point!
        if (impactPt) {
            const pulse = 1 + Math.sin(time * 9) * 0.14;
            const isCriticalTarget = hitTargetType === 'pig' || hitTargetType === 'tnt';
            const isBounceTarget = hitTargetType === 'bouncypad';
            const ringColor = isCriticalTarget ? '#ef4444' : isBounceTarget ? '#f43f5e' : '#facc15';
            const ringR = 16 * pulse;

            // Dark outer shadow ring
            this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
            this.ctx.lineWidth = 5.5;
            this.ctx.beginPath();
            this.ctx.arc(impactPt.x, impactPt.y, ringR, 0, Math.PI * 2);
            this.ctx.stroke();

            // Bright target ring
            this.ctx.strokeStyle = ringColor;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(impactPt.x, impactPt.y, ringR, 0, Math.PI * 2);
            this.ctx.stroke();

            // Crosshair ticks
            for (let c = 0; c < 4; c++) {
                const ang = c * (Math.PI / 2) + time * 1.4;
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2.2;
                this.ctx.beginPath();
                this.ctx.moveTo(impactPt.x + Math.cos(ang) * (ringR - 5), impactPt.y + Math.sin(ang) * (ringR - 5));
                this.ctx.lineTo(impactPt.x + Math.cos(ang) * (ringR + 5), impactPt.y + Math.sin(ang) * (ringR + 5));
                this.ctx.stroke();
            }

            // Bullseye center dot
            this.ctx.fillStyle = '#ffffff';
            this.ctx.strokeStyle = '#0f172a';
            this.ctx.lineWidth = 1.8;
            this.ctx.beginPath();
            this.ctx.arc(impactPt.x, impactPt.y, 4.2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }

        // Layer D: Subtle Pull Power & Angle Badge next to slingshot while dragging
        const powerPct = Math.min(100, Math.round((dist / MAX_STRETCH) * 100));
        const elevDeg = Math.round(Math.atan2(-stretch.y, stretch.x) * (180 / Math.PI));
        this.ctx.font = '800 14px "Fredoka", sans-serif';
        this.ctx.fillStyle = powerPct >= 95 ? '#fde047' : '#f8fafc';
        this.ctx.strokeStyle = '#0f172a';
        this.ctx.lineWidth = 3.5;
        this.ctx.textAlign = 'center';
        const label = `${powerPct}% · ${elevDeg}°`;
        this.ctx.strokeText(label, SLING_POS.x, SLING_POS.y - 54);
        this.ctx.fillText(label, SLING_POS.x, SLING_POS.y - 54);

        this.ctx.restore();
    }

    drawReserveBirdsOnGround(time) {
        const startX = SLING_POS.x - 92; // Neatly lined up at the base of the launcher hillock!
        const ent = this.birdEntranceState;
        const groundBaseY = GROUND_Y - 12;

        if (ent && (ent.phase === 'waiting' || ent.phase === 'anticipating')) {
            const candidateType = ent.birdType;
            const r = this.getBirdRadius(candidateType);

            if (ent.phase === 'waiting') {
                const lookAngle = -0.22;
                const hop = Math.abs(Math.sin(time * 3)) * 3;
                window.spriteRenderer.drawBirdAt(this.ctx, startX, groundBaseY - hop - r, lookAngle, candidateType, r, time, { idle: true });
            } else {
                const squashX = 1.28;
                const squashY = 0.72;
                window.spriteRenderer.drawBirdAt(this.ctx, startX, groundBaseY - (r * squashY), 0, candidateType, r, time, {
                    idle: false,
                    scaleX: squashX,
                    scaleY: squashY
                });
            }

            // Remaining queue birds behind candidate
            this.birdsQueue.slice(1).forEach((birdType, idx) => {
                const bx = startX - (idx + 1) * 44;
                const bRadius = this.getBirdRadius(birdType);
                const hop = Math.abs(Math.sin(time * 3 + idx * 0.7)) * 3.5;
                window.spriteRenderer.drawBirdAt(this.ctx, bx, groundBaseY - hop - bRadius, 0, birdType, bRadius, time, { idle: true });
            });
        } else {
            // Normal queue display (or queue shifting forward while hopping)
            const shiftOffset = ent && ent.phase === 'hopping' ? ent.groundShift : 0;
            const isHopping = ent && ent.phase === 'hopping';

            this.birdsQueue.forEach((birdType, idx) => {
                const bx = (startX - idx * 44) - shiftOffset;
                const r = this.getBirdRadius(birdType);
                const hop = isHopping
                    ? Math.sin(Math.min(1, Math.max(0, 1 - (shiftOffset / 44))) * Math.PI) * 7
                    : Math.abs(Math.sin(time * 3 + idx * 0.7)) * 3.5;

                window.spriteRenderer.drawBirdAt(this.ctx, bx, groundBaseY - hop - r, 0, birdType, r, time, { idle: true });
            });
        }
    }

    drawHoppingBird(time) {
        if (!this.birdEntranceState || this.birdEntranceState.phase !== 'hopping') return;
        const ent = this.birdEntranceState;
        const now = performance.now();
        const elapsed = now - ent.jumpStartTime;
        if (elapsed < 0) return;

        const p = Math.min(1, elapsed / ent.jumpDuration);
        const curX = ent.startX + (ent.targetX - ent.startX) * p;
        const jumpY = Math.sin(p * Math.PI) * 105; // 105px high proud jump!
        const curY = (ent.startY + (ent.targetY - ent.startY) * p) - jumpY;

        // Dynamic forward rotation + tilt
        const rot = Math.sin(p * Math.PI) * 0.32;
        const r = this.getBirdRadius(ent.birdType);

        // Dynamic stretch & squash during jump
        let scaleX = 1.0;
        let scaleY = 1.0;
        if (p < 0.22) {
            // Takeoff stretch
            scaleX = 0.86;
            scaleY = 1.20;
        } else if (p > 0.82) {
            // Landing preparation
            scaleX = 1.12;
            scaleY = 0.90;
        }

        window.spriteRenderer.drawBirdAt(this.ctx, curX, curY, rot, ent.birdType, r, time, {
            idle: false,
            scaleX,
            scaleY,
            flapping: true // flutter wings!
        });
    }

    drawSmokeTrails() {
        this.smokeTrails.forEach(st => {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${st.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawShockwaveRings() {
        this.debrisEffects.forEach(ring => {
            this.ctx.strokeStyle = ring.color;
            this.ctx.lineWidth = 4 * ring.alpha;
            this.ctx.globalAlpha = Math.max(0, ring.alpha);
            this.ctx.beginPath();
            this.ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        });
    }

    drawParticles() {
        this.ctx.save();
        this.particles.forEach(p => {
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            if (p.type === 'splinter') {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.angle || 0);
                this.ctx.fillStyle = p.color;
                this.ctx.strokeStyle = '#2b1708';
                this.ctx.lineWidth = 1;
                this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                this.ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
                this.ctx.restore();
            } else if (p.type === 'shard') {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.angle || 0);
                this.ctx.fillStyle = p.color;
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -p.size);
                this.ctx.lineTo(p.size * 0.55, 0);
                this.ctx.lineTo(0, p.size * 0.8);
                this.ctx.lineTo(-p.size * 0.55, 0);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
            } else if (p.type === 'stoneChunk') {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.angle || 0);
                this.ctx.fillStyle = p.color;
                this.ctx.strokeStyle = '#1e293b';
                this.ctx.lineWidth = 1.2;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
            } else if (p.type === 'feather') {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.angle || 0);
                this.ctx.fillStyle = p.color;
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 0.8;
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, 7, 3.5, 0.35, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
            } else if (p.type === 'pigEar') {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.angle || 0);
                this.ctx.fillStyle = '#65a30d';
                this.ctx.strokeStyle = '#1a2e05';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, p.radius * 0.7, p.radius, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.fillStyle = '#365314';
                this.ctx.beginPath();
                this.ctx.ellipse(0, 2, p.radius * 0.35, p.radius * 0.5, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            } else if (p.type === 'pigSnout') {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.angle || 0);
                this.ctx.fillStyle = '#84cc16';
                this.ctx.strokeStyle = '#1a2e05';
                this.ctx.lineWidth = 1.6;
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, p.radius, p.radius * 0.75, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.fillStyle = '#14532d';
                this.ctx.beginPath();
                this.ctx.arc(-p.radius * 0.35, 0, p.radius * 0.22, 0, Math.PI * 2);
                this.ctx.arc(p.radius * 0.35, 0, p.radius * 0.22, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            } else if (p.type === 'helmet') {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.angle || 0);
                this.ctx.fillStyle = '#64748b';
                this.ctx.strokeStyle = '#0f172a';
                this.ctx.lineWidth = 2.2;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.radius, Math.PI, Math.PI * 2);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
            } else if (p.type === 'star') {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.fillStyle = p.color;
                this.ctx.strokeStyle = '#d97706';
                this.ctx.lineWidth = 1.2;
                const r = p.radius;
                this.ctx.beginPath();
                for (let s = 0; s < 8; s++) {
                    const a = (s * Math.PI) / 4;
                    const rad = s % 2 === 0 ? r : r * 0.38;
                    const sx = Math.cos(a) * rad;
                    const sy = Math.sin(a) * rad;
                    if (s === 0) this.ctx.moveTo(sx, sy);
                    else this.ctx.lineTo(sx, sy);
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
            } else {
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius || 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        this.ctx.globalAlpha = 1.0;
        this.ctx.restore();
    }

    drawFloatingScores() {
        this.ctx.save();
        this.floatingTexts.forEach(ft => {
            this.ctx.font = '900 24px "Fredoka", Impact, sans-serif';
            this.ctx.fillStyle = ft.color;
            this.ctx.strokeStyle = '#09090b';
            this.ctx.lineWidth = 4;
            this.ctx.globalAlpha = Math.max(0, ft.alpha);
            this.ctx.textAlign = 'center';
            this.ctx.strokeText(ft.text, ft.x, ft.y);
            this.ctx.fillText(ft.text, ft.x, ft.y);
        });
        this.ctx.restore();
    }

    drawScreenHints() {
        if (this.activeFlyingBirds.length > 0) {
            const b = this.activeFlyingBirds.find(
                bird =>
                    bird.customData &&
                    ACTIVE_ABILITY_BIRDS.has(bird.customData.birdType) &&
                    !bird.customData.abilityUsed &&
                    !bird.customData.collided
            );
            if (b) {
                const type = b.customData.birdType;
                let text = '';
                if (type === 'yellow') text = '⚡ 点击屏幕 / 按空格：飞镖黄极速冲刺（破木克星）！';
                else if (type === 'blue') text = '🔵 点击屏幕 / 按空格：蓝弟弟一分为三（破冰克星）！';
                else if (type === 'bomb') text = '💣 点击屏幕 / 按空格：炸弹黑引爆巨型冲击波！';
                else if (type === 'matilda') text = '🥚 点击屏幕 / 按空格：白公主垂直投弹并火箭拉升！';

                if (text) {
                    this.ctx.save();
                    this.ctx.font = '800 19px "Fredoka", sans-serif';
                    this.ctx.fillStyle = '#fef08a';
                    this.ctx.strokeStyle = '#0f172a';
                    this.ctx.lineWidth = 4;
                    this.ctx.textAlign = 'center';
                    this.ctx.strokeText(text, VIEW_WIDTH / 2, 54);
                    this.ctx.fillText(text, VIEW_WIDTH / 2, 54);
                    this.ctx.restore();
                }
            }
        }
    }
}

window.AngryBirdsMaster = AngryBirdsMaster;

// Global bootstrap with fallback if DOM is already ready
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        window.game = new AngryBirdsMaster();
    });
} else {
    window.game = new AngryBirdsMaster();
}
