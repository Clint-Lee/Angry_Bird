(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CandyRopeEngine = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SAVE_KEY = 'cloudeave_cut_rope_v1';

    const ARENA = {
        width: 460,
        height: 620,
        gravity: 920,
        fixedDt: 1 / 60,
        damping: 0.992,
        candyR: 16,
        solveIters: 10
    };

    const CHAPTERS = [
        { id: 1, name: '纸盒初遇', subtitle: '剪断麻绳、钟摆荡漾与气泡浮升', accent: '#4ade80' },
        { id: 2, name: '奇幻风箱', subtitle: '配合充气风囊、魔术帽与自动抓钩通关', accent: '#38bdf8' },
        { id: 3, name: '发条机盒', subtitle: '滑轨悬索、弹鼓穿梭与终极连环机关', accent: '#f59e0b' }
    ];

    /**
     * 12 handcrafted Cut-the-Rope levels.
     * Each level is verified deterministically via timed scripted actions in tests/cut_rope_test.js.
     */
    const LEVELS = [
        {
            id: 1, chapter: 1, label: '1-1', name: '第一口甜点',
            hint: '划断悬挂糖果的绳子，让糖果垂直落入三星并喂给下方大嘴萌怪！',
            candy: { x: 230, y: 185 },
            omnom: { x: 230, y: 530, r: 28 },
            ropes: [{ id: 'r1', ax: 230, ay: 68, len: 118 }],
            stars: [{ x: 230, y: 280 }, { x: 230, y: 365 }, { x: 230, y: 450 }],
            bubbles: [], cushions: [], portals: [], spikes: [], pads: [], autoRopes: [],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }]
        },
        {
            id: 2, chapter: 1, label: '1-2', name: '双绳秋千',
            hint: '先剪断左绳，利用右绳钟摆荡向右方横扫中间与右侧星核，看准时机再断右绳！',
            candy: { x: 160, y: 215 },
            omnom: { x: 300, y: 525, r: 28 },
            ropes: [
                { id: 'r1', ax: 130, ay: 80, len: 138 },
                { id: 'r2', ax: 280, ay: 80, len: 182 }
            ],
            stars: [{ x: 205, y: 250 }, { x: 255, y: 340 }, { x: 295, y: 445 }],
            bubbles: [], cushions: [], portals: [], spikes: [], pads: [], autoRopes: [],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }, { t: 0.48, act: 'cut', id: 'r2' }]
        },
        {
            id: 3, chapter: 1, label: '1-3', name: '泡泡气囊',
            hint: '先断绳进入泡泡缓缓浮起，收集上方星核后按右推气囊飞向中间再点破气泡喂怪！',
            candy: { x: 140, y: 340 },
            omnom: { x: 252, y: 530, r: 28 },
            ropes: [{ id: 'r1', ax: 140, ay: 215, len: 126 }],
            stars: [{ x: 140, y: 265 }, { x: 245, y: 200 }, { x: 252, y: 390 }],
            bubbles: [{ id: 'b1', x: 140, y: 390, r: 30 }],
            cushions: [{ id: 'c1', x: 75, y: 185, dx: 1, dy: 0, power: 540, range: 280 }],
            portals: [], spikes: [{ x: 95, y: 505, w: 95, h: 16 }], pads: [], autoRopes: [],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }, { t: 2.15, act: 'blow', id: 'c1' }, { t: 2.85, act: 'pop', id: 'b1' }]
        },
        {
            id: 4, chapter: 1, label: '1-4', name: '气泡与抓钩',
            hint: '先断绳进入气泡浮上收星，触发上方自动抓钩后点破气泡摆荡收齐最后星核！',
            candy: { x: 135, y: 350 },
            omnom: { x: 270, y: 525, r: 28 },
            ropes: [{ id: 'r1', ax: 135, ay: 225, len: 126 }],
            stars: [{ x: 135, y: 245 }, { x: 205, y: 285 }, { x: 265, y: 405 }],
            bubbles: [{ id: 'b1', x: 135, y: 405, r: 30 }],
            cushions: [], portals: [], spikes: [], pads: [],
            autoRopes: [{ id: 'a1', ax: 210, ay: 95, triggerR: 135, len: 195 }],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }, { t: 2.35, act: 'pop', id: 'b1' }, { t: 2.85, act: 'cut', id: 'a1' }]
        },
        {
            id: 5, chapter: 1, label: '1-5', name: '尖刺峡谷',
            hint: '正下方潜伏锯齿尖刺！先断左绳荡起，趁掠过尖刺上方安全走廊时接连断绳喂怪。',
            candy: { x: 145, y: 225 },
            omnom: { x: 345, y: 525, r: 28 },
            ropes: [
                { id: 'r1', ax: 115, ay: 90, len: 138 },
                { id: 'r2', ax: 310, ay: 90, len: 215 }
            ],
            stars: [{ x: 205, y: 280 }, { x: 275, y: 340 }, { x: 335, y: 445 }],
            bubbles: [], cushions: [], portals: [],
            spikes: [{ x: 110, y: 420, w: 140, h: 16 }],
            pads: [], autoRopes: [],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }, { t: 0.65, act: 'cut', id: 'r2' }]
        },
        {
            id: 6, chapter: 1, label: '1-6', name: '三星大荡跃',
            hint: '先借高悬弹力绳荡向右侧，触发右上方自动抓钩后再剪断稳稳落入怪口！',
            candy: { x: 120, y: 195 },
            omnom: { x: 315, y: 525, r: 28 },
            ropes: [{ id: 'r1', ax: 210, ay: 72, len: 155 }],
            stars: [{ x: 205, y: 230 }, { x: 252, y: 300 }, { x: 305, y: 420 }],
            bubbles: [], cushions: [], portals: [],
            spikes: [{ x: 145, y: 440, w: 105, h: 16 }],
            pads: [],
            autoRopes: [{ id: 'a1', ax: 295, ay: 105, triggerR: 135, len: 185 }],
            script: [{ t: 0.65, act: 'cut', id: 'r1' }, { t: 1.05, act: 'cut', id: 'a1' }]
        },
        // Chapter 2: Air Cushions, Portals & Pads
        {
            id: 7, chapter: 2, label: '2-1', name: '吹风助推',
            hint: '点击左侧气囊喷出强风，把下坠的糖果吹向右侧收齐双星落入怪嘴！',
            candy: { x: 145, y: 175 },
            omnom: { x: 315, y: 525, r: 28 },
            ropes: [{ id: 'r1', ax: 145, ay: 68, len: 108 }],
            stars: [{ x: 145, y: 255 }, { x: 235, y: 340 }, { x: 310, y: 445 }],
            bubbles: [],
            cushions: [{ id: 'c1', x: 75, y: 295, dx: 1, dy: -0.15, power: 470, range: 260 }],
            portals: [], spikes: [{ x: 90, y: 500, w: 120, h: 16 }], pads: [], autoRopes: [],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }, { t: 0.38, act: 'blow', id: 'c1' }]
        },
        {
            id: 8, chapter: 2, label: '2-2', name: '魔术穿梭',
            hint: '先穿过下方魔术传送帽跃迁至右半场高空，利用自动抓钩调整位置降落投喂！',
            candy: { x: 120, y: 185 },
            omnom: { x: 340, y: 530, r: 28 },
            ropes: [{ id: 'r1', ax: 120, ay: 70, len: 115 }],
            stars: [{ x: 120, y: 300 }, { x: 340, y: 260 }, { x: 340, y: 415 }],
            bubbles: [], cushions: [],
            portals: [
                { pair: 0, x: 120, y: 435, r: 26 },
                { pair: 0, x: 340, y: 135, r: 26 }
            ],
            spikes: [], pads: [], autoRopes: [],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }]
        },
        {
            id: 9, chapter: 2, label: '2-3', name: '弹鼓三重奏',
            hint: '放开糖果精准砸向斜角弹跳鼓，一鼓飞渡越过尖刺山谷直取高空三星！',
            candy: { x: 115, y: 175 },
            omnom: { x: 345, y: 520, r: 28 },
            ropes: [{ id: 'r1', ax: 115, ay: 68, len: 108 }],
            stars: [{ x: 115, y: 290 }, { x: 245, y: 230 }, { x: 345, y: 390 }],
            bubbles: [], cushions: [], portals: [],
            spikes: [{ x: 180, y: 460, w: 100, h: 16 }],
            pads: [{ x: 115, y: 410, w: 86, h: 16, angle: 0.34, power: 680 }],
            autoRopes: [],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }]
        },
        {
            id: 10, chapter: 2, label: '2-4', name: '气囊与泡泡',
            hint: '乘泡泡缓缓浮到右侧吹风带时，激活右侧气囊将其横推穿出收齐最后星核！',
            candy: { x: 325, y: 345 },
            omnom: { x: 215, y: 525, r: 28 },
            ropes: [{ id: 'r1', ax: 325, ay: 225, len: 120 }],
            stars: [{ x: 325, y: 245 }, { x: 235, y: 185 }, { x: 215, y: 390 }],
            bubbles: [{ id: 'b1', x: 325, y: 390, r: 30 }],
            cushions: [{ id: 'c1', x: 395, y: 185, dx: -1, dy: 0, power: 540, range: 280 }],
            portals: [], spikes: [{ x: 275, y: 495, w: 105, h: 16 }], pads: [], autoRopes: [],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }, { t: 2.15, act: 'blow', id: 'c1' }, { t: 2.85, act: 'pop', id: 'b1' }]
        },
        {
            id: 11, chapter: 2, label: '2-5', name: '风道魔帽',
            hint: '借助吹风将下坠糖果送入左侧魔术帽，从右上穿出后直穿高空三星落入怪口！',
            candy: { x: 255, y: 170 },
            omnom: { x: 125, y: 530, r: 28 },
            ropes: [{ id: 'r1', ax: 255, ay: 68, len: 102 }],
            stars: [{ x: 255, y: 255 }, { x: 125, y: 245 }, { x: 125, y: 400 }],
            bubbles: [],
            cushions: [{ id: 'c1', x: 330, y: 270, dx: -1, dy: 0, power: 520, range: 240 }],
            portals: [
                { pair: 0, x: 178, y: 345, r: 28 },
                { pair: 0, x: 125, y: 125, r: 26 }
            ],
            spikes: [{ x: 205, y: 480, w: 130, h: 16 }],
            pads: [], autoRopes: [],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }, { t: 0.36, act: 'blow', id: 'c1' }]
        },
        {
            id: 12, chapter: 2, label: '2-6', name: '糖果终章交响',
            hint: '全机关综合终试！断绳跃鼓、穿梭魔帽、借气泡悬停并戳破收尾三星完美投喂！',
            candy: { x: 110, y: 175 },
            omnom: { x: 345, y: 528, r: 28 },
            ropes: [{ id: 'r1', ax: 110, ay: 68, len: 108 }],
            stars: [{ x: 110, y: 295 }, { x: 235, y: 245 }, { x: 345, y: 365 }],
            bubbles: [],
            cushions: [],
            portals: [
                { pair: 0, x: 245, y: 315, r: 26 },
                { pair: 0, x: 345, y: 150, r: 26 }
            ],
            spikes: [{ x: 185, y: 495, w: 105, h: 16 }],
            pads: [{ x: 110, y: 410, w: 86, h: 16, angle: 0.33, power: 675 }],
            autoRopes: [{ id: 'a1', ax: 345, ay: 72, triggerR: 92, len: 155 }],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }, { t: 1.55, act: 'cut', id: 'a1' }]
        },
        // Chapter 3: Moving Rail Anchors & Clockwork Combos
        {
            id: 13, chapter: 3, label: '3-1', name: '移动滑轨',
            hint: '上方锚点沿轨道左右滑动！看准糖果向右荡起瞬间剪断，划出抛物线连扫三星入嘴。',
            candy: { x: 230, y: 205 },
            omnom: { x: 370, y: 530, r: 28 },
            ropes: [{ id: 'r1', ax: 230, ay: 80, len: 125, slideRange: 72, slideSpeed: 2.2 }],
            stars: [{ x: 308, y: 252 }, { x: 342, y: 365 }, { x: 362, y: 465 }],
            bubbles: [], cushions: [], portals: [],
            spikes: [{ x: 110, y: 495, w: 95, h: 16 }], pads: [], autoRopes: [],
            script: [{ t: 0.72, act: 'cut', id: 'r1' }]
        },
        {
            id: 14, chapter: 3, label: '3-2', name: '滑轨气泡',
            hint: '乘滑轨把糖果推入右侧气泡，上浮穿双星进魔帽，从左侧穿出后待离开帽口立即戳破气泡！',
            candy: { x: 220, y: 345 },
            omnom: { x: 135, y: 525, r: 28 },
            ropes: [{ id: 'r1', ax: 220, ay: 220, len: 125, slideRange: 75, slideSpeed: 2.0 }],
            stars: [{ x: 280, y: 255 }, { x: 280, y: 180 }, { x: 135, y: 390 }],
            bubbles: [{ id: 'b1', x: 280, y: 385, r: 30 }],
            cushions: [],
            portals: [
                { pair: 0, x: 280, y: 120, r: 28 },
                { pair: 0, x: 135, y: 225, r: 26 }
            ],
            spikes: [{ x: 215, y: 495, w: 120, h: 16 }], pads: [], autoRopes: [],
            script: [{ t: 0.78, act: 'cut', id: 'r1' }, { t: 3.45, act: 'pop', id: 'b1' }]
        },
        {
            id: 15, chapter: 3, label: '3-3', name: '双轨转接',
            hint: '从左侧滑轨剪断进入自动抓钩区间，摆向右侧再二次剪断收星入嘴！',
            candy: { x: 150, y: 195 },
            omnom: { x: 315, y: 525, r: 28 },
            ropes: [{ id: 'r1', ax: 150, ay: 75, len: 120, slideRange: 65, slideSpeed: 2.4 }],
            stars: [{ x: 190, y: 235 }, { x: 255, y: 295 }, { x: 308, y: 425 }],
            bubbles: [], cushions: [], portals: [],
            spikes: [{ x: 95, y: 470, w: 120, h: 16 }], pads: [],
            autoRopes: [{ id: 'a1', ax: 225, ay: 110, triggerR: 135, len: 185 }],
            script: [{ t: 0.45, act: 'cut', id: 'r1' }, { t: 1.35, act: 'cut', id: 'a1' }]
        },
        {
            id: 16, chapter: 3, label: '3-4', name: '弹鼓接力',
            hint: '正下方斜角弹跳鼓早已就位，果断断绳借力飞越中央尖刺阵直取左岸！',
            candy: { x: 335, y: 175 },
            omnom: { x: 115, y: 525, r: 28 },
            ropes: [{ id: 'r1', ax: 335, ay: 68, len: 108 }],
            stars: [{ x: 335, y: 280 }, { x: 225, y: 225 }, { x: 115, y: 390 }],
            bubbles: [], cushions: [], portals: [],
            spikes: [{ x: 180, y: 455, w: 110, h: 16 }],
            pads: [{ x: 335, y: 410, w: 88, h: 16, angle: -0.33, power: 675 }],
            autoRopes: [],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }]
        },
        {
            id: 17, chapter: 3, label: '3-5', name: '魔帽回旋',
            hint: '先掉入左下魔帽传至右岸，再按右侧吹风气囊把糖果送回正中央入嘴！',
            candy: { x: 120, y: 175 },
            omnom: { x: 182, y: 525, r: 28 },
            ropes: [{ id: 'r1', ax: 120, ay: 68, len: 106 }],
            stars: [{ x: 120, y: 285 }, { x: 345, y: 185 }, { x: 225, y: 390 }],
            bubbles: [],
            cushions: [{ id: 'c1', x: 395, y: 310, dx: -1, dy: -0.1, power: 520, range: 260 }],
            portals: [
                { pair: 0, x: 120, y: 395, r: 26 },
                { pair: 0, x: 345, y: 145, r: 26 }
            ],
            spikes: [], pads: [], autoRopes: [],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }, { t: 0.85, act: 'blow', id: 'c1' }]
        },
        {
            id: 18, chapter: 3, label: '3-6', name: '机盒大阅兵',
            hint: '先在左路乘气泡升起，再用风囊推入中央魔帽，穿顶帽点破气泡精准喂食！',
            candy: { x: 130, y: 350 },
            omnom: { x: 345, y: 528, r: 28 },
            ropes: [{ id: 'r1', ax: 130, ay: 220, len: 128 }],
            stars: [{ x: 130, y: 255 }, { x: 235, y: 195 }, { x: 345, y: 380 }],
            bubbles: [{ id: 'b1', x: 130, y: 395, r: 30 }],
            cushions: [{ id: 'c1', x: 65, y: 195, dx: 1, dy: 0, power: 540, range: 280 }],
            portals: [
                { pair: 0, x: 285, y: 185, r: 30 },
                { pair: 0, x: 345, y: 135, r: 26 }
            ],
            spikes: [{ x: 95, y: 505, w: 155, h: 16 }],
            pads: [], autoRopes: [],
            script: [{ t: 0.05, act: 'cut', id: 'r1' }, { t: 2.05, act: 'blow', id: 'c1' }, { t: 3.15, act: 'pop', id: 'b1' }]
        }
    ];

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
        const denom = (dy - cy) * (bx - ax) - (dx - cx) * (by - ay);
        if (Math.abs(denom) < 1e-6) return false;
        const ua = ((dx - cx) * (ay - cy) - (dy - cy) * (ax - cx)) / denom;
        const ub = ((bx - ax) * (ay - cy) - (by - ay) * (ax - cx)) / denom;
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    function makeRope(id, ax, ay, len, candyPt, slideRange = 0, slideSpeed = 0) {
        const segCount = Math.max(6, Math.round(len / 14));
        const segLen = len / segCount;
        const pts = [];
        for (let i = 0; i < segCount; i++) {
            const frac = i / segCount;
            const px = ax + (candyPt.x - ax) * frac;
            const py = ay + (candyPt.y - ay) * frac;
            pts.push({ x: px, y: py, oldX: px, oldY: py, pinned: i === 0 });
        }
        pts.push(candyPt);
        const constraints = [];
        for (let i = 0; i < pts.length - 1; i++) {
            constraints.push({ p1: pts[i], p2: pts[i + 1], len: segLen });
        }
        return { id, ax, baseAx: ax, ay, len, slideRange, slideSpeed, points: pts, constraints, cut: false, cutFade: 1 };
    }

    function createSession(levelIndex) {
        const idx = clamp(Math.floor(Number(levelIndex) || 0), 0, LEVELS.length - 1);
        const lvl = LEVELS[idx];

        const candy = {
            x: lvl.candy.x,
            y: lvl.candy.y,
            oldX: lvl.candy.x,
            oldY: lvl.candy.y,
            r: ARENA.candyR,
            rot: 0
        };

        const ropes = lvl.ropes.map((r) => makeRope(r.id, r.ax, r.ay, r.len, candy, r.slideRange || 0, r.slideSpeed || 0));
        const stars = lvl.stars.map((s, i) => ({ id: i, x: s.x, y: s.y, r: 17, collected: false }));
        const bubbles = lvl.bubbles.map((b) => ({ ...b, vx: 0, captured: false, popped: false }));
        const cushions = lvl.cushions.map((c) => ({ ...c, r: 28, puffTimer: 0 }));
        const portals = lvl.portals.map((p) => ({ ...p }));
        const autoRopes = lvl.autoRopes.map((a) => ({ ...a, triggered: false }));
        const pads = lvl.pads.map((p) => ({ ...p, bounceTimer: 0 }));
        const spikes = lvl.spikes.map((s) => ({ ...s }));

        const session = {
            levelIndex: idx,
            level: lvl,
            candy,
            omnom: { ...lvl.omnom, mouthOpen: 0 },
            ropes,
            stars,
            bubbles,
            cushions,
            portals,
            autoRopes,
            pads,
            spikes,
            activeBubble: null,
            portalCooldown: 0,
            time: 0,
            starsCollected: 0,
            state: 'playing', // 'playing' | 'won' | 'lost'
            lossReason: ''
        };

        let acc = 0;

        function sliceLine(x1, y1, x2, y2) {
            if (session.state !== 'playing') return [];
            const events = [];
            for (const rope of session.ropes) {
                if (rope.cut) continue;
                for (const c of rope.constraints) {
                    if (segmentsIntersect(x1, y1, x2, y2, c.p1.x, c.p1.y, c.p2.x, c.p2.y)) {
                        rope.cut = true;
                        rope.points.pop(); // detach candy shared point cleanly
                        events.push({ type: 'cut', id: rope.id, x: (c.p1.x + c.p2.x) * 0.5, y: (c.p1.y + c.p2.y) * 0.5 });
                        break;
                    }
                }
            }
            return events;
        }

        function cutById(id) {
            if (session.state !== 'playing') return [];
            const rope = session.ropes.find((r) => r.id === id && !r.cut);
            if (!rope) return [];
            rope.cut = true;
            rope.points.pop();
            return [{ type: 'cut', id: rope.id, x: rope.ax, y: rope.ay + 40 }];
        }

        function popBubble(idOrPoint) {
            if (session.state !== 'playing') return [];
            const target = typeof idOrPoint === 'string'
                ? session.bubbles.find((b) => b.id === idOrPoint && !b.popped)
                : session.bubbles.find((b) => !b.popped && Math.hypot(b.x - idOrPoint.x, b.y - idOrPoint.y) <= b.r + 14);
            if (!target) return [];
            target.popped = true;
            if (session.activeBubble === target) session.activeBubble = null;
            return [{ type: 'pop', id: target.id, x: target.x, y: target.y }];
        }

        function blowCushion(idOrPoint) {
            if (session.state !== 'playing') return [];
            const target = typeof idOrPoint === 'string'
                ? session.cushions.find((c) => c.id === idOrPoint)
                : session.cushions.find((c) => Math.hypot(c.x - idOrPoint.x, c.y - idOrPoint.y) <= c.r + 14);
            if (!target) return [];
            target.puffTimer = 0.25;
            const range = target.range || 240;
            const d = Math.hypot(candy.x - target.x, candy.y - target.y);
            if (d <= range) {
                const falloff = Math.max(0.45, 1 - d / (range * 1.4));
                const dvx = target.dx * target.power * falloff * ARENA.fixedDt;
                const dvy = target.dy * target.power * falloff * ARENA.fixedDt;
                candy.oldX -= dvx;
                candy.oldY -= dvy;
                if (session.activeBubble) {
                    session.activeBubble.vx += target.dx * target.power * 0.45;
                }
            }
            return [{ type: 'blow', id: target.id, x: target.x, y: target.y, dx: target.dx, dy: target.dy }];
        }

        function stepSub(dt, events) {
            session.time += dt;
            if (session.portalCooldown > 0) session.portalCooldown = Math.max(0, session.portalCooldown - dt);

            for (const c of session.cushions) {
                if (c.puffTimer > 0) c.puffTimer = Math.max(0, c.puffTimer - dt);
            }
            for (const p of session.pads) {
                if (p.bounceTimer > 0) p.bounceTimer = Math.max(0, p.bounceTimer - dt);
            }

            // 1. Bubble capture or buoyancy
            if (!session.activeBubble) {
                for (const b of session.bubbles) {
                    if (b.popped) continue;
                    if (Math.hypot(candy.x - b.x, candy.y - b.y) <= b.r + candy.r * 0.4) {
                        b.captured = true;
                        session.activeBubble = b;
                        candy.oldX = candy.x;
                        candy.oldY = candy.y;
                        events.push({ type: 'capture', x: b.x, y: b.y });
                        break;
                    }
                }
            }

            if (session.activeBubble) {
                const b = session.activeBubble;
                b.y -= 92 * dt;
                b.x += b.vx * dt;
                b.vx *= Math.pow(0.25, dt);
                candy.x = b.x;
                candy.y = b.y;
                candy.oldX = candy.x;
                candy.oldY = candy.y;
                if (b.y < 32) {
                    b.popped = true;
                    session.activeBubble = null;
                    events.push({ type: 'pop', id: b.id, x: b.x, y: b.y });
                }
            } else {
                // Verlet integrate candy
                const vx = (candy.x - candy.oldX) * ARENA.damping;
                const vy = (candy.y - candy.oldY) * ARENA.damping;
                candy.oldX = candy.x;
                candy.oldY = candy.y;
                candy.x += vx;
                candy.y += vy + ARENA.gravity * dt * dt;
                candy.rot += vx * 0.08;
            }

            // 2. Integrate non-candy rope points (including optional sliding rail anchors)
            for (const rope of session.ropes) {
                if (rope.slideRange && !rope.cut && rope.points.length > 0) {
                    rope.ax = rope.baseAx + Math.sin(session.time * rope.slideSpeed) * rope.slideRange;
                    rope.points[0].x = rope.ax;
                    rope.points[0].oldX = rope.ax;
                }
                if (rope.cut) {
                    rope.cutFade = Math.max(0, rope.cutFade - dt * 2.4);
                    continue;
                }
                for (let i = 0; i < rope.points.length - 1; i++) {
                    const p = rope.points[i];
                    if (p.pinned) continue;
                    const vx = (p.x - p.oldX) * 0.985;
                    const vy = (p.y - p.oldY) * 0.985;
                    p.oldX = p.x;
                    p.oldY = p.y;
                    p.x += vx;
                    p.y += vy + ARENA.gravity * dt * dt * 0.5;
                }
            }

            // 3. Constraint Relaxation
            for (let iter = 0; iter < ARENA.solveIters; iter++) {
                for (const rope of session.ropes) {
                    if (rope.cut) continue;
                    for (const c of rope.constraints) {
                        const dx = c.p2.x - c.p1.x;
                        const dy = c.p2.y - c.p1.y;
                        const dist = Math.hypot(dx, dy) || 0.0001;
                        if (dist > c.len || iter < 6) {
                            const diff = (c.len - dist) / dist;
                            const isP2Candy = c.p2 === candy;
                            const w1 = c.p1.pinned ? 0 : (isP2Candy ? 0.82 : 0.5);
                            const w2 = isP2Candy ? 0.18 : 0.5;
                            const wSum = w1 + w2 || 1;
                            if (!c.p1.pinned) {
                                c.p1.x -= dx * diff * (w1 / wSum);
                                c.p1.y -= dy * diff * (w1 / wSum);
                            }
                            c.p2.x += dx * diff * (w2 / wSum);
                            c.p2.y += dy * diff * (w2 / wSum);
                        }
                    }
                }
                // Keep bubble centered with candy if inside bubble
                if (session.activeBubble) {
                    session.activeBubble.x = candy.x;
                    session.activeBubble.y = candy.y;
                }
            }

            // Soft side wall bounce
            if (candy.x < candy.r + 8) {
                candy.x = candy.r + 8;
                candy.oldX = candy.x + Math.abs(candy.x - candy.oldX) * 0.6;
            } else if (candy.x > ARENA.width - candy.r - 8) {
                candy.x = ARENA.width - candy.r - 8;
                candy.oldX = candy.x - Math.abs(candy.x - candy.oldX) * 0.6;
            }

            // 4. Auto-grab ropes
            for (const ar of session.autoRopes) {
                if (ar.triggered) continue;
                if (Math.hypot(candy.x - ar.ax, candy.y - ar.ay) <= ar.triggerR) {
                    ar.triggered = true;
                    const distLen = Math.min(ar.len, Math.max(70, Math.hypot(candy.x - ar.ax, candy.y - ar.ay)));
                    session.ropes.push(makeRope(ar.id, ar.ax, ar.ay, distLen, candy));
                    events.push({ type: 'grab', id: ar.id, x: ar.ax, y: ar.ay });
                }
            }

            // 5. Bouncy Pads
            for (const pad of session.pads) {
                const cos = Math.cos(-pad.angle);
                const sin = Math.sin(-pad.angle);
                const dx = candy.x - pad.x;
                const dy = candy.y - pad.y;
                const lx = dx * cos - dy * sin;
                const ly = dx * sin + dy * cos;
                if (Math.abs(lx) <= pad.w * 0.5 + candy.r * 0.4 && Math.abs(ly) <= pad.h * 0.5 + candy.r) {
                    const nx = Math.sin(pad.angle);
                    const ny = -Math.cos(pad.angle);
                    const spd = pad.power * dt;
                    candy.x = pad.x + nx * (pad.h * 0.5 + candy.r + 2) + Math.cos(pad.angle) * lx * 0.5;
                    candy.y = pad.y + ny * (pad.h * 0.5 + candy.r + 2) + Math.sin(pad.angle) * lx * 0.5;
                    candy.oldX = candy.x - nx * spd;
                    candy.oldY = candy.y - ny * spd;
                    pad.bounceTimer = 0.25;
                    events.push({ type: 'pad', x: candy.x, y: candy.y });
                }
            }

            // 6. Portals (teleport preserving exit velocity vector)
            if (session.portalCooldown <= 0) {
                for (let i = 0; i < session.portals.length; i++) {
                    const p = session.portals[i];
                    if (Math.hypot(candy.x - p.x, candy.y - p.y) <= p.r + candy.r * 0.35) {
                        const partner = session.portals.find((q, qi) => qi !== i && q.pair === p.pair);
                        if (partner) {
                            const vx = candy.x - candy.oldX;
                            const vy = candy.y - candy.oldY;
                            candy.x = partner.x;
                            candy.y = partner.y + 8;
                            candy.oldX = candy.x - vx * 0.12;
                            candy.oldY = candy.y - Math.max(0.5, Math.abs(vy) * 0.65);
                            if (session.activeBubble) {
                                session.activeBubble.x = candy.x;
                                session.activeBubble.y = candy.y;
                            }
                            session.portalCooldown = 0.42;
                            events.push({ type: 'portal', x: partner.x, y: partner.y, fromX: p.x, fromY: p.y });
                            break;
                        }
                    }
                }
            }

            // 7. Collect Stars
            for (const st of session.stars) {
                if (st.collected) continue;
                if (Math.hypot(candy.x - st.x, candy.y - st.y) <= st.r + candy.r) {
                    st.collected = true;
                    session.starsCollected += 1;
                    events.push({ type: 'star', x: st.x, y: st.y, count: session.starsCollected });
                }
            }

            // 8. Check Omnom Feeding (WIN!)
            const distNom = Math.hypot(candy.x - session.omnom.x, candy.y - session.omnom.y);
            session.omnom.mouthOpen = clamp(1 - (distNom - 40) / 110, 0, 1);
            if (distNom <= session.omnom.r + candy.r) {
                session.state = 'won';
                events.push({ type: 'win', x: session.omnom.x, y: session.omnom.y, stars: session.starsCollected });
                return;
            }

            // 9. Check Spikes or Out-of-bounds Drop (LOSS!)
            for (const sp of session.spikes) {
                const cx = clamp(candy.x, sp.x, sp.x + sp.w);
                const cy = clamp(candy.y, sp.y, sp.y + sp.h);
                if (Math.hypot(candy.x - cx, candy.y - cy) < candy.r - 1) {
                    session.state = 'lost';
                    session.lossReason = '糖果触碰到锋利锯齿刺！';
                    events.push({ type: 'lose', x: candy.x, y: candy.y, reason: session.lossReason });
                    return;
                }
            }

            if (candy.y > ARENA.height + 40 || candy.y < -120) {
                session.state = 'lost';
                session.lossReason = '糖果掉出了糖果盒范围！';
                events.push({ type: 'lose', x: candy.x, y: candy.y, reason: session.lossReason });
            }
        }

        session.step = function (dt) {
            if (session.state !== 'playing') return [];
            acc += clamp(dt, 0, 0.05);
            const events = [];
            while (acc >= ARENA.fixedDt && session.state === 'playing') {
                acc -= ARENA.fixedDt;
                stepSub(ARENA.fixedDt, events);
            }
            return events;
        };

        session.sliceLine = sliceLine;
        session.cutById = cutById;
        session.popBubble = popBubble;
        session.blowCushion = blowCushion;

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
        CHAPTERS,
        LEVELS,
        createSession,
        normalizeSave,
        totalStars
    };
});
