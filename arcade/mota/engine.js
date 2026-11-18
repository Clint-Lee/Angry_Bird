(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MotaEngine = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SAVE_KEY = 'cloudeave_mota_v2';
    const GRID = 15;
    const TOTAL_FLOORS = 30;

    const ZONES = [
        { min: 1, max: 10, name: '遗迹石窟', floorBg: '#232833', floorAlt: '#1e232d', wallTop: '#4c5c70', wallSide: '#323e4e' },
        { min: 11, max: 20, name: '暗黑地牢', floorBg: '#1c2030', floorAlt: '#171a28', wallTop: '#47476b', wallSide: '#2b2b46' },
        { min: 21, max: 30, name: '魔王圣殿', floorBg: '#2b1923', floorAlt: '#23131c', wallTop: '#702d41', wallSide: '#4b1a29' }
    ];

    const MONSTERS = {
        // Zone 1 (1-10F)
        m1: { id: 'm1', name: '绿史莱姆', hp: 45, atk: 16, def: 2, gold: 8, exp: 5, sprite: 'slime', color: '#22c55e' },
        m2: { id: 'm2', name: '蓝史莱姆', hp: 80, atk: 24, def: 6, gold: 13, exp: 8, sprite: 'slime', color: '#38bdf8' },
        m3: { id: 'm3', name: '小蝙蝠', hp: 105, atk: 36, def: 9, gold: 17, exp: 12, sprite: 'bat', color: '#f97316' },
        m4: { id: 'm4', name: '白骷髅', hp: 155, atk: 46, def: 15, gold: 23, exp: 16, sprite: 'skeleton', color: '#e2e8f0' },
        m5: { id: 'm5', name: '初级法师', hp: 145, atk: 58, def: 12, gold: 28, exp: 19, sprite: 'mage', color: '#a855f7' },
        m6: { id: 'm6', name: '骷髅战士', hp: 250, atk: 74, def: 28, gold: 38, exp: 26, sprite: 'skeleton', color: '#cbd5e1' },
        b1: { id: 'b1', name: '骸骨领主', hp: 780, atk: 122, def: 46, gold: 180, exp: 100, sprite: 'boss', color: '#ef4444', isBoss: true, rewardText: '击败第10层遗迹领主！通往暗黑地牢的大门开启。' },

        // Zone 2 (11-20F)
        m7: { id: 'm7', name: '兽人战士', hp: 360, atk: 118, def: 46, gold: 52, exp: 34, sprite: 'orc', color: '#4ade80' },
        m8: { id: 'm8', name: '红骷髅', hp: 480, atk: 142, def: 60, gold: 66, exp: 44, sprite: 'skeleton', color: '#f87171' },
        m9: { id: 'm9', name: '冥界蝙蝠', hp: 560, atk: 176, def: 68, gold: 80, exp: 52, sprite: 'bat', color: '#818cf8' },
        ma: { id: 'ma', name: '恶魔守卫', hp: 760, atk: 205, def: 92, gold: 102, exp: 65, sprite: 'knight', color: '#94a3b8' },
        mb: { id: 'mb', name: '暗黑巫师', hp: 700, atk: 245, def: 82, gold: 118, exp: 76, sprite: 'mage', color: '#c084fc' },
        b2: { id: 'b2', name: '深渊暗骑统帅', hp: 3600, atk: 390, def: 195, gold: 420, exp: 220, sprite: 'boss', color: '#fb7185', isBoss: true, rewardText: '击败第20层深渊统帅！勇者踏入魔王圣殿最终区域。' },

        // Zone 3 (21-30F)
        mc: { id: 'mc', name: '虚空之影', hp: 1150, atk: 350, def: 155, gold: 155, exp: 92, sprite: 'shadow', color: '#38bdf8' },
        md: { id: 'md', name: '堕落骑士', hp: 1600, atk: 420, def: 192, gold: 205, exp: 118, sprite: 'knight', color: '#fb923c' },
        me: { id: 'me', name: '炼狱巫妖', hp: 1520, atk: 495, def: 175, gold: 240, exp: 138, sprite: 'mage', color: '#e879f9' },
        mf: { id: 'mf', name: '混沌近卫', hp: 2450, atk: 560, def: 245, gold: 310, exp: 178, sprite: 'orc', color: '#f43f5e' },
        b3: { id: 'b3', name: '终焉魔王', hp: 16500, atk: 960, def: 580, gold: 1500, exp: 800, sprite: 'boss', color: '#facc15', isBoss: true, isFinalBoss: true, rewardText: '你在第30层终焉王座击败了终焉魔王，彻底封印了魔塔深渊！' }
    };

    const CHAR_TO_MONSTER = {
        '1': 'm1', '2': 'm2', '3': 'm3', '4': 'm4', '5': 'm5', '6': 'm6',
        '7': 'm7', '8': 'm8', '9': 'm9', 'a': 'ma', 'b': 'mb',
        'c': 'mc', 'd': 'md', 'e': 'me', 'f': 'mf',
        'Z': 'b1', 'Q': 'b2', 'M': 'b3'
    };

    const FLOOR_NAMES = [
        '魔塔正门', '行者前廊', '石窟铁匠室', '蝙蝠迷窟', '双门回廊',
        '遗迹盾阁', '贤者侧厅', '骷髅军营', '秘宝长廊', '骸骨王座 (Boss)',
        '暗黑地牢门', '黑铁狱室', '双翼地牢', '诅咒偏殿', '秘银武器库',
        '毒蝠竖井', '恶魔哨所', '暗金护盾阁', '巫师密坛', '深渊校场 (Boss)',
        '血月前庭', '圣剑裁决堂', '虚空交叉廊', '炼狱宝库', '魔将回廊',
        '终焉壁垒阁', '混沌军械室', '魔神禁区', '圣殿前哨', '终焉王座 (Boss)'
    ];

    // 12 distinct 15x15 architectural templates (exact 15 chars per row!)
    // Logical dungeon design:
    //   1 = scout/vanguard monster (mA), 2 = room guard (mB), 3 = vault/stairway elite (mC)
    //   * = floor NPC (N/F/G/E/K), w = weapon vault (W or A), h = shield vault (H or D)
    const ARCHETYPES = [
        // 0: Cathedral Entry Hall — side armories behind Yellow doors, inner crypt guard before stairs
        [
            '###############',
            '#w.A#..U..#D.h#',
            '#.#3#.2.2.#3#.#',
            '#y.B...#...B.p#',
            '#####.#.#.#####',
            '#P.p..1.1..p.P#',
            '#.###.#.#.###.#',
            '#A..1..*..1..D#',
            '#.###.###.###.#',
            '#y..#b...y#..b#',
            '#Y###.#.#.###Y#',
            '#p..1.#.#.1..p#',
            '#.###.#.#.###.#',
            '#y....1S1....y#',
            '###############'
        ],
        // 1: West Armory & East Sage Sanctum — Twin locked quarters with central gauntlet
        [
            '###############',
            '#U..3.#*#.3..h#',
            '###.###.###.###',
            '#w.A..Y.B..D.P#',
            '#.###.#.#.###.#',
            '#p.2..#.#..2.b#',
            '#.#.###.###.#.#',
            '#1....1.1....1#',
            '#.###.#.#.###.#',
            '#y..#.P.p.#..y#',
            '#Y#.#.###.#.#Y#',
            '#A#1#..1..#1#D#',
            '#.#.#.###.#.#.#',
            '#p..1..S..1..y#',
            '###############'
        ],
        // 2: Prison Cellblocks — guarded prison cells flanking central watchtower
        [
            '###############',
            '#w.P#..U..#P.h#',
            '#Y###.3.3.###Y#',
            '#2.y..#.#..y.2#',
            '#.###.#.#.###.#',
            '#A..1..*..1..D#',
            '###.###.###.###',
            '#b.2..#.#..2.b#',
            '#.###.#.#.###.#',
            '#p.1..Y.Y..1.p#',
            '#.#.###.###.#.#',
            '#y#..1...1..#X#',
            '#.#.###.###.#.#',
            '#1....1S1....1#',
            '###############'
        ],
        // 3: Serpent Archive — winding snake path with Red & Blue secret shortcut vaults
        [
            '###############',
            '#w..3.A.#..U.h#',
            '#####Y#.#.###.#',
            '#P..p.#.#.3..p#',
            '#.###.#.#.###.#',
            '#1..y.#*#.2..D#',
            '#.#####.#####.#',
            '#1....2.2....1#',
            '###B#######Y###',
            '#b.p..#y#..P.A#',
            '#.###.#.#.###.#',
            '#D..1.....1..y#',
            '#.###.###.###.#',
            '#p....1S1....1#',
            '###############'
        ],
        // 4: Citadel Quad — Four corner keeps; inner shrine guarded by elites
        [
            '###############',
            '#w.A#..U..#D.h#',
            '#3###.2.2.###3#',
            '#B..p.#*#.p..B#',
            '#.###.###.###.#',
            '#p.1..#.#..1.p#',
            '#.#.###.###.#.#',
            '#1..Y..P..Y..1#',
            '#.#.###.###.#.#',
            '#y.1..#.#..1.y#',
            '#.###.###.###.#',
            '#A..#b...y#..D#',
            '###.#.###.#.###',
            '#p..1..S..1..y#',
            '###############'
        ],
        // 5: Crucible Ring — Concentric fortress moat around inner treasure core
        [
            '###############',
            '#S..1..y..1..p#',
            '#.###.###.###.#',
            '#1..#A.P.D#..1#',
            '#.#.#Y###B#.#.#',
            '#y#2#.*3*.#2#b#',
            '#.#.#.###.#.#.#',
            '#p.2..w.h..2.p#',
            '#.#.#######.#.#',
            '#X#1...1...1#P#',
            '#.###.2.2.###.#',
            '#A..Y.....Y..D#',
            '#.###.###.###.#',
            '#y..2..U..2..b#',
            '###############'
        ],
        // 6: Split Monastery — Left Altar Wing vs Right Vault Wing
        [
            '###############',
            '#A.p#..U..#P.h#',
            '#3###.2.3.###Y#',
            '#B..2.#.#.2..D#',
            '#.###.#.#.###.#',
            '#*.p..1.1..b.w#',
            '#####.#.#.#####',
            '#y..1..P..1..y#',
            '#.###.###.###.#',
            '#p.1..#.#..1.p#',
            '#Y###.#.#.###B#',
            '#D.y#.....#A.X#',
            '#.#.#.###.#.#.#',
            '#p..1..S..1..y#',
            '###############'
        ],
        // 7: Iron Gatehouse — Two-stage fortress gatehouse requiring keys to pierce north
        [
            '###############',
            '#U..3..#..3..h#',
            '###B###.###Y###',
            '#w.A..2.*..2.P#',
            '#.###.###.###.#',
            '#p..1.#.#.1..D#',
            '#.#.###.###.#.#',
            '#2....Y.Y....2#',
            '#.###.#.#.###.#',
            '#b..#.P.p.#..y#',
            '###.#.###.#.###',
            '#A.1..#.#..1.D#',
            '#.###.#.#.###.#',
            '#y..1..S..1..p#',
            '###############'
        ],
        // 8: Twin Stairwell Keep — East/West galleries converging onto central vault
        [
            '###############',
            '#w.P#..U..#P.h#',
            '#Y###.3.3.###Y#',
            '#2..y.#*#.y..2#',
            '#.###.#.#.###.#',
            '#A.1..#.#..1.D#',
            '#.#.#######.#.#',
            '#1..2..b..2..1#',
            '#.###.#.#.###.#',
            '#p..#B...B#..p#',
            '#.###.#.#.###.#',
            '#y..1.#.#.1..X#',
            '###.#.###.#.###',
            '#p..1..S..1..y#',
            '###############'
        ],
        // 9: Labyrinthine Crypt — Asymmetric winding crypt with hidden Red Vault
        [
            '###############',
            '#S..1.#w.A#..U#',
            '#.###.#Y###.#.#',
            '#p..2.#...#.3.#',
            '###.#.#.#.#.#.#',
            '#y.1#P..2..p#h#',
            '#.#.###.###.#B#',
            '#A..#*...*..#D#',
            '#.#.#.###.###.#',
            '#1.p..2.#P.3.b#',
            '#.#####.#.###.#',
            '#D..y.#1..1..y#',
            '###Y###.###.###',
            '#p..1....1...X#',
            '###############'
        ],
        // 10: High Rampart — East-to-West fortified terrace with elite bridge guards
        [
            '###############',
            '#U.3..#h.P#..w#',
            '###.###B###.###',
            '#p.2..A.*.D..2#',
            '#.###.###.###.#',
            '#1..y.#.#.y..1#',
            '#.###.#.#.###.#',
            '#b..2..P..2..y#',
            '###Y###.###Y###',
            '#A..1.#.#.1..D#',
            '#.###.#.#.###.#',
            '#p..1.#b#.1..p#',
            '#.###.###.###.#',
            '#y....1S1....X#',
            '###############'
        ],
        // 11: Final Citadel Annex — Heavy outer bastions shielding twin vaults before climb
        [
            '###############',
            '#w.A.#.U.#.D.h#',
            '#3###.3.3.###3#',
            '#R..p.#*#.p..B#',
            '#.###.###.###.#',
            '#2.p..#.#..p.2#',
            '#.#.###.###.#.#',
            '#1..Y..P..Y..1#',
            '#.#.###.###.#.#',
            '#b.1..#r#..1.b#',
            '#.###.###.###.#',
            '#A..1.....1..D#',
            '###.#.###.#.###',
            '#y..1..S..1..p#',
            '###############'
        ]
    ];

    // Three distinct Chapter Boss Sanctums (10F, 20F, 30F)
    const BOSS_TEMPLATES = {
        10: [
            '###############',
            '#A.P...U...P.D#',
            '#.#.###.###.#.#',
            '#y..2..3..2..b#',
            '###.###B###.###',
            '#P.1..#*#..1.P#',
            '#.###.#.#.###.#',
            '#2...Y...Y...2#',
            '#.###.###.###.#',
            '#b.1..#P#..1.y#',
            '###Y###.###Y###',
            '#p..1.#.#.1..p#',
            '#.###.#.#.###.#',
            '#A..1..S..1..D#',
            '###############'
        ],
        20: [
            '###############',
            '#w.P...U...P.h#',
            '###.###3###.###',
            '#2..A..#..D..2#',
            '#.###.###.###.#',
            '#P.1.#*..*#.1P#',
            '###B###.###B###',
            '#b..2..P..2..b#',
            '#.###.###.###.#',
            '#1..Y.....Y..1#',
            '#.###.###.###.#',
            '#p..1.#.#.1..p#',
            '#.###.#.#.###.#',
            '#A..1..S..1..D#',
            '###############'
        ],
        30: [
            '###############',
            '#A.P...P...P.D#',
            '#.#.###3###.#.#',
            '#P..b..#..r..P#',
            '###B###.###B###',
            '#P.2..#*#..2.P#',
            '#.###.#.#.###.#',
            '#2...R.P.R...2#',
            '#.###.###.###.#',
            '#b.1..#P#..1.b#',
            '###Y###.###Y###',
            '#p..1.#.#.1..p#',
            '#.###.#.#.###.#',
            '#A..1..S..1..D#',
            '###############'
        ]
    };

    function createFloorTemplate(floor) {
        const name = FLOOR_NAMES[floor - 1] || `第${floor}层`;
        const zoneIdx = floor <= 10 ? 0 : floor <= 20 ? 1 : 2;
        const gemBonus = zoneIdx === 0 ? 1 + Math.floor(floor / 6) : zoneIdx === 1 ? 2 + Math.floor((floor - 10) / 4) : 4 + Math.floor((floor - 20) / 3);
        const potBonus = 130 + (floor - 1) * 24;
        const bigPotBonus = 300 + (floor - 1) * 52;

        const pools = [
            ['1', '1', '2'], // 1F
            ['1', '2', '2'], // 2F
            ['1', '2', '3'], // 3F
            ['2', '3', '4'], // 4F
            ['2', '3', '4'], // 5F
            ['3', '4', '5'], // 6F
            ['3', '4', '5'], // 7F
            ['4', '5', '6'], // 8F
            ['4', '5', '6'], // 9F
            ['5', '6', 'Z'], // 10F Boss
            ['6', '7', '8'], // 11F
            ['7', '8', '9'], // 12F
            ['7', '8', '9'], // 13F
            ['8', '9', 'a'], // 14F
            ['8', '9', 'a'], // 15F
            ['9', 'a', 'b'], // 16F
            ['9', 'a', 'b'], // 17F
            ['a', 'b', 'b'], // 18F
            ['a', 'b', 'b'], // 19F
            ['a', 'b', 'Q'], // 20F Boss
            ['b', 'c', 'd'], // 21F
            ['c', 'd', 'e'], // 22F
            ['c', 'd', 'e'], // 23F
            ['d', 'e', 'f'], // 24F
            ['d', 'e', 'f'], // 25F
            ['e', 'f', 'f'], // 26F
            ['e', 'f', 'f'], // 27F
            ['e', 'f', 'f'], // 28F
            ['e', 'f', 'f'], // 29F
            ['e', 'f', 'M']  // 30F Final Boss
        ];
        const [mA, mB, mC] = pools[floor - 1];

        const npcByFloor = {
            1: 'N', 2: 'F', 3: 'G', 4: 'K', 6: 'E',
            8: 'G', 10: 'G', 11: 'K', 13: 'E', 16: 'G',
            19: 'E', 20: 'K', 22: 'G', 25: 'E', 27: 'K', 29: 'G', 30: 'E'
        };
        const weapons = {
            3: { name: '精钢短剑', atk: 14 },
            9: { name: '骑士重剑', atk: 24 },
            15: { name: '秘银圣剑', atk: 38 },
            22: { name: '烈阳裁决剑', atk: 60 },
            27: { name: '屠龙神剑', atk: 90 }
        };
        const shields = {
            6: { name: '遗迹铁盾', def: 14 },
            12: { name: '秘银圆盾', def: 26 },
            18: { name: '龙鳞战盾', def: 42 },
            25: { name: '圣光壁垒', def: 66 },
            29: { name: '不朽神盾', def: 95 }
        };

        const rawMap = BOSS_TEMPLATES[floor] || ARCHETYPES[(floor - 1) % ARCHETYPES.length];
        let startCoords = null;
        const npcToken = npcByFloor[floor] || '.';
        const hasW = !!weapons[floor];
        const hasH = !!shields[floor];

        const rows = rawMap.map((row, ry) =>
            row.split('').map((ch, rx) => {
                if (ch === 'S') startCoords = { x: rx, y: ry };
                if (ch === '1') return mA;
                if (ch === '2') return mB;
                if (ch === '3') return mC;
                if (ch === '*') return npcToken;
                if (ch === 'w') return hasW ? 'W' : 'A';
                if (ch === 'h') return hasH ? 'H' : 'D';
                return ch;
            }).join('')
        );

        // Floor 1 clears the entrance stairs token 'S' after recording spawn coords
        if (floor === 1 && startCoords) {
            const sr = rows[startCoords.y];
            rows[startCoords.y] = sr.slice(0, startCoords.x) + '.' + sr.slice(startCoords.x + 1);
        }

        return {
            floor,
            name,
            zoneIdx,
            gemBonus,
            potBonus,
            bigPotBonus,
            weapon: weapons[floor] || null,
            shield: shields[floor] || null,
            start: floor === 1 ? (startCoords || { x: 7, y: 13 }) : null,
            map: rows
        };
    }

    const FLOOR_TEMPLATES = Array.from({ length: TOTAL_FLOORS }, (_, i) => createFloorTemplate(i + 1));

    function buildFloorState(tpl) {
        const grid = Array.from({ length: GRID }, () => Array(GRID).fill(0));
        const entities = new Map();
        let startPos = tpl.start ? { ...tpl.start } : { x: 7, y: 13 };

        for (let y = 0; y < GRID; y++) {
            const row = tpl.map[y];
            for (let x = 0; x < GRID; x++) {
                const ch = row[x];
                const key = `${x},${y}`;
                if (ch === '#') {
                    grid[y][x] = 1;
                    continue;
                }
                if (ch === '.') continue;
                if (ch === 'S') {
                    entities.set(key, { type: 'stairs_down' });
                    if (!tpl.start) startPos = { x, y };
                } else if (ch === 'U') {
                    entities.set(key, { type: 'stairs_up' });
                } else if (ch === 'Y' || ch === 'B' || ch === 'R') {
                    const mapK = { Y: 'yellow', B: 'blue', R: 'red' };
                    const names = { yellow: '黄门', blue: '蓝门', red: '红门' };
                    const colors = { yellow: '#facc15', blue: '#38bdf8', red: '#f87171' };
                    const kt = mapK[ch];
                    entities.set(key, { type: 'door', keyType: kt, name: names[kt], color: colors[kt] });
                } else if (ch === 'y' || ch === 'b' || ch === 'r') {
                    const mapK = { y: 'yellow', b: 'blue', r: 'red' };
                    const names = { yellow: '黄钥匙', blue: '蓝钥匙', red: '红钥匙' };
                    const colors = { yellow: '#facc15', blue: '#38bdf8', red: '#f87171' };
                    const kt = mapK[ch];
                    entities.set(key, { type: 'key', keyType: kt, name: names[kt], color: colors[kt] });
                } else if (ch === 'A') {
                    entities.set(key, { type: 'item', sub: 'gem_red', name: '红宝石', atk: tpl.gemBonus, color: '#ef4444' });
                } else if (ch === 'D') {
                    entities.set(key, { type: 'item', sub: 'gem_blue', name: '蓝宝石', def: tpl.gemBonus, color: '#38bdf8' });
                } else if (ch === 'p') {
                    entities.set(key, { type: 'item', sub: 'potion_sm', name: '小血瓶', hp: tpl.potBonus, color: '#f87171' });
                } else if (ch === 'P') {
                    entities.set(key, { type: 'item', sub: 'potion_lg', name: '圣水', hp: tpl.bigPotBonus, color: '#fb7185' });
                } else if (ch === 'X') {
                    const expAmt = 24 + tpl.floor * 9;
                    entities.set(key, { type: 'item', sub: 'tome', name: '古籍经验书', exp: expAmt, color: '#a855f7' });
                } else if (ch === 'W' && tpl.weapon) {
                    entities.set(key, { type: 'item', sub: 'weapon', name: tpl.weapon.name, atk: tpl.weapon.atk, isEquip: 'weapon', color: '#f59e0b' });
                } else if (ch === 'H' && tpl.shield) {
                    entities.set(key, { type: 'item', sub: 'shield', name: tpl.shield.name, def: tpl.shield.def, isEquip: 'shield', color: '#38bdf8' });
                } else if (ch === 'G') {
                    entities.set(key, { type: 'npc', sub: 'altar_gold', name: '金币祭坛', color: '#facc15' });
                } else if (ch === 'E') {
                    entities.set(key, { type: 'npc', sub: 'altar_exp', name: '经验长老', color: '#c084fc' });
                } else if (ch === 'K') {
                    entities.set(key, { type: 'npc', sub: 'key_shop', name: '钥匙商人', color: '#38bdf8' });
                } else if (ch === 'F') {
                    entities.set(key, { type: 'npc', sub: 'flyer', name: '次元行者', color: '#34d399' });
                } else if (ch === 'N') {
                    entities.set(key, { type: 'npc', sub: 'elder', name: '守塔智者', color: '#fde68a' });
                } else if (CHAR_TO_MONSTER[ch]) {
                    const proto = MONSTERS[CHAR_TO_MONSTER[ch]];
                    entities.set(key, { type: 'enemy', ...proto });
                }
            }
        }
        return { floor: tpl.floor, name: tpl.name, zoneIdx: tpl.zoneIdx, grid, entities, startPos };
    }

    function calculateBattle(player, enemy) {
        const heroDmg = player.atk - enemy.def;
        if (heroDmg <= 0) {
            return {
                canWin: false,
                reason: 'no_break',
                damage: Infinity,
                turns: Infinity,
                heroDmg: 0,
                enemyDmg: Math.max(0, enemy.atk - player.def),
                atkNeeded: (enemy.def + 1) - player.atk,
                nextAtkSave: 0,
                nextAtkForLess: (enemy.def + 1) - player.atk
            };
        }
        const turns = Math.ceil(enemy.hp / heroDmg);
        const enemyDmg = Math.max(0, enemy.atk - player.def);
        const totalDamage = (turns - 1) * enemyDmg;

        let nextAtkForLess = 0;
        let nextAtkSave = 0;
        if (turns > 1 && enemyDmg > 0) {
            const targetTurns = turns - 1;
            const reqHeroDmg = Math.ceil(enemy.hp / targetTurns);
            nextAtkForLess = Math.max(1, reqHeroDmg - heroDmg);
            nextAtkSave = enemyDmg;
        }

        const canWin = totalDamage < player.hp;
        return {
            canWin,
            reason: canWin ? 'win' : 'low_hp',
            damage: totalDamage,
            turns,
            heroDmg,
            enemyDmg,
            atkNeeded: 0,
            nextAtkForLess,
            nextAtkSave
        };
    }

    /** Generates compact exchange frames for turn-by-turn battle animation overlay. */
    function buildBattleTimeline(player, enemy) {
        const calc = calculateBattle(player, enemy);
        if (!calc.canWin) return [];
        const rawFrames = [];
        let pHp = player.hp;
        let eHp = enemy.hp;

        // Compress excessive visual rounds (>12 rounds) smoothly into multi-strike hits so animation stays fast
        const groupSize = calc.turns > 12 ? Math.ceil(calc.turns / 10) : 1;
        let stepCount = 0;

        while (eHp > 0 && stepCount < 200) {
            stepCount++;
            const strikeH = Math.min(eHp, calc.heroDmg * groupSize);
            eHp = Math.max(0, eHp - strikeH);
            rawFrames.push({ actor: 'hero', dmg: strikeH, heroHp: pHp, enemyHp: eHp });
            if (eHp <= 0) break;

            const strikeE = calc.enemyDmg * groupSize;
            pHp = Math.max(1, pHp - strikeE);
            rawFrames.push({ actor: 'enemy', dmg: strikeE, heroHp: pHp, enemyHp: eHp });
        }
        return rawFrames;
    }

    function createSession() {
        const floors = {};
        for (const tpl of FLOOR_TEMPLATES) {
            floors[tpl.floor] = buildFloorState(tpl);
        }

        const state = {
            currentFloor: 1,
            player: {
                x: floors[1].startPos.x,
                y: floors[1].startPos.y,
                dirX: 0,
                dirY: -1,
                hp: 1100,
                atk: 14,
                def: 10,
                gold: 80,
                exp: 0,
                level: 1,
                weapon: '木剑',
                shield: '布衣',
                keys: { yellow: 2, blue: 0, red: 0 },
                hasFlyer: false,
                goldBuys: 0,
                visitedFloors: [1],
                won: false,
                kills: 0,
                steps: 0
            },
            floors,
            undoStack: []
        };

        function serialize() {
            const floorsOut = {};
            for (const [fNum, fObj] of Object.entries(state.floors)) {
                floorsOut[fNum] = {
                    entities: Array.from(fObj.entities.entries())
                };
            }
            return {
                version: 2,
                currentFloor: state.currentFloor,
                player: JSON.parse(JSON.stringify(state.player)),
                floors: floorsOut
            };
        }

        function hydrate(saved) {
            if (!saved || saved.version !== 2 || !saved.player || !saved.floors) return false;
            try {
                const fresh = createSession();
                Object.assign(state.player, fresh.state.player, saved.player);
                state.player.keys = Object.assign({ yellow: 0, blue: 0, red: 0 }, saved.player.keys || {});
                state.player.visitedFloors = Array.isArray(saved.player.visitedFloors) && saved.player.visitedFloors.length
                    ? saved.player.visitedFloors
                    : [1];
                state.currentFloor = Math.max(1, Math.min(TOTAL_FLOORS, Number(saved.currentFloor) || 1));

                for (const tpl of FLOOR_TEMPLATES) {
                    const freshFloor = buildFloorState(tpl);
                    const savedF = saved.floors[String(tpl.floor)];
                    if (savedF && Array.isArray(savedF.entities)) {
                        freshFloor.entities = new Map(savedF.entities);
                    }
                    state.floors[tpl.floor] = freshFloor;
                }
                state.undoStack = [];
                return true;
            } catch {
                return false;
            }
        }

        function pushUndo() {
            state.undoStack.push(JSON.stringify(serialize()));
            if (state.undoStack.length > 60) state.undoStack.shift();
        }

        function undo() {
            if (!state.undoStack.length) return false;
            const raw = state.undoStack.pop();
            const parsed = JSON.parse(raw);
            const keepStack = state.undoStack;
            hydrate(parsed);
            state.undoStack = keepStack;
            return true;
        }

        function grantExp(amount) {
            state.player.exp += amount;
            let leveled = 0;
            while (state.player.exp >= state.player.level * 60) {
                state.player.exp -= state.player.level * 60;
                state.player.level += 1;
                state.player.hp += 260;
                state.player.atk += 3;
                state.player.def += 3;
                leveled += 1;
            }
            return leveled;
        }

        function currentFloorData() {
            return state.floors[state.currentFloor];
        }

        function findPath(targetX, targetY) {
            if (targetX < 0 || targetX >= GRID || targetY < 0 || targetY >= GRID) return null;
            const f = currentFloorData();
            if (f.grid[targetY][targetX] === 1) return null;
            const sx = state.player.x;
            const sy = state.player.y;
            if (sx === targetX && sy === targetY) return [];

            const startK = `${sx},${sy}`;
            const q = [{ x: sx, y: sy, path: [] }];
            const vis = new Set([startK]);
            let head = 0;

            while (head < q.length) {
                const cur = q[head++];
                if (cur.x === targetX && cur.y === targetY) return cur.path;

                for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                    const nx = cur.x + dx;
                    const ny = cur.y + dy;
                    const nk = `${nx},${ny}`;
                    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || vis.has(nk)) continue;
                    if (f.grid[ny][nx] === 1) continue;

                    const ent = f.entities.get(nk);
                    const isTarget = (nx === targetX && ny === targetY);
                    const blocks = ent && (
                        ent.type === 'door' ||
                        ent.type === 'enemy' ||
                        ent.type === 'npc' ||
                        (!isTarget && (ent.type === 'stairs_up' || ent.type === 'stairs_down'))
                    );
                    if (blocks && !isTarget) continue;

                    vis.add(nk);
                    q.push({ x: nx, y: ny, path: cur.path.concat([[dx, dy]]) });
                }
            }
            return null;
        }

        function step(dx, dy) {
            if (state.player.won) return { ok: false, reason: 'won' };
            state.player.dirX = dx;
            state.player.dirY = dy;
            const nx = state.player.x + dx;
            const ny = state.player.y + dy;
            if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return { ok: false, reason: 'wall' };

            const f = currentFloorData();
            if (f.grid[ny][nx] === 1) return { ok: false, reason: 'wall' };

            const nk = `${nx},${ny}`;
            const ent = f.entities.get(nk);

            if (!ent) {
                pushUndo();
                state.player.x = nx;
                state.player.y = ny;
                state.player.steps += 1;
                return { ok: true, kind: 'move' };
            }

            if (ent.type === 'npc') {
                return { ok: false, kind: 'npc', npc: ent, x: nx, y: ny, key: nk };
            }

            if (ent.type === 'door') {
                if ((state.player.keys[ent.keyType] || 0) <= 0) {
                    return { ok: false, kind: 'locked', door: ent };
                }
                pushUndo();
                state.player.keys[ent.keyType] -= 1;
                f.entities.delete(nk);
                state.player.x = nx;
                state.player.y = ny;
                state.player.steps += 1;
                return { ok: true, kind: 'door', door: ent };
            }

            if (ent.type === 'enemy') {
                const res = calculateBattle(state.player, ent);
                if (!res.canWin) {
                    return { ok: false, kind: 'cant_win', enemy: ent, calc: res };
                }
                const preBattleHeroHp = state.player.hp;
                const timeline = buildBattleTimeline(state.player, ent);
                pushUndo();
                state.player.hp -= res.damage;
                state.player.gold += ent.gold;
                state.player.kills += 1;
                const leveled = grantExp(ent.exp);
                f.entities.delete(nk);
                state.player.x = nx;
                state.player.y = ny;
                state.player.steps += 1;

                if (ent.isFinalBoss) {
                    state.player.won = true;
                }
                return {
                    ok: true,
                    kind: 'battle',
                    enemy: ent,
                    damage: res.damage,
                    preBattleHeroHp,
                    timeline,
                    leveled,
                    won: !!ent.isFinalBoss
                };
            }

            if (ent.type === 'key') {
                pushUndo();
                state.player.keys[ent.keyType] = (state.player.keys[ent.keyType] || 0) + 1;
                f.entities.delete(nk);
                state.player.x = nx;
                state.player.y = ny;
                state.player.steps += 1;
                return { ok: true, kind: 'key', item: ent };
            }

            if (ent.type === 'item') {
                pushUndo();
                if (ent.hp) state.player.hp += ent.hp;
                if (ent.atk) state.player.atk += ent.atk;
                if (ent.def) state.player.def += ent.def;
                if (ent.isEquip === 'weapon') state.player.weapon = ent.name;
                if (ent.isEquip === 'shield') state.player.shield = ent.name;
                const leveled = ent.exp ? grantExp(ent.exp) : 0;
                f.entities.delete(nk);
                state.player.x = nx;
                state.player.y = ny;
                state.player.steps += 1;
                return { ok: true, kind: 'item', item: ent, leveled };
            }

            if (ent.type === 'stairs_up') {
                if (state.currentFloor >= TOTAL_FLOORS) return { ok: false, reason: 'top' };
                pushUndo();
                state.currentFloor += 1;
                if (!state.player.visitedFloors.includes(state.currentFloor)) {
                    state.player.visitedFloors.push(state.currentFloor);
                    state.player.visitedFloors.sort((a, b) => a - b);
                }
                const nf = currentFloorData();
                let downPos = null;
                for (const [k, v] of nf.entities.entries()) {
                    if (v.type === 'stairs_down') {
                        const [sx, sy] = k.split(',').map(Number);
                        downPos = { x: sx, y: sy };
                        break;
                    }
                }
                state.player.x = downPos ? downPos.x : nf.startPos.x;
                state.player.y = downPos ? downPos.y : nf.startPos.y;
                state.player.steps += 1;
                return { ok: true, kind: 'stairs', dir: 'up', floor: state.currentFloor };
            }

            if (ent.type === 'stairs_down') {
                if (state.currentFloor <= 1) return { ok: false, reason: 'bottom' };
                pushUndo();
                state.currentFloor -= 1;
                const pf = currentFloorData();
                let upPos = null;
                for (const [k, v] of pf.entities.entries()) {
                    if (v.type === 'stairs_up') {
                        const [sx, sy] = k.split(',').map(Number);
                        upPos = { x: sx, y: sy };
                        break;
                    }
                }
                state.player.x = upPos ? upPos.x : pf.startPos.x;
                state.player.y = upPos ? upPos.y : pf.startPos.y;
                state.player.steps += 1;
                return { ok: true, kind: 'stairs', dir: 'down', floor: state.currentFloor };
            }

            return { ok: false };
        }

        function teleport(floorNum, stairsType) {
            if (!state.player.hasFlyer) return false;
            if (!state.player.visitedFloors.includes(floorNum)) return false;
            const targetFloor = state.floors[floorNum];
            if (!targetFloor) return false;

            let pos = null;
            for (const [k, v] of targetFloor.entities.entries()) {
                if (v.type === stairsType) {
                    const [sx, sy] = k.split(',').map(Number);
                    pos = { x: sx, y: sy };
                    break;
                }
            }
            if (!pos) return false;
            pushUndo();
            state.currentFloor = floorNum;
            state.player.x = pos.x;
            state.player.y = pos.y;
            return true;
        }

        function goldAltarCost() {
            return 20 + state.player.goldBuys * 10;
        }

        function buyGoldAltar(stat) {
            const cost = goldAltarCost();
            if (state.player.gold < cost) return false;
            pushUndo();
            state.player.gold -= cost;
            state.player.goldBuys += 1;
            const zoneBoost = Math.floor((state.currentFloor - 1) / 10);
            if (stat === 'atk') state.player.atk += 4 + zoneBoost * 3;
            else if (stat === 'def') state.player.def += 4 + zoneBoost * 3;
            else if (stat === 'hp') state.player.hp += 750 + zoneBoost * 500;
            return true;
        }

        function buyExpSage(kind) {
            if (kind === 'level') {
                if (state.player.exp < 80) return false;
                pushUndo();
                state.player.exp -= 80;
                state.player.level += 1;
                state.player.hp += 850;
                state.player.atk += 6;
                state.player.def += 6;
                return true;
            }
            if (state.player.exp < 30) return false;
            pushUndo();
            state.player.exp -= 30;
            if (kind === 'atk') state.player.atk += 4;
            else if (kind === 'def') state.player.def += 4;
            return true;
        }

        function buyKey(keyType) {
            const prices = { yellow: 35, blue: 95, red: 220 };
            const cost = prices[keyType];
            if (!cost || state.player.gold < cost) return false;
            pushUndo();
            state.player.gold -= cost;
            state.player.keys[keyType] = (state.player.keys[keyType] || 0) + 1;
            return true;
        }

        function sellYellowKey() {
            if ((state.player.keys.yellow || 0) <= 0) return false;
            pushUndo();
            state.player.keys.yellow -= 1;
            state.player.gold += 18;
            return true;
        }

        function unlockFlyer(npcKey) {
            const f = currentFloorData();
            if (state.player.hasFlyer) return true;
            pushUndo();
            state.player.hasFlyer = true;
            if (npcKey) f.entities.delete(npcKey);
            return true;
        }

        function getManualEntries() {
            const f = currentFloorData();
            const map = new Map();
            for (const ent of f.entities.values()) {
                if (ent.type !== 'enemy') continue;
                if (!map.has(ent.id)) {
                    map.set(ent.id, { enemy: ent, count: 1, calc: calculateBattle(state.player, ent) });
                } else {
                    map.get(ent.id).count += 1;
                }
            }
            return Array.from(map.values()).sort((a, b) => a.enemy.hp - b.enemy.hp);
        }

        function getAdjacentEnemy() {
            const f = currentFloorData();
            for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                const ent = f.entities.get(`${state.player.x + dx},${state.player.y + dy}`);
                if (ent && ent.type === 'enemy') {
                    return { enemy: ent, calc: calculateBattle(state.player, ent) };
                }
            }
            return null;
        }

        return {
            state,
            serialize,
            hydrate,
            undo,
            step,
            findPath,
            teleport,
            goldAltarCost,
            buyGoldAltar,
            buyExpSage,
            buyKey,
            sellYellowKey,
            unlockFlyer,
            getManualEntries,
            getAdjacentEnemy,
            currentFloorData
        };
    }

    return {
        SAVE_KEY,
        GRID,
        TOTAL_FLOORS,
        ZONES,
        MONSTERS,
        FLOOR_TEMPLATES,
        calculateBattle,
        buildBattleTimeline,
        createSession
    };
});
