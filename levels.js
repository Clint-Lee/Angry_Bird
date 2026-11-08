// 60 Hand-Crafted Physics-Tested Stable Levels Across 4 Themed Worlds for Angry Birds Remastered
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
        themeIcon: '🌲',
        desc: '在宁静的绿野丘陵中熟悉弹弓抛物线，破开木质与简易玻璃哨塔。',
        description: '在宁静的绿野丘陵中熟悉弹弓抛物线，破开木质与简易玻璃哨塔。'
    },
    {
        id: 'desert',
        name: '第二章：落日峡谷',
        subtitle: 'Mighty Hoax · 荒漠峡谷',
        bgKey: 'desert',
        accent: '#fb923c',
        badge: '炽热峡谷',
        themeIcon: '🏜️',
        desc: '迎着赤红余晖深入猪群要塞，解锁炸弹黑与白公主的高空弹药库！',
        description: '迎着赤红余晖深入猪群要塞，解锁炸弹黑与白公主的高空弹药库！'
    },
    {
        id: 'snow',
        name: '第三章：冰峰极境',
        subtitle: 'Danger Above · 极光雪山',
        bgKey: 'snow',
        accent: '#38bdf8',
        badge: '极寒冰原',
        themeIcon: '❄️',
        desc: '漫天飞雪与极光笼罩的冻土冰川，大量冰晶结构与高弹力跳板奇袭！',
        description: '漫天飞雪与极光笼罩的冻土冰川，大量冰晶结构与高弹力跳板奇袭！'
    },
    {
        id: 'castle',
        name: '第四章：暗夜王城',
        subtitle: 'King\'s Citadel · 王家要塞',
        bgKey: 'castle',
        accent: '#a78bfa',
        badge: '决战王城',
        themeIcon: '🏰',
        desc: '夜幕下的花岗岩皇家宫殿，钟摆铁球横扫千军，直面头戴金冠的国王猪！',
        description: '夜幕下的花岗岩皇家宫殿，钟摆铁球横扫千军，直面头戴金冠的国王猪！'
    },
    {
        id: 'volcano',
        name: '第五章：炽热熔岩',
        subtitle: 'Magma Vault · 熔岩暗窟',
        bgKey: 'volcano',
        accent: '#f97316',
        badge: '火山烈狱',
        themeIcon: '🌋',
        desc: '炽热翻滚的熔岩核心要塞，回旋鸟逆风奇袭，连锁TNT引爆终极风暴！',
        description: '炽热翻滚的熔岩核心要塞，回旋鸟逆风奇袭，连锁TNT引爆终极风暴！'
    }
];

window.GAME_LEVELS = [
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
            g.addBlock(X - 55, GY - 45, 22, 90, 'wood');
            g.addBlock(X + 55, GY - 45, 22, 90, 'wood');
            g.addBlock(X, GY - 99, 145, 18, 'wood');
            g.addPig(X, GY - 22, 'normal');

            g.addBlock(X - 38, GY - 138, 18, 60, 'glass');
            g.addBlock(X + 38, GY - 138, 18, 60, 'glass');
            g.addBlock(X, GY - 176, 110, 16, 'wood');
            g.addRoof(X, GY - 204, 100, 40, 'wood');
            g.addPig(X, GY - 126, 'small');

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
            const F = 1180;
            g.addBlock(F - 20, GY - 50, 20, 100, 'glass');
            g.addBlock(F + 20, GY - 50, 20, 100, 'glass');
            g.addBlock(F, GY - 109, 76, 18, 'glass');
            g.addPig(F, GY - 134, 'small');

            const M = 1420;
            g.addBlock(M - 90, GY - 55, 24, 110, 'wood');
            g.addBlock(M, GY - 55, 22, 110, 'glass');
            g.addBlock(M + 90, GY - 55, 24, 110, 'wood');
            g.addBlock(M, GY - 119, 220, 18, 'wood');

            g.addPig(M - 45, GY - 22, 'normal');
            g.addPig(M + 45, GY - 22, 'helmet');

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
        subtitle: '击碎玻璃阻挡销或引爆高台TNT，让巨石碾平猪群！',
        birds: ['yellow', 'red', 'blue', 'red'],
        parScore: 45000,
        build(g, GY) {
            // Horizontal resting cliff ledge (flat angle 0 for zero pre-collapse)
            g.addStaticPlatform(1190, GY - 190, 170, 24, 0, 'stone');
            g.addBlock(1265, GY - 222, 18, 40, 'glass');
            g.addBoulder(1205, GY - 232, 28, 'stone');
            g.addTNT(1140, GY - 225);

            const V = 1430;
            g.addBlock(V - 55, GY - 45, 22, 90, 'wood');
            g.addBlock(V + 55, GY - 45, 22, 90, 'wood');
            g.addBlock(V, GY - 99, 145, 18, 'wood');
            g.addPig(V, GY - 22, 'normal');
            g.addPig(V, GY - 126, 'small');

            const V2 = 1600;
            g.addBlock(V2 - 50, GY - 50, 22, 100, 'wood');
            g.addBlock(V2 + 50, GY - 50, 22, 100, 'wood');
            g.addBlock(V2, GY - 109, 140, 18, 'stone');
            g.addPig(V2, GY - 24, 'helmet');
            g.addTNT(V2 - 95, GY - 21);
        }
    },
    {
        id: 4,
        world: 'meadow',
        worldLevel: '1-4',
        name: '1-4 双子木阁',
        subtitle: '精准打击底部中心支点，连环引发双阁倒塌',
        birds: ['yellow', 'red', 'yellow'],
        parScore: 36000,
        build(g, GY) {
            const T1 = 1250;
            g.addBlock(T1 - 45, GY - 50, 22, 100, 'wood');
            g.addBlock(T1 + 45, GY - 50, 22, 100, 'wood');
            g.addBlock(T1, GY - 109, 130, 18, 'wood');
            g.addPig(T1, GY - 22, 'normal');
            g.addBlock(T1 - 35, GY - 158, 20, 80, 'wood');
            g.addBlock(T1 + 35, GY - 158, 20, 80, 'wood');
            g.addBlock(T1, GY - 207, 105, 18, 'wood');
            g.addRoof(T1, GY - 238, 90, 42, 'wood');
            g.addPig(T1, GY - 138, 'small');

            const T2 = 1460;
            g.addBlock(T2 - 45, GY - 50, 22, 100, 'wood');
            g.addBlock(T2 + 45, GY - 50, 22, 100, 'wood');
            g.addBlock(T2, GY - 109, 130, 18, 'wood');
            g.addPig(T2, GY - 24, 'helmet');
            g.addBlock(T2 - 35, GY - 158, 20, 80, 'wood');
            g.addBlock(T2 + 35, GY - 158, 20, 80, 'wood');
            g.addBlock(T2, GY - 207, 105, 18, 'wood');
            g.addRoof(T2, GY - 238, 90, 42, 'wood');
            g.addPig(T2, GY - 138, 'normal');
        }
    },
    {
        id: 5,
        world: 'meadow',
        worldLevel: '1-5',
        name: '1-5 玻璃迷阵',
        subtitle: '蓝弟弟轻而易举穿透三层冰晶，直捣藏于深处的哨猪',
        birds: ['blue', 'blue', 'yellow', 'red'],
        parScore: 42000,
        build(g, GY) {
            const X = 1360;
            [-80, -25, 25, 80].forEach(off => {
                g.addBlock(X + off, GY - 50, 18, 100, 'glass');
            });
            g.addBlock(X, GY - 109, 210, 18, 'glass');
            g.addPig(X - 52, GY - 22, 'normal');
            g.addPig(X + 52, GY - 22, 'normal');
            g.addPig(X, GY - 138, 'helmet');

            [-50, 50].forEach(off => {
                g.addBlock(X + off, GY - 165, 18, 75, 'glass');
            });
            g.addBlock(X, GY - 211, 140, 18, 'wood');
            g.addRoof(X, GY - 242, 110, 42, 'wood');
            g.addPig(X, GY - 230, 'small');
        }
    },
    {
        id: 6,
        world: 'meadow',
        worldLevel: '1-6',
        name: '1-6 飞镖首秀',
        subtitle: '长排厚实木板横挡去路，飞镖黄加速穿刺一击毙命',
        birds: ['yellow', 'yellow', 'red', 'blue'],
        parScore: 40000,
        build(g, GY) {
            const B = 1380;
            g.addBlock(B - 100, GY - 55, 24, 110, 'wood');
            g.addBlock(B - 35, GY - 55, 24, 110, 'wood');
            g.addBlock(B + 35, GY - 55, 24, 110, 'wood');
            g.addBlock(B + 100, GY - 55, 24, 110, 'wood');
            g.addBlock(B - 67, GY - 119, 105, 18, 'wood');
            g.addBlock(B + 67, GY - 119, 105, 18, 'wood');
            g.addBlock(B, GY - 137, 235, 18, 'wood');

            g.addPig(B - 67, GY - 22, 'normal');
            g.addPig(B, GY - 24, 'helmet');
            g.addPig(B + 67, GY - 22, 'normal');

            g.addBlock(B - 50, GY - 192, 22, 90, 'wood');
            g.addBlock(B + 50, GY - 192, 22, 90, 'wood');
            g.addBlock(B, GY - 246, 140, 18, 'wood');
            g.addRoof(B, GY - 276, 120, 42, 'wood');
            g.addPig(B, GY - 165, 'foreman');
        }
    },
    {
        id: 7,
        world: 'meadow',
        worldLevel: '1-7',
        name: '1-7 三重木亭',
        subtitle: '三座并立的休憩木亭，寻找连锁倾覆的最佳着弹点',
        birds: ['red', 'yellow', 'blue', 'red'],
        parScore: 46000,
        build(g, GY) {
            [1220, 1390, 1560].forEach((posX, idx) => {
                g.addBlock(posX - 40, GY - 45, 20, 90, 'wood');
                g.addBlock(posX + 40, GY - 45, 20, 90, 'wood');
                g.addBlock(posX, GY - 99, 115, 18, 'wood');
                g.addRoof(posX, GY - 128, 95, 38, 'wood');
                g.addPig(posX, GY - 22, idx === 1 ? 'helmet' : 'normal');
            });
            g.addTNT(1305, GY - 21);
            g.addTNT(1475, GY - 21);
        }
    },
    {
        id: 8,
        world: 'meadow',
        worldLevel: '1-8',
        name: '1-8 军火木库',
        subtitle: '掩藏在双层木棚下的烈性炸药，引爆瞬间升天！',
        birds: ['yellow', 'red', 'yellow'],
        parScore: 48000,
        build(g, GY) {
            const S = 1390;
            g.addBlock(S - 90, GY - 55, 24, 110, 'wood');
            g.addBlock(S + 90, GY - 55, 24, 110, 'wood');
            g.addBlock(S, GY - 119, 215, 18, 'wood');

            g.addTNT(S - 40, GY - 21);
            g.addTNT(S + 40, GY - 21);
            g.addPig(S, GY - 24, 'foreman');

            g.addBlock(S - 50, GY - 173, 20, 90, 'wood');
            g.addBlock(S + 50, GY - 173, 20, 90, 'wood');
            g.addBlock(S, GY - 227, 135, 18, 'wood');
            g.addPig(S, GY - 146, 'helmet');
            g.addRoof(S, GY - 256, 120, 40, 'wood');
        }
    },
    {
        id: 9,
        world: 'meadow',
        worldLevel: '1-9',
        name: '1-9 阶梯哨所',
        subtitle: '层层递进的阶梯防御塔，居高临下的防守阵型',
        birds: ['yellow', 'blue', 'red', 'red'],
        parScore: 45000,
        build(g, GY) {
            // Tier 1
            const X1 = 1240;
            g.addBlock(X1 - 35, GY - 35, 20, 70, 'wood');
            g.addBlock(X1 + 35, GY - 35, 20, 70, 'wood');
            g.addBlock(X1, GY - 79, 105, 18, 'wood');
            g.addPig(X1, GY - 22, 'normal');

            // Tier 2
            const X2 = 1380;
            g.addBlock(X2 - 40, GY - 60, 22, 120, 'wood');
            g.addBlock(X2 + 40, GY - 60, 22, 120, 'wood');
            g.addBlock(X2, GY - 129, 115, 18, 'wood');
            g.addPig(X2, GY - 24, 'helmet');
            g.addPig(X2, GY - 151, 'small');

            // Tier 3
            const X3 = 1530;
            g.addBlock(X3 - 45, GY - 85, 24, 170, 'wood');
            g.addBlock(X3 + 45, GY - 85, 24, 170, 'wood');
            g.addBlock(X3, GY - 179, 125, 18, 'wood');
            g.addPig(X3, GY - 24, 'foreman');
            g.addRoof(X3, GY - 208, 105, 40, 'wood');
            g.addPig(X3, GY - 146, 'helmet');
        }
    },
    {
        id: 10,
        world: 'meadow',
        worldLevel: '1-10',
        name: '1-10 桥梁合围',
        subtitle: '桥上与桥下的立体封锁，击断承重桥桩瓦解阵地',
        birds: ['blue', 'yellow', 'red', 'red'],
        parScore: 48000,
        build(g, GY) {
            const B = 1380;
            g.addBlock(B - 110, GY - 50, 24, 100, 'wood');
            g.addBlock(B, GY - 50, 24, 100, 'wood');
            g.addBlock(B + 110, GY - 50, 24, 100, 'wood');
            // Bridge deck
            g.addBlock(B, GY - 109, 260, 18, 'wood');

            g.addPig(B - 55, GY - 22, 'normal');
            g.addPig(B + 55, GY - 24, 'helmet');

            // Bridge towers
            g.addBlock(B - 70, GY - 158, 20, 80, 'glass');
            g.addBlock(B + 70, GY - 158, 20, 80, 'glass');
            g.addBlock(B, GY - 207, 180, 18, 'wood');
            g.addPig(B, GY - 138, 'foreman');
            g.addRoof(B, GY - 236, 140, 40, 'wood');
        }
    },
    {
        id: 11,
        world: 'meadow',
        worldLevel: '1-11',
        name: '1-11 坚木堡垒',
        subtitle: '四根立柱支撑的沉重木堡，多轮打击击溃防线',
        birds: ['yellow', 'yellow', 'red', 'blue'],
        parScore: 50000,
        build(g, GY) {
            const C = 1400;
            [-90, -30, 30, 90].forEach(dx => {
                g.addBlock(C + dx, GY - 55, 22, 110, 'wood');
            });
            g.addBlock(C, GY - 119, 225, 18, 'wood');
            g.addPig(C - 60, GY - 22, 'normal');
            g.addPig(C, GY - 24, 'helmet');
            g.addPig(C + 60, GY - 22, 'normal');

            [-50, 50].forEach(dx => {
                g.addBlock(C + dx, GY - 173, 22, 90, 'wood');
            });
            g.addBlock(C, GY - 227, 145, 18, 'wood');
            g.addPig(C, GY - 146, 'foreman');
            g.addRoof(C, GY - 256, 120, 40, 'wood');
        }
    },
    {
        id: 12,
        world: 'meadow',
        worldLevel: '1-12',
        name: '1-12 倒挂三角',
        subtitle: '别致的桁架顶棚结构，攻其薄弱三角支点',
        birds: ['blue', 'yellow', 'red'],
        parScore: 42000,
        build(g, GY) {
            const T = 1380;
            g.addBlock(T - 65, GY - 60, 22, 120, 'glass');
            g.addBlock(T + 65, GY - 60, 22, 120, 'glass');
            g.addBlock(T, GY - 129, 165, 18, 'wood');
            g.addPig(T, GY - 24, 'helmet');
            g.addPig(T, GY - 149, 'normal');

            g.addRoof(T - 40, GY - 165, 70, 44, 'wood');
            g.addRoof(T + 40, GY - 165, 70, 44, 'wood');
            g.addBlock(T, GY - 195, 100, 16, 'wood');
            g.addPig(T, GY - 215, 'small');
        }
    },
    {
        id: 13,
        world: 'meadow',
        worldLevel: '1-13',
        name: '1-13 悬空木舍',
        subtitle: '高架支柱上的精致木屋，下方藏有暗雷',
        birds: ['yellow', 'blue', 'red'],
        parScore: 46000,
        build(g, GY) {
            const H = 1410;
            g.addBlock(H - 60, GY - 75, 22, 150, 'wood');
            g.addBlock(H + 60, GY - 75, 22, 150, 'wood');
            g.addBlock(H, GY - 159, 160, 18, 'wood');
            g.addTNT(H, GY - 21);

            g.addBlock(H - 45, GY - 208, 18, 80, 'glass');
            g.addBlock(H + 45, GY - 208, 18, 80, 'glass');
            g.addBlock(H, GY - 257, 125, 18, 'wood');
            g.addPig(H, GY - 184, 'foreman');
            g.addRoof(H, GY - 286, 110, 40, 'wood');
            g.addPig(H, GY - 275, 'small');
        }
    },
    {
        id: 14,
        world: 'meadow',
        worldLevel: '1-14',
        name: '1-14 连环哨塔',
        subtitle: '四座紧密咬合的木质岗哨，形成严密防御网',
        birds: ['red', 'yellow', 'blue', 'yellow'],
        parScore: 54000,
        build(g, GY) {
            const base = 1200;
            [0, 110, 220, 330].forEach((dx, i) => {
                const px = base + dx;
                g.addBlock(px - 30, GY - 45, 20, 90, 'wood');
                g.addBlock(px + 30, GY - 45, 20, 90, 'wood');
                g.addBlock(px, GY - 99, 90, 18, 'wood');
                g.addPig(px, GY - 22, i % 2 === 0 ? 'normal' : 'helmet');
                if (i === 1 || i === 2) {
                    g.addBlock(px, GY - 143, 18, 70, 'glass');
                    g.addPig(px, GY - 188, 'small');
                }
            });
            g.addTNT(base + 165, GY - 21);
        }
    },
    {
        id: 15,
        world: 'meadow',
        worldLevel: '1-15',
        name: '1-15 牧场总领 (BOSS)',
        subtitle: '翠绿牧场终局之战！钢盔禁卫军与大胡子猪总领！',
        birds: ['yellow', 'blue', 'yellow', 'red', 'red'],
        parScore: 68000,
        build(g, GY) {
            const B = 1420;
            // 3-bay ground fortification
            [-130, -45, 45, 130].forEach(dx => {
                g.addBlock(B + dx, GY - 60, 26, 120, 'wood');
            });
            g.addBlock(B, GY - 129, 310, 20, 'wood');
            g.addPig(B - 88, GY - 24, 'helmet');
            g.addPig(B + 88, GY - 24, 'helmet');
            g.addTNT(B, GY - 21);

            // Level 2 Throne Room
            g.addBlock(B - 75, GY - 189, 22, 100, 'wood');
            g.addBlock(B + 75, GY - 189, 22, 100, 'wood');
            g.addBlock(B, GY - 249, 190, 20, 'wood');
            g.addPig(B, GY - 156, 'foreman'); // BOSS PIG!

            // Flanking watchtowers
            g.addRoof(B - 75, GY - 279, 80, 40, 'wood');
            g.addRoof(B + 75, GY - 279, 80, 40, 'wood');
            g.addPig(B - 75, GY - 240, 'small');
            g.addPig(B + 75, GY - 240, 'small');
        }
    },
    {
        id: 16,
        world: 'desert',
        worldLevel: '2-1',
        name: '2-1 爆破专家',
        subtitle: '炸弹黑登场！深入敌阵引爆峡谷军火库！',
        birds: ['bomb', 'yellow', 'bomb', 'red'],
        parScore: 52000,
        build(g, GY) {
            const C = 1400;
            g.addBlock(C - 130, GY - 55, 28, 110, 'stone');
            g.addBlock(C, GY - 55, 26, 110, 'stone');
            g.addBlock(C + 130, GY - 55, 28, 110, 'stone');
            g.addBlock(C - 65, GY - 120, 156, 20, 'stone');
            g.addBlock(C + 65, GY - 120, 156, 20, 'stone');

            g.addTNT(C - 85, GY - 21);
            g.addPig(C - 40, GY - 22, 'normal');
            g.addPig(C + 50, GY - 24, 'foreman');
            g.addTNT(C + 92, GY - 21);

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
        id: 17,
        world: 'desert',
        worldLevel: '2-2',
        name: '2-2 空投轰炸',
        subtitle: '白公主越顶投下爆炸蛋，本体拉升撞击高塔！',
        birds: ['matilda', 'matilda', 'yellow', 'bomb'],
        parScore: 55000,
        build(g, GY) {
            g.addStaticPlatform(1150, GY - 85, 34, 170, 0, 'stone');
            g.addPig(1150, GY - 188, 'small');

            const T = 1310;
            g.addBlock(T - 60, GY - 40, 20, 80, 'wood');
            g.addBlock(T + 60, GY - 40, 20, 80, 'wood');
            g.addBlock(T, GY - 89, 150, 16, 'glass');
            g.addPig(T - 20, GY - 22, 'helmet');
            g.addTNT(T + 25, GY - 21);

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
        id: 18,
        world: 'desert',
        worldLevel: '2-3',
        name: '2-3 弹跳奇兵',
        subtitle: '利用弹力橡胶垫折射奇袭，或击断吊索坠落悬空TNT！',
        birds: ['red', 'blue', 'yellow', 'bomb'],
        parScore: 58000,
        build(g, GY) {
            g.addBouncyPad(960, GY - 14, 95, 24, -0.18);
            g.addStaticPlatform(1140, GY - 110, 32, 220, 0, 'stone');

            g.addStaticPlatform(1440, GY - 390, 90, 20, 0, 'stone');
            g.addHangingTNT(1440, GY - 380, 1440, GY - 265);

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
    {
        id: 19,
        world: 'desert',
        worldLevel: '2-4',
        name: '2-4 峡谷碉堡',
        subtitle: '峡谷石缝中的双重石碉，炸弹黑克制厚重花岗岩',
        birds: ['bomb', 'matilda', 'red'],
        parScore: 48000,
        build(g, GY) {
            const B = 1380;
            g.addBlock(B - 80, GY - 60, 28, 120, 'stone');
            g.addBlock(B + 80, GY - 60, 28, 120, 'stone');
            g.addBlock(B, GY - 130, 195, 20, 'stone');
            g.addPig(B, GY - 24, 'helmet');
            g.addTNT(B - 35, GY - 21);

            g.addBlock(B - 60, GY - 185, 24, 90, 'stone');
            g.addBlock(B + 60, GY - 185, 24, 90, 'stone');
            g.addBlock(B, GY - 239, 150, 18, 'stone');
            g.addPig(B, GY - 164, 'foreman');
            g.addRoof(B, GY - 268, 130, 42, 'stone');
        }
    },
    {
        id: 20,
        world: 'desert',
        worldLevel: '2-5',
        name: '2-5 悬崖栈道',
        subtitle: '悬崖高台上的木石栈道，白公主下蛋精准斩首',
        birds: ['yellow', 'bomb', 'matilda'],
        parScore: 50000,
        build(g, GY) {
            g.addStaticPlatform(1220, GY - 150, 180, 22, 0, 'stone');
            g.addBlock(1220, GY - 179, 160, 18, 'wood');
            g.addPig(1170, GY - 198, 'normal');
            g.addTNT(1250, GY - 208);

            const V = 1480;
            g.addBlock(V - 50, GY - 55, 24, 110, 'stone');
            g.addBlock(V + 50, GY - 55, 24, 110, 'stone');
            g.addBlock(V, GY - 119, 135, 18, 'wood');
            g.addPig(V, GY - 24, 'foreman');
            g.addPig(V, GY - 146, 'helmet');
        }
    },
    {
        id: 21,
        world: 'desert',
        worldLevel: '2-6',
        name: '2-6 碎石金字塔',
        subtitle: '阶梯状石板金字塔，强行拆解其稳定斜面',
        birds: ['bomb', 'yellow', 'bomb'],
        parScore: 52000,
        build(g, GY) {
            const P = 1400;
            // Base layer
            [-90, -30, 30, 90].forEach(dx => {
                g.addBlock(P + dx, GY - 45, 24, 90, 'stone');
            });
            g.addBlock(P, GY - 99, 225, 18, 'stone');
            g.addPig(P - 60, GY - 22, 'normal');
            g.addPig(P + 60, GY - 24, 'helmet');

            // Mid layer
            [-50, 50].forEach(dx => {
                g.addBlock(P + dx, GY - 149, 24, 80, 'stone');
            });
            g.addBlock(P, GY - 198, 140, 18, 'stone');
            g.addPig(P, GY - 128, 'foreman');

            // Top
            g.addRoof(P, GY - 228, 100, 42, 'stone');
            g.addPig(P, GY - 215, 'small');
        }
    },
    {
        id: 22,
        world: 'desert',
        worldLevel: '2-7',
        name: '2-7 炸药库奇袭',
        subtitle: '四枚高爆炸药桶环绕的核心仓库，引爆连环冲击',
        birds: ['matilda', 'yellow', 'bomb'],
        parScore: 56000,
        build(g, GY) {
            const S = 1390;
            g.addBlock(S - 90, GY - 55, 26, 110, 'stone');
            g.addBlock(S + 90, GY - 55, 26, 110, 'stone');
            g.addBlock(S, GY - 119, 215, 20, 'stone');

            g.addTNT(S - 45, GY - 21);
            g.addTNT(S + 45, GY - 21);
            g.addPig(S, GY - 24, 'foreman');

            g.addBlock(S - 45, GY - 174, 22, 90, 'wood');
            g.addBlock(S + 45, GY - 174, 22, 90, 'wood');
            g.addBlock(S, GY - 228, 130, 18, 'wood');
            g.addTNT(S - 90, GY - 139);
            g.addTNT(S + 90, GY - 139);
            g.addPig(S, GY - 148, 'helmet');
        }
    },
    {
        id: 23,
        world: 'desert',
        worldLevel: '2-8',
        name: '2-8 巨石横梁',
        subtitle: '沉重花岗岩横梁压顶，瓦解下层支柱引发重力压杀',
        birds: ['bomb', 'bomb', 'yellow'],
        parScore: 54000,
        build(g, GY) {
            const B = 1380;
            g.addBlock(B - 80, GY - 65, 28, 130, 'stone');
            g.addBlock(B + 80, GY - 65, 28, 130, 'stone');
            g.addBlock(B, GY - 140, 200, 22, 'stone');
            g.addPig(B - 35, GY - 24, 'helmet');
            g.addPig(B + 35, GY - 22, 'normal');

            // Heavy boulders on the beam
            g.addBoulder(B - 45, GY - 178, 25, 'stone');
            g.addBoulder(B + 45, GY - 178, 25, 'stone');
            g.addPig(B, GY - 168, 'foreman');
        }
    },
    {
        id: 24,
        world: 'desert',
        worldLevel: '2-9',
        name: '2-9 鹰击长空',
        subtitle: '垂直深坑防空壕，唯有白公主的高空弹药能落入深井',
        birds: ['matilda', 'matilda', 'bomb'],
        parScore: 55000,
        build(g, GY) {
            // High shield pillar
            g.addStaticPlatform(1200, GY - 120, 32, 240, 0, 'stone');

            const D = 1420;
            g.addBlock(D - 70, GY - 55, 26, 110, 'stone');
            g.addBlock(D + 70, GY - 55, 26, 110, 'stone');
            g.addBlock(D, GY - 119, 175, 18, 'glass'); // Fragile roof over trench!
            g.addPig(D, GY - 24, 'foreman');
            g.addTNT(D - 30, GY - 21);

            const R = 1580;
            g.addBlock(R - 40, GY - 60, 22, 120, 'stone');
            g.addBlock(R + 40, GY - 60, 22, 120, 'stone');
            g.addBlock(R, GY - 129, 110, 18, 'wood');
            g.addPig(R, GY - 24, 'helmet');
        }
    },
    {
        id: 25,
        world: 'desert',
        worldLevel: '2-10',
        name: '2-10 拱门要塞',
        subtitle: '荒漠峡谷的石头拱门，支撑起整个哨兵营房',
        birds: ['bomb', 'yellow', 'matilda', 'red'],
        parScore: 60000,
        build(g, GY) {
            const A = 1400;
            g.addBlock(A - 100, GY - 70, 30, 140, 'stone');
            g.addBlock(A + 100, GY - 70, 30, 140, 'stone');
            g.addBlock(A, GY - 151, 240, 22, 'stone');

            g.addPig(A, GY - 24, 'foreman');
            g.addTNT(A - 50, GY - 21);
            g.addTNT(A + 50, GY - 21);

            g.addBlock(A - 60, GY - 206, 22, 88, 'wood');
            g.addBlock(A + 60, GY - 206, 22, 88, 'wood');
            g.addBlock(A, GY - 259, 160, 18, 'wood');
            g.addPig(A - 30, GY - 180, 'helmet');
            g.addPig(A + 30, GY - 180, 'normal');
            g.addRoof(A, GY - 289, 130, 42, 'stone');
        }
    },
    {
        id: 26,
        world: 'desert',
        worldLevel: '2-11',
        name: '2-11 吊桥锁链',
        subtitle: '悬空吊索连接两座悬崖，击毁悬索让桥面崩解',
        birds: ['yellow', 'bomb', 'red'],
        parScore: 52000,
        build(g, GY) {
            g.addStaticPlatform(1200, GY - 120, 30, 240, 0, 'stone');
            g.addStaticPlatform(1600, GY - 120, 30, 240, 0, 'stone');

            // Suspended bridge
            const C = 1400;
            g.addBlock(C - 100, GY - 120, 20, 80, 'wood');
            g.addBlock(C, GY - 120, 20, 80, 'wood');
            g.addBlock(C + 100, GY - 120, 20, 80, 'wood');
            g.addBlock(C, GY - 169, 240, 18, 'wood');

            g.addPig(C - 50, GY - 192, 'helmet');
            g.addPig(C + 50, GY - 192, 'foreman');
            g.addPig(C, GY - 22, 'normal');
            g.addTNT(C, GY - 189);
        }
    },
    {
        id: 27,
        world: 'desert',
        worldLevel: '2-12',
        name: '2-12 峡谷双雄',
        subtitle: '双子坚石碉堡并立，各由一名钢盔队长驻守',
        birds: ['bomb', 'matilda', 'bomb'],
        parScore: 58000,
        build(g, GY) {
            [1270, 1510].forEach(posX => {
                g.addBlock(posX - 50, GY - 60, 26, 120, 'stone');
                g.addBlock(posX + 50, GY - 60, 26, 120, 'stone');
                g.addBlock(posX, GY - 130, 140, 20, 'stone');
                g.addPig(posX, GY - 24, 'helmet');

                g.addBlock(posX - 35, GY - 175, 20, 70, 'wood');
                g.addBlock(posX + 35, GY - 175, 20, 70, 'wood');
                g.addBlock(posX, GY - 219, 105, 18, 'wood');
                g.addPig(posX, GY - 158, 'normal');
                g.addRoof(posX, GY - 247, 90, 38, 'wood');
            });
            g.addTNT(1390, GY - 21);
        }
    },
    {
        id: 28,
        world: 'desert',
        worldLevel: '2-13',
        name: '2-13 地底坑道',
        subtitle: '掩盖在重石与木架下的暗道，掀翻房顶将敌军全歼',
        birds: ['matilda', 'bomb', 'yellow'],
        parScore: 56000,
        build(g, GY) {
            const U = 1410;
            g.addBlock(U - 110, GY - 50, 28, 100, 'stone');
            g.addBlock(U, GY - 50, 24, 100, 'wood');
            g.addBlock(U + 110, GY - 50, 28, 100, 'stone');
            g.addBlock(U, GY - 109, 255, 18, 'stone');

            g.addPig(U - 55, GY - 24, 'foreman');
            g.addPig(U + 55, GY - 24, 'helmet');
            g.addTNT(U, GY - 129);

            g.addBlock(U - 60, GY - 163, 22, 90, 'wood');
            g.addBlock(U + 60, GY - 163, 22, 90, 'wood');
            g.addBlock(U, GY - 217, 155, 18, 'wood');
            g.addPig(U, GY - 138, 'normal');
            g.addRoof(U, GY - 247, 130, 42, 'stone');
        }
    },
    {
        id: 29,
        world: 'desert',
        worldLevel: '2-14',
        name: '2-14 乱石穿空',
        subtitle: '石球与炸药桶错落摆放的险要关口，稍有不慎引发全局连锁',
        birds: ['bomb', 'yellow', 'matilda', 'red'],
        parScore: 62000,
        build(g, GY) {
            const R = 1390;
            g.addBlock(R - 90, GY - 60, 26, 120, 'stone');
            g.addBlock(R + 90, GY - 60, 26, 120, 'stone');
            g.addBlock(R, GY - 130, 215, 20, 'stone');
            g.addPig(R, GY - 24, 'foreman');
            g.addTNT(R - 40, GY - 21);
            g.addTNT(R + 40, GY - 21);

            g.addBoulder(R - 50, GY - 168, 26, 'stone');
            g.addBoulder(R + 50, GY - 168, 26, 'stone');

            g.addBlock(R - 55, GY - 232, 22, 80, 'wood');
            g.addBlock(R + 55, GY - 232, 22, 80, 'wood');
            g.addBlock(R, GY - 281, 145, 18, 'wood');
            g.addPig(R, GY - 208, 'helmet');
            g.addRoof(R, GY - 310, 120, 40, 'stone');
        }
    },
    {
        id: 30,
        world: 'desert',
        worldLevel: '2-15',
        name: '2-15 峡谷总管 (BOSS)',
        subtitle: '落日峡谷大决战！三层石堡与大胡子军火总管！',
        birds: ['bomb', 'matilda', 'yellow', 'bomb', 'red'],
        parScore: 78000,
        build(g, GY) {
            const B = 1420;
            // Floor 1 Heavy stone bastion
            [-140, -50, 50, 140].forEach(dx => {
                g.addBlock(B + dx, GY - 65, 30, 130, 'stone');
            });
            g.addBlock(B, GY - 141, 325, 22, 'stone');
            g.addPig(B - 95, GY - 24, 'helmet');
            g.addPig(B + 95, GY - 24, 'helmet');
            g.addTNT(B - 45, GY - 21);
            g.addTNT(B + 45, GY - 21);

            // Floor 2
            g.addBlock(B - 85, GY - 206, 26, 110, 'stone');
            g.addBlock(B + 85, GY - 206, 26, 110, 'stone');
            g.addBlock(B, GY - 271, 210, 20, 'stone');
            g.addPig(B, GY - 168, 'foreman'); // BOSS!

            // Floor 3 Lookout
            g.addBlock(B - 45, GY - 326, 20, 90, 'wood');
            g.addBlock(B + 45, GY - 326, 20, 90, 'wood');
            g.addBlock(B, GY - 380, 125, 18, 'wood');
            g.addPig(B, GY - 302, 'helmet');
            g.addRoof(B, GY - 408, 110, 38, 'stone');
        }
    },
    {
        id: 31,
        world: 'snow',
        worldLevel: '3-1',
        name: '3-1 寒冰水晶宫',
        subtitle: '蓝弟弟大显身手！漫天飞雪中粉碎三重冰晶回廊！',
        birds: ['blue', 'blue', 'yellow', 'bomb'],
        parScore: 52000,
        build(g, GY) {
            const P = 1380;
            g.addBlock(P - 110, GY - 50, 20, 100, 'glass');
            g.addBlock(P - 35, GY - 50, 20, 100, 'glass');
            g.addBlock(P + 35, GY - 50, 20, 100, 'glass');
            g.addBlock(P + 110, GY - 50, 20, 100, 'glass');
            g.addBlock(P, GY - 109, 260, 18, 'glass');

            g.addPig(P - 70, GY - 22, 'normal');
            g.addPig(P, GY - 24, 'helmet');
            g.addPig(P + 70, GY - 22, 'normal');

            g.addBlock(P - 60, GY - 165, 18, 80, 'glass');
            g.addBlock(P + 60, GY - 165, 18, 80, 'glass');
            g.addBlock(P, GY - 212, 160, 16, 'wood');
            g.addPig(P, GY - 150, 'foreman');

            g.addBlock(P, GY - 255, 18, 60, 'glass');
            g.addRoof(P, GY - 295, 80, 36, 'wood');
            g.addPig(P, GY - 240, 'small');
        }
    },
    {
        id: 32,
        world: 'snow',
        worldLevel: '3-2',
        name: '3-2 极光跳跃',
        subtitle: '双重高弹跳板联动！高空倒挂巨石与悬空TNT连环引爆！',
        birds: ['yellow', 'red', 'matilda', 'bomb'],
        parScore: 64000,
        build(g, GY) {
            g.addBouncyPad(930, GY - 14, 90, 24, -0.15);
            g.addBouncyPad(1210, GY - 14, 85, 24, 0.12);

            g.addStaticPlatform(1360, GY - 290, 160, 22, 0, 'stone');
            g.addBlock(1430, GY - 315, 16, 40, 'glass');
            g.addBoulder(1370, GY - 330, 28, 'stone');
            g.addTNT(1310, GY - 318);

            const B = 1520;
            g.addBlock(B - 80, GY - 55, 24, 110, 'glass');
            g.addBlock(B + 80, GY - 55, 24, 110, 'stone');
            g.addBlock(B, GY - 119, 190, 18, 'wood');
            g.addPig(B - 25, GY - 24, 'helmet');
            g.addPig(B + 35, GY - 25, 'foreman');
            g.addTNT(B, GY - 21);

            g.addBlock(B, GY - 165, 20, 60, 'glass');
            g.addPig(B, GY - 148, 'small');
            g.addRoof(B, GY - 200, 100, 38, 'stone');
        }
    },
    {
        id: 33,
        world: 'snow',
        worldLevel: '3-3',
        name: '3-3 冰壁雪崩',
        subtitle: '白公主投弹震塌雪峰支柱，诱发大雪崩席卷防空掩体！',
        birds: ['matilda', 'bomb', 'blue', 'terence'],
        parScore: 72000,
        build(g, GY) {
            g.addStaticPlatform(1180, GY - 220, 140, 20, 0, 'stone');
            g.addBlock(1240, GY - 250, 16, 40, 'glass');
            g.addBoulder(1190, GY - 262, 25, 'stone');
            g.addBoulder(1140, GY - 260, 22, 'stone');
            g.addTNT(1100, GY - 240);

            const V = 1460;
            g.addBlock(V - 100, GY - 60, 26, 120, 'stone');
            g.addBlock(V, GY - 60, 22, 120, 'glass');
            g.addBlock(V + 100, GY - 60, 26, 120, 'stone');
            g.addBlock(V - 50, GY - 129, 120, 18, 'wood');
            g.addBlock(V + 50, GY - 129, 120, 18, 'wood');

            g.addPig(V - 50, GY - 24, 'helmet');
            g.addPig(V + 50, GY - 24, 'foreman');
            g.addTNT(V - 8, GY - 21);

            g.addBlock(V - 45, GY - 180, 20, 75, 'glass');
            g.addBlock(V + 45, GY - 180, 20, 75, 'glass');
            g.addBlock(V, GY - 225, 130, 18, 'wood');
            g.addPig(V, GY - 165, 'helmet');
            g.addPig(V, GY - 254, 'small');
        }
    },
    {
        id: 34,
        world: 'snow',
        worldLevel: '3-4',
        name: '3-4 双重弹跳',
        subtitle: '雪地双弹射板！利用两段折射将飞鸟送至城堡顶部',
        birds: ['blue', 'yellow', 'bomb'],
        parScore: 50000,
        build(g, GY) {
            g.addBouncyPad(950, GY - 14, 90, 24, -0.16);
            g.addBouncyPad(1200, GY - 14, 85, 24, 0.14);

            const T = 1430;
            g.addBlock(T - 60, GY - 55, 22, 110, 'glass');
            g.addBlock(T + 60, GY - 55, 22, 110, 'glass');
            g.addBlock(T, GY - 119, 150, 18, 'glass');
            g.addPig(T, GY - 22, 'normal');

            g.addBlock(T - 40, GY - 170, 20, 80, 'wood');
            g.addBlock(T + 40, GY - 170, 20, 80, 'wood');
            g.addBlock(T, GY - 219, 115, 18, 'wood');
            g.addPig(T, GY - 146, 'helmet');
            g.addRoof(T, GY - 248, 100, 40, 'wood');
        }
    },
    {
        id: 35,
        world: 'snow',
        worldLevel: '3-5',
        name: '3-5 冰川迷宫',
        subtitle: '交织错落的冰柱立阵，分身蓝鸟的最佳狩猎场',
        birds: ['blue', 'blue', 'yellow', 'matilda'],
        parScore: 54000,
        build(g, GY) {
            const M = 1380;
            [-100, -35, 35, 100].forEach(dx => {
                g.addBlock(M + dx, GY - 50, 18, 100, 'glass');
            });
            g.addBlock(M, GY - 109, 235, 18, 'glass');
            g.addPig(M - 68, GY - 22, 'normal');
            g.addPig(M + 68, GY - 22, 'normal');
            g.addPig(M, GY - 138, 'helmet');

            [-60, 60].forEach(dx => {
                g.addBlock(M + dx, GY - 165, 18, 80, 'glass');
            });
            g.addBlock(M, GY - 213, 155, 18, 'wood');
            g.addPig(M, GY - 238, 'foreman');
            g.addRoof(M, GY - 243, 120, 42, 'wood');
        }
    },
    {
        id: 36,
        world: 'snow',
        worldLevel: '3-6',
        name: '3-6 寒冰吊桥',
        subtitle: '由冰晶搭成的半悬空索桥，击碎一角全盘皆崩',
        birds: ['yellow', 'blue', 'bomb'],
        parScore: 48000,
        build(g, GY) {
            g.addStaticPlatform(1210, GY - 130, 30, 260, 0, 'stone');
            g.addStaticPlatform(1570, GY - 130, 30, 260, 0, 'stone');

            const C = 1390;
            g.addBlock(C - 70, GY - 130, 18, 70, 'glass');
            g.addBlock(C + 70, GY - 130, 18, 70, 'glass');
            g.addBlock(C, GY - 174, 210, 18, 'glass');

            g.addPig(C - 45, GY - 198, 'helmet');
            g.addPig(C + 45, GY - 198, 'foreman');
            g.addPig(C, GY - 22, 'normal');
            g.addTNT(C, GY - 21);
        }
    },
    {
        id: 37,
        world: 'snow',
        worldLevel: '3-7',
        name: '3-7 冻土巨坑',
        subtitle: '极寒深渊中的隐蔽哨卡，利用高抛物线穿心打击',
        birds: ['matilda', 'blue', 'bomb'],
        parScore: 52000,
        build(g, GY) {
            g.addStaticPlatform(1160, GY - 100, 32, 200, 0, 'stone');

            const D = 1390;
            g.addBlock(D - 70, GY - 45, 20, 90, 'glass');
            g.addBlock(D + 70, GY - 45, 20, 90, 'glass');
            g.addBlock(D, GY - 99, 175, 18, 'glass');
            g.addPig(D, GY - 24, 'foreman');
            g.addTNT(D, GY - 119);

            const R = 1560;
            g.addBlock(R - 45, GY - 60, 22, 120, 'stone');
            g.addBlock(R + 45, GY - 60, 22, 120, 'stone');
            g.addBlock(R, GY - 129, 120, 18, 'stone');
            g.addPig(R, GY - 24, 'helmet');
        }
    },
    {
        id: 38,
        world: 'snow',
        worldLevel: '3-8',
        name: '3-8 冰柱倾颓',
        subtitle: '多根纤细冰晶立柱连环排布，引发多米诺骨牌式崩塌',
        birds: ['yellow', 'blue', 'blue', 'bomb'],
        parScore: 56000,
        build(g, GY) {
            const base = 1220;
            [0, 80, 160, 240, 320].forEach((dx, i) => {
                const px = base + dx;
                g.addBlock(px, GY - 65, 18, 130, 'glass');
                g.addPig(px, GY - 150, i % 2 === 0 ? 'normal' : 'small');
            });
            g.addTNT(base + 120, GY - 21);
            g.addTNT(base + 280, GY - 21);
        }
    },
    {
        id: 39,
        world: 'snow',
        worldLevel: '3-9',
        name: '3-9 逆向反弹',
        subtitle: '右侧绝壁装有反冲弹射垫，打向墙面反扑掩体内部',
        birds: ['blue', 'yellow', 'bomb'],
        parScore: 54000,
        build(g, GY) {
            // Rebound pad at far right
            g.addBouncyPad(1620, GY - 140, 30, 160, 0);

            const T = 1360;
            g.addBlock(T - 65, GY - 60, 24, 120, 'stone');
            g.addBlock(T + 65, GY - 60, 24, 120, 'stone');
            g.addBlock(T, GY - 130, 165, 20, 'stone');
            g.addPig(T, GY - 24, 'foreman');
            g.addTNT(T, GY - 21);

            g.addBlock(T, GY - 180, 20, 75, 'glass');
            g.addPig(T, GY - 238, 'helmet');
        }
    },
    {
        id: 40,
        world: 'snow',
        worldLevel: '3-10',
        name: '3-10 冰晶双塔',
        subtitle: '双子冰塔顶托连桥，冰与雪的绝美对称要塞',
        birds: ['blue', 'blue', 'yellow', 'bomb'],
        parScore: 60000,
        build(g, GY) {
            [1270, 1510].forEach(posX => {
                g.addBlock(posX - 40, GY - 55, 20, 110, 'glass');
                g.addBlock(posX + 40, GY - 55, 20, 110, 'glass');
                g.addBlock(posX, GY - 119, 115, 18, 'glass');
                g.addPig(posX, GY - 22, 'normal');

                g.addBlock(posX - 30, GY - 168, 18, 75, 'glass');
                g.addBlock(posX + 30, GY - 168, 18, 75, 'glass');
                g.addBlock(posX, GY - 214, 95, 16, 'wood');
                g.addPig(posX, GY - 146, 'helmet');
            });
            // Connecting ice bridge
            g.addBlock(1390, GY - 119, 130, 18, 'glass');
            g.addPig(1390, GY - 148, 'foreman');
        }
    },
    {
        id: 41,
        world: 'snow',
        worldLevel: '3-11',
        name: '3-11 雪峰重炮',
        subtitle: '雪峰顶端的重炮发射架，炸弹黑定点拔除火力点',
        birds: ['bomb', 'matilda', 'blue'],
        parScore: 56000,
        build(g, GY) {
            g.addStaticPlatform(1360, GY - 160, 220, 24, 0, 'stone');
            g.addBlock(1300, GY - 210, 22, 75, 'wood');
            g.addBlock(1420, GY - 210, 22, 75, 'wood');
            g.addBlock(1360, GY - 256, 155, 18, 'wood');
            g.addPig(1360, GY - 188, 'foreman');
            g.addTNT(1360, GY - 276);

            g.addPig(1260, GY - 24, 'helmet');
            g.addPig(1460, GY - 24, 'helmet');
        }
    },
    {
        id: 42,
        world: 'snow',
        worldLevel: '3-12',
        name: '3-12 极地金字塔',
        subtitle: '全由通透冰砖堆叠的冰塔，蓝弟弟的一击必杀',
        birds: ['blue', 'yellow', 'bomb', 'red'],
        parScore: 62000,
        build(g, GY) {
            const P = 1390;
            [-80, -25, 25, 80].forEach(dx => {
                g.addBlock(P + dx, GY - 45, 18, 90, 'glass');
            });
            g.addBlock(P, GY - 99, 205, 18, 'glass');
            g.addPig(P - 50, GY - 22, 'normal');
            g.addPig(P + 50, GY - 22, 'normal');

            [-45, 45].forEach(dx => {
                g.addBlock(P + dx, GY - 148, 18, 75, 'glass');
            });
            g.addBlock(P, GY - 194, 130, 18, 'glass');
            g.addPig(P, GY - 128, 'helmet');

            g.addRoof(P, GY - 224, 90, 40, 'wood');
            g.addPig(P, GY - 215, 'foreman');
        }
    },
    {
        id: 43,
        world: 'snow',
        worldLevel: '3-13',
        name: '3-13 浮冰连环',
        subtitle: '三段浮冰台阶上的梯级防线，逐个击破',
        birds: ['blue', 'blue', 'matilda', 'bomb'],
        parScore: 64000,
        build(g, GY) {
            [1220, 1380, 1540].forEach((px, i) => {
                const h = 80 + i * 40;
                g.addBlock(px - 35, GY - h/2, 20, h, 'glass');
                g.addBlock(px + 35, GY - h/2, 20, h, 'glass');
                g.addBlock(px, GY - h - 9, 105, 18, 'glass');
                g.addPig(px, GY - 24, i === 1 ? 'foreman' : 'helmet');
                g.addPig(px, GY - h - 28, 'small');
            });
            g.addTNT(1300, GY - 21);
            g.addTNT(1460, GY - 21);
        }
    },
    {
        id: 44,
        world: 'snow',
        worldLevel: '3-14',
        name: '3-14 极寒要塞',
        subtitle: '石头与冰晶混合构筑的严寒要塞，合理搭配鸟种特性',
        birds: ['blue', 'yellow', 'bomb', 'matilda'],
        parScore: 68000,
        build(g, GY) {
            const F = 1410;
            g.addBlock(F - 110, GY - 60, 26, 120, 'stone');
            g.addBlock(F - 35, GY - 60, 20, 120, 'glass');
            g.addBlock(F + 35, GY - 60, 20, 120, 'glass');
            g.addBlock(F + 110, GY - 60, 26, 120, 'stone');
            g.addBlock(F, GY - 130, 260, 20, 'stone');

            g.addPig(F - 72, GY - 24, 'helmet');
            g.addPig(F + 72, GY - 24, 'helmet');
            g.addTNT(F, GY - 21);

            g.addBlock(F - 55, GY - 185, 22, 90, 'wood');
            g.addBlock(F + 55, GY - 185, 22, 90, 'wood');
            g.addBlock(F, GY - 239, 145, 18, 'wood');
            g.addPig(F, GY - 160, 'foreman');
            g.addRoof(F, GY - 268, 120, 38, 'glass');
        }
    },
    {
        id: 45,
        world: 'snow',
        worldLevel: '3-15',
        name: '3-15 冰冠司令 (BOSS)',
        subtitle: '冰峰极境终局决战！冰霜王座上的钢铁司令官！',
        birds: ['blue', 'bomb', 'matilda', 'yellow', 'bomb'],
        parScore: 84000,
        build(g, GY) {
            const B = 1420;
            [-130, -45, 45, 130].forEach(dx => {
                g.addBlock(B + dx, GY - 65, dx.toString().includes('30') ? 28 : 22, 130, dx.toString().includes('30') ? 'stone' : 'glass');
            });
            g.addBlock(B, GY - 141, 310, 22, 'stone');
            g.addPig(B - 88, GY - 24, 'helmet');
            g.addPig(B + 88, GY - 24, 'helmet');
            g.addTNT(B, GY - 21);

            // Floor 2
            g.addBlock(B - 75, GY - 206, 24, 110, 'glass');
            g.addBlock(B + 75, GY - 206, 24, 110, 'glass');
            g.addBlock(B, GY - 271, 190, 20, 'glass');
            g.addPig(B, GY - 168, 'foreman'); // BOSS!

            // Floor 3
            g.addBlock(B, GY - 325, 22, 88, 'wood');
            g.addRoof(B, GY - 378, 110, 40, 'stone');
            g.addPig(B, GY - 315, 'small');
        }
    },
    {
        id: 46,
        world: 'castle',
        worldLevel: '4-1',
        name: '4-1 钟摆破城',
        subtitle: '撞击高空悬挂的攻城铁球，借钟摆巨力横扫城门！',
        birds: ['yellow', 'bomb', 'matilda', 'red'],
        parScore: 68000,
        build(g, GY) {
            g.addStaticPlatform(1210, GY - 380, 80, 22, 0, 'stone');
            // Hanging at exact equilibrium (ballX = anchorX) so zero twitch at start
            g.addPendulumBall(1210, GY - 370, 1210, GY - 210, 28);
            g.addBlock(1210, GY - 170, 18, 60, 'glass'); // Fragile glass kick pin!

            const G = 1420;
            g.addBlock(G - 75, GY - 60, 26, 120, 'stone');
            g.addBlock(G + 75, GY - 60, 26, 120, 'stone');
            g.addBlock(G, GY - 130, 190, 20, 'stone');
            g.addPig(G, GY - 24, 'helmet');
            g.addTNT(G - 35, GY - 21);

            g.addBlock(G - 55, GY - 180, 22, 80, 'wood');
            g.addBlock(G + 55, GY - 180, 22, 80, 'wood');
            g.addBlock(G, GY - 229, 146, 18, 'wood');
            g.addPig(G, GY - 164, 'foreman');
        }
    },
    {
        id: 47,
        world: 'castle',
        worldLevel: '4-2',
        name: '4-2 巨无霸登场',
        subtitle: '大红鸟泰伦斯出击！以绝对吨位碾碎双层花岗岩城墙！',
        birds: ['terence', 'bomb', 'yellow', 'terence'],
        parScore: 75000,
        build(g, GY) {
            g.addBlock(1190, GY - 55, 32, 110, 'stone');
            g.addBlock(1190, GY - 155, 30, 90, 'stone');

            const B = 1420;
            g.addBlock(B - 115, GY - 60, 30, 120, 'stone');
            g.addBlock(B, GY - 60, 28, 120, 'stone');
            g.addBlock(B + 115, GY - 60, 30, 120, 'stone');
            g.addBlock(B - 58, GY - 131, 148, 22, 'stone');
            g.addBlock(B + 58, GY - 131, 148, 22, 'stone');

            g.addPig(B - 58, GY - 24, 'helmet');
            g.addPig(B + 58, GY - 25, 'foreman');
            g.addTNT(B + 165, GY - 21);

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
        id: 48,
        world: 'castle',
        worldLevel: '4-3',
        name: '4-3 连环炼狱',
        subtitle: '冰桥、滚石、弹跳垫与四重连环TNT的终极物理迷宫！',
        birds: ['blue', 'yellow', 'matilda', 'bomb', 'red'],
        parScore: 82000,
        build(g, GY) {
            g.addBouncyPad(940, GY - 14, 90, 24, -0.12);

            g.addStaticPlatform(1210, GY - 250, 160, 20, 0, 'stone');
            g.addBlock(1280, GY - 280, 16, 40, 'glass');
            g.addBoulder(1230, GY - 288, 26, 'stone');
            g.addTNT(1160, GY - 280);

            const L = 1460;
            g.addBlock(L - 130, GY - 55, 24, 110, 'stone');
            g.addBlock(L - 20, GY - 55, 22, 110, 'wood');
            g.addBlock(L + 90, GY - 55, 22, 110, 'wood');
            g.addBlock(L + 190, GY - 55, 26, 110, 'stone');

            g.addBlock(L - 75, GY - 119, 135, 18, 'wood');
            g.addBlock(L + 35, GY - 119, 135, 18, 'glass');
            g.addBlock(L + 140, GY - 119, 125, 18, 'stone');

            g.addTNT(L - 90, GY - 21);
            g.addPig(L - 55, GY - 22, 'helmet');
            g.addPig(L + 35, GY - 24, 'foreman');
            g.addTNT(L + 135, GY - 21);
            g.addPig(L + 165, GY - 22, 'normal');

            g.addBlock(L + 5, GY - 168, 20, 80, 'glass');
            g.addBlock(L + 115, GY - 168, 20, 80, 'glass');
            g.addBlock(L + 60, GY - 217, 145, 18, 'wood');
            g.addPig(L + 60, GY - 150, 'helmet');
            g.addPig(L + 60, GY - 244, 'small');
        }
    },
    {
        id: 49,
        world: 'castle',
        worldLevel: '4-4',
        name: '4-4 皇家门楼',
        subtitle: '暗夜王城的主入口门楼，泰伦斯正面强冲破门',
        birds: ['terence', 'yellow', 'bomb'],
        parScore: 66000,
        build(g, GY) {
            const G = 1400;
            g.addBlock(G - 85, GY - 65, 30, 130, 'stone');
            g.addBlock(G + 85, GY - 65, 30, 130, 'stone');
            g.addBlock(G, GY - 141, 215, 22, 'stone');
            g.addPig(G, GY - 24, 'foreman');
            g.addTNT(G, GY - 162);

            g.addBlock(G - 60, GY - 206, 24, 110, 'wood');
            g.addBlock(G + 60, GY - 206, 24, 110, 'wood');
            g.addBlock(G, GY - 271, 155, 20, 'wood');
            g.addPig(G - 25, GY - 180, 'helmet');
            g.addPig(G + 25, GY - 180, 'helmet');
            g.addRoof(G, GY - 300, 130, 40, 'stone');
        }
    },
    {
        id: 50,
        world: 'castle',
        worldLevel: '4-5',
        name: '4-5 护城河卫所',
        subtitle: '设在护城河栈桥旁的哨卡，击塌木桥沉底消灭',
        birds: ['blue', 'terence', 'bomb'],
        parScore: 68000,
        build(g, GY) {
            const B = 1390;
            g.addBlock(B - 110, GY - 55, 26, 110, 'stone');
            g.addBlock(B, GY - 55, 22, 110, 'wood');
            g.addBlock(B + 110, GY - 55, 26, 110, 'stone');
            g.addBlock(B, GY - 119, 260, 18, 'wood');

            g.addPig(B - 55, GY - 24, 'helmet');
            g.addPig(B + 55, GY - 24, 'foreman');
            g.addTNT(B, GY - 21);

            g.addBlock(B - 65, GY - 174, 22, 90, 'stone');
            g.addBlock(B + 65, GY - 174, 22, 90, 'stone');
            g.addBlock(B, GY - 228, 165, 18, 'stone');
            g.addPig(B, GY - 146, 'helmet');
            g.addRoof(B, GY - 256, 135, 38, 'wood');
        }
    },
    {
        id: 51,
        world: 'castle',
        worldLevel: '4-6',
        name: '4-6 地牢暗室',
        subtitle: '深藏于重石天花板下的地牢暗室，白公主下蛋精准引爆',
        birds: ['matilda', 'bomb', 'terence'],
        parScore: 70000,
        build(g, GY) {
            const D = 1420;
            g.addBlock(D - 80, GY - 60, 30, 120, 'stone');
            g.addBlock(D + 80, GY - 60, 30, 120, 'stone');
            g.addBlock(D, GY - 131, 205, 22, 'stone');
            g.addPig(D, GY - 24, 'foreman');
            g.addTNT(D - 35, GY - 21);

            g.addBlock(D - 50, GY - 185, 22, 88, 'wood');
            g.addBlock(D + 50, GY - 185, 22, 88, 'wood');
            g.addBlock(D, GY - 238, 135, 18, 'wood');
            g.addPig(D, GY - 160, 'helmet');
            g.addPig(D, GY - 262, 'small');
        }
    },
    {
        id: 52,
        world: 'castle',
        worldLevel: '4-7',
        name: '4-7 箭塔合围',
        subtitle: '三座高耸的皇家箭塔，泰伦斯与炸弹黑的拆迁狂欢',
        birds: ['yellow', 'terence', 'bomb'],
        parScore: 74000,
        build(g, GY) {
            [1250, 1420, 1590].forEach((px, i) => {
                g.addBlock(px - 38, GY - 65, 24, 130, 'stone');
                g.addBlock(px + 38, GY - 65, 24, 130, 'stone');
                g.addBlock(px, GY - 139, 110, 18, 'stone');
                g.addPig(px, GY - 24, i === 1 ? 'foreman' : 'helmet');

                g.addBlock(px - 25, GY - 184, 18, 70, 'wood');
                g.addBlock(px + 25, GY - 184, 18, 70, 'wood');
                g.addBlock(px, GY - 228, 85, 18, 'wood');
                g.addRoof(px, GY - 256, 75, 38, 'stone');
                g.addPig(px, GY - 165, 'small');
            });
            g.addTNT(1335, GY - 21);
            g.addTNT(1505, GY - 21);
        }
    },
    {
        id: 53,
        world: 'castle',
        worldLevel: '4-8',
        name: '4-8 弹跳王廷',
        subtitle: '王宫内院铺设的防御弹跳垫，巧妙折射将铁球推入内殿',
        birds: ['terence', 'matilda', 'bomb'],
        parScore: 72000,
        build(g, GY) {
            g.addBouncyPad(960, GY - 14, 95, 24, -0.16);

            const C = 1430;
            g.addBlock(C - 90, GY - 60, 28, 120, 'stone');
            g.addBlock(C + 90, GY - 60, 28, 120, 'stone');
            g.addBlock(C, GY - 130, 220, 20, 'stone');
            g.addPig(C, GY - 24, 'foreman');
            g.addTNT(C - 45, GY - 21);
            g.addTNT(C + 45, GY - 21);

            g.addBlock(C - 60, GY - 185, 22, 90, 'glass');
            g.addBlock(C + 60, GY - 185, 22, 90, 'glass');
            g.addBlock(C, GY - 239, 150, 18, 'wood');
            g.addPig(C, GY - 160, 'helmet');
        }
    },
    {
        id: 54,
        world: 'castle',
        worldLevel: '4-9',
        name: '4-9 钢铁重装',
        subtitle: '全由重石砖与钢盔卫队构筑的纯防守堡垒，暴力拆解',
        birds: ['terence', 'bomb', 'terence'],
        parScore: 76000,
        build(g, GY) {
            const S = 1400;
            [-100, -35, 35, 100].forEach(dx => {
                g.addBlock(S + dx, GY - 60, 26, 120, 'stone');
            });
            g.addBlock(S, GY - 131, 245, 22, 'stone');
            g.addPig(S - 68, GY - 24, 'helmet');
            g.addPig(S + 68, GY - 24, 'helmet');
            g.addPig(S, GY - 160, 'foreman');

            [-50, 50].forEach(dx => {
                g.addBlock(S + dx, GY - 186, 24, 90, 'stone');
            });
            g.addBlock(S, GY - 241, 140, 20, 'stone');
            g.addRoof(S, GY - 271, 120, 42, 'stone');
            g.addPig(S, GY - 230, 'helmet');
        }
    },
    {
        id: 55,
        world: 'castle',
        worldLevel: '4-10',
        name: '4-10 皇冠吊灯',
        subtitle: '高空吊灯悬挂着炸药桶与巨石，切断铁链砸毁王座',
        birds: ['yellow', 'matilda', 'terence'],
        parScore: 78000,
        build(g, GY) {
            const K = 1420;
            g.addStaticPlatform(K, GY - 390, 90, 20, 0, 'stone');
            g.addHangingTNT(K, GY - 380, K, GY - 270);

            g.addBlock(K - 85, GY - 60, 28, 120, 'stone');
            g.addBlock(K + 85, GY - 60, 28, 120, 'stone');
            g.addBlock(K, GY - 130, 210, 20, 'stone');
            g.addPig(K, GY - 24, 'foreman');
            g.addPig(K - 45, GY - 158, 'helmet');
            g.addPig(K + 45, GY - 158, 'helmet');
        }
    },
    {
        id: 56,
        world: 'castle',
        worldLevel: '4-11',
        name: '4-11 绝壁棱堡',
        subtitle: '多角度交叉防守的王城棱堡，泰伦斯以力破巧',
        birds: ['bomb', 'terence', 'matilda', 'yellow'],
        parScore: 80000,
        build(g, GY) {
            const B = 1430;
            [-110, -35, 35, 110].forEach(dx => {
                g.addBlock(B + dx, GY - 65, 26, 130, 'stone');
            });
            g.addBlock(B, GY - 141, 265, 22, 'stone');
            g.addPig(B - 72, GY - 24, 'helmet');
            g.addPig(B + 72, GY - 24, 'helmet');
            g.addTNT(B, GY - 21);

            g.addBlock(B - 65, GY - 201, 22, 100, 'wood');
            g.addBlock(B + 65, GY - 201, 22, 100, 'wood');
            g.addBlock(B, GY - 261, 165, 20, 'stone');
            g.addPig(B, GY - 168, 'foreman');
            g.addRoof(B, GY - 291, 135, 40, 'stone');
        }
    },
    {
        id: 57,
        world: 'castle',
        worldLevel: '4-12',
        name: '4-12 铁壁铜墙',
        subtitle: '游戏中最坚固的三重花岗岩防线，泰伦斯连续冲击',
        birds: ['terence', 'terence', 'bomb'],
        parScore: 82000,
        build(g, GY) {
            [1240, 1390, 1540].forEach((px, i) => {
                g.addBlock(px - 45, GY - 60, 28, 120, 'stone');
                g.addBlock(px + 45, GY - 60, 28, 120, 'stone');
                g.addBlock(px, GY - 131, 130, 22, 'stone');
                g.addPig(px, GY - 24, i === 1 ? 'foreman' : 'helmet');
                g.addRoof(px, GY - 161, 110, 40, 'stone');
            });
            g.addTNT(1315, GY - 21);
            g.addTNT(1465, GY - 21);
        }
    },
    {
        id: 58,
        world: 'castle',
        worldLevel: '4-13',
        name: '4-13 炼狱熔炉',
        subtitle: '城底军械熔炉藏有密集TNT，引爆瞬间烈焰吞没一切',
        birds: ['bomb', 'matilda', 'terence', 'bomb'],
        parScore: 86000,
        build(g, GY) {
            const F = 1410;
            g.addBlock(F - 100, GY - 65, 30, 130, 'stone');
            g.addBlock(F + 100, GY - 65, 30, 130, 'stone');
            g.addBlock(F, GY - 141, 240, 22, 'stone');
            g.addPig(F, GY - 24, 'foreman');
            g.addTNT(F - 50, GY - 21);
            g.addTNT(F + 50, GY - 21);

            g.addBlock(F - 60, GY - 201, 22, 100, 'wood');
            g.addBlock(F + 60, GY - 201, 22, 100, 'wood');
            g.addBlock(F, GY - 261, 155, 20, 'wood');
            g.addPig(F - 25, GY - 168, 'helmet');
            g.addPig(F + 25, GY - 168, 'helmet');
            g.addTNT(F, GY - 282);
        }
    },
    {
        id: 59,
        world: 'castle',
        worldLevel: '4-14',
        name: '4-14 禁卫总督',
        subtitle: '皇宫门前最后一座堡垒，大胡子总督与精锐钢盔军团',
        birds: ['terence', 'bomb', 'matilda', 'yellow', 'terence'],
        parScore: 90000,
        build(g, GY) {
            const B = 1430;
            [-125, -40, 40, 125].forEach(dx => {
                g.addBlock(B + dx, GY - 70, 28, 140, 'stone');
            });
            g.addBlock(B, GY - 151, 290, 22, 'stone');
            g.addPig(B - 82, GY - 24, 'helmet');
            g.addPig(B + 82, GY - 24, 'helmet');
            g.addTNT(B, GY - 21);

            g.addBlock(B - 70, GY - 216, 24, 110, 'stone');
            g.addBlock(B + 70, GY - 216, 24, 110, 'stone');
            g.addBlock(B, GY - 281, 180, 20, 'stone');
            g.addPig(B, GY - 178, 'foreman'); // GOVERNOR!
            g.addRoof(B, GY - 311, 140, 42, 'stone');
        }
    },
    {
        id: 60,
        world: 'castle',
        worldLevel: '4-15',
        name: '4-15 猪王决战 (FINAL BOSS)',
        subtitle: '全明星六鸟终极集结！攻破暗夜皇宫，击败头戴金冠的国王猪！',
        birds: ['blue', 'yellow', 'matilda', 'bomb', 'terence', 'red'],
        parScore: 110000,
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

            g.addTNT(K - 112, GY - 21);
            g.addPig(K - 22, GY - 25, 'foreman');
            g.addPig(K + 28, GY - 24, 'helmet');
            g.addTNT(K + 112, GY - 21);

            // Second floor: KING PIG'S THRONE ROOM!
            g.addBlock(K - 95, GY - 202, 24, 100, 'wood');
            g.addBlock(K + 95, GY - 202, 24, 100, 'wood');
            g.addBlock(K, GY - 262, 230, 20, 'glass');

            g.addPig(K, GY - 186, 'king'); // THE KING PIG BOSS!
            g.addPig(K - 130, GY - 172, 'small');
            g.addPig(K + 130, GY - 172, 'small');

            // Twin royal spires flanking the skylight
            g.addRoof(K - 95, GY - 295, 70, 46, 'stone');
            g.addRoof(K + 95, GY - 295, 70, 46, 'stone');
        }
    },
    // =========================================================================
    // CHAPTER 5: MAGMA VAULT (Levels 5-1 to 5-15, Total 75 Levels)
    // Featuring Hal (回旋鸟), Chuck (极速小鸟), Bomb, Blues, Matilda & Terence!
    // =========================================================================
    {
        id: 61,
        world: 'volcano',
        worldLevel: '5-1',
        name: '5-1 熔岩前哨',
        subtitle: '全新伙伴回旋鸟登场！飞过前哨掩体后点击屏幕，反向折返直击猪猪后方弱点！',
        birds: ['hal', 'yellow', 'red'],
        parScore: 32000,
        build(g, GY) {
            const X = 1380;
            // Bunker facing right (open back)
            g.addBlock(X - 50, GY - 50, 26, 100, 'stone');
            g.addBlock(X + 50, GY - 50, 26, 100, 'wood');
            g.addBlock(X, GY - 110, 140, 20, 'stone');
            g.addRoof(X, GY - 140, 110, 40, 'stone');
            g.addPig(X, GY - 22, 'helmet');

            // Pig hidden behind the stone wall
            const X2 = 1240;
            g.addBlock(X2, GY - 40, 24, 80, 'wood');
            g.addPig(X2, GY - 98, 'small');
        }
    },
    {
        id: 62,
        world: 'volcano',
        worldLevel: '5-2',
        name: '5-2 盲区暗袭',
        subtitle: '猪群躲在背阴的玄武岩深处，用回旋鸟弧线绕后偷袭，再用极速小鸟贯穿木栅！',
        birds: ['hal', 'yellow', 'blue', 'red'],
        parScore: 40000,
        build(g, GY) {
            const X = 1350;
            g.addBlock(X - 70, GY - 55, 24, 110, 'stone');
            g.addBlock(X + 70, GY - 55, 24, 110, 'wood');
            g.addBlock(X, GY - 120, 180, 20, 'stone');
            g.addPig(X, GY - 22, 'normal');
            g.addPig(X - 35, GY - 22, 'small');

            // Second story
            g.addBlock(X - 45, GY - 170, 20, 80, 'wood');
            g.addBlock(X + 45, GY - 170, 20, 80, 'glass');
            g.addBlock(X, GY - 220, 130, 18, 'wood');
            g.addPig(X, GY - 142, 'helmet');

            // Blind spot pig behind thick barrier at X = 1530
            g.addBlock(1530, GY - 60, 30, 120, 'stone');
            g.addPig(1580, GY - 22, 'normal');
        }
    },
    {
        id: 63,
        world: 'volcano',
        worldLevel: '5-3',
        name: '5-3 连锁爆燃',
        subtitle: '熔岩矿坑中的高爆TNT连环陷阱，一击引燃整个熔岩回音廊！',
        birds: ['bomb', 'hal', 'yellow'],
        parScore: 48000,
        build(g, GY) {
            const X = 1360;
            g.addBlock(X - 80, GY - 45, 24, 90, 'wood');
            g.addBlock(X, GY - 45, 24, 90, 'wood');
            g.addBlock(X + 80, GY - 45, 24, 90, 'wood');
            g.addBlock(X - 40, GY - 100, 110, 18, 'wood');
            g.addBlock(X + 40, GY - 100, 110, 18, 'wood');

            g.addTNT(X - 40, GY - 22);
            g.addTNT(X + 40, GY - 22);
            g.addPig(X - 40, GY - 122, 'helmet');
            g.addPig(X + 40, GY - 122, 'normal');

            // Suspended TNT chamber above
            g.addStaticPlatform(X, GY - 230, 140, 20, 0, 'stone');
            g.addTNT(X, GY - 252);
            g.addBoulder(X - 40, GY - 258, 24, 'stone');
            g.addPig(X + 40, GY - 252, 'small');
        }
    },
    {
        id: 64,
        world: 'volcano',
        worldLevel: '5-4',
        name: '5-4 浮岛要塞',
        subtitle: '悬浮熔岩台上的双层黑曜石碉堡，弹射鸟高空下蛋与回旋鸟交叉夹击！',
        birds: ['hal', 'matilda', 'yellow', 'bomb'],
        parScore: 52000,
        build(g, GY) {
            const P = 1380;
            g.addStaticPlatform(P, GY - 160, 240, 24, 0, 'stone');

            // Base ground floor under platform
            g.addPig(P - 60, GY - 22, 'normal');
            g.addPig(P + 60, GY - 22, 'helmet');
            g.addTNT(P, GY - 22);

            // Castle on top of platform
            g.addBlock(P - 70, GY - 215, 24, 86, 'stone');
            g.addBlock(P + 70, GY - 215, 24, 86, 'stone');
            g.addBlock(P, GY - 268, 175, 20, 'stone');
            g.addPig(P, GY - 186, 'foreman');

            g.addBlock(P - 40, GY - 310, 18, 64, 'wood');
            g.addBlock(P + 40, GY - 310, 18, 64, 'wood');
            g.addBlock(P, GY - 352, 110, 18, 'glass');
            g.addRoof(P, GY - 380, 95, 38, 'stone');
            g.addPig(P, GY - 290, 'small');
        }
    },
    {
        id: 65,
        world: 'volcano',
        worldLevel: '5-5',
        name: '5-5 逆风回旋',
        subtitle: '狂暴热气流席卷战场，双回旋鸟接力逆向飞旋，彻底摧毁反斜面地堡！',
        birds: ['hal', 'hal', 'blue', 'red'],
        parScore: 42000,
        build(g, GY) {
            // Target 1: Left-facing fortress
            const X1 = 1240;
            g.addBlock(X1 - 40, GY - 50, 24, 100, 'wood');
            g.addBlock(X1 + 40, GY - 50, 24, 100, 'stone');
            g.addBlock(X1, GY - 110, 115, 20, 'wood');
            g.addPig(X1, GY - 22, 'helmet');
            g.addPig(X1, GY - 132, 'small');

            // Target 2: Deep backward bunker at X = 1520 with thick front shield
            const X2 = 1520;
            g.addBlock(X2 - 50, GY - 75, 32, 150, 'stone'); // Impassable front wall!
            g.addBlock(X2 + 50, GY - 45, 22, 90, 'wood');
            g.addBlock(X2, GY - 160, 135, 20, 'stone');
            g.addPig(X2, GY - 22, 'foreman');
            g.addTNT(X2, GY - 182);
            g.addPig(X2 + 25, GY - 68, 'small');
        }
    },
    {
        id: 66,
        world: 'volcano',
        worldLevel: '5-6',
        name: '5-6 熔岩阶梯',
        subtitle: '三级阶梯式坚固要塞，极速小鸟洞穿前门，回旋鸟精准清理二层死角！',
        birds: ['yellow', 'hal', 'bomb', 'terence'],
        parScore: 55000,
        build(g, GY) {
            // Tier 1 (Low)
            const T1 = 1200;
            g.addBlock(T1, GY - 40, 22, 80, 'wood');
            g.addBlock(T1 + 45, GY - 40, 22, 80, 'wood');
            g.addBlock(T1 + 22, GY - 90, 80, 18, 'glass');
            g.addPig(T1 + 22, GY - 22, 'normal');

            // Tier 2 (Mid)
            const T2 = 1350;
            g.addBlock(T2 - 35, GY - 65, 24, 130, 'wood');
            g.addBlock(T2 + 35, GY - 65, 24, 130, 'stone');
            g.addBlock(T2, GY - 140, 110, 20, 'stone');
            g.addPig(T2, GY - 22, 'helmet');
            g.addPig(T2, GY - 162, 'small');

            // Tier 3 (High Fortress)
            const T3 = 1500;
            g.addBlock(T3 - 40, GY - 95, 26, 190, 'stone');
            g.addBlock(T3 + 40, GY - 95, 26, 190, 'stone');
            g.addBlock(T3, GY - 200, 120, 20, 'stone');
            g.addPig(T3, GY - 24, 'foreman');
            g.addRoof(T3, GY - 232, 100, 42, 'stone');
            g.addTNT(T3, GY - 120);
        }
    },
    {
        id: 67,
        world: 'volcano',
        worldLevel: '5-7',
        name: '5-7 滚烫落石',
        subtitle: '击碎玻璃承重支点，引发巨型黑曜石滚石砸向熔岩猪猪巢穴！',
        birds: ['blue', 'hal', 'yellow'],
        parScore: 46000,
        build(g, GY) {
            // Elevated ramp with boulder
            g.addStaticPlatform(1220, GY - 210, 170, 24, 0, 'stone');
            g.addBlock(1295, GY - 242, 18, 40, 'glass'); // Fragile pin!
            g.addBoulder(1235, GY - 252, 28, 'stone');
            g.addTNT(1170, GY - 245);

            // Valley pit below
            const V = 1450;
            g.addBlock(V - 70, GY - 55, 24, 110, 'wood');
            g.addBlock(V, GY - 55, 22, 110, 'glass');
            g.addBlock(V + 70, GY - 55, 24, 110, 'wood');
            g.addBlock(V, GY - 119, 180, 18, 'wood');
            g.addPig(V - 35, GY - 22, 'helmet');
            g.addPig(V + 35, GY - 22, 'normal');
            g.addPig(V, GY - 142, 'small');
        }
    },
    {
        id: 68,
        world: 'volcano',
        worldLevel: '5-8',
        name: '5-8 炽焰跳跃',
        subtitle: '利用高弹力跳板让极速小鸟弹射高空，回旋鸟折返横扫吊桥！',
        birds: ['yellow', 'hal', 'bomb', 'matilda'],
        parScore: 50000,
        build(g, GY) {
            // Bouncy trampoline pad in front
            g.addBouncyPad(1060, GY - 12, 85, 24, 0);

            // Elevated fortress bridge
            const B = 1380;
            g.addBlock(B - 90, GY - 75, 26, 150, 'stone');
            g.addBlock(B + 90, GY - 75, 26, 150, 'stone');
            g.addBlock(B, GY - 160, 220, 20, 'stone');

            g.addPig(B - 40, GY - 22, 'helmet');
            g.addPig(B + 40, GY - 22, 'normal');
            g.addTNT(B, GY - 22);

            // Suspension bridge deck
            g.addBlock(B - 45, GY - 205, 20, 70, 'glass');
            g.addBlock(B + 45, GY - 205, 20, 70, 'glass');
            g.addBlock(B, GY - 249, 130, 18, 'wood');
            g.addPig(B, GY - 182, 'foreman');
            g.addRoof(B, GY - 275, 100, 35, 'wood');
        }
    },
    {
        id: 69,
        world: 'volcano',
        worldLevel: '5-9',
        name: '5-9 火山双子塔',
        subtitle: '双座耸立的火山岩哨塔，炸弹鸟崩解底座，回旋鸟回身瓦解副塔！',
        birds: ['bomb', 'yellow', 'hal', 'red'],
        parScore: 58000,
        build(g, GY) {
            // Tower 1 (Left)
            const T1 = 1240;
            g.addBlock(T1 - 45, GY - 60, 24, 120, 'stone');
            g.addBlock(T1 + 45, GY - 60, 24, 120, 'stone');
            g.addBlock(T1, GY - 130, 125, 20, 'stone');
            g.addPig(T1, GY - 22, 'helmet');

            g.addBlock(T1 - 35, GY - 180, 20, 80, 'wood');
            g.addBlock(T1 + 35, GY - 180, 20, 80, 'wood');
            g.addBlock(T1, GY - 230, 105, 18, 'wood');
            g.addRoof(T1, GY - 258, 85, 38, 'wood');
            g.addPig(T1, GY - 152, 'small');

            // Tower 2 (Right, Taller)
            const T2 = 1480;
            g.addBlock(T2 - 50, GY - 75, 26, 150, 'stone');
            g.addBlock(T2 + 50, GY - 75, 26, 150, 'stone');
            g.addBlock(T2, GY - 160, 135, 20, 'stone');
            g.addPig(T2, GY - 24, 'foreman');
            g.addTNT(T2, GY - 80);

            g.addBlock(T2 - 40, GY - 215, 22, 90, 'glass');
            g.addBlock(T2 + 40, GY - 215, 22, 90, 'glass');
            g.addBlock(T2, GY - 270, 115, 18, 'stone');
            g.addRoof(T2, GY - 300, 95, 42, 'stone');
            g.addPig(T2, GY - 182, 'helmet');
        }
    },
    {
        id: 70,
        world: 'volcano',
        worldLevel: '5-10',
        name: '5-10 硫磺深坑',
        subtitle: '弹射鸟垂直投弹打通矿井顶部天窗，回旋鸟深入坑底完成收割！',
        birds: ['matilda', 'hal', 'yellow', 'bomb'],
        parScore: 60000,
        build(g, GY) {
            const P = 1380;
            // Pit bunker with glass skylight on top
            g.addBlock(P - 95, GY - 75, 30, 150, 'stone');
            g.addBlock(P + 95, GY - 75, 30, 150, 'stone');
            g.addBlock(P, GY - 160, 230, 20, 'stone');
            // Fragile center glass roof
            g.addBlock(P, GY - 182, 100, 16, 'glass');

            g.addPig(P - 45, GY - 22, 'helmet');
            g.addPig(P + 45, GY - 22, 'helmet');
            g.addTNT(P, GY - 22);
            g.addPig(P, GY - 110, 'foreman');

            // Side guard posts
            g.addBlock(1160, GY - 45, 22, 90, 'wood');
            g.addPig(1160, GY - 105, 'small');

            g.addBlock(1580, GY - 45, 22, 90, 'wood');
            g.addPig(1580, GY - 105, 'small');
        }
    },
    {
        id: 71,
        world: 'volcano',
        worldLevel: '5-11',
        name: '5-11 熔岩钟摆',
        subtitle: '悬吊的熔岩巨石钟摆横贯要塞，看准时机一击解开锁链！',
        birds: ['blue', 'hal', 'terence', 'bomb'],
        parScore: 64000,
        build(g, GY) {
            const C = 1360;
            // High anchor beam
            g.addStaticPlatform(C, GY - 380, 120, 22, 0, 'stone');
            g.addHangingTNT(C, GY - 369, C, GY - 265);

            // Central Fortress
            g.addBlock(C - 80, GY - 60, 26, 120, 'stone');
            g.addBlock(C + 80, GY - 60, 26, 120, 'stone');
            g.addBlock(C, GY - 130, 195, 20, 'stone');
            g.addPig(C, GY - 24, 'foreman');
            g.addPig(C - 35, GY - 22, 'helmet');
            g.addPig(C + 35, GY - 22, 'helmet');

            g.addBlock(C - 50, GY - 185, 22, 90, 'wood');
            g.addBlock(C + 50, GY - 185, 22, 90, 'wood');
            g.addBlock(C, GY - 240, 135, 18, 'glass');
            g.addPig(C, GY - 152, 'small');
            g.addRoof(C, GY - 270, 110, 42, 'stone');
        }
    },
    {
        id: 72,
        world: 'volcano',
        worldLevel: '5-12',
        name: '5-12 地心穿刺',
        subtitle: '极速小鸟爆发超音速威力，连穿五层木质排桩，回旋鸟精准点杀藏匿盔甲猪！',
        birds: ['yellow', 'yellow', 'hal', 'red'],
        parScore: 62000,
        build(g, GY) {
            // Five consecutive timber palisades
            const startX = 1180;
            for (let i = 0; i < 5; i++) {
                const px = startX + i * 55;
                g.addBlock(px, GY - 60, 20, 120, 'wood');
                if (i % 2 === 0) g.addPig(px, GY - 135, 'small');
            }

            // Heavy bunker at back
            const B = 1530;
            g.addBlock(B - 45, GY - 70, 26, 140, 'stone');
            g.addBlock(B + 45, GY - 70, 26, 140, 'stone');
            g.addBlock(B, GY - 150, 125, 20, 'stone');
            g.addPig(B, GY - 24, 'helmet');
            g.addPig(B, GY - 172, 'foreman');
            g.addRoof(B, GY - 195, 95, 38, 'wood');
        }
    },
    {
        id: 73,
        world: 'volcano',
        worldLevel: '5-13',
        name: '5-13 熔岩迷宫',
        subtitle: '多重回廊式黑曜石迷宫，回旋鸟飞越迷宫后背刺头盔指挥猪！',
        birds: ['hal', 'bomb', 'yellow', 'terence'],
        parScore: 68000,
        build(g, GY) {
            const M = 1390;
            // Outer wall
            g.addBlock(M - 120, GY - 70, 26, 140, 'stone');
            g.addBlock(M + 120, GY - 70, 26, 140, 'stone');
            g.addBlock(M, GY - 150, 275, 20, 'stone');

            // Inner maze dividers
            g.addBlock(M - 40, GY - 60, 22, 120, 'wood');
            g.addBlock(M + 40, GY - 60, 22, 120, 'glass');

            g.addPig(M - 80, GY - 22, 'normal');
            g.addPig(M, GY - 24, 'foreman');
            g.addPig(M + 80, GY - 22, 'helmet');
            g.addTNT(M, GY - 172);

            // Upper pavilion
            g.addBlock(M - 60, GY - 215, 20, 90, 'stone');
            g.addBlock(M + 60, GY - 215, 20, 90, 'stone');
            g.addBlock(M, GY - 270, 160, 18, 'wood');
            g.addPig(M, GY - 194, 'small');
            g.addRoof(M, GY - 298, 130, 42, 'stone');
        }
    },
    {
        id: 74,
        world: 'volcano',
        worldLevel: '5-14',
        name: '5-14 巨兽狂怒',
        subtitle: '愤怒愤怒小鸟率先开路！以绝对吨位推平外围石墙，回旋鸟肃清残局！',
        birds: ['terence', 'hal', 'bomb', 'yellow'],
        parScore: 75000,
        build(g, GY) {
            // Massive triple-tier stone rampart
            const W = 1380;
            g.addBlock(W - 130, GY - 80, 32, 160, 'stone');
            g.addBlock(W - 45, GY - 80, 28, 160, 'stone');
            g.addBlock(W + 45, GY - 80, 28, 160, 'stone');
            g.addBlock(W + 130, GY - 80, 32, 160, 'stone');

            g.addBlock(W - 88, GY - 171, 115, 22, 'stone');
            g.addBlock(W + 88, GY - 171, 115, 22, 'stone');
            g.addBlock(W, GY - 171, 150, 22, 'stone');

            g.addPig(W - 88, GY - 24, 'helmet');
            g.addPig(W, GY - 26, 'foreman');
            g.addPig(W + 88, GY - 24, 'helmet');
            g.addTNT(W - 88, GY - 193);
            g.addTNT(W + 88, GY - 193);

            // Upper grand battlements
            g.addBlock(W - 55, GY - 240, 24, 115, 'stone');
            g.addBlock(W + 55, GY - 240, 24, 115, 'stone');
            g.addBlock(W, GY - 308, 165, 20, 'stone');
            g.addPig(W, GY - 215, 'foreman');
            g.addRoof(W, GY - 338, 120, 46, 'stone');
        }
    },
    {
        id: 75,
        world: 'volcano',
        worldLevel: '5-15',
        name: '5-15 熔岩领主决战',
        subtitle: '终极熔岩要塞大决战！全员集结，迎战熔岩宝座上的装甲国王猪！',
        birds: ['hal', 'bomb', 'yellow', 'matilda', 'terence'],
        parScore: 92000,
        build(g, GY) {
            // Overhead lava chandelier above the throne room
            const K = 1420;
            g.addStaticPlatform(K, GY - 430, 110, 24, 0, 'stone');
            g.addHangingTNT(K, GY - 418, K, GY - 315);

            // Outer Gatehouses
            g.addBlock(1170, GY - 55, 26, 110, 'stone');
            g.addPig(1170, GY - 125, 'helmet');

            // Central Grand Imperial Lava Citadel (4-Column Palace)
            g.addBlock(K - 165, GY - 75, 32, 150, 'stone');
            g.addBlock(K - 65, GY - 75, 28, 150, 'stone');
            g.addBlock(K + 65, GY - 75, 28, 150, 'stone');
            g.addBlock(K + 165, GY - 75, 32, 150, 'stone');

            g.addBlock(K - 115, GY - 161, 130, 22, 'stone');
            g.addBlock(K, GY - 161, 170, 22, 'stone');
            g.addBlock(K + 115, GY - 161, 130, 22, 'stone');

            g.addTNT(K - 115, GY - 22);
            g.addPig(K - 24, GY - 25, 'foreman');
            g.addPig(K + 26, GY - 24, 'helmet');
            g.addTNT(K + 115, GY - 22);

            // Second floor: THE MAGMA KING PIG BOSS!
            g.addBlock(K - 100, GY - 225, 26, 105, 'wood');
            g.addBlock(K + 100, GY - 225, 26, 105, 'wood');
            g.addBlock(K, GY - 288, 245, 22, 'glass');

            g.addPig(K, GY - 205, 'king'); // THE KING PIG SUPREME BOSS!
            g.addPig(K - 135, GY - 192, 'helmet');
            g.addPig(K + 135, GY - 192, 'helmet');

            // Magma spires crowning the throne room
            g.addRoof(K - 100, GY - 325, 75, 50, 'stone');
            g.addRoof(K + 100, GY - 325, 75, 50, 'stone');
            g.addRoof(K, GY - 325, 90, 50, 'stone');
        }
    }
];
