(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SokobanEngine = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SAVE_KEY = 'cloudeave_sokoban_v1';

    // Classic solver-verified Microban-inspired warehouse puzzles (# wall, $ crate, . goal, @ player, * box on goal, + player on goal)
    const LEVELS = [
        {
            id: 1,
            name: '双箱热身',
            par: 7,
            map: [
                '#######',
                '# . . #',
                '# $ $ #',
                '#  @  #',
                '#  #  #',
                '#######'
            ]
        },
        {
            id: 2,
            name: '转角回廊',
            par: 13,
            map: [
                '######',
                '# .  #',
                '# $$ #',
                '# .@##',
                '#    #',
                '######'
            ]
        },
        {
            id: 3,
            name: '初入仓库',
            par: 15,
            map: [
                '#######',
                '#     #',
                '# .$. #',
                '# $@$ #',
                '#  .  #',
                '#######'
            ]
        },
        {
            id: 4,
            name: '回字内院',
            par: 16,
            map: [
                '########',
                '#  . . #',
                '# $$## #',
                '#  @   #',
                '# #$## #',
                '#  .   #',
                '########'
            ]
        },
        {
            id: 5,
            name: '双路错位',
            par: 17,
            map: [
                '######',
                '#    #',
                '# #@ #',
                '# $* #',
                '# .* #',
                '#    #',
                '######'
            ]
        },
        {
            id: 6,
            name: '三连货架',
            par: 20,
            map: [
                '#######',
                '#  .  #',
                '# #.# #',
                '#  .  #',
                '# $$$ #',
                '#  @  #',
                '#     #',
                '#######'
            ]
        },
        {
            id: 7,
            name: '窄道挪移',
            par: 22,
            map: [
                '  ##### ',
                '###   # ',
                '#   $ ##',
                '# .$.  #',
                '# #$## #',
                '# . @  #',
                '########'
            ]
        },
        {
            id: 8,
            name: '顺势拐弯',
            par: 25,
            map: [
                '#######',
                '# . . #',
                '# .$$ #',
                '# #$  #',
                '#   @ #',
                '#######'
            ]
        },
        {
            id: 9,
            name: '错落金库',
            par: 26,
            map: [
                '########',
                '#   .  #',
                '# #$$# #',
                '# .$@$.#',
                '# #$.# #',
                '#  .   #',
                '########'
            ]
        },
        {
            id: 10,
            name: '六箱总库',
            par: 28,
            map: [
                '#########',
                '# .   . #',
                '# #$$$# #',
                '#  .@.  #',
                '# #$$$# #',
                '# .   . #',
                '#########'
            ]
        },
        {
            id: 11,
            name: '对称谜局',
            par: 31,
            map: [
                '#########',
                '#  . .  #',
                '# $$ $$ #',
                '#  .#.  #',
                '#   @   #',
                '#########'
            ]
        },
        {
            id: 12,
            name: '口袋借道',
            par: 35,
            map: [
                '####  ',
                '# .#  ',
                '#  ###',
                '#*@  #',
                '#  $ #',
                '#  ###',
                '####  '
            ]
        },
        {
            id: 13,
            name: '狭路相逢',
            par: 36,
            map: [
                ' ######',
                ' #    #',
                '## ## #',
                '#  $  #',
                '# .#. #',
                '#  $@ #',
                '# .#$ #',
                '#     #',
                '#######'
            ]
        },
        {
            id: 14,
            name: '小岛绕行',
            par: 38,
            map: [
                '  ##### ',
                '###   # ',
                '#.@$  # ',
                '### $.# ',
                '#.##$ # ',
                '# # . ##',
                '#$ *$$.#',
                '#   .  #',
                '########'
            ]
        },
        {
            id: 15,
            name: '三重迂回',
            par: 40,
            map: [
                '  #### ',
                '###  # ',
                '#  @ # ',
                '#  $.# ',
                '#  $.##',
                '###$. #',
                '  #   #',
                '  #####'
            ]
        },
        {
            id: 16,
            name: '借角换位',
            par: 19,
            map: [
                '########',
                '#*.  $ #',
                '#    $ #',
                '#.   #@#',
                '#   ####',
                '#  #####',
                '########'
            ]
        },
        {
            id: 17,
            name: '工字仓储',
            par: 19,
            map: [
                '#######',
                '# @.  #',
                '## *$ #',
                '#.  $ #',
                '## ## #',
                '#######'
            ]
        },
        {
            id: 18,
            name: 'L形巷道',
            par: 19,
            map: [
                '########',
                '#+$    #',
                '#$   # #',
                '#      #',
                '#. #  ##',
                '# .$  ##',
                '########'
            ]
        },
        {
            id: 19,
            name: '月牙暗格',
            par: 20,
            map: [
                '#######',
                '#  .# #',
                '# . $ #',
                '# .$$@#',
                '#  #  #',
                '#######'
            ]
        },
        {
            id: 20,
            name: '阶梯分拣',
            par: 20,
            map: [
                '########',
                '#      #',
                '#  $*$@#',
                '# . . ##',
                '###    #',
                '#    # #',
                '########'
            ]
        },
        {
            id: 21,
            name: '三岔路口',
            par: 21,
            map: [
                '#######',
                '#*..$ #',
                '##  # #',
                '#   $ #',
                '# @   #',
                '#######'
            ]
        },
        {
            id: 22,
            name: '双环交错',
            par: 22,
            map: [
                '#######',
                '##.## #',
                '#.  $ #',
                '#*$   #',
                '#@#   #',
                '#######'
            ]
        },
        {
            id: 23,
            name: '斜角对推',
            par: 22,
            map: [
                '########',
                '# ##   #',
                '# $   $#',
                '#    ..#',
                '#@   # #',
                '# $ . ##',
                '########'
            ]
        },
        {
            id: 24,
            name: '深巷回头',
            par: 22,
            map: [
                '#######',
                '# $ ..#',
                '#    $#',
                '# # $ #',
                '#@ . ##',
                '#######'
            ]
        },
        {
            id: 25,
            name: '菱形货台',
            par: 22,
            map: [
                '#######',
                '## #  #',
                '# $   #',
                '#@$ ..#',
                '# $ . #',
                '#######'
            ]
        },
        {
            id: 26,
            name: '双门并行',
            par: 23,
            map: [
                '########',
                '##.  $ #',
                '#. # $ #',
                '#    @ #',
                '# $ . ##',
                '#   # ##',
                '########'
            ]
        },
        {
            id: 27,
            name: '错位中庭',
            par: 23,
            map: [
                '########',
                '#   #@ #',
                '#    $ #',
                '##  .$ #',
                '#    # #',
                '#   .*##',
                '########'
            ]
        },
        {
            id: 28,
            name: '盲巷腾挪',
            par: 24,
            map: [
                '#######',
                '#.# # #',
                '#.  $.#',
                '#$@ $ #',
                '#     #',
                '#######'
            ]
        },
        {
            id: 29,
            name: '方阵回转',
            par: 24,
            map: [
                '########',
                '# ## @ #',
                '#.$ $$*#',
                '# #    #',
                '### .  #',
                '#.     #',
                '########'
            ]
        },
        {
            id: 30,
            name: '仓库中站',
            par: 24,
            map: [
                '########',
                '#. . $ #',
                '# #  $@#',
                '# .  $ #',
                '# #  ###',
                '# *# ###',
                '########'
            ]
        },
        {
            id: 31,
            name: '双耳密室',
            par: 24,
            map: [
                '########',
                '##*. # #',
                '# #    #',
                '#.     #',
                '# $$ #@#',
                '#   .$ #',
                '########'
            ]
        },
        {
            id: 32,
            name: '四柱星阵',
            par: 24,
            map: [
                '########',
                '#    . #',
                '# $.$# #',
                '#  *.# #',
                '#    $ #',
                '#    #@#',
                '########'
            ]
        },
        {
            id: 33,
            name: '偏厅转运',
            par: 24,
            map: [
                '########',
                '#*     #',
                '## .#  #',
                '###.# .#',
                '#@$$# $#',
                '#      #',
                '########'
            ]
        },
        {
            id: 34,
            name: '曲径单行',
            par: 25,
            map: [
                '########',
                '##     #',
                '### $  #',
                '# $.#  #',
                '#     $#',
                '###. #+#',
                '########'
            ]
        },
        {
            id: 35,
            name: '对称锁扣',
            par: 25,
            map: [
                '########',
                '# .    #',
                '# #  $ #',
                '# #$   #',
                '#*+. $ #',
                '# #   ##',
                '########'
            ]
        },
        {
            id: 36,
            name: '三步折返',
            par: 25,
            map: [
                '########',
                '#      #',
                '#$#    #',
                '#      #',
                '# *#$. #',
                '#. #@$.#',
                '########'
            ]
        },
        {
            id: 37,
            name: '十字分流',
            par: 25,
            map: [
                '########',
                '# $ .* #',
                '# $    #',
                '# @ #  #',
                '# $ . ##',
                '##   .##',
                '########'
            ]
        },
        {
            id: 38,
            name: '叠箱暗道',
            par: 28,
            map: [
                '########',
                '#  #   #',
                '#@$  #$#',
                '#  . $ #',
                '# *  ..#',
                '# # #  #',
                '########'
            ]
        },
        {
            id: 39,
            name: '侧翼包抄',
            par: 28,
            map: [
                '########',
                '#  #.$ #',
                '#  . $ #',
                '#.##.# #',
                '#$# $# #',
                '#     @#',
                '########'
            ]
        },
        {
            id: 40,
            name: '四方总仓',
            par: 28,
            map: [
                '########',
                '#@##.  #',
                '#$     #',
                '#. # #.#',
                '# ##$$ #',
                '# .  $ #',
                '########'
            ]
        },
        {
            id: 41,
            name: '回环卸货',
            par: 29,
            map: [
                '########',
                '#   . ##',
                '## $   #',
                '#  #  $#',
                '##.$   #',
                '#+$   .#',
                '########'
            ]
        },
        {
            id: 42,
            name: '双层月台',
            par: 29,
            map: [
                '########',
                '# #..$@#',
                '#.#$## #',
                '#   .$ #',
                '#  # $ #',
                '## #   #',
                '########'
            ]
        },
        {
            id: 43,
            name: '折角迷障',
            par: 30,
            map: [
                '#######',
                '#    .#',
                '# #$$+#',
                '# # *##',
                '#   ###',
                '#######'
            ]
        },
        {
            id: 44,
            name: '暗室藏箱',
            par: 30,
            map: [
                '########',
                '# $ .# #',
                '#    $ #',
                '# . #.@#',
                '# ## $ #',
                '# $.#  #',
                '########'
            ]
        },
        {
            id: 45,
            name: '狭口串行',
            par: 30,
            map: [
                '########',
                '# $   .#',
                '# $#   #',
                '#   @#*#',
                '# #$  .#',
                '#  . ###',
                '########'
            ]
        },
        {
            id: 46,
            name: '五箱矩阵',
            par: 30,
            map: [
                '########',
                '#.  $  #',
                '#  $*$ #',
                '# #..# #',
                '#@#### #',
                '#      #',
                '########'
            ]
        },
        {
            id: 47,
            name: '天平交错',
            par: 30,
            map: [
                '########',
                '# $   .#',
                '# # #  #',
                '# # *  #',
                '#@$ #  #',
                '# $.  .#',
                '########'
            ]
        },
        {
            id: 48,
            name: '双岛联运',
            par: 30,
            map: [
                '########',
                '#. #  ##',
                '#    $ #',
                '#  #.#@#',
                '#$$. * #',
                '#     ##',
                '########'
            ]
        },
        {
            id: 49,
            name: '拐点死斗',
            par: 31,
            map: [
                '########',
                '#.##   #',
                '#.# $ .#',
                '#   #  #',
                '#$ $ $.#',
                '#    @##',
                '########'
            ]
        },
        {
            id: 50,
            name: '密道归仓',
            par: 31,
            map: [
                '########',
                '#     @#',
                '#$$*$  #',
                '#.    ##',
                '#.  ####',
                '##    .#',
                '########'
            ]
        },
        {
            id: 51,
            name: '长廊倒序',
            par: 31,
            map: [
                '########',
                '#*..$+ #',
                '###    #',
                '#    # #',
                '# # $$ #',
                '#      #',
                '########'
            ]
        },
        {
            id: 52,
            name: '连环卡口',
            par: 31,
            map: [
                '########',
                '#  #  ##',
                '#  $ $.#',
                '# . @ $#',
                '# .* # #',
                '#      #',
                '########'
            ]
        },
        {
            id: 53,
            name: '中枢互换',
            par: 32,
            map: [
                '########',
                '#  $.  #',
                '#    .##',
                '# $# # #',
                '# $ $..#',
                '# #@ # #',
                '########'
            ]
        },
        {
            id: 54,
            name: '星门调度',
            par: 34,
            map: [
                '########',
                '# #*#  #',
                '# $..$ #',
                '#  # # #',
                '# $##  #',
                '#@ .   #',
                '########'
            ]
        },
        {
            id: 55,
            name: '深库腾挪',
            par: 34,
            map: [
                '########',
                '##.    #',
                '#  $.* #',
                '#    # #',
                '#. $ $ #',
                '##  # @#',
                '########'
            ]
        },
        {
            id: 56,
            name: '井字换轨',
            par: 34,
            map: [
                '########',
                '# +    #',
                '# # $  #',
                '# *##  #',
                '# $  . #',
                '# $.  ##',
                '########'
            ]
        },
        {
            id: 57,
            name: '铁壁双枢',
            par: 35,
            map: [
                '########',
                '#.   . #',
                '#.     #',
                '#  $ * #',
                '##$#$# #',
                '##@   ##',
                '########'
            ]
        },
        {
            id: 58,
            name: '斜廊宗师',
            par: 35,
            map: [
                '########',
                '#    $+#',
                '# $ .# #',
                '# ## $ #',
                '#  .$ ##',
                '#.    ##',
                '########'
            ]
        },
        {
            id: 59,
            name: '双环终章',
            par: 36,
            map: [
                '########',
                '# @    #',
                '#.$  # #',
                '# ##   #',
                '## .$$ #',
                '#..  $ #',
                '########'
            ]
        },
        {
            id: 60,
            name: '皇家总库',
            par: 36,
            map: [
                '########',
                '#.    @#',
                '# .  $ #',
                '# $# # #',
                '#   #* #',
                '# ##.$ #',
                '########'
            ]
        }
    ];

    function parseLevel(lvl) {
        const rows = lvl.map.length;
        const cols = Math.max(...lvl.map.map((r) => r.length));
        const walls = new Set();
        const goals = new Set();
        const boxes = new Set();
        let player = { x: 1, y: 1 };

        // Flood fill from player to distinguish interior floor vs outside void
        for (let y = 0; y < rows; y++) {
            const line = lvl.map[y];
            for (let x = 0; x < line.length; x++) {
                const ch = line[x];
                const k = `${x},${y}`;
                if (ch === '#') walls.add(k);
                else if (ch === '.') goals.add(k);
                else if (ch === '$') boxes.add(k);
                else if (ch === '*') { boxes.add(k); goals.add(k); }
                else if (ch === '@') player = { x, y };
                else if (ch === '+') { player = { x, y }; goals.add(k); }
            }
        }

        const floors = new Set();
        const q = [[player.x, player.y]];
        const vis = new Set([`${player.x},${player.y}`]);
        while (q.length) {
            const [cx, cy] = q.shift();
            const ck = `${cx},${cy}`;
            floors.add(ck);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
                const nk = `${nx},${ny}`;
                if (walls.has(nk) || vis.has(nk)) continue;
                vis.add(nk);
                q.push([nx, ny]);
            }
        }

        return { rows, cols, walls, floors, goals, boxes, player };
    }

    function createSession(levelIndex = 0) {
        const idx = Math.max(0, Math.min(LEVELS.length - 1, Math.floor(Number(levelIndex) || 0)));
        const level = LEVELS[idx];
        const parsed = parseLevel(level);

        const session = {
            levelIndex: idx,
            level,
            rows: parsed.rows,
            cols: parsed.cols,
            walls: parsed.walls,
            floors: parsed.floors,
            goals: parsed.goals,
            boxes: new Set(parsed.boxes),
            player: { ...parsed.player, dirX: 0, dirY: 1 },
            moves: 0,
            pushes: 0,
            history: [],
            won: false
        };

        function checkWon() {
            if (session.goals.size === 0) return false;
            for (const g of session.goals) {
                if (!session.boxes.has(g)) return false;
            }
            return true;
        }

        function isCornerDeadlocked() {
            for (const bk of session.boxes) {
                if (session.goals.has(bk)) continue;
                const [bx, by] = bk.split(',').map(Number);
                const wU = session.walls.has(`${bx},${by - 1}`);
                const wD = session.walls.has(`${bx},${by + 1}`);
                const wL = session.walls.has(`${bx - 1},${by}`);
                const wR = session.walls.has(`${bx + 1},${by}`);
                if ((wU || wD) && (wL || wR)) return true;
            }
            return false;
        }

        function move(dx, dy) {
            if (session.won) return { moved: false };
            const nx = session.player.x + dx;
            const ny = session.player.y + dy;
            const nk = `${nx},${ny}`;
            session.player.dirX = dx;
            session.player.dirY = dy;

            if (session.walls.has(nk)) return { moved: false, blocked: true };

            if (session.boxes.has(nk)) {
                const bx = nx + dx;
                const by = ny + dy;
                const bk = `${bx},${by}`;
                if (session.walls.has(bk) || session.boxes.has(bk)) {
                    return { moved: false, blocked: true };
                }
                session.history.push({
                    px: session.player.x,
                    py: session.player.y,
                    dirX: dx,
                    dirY: dy,
                    pushedFrom: nk,
                    pushedTo: bk
                });
                session.boxes.delete(nk);
                session.boxes.add(bk);
                session.player.x = nx;
                session.player.y = ny;
                session.moves += 1;
                session.pushes += 1;
                session.won = checkWon();
                return {
                    moved: true,
                    pushed: true,
                    boxFrom: { x: nx, y: ny },
                    boxTo: { x: bx, y: by },
                    onGoal: session.goals.has(bk),
                    won: session.won,
                    deadlocked: !session.won && isCornerDeadlocked()
                };
            }

            session.history.push({
                px: session.player.x,
                py: session.player.y,
                dirX: dx,
                dirY: dy,
                pushedFrom: null,
                pushedTo: null
            });
            session.player.x = nx;
            session.player.y = ny;
            session.moves += 1;
            return {
                moved: true,
                pushed: false,
                won: false,
                deadlocked: isCornerDeadlocked()
            };
        }

        function undo() {
            if (session.history.length === 0) return false;
            const last = session.history.pop();
            session.player.x = last.px;
            session.player.y = last.py;
            session.player.dirX = last.dirX;
            session.player.dirY = last.dirY;
            session.moves = Math.max(0, session.moves - 1);
            if (last.pushedFrom && last.pushedTo) {
                session.boxes.delete(last.pushedTo);
                session.boxes.add(last.pushedFrom);
                session.pushes = Math.max(0, session.pushes - 1);
            }
            session.won = checkWon();
            return true;
        }

        function reset() {
            session.boxes = new Set(parsed.boxes);
            session.player = { ...parsed.player, dirX: 0, dirY: 1 };
            session.moves = 0;
            session.pushes = 0;
            session.history = [];
            session.won = false;
        }

        // Shortest walk-only BFS to clicked empty cell (for mouse/tap click-to-move UX)
        function findWalkPath(tx, ty) {
            const targetKey = `${tx},${ty}`;
            if (session.walls.has(targetKey) || session.boxes.has(targetKey)) return null;
            if (!session.floors.has(targetKey)) return null;
            const startKey = `${session.player.x},${session.player.y}`;
            if (startKey === targetKey) return [];

            const queue = [[session.player.x, session.player.y, []]];
            const visited = new Set([startKey]);
            while (queue.length) {
                const [cx, cy, path] = queue.shift();
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = cx + dx, ny = cy + dy;
                    const nk = `${nx},${ny}`;
                    if (visited.has(nk) || session.walls.has(nk) || session.boxes.has(nk)) continue;
                    const nextPath = path.concat([[dx, dy]]);
                    if (nk === targetKey) return nextPath;
                    visited.add(nk);
                    queue.push([nx, ny, nextPath]);
                }
            }
            return null;
        }

        function computeStars(movesCount) {
            if (movesCount <= level.par + 2) return 3;
            if (movesCount <= Math.ceil(level.par * 1.45) + 4) return 2;
            return 1;
        }

        return {
            session,
            move,
            undo,
            reset,
            findWalkPath,
            isCornerDeadlocked,
            computeStars
        };
    }

    function normalizeSave(raw) {
        const clean = {
            muted: !!(raw && raw.muted),
            unlockedLevel: Math.max(1, Math.min(LEVELS.length, Number(raw && raw.unlockedLevel) || 1)),
            currentLevelIndex: Math.max(0, Math.min(LEVELS.length - 1, Number(raw && raw.currentLevelIndex) || 0)),
            bestMoves: {},
            levelStars: {}
        };
        if (raw && raw.bestMoves && typeof raw.bestMoves === 'object') {
            for (const [k, v] of Object.entries(raw.bestMoves)) {
                const n = Math.floor(Number(v) || 0);
                if (n > 0) clean.bestMoves[k] = n;
            }
        }
        if (raw && raw.levelStars && typeof raw.levelStars === 'object') {
            for (const [k, v] of Object.entries(raw.levelStars)) {
                const s = Math.max(0, Math.min(3, Math.floor(Number(v) || 0)));
                if (s > 0) clean.levelStars[k] = s;
            }
        }
        return clean;
    }

    return {
        SAVE_KEY,
        LEVELS,
        parseLevel,
        createSession,
        normalizeSave
    };
});
