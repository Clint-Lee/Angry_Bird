(function (root) {
    'use strict';

    const BOARD_SIZE = 8;

    const COLORS = [
        { id: 0, name: '琥珀金', fill: '#f59e0b', light: '#fde68a', dark: '#b45309', glow: 'rgba(245, 158, 11, 0.55)' },
        { id: 1, name: '翠微绿', fill: '#10b981', light: '#a7f3d0', dark: '#047857', glow: 'rgba(16, 185, 129, 0.55)' },
        { id: 2, name: '苍穹青', fill: '#06b6d4', light: '#a5f3fc', dark: '#0e7490', glow: 'rgba(6, 182, 212, 0.55)' },
        { id: 3, name: '绯樱红', fill: '#f43f5e', light: '#fecdd3', dark: '#be123c', glow: 'rgba(244, 63, 94, 0.55)' },
        { id: 4, name: '星罗紫', fill: '#8b5cf6', light: '#ddd6fe', dark: '#6d28d9', glow: 'rgba(139, 92, 246, 0.55)' },
        { id: 5, name: '海渊蓝', fill: '#3b82f6', light: '#bfdbfe', dark: '#1d4ed8', glow: 'rgba(59, 130, 246, 0.55)' },
    ];

    // Normalized [row, col] relative coordinates anchored at (0, 0) top-left of shape bounding box
    const RAW_SHAPES = [
        { id: 'dot',      tier: 1, weight: 9,  cells: [[0, 0]] },
        { id: 'dom_h',    tier: 1, weight: 12, cells: [[0, 0], [0, 1]] },
        { id: 'dom_v',    tier: 1, weight: 12, cells: [[0, 0], [1, 0]] },
        { id: 'bar3_h',   tier: 1, weight: 12, cells: [[0, 0], [0, 1], [0, 2]] },
        { id: 'bar3_v',   tier: 1, weight: 12, cells: [[0, 0], [1, 0], [2, 0]] },
        { id: 'tri_dr',   tier: 1, weight: 11, cells: [[0, 0], [1, 0], [1, 1]] },
        { id: 'tri_dl',   tier: 1, weight: 11, cells: [[0, 1], [1, 0], [1, 1]] },
        { id: 'tri_ur',   tier: 1, weight: 11, cells: [[0, 0], [0, 1], [1, 0]] },
        { id: 'tri_ul',   tier: 1, weight: 11, cells: [[0, 0], [0, 1], [1, 1]] },
        { id: 'sq2',      tier: 2, weight: 13, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
        { id: 'bar4_h',   tier: 2, weight: 8,  cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
        { id: 'bar4_v',   tier: 2, weight: 8,  cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
        { id: 't4_u',     tier: 2, weight: 8,  cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
        { id: 't4_d',     tier: 2, weight: 8,  cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
        { id: 'l4_r',     tier: 2, weight: 8,  cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
        { id: 'l4_l',     tier: 2, weight: 8,  cells: [[0, 1], [1, 1], [2, 0], [2, 1]] },
        { id: 'z4_a',     tier: 2, weight: 7,  cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
        { id: 'z4_b',     tier: 2, weight: 7,  cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
        { id: 'bar5_h',   tier: 3, weight: 4,  cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
        { id: 'bar5_v',   tier: 3, weight: 4,  cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
        { id: 'big_l_br', tier: 3, weight: 4,  cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]] },
        { id: 'big_l_tl', tier: 3, weight: 4,  cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]] },
        { id: 'sq3',      tier: 3, weight: 3,  cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
    ];

    const SHAPES = RAW_SHAPES.map(shape => {
        let rows = 0;
        let cols = 0;
        for (const [r, c] of shape.cells) {
            if (r + 1 > rows) rows = r + 1;
            if (c + 1 > cols) cols = c + 1;
        }
        return Object.assign({}, shape, { rows, cols });
    });

    const CHAPTERS = [
        { id: 1, name: '星尘初航', accent: '#38bdf8', desc: '熟悉横竖消融与星核采集，点亮第一片星域' },
        { id: 2, name: '翠玉星垣', accent: '#34d399', desc: '熔破单层霜晶与中心壁垒，巧用交叉消除' },
        { id: 3, name: '极光回廊', accent: '#a78bfa', desc: '双重冰封星晶与斜廊迷阵，连消倍增冲高分' },
        { id: 4, name: '棱镜神殿', accent: '#fbbf24', desc: '几何神殿终极试炼，全能策略摘取三星桂冠' },
    ];

    // Legend: '.' empty, '#' obsidian wall, '*' star target core, '1' frost hp1, '2' frost hp2, 'g' pre-placed gem
    const LEVELS = [
        // Chapter 1: 星尘初航 (1..6)
        {
            id: 1, world: 1, name: '1-1 星尘唤醒', goalScore: 320,
            starThresholds: [320, 520, 780],
            hint: '把下方宝石块拖进棋盘，凑满一整行或一整列即可消除！',
            layout: [
                '........',
                '........',
                '...**...',
                '........',
                '........',
                '........',
                '........',
                '........',
            ],
        },
        {
            id: 2, world: 1, name: '1-2 双星呼应', goalScore: 480,
            starThresholds: [480, 760, 1100],
            hint: '尽量让多条线交叉同时消除，分数直接翻倍！',
            layout: [
                '........',
                '.*....*.',
                '........',
                '........',
                '........',
                '........',
                '.*....*.',
                '........',
            ],
        },
        {
            id: 3, world: 1, name: '1-3 角隅晶石', goalScore: 600,
            starThresholds: [600, 950, 1380],
            hint: '四个角落的黑曜石墙体不可消除，围绕它们填满行列吧！',
            layout: [
                '#......#',
                '........',
                '..*..*..',
                '........',
                '........',
                '..*..*..',
                '........',
                '#......#',
            ],
        },
        {
            id: 4, world: 1, name: '1-4 十字星路', goalScore: 760,
            starThresholds: [760, 1200, 1750],
            hint: '中心有两块黑曜石柱，横竖交汇消融能一次击破多枚星核！',
            layout: [
                '........',
                '...**...',
                '........',
                '...##...',
                '...##...',
                '........',
                '...**...',
                '........',
            ],
        },
        {
            id: 5, world: 1, name: '1-5 星翼拱门', goalScore: 900,
            starThresholds: [900, 1420, 2050],
            hint: '连续每次落子都触发消除会累积 COMBO 连消倍率！',
            layout: [
                '#......#',
                '#*....*#',
                '........',
                '..g..g..',
                '........',
                '...**...',
                '........',
                '........',
            ],
        },
        {
            id: 6, world: 1, name: '1-6 启明星阵 · 试炼', goalScore: 1150,
            starThresholds: [1150, 1780, 2500],
            hint: '消除全部 6 枚星核且达到目标分数即可突破第一章！',
            layout: [
                '#......#',
                '..*..*..',
                '........',
                '.*....*.',
                '........',
                '..*..*..',
                '........',
                '#......#',
            ],
        },

        // Chapter 2: 翠玉星垣 (7..12)
        {
            id: 7, world: 2, name: '2-1 霜晶初现', goalScore: 950,
            starThresholds: [950, 1480, 2100],
            hint: '浅青色的霜晶需在所在行或列完成 1 次消除来破除！',
            layout: [
                '........',
                '..1..1..',
                '........',
                '..*..*..',
                '........',
                '..1..1..',
                '........',
                '........',
            ],
        },
        {
            id: 8, world: 2, name: '2-2 翠玉对称', goalScore: 1150,
            starThresholds: [1150, 1760, 2480],
            hint: '用小块填缝保留大空位，等待 4 格或 L 型宝石块！',
            layout: [
                '........',
                '.1....1.',
                '..*..*..',
                '...##...',
                '...##...',
                '..*..*..',
                '.1....1.',
                '........',
            ],
        },
        {
            id: 9, world: 2, name: '2-3 八角晶室', goalScore: 1300,
            starThresholds: [1300, 1950, 2700],
            hint: '八角形棋盘角落已由黑曜石封边，每一行都更容易填满！',
            layout: [
                '##....##',
                '#......#',
                '..1..1..',
                '..*..*..',
                '..*..*..',
                '..1..1..',
                '#......#',
                '##....##',
            ],
        },
        {
            id: 10, world: 2, name: '2-4 双桥过涧', goalScore: 1450,
            starThresholds: [1450, 2150, 2950],
            hint: '先集中清理带有霜晶的通道，给大块留出落脚区。',
            layout: [
                '........',
                '.#....#.',
                '.*1..1*.',
                '........',
                '........',
                '.*1..1*.',
                '.#....#.',
                '........',
            ],
        },
        {
            id: 11, world: 2, name: '2-5 翡翠花瓣', goalScore: 1650,
            starThresholds: [1650, 2400, 3300],
            hint: '交叉十字消融可同时破除两条线上的霜晶与星核！',
            layout: [
                '...##...',
                '........',
                '..1**1..',
                '#..gg..#',
                '#..gg..#',
                '..1**1..',
                '........',
                '...##...',
            ],
        },
        {
            id: 12, world: 2, name: '2-6 星垣守卫 · 试炼', goalScore: 1850,
            starThresholds: [1850, 2750, 3750],
            hint: '连消积攒够「换一批」充能后，危急时可一键更换备选块！',
            layout: [
                '#......#',
                '.1*..*1.',
                '..#..#..',
                '...11...',
                '...11...',
                '..#..#..',
                '.1*..*1.',
                '#......#',
            ],
        },

        // Chapter 3: 极光回廊 (13..18)
        {
            id: 13, world: 3, name: '3-1 双层坚冰', goalScore: 1800,
            starThresholds: [1800, 2700, 3700],
            hint: '厚霜晶（标有 2 点雪花纹）需消除 2 次才能完全破冰！',
            layout: [
                '........',
                '...22...',
                '..*..*..',
                '........',
                '........',
                '..*..*..',
                '...22...',
                '........',
            ],
        },
        {
            id: 14, world: 3, name: '3-2 极光阶梯', goalScore: 2050,
            starThresholds: [2050, 3000, 4100],
            hint: '如果一次十字消除同时命中横行与竖列，坚冰会一次直接融化两层！',
            layout: [
                '........',
                '.2....*.',
                '..#.....',
                '...11...',
                '...11...',
                '.....#..',
                '.*....2.',
                '........',
            ],
        },
        {
            id: 15, world: 3, name: '3-3 回廊迷镜', goalScore: 2200,
            starThresholds: [2200, 3250, 4400],
            hint: '预先留意悬停高亮的金绿预消光束，一石二鸟破冰最省步数！',
            layout: [
                '#......#',
                '..2..2..',
                '..*##*..',
                '........',
                '........',
                '..*##*..',
                '..2..2..',
                '#......#',
            ],
        },
        {
            id: 16, world: 3, name: '3-4 幻彩织网', goalScore: 2450,
            starThresholds: [2450, 3550, 4800],
            hint: '棋盘预置了不少宝石，顺势补齐最后 1-2 格立刻触发连爆！',
            layout: [
                'g......g',
                '.1*..*1.',
                '..g22g..',
                '...##...',
                '...##...',
                '..g22g..',
                '.1*..*1.',
                'g......g',
            ],
        },
        {
            id: 17, world: 3, name: '3-5 极境风眼', goalScore: 2700,
            starThresholds: [2700, 3900, 5200],
            hint: '外环黑曜石构成双环通道，尽量把小条放进缝隙清边角。',
            layout: [
                '##....##',
                '#..22..#',
                '..*..*..',
                '.2.##.2.',
                '.2.##.2.',
                '..*..*..',
                '#..22..#',
                '##....##',
            ],
        },
        {
            id: 18, world: 3, name: '3-6 极光圣殿 · 试炼', goalScore: 2950,
            starThresholds: [2950, 4300, 5800],
            hint: '突破第三章全部冰晶封锁与星核指标！',
            layout: [
                '#..##..#',
                '.2*..*2.',
                '........',
                '#..11..#',
                '#..11..#',
                '........',
                '.2*..*2.',
                '#..##..#',
            ],
        },

        // Chapter 4: 棱镜神殿 (19..24)
        {
            id: 19, world: 4, name: '4-1 棱镜沙漏', goalScore: 3100,
            starThresholds: [3100, 4500, 6100],
            hint: '沙漏收窄腰部两侧是连消黄金点，千万别随手堵死！',
            layout: [
                '........',
                '.1*..*1.',
                '##....##',
                '..2..2..',
                '..2..2..',
                '##....##',
                '.1*..*1.',
                '........',
            ],
        },
        {
            id: 20, world: 4, name: '4-2 四象星枢', goalScore: 3400,
            starThresholds: [3400, 4900, 6600],
            hint: '四象堡垒各镇守一枚星核，规划十字交叉清理最高效！',
            layout: [
                '..#..#..',
                '.*2..2*.',
                '#......#',
                '...gg...',
                '...gg...',
                '#......#',
                '.*2..2*.',
                '..#..#..',
            ],
        },
        {
            id: 21, world: 4, name: '4-3 虚空棋局', goalScore: 3700,
            starThresholds: [3700, 5300, 7100],
            hint: '充分利用长条形状贯穿障碍缝隙！',
            layout: [
                '#......#',
                '.2*11*2.',
                '..#..#..',
                '1......1',
                '1......1',
                '..#..#..',
                '.2*11*2.',
                '#......#',
            ],
        },
        {
            id: 22, world: 4, name: '4-4 王冠加冕', goalScore: 4000,
            starThresholds: [4000, 5750, 7600],
            hint: '保持 3 连消以上能让得分呈指数级攀升！',
            layout: [
                '##....##',
                '.2*..*2.',
                '.1#22#1.',
                '........',
                '........',
                '.1#22#1.',
                '.2*..*2.',
                '##....##',
            ],
        },
        {
            id: 23, world: 4, name: '4-5 永夜星炉', goalScore: 4400,
            starThresholds: [4400, 6200, 8200],
            hint: '倒数第二关！谨慎规划每一组三块顺序，尽量别留下孤立单格。',
            layout: [
                '#.#..#.#',
                '.2*..*2.',
                '..2112..',
                '...##...',
                '...##...',
                '..2112..',
                '.2*..*2.',
                '#.#..#.#',
            ],
        },
        {
            id: 24, world: 4, name: '4-6 终极星曜神殿', goalScore: 5000,
            starThresholds: [5000, 7000, 9200],
            hint: '最终决战：打破全部双重坚冰与 8 枚星核，登顶三星满贯！',
            layout: [
                '##*..*##',
                '#2....2#',
                '*..##..*',
                '.1.gg.1.',
                '.1.gg.1.',
                '*..##..*',
                '#2....2#',
                '##*..*##',
            ],
        },
    ];

    function createEmptyBoard() {
        return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    }

    function cloneBoard(board) {
        return board.map(row => row.map(cell => (cell ? Object.assign({}, cell) : null)));
    }

    function createLevelBoard(levelIndex) {
        const level = LEVELS[levelIndex] || LEVELS[0];
        const board = createEmptyBoard();
        for (let r = 0; r < BOARD_SIZE; r++) {
            const rowStr = (level.layout[r] || '........');
            for (let c = 0; c < BOARD_SIZE; c++) {
                const ch = rowStr[c] || '.';
                const colorIdx = (r + c + level.id) % COLORS.length;
                if (ch === '#') {
                    board[r][c] = { kind: 'wall' };
                } else if (ch === '*') {
                    board[r][c] = { kind: 'target', color: colorIdx };
                } else if (ch === '1') {
                    board[r][c] = { kind: 'frost', hp: 1, color: 2 };
                } else if (ch === '2') {
                    board[r][c] = { kind: 'frost', hp: 2, color: 5 };
                } else if (ch === 'g') {
                    board[r][c] = { kind: 'gem', color: colorIdx };
                }
            }
        }
        return board;
    }

    function countBoardObjectives(board) {
        let targets = 0;
        let frosts = 0;
        let gems = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = board[r][c];
                if (!cell) continue;
                if (cell.kind === 'target') targets++;
                else if (cell.kind === 'frost') frosts++;
                else if (cell.kind === 'gem') gems++;
            }
        }
        return { targets, frosts, gems };
    }

    function canPlace(board, shape, startRow, startCol) {
        if (!shape || !Array.isArray(shape.cells)) return false;
        for (let i = 0; i < shape.cells.length; i++) {
            const r = startRow + shape.cells[i][0];
            const c = startCol + shape.cells[i][1];
            if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
            if (board[r][c] !== null) return false;
        }
        return true;
    }

    function canShapeFitAnywhere(board, shape) {
        if (!shape) return false;
        for (let r = 0; r <= BOARD_SIZE - shape.rows; r++) {
            for (let c = 0; c <= BOARD_SIZE - shape.cols; c++) {
                if (canPlace(board, shape, r, c)) return true;
            }
        }
        return false;
    }

    function hasAnyValidMove(board, tray) {
        if (!Array.isArray(tray)) return false;
        return tray.some(piece => piece && !piece.used && canShapeFitAnywhere(board, piece.shape));
    }

    // Returns { rows: number[], cols: number[] } for all lines currently filled (non-null across all 8 cells and >= 1 clearable cell)
    function findCompletedLines(board) {
        const rows = [];
        const cols = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            let full = true;
            let clearable = 0;
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = board[r][c];
                if (cell === null) {
                    full = false;
                    break;
                }
                if (cell.kind !== 'wall') clearable++;
            }
            if (full && clearable > 0) rows.push(r);
        }

        for (let c = 0; c < BOARD_SIZE; c++) {
            let full = true;
            let clearable = 0;
            for (let r = 0; r < BOARD_SIZE; r++) {
                const cell = board[r][c];
                if (cell === null) {
                    full = false;
                    break;
                }
                if (cell.kind !== 'wall') clearable++;
            }
            if (full && clearable > 0) cols.push(c);
        }

        return { rows, cols };
    }

    // Simulates placing shape WITHOUT mutating board; returns rows & cols that would clear for hover pre-glow!
    function previewPlacementClears(board, shape, startRow, startCol) {
        if (!canPlace(board, shape, startRow, startCol)) return { valid: false, rows: [], cols: [] };
        const sim = cloneBoard(board);
        for (const [dr, dc] of shape.cells) {
            sim[startRow + dr][startCol + dc] = { kind: 'gem', color: 0 };
        }
        const cleared = findCompletedLines(sim);
        return { valid: true, rows: cleared.rows, cols: cleared.cols };
    }

    function applyPlacement(board, piece, startRow, startCol, currentCombo = 0) {
        if (!piece || !canPlace(board, piece.shape, startRow, startCol)) {
            return { ok: false };
        }

        const nextBoard = cloneBoard(board);
        const placedCells = [];
        for (const [dr, dc] of piece.shape.cells) {
            const r = startRow + dr;
            const c = startCol + dc;
            nextBoard[r][c] = { kind: 'gem', color: piece.color };
            placedCells.push([r, c]);
        }

        const { rows, cols } = findCompletedLines(nextBoard);
        const rowSet = new Set(rows);
        const colSet = new Set(cols);
        const clearedLines = rows.length + cols.length;

        const effects = [];
        let clearedTargets = 0;
        let meltedFrost = 0;
        let clearedGems = 0;

        if (clearedLines > 0) {
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    const hits = (rowSet.has(r) ? 1 : 0) + (colSet.has(c) ? 1 : 0);
                    if (hits === 0) continue;
                    const cell = nextBoard[r][c];
                    if (!cell || cell.kind === 'wall') continue;

                    if (cell.kind === 'frost') {
                        const prevHp = cell.hp || 1;
                        const remain = prevHp - hits;
                        if (remain > 0) {
                            cell.hp = remain;
                            effects.push({ r, c, type: 'frost-crack', color: cell.color, hits });
                        } else {
                            meltedFrost++;
                            effects.push({ r, c, type: 'frost-shatter', color: cell.color });
                            nextBoard[r][c] = null;
                        }
                    } else if (cell.kind === 'target') {
                        clearedTargets++;
                        effects.push({ r, c, type: 'target-clear', color: cell.color });
                        nextBoard[r][c] = null;
                    } else {
                        clearedGems++;
                        effects.push({ r, c, type: 'gem-clear', color: cell.color });
                        nextBoard[r][c] = null;
                    }
                }
            }
        }

        const nextCombo = clearedLines > 0 ? currentCombo + 1 : 0;
        const placeScore = piece.shape.cells.length * 10;
        const lineScore = clearedLines === 0 ? 0
            : (clearedLines === 1 ? 120
                : clearedLines === 2 ? 320
                    : clearedLines === 3 ? 600
                        : 1000 + (clearedLines - 4) * 380);
        const comboBonus = (clearedLines > 0 && nextCombo > 1) ? nextCombo * 80 * clearedLines : 0;
        const crossBonus = (rows.length > 0 && cols.length > 0) ? 150 : 0;
        const objectiveBonus = clearedTargets * 80 + meltedFrost * 60;
        const totalGain = placeScore + lineScore + comboBonus + crossBonus + objectiveBonus;

        return {
            ok: true,
            board: nextBoard,
            placedCells,
            clearedRows: rows,
            clearedCols: cols,
            clearedLines,
            isCrossClear: rows.length > 0 && cols.length > 0,
            combo: nextCombo,
            scoreGain: totalGain,
            clearedTargets,
            meltedFrost,
            clearedGems,
            effects,
        };
    }

    function weightedPick(items, rng = Math.random) {
        let total = 0;
        for (const item of items) total += (item.weight || 1);
        let roll = rng() * total;
        for (const item of items) {
            roll -= (item.weight || 1);
            if (roll <= 0) return item;
        }
        return items[items.length - 1];
    }

    function dealTray(board, rng = Math.random) {
        const fitShapes = SHAPES.filter(s => canShapeFitAnywhere(board, s));
        const pool = fitShapes.length > 0 ? fitShapes : SHAPES;
        const smallOrMed = pool.filter(s => s.tier <= 2);

        const tray = [];
        for (let i = 0; i < 3; i++) {
            let candidates;
            if (i === 0 && fitShapes.length > 0) {
                // Guarantee at least one playable fit from current board geometry
                candidates = fitShapes;
            } else if (i === 2 && smallOrMed.length > 0 && tray.every(p => p.shape.tier >= 2)) {
                candidates = smallOrMed;
            } else {
                candidates = SHAPES;
            }
            const shape = weightedPick(candidates, rng);
            const color = Math.floor(rng() * COLORS.length);
            tray.push({
                uid: `p_${Date.now()}_${i}_${Math.floor(rng() * 1e6)}`,
                shape,
                color,
                used: false,
            });
        }
        return tray;
    }

    function evaluateLevelStatus(levelIndex, board, score) {
        const level = LEVELS[levelIndex] || LEVELS[0];
        const obj = countBoardObjectives(board);
        const goalsCleared = obj.targets === 0 && obj.frosts === 0;
        const won = goalsCleared && score >= level.goalScore;
        let stars = 0;
        if (won) {
            const [s1, s2, s3] = level.starThresholds;
            stars = score >= s3 ? 3 : (score >= s2 ? 2 : (score >= s1 ? 1 : 1));
        }
        return {
            won,
            goalsCleared,
            remainingTargets: obj.targets,
            remainingFrosts: obj.frosts,
            stars,
        };
    }

    const api = {
        BOARD_SIZE,
        COLORS,
        SHAPES,
        CHAPTERS,
        LEVELS,
        createEmptyBoard,
        cloneBoard,
        createLevelBoard,
        countBoardObjectives,
        canPlace,
        canShapeFitAnywhere,
        hasAnyValidMove,
        findCompletedLines,
        previewPlacementClears,
        applyPlacement,
        dealTray,
        evaluateLevelStatus,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.LuminaEngine = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
