(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MotaEngine = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SAVE_KEY = 'cloudeave_mota_v1';
    const GRID = 11;
    const TOTAL_FLOORS = 21;

    const ZONES = [
        { min: 1, max: 7, name: '遗迹石窟', floorBg: '#252a34', floorAlt: '#212630', wallTop: '#475569', wallSide: '#334155' },
        { min: 8, max: 14, name: '暗黑地牢', floorBg: '#1e2230', floorAlt: '#191d29', wallTop: '#3f3f5f', wallSide: '#292942' },
        { min: 15, max: 21, name: '魔王圣殿', floorBg: '#2b1b24', floorAlt: '#24151e', wallTop: '#6b2c3e', wallSide: '#4a1b28' }
    ];

    const MONSTERS = {
        // Zone 1 (1-7F)
        m1: { id: 'm1', name: '绿史莱姆', hp: 45, atk: 16, def: 2, gold: 8, exp: 5, sprite: 'slime', color: '#22c55e' },
        m2: { id: 'm2', name: '蓝史莱姆', hp: 75, atk: 24, def: 5, gold: 12, exp: 8, sprite: 'slime', color: '#38bdf8' },
        m3: { id: 'm3', name: '小蝙蝠', hp: 95, atk: 34, def: 8, gold: 16, exp: 11, sprite: 'bat', color: '#f97316' },
        m4: { id: 'm4', name: '白骷髅', hp: 140, atk: 44, def: 13, gold: 22, exp: 15, sprite: 'skeleton', color: '#e2e8f0' },
        m5: { id: 'm5', name: '初级法师', hp: 130, atk: 54, def: 10, gold: 26, exp: 18, sprite: 'mage', color: '#a855f7' },
        m6: { id: 'm6', name: '骷髅战士', hp: 220, atk: 68, def: 24, gold: 34, exp: 24, sprite: 'skeleton', color: '#cbd5e1' },
        b1: { id: 'b1', name: '骷髅统领', hp: 460, atk: 96, def: 34, gold: 120, exp: 80, sprite: 'boss', color: '#ef4444', isBoss: true, rewardText: '击败遗迹领主！获得【骑士誓约】属性激励' },

        // Zone 2 (8-14F)
        m7: { id: 'm7', name: '兽人战士', hp: 310, atk: 108, def: 42, gold: 48, exp: 32, sprite: 'orc', color: '#4ade80' },
        m8: { id: 'm8', name: '红骷髅', hp: 410, atk: 128, def: 54, gold: 60, exp: 40, sprite: 'skeleton', color: '#f87171' },
        m9: { id: 'm9', name: '冥界蝙蝠', hp: 480, atk: 156, def: 60, gold: 74, exp: 48, sprite: 'bat', color: '#818cf8' },
        ma: { id: 'ma', name: '恶魔守卫', hp: 620, atk: 178, def: 78, gold: 90, exp: 58, sprite: 'knight', color: '#94a3b8' },
        mb: { id: 'mb', name: '暗黑巫师', hp: 580, atk: 215, def: 70, gold: 105, exp: 68, sprite: 'mage', color: '#c084fc' },
        b2: { id: 'b2', name: '深渊暗骑', hp: 2200, atk: 340, def: 165, gold: 320, exp: 180, sprite: 'boss', color: '#fb7185', isBoss: true, rewardText: '深渊镇守破除！魔王圣殿大门已开启' },

        // Zone 3 (15-21F)
        mc: { id: 'mc', name: '虚空之影', hp: 980, atk: 315, def: 138, gold: 145, exp: 85, sprite: 'shadow', color: '#38bdf8' },
        md: { id: 'md', name: '堕落骑士', hp: 1380, atk: 375, def: 168, gold: 185, exp: 108, sprite: 'knight', color: '#fb923c' },
        me: { id: 'me', name: '炼狱巫妖', hp: 1300, atk: 440, def: 152, gold: 215, exp: 125, sprite: 'mage', color: '#e879f9' },
        mf: { id: 'mf', name: '混沌近卫', hp: 2050, atk: 495, def: 215, gold: 270, exp: 160, sprite: 'orc', color: '#f43f5e' },
        b3: { id: 'b3', name: '终焉魔王', hp: 8800, atk: 790, def: 460, gold: 1000, exp: 500, sprite: 'boss', color: '#facc15', isBoss: true, isFinalBoss: true, rewardText: '你击败了终焉魔王，彻底封印了魔塔深渊！' }
    };

    // Legend:
    // # wall | . floor | S down stairs | U up stairs
    // Y/B/R doors (yellow/blue/red) | y/b/r keys
    // A red gem | D blue gem | p potion | P super potion | C coin chest | X exp tome
    // W weapon upgrade | H shield upgrade
    // G gold altar | E exp sage | K key merchant | F flyer traveler | N lore elder
    // Monster codes: 1..6 (m1..m6), 7..9,a,b (m7..mb), c..f (mc..mf), Z=b1, Q=b2, M=b3
    const CHAR_TO_MONSTER = {
        '1': 'm1', '2': 'm2', '3': 'm3', '4': 'm4', '5': 'm5', '6': 'm6',
        '7': 'm7', '8': 'm8', '9': 'm9', 'a': 'ma', 'b': 'mb',
        'c': 'mc', 'd': 'md', 'e': 'me', 'f': 'mf',
        'Z': 'b1', 'Q': 'b2', 'M': 'b3'
    };

    // Handcrafted deterministic 21 floors (11x11 grids)
    // Rule: NPCs sit in alcoves or beside open loops (never blocking 1-wide corridors);
    // Stairs S / U always have clean open access without blocking neighboring branches.
    const FLOOR_TEMPLATES = [
        // 1F: 序章入口 (Hero starts at 5,9; elder N sits in central alcove at 5,5)
        {
            floor: 1, name: '魔塔正门', zoneIdx: 0, gemBonus: 2, potBonus: 180, bigPotBonus: 450,
            start: { x: 5, y: 9 },
            map: [
                '###########',
                '#U..1.1..y#',
                '#Y###.#####',
                '#A.1.p.1.D#',
                '###.#.#.###',
                '#y.2.N.2.y#',
                '###.#.#.###',
                '#p.1...1.b#',
                '#.#.###.#.#',
                '#y.......A#',
                '###########'
            ]
        },
        // 2F: 次元行者 F in side pocket + 金币祭坛 G
        {
            floor: 2, name: '行者回廊', zoneIdx: 0, gemBonus: 2, potBonus: 200, bigPotBonus: 500,
            map: [
                '###########',
                '#S.1.A.D.y#',
                '###.#.#.###',
                '#p.2...2.G#',
                '#.#.###.#.#',
                '#F..1.1..p#',
                '###.#.#.###',
                '#y.2.B.2.y#',
                '#.#.###.#.#',
                '#D..2.3..U#',
                '###########'
            ]
        },
        // 3F: 铁匠宝室 (精钢短剑)
        {
            floor: 3, name: '石窟铁匠房', zoneIdx: 0, gemBonus: 2, potBonus: 220, bigPotBonus: 520,
            weapon: { name: '精钢短剑', atk: 12 },
            map: [
                '###########',
                '#U.2.#.W.p#',
                '###.#B#Y###',
                '#y.1...2.A#',
                '#.#.###.#.#',
                '#G..2.3..D#',
                '###Y###Y###',
                '#p.1.y.1.b#',
                '#.#.###.#.#',
                '#S..1.X..y#',
                '###########'
            ]
        },
        // 4F: 钥匙黑市与蝙蝠窟 (S open right, K in side pocket)
        {
            floor: 4, name: '蝙蝠迷廊', zoneIdx: 0, gemBonus: 2, potBonus: 240, bigPotBonus: 560,
            map: [
                '###########',
                '#S.2...2.y#',
                '###Y###.###',
                '#A.3.K.3.D#',
                '###.#.#.###',
                '#p.3.4.3.p#',
                '###Y###Y###',
                '#y.2.r.2.b#',
                '#.#.###.#.#',
                '#P.3.4.3.U#',
                '###########'
            ]
        },
        // 5F: 铁盾宝库
        {
            floor: 5, name: '盾卫内厅', zoneIdx: 0, gemBonus: 3, potBonus: 260, bigPotBonus: 620,
            shield: { name: '遗迹铁盾', def: 12 },
            map: [
                '###########',
                '#H.4.#.A.U#',
                '#R###.#Y###',
                '#p.3.4.3.p#',
                '###Y###.###',
                '#y.2...2.D#',
                '#.#.###.#.#',
                '#b.3.5.3.y#',
                '###.#.#.###',
                '#S..2.G..y#',
                '###########'
            ]
        },
        // 6F: 经验长老与精英练兵场
        {
            floor: 6, name: '贤者前殿', zoneIdx: 0, gemBonus: 3, potBonus: 280, bigPotBonus: 660,
            map: [
                '###########',
                '#S.3...3.A#',
                '#.#.#E#.#.#',
                '#p.4.5.4.D#',
                '###Y###B###',
                '#y.4.P.5.y#',
                '###.#.#.###',
                '#b.5.6.5.r#',
                '#.#.###.#.#',
                '#X..4.6..U#',
                '###########'
            ]
        },
        // 7F: 第一章守关 Boss
        {
            floor: 7, name: '遗迹王座', zoneIdx: 0, gemBonus: 3, potBonus: 320, bigPotBonus: 720,
            map: [
                '###########',
                '#A.P.U.P.D#',
                '####.Z.####',
                '#b.5.6.5.b#',
                '#Y#######Y#',
                '#p.4...4.p#',
                '###.#.#.###',
                '#y.5.G.5.y#',
                '#.#.###.#.#',
                '#S..3.4..r#',
                '###########'
            ]
        },

        // 8F: 暗黑地牢入口
        {
            floor: 8, name: '地牢北哨', zoneIdx: 1, gemBonus: 4, potBonus: 380, bigPotBonus: 900,
            map: [
                '###########',
                '#S.6.7.6.y#',
                '###.#####Y#',
                '#A.7...7.D#',
                '###.#.#.###',
                '#p.6.G.6.p#',
                '###B###Y###',
                '#y.7.8.7.b#',
                '#.#.###.#.#',
                '#X..7.8..U#',
                '###########'
            ]
        },
        // 9F: 地牢补给所
        {
            floor: 9, name: '黑铁监牢', zoneIdx: 1, gemBonus: 4, potBonus: 420, bigPotBonus: 960,
            map: [
                '###########',
                '#U.8.#.A.P#',
                '###Y#B#Y###',
                '#y.7.8.7.b#',
                '#.#.###.#.#',
                '#K..7.7..E#',
                '###.#.#.###',
                '#p.8.9.8.D#',
                '#.#.###.#.#',
                '#S..7.y..r#',
                '###########'
            ]
        },
        // 10F: 秘银军械库 (秘银骑士剑)
        {
            floor: 10, name: '秘银武器室', zoneIdx: 1, gemBonus: 4, potBonus: 450, bigPotBonus: 1050,
            weapon: { name: '秘银骑士剑', atk: 24 },
            map: [
                '###########',
                '#S.7...7.y#',
                '###Y###B###',
                '#p.8.W.8.D#',
                '#.#.###.#.#',
                '#A.8.9.8.p#',
                '###.#.#.###',
                '#y.9.a.9.b#',
                '#.#.###.#.#',
                '#P..8.X..U#',
                '###########'
            ]
        },
        // 11F: 双线锁钥迷宫
        {
            floor: 11, name: '双门暗渠', zoneIdx: 1, gemBonus: 5, potBonus: 480, bigPotBonus: 1120,
            map: [
                '###########',
                '#U.9.a.9.y#',
                '###.#####R#',
                '#P.8.G.8.A#',
                '###.#.#.###',
                '#b.8.9.8.D#',
                '#Y#######Y#',
                '#p.7...7.p#',
                '#.#.###.#.#',
                '#S..7.b..y#',
                '###########'
            ]
        },
        // 12F: 钢盾宝室
        {
            floor: 12, name: '暗金护盾阁', zoneIdx: 1, gemBonus: 5, potBonus: 520, bigPotBonus: 1200,
            shield: { name: '秘银圆盾', def: 24 },
            map: [
                '###########',
                '#H.a.#.A.U#',
                '#R###B#Y###',
                '#p.9.8.9.D#',
                '###.#.#.###',
                '#y.8.a.8.p#',
                '#.#.###.#.#',
                '#b.9.b.9.y#',
                '###.#.#.###',
                '#S..8.E..r#',
                '###########'
            ]
        },
        // 13F: 巫师与高阶供奉
        {
            floor: 13, name: '诅咒祭坛', zoneIdx: 1, gemBonus: 5, potBonus: 560, bigPotBonus: 1300,
            map: [
                '###########',
                '#S.8...8.y#',
                '#.#.#G#.#.#',
                '#A.9.a.9.D#',
                '###Y###B###',
                '#P.a.b.a.P#',
                '###.#.#.###',
                '#b.a.b.a.r#',
                '#.#.###.#.#',
                '#X..9.b..U#',
                '###########'
            ]
        },
        // 14F: 第二章守关 Boss 深渊暗骑
        {
            floor: 14, name: '暗骑校场', zoneIdx: 1, gemBonus: 6, potBonus: 620, bigPotBonus: 1450,
            map: [
                '###########',
                '#A.P.U.P.D#',
                '####.Q.####',
                '#r.a.b.a.r#',
                '#B#######B#',
                '#p.9...9.p#',
                '###.#.#.###',
                '#y.9.K.9.y#',
                '#.#.###.#.#',
                '#S..8.a..b#',
                '###########'
            ]
        },

        // 15F: 虚空魔王圣殿起点
        {
            floor: 15, name: '血月前庭', zoneIdx: 2, gemBonus: 7, potBonus: 760, bigPotBonus: 1800,
            map: [
                '###########',
                '#S.b.c.b.y#',
                '###.#####Y#',
                '#A.c...c.D#',
                '###.#.#.###',
                '#p.c.G.c.p#',
                '###B###B###',
                '#b.c.d.c.y#',
                '#.#.###.#.#',
                '#P..c.X..U#',
                '###########'
            ]
        },
        // 16F: 圣殿密库与高阶商人
        {
            floor: 16, name: '圣殿秘宝库', zoneIdx: 2, gemBonus: 7, potBonus: 820, bigPotBonus: 1950,
            map: [
                '###########',
                '#U.d.#.A.P#',
                '###Y#R#Y###',
                '#b.c.d.c.D#',
                '#.#.###.#.#',
                '#E..c.d..K#',
                '###.#.#.###',
                '#p.d.e.d.r#',
                '#.#.###.#.#',
                '#S..c.y..b#',
                '###########'
            ]
        },
        // 17F: 圣剑殿堂
        {
            floor: 17, name: '圣剑裁决室', zoneIdx: 2, gemBonus: 8, potBonus: 880, bigPotBonus: 2100,
            weapon: { name: '神圣裁决剑', atk: 52 },
            map: [
                '###########',
                '#S.c...c.y#',
                '###B###R###',
                '#p.d.W.d.A#',
                '#.#.###.#.#',
                '#D.d.e.d.p#',
                '###.#.#.###',
                '#y.e.f.e.b#',
                '#.#.###.#.#',
                '#P..d.G..U#',
                '###########'
            ]
        },
        // 18F: 巫妖走廊
        {
            floor: 18, name: '炼狱长廊', zoneIdx: 2, gemBonus: 8, potBonus: 950, bigPotBonus: 2250,
            map: [
                '###########',
                '#U.e.f.e.r#',
                '###.#####B#',
                '#P.d.X.d.A#',
                '###.#.#.###',
                '#b.d.e.d.D#',
                '#Y#######Y#',
                '#p.c...c.p#',
                '#.#.###.#.#',
                '#S..c.b..y#',
                '###########'
            ]
        },
        // 19F: 圣盾殿堂
        {
            floor: 19, name: '终焉壁垒阁', zoneIdx: 2, gemBonus: 9, potBonus: 1050, bigPotBonus: 2500,
            shield: { name: '辉耀终焉盾', def: 52 },
            map: [
                '###########',
                '#H.f.#.A.U#',
                '#R###B#Y###',
                '#p.e.d.e.D#',
                '###.#.#.###',
                '#y.d.e.d.p#',
                '#.#.###.#.#',
                '#b.e.f.e.y#',
                '###.#.#.###',
                '#S..d.E..r#',
                '###########'
            ]
        },
        // 20F: 最终补给祭坛
        {
            floor: 20, name: '魔神前哨', zoneIdx: 2, gemBonus: 10, potBonus: 1200, bigPotBonus: 2800,
            map: [
                '###########',
                '#S.e...e.y#',
                '#.#.#G#.#.#',
                '#A.f.f.f.D#',
                '###B###R###',
                '#P.e.P.e.P#',
                '###.#.#.###',
                '#r.f.K.f.b#',
                '#.#.###.#.#',
                '#P..f.A..U#',
                '###########'
            ]
        },
        // 21F: 终焉魔王决战厅
        {
            floor: 21, name: '终焉王座', zoneIdx: 2, gemBonus: 10, potBonus: 1500, bigPotBonus: 3200,
            map: [
                '###########',
                '#A.P...P.D#',
                '###..M..###',
                '#..f...f..#',
                '#.#######.#',
                '#P.e.G.e.P#',
                '###.#.#.###',
                '#b...e...b#',
                '#.#.###.#.#',
                '#S...E...A#',
                '###########'
            ]
        }
    ];

    function buildFloorState(tpl) {
        const grid = Array.from({ length: GRID }, () => Array(GRID).fill(0));
        const entities = new Map();
        let startPos = tpl.start ? { ...tpl.start } : { x: 5, y: 9 };

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
                    const expAmt = 20 + tpl.floor * 8;
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
                damage: Infinity,
                turns: Infinity,
                atkNeeded: (enemy.def + 1) - player.atk,
                nextAtkSave: 0,
                nextAtkForLess: (enemy.def + 1) - player.atk
            };
        }
        const turns = Math.ceil(enemy.hp / heroDmg);
        const enemyDmg = Math.max(0, enemy.atk - player.def);
        const totalDamage = (turns - 1) * enemyDmg;

        // Calculate next attack breakpoint to reduce turns by 1
        let nextAtkForLess = 0;
        let nextAtkSave = 0;
        if (turns > 1 && enemyDmg > 0) {
            const targetTurns = turns - 1;
            const reqHeroDmg = Math.ceil(enemy.hp / targetTurns);
            nextAtkForLess = Math.max(1, reqHeroDmg - heroDmg);
            nextAtkSave = enemyDmg;
        }

        return {
            canWin: totalDamage < player.hp,
            damage: totalDamage,
            turns,
            atkNeeded: 0,
            nextAtkForLess,
            nextAtkSave
        };
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
                hp: 1000,
                atk: 12,
                def: 10,
                gold: 60,
                exp: 0,
                level: 1,
                weapon: '木剑',
                shield: '布衣',
                keys: { yellow: 1, blue: 0, red: 0 },
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
                version: 1,
                currentFloor: state.currentFloor,
                player: JSON.parse(JSON.stringify(state.player)),
                floors: floorsOut
            };
        }

        function hydrate(saved) {
            if (!saved || saved.version !== 1 || !saved.player || !saved.floors) return false;
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
            // Restore directly without wiping rest of undoStack
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
                state.player.hp += 240;
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
            const zoneBoost = Math.floor((state.currentFloor - 1) / 7);
            if (stat === 'atk') state.player.atk += 4 + zoneBoost * 3;
            else if (stat === 'def') state.player.def += 4 + zoneBoost * 3;
            else if (stat === 'hp') state.player.hp += 750 + zoneBoost * 450;
            return true;
        }

        function buyExpSage(kind) {
            if (kind === 'level') {
                if (state.player.exp < 80) return false;
                pushUndo();
                state.player.exp -= 80;
                state.player.level += 1;
                state.player.hp += 800;
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
        createSession
    };
});
