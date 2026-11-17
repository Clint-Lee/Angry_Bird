(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.RicochetLabEngine = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SAVE_KEY = 'cloudeave_ricochet_lab_v1';

    const ARENA = {
        width: 480,
        height: 620,
        wallL: 16,
        wallR: 464,
        topY: 16,
        floorY: 604,
        gravity: 720,
        marbleR: 11,
        launchSpeed: 640,
        subSteps: 4,
        fixedDt: 1 / 60
    };

    // Gadget orientations (in degrees):
    // Paddle: 0=flat '-', 1=45deg '\', 2=90deg '|', 3=135deg '/'
    // Spring: 0=up N, 1=NE (+45), 2=NW (-45), 3=E (+90)
    const PADDLE_ANGLES = [0, Math.PI * 0.25, Math.PI * 0.5, -Math.PI * 0.25];
    const SPRING_NORMALS = [
        { nx: 0, ny: -1 },
        { nx: Math.SQRT1_2, ny: -Math.SQRT1_2 },
        { nx: -Math.SQRT1_2, ny: -Math.SQRT1_2 },
        { nx: 1, ny: 0 }
    ];

    const CHAPTERS = [
        { id: 1, name: '动能折射', subtitle: '部署斜向折射板与玻璃破障，精准串起星核轨迹', accent: '#38bdf8' },
        { id: 2, name: '机巧爆破', subtitle: '利用高能弹跳板、能量钥门与 TNT 连锁清除障碍', accent: '#f59e0b' },
        { id: 3, name: '引力星门', subtitle: '驾驭黑洞引力弯折与空间跃迁虫洞，完成高阶曲射', accent: '#c084fc' }
    ];

    /**
     * 12 handcrafted contraption levels.
     * Every level includes an authored `solution` verified by headless deterministic simulation.
     */
    const LEVELS = [
        // Chapter 1: Kinetic Ricochet
        {
            id: 1, chapter: 1, label: '1-1', name: '第一折射',
            hint: '在左下插槽放置「折射板」并旋转至 \\ 斜角，让下坠钢珠弹向右下方横扫星核并落入漩涡',
            launcher: { x: 84, y: 74, minDeg: 35, maxDeg: 135, defaultDeg: 65 },
            shots: 1,
            inventory: { paddle: 1, spring: 0 },
            slots: [{ id: 's1', x: 84, y: 468 }, { id: 's2', x: 255, y: 468 }],
            exit: { x: 392, y: 505, r: 26 },
            items: [
                { kind: 'star', x: 84, y: 260 },
                { kind: 'star', x: 245, y: 465 }
            ],
            obstacles: [
                { kind: 'wall', x: 185, y: 120, w: 26, h: 250 }
            ],
            solution: {
                angleDeg: 90,
                placements: [{ slotId: 's1', type: 'paddle', rot: 1 }]
            }
        },
        {
            id: 2, chapter: 1, label: '1-2', name: '碎晶穿壁',
            hint: '调整仰角击穿玻璃幕墙夺取上空双星，再经右侧「\\ 折射板」折返左下收取最后一星进入出口',
            launcher: { x: 76, y: 310, minDeg: -65, maxDeg: 35, defaultDeg: 5 },
            shots: 1,
            inventory: { paddle: 1, spring: 0 },
            slots: [{ id: 's1', x: 408, y: 280 }, { id: 's2', x: 220, y: 510 }],
            exit: { x: 416, y: 535, r: 26 },
            items: [
                { kind: 'star', x: 180, y: 270 },
                { kind: 'star', x: 355, y: 265 },
                { kind: 'star', x: 412, y: 425 }
            ],
            obstacles: [
                { kind: 'glass', x: 255, y: 140, w: 18, h: 220 },
                { kind: 'wall', x: 140, y: 390, w: 160, h: 24 }
            ],
            solution: {
                angleDeg: -26,
                placements: [{ slotId: 's1', type: 'paddle', rot: 1 }]
            }
        },
        {
            id: 3, chapter: 1, label: '1-3', name: '双板连弹',
            hint: '先自上平射横扫上方星核，经右上 \\ 板折向下方，再靠右下 / 板横穿底部入洞！',
            launcher: { x: 74, y: 110, minDeg: -35, maxDeg: 55, defaultDeg: 25 },
            shots: 1,
            inventory: { paddle: 2, spring: 0 },
            slots: [{ id: 's1', x: 408, y: 175 }, { id: 's2', x: 354, y: 492 }, { id: 's3', x: 205, y: 492 }],
            exit: { x: 112, y: 506, r: 26 },
            items: [
                { kind: 'star', x: 240, y: 118 },
                { kind: 'star', x: 358, y: 335 },
                { kind: 'star', x: 245, y: 498 }
            ],
            obstacles: [
                { kind: 'wall', x: 140, y: 220, w: 190, h: 24 },
                { kind: 'spike', x: 185, y: 360, w: 96, h: 20 }
            ],
            solution: {
                angleDeg: -6,
                placements: [
                    { slotId: 's1', type: 'paddle', rot: 1 },
                    { slotId: 's2', type: 'paddle', rot: 3 }
                ]
            }
        },
        {
            id: 4, chapter: 1, label: '1-4', name: '高塔迂回',
            hint: '从左侧仰射跃过高墙顶部，在左顶与右侧布置两块折射板引导钢珠破窗落袋',
            launcher: { x: 74, y: 430, minDeg: -82, maxDeg: -15, defaultDeg: -40 },
            shots: 1,
            inventory: { paddle: 2, spring: 0 },
            slots: [{ id: 's1', x: 158, y: 195 }, { id: 's2', x: 396, y: 265 }, { id: 's3', x: 155, y: 375 }],
            exit: { x: 395, y: 525, r: 26 },
            items: [
                { kind: 'star', x: 108, y: 300 },
                { kind: 'star', x: 280, y: 210 },
                { kind: 'star', x: 398, y: 405 }
            ],
            obstacles: [
                { kind: 'wall', x: 224, y: 305, w: 26, h: 295 },
                { kind: 'glass', x: 315, y: 335, w: 135, h: 18 }
            ],
            solution: {
                angleDeg: -72,
                placements: [
                    { slotId: 's1', type: 'paddle', rot: 3 },
                    { slotId: 's2', type: 'paddle', rot: 1 }
                ]
            }
        },

        // Chapter 2: Springs, Keys & TNT
        {
            id: 5, chapter: 2, label: '2-1', name: '超级弹床',
            hint: '先向下收取左谷底星核，精准落入「超级弹床(右上方向)」强力跃过中墙收齐三星',
            launcher: { x: 86, y: 140, minDeg: 30, maxDeg: 110, defaultDeg: 45 },
            shots: 1,
            inventory: { paddle: 0, spring: 1 },
            slots: [{ id: 's1', x: 126, y: 492 }, { id: 's2', x: 305, y: 520 }],
            exit: { x: 422, y: 235, r: 26 },
            items: [
                { kind: 'star', x: 112, y: 315 },
                { kind: 'star', x: 265, y: 355 },
                { kind: 'star', x: 351, y: 285 }
            ],
            obstacles: [
                { kind: 'wall', x: 242, y: 390, w: 26, h: 210 },
                { kind: 'spike', x: 25, y: 575, w: 180, h: 18 }
            ],
            solution: {
                angleDeg: 80,
                placements: [{ slotId: 's1', type: 'spring', rot: 1 }]
            }
        },
        {
            id: 6, chapter: 2, label: '2-2', name: '钥匙开闸',
            hint: '右上方出口被激光闸门锁死！在左下放置向上弹床、左上放置折射板，借折返取钥开门入洞',
            launcher: { x: 390, y: 495, minDeg: -175, maxDeg: -100, defaultDeg: -115 },
            shots: 1,
            inventory: { paddle: 1, spring: 1 },
            slots: [{ id: 's1', x: 110, y: 215 }, { id: 's2', x: 115, y: 500 }],
            exit: { x: 408, y: 405, r: 26 },
            items: [
                { kind: 'key', gateId: 'g1', x: 110, y: 355 },
                { kind: 'star', x: 255, y: 475 },
                { kind: 'star', x: 252, y: 270 }
            ],
            obstacles: [
                { kind: 'gate', id: 'g1', x: 344, y: 120, w: 18, h: 330 },
                { kind: 'wall', x: 222, y: 320, w: 26, h: 115 }
            ],
            solution: {
                angleDeg: -162,
                placements: [
                    { slotId: 's2', type: 'spring', rot: 0 },
                    { slotId: 's1', type: 'paddle', rot: 3 }
                ]
            }
        },
        {
            id: 7, chapter: 2, label: '2-3', name: '链式爆破',
            hint: '共 2 发机会：第 1 发斜射引爆 TNT 炸飞石箱屏障；第 2 发平射经右侧斜板横扫双星进洞！',
            launcher: { x: 80, y: 120, minDeg: -20, maxDeg: 85, defaultDeg: 25 },
            shots: 2,
            inventory: { paddle: 1, spring: 0 },
            slots: [{ id: 's1', x: 398, y: 225 }, { id: 's2', x: 165, y: 500 }],
            exit: { x: 425, y: 530, r: 26 },
            items: [
                { kind: 'star', x: 235, y: 155 },
                { kind: 'star', x: 408, y: 360 }
            ],
            obstacles: [
                { kind: 'tnt', x: 145, y: 255, r: 18 },
                { kind: 'crate', x: 196, y: 120, w: 48, h: 48 },
                { kind: 'crate', x: 196, y: 175, w: 48, h: 48 },
                { kind: 'wall', x: 280, y: 350, w: 26, h: 240 }
            ],
            solution: {
                angles: [64, 4],
                angleDeg: 64,
                placements: [{ slotId: 's1', type: 'paddle', rot: 1 }]
            }
        },
        {
            id: 8, chapter: 2, label: '2-4', name: '弹珠矩阵',
            hint: '先从上方撞击弹珠圆盘弹射收集中心双星并落入右下/中下弹床，再跃过右壁完成逆转！',
            launcher: { x: 74, y: 210, minDeg: -50, maxDeg: 45, defaultDeg: 15 },
            shots: 1,
            inventory: { paddle: 1, spring: 1 },
            slots: [{ id: 's1', x: 268, y: 510 }, { id: 's2', x: 404, y: 155 }],
            exit: { x: 402, y: 508, r: 26 },
            items: [
                { kind: 'star', x: 162, y: 185 },
                { kind: 'star', x: 230, y: 370 },
                { kind: 'star', x: 404, y: 340 }
            ],
            obstacles: [
                { kind: 'bumper', x: 245, y: 185, r: 19 },
                { kind: 'wall', x: 325, y: 465, w: 24, h: 130 },
                { kind: 'spike', x: 35, y: 575, w: 170, h: 18 }
            ],
            solution: {
                angleDeg: -26,
                placements: [
                    { slotId: 's1', type: 'spring', rot: 1 },
                    { slotId: 's2', type: 'paddle', rot: 1 }
                ]
            }
        },

        // Chapter 3: Gravity Wells & Portals
        {
            id: 9, chapter: 3, label: '3-1', name: '星际跃迁',
            hint: '向上瞄准虫洞收集左侧星核，从高壁另一侧穿出后经斜板导向终点漩涡',
            launcher: { x: 78, y: 490, minDeg: -95, maxDeg: -45, defaultDeg: -60 },
            shots: 1,
            inventory: { paddle: 1, spring: 0 },
            slots: [{ id: 's1', x: 406, y: 265 }, { id: 's2', x: 260, y: 490 }],
            exit: { x: 396, y: 515, r: 26 },
            items: [
                { kind: 'star', x: 100, y: 340 },
                { kind: 'star', x: 355, y: 195 }
            ],
            obstacles: [
                { kind: 'portal', pair: 0, x: 118, y: 245, r: 20 },
                { kind: 'portal', pair: 0, x: 268, y: 175, r: 20 },
                { kind: 'wall', x: 188, y: 100, w: 26, h: 490 }
            ],
            solution: {
                angleDeg: -82,
                placements: [{ slotId: 's1', type: 'paddle', rot: 1 }]
            }
        },
        {
            id: 10, chapter: 3, label: '3-2', name: '黑洞曲射',
            hint: '中央黑洞会产生强引力偏折轨迹！借助引力绕壁俯冲，击中右侧折射板折向左侧收集三星进洞',
            launcher: { x: 76, y: 140, minDeg: -35, maxDeg: 40, defaultDeg: 18 },
            shots: 1,
            inventory: { paddle: 1, spring: 0 },
            slots: [{ id: 's1', x: 406, y: 270 }, { id: 's2', x: 140, y: 470 }],
            exit: { x: 138, y: 285, r: 26 },
            items: [
                { kind: 'star', x: 235, y: 175 },
                { kind: 'star', x: 335, y: 295 },
                { kind: 'star', x: 245, y: 345 }
            ],
            obstacles: [
                { kind: 'gravity', x: 245, y: 295, r: 18, pullRadius: 165, strength: 165000 },
                { kind: 'wall', x: 185, y: 405, w: 120, h: 24 }
            ],
            solution: {
                angleDeg: 4,
                placements: [{ slotId: 's1', type: 'paddle', rot: 2 }]
            }
        },
        {
            id: 11, chapter: 3, label: '3-3', name: '双钥奇点',
            hint: '借助左侧微弱引力弧线飞越上空拿取蓝色钥匙打开金门，再顺右侧斜板清光右边星核！',
            launcher: { x: 76, y: 450, minDeg: -85, maxDeg: -25, defaultDeg: -45 },
            shots: 1,
            inventory: { paddle: 2, spring: 0 },
            slots: [{ id: 's1', x: 412, y: 258 }, { id: 's2', x: 250, y: 500 }],
            exit: { x: 402, y: 525, r: 26 },
            items: [
                { kind: 'star', x: 145, y: 335 },
                { kind: 'key', gateId: 'g2', x: 305, y: 228 },
                { kind: 'star', x: 392, y: 410 }
            ],
            obstacles: [
                { kind: 'gravity', x: 235, y: 310, r: 17, pullRadius: 130, strength: 95000 },
                { kind: 'wall', x: 175, y: 380, w: 155, h: 22 },
                { kind: 'gate', id: 'g2', x: 345, y: 458, w: 112, h: 18 }
            ],
            solution: {
                angleDeg: -64,
                placements: [
                    { slotId: 's1', type: 'paddle', rot: 1 }
                ]
            }
        },
        {
            id: 12, chapter: 3, label: '3-4', name: '大师终试',
            hint: '第 1 发斜下引爆 TNT 炸开高空石箱；第 2 发平射入虫洞穿出高空，直入右侧折射收星通关！',
            launcher: { x: 80, y: 175, minDeg: -15, maxDeg: 85, defaultDeg: 25 },
            shots: 2,
            inventory: { paddle: 1, spring: 1 },
            slots: [{ id: 's1', x: 215, y: 520 }, { id: 's2', x: 416, y: 124 }],
            exit: { x: 402, y: 515, r: 26 },
            items: [
                { kind: 'star', x: 120, y: 270 },
                { kind: 'star', x: 345, y: 135 },
                { kind: 'star', x: 408, y: 390 }
            ],
            obstacles: [
                { kind: 'tnt', x: 150, y: 345, r: 18 },
                { kind: 'crate', x: 170, y: 215, w: 46, h: 46 },
                { kind: 'portal', pair: 0, x: 265, y: 205, r: 20 },
                { kind: 'portal', pair: 0, x: 340, y: 105, r: 20 },
                { kind: 'wall', x: 315, y: 325, w: 26, h: 270 }
            ],
            solution: {
                angles: [64, 4],
                angleDeg: 64,
                placements: [
                    { slotId: 's2', type: 'paddle', rot: 1 }
                ]
            }
        }
    ];

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function cloneLevelState(lvl) {
        return {
            obstacles: lvl.obstacles.map((o) => Object.assign({ alive: true, open: false }, o)),
            items: lvl.items.map((it) => Object.assign({ collected: false }, it))
        };
    }

    /**
     * Resolve circle vs AABB rectangle bounce. Returns true if collided.
     */
    function collideCircleRect(ball, rx, ry, rw, rh, restitution) {
        const cx = clamp(ball.x, rx, rx + rw);
        const cy = clamp(ball.y, ry, ry + rh);
        const dx = ball.x - cx;
        const dy = ball.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= ball.r * ball.r) return false;

        const d = Math.sqrt(d2);
        let nx = 0, ny = 0;
        if (d > 0.0001) {
            nx = dx / d;
            ny = dy / d;
        } else {
            const left = Math.abs(ball.x - rx);
            const right = Math.abs(rx + rw - ball.x);
            const top = Math.abs(ball.y - ry);
            const bottom = Math.abs(ry + rh - ball.y);
            const minSide = Math.min(left, right, top, bottom);
            if (minSide === left) nx = -1;
            else if (minSide === right) nx = 1;
            else if (minSide === top) ny = -1;
            else ny = 1;
        }

        const overlap = ball.r - d;
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
            ball.vx -= (1 + restitution) * vn * nx;
            ball.vy -= (1 + restitution) * vn * ny;
        }
        return true;
    }

    /**
     * Resolve circle vs oriented capsule segment (for angled Deflectors & Springs).
     */
    function collideCapsule(ball, cx, cy, angle, halfLen, thickness, restitution) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const ax = cx - cos * halfLen;
        const ay = cy - sin * halfLen;
        const bx = cx + cos * halfLen;
        const by = cy + sin * halfLen;

        const abx = bx - ax;
        const aby = by - ay;
        const abLenSq = abx * abx + aby * aby || 1;
        const t = clamp(((ball.x - ax) * abx + (ball.y - ay) * aby) / abLenSq, 0, 1);
        const px = ax + abx * t;
        const py = ay + aby * t;

        const dx = ball.x - px;
        const dy = ball.y - py;
        const minD = ball.r + thickness;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minD * minD) return null;

        const d = Math.sqrt(d2) || 0.0001;
        const nx = dx / d;
        const ny = dy / d;
        const overlap = minD - d;
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
            ball.vx -= (1 + restitution) * vn * nx;
            ball.vy -= (1 + restitution) * vn * ny;
            return { x: px, y: py, nx, ny, speed: -vn };
        }
        return { x: px, y: py, nx, ny, speed: 0 };
    }

    function createSession(levelIndex) {
        const idx = clamp(Number(levelIndex) || 0, 0, LEVELS.length - 1);
        const level = LEVELS[idx];
        const cloned = cloneLevelState(level);

        const session = {
            levelIndex: idx,
            level,
            aimDeg: level.launcher.defaultDeg,
            shotsLeft: level.shots,
            placements: new Map(), // slotId -> { slotId, type, rot }
            state: 'planning', // 'planning' | 'flying' | 'won' | 'lost'
            lossReason: '',
            ball: null,
            trail: [],
            obstacles: cloned.obstacles,
            items: cloned.items,
            starsTotal: cloned.items.filter((i) => i.kind === 'star').length,
            starsCollected: 0,
            exitOpen: false,
            portalCooldown: 0,
            shotTime: 0,
            totalBounces: 0
        };

        session.getUsedCounts = function () {
            let paddle = 0, spring = 0;
            for (const p of session.placements.values()) {
                if (p.type === 'paddle') paddle++;
                else if (p.type === 'spring') spring++;
            }
            return { paddle, spring };
        };

        session.getRemainingCounts = function () {
            const used = session.getUsedCounts();
            return {
                paddle: Math.max(0, (level.inventory.paddle || 0) - used.paddle),
                spring: Math.max(0, (level.inventory.spring || 0) - used.spring)
            };
        };

        session.placeOrRotateGadget = function (slotId, desiredType) {
            if (session.state !== 'planning') return null;
            const slot = level.slots.find((s) => s.id === slotId);
            if (!slot) return null;

            const existing = session.placements.get(slotId);
            if (!existing) {
                const rem = session.getRemainingCounts();
                const typeToUse = (desiredType && rem[desiredType] > 0)
                    ? desiredType
                    : (rem.paddle > 0 ? 'paddle' : (rem.spring > 0 ? 'spring' : null));
                if (!typeToUse) return null;
                const entry = { slotId, type: typeToUse, rot: typeToUse === 'paddle' ? 3 : 0 };
                session.placements.set(slotId, entry);
                return { action: 'place', entry };
            }

            if (desiredType && desiredType !== existing.type) {
                const rem = session.getRemainingCounts();
                if (rem[desiredType] > 0) {
                    existing.type = desiredType;
                    existing.rot = desiredType === 'paddle' ? 3 : 0;
                    return { action: 'swap', entry: existing };
                }
            }

            existing.rot = (existing.rot + 1) & 3;
            return { action: 'rotate', entry: existing };
        };

        session.removeGadget = function (slotId) {
            if (session.state !== 'planning') return false;
            return session.placements.delete(slotId);
        };

        session.setAimDeg = function (deg) {
            session.aimDeg = clamp(Number(deg) || 0, level.launcher.minDeg, level.launcher.maxDeg);
            return session.aimDeg;
        };

        function stepBallSub(ball, subDt, obstacles, items, placements, events, simState) {
            // Gravity + black-hole gravity wells
            ball.vy += ARENA.gravity * subDt;
            for (const o of obstacles) {
                if (!o.alive || o.kind !== 'gravity') continue;
                const gx = o.x - ball.x;
                const gy = o.y - ball.y;
                const d2 = gx * gx + gy * gy;
                if (d2 < o.pullRadius * o.pullRadius && d2 > 4) {
                    const d = Math.sqrt(d2);
                    const accel = o.strength / (d2 + 950);
                    ball.vx += (gx / d) * accel * subDt;
                    ball.vy += (gy / d) * accel * subDt;
                }
            }

            ball.vx *= 1 - 0.03 * subDt;
            ball.vy *= 1 - 0.03 * subDt;
            ball.x += ball.vx * subDt;
            ball.y += ball.vy * subDt;

            // Arena walls & ceiling
            if (ball.x - ball.r < ARENA.wallL) {
                ball.x = ARENA.wallL + ball.r;
                if (ball.vx < 0) {
                    ball.vx = -ball.vx * 0.88;
                    simState.bounces += 1;
                    events.push({ type: 'wall', x: ball.x, y: ball.y, speed: Math.abs(ball.vx) });
                }
            } else if (ball.x + ball.r > ARENA.wallR) {
                ball.x = ARENA.wallR - ball.r;
                if (ball.vx > 0) {
                    ball.vx = -ball.vx * 0.88;
                    simState.bounces += 1;
                    events.push({ type: 'wall', x: ball.x, y: ball.y, speed: Math.abs(ball.vx) });
                }
            }
            if (ball.y - ball.r < ARENA.topY) {
                ball.y = ARENA.topY + ball.r;
                if (ball.vy < 0) {
                    ball.vy = -ball.vy * 0.88;
                    simState.bounces += 1;
                    events.push({ type: 'wall', x: ball.x, y: ball.y, speed: Math.abs(ball.vy) });
                }
            }

            // Floor drain
            if (ball.y + ball.r >= ARENA.floorY) {
                simState.drained = true;
                events.push({ type: 'drain', x: ball.x, y: ARENA.floorY });
                return;
            }

            // Placed Gadgets (Paddles & Springs)
            for (const p of placements.values()) {
                const slot = level.slots.find((s) => s.id === p.slotId);
                if (!slot) continue;
                if (p.type === 'paddle') {
                    const hit = collideCapsule(ball, slot.x, slot.y, PADDLE_ANGLES[p.rot & 3], 36, 6, 0.94);
                    if (hit && hit.speed > 40) {
                        simState.bounces += 1;
                        events.push({ type: 'paddle', x: hit.x, y: hit.y, speed: hit.speed });
                    }
                } else if (p.type === 'spring') {
                    const hit = collideCapsule(ball, slot.x, slot.y, 0, 26, 8, 1.0);
                    if (hit) {
                        const dir = SPRING_NORMALS[p.rot & 3];
                        const boost = Math.max(740, Math.hypot(ball.vx, ball.vy) * 1.15);
                        ball.vx = dir.nx * boost;
                        ball.vy = dir.ny * boost;
                        simState.bounces += 1;
                        events.push({ type: 'spring', x: slot.x, y: slot.y });
                    }
                }
            }

            // Obstacles
            for (const o of obstacles) {
                if (!o.alive) continue;
                if (o.kind === 'wall' || o.kind === 'crate' || (o.kind === 'gate' && !o.open)) {
                    if (collideCircleRect(ball, o.x, o.y, o.w, o.h, 0.86)) {
                        simState.bounces += 1;
                        events.push({ type: 'wall', x: ball.x, y: ball.y, speed: Math.hypot(ball.vx, ball.vy) });
                    }
                } else if (o.kind === 'glass') {
                    const cx = clamp(ball.x, o.x, o.x + o.w);
                    const cy = clamp(ball.y, o.y, o.y + o.h);
                    if ((ball.x - cx) ** 2 + (ball.y - cy) ** 2 < ball.r * ball.r) {
                        o.alive = false;
                        ball.vx *= 0.88;
                        ball.vy *= 0.88;
                        events.push({ type: 'glass', x: cx, y: cy, w: o.w, h: o.h });
                    }
                } else if (o.kind === 'spike') {
                    const cx = clamp(ball.x, o.x, o.x + o.w);
                    const cy = clamp(ball.y, o.y, o.y + o.h);
                    if ((ball.x - cx) ** 2 + (ball.y - cy) ** 2 < (ball.r - 1) ** 2) {
                        simState.hazardHit = '触碰赤红激光刺';
                        events.push({ type: 'hazard', x: ball.x, y: ball.y });
                        return;
                    }
                } else if (o.kind === 'bumper') {
                    const dx = ball.x - o.x;
                    const dy = ball.y - o.y;
                    const minD = ball.r + o.r;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < minD * minD) {
                        const d = Math.sqrt(d2) || 0.001;
                        const nx = dx / d;
                        const ny = dy / d;
                        ball.x = o.x + nx * minD;
                        ball.y = o.y + ny * minD;
                        const spd = Math.max(540, Math.hypot(ball.vx, ball.vy) * 1.12);
                        ball.vx = nx * spd;
                        ball.vy = ny * spd;
                        simState.bounces += 1;
                        events.push({ type: 'bumper', x: o.x, y: o.y });
                    }
                } else if (o.kind === 'tnt') {
                    const dx = ball.x - o.x;
                    const dy = ball.y - o.y;
                    if (dx * dx + dy * dy < (ball.r + o.r) ** 2) {
                        o.alive = false;
                        const blastR = 115;
                        for (const target of obstacles) {
                            if (!target.alive || target === o) continue;
                            if (target.kind === 'crate' || target.kind === 'glass') {
                                const tx = target.x + target.w * 0.5;
                                const ty = target.y + target.h * 0.5;
                                if (Math.hypot(tx - o.x, ty - o.y) <= blastR + 28) {
                                    target.alive = false;
                                }
                            }
                        }
                        const d = Math.hypot(dx, dy) || 1;
                        ball.vx = (dx / d) * 420;
                        ball.vy = (dy / d) * 420 - 160;
                        events.push({ type: 'tnt', x: o.x, y: o.y, r: blastR });
                    }
                } else if (o.kind === 'portal' && simState.portalCooldown <= 0) {
                    const dx = ball.x - o.x;
                    const dy = ball.y - o.y;
                    if (dx * dx + dy * dy < (ball.r + o.r * 0.78) ** 2) {
                        const mate = obstacles.find((m) => m.kind === 'portal' && m.pair === o.pair && m !== o);
                        if (mate) {
                            events.push({ type: 'portal', x: o.x, y: o.y });
                            ball.x = mate.x;
                            ball.y = mate.y;
                            simState.portalCooldown = 0.25;
                            events.push({ type: 'portal', x: mate.x, y: mate.y });
                        }
                    }
                }
            }

            // Collectibles (Stars & Keys)
            for (const it of items) {
                if (it.collected) continue;
                const rad = it.kind === 'star' ? 16 : 15;
                const dx = ball.x - it.x;
                const dy = ball.y - it.y;
                if (dx * dx + dy * dy <= (ball.r + rad) ** 2) {
                    it.collected = true;
                    if (it.kind === 'star') {
                        simState.starsCollected += 1;
                        events.push({ type: 'star', x: it.x, y: it.y, count: simState.starsCollected, total: session.starsTotal });
                    } else if (it.kind === 'key') {
                        for (const o of obstacles) {
                            if (o.kind === 'gate' && o.id === it.gateId) o.open = true;
                        }
                        events.push({ type: 'key', x: it.x, y: it.y, gateId: it.gateId });
                    }
                }
            }

            // Check Exit Vortex if all stars collected
            if (simState.starsCollected >= session.starsTotal) {
                simState.exitOpen = true;
                const dx = ball.x - level.exit.x;
                const dy = ball.y - level.exit.y;
                if (dx * dx + dy * dy <= (ball.r + level.exit.r * 0.85) ** 2) {
                    simState.won = true;
                    events.push({ type: 'win', x: level.exit.x, y: level.exit.y });
                }
            }
        }

        /**
         * Exact trajectory preview using the identical integrator up to maxBounces bounces or 1.4s.
         */
        session.predictArc = function (maxBounces) {
            const rad = (session.aimDeg * Math.PI) / 180;
            const ghost = {
                x: level.launcher.x,
                y: level.launcher.y,
                r: ARENA.marbleR,
                vx: Math.cos(rad) * ARENA.launchSpeed,
                vy: Math.sin(rad) * ARENA.launchSpeed
            };
            const simObs = cloneLevelState(level).obstacles;
            const simItems = cloneLevelState(level).items;
            const simState = { bounces: 0, portalCooldown: 0, starsCollected: 0, exitOpen: false, drained: false, won: false, hazardHit: '' };
            const pts = [{ x: ghost.x, y: ghost.y }];
            const targetBounces = maxBounces || 2;
            const subDt = ARENA.fixedDt / ARENA.subSteps;

            for (let f = 0; f < 95; f++) {
                for (let s = 0; s < ARENA.subSteps; s++) {
                    if (simState.portalCooldown > 0) simState.portalCooldown -= subDt;
                    stepBallSub(ghost, subDt, simObs, simItems, session.placements, [], simState);
                    if (simState.drained || simState.won || simState.hazardHit || simState.bounces > targetBounces) break;
                }
                if (f % 2 === 0) pts.push({ x: ghost.x, y: ghost.y });
                if (simState.drained || simState.won || simState.hazardHit || simState.bounces > targetBounces) break;
            }
            return pts;
        };

        session.launch = function () {
            if (session.state !== 'planning' || session.shotsLeft <= 0) return false;
            const rad = (session.aimDeg * Math.PI) / 180;
            session.shotsLeft -= 1;
            session.state = 'flying';
            session.shotTime = 0;
            session.portalCooldown = 0;
            session.trail = [];
            session.ball = {
                x: level.launcher.x,
                y: level.launcher.y,
                r: ARENA.marbleR,
                vx: Math.cos(rad) * ARENA.launchSpeed,
                vy: Math.sin(rad) * ARENA.launchSpeed
            };
            return true;
        };

        session.step = function (dtInput) {
            if (session.state !== 'flying' || !session.ball) return [];
            const dt = clamp(Number(dtInput) || ARENA.fixedDt, 0.001, 0.04);
            const subDt = dt / ARENA.subSteps;
            const events = [];

            session.shotTime += dt;

            const simState = {
                bounces: session.totalBounces,
                portalCooldown: session.portalCooldown,
                starsCollected: session.starsCollected,
                exitOpen: session.exitOpen,
                drained: false,
                won: false,
                hazardHit: ''
            };

            for (let s = 0; s < ARENA.subSteps; s++) {
                if (simState.portalCooldown > 0) simState.portalCooldown -= subDt;
                stepBallSub(session.ball, subDt, session.obstacles, session.items, session.placements, events, simState);
                if (simState.won || simState.drained || simState.hazardHit) break;
            }

            session.totalBounces = simState.bounces;
            session.portalCooldown = simState.portalCooldown;
            session.starsCollected = simState.starsCollected;
            session.exitOpen = simState.exitOpen;

            session.trail.push({ x: session.ball.x, y: session.ball.y });
            if (session.trail.length > 26) session.trail.shift();

            if (simState.won) {
                session.state = 'won';
                return events;
            }

            const stalled = session.shotTime > 7.5 || (session.shotTime > 1.0 && Math.hypot(session.ball.vx, session.ball.vy) < 16);
            if (simState.hazardHit) {
                if (session.shotsLeft > 0) {
                    session.ball = null;
                    session.state = 'planning';
                    events.push({ type: 'nextShot', shotsLeft: session.shotsLeft });
                } else {
                    session.state = 'lost';
                    session.lossReason = simState.hazardHit;
                }
                return events;
            }

            if (simState.drained || stalled) {
                if (session.shotsLeft > 0) {
                    session.ball = null;
                    session.state = 'planning';
                    events.push({ type: 'nextShot', shotsLeft: session.shotsLeft });
                } else {
                    session.state = 'lost';
                    session.lossReason = session.starsCollected < session.starsTotal
                        ? `还差 ${session.starsTotal - session.starsCollected} 颗星核未收集`
                        : '已收集全星核，但未进入出口漩涡';
                }
            }
            return events;
        };

        /**
         * Reset back to planning phase keeping player's current placed gadgets & aim angle!
         */
        session.resetShotOnly = function () {
            const fresh = cloneLevelState(level);
            session.obstacles = fresh.obstacles;
            session.items = fresh.items;
            session.shotsLeft = level.shots;
            session.starsCollected = 0;
            session.exitOpen = false;
            session.ball = null;
            session.trail = [];
            session.totalBounces = 0;
            session.shotTime = 0;
            session.state = 'planning';
            session.lossReason = '';
        };

        session.applySolution = function () {
            session.resetShotOnly();
            session.placements.clear();
            session.setAimDeg(level.solution.angleDeg);
            for (const p of level.solution.placements) {
                session.placements.set(p.slotId, { slotId: p.slotId, type: p.type, rot: p.rot });
            }
        };

        session.evaluateStars = function () {
            if (session.state !== 'won') return 0;
            const rem = session.getRemainingCounts();
            const unusedBonus = rem.paddle + rem.spring;
            if (unusedBonus > 0 || session.totalBounces <= 5) return 3;
            if (session.totalBounces <= 9) return 2;
            return 1;
        };

        return session;
    }

    function normalizeSave(raw) {
        const clean = {
            muted: !!(raw && raw.muted),
            unlockedLevel: clamp(Math.floor(Number(raw && raw.unlockedLevel) || 1), 1, LEVELS.length),
            currentLevelIndex: clamp(Math.floor(Number(raw && raw.currentLevelIndex) || 0), 0, LEVELS.length - 1),
            levelStars: {}
        };
        if (raw && raw.levelStars && typeof raw.levelStars === 'object') {
            for (const lvl of LEVELS) {
                const s = Number(raw.levelStars[lvl.id]);
                if (s > 0) clean.levelStars[lvl.id] = clamp(Math.floor(s), 1, 3);
            }
        }
        return clean;
    }

    function totalStars(save) {
        if (!save || !save.levelStars) return 0;
        return Object.values(save.levelStars).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }

    return {
        SAVE_KEY,
        ARENA,
        PADDLE_ANGLES,
        SPRING_NORMALS,
        CHAPTERS,
        LEVELS,
        createSession,
        normalizeSave,
        totalStars
    };
});
