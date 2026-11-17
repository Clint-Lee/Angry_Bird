(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PrismLoomEngine = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SAVE_KEY = 'cloudeave_prism_loom_v1';

    // 4-way cardinal directions: N=0, E=1, S=2, W=3
    const DIRS = [
        { dr: -1, dc: 0, name: 'N' },
        { dr: 0, dc: 1, name: 'E' },
        { dr: 1, dc: 0, name: 'S' },
        { dr: 0, dc: -1, name: 'W' }
    ];

    // Mirror reflection lookup:
    // rot 0 = '/' : N(0)<->E(1), S(2)<->W(3)
    // rot 1 = '\' : N(0)<->W(3), E(1)<->S(2)
    const REFLECT = [
        [1, 0, 3, 2],
        [3, 2, 1, 0]
    ];

    const COLORS = {
        1: { mask: 1, name: '炽红', short: '红', hex: '#ff4d6d', glow: 'rgba(255, 77, 109, 0.55)' },
        2: { mask: 2, name: '翡翠', short: '绿', hex: '#34d399', glow: 'rgba(52, 211, 153, 0.55)' },
        4: { mask: 4, name: '苍蓝', short: '蓝', hex: '#38bdf8', glow: 'rgba(56, 189, 248, 0.55)' },
        3: { mask: 3, name: '琥珀金', short: '金', hex: '#fbbf24', glow: 'rgba(251, 191, 36, 0.58)' },
        5: { mask: 5, name: '星紫', short: '紫', hex: '#c084fc', glow: 'rgba(192, 132, 252, 0.58)' },
        6: { mask: 6, name: '碧青', short: '青', hex: '#2dd4bf', glow: 'rgba(45, 212, 191, 0.58)' },
        7: { mask: 7, name: '极光白', short: '白', hex: '#f8fafc', glow: 'rgba(226, 232, 240, 0.62)' }
    };

    const CHAPTERS = [
        { id: 1, name: '折光初境', subtitle: '掌握 45° 镜面折射与障碍绕行，点亮沉睡的星辰晶体', accent: '#38bdf8' },
        { id: 2, name: '分束星门', subtitle: '运用半透分光镜与空间跃迁虫洞，让一束光分身破局', accent: '#c084fc' },
        { id: 3, name: '虹彩织光', subtitle: '原色过滤与三原色叠加混光，编织终极极光圣殿', accent: '#fbbf24' }
    ];

    const LEVELS = [
        // Chapter 1: Mirrors
        {
            id: 1, chapter: 1, label: '1-1', name: '初光试镜',
            rows: 5, cols: 5, parMoves: 1,
            hint: '轻点斜镜切换折射方向，将红光引向北方晶体',
            tiles: [
                { r: 2, c: 0, type: 'emitter', dir: 1, color: 1 },
                { r: 2, c: 3, type: 'mirror', rot: 1, sol: 0 },
                { r: 0, c: 3, type: 'target', color: 1 }
            ]
        },
        {
            id: 2, chapter: 1, label: '1-2', name: '之字迂回',
            rows: 6, cols: 6, parMoves: 3,
            hint: '绕开黑色曜石，连折三面斜镜将蓝光导入左下晶体',
            tiles: [
                { r: 0, c: 1, type: 'emitter', dir: 2, color: 4 },
                { r: 3, c: 1, type: 'block' },
                { r: 2, c: 1, type: 'mirror', rot: 0, sol: 1 },
                { r: 2, c: 4, type: 'mirror', rot: 0, sol: 1 },
                { r: 5, c: 4, type: 'mirror', rot: 1, sol: 0 },
                { r: 5, c: 1, type: 'target', color: 4 }
            ]
        },
        {
            id: 3, chapter: 1, label: '1-3', name: '暗礁回廊',
            rows: 6, cols: 6, parMoves: 4,
            hint: '先向东避开双曜石柱，再沿外环折返右上角',
            tiles: [
                { r: 5, c: 0, type: 'emitter', dir: 0, color: 1 },
                { r: 2, c: 3, type: 'block' },
                { r: 3, c: 3, type: 'block' },
                { r: 1, c: 0, type: 'mirror', rot: 1, sol: 0 },
                { r: 1, c: 2, type: 'mirror', rot: 0, sol: 1 },
                { r: 4, c: 2, type: 'mirror', rot: 0, sol: 1 },
                { r: 4, c: 5, type: 'mirror', rot: 1, sol: 0 },
                { r: 1, c: 5, type: 'target', color: 1 }
            ]
        },
        {
            id: 4, chapter: 1, label: '1-4', name: '双轨交织',
            rows: 6, cols: 6, parMoves: 3,
            hint: '绿光与蓝光会在中心纵横交错，但互不干扰各自抵达终点',
            tiles: [
                { r: 0, c: 2, type: 'emitter', dir: 2, color: 2 },
                { r: 3, c: 2, type: 'mirror', rot: 0, sol: 1 },
                { r: 3, c: 5, type: 'target', color: 2 },
                { r: 1, c: 0, type: 'emitter', dir: 1, color: 4 },
                { r: 1, c: 4, type: 'mirror', rot: 0, sol: 1 },
                { r: 5, c: 4, type: 'mirror', rot: 1, sol: 0 },
                { r: 5, c: 1, type: 'target', color: 4 },
                { r: 2, c: 3, type: 'block' }
            ]
        },
        {
            id: 5, chapter: 1, label: '1-5', name: '螺旋回环',
            rows: 6, cols: 6, parMoves: 4,
            hint: '沿着星盘四角顺时针绕完一圈，命中内庭绿色晶体',
            tiles: [
                { r: 0, c: 0, type: 'emitter', dir: 1, color: 2 },
                { r: 2, c: 2, type: 'block' },
                { r: 2, c: 3, type: 'block' },
                { r: 3, c: 2, type: 'block' },
                { r: 0, c: 5, type: 'mirror', rot: 0, sol: 1 },
                { r: 5, c: 5, type: 'mirror', rot: 1, sol: 0 },
                { r: 5, c: 1, type: 'mirror', rot: 0, sol: 1 },
                { r: 1, c: 1, type: 'mirror', rot: 1, sol: 0 },
                { r: 1, c: 4, type: 'target', color: 2 }
            ]
        },

        // Chapter 2: Splitters & Portals
        {
            id: 6, chapter: 2, label: '2-1', name: '一分为二',
            rows: 6, cols: 6, parMoves: 2,
            hint: '半透分光镜会让一半光直穿、另一半 90° 折射，同时点亮两颗蓝晶',
            tiles: [
                { r: 2, c: 0, type: 'emitter', dir: 1, color: 4 },
                { r: 2, c: 2, type: 'splitter', rot: 1, sol: 0 },
                { r: 0, c: 2, type: 'mirror', rot: 1, sol: 0 },
                { r: 2, c: 5, type: 'target', color: 4 },
                { r: 0, c: 5, type: 'target', color: 4 }
            ]
        },
        {
            id: 7, chapter: 2, label: '2-2', name: '十字星阵',
            rows: 6, cols: 6, parMoves: 2,
            hint: '调整上下两枚半透分光镜，让单一光源分出三路红光',
            tiles: [
                { r: 5, c: 2, type: 'emitter', dir: 0, color: 1 },
                { r: 3, c: 2, type: 'splitter', rot: 1, sol: 0 },
                { r: 1, c: 2, type: 'splitter', rot: 0, sol: 1 },
                { r: 3, c: 5, type: 'target', color: 1 },
                { r: 0, c: 2, type: 'target', color: 1 },
                { r: 1, c: 0, type: 'target', color: 1 },
                { r: 2, c: 4, type: 'block' }
            ]
        },
        {
            id: 8, chapter: 2, label: '2-3', name: '虫洞初跃',
            rows: 6, cols: 6, parMoves: 3,
            hint: '光束进入虫洞后会保持原方向从配对虫洞跃迁射出',
            tiles: [
                { r: 0, c: 0, type: 'emitter', dir: 1, color: 2 },
                { r: 0, c: 4, type: 'mirror', rot: 0, sol: 1 },
                { r: 3, c: 4, type: 'portal', pair: 0 },
                { r: 2, c: 1, type: 'portal', pair: 0 },
                { r: 5, c: 1, type: 'mirror', rot: 0, sol: 1 },
                { r: 5, c: 3, type: 'splitter', rot: 1, sol: 0 },
                { r: 5, c: 5, type: 'target', color: 2 },
                { r: 1, c: 3, type: 'target', color: 2 },
                { r: 3, c: 2, type: 'block' }
            ]
        },
        {
            id: 9, chapter: 2, label: '2-4', name: '四象共振',
            rows: 7, cols: 7, parMoves: 4,
            hint: '借助三枚分光镜与一面反射镜，一次唤醒四枚苍蓝星晶',
            tiles: [
                { r: 3, c: 0, type: 'emitter', dir: 1, color: 4 },
                { r: 3, c: 2, type: 'splitter', rot: 1, sol: 0 },
                { r: 1, c: 2, type: 'mirror', rot: 1, sol: 0 },
                { r: 3, c: 5, type: 'splitter', rot: 0, sol: 1 },
                { r: 5, c: 5, type: 'splitter', rot: 1, sol: 0 },
                { r: 1, c: 5, type: 'target', color: 4 },
                { r: 3, c: 6, type: 'target', color: 4 },
                { r: 5, c: 3, type: 'target', color: 4 },
                { r: 6, c: 5, type: 'target', color: 4 }
            ]
        },
        {
            id: 10, chapter: 2, label: '2-5', name: '星门矩阵',
            rows: 7, cols: 7, parMoves: 4,
            hint: '先在下部完成初次分束，一半直射左上，一半跃迁虫洞接管右上',
            tiles: [
                { r: 6, c: 3, type: 'emitter', dir: 0, color: 1 },
                { r: 4, c: 3, type: 'splitter', rot: 0, sol: 1 },
                { r: 4, c: 0, type: 'mirror', rot: 0, sol: 1 },
                { r: 0, c: 0, type: 'target', color: 1 },
                { r: 2, c: 3, type: 'portal', pair: 0 },
                { r: 5, c: 1, type: 'portal', pair: 0 },
                { r: 1, c: 1, type: 'mirror', rot: 1, sol: 0 },
                { r: 1, c: 4, type: 'splitter', rot: 0, sol: 1 },
                { r: 1, c: 6, type: 'target', color: 1 },
                { r: 5, c: 4, type: 'target', color: 1 },
                { r: 3, c: 2, type: 'block' },
                { r: 3, c: 5, type: 'block' }
            ]
        },

        // Chapter 3: Color Mixing & Filters
        {
            id: 11, chapter: 3, label: '3-1', name: '琥珀之吻',
            rows: 6, cols: 6, parMoves: 2,
            hint: '炽红与翡翠两束光在同一颗晶体内交汇，即可融合为琥珀金光',
            tiles: [
                { r: 2, c: 0, type: 'emitter', dir: 1, color: 1 },
                { r: 2, c: 3, type: 'mirror', rot: 0, sol: 1 },
                { r: 5, c: 1, type: 'emitter', dir: 0, color: 2 },
                { r: 3, c: 1, type: 'mirror', rot: 1, sol: 0 },
                { r: 3, c: 3, type: 'target', color: 3 },
                { r: 1, c: 4, type: 'block' }
            ]
        },
        {
            id: 12, chapter: 3, label: '3-2', name: '紫晶交响',
            rows: 6, cols: 6, parMoves: 3,
            hint: '红+蓝=星紫！利用分光镜分出一缕纯净蓝光同时点亮右上角',
            tiles: [
                { r: 0, c: 1, type: 'emitter', dir: 2, color: 1 },
                { r: 3, c: 1, type: 'mirror', rot: 0, sol: 1 },
                { r: 5, c: 4, type: 'emitter', dir: 0, color: 4 },
                { r: 4, c: 4, type: 'splitter', rot: 1, sol: 0 },
                { r: 4, c: 5, type: 'mirror', rot: 1, sol: 0 },
                { r: 3, c: 4, type: 'target', color: 5 },
                { r: 1, c: 5, type: 'target', color: 4 },
                { r: 2, c: 3, type: 'block' }
            ]
        },
        {
            id: 13, chapter: 3, label: '3-3', name: '三原归一',
            rows: 7, cols: 7, parMoves: 4,
            hint: '将红、绿、蓝三束原色全部汇聚于中央核心，合成极光白光',
            tiles: [
                { r: 0, c: 0, type: 'emitter', dir: 1, color: 1 },
                { r: 0, c: 3, type: 'mirror', rot: 0, sol: 1 },
                { r: 6, c: 0, type: 'emitter', dir: 1, color: 2 },
                { r: 6, c: 3, type: 'mirror', rot: 1, sol: 0 },
                { r: 3, c: 6, type: 'emitter', dir: 3, color: 4 },
                { r: 3, c: 5, type: 'splitter', rot: 1, sol: 0 },
                { r: 5, c: 5, type: 'mirror', rot: 0, sol: 1 },
                { r: 3, c: 3, type: 'target', color: 7 },
                { r: 5, c: 6, type: 'target', color: 4 },
                { r: 2, c: 2, type: 'block' }
            ]
        },
        {
            id: 14, chapter: 3, label: '3-4', name: '分光滤境',
            rows: 7, cols: 7, parMoves: 4,
            hint: '白光蕴含三原色！穿过红色/蓝色滤镜晶体即可分离出对应色光',
            tiles: [
                { r: 3, c: 0, type: 'emitter', dir: 1, color: 7 },
                { r: 3, c: 2, type: 'splitter', rot: 1, sol: 0 },
                { r: 1, c: 2, type: 'mirror', rot: 1, sol: 0 },
                { r: 1, c: 3, type: 'filter', color: 1 },
                { r: 1, c: 4, type: 'mirror', rot: 1, sol: 0 },
                { r: 0, c: 4, type: 'target', color: 1 },
                { r: 3, c: 3, type: 'filter', color: 4 },
                { r: 3, c: 5, type: 'mirror', rot: 1, sol: 0 },
                { r: 1, c: 5, type: 'target', color: 4 }
            ]
        },
        {
            id: 15, chapter: 3, label: '3-5', name: '极光圣殿',
            rows: 7, cols: 7, parMoves: 8,
            hint: '白光分束经红蓝双滤镜+虫洞折跃，再与下方绿光交汇完成全色共鸣',
            tiles: [
                { r: 0, c: 0, type: 'emitter', dir: 1, color: 7 },
                { r: 0, c: 2, type: 'splitter', rot: 0, sol: 1 },
                { r: 0, c: 3, type: 'filter', color: 1 },
                { r: 0, c: 5, type: 'splitter', rot: 0, sol: 1 },
                { r: 0, c: 6, type: 'mirror', rot: 0, sol: 1 },
                { r: 4, c: 6, type: 'portal', pair: 0 },
                { r: 2, c: 1, type: 'portal', pair: 0 },
                { r: 4, c: 1, type: 'mirror', rot: 0, sol: 1 },
                { r: 4, c: 3, type: 'target', color: 3 },
                { r: 2, c: 2, type: 'filter', color: 4 },
                { r: 5, c: 2, type: 'mirror', rot: 0, sol: 1 },
                { r: 5, c: 4, type: 'splitter', rot: 1, sol: 0 },
                { r: 2, c: 4, type: 'mirror', rot: 1, sol: 0 },
                { r: 2, c: 5, type: 'target', color: 5 },
                { r: 5, c: 6, type: 'mirror', rot: 0, sol: 1 },
                { r: 6, c: 6, type: 'target', color: 4 },
                { r: 6, c: 3, type: 'emitter', dir: 0, color: 2 }
            ]
        }
    ];

    function mulberry32(seed) {
        let a = (Number(seed) || 1) >>> 0;
        return function () {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function isRotatable(tile) {
        return !!tile && (tile.type === 'mirror' || tile.type === 'splitter') && !tile.locked;
    }

    function createGrid(rows, cols) {
        const grid = [];
        for (let r = 0; r < rows; r++) {
            const row = [];
            for (let c = 0; c < cols; c++) {
                row.push({ r, c, type: 'empty', rot: 0, color: 0, dir: 0, pair: 0, locked: false, sol: null });
            }
            grid.push(row);
        }
        return grid;
    }

    /**
     * Trace all photon rays across the board with cycle protection.
     * Targets absorb beams and accumulate color bitmask; splitters both pass and reflect.
     */
    function traceRays(grid, rows, cols) {
        const segments = [];
        const events = [];
        const received = Array.from({ length: rows }, () => new Array(cols).fill(0));
        const portalExits = new Map();

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const t = grid[r][c];
                if (t.type === 'portal') {
                    if (!portalExits.has(t.pair)) portalExits.set(t.pair, []);
                    portalExits.get(t.pair).push({ r, c });
                }
            }
        }

        const queue = [];
        const visited = new Set();

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const t = grid[r][c];
                if (t.type === 'emitter' && t.color > 0) {
                    queue.push({ r, c, dir: t.dir, color: t.color });
                }
            }
        }

        let guard = 0;
        while (queue.length > 0 && guard < 400) {
            guard++;
            const start = queue.shift();
            let { r, c, dir, color } = start;
            let segStartR = r;
            let segStartC = c;

            for (let step = 0; step < 64; step++) {
                const d = DIRS[dir];
                const nr = r + d.dr;
                const nc = c + d.dc;

                // Left the board boundary -> terminate just outside border for clean render
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
                    segments.push({
                        r1: segStartR, c1: segStartC,
                        r2: r + d.dr * 0.45, c2: c + d.dc * 0.45,
                        color, dir, edgeOut: true
                    });
                    break;
                }

                const stateKey = `${nr},${nc},${dir},${color}`;
                if (visited.has(stateKey)) {
                    segments.push({ r1: segStartR, c1: segStartC, r2: nr, c2: nc, color, dir });
                    break;
                }
                visited.add(stateKey);

                const cell = grid[nr][nc];
                if (cell.type === 'empty') {
                    r = nr;
                    c = nc;
                    continue;
                }

                if (cell.type === 'block' || cell.type === 'emitter') {
                    segments.push({
                        r1: segStartR, c1: segStartC,
                        r2: nr - d.dr * 0.25, c2: nc - d.dc * 0.25,
                        color, dir
                    });
                    events.push({ type: 'absorb', r: nr, c: nc, color });
                    break;
                }

                if (cell.type === 'target') {
                    segments.push({ r1: segStartR, c1: segStartC, r2: nr, c2: nc, color, dir });
                    received[nr][nc] |= color;
                    events.push({ type: 'hitTarget', r: nr, c: nc, color });
                    break;
                }

                if (cell.type === 'mirror') {
                    segments.push({ r1: segStartR, c1: segStartC, r2: nr, c2: nc, color, dir });
                    events.push({ type: 'reflect', r: nr, c: nc, color });
                    dir = REFLECT[cell.rot & 1][dir];
                    r = nr;
                    c = nc;
                    segStartR = nr;
                    segStartC = nc;
                    continue;
                }

                if (cell.type === 'splitter') {
                    segments.push({ r1: segStartR, c1: segStartC, r2: nr, c2: nc, color, dir });
                    events.push({ type: 'split', r: nr, c: nc, color });
                    const refDir = REFLECT[cell.rot & 1][dir];
                    if (refDir !== dir) {
                        queue.push({ r: nr, c: nc, dir: refDir, color });
                    }
                    r = nr;
                    c = nc;
                    segStartR = nr;
                    segStartC = nc;
                    continue;
                }

                if (cell.type === 'filter') {
                    const outColor = color & cell.color;
                    segments.push({ r1: segStartR, c1: segStartC, r2: nr, c2: nc, color, dir });
                    if (!outColor) {
                        events.push({ type: 'absorb', r: nr, c: nc, color });
                        break;
                    }
                    events.push({ type: 'filter', r: nr, c: nc, color: outColor });
                    color = outColor;
                    r = nr;
                    c = nc;
                    segStartR = nr;
                    segStartC = nc;
                    continue;
                }

                if (cell.type === 'portal') {
                    segments.push({ r1: segStartR, c1: segStartC, r2: nr, c2: nc, color, dir });
                    events.push({ type: 'portal', r: nr, c: nc, color });
                    const mates = portalExits.get(cell.pair) || [];
                    const exit = mates.find((m) => m.r !== nr || m.c !== nc);
                    if (!exit) break;
                    r = exit.r;
                    c = exit.c;
                    segStartR = exit.r;
                    segStartC = exit.c;
                    events.push({ type: 'portal', r: exit.r, c: exit.c, color });
                    continue;
                }
            }
        }

        let targetsTotal = 0;
        let targetsLit = 0;
        let targetsMismatched = 0;
        const targetStates = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const t = grid[r][c];
                if (t.type === 'target') {
                    targetsTotal++;
                    const got = received[r][c];
                    const lit = got === t.color;
                    const mismatch = got > 0 && !lit;
                    if (lit) targetsLit++;
                    if (mismatch) targetsMismatched++;
                    targetStates.push({ r, c, want: t.color, got, lit, mismatch });
                }
            }
        }

        return {
            segments,
            events,
            received,
            targetStates,
            targetsTotal,
            targetsLit,
            targetsMismatched,
            won: targetsTotal > 0 && targetsLit === targetsTotal
        };
    }

    /**
     * Generates a guaranteed-solvable puzzle using deterministic reverse ray routing
     * from a valid beam path + splitter branch + optional color mix, then scrambles mirrors.
     */
    function generatePuzzle(difficulty, seedInput) {
        const seed = (Number(seedInput) || Math.floor(Math.random() * 1e9)) >>> 0;
        const rng = mulberry32(seed);
        const tier = Math.max(1, Number(difficulty) || 1);
        const size = tier <= 3 ? 6 : 7;

        for (let attempt = 0; attempt < 24; attempt++) {
            const grid = createGrid(size, size);
            const pathCells = new Set();

            const emRow = Math.floor(rng() * (size - 2)) + 1;
            const emColor = [1, 2, 4][Math.floor(rng() * 3)];
            grid[emRow][0] = { r: emRow, c: 0, type: 'emitter', dir: 1, color: emColor, rot: 0, pair: 0, locked: false, sol: null };
            pathCells.add(`${emRow},0`);

            let r = emRow;
            let c = 0;
            let dir = 1;
            const bends = Math.min(5, 2 + Math.floor(tier / 2));
            let ok = true;
            let splitSeed = null;

            for (let b = 0; b < bends; b++) {
                const dist = 1 + Math.floor(rng() * (size - 3));
                let nextR = r;
                let nextC = c;
                let stepped = 0;
                for (let k = 1; k <= dist; k++) {
                    const tr = r + DIRS[dir].dr * k;
                    const tc = c + DIRS[dir].dc * k;
                    if (tr <= 0 || tr >= size - 1 || tc <= 0 || tc >= size - 1) break;
                    if (pathCells.has(`${tr},${tc}`)) break;
                    nextR = tr;
                    nextC = tc;
                    stepped = k;
                }
                if (stepped === 0) { ok = false; break; }
                for (let k = 1; k <= stepped; k++) {
                    pathCells.add(`${r + DIRS[dir].dr * k},${c + DIRS[dir].dc * k}`);
                }

                // Choose a perpendicular turn that has at least 1 open step
                const candidates = [0, 1].filter((rot) => {
                    const nd = REFLECT[rot][dir];
                    const tr = nextR + DIRS[nd].dr;
                    const tc = nextC + DIRS[nd].dc;
                    return tr >= 0 && tr < size && tc >= 0 && tc < size && !pathCells.has(`${tr},${tc}`);
                });
                if (candidates.length === 0) { ok = false; break; }

                const solRot = candidates[Math.floor(rng() * candidates.length)];
                const useSplitter = b === bends - 1 && tier >= 2;
                grid[nextR][nextC] = {
                    r: nextR, c: nextC,
                    type: useSplitter ? 'splitter' : 'mirror',
                    rot: solRot,
                    sol: solRot,
                    color: 0, dir: 0, pair: 0, locked: false
                };

                if (useSplitter) {
                    // Check straight extension beyond splitter for 2nd target
                    let sr = nextR + DIRS[dir].dr;
                    let sc = nextC + DIRS[dir].dc;
                    let straightValid = false;
                    while (sr >= 0 && sr < size && sc >= 0 && sc < size && !pathCells.has(`${sr},${sc}`)) {
                        if (sr === 0 || sr === size - 1 || sc === 0 || sc === size - 1 || rng() < 0.45) {
                            grid[sr][sc] = { r: sr, c: sc, type: 'target', color: emColor, rot: 0, dir: 0, pair: 0, locked: false, sol: null };
                            pathCells.add(`${sr},${sc}`);
                            straightValid = true;
                            break;
                        }
                        pathCells.add(`${sr},${sc}`);
                        sr += DIRS[dir].dr;
                        sc += DIRS[dir].dc;
                    }
                    if (!straightValid) {
                        grid[nextR][nextC].type = 'mirror';
                    } else {
                        splitSeed = { r: nextR, c: nextC };
                    }
                }

                dir = REFLECT[solRot][dir];
                r = nextR;
                c = nextC;
            }

            if (!ok) continue;

            // Place primary target along final direction
            let tr = r + DIRS[dir].dr;
            let tc = c + DIRS[dir].dc;
            let targetPlaced = false;
            while (tr >= 0 && tr < size && tc >= 0 && tc < size && !pathCells.has(`${tr},${tc}`)) {
                if (tr === 0 || tr === size - 1 || tc === 0 || tc === size - 1 || rng() < 0.4) {
                    grid[tr][tc] = { r: tr, c: tc, type: 'target', color: emColor, rot: 0, dir: 0, pair: 0, locked: false, sol: null };
                    pathCells.add(`${tr},${tc}`);
                    targetPlaced = true;
                    break;
                }
                pathCells.add(`${tr},${tc}`);
                tr += DIRS[dir].dr;
                tc += DIRS[dir].dc;
            }
            if (!targetPlaced) continue;

            // Optional decorative obsidian blocks on non-path empty tiles
            const blockCount = Math.min(3, Math.floor(tier / 2) + (splitSeed ? 0 : 1));
            for (let bk = 0; bk < blockCount; bk++) {
                const br = Math.floor(rng() * size);
                const bc = Math.floor(rng() * size);
                if (grid[br][bc].type === 'empty' && !pathCells.has(`${br},${bc}`)) {
                    grid[br][bc].type = 'block';
                }
            }

            // Confirm solved state wins before scrambling
            const solvedCheck = traceRays(grid, size, size);
            if (!solvedCheck.won) continue;

            // Scramble rotatable tiles (guarantee initial state is NOT already solved)
            const rotatables = [];
            for (let rr = 0; rr < size; rr++) {
                for (let cc = 0; cc < size; cc++) {
                    if (isRotatable(grid[rr][cc])) rotatables.push(grid[rr][cc]);
                }
            }
            if (rotatables.length < 2) continue;

            let flips = 0;
            for (const rt of rotatables) {
                if (rng() < 0.72) {
                    rt.rot = rt.sol ^ 1;
                    flips++;
                }
            }
            if (flips === 0) {
                rotatables[0].rot = rotatables[0].sol ^ 1;
            }
            if (traceRays(grid, size, size).won) {
                for (const rt of rotatables) rt.rot = rt.sol ^ 1;
            }
            if (traceRays(grid, size, size).won) continue;

            let parMoves = 0;
            for (const rt of rotatables) {
                if (rt.rot !== rt.sol) parMoves++;
            }

            return {
                id: `endless_${seed}`,
                chapter: 0,
                label: `#${seed % 10000}`,
                name: '星渊无穷局',
                rows: size,
                cols: size,
                parMoves: Math.max(1, parMoves),
                hint: '调节镜面与分光镜角度，同时点亮全部星辰晶体',
                grid
            };
        }

        // Deterministic fallback: clone Chapter 1/2 puzzle layout scaled cleanly
        const fallback = LEVELS[(seed + tier) % LEVELS.length];
        const fGrid = createGrid(fallback.rows, fallback.cols);
        for (const t of fallback.tiles) {
            fGrid[t.r][t.c] = {
                r: t.r, c: t.c, type: t.type,
                rot: t.rot || 0, sol: t.sol != null ? t.sol : null,
                color: t.color || 0, dir: t.dir || 0, pair: t.pair || 0, locked: !!t.locked
            };
        }
        return {
            id: `endless_${seed}`,
            chapter: 0,
            label: `#${seed % 10000}`,
            name: '星渊试炼',
            rows: fallback.rows,
            cols: fallback.cols,
            parMoves: fallback.parMoves,
            hint: fallback.hint,
            grid: fGrid
        };
    }

    function createSession(options) {
        const opts = options || {};
        const mode = opts.mode === 'endless' ? 'endless' : 'campaign';
        const levelIndex = Math.max(0, Math.min(LEVELS.length - 1, Number(opts.levelIndex) || 0));

        let rows, cols, grid, meta;
        if (mode === 'campaign') {
            const lvl = LEVELS[levelIndex];
            rows = lvl.rows;
            cols = lvl.cols;
            grid = createGrid(rows, cols);
            for (const t of lvl.tiles) {
                grid[t.r][t.c] = {
                    r: t.r, c: t.c, type: t.type,
                    rot: t.rot || 0, sol: t.sol != null ? t.sol : null,
                    color: t.color || 0, dir: t.dir || 0, pair: t.pair || 0, locked: !!t.locked
                };
            }
            meta = {
                id: lvl.id, chapter: lvl.chapter, label: lvl.label, name: lvl.name,
                parMoves: lvl.parMoves, hint: lvl.hint
            };
        } else {
            const gen = generatePuzzle(opts.difficulty || 1, opts.seed || Date.now());
            rows = gen.rows;
            cols = gen.cols;
            grid = gen.grid;
            meta = {
                id: gen.id, chapter: 0, label: gen.label, name: gen.name,
                parMoves: gen.parMoves, hint: gen.hint
            };
        }

        const initialTrace = traceRays(grid, rows, cols);
        const session = {
            mode,
            levelIndex,
            rows,
            cols,
            grid,
            meta,
            moves: 0,
            undoStack: [],
            trace: initialTrace,
            won: initialTrace.won
        };

        session.rotateTile = function (r, c) {
            if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
            const tile = grid[r][c];
            if (!isRotatable(tile)) return null;

            session.undoStack.push({ r, c, prevRot: tile.rot });
            tile.rot = (tile.rot + 1) & 1;
            session.moves += 1;
            session.trace = traceRays(grid, rows, cols);
            session.won = session.trace.won;
            return { tile, trace: session.trace, won: session.won };
        };

        session.undo = function () {
            if (session.undoStack.length === 0) return null;
            const act = session.undoStack.pop();
            const tile = grid[act.r][act.c];
            tile.rot = act.prevRot;
            session.moves = Math.max(0, session.moves - 1);
            session.trace = traceRays(grid, rows, cols);
            session.won = session.trace.won;
            return { tile, trace: session.trace };
        };

        session.reset = function () {
            while (session.undoStack.length > 0) {
                const act = session.undoStack.pop();
                grid[act.r][act.c].rot = act.prevRot;
            }
            session.moves = 0;
            session.trace = traceRays(grid, rows, cols);
            session.won = session.trace.won;
            return session.trace;
        };

        session.getHint = function () {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const t = grid[r][c];
                    if (isRotatable(t) && t.sol != null && t.rot !== t.sol) {
                        return { r, c, targetRot: t.sol };
                    }
                }
            }
            return null;
        };

        session.evaluateStars = function () {
            if (!session.won) return 0;
            if (session.moves <= meta.parMoves) return 3;
            if (session.moves <= Math.ceil(meta.parMoves * 1.5)) return 2;
            return 1;
        };

        return session;
    }

    function normalizeSave(raw) {
        const clean = {
            muted: !!(raw && raw.muted),
            unlockedLevel: Math.max(1, Math.min(LEVELS.length, Math.floor(Number(raw && raw.unlockedLevel) || 1))),
            currentLevelIndex: Math.max(0, Math.min(LEVELS.length - 1, Math.floor(Number(raw && raw.currentLevelIndex) || 0))),
            endlessSolved: Math.max(0, Math.floor(Number(raw && raw.endlessSolved) || 0)),
            levelStars: {},
            bestMoves: {}
        };
        if (raw && raw.levelStars && typeof raw.levelStars === 'object') {
            for (const lvl of LEVELS) {
                const s = Number(raw.levelStars[lvl.id]);
                if (s > 0) clean.levelStars[lvl.id] = Math.max(1, Math.min(3, Math.floor(s)));
            }
        }
        if (raw && raw.bestMoves && typeof raw.bestMoves === 'object') {
            for (const lvl of LEVELS) {
                const m = Number(raw.bestMoves[lvl.id]);
                if (m > 0) clean.bestMoves[lvl.id] = Math.floor(m);
            }
        }
        return clean;
    }

    function totalCampaignStars(save) {
        if (!save || !save.levelStars) return 0;
        return Object.values(save.levelStars).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }

    return {
        SAVE_KEY,
        DIRS,
        REFLECT,
        COLORS,
        CHAPTERS,
        LEVELS,
        createGrid,
        isRotatable,
        traceRays,
        generatePuzzle,
        createSession,
        normalizeSave,
        totalCampaignStars
    };
});
