(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.JumpJumpEngine = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SAVE_KEY = 'cloudeave_jump_jump_v1';

    const CONFIG = {
        chargeRate: 320,      // world distance units gained per second of hold
        baseDist: 42,         // minimum leap on quick tap
        maxChargeSec: 1.45,
        jumpDuration: 0.48,   // seconds per airborne leap
        peakHeight: 118,
        bullseyeRadius: 15,
        bonusStayTime: 1.15
    };

    const SPECIAL_TYPES = [
        { kind: 'vinyl', name: '黑胶音乐盒', bonus: 15, colorTop: '#1e293b', colorLeft: '#0f172a', colorRight: '#334155', accent: '#38bdf8' },
        { kind: 'parcel', name: '神秘快递盒', bonus: 20, colorTop: '#f59e0b', colorLeft: '#d97706', colorRight: '#b45309', accent: '#fef08a' },
        { kind: 'store', name: '24h 便利店', bonus: 25, colorTop: '#f8fafc', colorLeft: '#cbd5e1', colorRight: '#94a3b8', accent: '#4ade80' },
        { kind: 'cube', name: '霓虹魔方台', bonus: 30, colorTop: '#c084fc', colorLeft: '#9333ea', colorRight: '#6b21a8', accent: '#fde047' }
    ];

    const STANDARD_PALETTES = [
        { colorTop: '#f8fafc', colorLeft: '#cbd5e1', colorRight: '#94a3b8' },
        { colorTop: '#bae6fd', colorLeft: '#38bdf8', colorRight: '#0284c7' },
        { colorTop: '#fed7aa', colorLeft: '#fb923c', colorRight: '#ea580c' },
        { colorTop: '#bbf7d0', colorLeft: '#4ade80', colorRight: '#16a34a' },
        { colorTop: '#fbcfe8', colorLeft: '#f472b6', colorRight: '#db2777' }
    ];

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function createSession(options = {}) {
        const seed = Number.isFinite(options.seed) ? options.seed : (Date.now() >>> 0);
        const rng = mulberry32(seed);

        const platforms = [];
        let idSeq = 1;

        function addPlatform(x, z, halfSize, isSpecial = false) {
            const pIdx = platforms.length;
            let spec = null;
            if (isSpecial) {
                spec = SPECIAL_TYPES[Math.floor(rng() * SPECIAL_TYPES.length)];
            }
            const pal = STANDARD_PALETTES[pIdx % STANDARD_PALETTES.length];
            const isRound = !spec && (rng() > 0.72);
            const plat = {
                id: idSeq++,
                x,
                z,
                halfW: halfSize,
                halfD: halfSize,
                height: spec ? 52 : (40 + Math.round(rng() * 14)),
                isRound,
                special: spec,
                bonusAwarded: false,
                colorTop: spec ? spec.colorTop : pal.colorTop,
                colorLeft: spec ? spec.colorLeft : pal.colorLeft,
                colorRight: spec ? spec.colorRight : pal.colorRight,
                accent: spec ? spec.accent : '#38bdf8',
                squish: 0,
                bounceVel: 0
            };
            platforms.push(plat);
            return plat;
        }

        function spawnNextPlatform() {
            const cur = platforms[platforms.length - 1];
            const stepAxis = rng() > 0.48 ? 'x' : 'z';
            const minGap = cur.halfW + 76;
            const maxGap = Math.min(285, 195 + Math.min(90, platforms.length * 4));
            const dist = minGap + rng() * (maxGap - minGap);
            const shrink = Math.min(20, Math.floor(platforms.length / 4) * 2);
            const halfSize = Math.max(30, 52 - shrink + Math.round((rng() - 0.5) * 10));
            const isSpecial = platforms.length >= 2 && (platforms.length % 4 === 0 || rng() < 0.16);
            const nx = cur.x + (stepAxis === 'x' ? dist : 0);
            const nz = cur.z + (stepAxis === 'z' ? dist : 0);
            return addPlatform(nx, nz, halfSize, isSpecial);
        }

        // Start platform + First target
        const startPlat = addPlatform(0, 0, 56, false);
        addPlatform(175, 0, 52, false);

        const session = {
            platforms,
            currentIndex: 0,
            player: {
                x: startPlat.x,
                y: 0,
                z: startPlat.z,
                dirAxis: 'x', // 'x' (+X right-upward) or 'z' (+Z left-upward)
                flipRot: 0,
                fallTilt: 0,
                fallSide: 0
            },
            camera: { x: 85, z: 0, targetX: 85, targetZ: 0 },
            state: 'idle', // 'idle' | 'charging' | 'jumping' | 'falling' | 'lost'
            chargeTime: 0,
            jumpState: null,
            stayTimer: 0,
            score: 0,
            jumps: 0,
            bullseyeStreak: 0,
            maxBullseyeStreak: 0,
            bonusHits: 0
        };

        function updateFacing() {
            const cur = platforms[session.currentIndex];
            const next = platforms[session.currentIndex + 1];
            if (!next) return;
            const dx = next.x - cur.x;
            const dz = next.z - cur.z;
            session.player.dirAxis = Math.abs(dx) >= Math.abs(dz) ? 'x' : 'z';
        }
        updateFacing();

        function beginCharge() {
            if (session.state !== 'idle') return false;
            session.state = 'charging';
            session.chargeTime = 0;
            return true;
        }

        function releaseJump() {
            if (session.state !== 'charging') return null;
            const cur = platforms[session.currentIndex];
            const next = platforms[session.currentIndex + 1];
            const chargeSec = clamp(session.chargeTime, 0, CONFIG.maxChargeSec);
            const jumpDist = CONFIG.baseDist + chargeSec * CONFIG.chargeRate;

            const dx = next.x - session.player.x;
            const dz = next.z - session.player.z;
            const norm = Math.hypot(dx, dz) || 1;
            const ux = dx / norm;
            const uz = dz / norm;

            session.state = 'jumping';
            session.stayTimer = 0;
            session.jumpState = {
                t: 0,
                dur: CONFIG.jumpDuration,
                sx: session.player.x,
                sz: session.player.z,
                tx: session.player.x + ux * jumpDist,
                tz: session.player.z + uz * jumpDist
            };
            // Trigger platform spring rebound when Hero pushes off
            cur.bounceVel = -cur.squish * 18;
            return { jumpDist, ux, uz };
        }

        function isInsidePlatform(px, pz, plat) {
            const dx = Math.abs(px - plat.x);
            const dz = Math.abs(pz - plat.z);
            if (plat.isRound) {
                return Math.hypot(dx, dz) <= plat.halfW;
            }
            return dx <= plat.halfW && dz <= plat.halfD;
        }

        function step(dt) {
            const cleanDt = clamp(dt, 0, 0.05);
            const events = [];

            // Spring wobble physics on platforms
            for (const p of platforms) {
                if (session.state === 'charging' && p === platforms[session.currentIndex]) {
                    continue;
                }
                if (Math.abs(p.squish) > 0.001 || Math.abs(p.bounceVel) > 0.001) {
                    const force = -160 * p.squish - 14 * p.bounceVel;
                    p.bounceVel += force * cleanDt;
                    p.squish += p.bounceVel * cleanDt;
                    if (Math.abs(p.squish) < 0.002 && Math.abs(p.bounceVel) < 0.05) {
                        p.squish = 0;
                        p.bounceVel = 0;
                    }
                }
            }

            // Smooth isometric camera tracking
            session.camera.x += (session.camera.targetX - session.camera.x) * Math.min(1, cleanDt * 5.2);
            session.camera.z += (session.camera.targetZ - session.camera.z) * Math.min(1, cleanDt * 5.2);

            if (session.state === 'charging') {
                session.chargeTime = Math.min(CONFIG.maxChargeSec, session.chargeTime + cleanDt);
                const curPlat = platforms[session.currentIndex];
                curPlat.squish = clamp(session.chargeTime / CONFIG.maxChargeSec, 0, 1) * 0.36;
                session.player.y = -curPlat.squish * 34;
                return events;
            }

            if (session.state === 'jumping' && session.jumpState) {
                const js = session.jumpState;
                js.t += cleanDt;
                const u = clamp(js.t / js.dur, 0, 1);
                session.player.x = js.sx + (js.tx - js.sx) * u;
                session.player.z = js.sz + (js.tz - js.sz) * u;
                session.player.y = 4 * CONFIG.peakHeight * u * (1 - u);
                session.player.flipRot = u * Math.PI * 2;

                if (u >= 1) {
                    session.player.y = 0;
                    session.player.flipRot = 0;
                    const curPlat = platforms[session.currentIndex];
                    const nextPlat = platforms[session.currentIndex + 1];

                    if (nextPlat && isInsidePlatform(session.player.x, session.player.z, nextPlat)) {
                        // Landed cleanly on NEXT platform!
                        session.currentIndex += 1;
                        session.jumps += 1;
                        nextPlat.squish = 0.24;
                        nextPlat.bounceVel = 0.8;

                        const distToCenter = Math.hypot(session.player.x - nextPlat.x, session.player.z - nextPlat.z);
                        let pts = 1;
                        let isBullseye = false;
                        if (distToCenter <= CONFIG.bullseyeRadius) {
                            isBullseye = true;
                            session.bullseyeStreak += 1;
                            session.maxBullseyeStreak = Math.max(session.maxBullseyeStreak, session.bullseyeStreak);
                            pts = session.bullseyeStreak * 2;
                        } else {
                            session.bullseyeStreak = 0;
                        }
                        session.score += pts;

                        const upcoming = spawnNextPlatform();
                        // Keep platform memory trim so long endless runs stay fast
                        if (platforms.length > 26 && session.currentIndex > 8) {
                            platforms.shift();
                            session.currentIndex -= 1;
                        }
                        session.camera.targetX = (nextPlat.x + upcoming.x) * 0.5;
                        session.camera.targetZ = (nextPlat.z + upcoming.z) * 0.5;
                        session.state = 'idle';
                        session.stayTimer = 0;
                        updateFacing();

                        events.push({
                            type: 'land',
                            x: session.player.x,
                            z: session.player.z,
                            points: pts,
                            bullseye: isBullseye,
                            streak: session.bullseyeStreak,
                            special: nextPlat.special ? nextPlat.special.kind : null
                        });
                    } else if (curPlat && isInsidePlatform(session.player.x, session.player.z, curPlat)) {
                        // Weak tap stayed safely on current platform
                        curPlat.squish = 0.14;
                        session.state = 'idle';
                        session.bullseyeStreak = 0;
                        events.push({ type: 'stay', x: session.player.x, z: session.player.z });
                    } else {
                        // Missed or overshot! Trigger fall-off
                        session.state = 'falling';
                        session.jumpState = { fallT: 0, vy: 0, tipDir: (session.player.dirAxis === 'x' ? 1 : -1) };
                        events.push({ type: 'miss', x: session.player.x, z: session.player.z });
                    }
                }
                return events;
            }

            if (session.state === 'idle') {
                const curPlat = platforms[session.currentIndex];
                if (curPlat && curPlat.special && !curPlat.bonusAwarded) {
                    session.stayTimer += cleanDt;
                    if (session.stayTimer >= CONFIG.bonusStayTime) {
                        curPlat.bonusAwarded = true;
                        session.bonusHits += 1;
                        session.score += curPlat.special.bonus;
                        events.push({
                            type: 'bonus',
                            x: curPlat.x,
                            z: curPlat.z,
                            bonus: curPlat.special.bonus,
                            name: curPlat.special.name
                        });
                    }
                }
                return events;
            }

            if (session.state === 'falling' && session.jumpState) {
                const fs = session.jumpState;
                fs.fallT += cleanDt;
                fs.vy -= 1150 * cleanDt;
                session.player.y += fs.vy * cleanDt;
                session.player.fallTilt = Math.min(Math.PI * 0.52, fs.fallT * 2.8) * fs.tipDir;
                if (fs.fallT >= 0.62) {
                    session.state = 'lost';
                    events.push({ type: 'lose', score: session.score, jumps: session.jumps });
                }
            }

            return events;
        }

        return {
            session,
            beginCharge,
            releaseJump,
            step
        };
    }

    function normalizeSave(raw) {
        return {
            muted: !!(raw && raw.muted),
            bestScore: Math.max(0, Math.floor(Number(raw && raw.bestScore) || 0)),
            maxJumps: Math.max(0, Math.floor(Number(raw && raw.maxJumps) || 0)),
            bestCombo: Math.max(0, Math.floor(Number(raw && raw.bestCombo) || 0)),
            gamesPlayed: Math.max(0, Math.floor(Number(raw && raw.gamesPlayed) || 0))
        };
    }

    return {
        SAVE_KEY,
        CONFIG,
        SPECIAL_TYPES,
        createSession,
        normalizeSave
    };
});
