// 13 Hand-Crafted Physics-Tested Levels Across 4 Themed Worlds for Angry Birds Remastered
// Coordinate reference: Ground top surface is at y = GROUND_Y (660 in 2000x760 world space)
// Battlefield is generously spaced: Slingshot at X = 240, Fortresses placed between X = 1150 and 1680

window.GAME_WORLDS = [
    {
        id: 'meadow',
        name: '第一章：翠绿牧场',
        subtitle: 'Poached Eggs · 晴空草甸',
        bgKey: 'meadow',
        accent: '#4ade80',
        badge: '阳光草地',
        desc: '在宁静的绿野丘陵中熟悉弹弓抛物线，破开木质与简易玻璃哨塔。'
    },
    {
        id: 'desert',
        name: '第二章：落日峡谷',
        subtitle: 'Mighty Hoax · 荒漠峡谷',
        bgKey: 'desert',
        accent: '#fb923c',
        badge: '炽热峡谷',
        desc: '迎着赤红余晖深入猪群要塞，解锁炸弹黑与白公主的高空弹药库！'
    },
    {
        id: 'snow',
        name: '第三章：冰峰极境',
        subtitle: 'Danger Above · 极光雪山',
        bgKey: 'snow',
        accent: '#38bdf8',
        badge: '极寒冰原',
        desc: '漫天飞雪与极光笼罩的冻土冰川，大量冰晶结构与高弹力跳板奇袭！'
    },
    {
        id: 'castle',
        name: '第四章：暗夜王城',
        subtitle: 'King\'s Citadel · 王家要塞',
        bgKey: 'castle',
        accent: '#a78bfa',
        badge: '决战王城',
        desc: '夜幕下的花岗岩皇家宫殿，钟摆铁球横扫千军，直面头戴金冠的国王猪！'
    }
];

window.GAME_LEVELS = [
    // =========================================================================
    // WORLD 1: SUNNY MEADOW (Levels 1-1 ~ 1-3)
    // =========================================================================
    {
        id: 1,
        world: 'meadow',
        worldLevel: '1-1',
        name: '1-1 初试锋芒',
        subtitle: '瞄准承重木柱，一击摧毁远方双子木塔',
        birds: ['red', 'blue', 'red'],
        parScore: 28000,
        build(g, GY) {
            const X = 1260;
            // Left porch tower
            g.addBlock(X - 55, GY - 45, 22, 90, 'wood');
            g.addBlock(X + 55, GY - 45, 22, 90, 'wood');
            g.addBlock(X, GY - 99, 145, 18, 'wood');
            g.addPig(X, GY - 22, 'normal');

            // Upper glass skylight on left tower
            g.addBlock(X - 38, GY - 138, 18, 60, 'glass');
            g.addBlock(X + 38, GY - 138, 18, 60, 'glass');
            g.addBlock(X, GY - 176, 110, 16, 'wood');
            g.addRoof(X, GY - 204, 100, 40, 'wood');
            g.addPig(X, GY - 126, 'small');

            // Right watchtower
            const X2 = 1490;
            g.addBlock(X2 - 50, GY - 55, 22, 110, 'wood');
            g.addBlock(X2 + 50, GY - 55, 22, 110, 'wood');
            g.addBlock(X2, GY - 119, 136, 18, 'wood');
            g.addPig(X2, GY - 22, 'normal');
            g.addPig(X2, GY - 146, 'small');
        }
    },
    {
        id: 2,
        world: 'meadow',
        worldLevel: '1-2',
        name: '1-2 极速穿云',
        subtitle: '飞行中点击屏幕：蓝弟弟分身破冰，飞镖黄冲刺穿木！',
        birds: ['blue', 'yellow', 'yellow', 'red'],
        parScore: 38000,
        build(g, GY) {
            // Front ice shield screen
            const F = 1180;
            g.addBlock(F, GY - 50, 20, 100, 'glass');
            g.addBlock(F + 40, GY - 50, 20, 100, 'glass');
            g.addBlock(F + 20, GY - 109, 76, 18, 'glass');
            g.addPig(F + 20, GY - 134, 'small');

            // Main conservatory
            const M = 1420;
            g.addBlock(M - 90, GY - 55, 24, 110, 'wood');
            g.addBlock(M, GY - 55, 22, 110, 'glass');
            g.addBlock(M + 90, GY - 55, 24, 110, 'wood');
            g.addBlock(M, GY - 119, 220, 18, 'wood');

            g.addPig(M - 45, GY - 22, 'normal');
            g.addPig(M + 45, GY - 22, 'helmet');

            // Second story greenhouse
            g.addBlock(M - 65, GY - 163, 18, 70, 'glass');
            g.addBlock(M + 65, GY - 163, 18, 70, 'glass');
            g.addBlock(M, GY - 207, 165, 18, 'wood');
            g.addRoof(M, GY - 238, 140, 44, 'wood');
            g.addPig(M, GY - 148, 'normal');
        }
    },
    {
        id: 3,
        world: 'meadow',
        worldLevel: '1-3',
        name: '1-3 滚石危机',
        subtitle: '击碎木楔或引爆高台TNT，让巨石碾平猪群！',
        birds: ['yellow', 'red', 'blue', 'red'],
        parScore: 45000,
        build(g, GY) {
            // Static elevated cliff platform on left-mid of target zone
            g.addStaticPlatform(1190, GY - 190, 170, 24, 0.16, 'stone');
            // Fragile glass stopper holding back a giant boulder!
            g.addBlock(1258, GY - 202, 16, 44, 'glass');
            g.addBoulder(1195, GY - 235, 30, 'stone');
            g.addTNT(1140, GY - 225);

            // Lower valley pig camp right in the boulder's path!
            const V = 1430;
            g.addBlock(V - 80, GY - 45, 20, 90, 'wood');
            g.addBlock(V + 10, GY - 45, 20, 90, 'wood');
            g.addBlock(V - 35, GY - 99, 125, 18, 'wood');
            g.addPig(V - 35, GY - 22, 'normal');
            g.addPig(V - 35, GY - 125, 'small');

            const V2 = 1590;
            g.addBlock(V2 - 55, GY - 50, 22, 100, 'wood');
            g.addBlock(V2 + 55, GY - 50, 22, 100, 'wood');
            g.addBlock(V2, GY - 109, 145, 18, 'stone');
            g.addPig(V2, GY - 24, 'helmet');
            g.addTNT(V2 - 95, GY - 20);
        }
    },

    // =========================================================================
    // WORLD 2: SUNSET DESERT CANYON (Levels 2-1 ~ 2-3)
    // =========================================================================
    {
        id: 4,
        world: 'desert',
        worldLevel: '2-1',
        name: '2-1 爆破专家',
        subtitle: '炸弹黑登场！深入敌阵引爆峡谷军火库！',
        birds: ['bomb', 'yellow', 'bomb', 'red'],
        parScore: 52000,
        build(g, GY) {
            const C = 1400;
            // Heavy stone bunker base
            g.addBlock(C - 130, GY - 55, 28, 110, 'stone');
            g.addBlock(C, GY - 55, 26, 110, 'stone');
            g.addBlock(C + 130, GY - 55, 28, 110, 'stone');
            g.addBlock(C - 65, GY - 120, 156, 20, 'stone');
            g.addBlock(C + 65, GY - 120, 156, 20, 'stone');

            // Ammo depot inside!
            g.addTNT(C - 85, GY - 20);
            g.addPig(C - 40, GY - 22, 'normal');
            g.addPig(C + 50, GY - 24, 'foreman');
            g.addTNT(C + 92, GY - 20);

            // Upper wooden barracks
            g.addBlock(C - 95, GY - 170, 22, 80, 'wood');
            g.addBlock(C, GY - 170, 22, 80, 'wood');
            g.addBlock(C + 95, GY - 170, 22, 80, 'wood');
            g.addBlock(C, GY - 219, 230, 18, 'wood');

            g.addPig(C - 48, GY - 152, 'helmet');
            g.addPig(C + 48, GY - 150, 'normal');
            g.addRoof(C, GY - 250, 180, 44, 'wood');
        }
    },
    {
        id: 5,
        world: 'desert',
        worldLevel: '2-2',
        name: '2-2 空投轰炸',
        subtitle: '白公主越顶投下爆炸蛋，本体拉升撞击高塔！',
        birds: ['matilda', 'matilda', 'yellow', 'bomb'],
        parScore: 55000,
        build(g, GY) {
            // High stone shield wall blocking flat shots
            g.addStaticPlatform(1150, GY - 85, 34, 170, 0, 'stone');
            g.addPig(1150, GY - 190, 'small');

            // Trench bunker right behind shield wall (perfect for Egg Bomb!)
            const T = 1310;
            g.addBlock(T - 60, GY - 40, 20, 80, 'wood');
            g.addBlock(T + 60, GY - 40, 20, 80, 'wood');
            g.addBlock(T, GY - 89, 150, 16, 'glass');
            g.addPig(T - 20, GY - 22, 'helmet');
            g.addTNT(T + 25, GY - 20);

            // Tall sniper watchtower further back (Matilda recoil hits here!)
            const W = 1550;
            g.addBlock(W - 55, GY - 70, 26, 140, 'stone');
            g.addBlock(W + 55, GY - 70, 26, 140, 'stone');
            g.addBlock(W, GY - 150, 150, 20, 'stone');
            g.addPig(W, GY - 25, 'foreman');

            g.addBlock(W - 42, GY - 200, 20, 80, 'wood');
            g.addBlock(W + 42, GY - 200, 20, 80, 'wood');
            g.addBlock(W, GY - 249, 120, 18, 'wood');
            g.addPig(W, GY - 184, 'normal');
            g.addRoof(W, GY - 280, 115, 44, 'stone');
        }
    },
    {
        id: 6,
        world: 'desert',
        worldLevel: '2-3',
        name: '2-3 弹跳奇兵',
        subtitle: '利用弹力橡胶垫折射奇袭，或击断吊索坠落悬空TNT！',
        birds: ['red', 'blue', 'yellow', 'bomb'],
        parScore: 58000,
        build(g, GY) {
            // Bouncy trampoline pad in front of canyon wall!
            g.addBouncyPad(960, GY - 14, 95, 24, -0.18);

            // Central stone pillar obstacle
            g.addStaticPlatform(1140, GY - 110, 32, 220, 0, 'stone');

            // Overhead beam with suspended TNT hanging over the fortress!
            g.addStaticPlatform(1440, GY - 390, 90, 20, 0, 'stone');
            g.addHangingTNT(1440, GY - 380, 1440, GY - 265);

            // Canyon fortress below the hanging TNT
            const F = 1440;
            g.addBlock(F - 110, GY - 50, 24, 100, 'wood');
            g.addBlock(F, GY - 50, 22, 100, 'glass');
            g.addBlock(F + 110, GY - 50, 24, 100, 'wood');
            g.addBlock(F - 55, GY - 109, 134, 18, 'wood');
            g.addBlock(F + 55, GY - 109, 134, 18, 'wood');

            g.addPig(F - 55, GY - 22, 'helmet');
            g.addPig(F + 55, GY - 24, 'foreman');
            g.addPig(F, GY - 138, 'normal');
            g.addPig(F - 95, GY - 134, 'small');
            g.addPig(F + 95, GY - 134, 'small');
        }
    },

    // =========================================================================
    // WORLD 3: FROSTBITE PEAKS & AURORA (Levels 3-1 ~ 3-3)
    // =========================================================================
    {
        id: 7,
        world: 'snow',
        worldLevel: '3-1',
        name: '3-1 寒冰水晶宫',
        subtitle: '蓝弟弟大显身手！漫天飞雪中粉碎三重冰晶回廊！',
        birds: ['blue', 'blue', 'yellow', 'bomb'],
        parScore: 52000,
        build(g, GY) {
            const P = 1380;
            // 3-Tier Delicate Glass & Ice Castle
            g.addBlock(P - 110, GY - 50, 20, 100, 'glass');
            g.addBlock(P - 35, GY - 50, 20, 100, 'glass');
            g.addBlock(P + 35, GY - 50, 20, 100, 'glass');
            g.addBlock(P + 110, GY - 50, 20, 100, 'glass');
            g.addBlock(P, GY - 109, 260, 18, 'glass');

            g.addPig(P - 70, GY - 22, 'normal');
            g.addPig(P, GY - 24, 'helmet');
            g.addPig(P + 70, GY - 22, 'normal');

            // Tier 2 Ice Spire
            g.addBlock(P - 60, GY - 165, 18, 80, 'glass');
            g.addBlock(P + 60, GY - 165, 18, 80, 'glass');
            g.addBlock(P, GY - 212, 160, 16, 'wood');
            g.addPig(P, GY - 150, 'foreman');

            // Tier 3 Crystal Cap
            g.addBlock(P, GY - 255, 18, 60, 'glass');
            g.addRoof(P, GY - 295, 80, 36, 'wood');
            g.addPig(P, GY - 240, 'small');
        }
    },
    {
        id: 8,
        world: 'snow',
        worldLevel: '3-2',
        name: '3-2 极光跳跃',
        subtitle: '双重高弹跳板联动！高空倒挂巨石与悬空TNT连环引爆！',
        birds: ['yellow', 'red', 'matilda', 'bomb'],
        parScore: 64000,
        build(g, GY) {
            // Front & Mid Trampoline Pads
            g.addBouncyPad(930, GY - 14, 90, 24, -0.15);
            g.addBouncyPad(1210, GY - 14, 85, 24, 0.12);

            // High suspended ice ledge holding a giant icy boulder
            g.addStaticPlatform(1360, GY - 290, 160, 22, 0.12, 'stone');
            g.addBlock(1430, GY - 315, 16, 40, 'glass');
            g.addBoulder(1370, GY - 330, 28, 'stone');
            g.addTNT(1310, GY - 318);

            // Lower ice bunker under the platform
            const B = 1520;
            g.addBlock(B - 80, GY - 55, 24, 110, 'glass');
            g.addBlock(B + 80, GY - 55, 24, 110, 'stone');
            g.addBlock(B, GY - 119, 190, 18, 'wood');
            g.addPig(B - 25, GY - 24, 'helmet');
            g.addPig(B + 35, GY - 25, 'foreman');
            g.addTNT(B, GY - 20);

            // Upper lookout pig
            g.addBlock(B, GY - 165, 20, 60, 'glass');
            g.addPig(B, GY - 148, 'small');
            g.addRoof(B, GY - 200, 100, 38, 'stone');
        }
    },
    {
        id: 9,
        world: 'snow',
        worldLevel: '3-3',
        name: '3-3 冰壁雪崩',
        subtitle: '白公主投弹震塌雪峰支柱，诱发大雪崩席卷防空掩体！',
        birds: ['matilda', 'bomb', 'blue', 'terence'],
        parScore: 72000,
        build(g, GY) {
            // High Ice Pillar supporting an avalanche mass of boulders
            g.addStaticPlatform(1180, GY - 220, 140, 20, 0.18, 'stone');
            g.addBlock(1240, GY - 250, 16, 40, 'glass');
            g.addBoulder(1190, GY - 262, 25, 'stone');
            g.addBoulder(1140, GY - 260, 22, 'stone');
            g.addTNT(1100, GY - 240);

            // Pig fortress in the valley below
            const V = 1460;
            g.addBlock(V - 100, GY - 60, 26, 120, 'stone');
            g.addBlock(V, GY - 60, 22, 120, 'glass');
            g.addBlock(V + 100, GY - 60, 26, 120, 'stone');
            g.addBlock(V - 50, GY - 129, 120, 18, 'wood');
            g.addBlock(V + 50, GY - 129, 120, 18, 'wood');

            g.addPig(V - 50, GY - 24, 'helmet');
            g.addPig(V + 50, GY - 24, 'foreman');
            g.addTNT(V - 8, GY - 20);

            g.addBlock(V - 45, GY - 180, 20, 75, 'glass');
            g.addBlock(V + 45, GY - 180, 20, 75, 'glass');
            g.addBlock(V, GY - 225, 130, 18, 'wood');
            g.addPig(V, GY - 165, 'helmet');
            g.addPig(V, GY - 254, 'small');
        }
    },

    // =========================================================================
    // WORLD 4: MOONLIT KING'S CITADEL (Levels 4-1 ~ 4-4)
    // =========================================================================
    {
        id: 10,
        world: 'castle',
        worldLevel: '4-1',
        name: '4-1 钟摆铁球',
        subtitle: '撞击高空悬挂的攻城铁球，借钟摆巨力横扫城门！',
        birds: ['yellow', 'red', 'matilda', 'bomb'],
        parScore: 68000,
        build(g, GY) {
            // Overhead gallows holding a heavy swinging Iron Wrecking Ball!
            g.addStaticPlatform(1210, GY - 380, 80, 22, 0, 'stone');
            g.addPendulumBall(1210, GY - 370, 1140, GY - 210, 28);

            // Castle gatehouse right in the swing arc!
            const G = 1380;
            g.addBlock(G - 75, GY - 60, 26, 120, 'stone');
            g.addBlock(G + 75, GY - 60, 26, 120, 'stone');
            g.addBlock(G, GY - 130, 190, 20, 'stone');
            g.addPig(G, GY - 24, 'helmet');
            g.addTNT(G - 35, GY - 20);

            g.addBlock(G - 55, GY - 180, 22, 80, 'wood');
            g.addBlock(G + 55, GY - 180, 22, 80, 'wood');
            g.addBlock(G, GY - 229, 146, 18, 'wood');
            g.addPig(G, GY - 164, 'foreman');

            // Rear archer tower
            const R = 1600;
            g.addBlock(R - 42, GY - 65, 22, 130, 'stone');
            g.addBlock(R + 42, GY - 65, 22, 130, 'stone');
            g.addBlock(R, GY - 139, 115, 18, 'wood');
            g.addPig(R, GY - 22, 'normal');
            g.addPig(R, GY - 166, 'helmet');
        }
    },
    {
        id: 11,
        world: 'castle',
        worldLevel: '4-2',
        name: '4-2 巨无霸登场',
        subtitle: '大红鸟泰伦斯出击！以绝对吨位碾碎双层花岗岩城墙！',
        birds: ['terence', 'bomb', 'yellow', 'terence'],
        parScore: 75000,
        build(g, GY) {
            // Outer heavy stone shield wall
            g.addBlock(1190, GY - 55, 32, 110, 'stone');
            g.addBlock(1190, GY - 155, 30, 90, 'stone');

            // Inner granite bastion
            const B = 1420;
            g.addBlock(B - 115, GY - 60, 30, 120, 'stone');
            g.addBlock(B, GY - 60, 28, 120, 'stone');
            g.addBlock(B + 115, GY - 60, 30, 120, 'stone');
            g.addBlock(B - 58, GY - 131, 148, 22, 'stone');
            g.addBlock(B + 58, GY - 131, 148, 22, 'stone');

            g.addPig(B - 58, GY - 24, 'helmet');
            g.addPig(B + 58, GY - 25, 'foreman');
            g.addTNT(B + 165, GY - 20);

            // Second tier stone & glass keep
            g.addBlock(B - 85, GY - 187, 24, 90, 'stone');
            g.addBlock(B, GY - 187, 20, 90, 'glass');
            g.addBlock(B + 85, GY - 187, 24, 90, 'stone');
            g.addBlock(B, GY - 242, 210, 20, 'stone');

            g.addPig(B - 42, GY - 164, 'normal');
            g.addPig(B + 42, GY - 166, 'helmet');
            g.addRoof(B, GY - 278, 170, 52, 'stone');
        }
    },
    {
        id: 12,
        world: 'castle',
        worldLevel: '4-3',
        name: '4-3 连环炼狱',
        subtitle: '冰桥、滚石、弹跳垫与四重连环TNT的终极物理迷宫！',
        birds: ['blue', 'yellow', 'matilda', 'bomb', 'red'],
        parScore: 82000,
        build(g, GY) {
            g.addBouncyPad(940, GY - 14, 90, 24, -0.12);

            // High ice ledge holding twin boulders
            g.addStaticPlatform(1210, GY - 250, 160, 20, 0.14, 'stone');
            g.addBlock(1278, GY - 280, 16, 40, 'glass');
            g.addBoulder(1230, GY - 288, 26, 'stone');
            g.addTNT(1170, GY - 280);

            // Multi-room lower fortress
            const L = 1460;
            g.addBlock(L - 130, GY - 55, 24, 110, 'stone');
            g.addBlock(L - 20, GY - 55, 22, 110, 'wood');
            g.addBlock(L + 90, GY - 55, 22, 110, 'wood');
            g.addBlock(L + 190, GY - 55, 26, 110, 'stone');

            g.addBlock(L - 75, GY - 119, 135, 18, 'wood');
            g.addBlock(L + 35, GY - 119, 135, 18, 'glass');
            g.addBlock(L + 140, GY - 119, 125, 18, 'stone');

            g.addTNT(L - 90, GY - 20);
            g.addPig(L - 55, GY - 22, 'helmet');
            g.addPig(L + 35, GY - 24, 'foreman');
            g.addTNT(L + 135, GY - 20);
            g.addPig(L + 165, GY - 22, 'normal');

            // Upper deck
            g.addBlock(L + 5, GY - 168, 20, 80, 'glass');
            g.addBlock(L + 115, GY - 168, 20, 80, 'glass');
            g.addBlock(L + 60, GY - 217, 145, 18, 'wood');
            g.addPig(L + 60, GY - 150, 'helmet');
            g.addPig(L + 60, GY - 244, 'small');
        }
    },
    {
        id: 13,
        world: 'castle',
        worldLevel: '4-4',
        name: '4-4 猪王决战 (BOSS)',
        subtitle: '全明星六鸟集结！攻破暗夜皇宫，击败头戴金冠的国王猪！',
        birds: ['blue', 'yellow', 'matilda', 'bomb', 'terence', 'red'],
        parScore: 98000,
        build(g, GY) {
            // Outer vanguard tower
            const V = 1160;
            g.addBlock(V - 45, GY - 50, 24, 100, 'stone');
            g.addBlock(V + 45, GY - 50, 24, 100, 'stone');
            g.addBlock(V, GY - 110, 125, 20, 'stone');
            g.addPig(V, GY - 24, 'helmet');
            g.addTNT(V, GY - 138);

            // Overhead royal chandelier with hanging TNT above the Throne Room!
            const K = 1480;
            g.addStaticPlatform(K, GY - 420, 100, 22, 0, 'stone');
            g.addHangingTNT(K, GY - 409, K, GY - 305);

            // Grand Royal Citadel (3-Bay Stone & Wood Palace)
            g.addBlock(K - 160, GY - 65, 30, 130, 'stone');
            g.addBlock(K - 65, GY - 65, 26, 130, 'stone');
            g.addBlock(K + 65, GY - 65, 26, 130, 'stone');
            g.addBlock(K + 160, GY - 65, 30, 130, 'stone');

            g.addBlock(K - 112, GY - 141, 125, 22, 'stone');
            g.addBlock(K, GY - 141, 156, 22, 'stone');
            g.addBlock(K + 112, GY - 141, 125, 22, 'stone');

            // Ground floor guards & explosives
            g.addTNT(K - 112, GY - 20);
            g.addPig(K - 22, GY - 25, 'foreman');
            g.addPig(K + 28, GY - 24, 'helmet');
            g.addTNT(K + 112, GY - 20);

            // Second floor: KING PIG'S THRONE ROOM!
            g.addBlock(K - 95, GY - 202, 24, 100, 'wood');
            g.addBlock(K + 95, GY - 202, 24, 100, 'wood');
            g.addBlock(K, GY - 262, 230, 20, 'glass');

            g.addPig(K, GY - 186, 'king'); // THE BOSS!
            g.addPig(K - 130, GY - 172, 'small');
            g.addPig(K + 130, GY - 172, 'small');

            // Twin royal spires flanking the skylight
            g.addRoof(K - 95, GY - 295, 70, 46, 'stone');
            g.addRoof(K + 95, GY - 295, 70, 46, 'stone');
        }
    }
];
