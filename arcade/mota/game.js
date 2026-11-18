(function () {
    'use strict';

    const E = window.MotaEngine;
    const AudioSys = window.MotaAudio;

    const canvas = document.getElementById('motaCanvas');
    const ctx = canvas.getContext('2d');
    const GRID = E.GRID; // 11
    const TILE = 48;
    const SIZE = GRID * TILE; // 528

    const el = {
        zoneBadge: document.getElementById('zoneBadge'),
        floorTitle: document.getElementById('floorTitle'),
        btnManual: document.getElementById('btnManual'),
        btnFlyer: document.getElementById('btnFlyer'),
        btnDmgOverlay: document.getElementById('btnDmgOverlay'),
        btnUndo: document.getElementById('btnUndo'),
        btnRestart: document.getElementById('btnRestart'),
        btnMute: document.getElementById('btnMute'),
        lvVal: document.getElementById('lvVal'),
        expNeedVal: document.getElementById('expNeedVal'),
        hpVal: document.getElementById('hpVal'),
        atkVal: document.getElementById('atkVal'),
        defVal: document.getElementById('defVal'),
        goldVal: document.getElementById('goldVal'),
        weaponVal: document.getElementById('weaponVal'),
        shieldVal: document.getElementById('shieldVal'),
        keyY: document.getElementById('keyY'),
        keyB: document.getElementById('keyB'),
        keyR: document.getElementById('keyR'),
        forecastBody: document.getElementById('forecastBody'),
        boardFrame: document.getElementById('boardFrame'),
        toastStrip: document.getElementById('toastStrip'),
        modalBackdrop: document.getElementById('modalBackdrop'),
        modalEyebrow: document.getElementById('modalEyebrow'),
        modalTitle: document.getElementById('modalTitle'),
        modalBody: document.getElementById('modalBody'),
        btnCloseModal: document.getElementById('btnCloseModal')
    };

    const audio = new AudioSys();
    let showDamageOverlay = true;
    let muted = false;
    let game = null;
    let walkQueue = [];
    let walkTimer = 0;
    let hoveredTile = null;
    const floats = [];
    const anim = { px: 5, py: 9 };

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = SIZE * dpr;
        canvas.height = SIZE * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function loadSaved() {
        try {
            const raw = JSON.parse(localStorage.getItem(E.SAVE_KEY) || 'null');
            if (raw && typeof raw === 'object') {
                muted = !!raw.muted;
                if (typeof raw.showDamageOverlay === 'boolean') showDamageOverlay = raw.showDamageOverlay;
                return raw.session || null;
            }
        } catch {}
        return null;
    }

    function persist() {
        if (!game) return;
        try {
            localStorage.setItem(E.SAVE_KEY, JSON.stringify({
                muted,
                showDamageOverlay,
                session: game.serialize()
            }));
        } catch {}
    }

    function initGame(forceReset = false) {
        game = E.createSession();
        if (!forceReset) {
            const savedSession = loadSaved();
            if (savedSession) game.hydrate(savedSession);
        }
        audio.setMuted(muted);
        anim.px = game.state.player.x;
        anim.py = game.state.player.y;
        walkQueue = [];
        syncUI();
        if (forceReset) persist();
    }

    function toast(msg) {
        if (el.toastStrip) el.toastStrip.textContent = msg;
    }

    function spawnFloat(gx, gy, text, color) {
        floats.push({
            x: (gx + 0.5) * TILE,
            y: (gy + 0.25) * TILE,
            text,
            color: color || '#ffffff',
            life: 0.95
        });
    }

    function syncUI() {
        const p = game.state.player;
        const f = game.currentFloorData();
        const zone = E.ZONES[f.zoneIdx] || E.ZONES[0];

        el.zoneBadge.textContent = zone.name;
        el.floorTitle.textContent = `第 ${f.floor} / ${E.TOTAL_FLOORS} 层 · ${f.name}`;
        el.lvVal.textContent = `Lv.${p.level}`;
        el.expNeedVal.textContent = `经验 ${p.exp} / ${p.level * 60}`;
        el.hpVal.textContent = String(Math.max(0, p.hp));
        el.atkVal.textContent = String(p.atk);
        el.defVal.textContent = String(p.def);
        el.goldVal.textContent = String(p.gold);
        el.weaponVal.textContent = p.weapon;
        el.shieldVal.textContent = p.shield;
        el.keyY.textContent = String(p.keys.yellow || 0);
        el.keyB.textContent = String(p.keys.blue || 0);
        el.keyR.textContent = String(p.keys.red || 0);

        el.btnFlyer.disabled = !p.hasFlyer;
        el.btnFlyer.textContent = p.hasFlyer ? '传送 (F)' : '传送 (未解锁)';
        el.btnDmgOverlay.textContent = showDamageOverlay ? '显伤: 开' : '显伤: 关';
        el.btnDmgOverlay.classList.toggle('active', showDamageOverlay);
        el.btnUndo.disabled = game.state.undoStack.length === 0;
        el.btnMute.textContent = muted ? '🔇' : '🔊';

        updateForecast();
    }

    function updateForecast() {
        const p = game.state.player;
        const f = game.currentFloorData();
        let targetEnemy = null;

        if (hoveredTile) {
            const ent = f.entities.get(`${hoveredTile.x},${hoveredTile.y}`);
            if (ent && ent.type === 'enemy') targetEnemy = ent;
        }
        if (!targetEnemy) {
            const adj = game.getAdjacentEnemy();
            if (adj) targetEnemy = adj.enemy;
        }

        if (!targetEnemy) {
            el.forecastBody.className = 'forecast-empty';
            el.forecastBody.innerHTML = '方向键 / WASD 或点击地图自动寻路；按 <b>M</b> 查图鉴、<b>Z</b> 回溯一步。';
            return;
        }

        const c = E.calculateBattle(p, targetEnemy);
        const dmgClass = !c.canWin
            ? 'fc-dmg-danger'
            : c.damage === 0 || c.damage < p.hp * 0.25
                ? 'fc-dmg-safe'
                : 'fc-dmg-warn';

        const dmgText = c.canWin ? `-${c.damage} HP (${c.turns}回合)` : '无法战胜';
        let tipHtml = '';
        if (!c.canWin && c.atkNeeded > 0) {
            tipHtml = `<div class="fc-tip">提示：还需提升 <b>+${c.atkNeeded} 攻击力</b> 才可破防</div>`;
        } else if (!c.canWin) {
            tipHtml = `<div class="fc-tip">提示：当前生命不足，先去收集血瓶或强化防御</div>`;
        } else if (c.nextAtkForLess > 0) {
            tipHtml = `<div class="fc-tip">临界：再加 <b>+${c.nextAtkForLess} 攻</b> 可减少 <b>${c.nextAtkSave}</b> 伤</div>`;
        }

        el.forecastBody.className = '';
        el.forecastBody.innerHTML = `
            <div class="fc-head">
                <span>${targetEnemy.name}</span>
                <span class="${dmgClass}">${dmgText}</span>
            </div>
            <div class="fc-meta">
                <span>生命 <b>${targetEnemy.hp}</b></span>
                <span>攻 <b>${targetEnemy.atk}</b> / 防 <b>${targetEnemy.def}</b></span>
                <span>奖 <b>${targetEnemy.gold}G ${targetEnemy.exp}E</b></span>
            </div>
            ${tipHtml}
        `;
    }

    function openModal(eyebrow, title, htmlOrBuilder) {
        walkQueue = [];
        el.modalEyebrow.textContent = eyebrow;
        el.modalTitle.textContent = title;
        el.modalBody.innerHTML = '';
        if (typeof htmlOrBuilder === 'string') {
            el.modalBody.innerHTML = htmlOrBuilder;
        } else {
            htmlOrBuilder(el.modalBody);
        }
        el.modalBackdrop.classList.remove('hidden');
    }

    function closeModal() {
        el.modalBackdrop.classList.add('hidden');
    }

    function openManual() {
        audio.playStep();
        const f = game.currentFloorData();
        const entries = game.getManualEntries();
        openModal(`第 ${f.floor} 层 · 实时算伤`, '怪物图鉴', (body) => {
            if (!entries.length) {
                body.innerHTML = '<p>本层怪物已全部清空，放心搜刮或前往下一层吧！</p>';
                return;
            }
            entries.forEach(({ enemy, count, calc }) => {
                const row = document.createElement('div');
                row.className = 'manual-row';
                const statusColor = !calc.canWin
                    ? '#fb7185'
                    : calc.damage === 0
                        ? '#4ade80'
                        : calc.damage >= game.state.player.hp * 0.4
                            ? '#fb7185'
                            : '#facc15';
                const dmgLabel = calc.canWin
                    ? `预计损失 ${calc.damage} HP · ${calc.turns}回合`
                    : (calc.atkNeeded > 0 ? `未破防（缺 ${calc.atkNeeded} 攻）` : '生命不足，极度危险');
                const breakHint = calc.canWin && calc.nextAtkForLess > 0
                    ? `再+${calc.nextAtkForLess}攻少伤${calc.nextAtkSave}`
                    : `掉落 ${enemy.gold}金 / ${enemy.exp}经`;
                row.innerHTML = `
                    <div class="manual-left">
                        <strong>${enemy.name} ×${count}</strong>
                        <small>HP ${enemy.hp} · ATK ${enemy.atk} · DEF ${enemy.def}</small>
                    </div>
                    <div class="manual-right">
                        <strong style="color:${statusColor}">${dmgLabel}</strong>
                        <small>${breakHint}</small>
                    </div>
                `;
                body.appendChild(row);
            });
        });
    }

    function openFlyer() {
        if (!game.state.player.hasFlyer) {
            toast('先前往第 2 层寻找【次元行者】解锁楼层传送器！');
            return;
        }
        audio.playStep();
        openModal('次元传送器', '选择已探索楼层', (body) => {
            const list = document.createElement('div');
            list.className = 'flyer-grid';
            game.state.player.visitedFloors.forEach((fNum) => {
                const f = game.state.floors[fNum];
                const hasUp = Array.from(f.entities.values()).some(v => v.type === 'stairs_up');
                const hasDown = Array.from(f.entities.values()).some(v => v.type === 'stairs_down');
                const row = document.createElement('div');
                row.className = 'flyer-row';
                row.innerHTML = `<span><b>第 ${fNum} 层</b> · ${f.name}</span><div class="flyer-btns"></div>`;
                const btns = row.querySelector('.flyer-btns');
                if (hasDown) {
                    const b1 = document.createElement('button');
                    b1.type = 'button';
                    b1.className = 'nav-pill';
                    b1.textContent = '下楼梯';
                    b1.onclick = () => {
                        if (game.teleport(fNum, 'stairs_down')) {
                            audio.playTeleport();
                            anim.px = game.state.player.x;
                            anim.py = game.state.player.y;
                            syncUI();
                            persist();
                            closeModal();
                        }
                    };
                    btns.appendChild(b1);
                }
                if (hasUp) {
                    const b2 = document.createElement('button');
                    b2.type = 'button';
                    b2.className = 'nav-pill';
                    b2.textContent = '上楼梯';
                    b2.onclick = () => {
                        if (game.teleport(fNum, 'stairs_up')) {
                            audio.playTeleport();
                            anim.px = game.state.player.x;
                            anim.py = game.state.player.y;
                            syncUI();
                            persist();
                            closeModal();
                        }
                    };
                    btns.appendChild(b2);
                }
                list.appendChild(row);
            });
            body.appendChild(list);
        });
    }

    function handleNpc(npcHit) {
        const sub = npcHit.npc.sub;
        audio.playStep();

        if (sub === 'elder') {
            openModal('守塔智者', '来自前辈的嘱托', `
                <p>“勇者，魔塔共有 <b>21 层</b>，切忌盲目硬闯无法破防的守卫。”</p>
                <p>“第 2 层的【次元行者】可免费赠送你楼层传送器；多利用卡片左上角或地图上的 <b>显伤提示</b> 与 <b>回溯一步(Z)</b> 规划最优路线！”</p>
                <button class="primary-btn" type="button" id="npcOkBtn">谨记教诲</button>
            `);
            document.getElementById('npcOkBtn').onclick = closeModal;
            return;
        }

        if (sub === 'flyer') {
            openModal('次元行者', '时空馈赠', `
                <p>“这枚【次元传送器】就托付给你了！日后无论身在何层，按 <b>F 键</b> 即可直达已探索楼层的楼梯口。”</p>
                <button class="primary-btn" type="button" id="npcFlyerAccept">收下传送器</button>
            `);
            document.getElementById('npcFlyerAccept').onclick = () => {
                game.unlockFlyer(npcHit.key);
                audio.playVictory();
                spawnFloat(npcHit.x, npcHit.y, '+次元传送器', '#34d399');
                toast('已解锁【次元传送器】！按 F 键随时传送。');
                syncUI();
                persist();
                closeModal();
            };
            return;
        }

        if (sub === 'altar_gold') {
            const renderGoldShop = () => {
                const cost = game.goldAltarCost();
                const z = Math.floor((game.state.currentFloor - 1) / 7);
                const atkGain = 4 + z * 3;
                const defGain = 4 + z * 3;
                const hpGain = 750 + z * 450;
                const can = game.state.player.gold >= cost;
                openModal('神秘供奉', `金币祭坛（当前持有 ${game.state.player.gold} 金币）`, (body) => {
                    body.innerHTML = `<p>献上金币即可强化身躯（已供奉 ${game.state.player.goldBuys} 次）：</p>`;
                    const list = document.createElement('div');
                    list.className = 'shop-btn-list';
                    [
                        { key: 'atk', label: `强化攻击 (+${atkGain} ATK)` },
                        { key: 'def', label: `强化防御 (+${defGain} DEF)` },
                        { key: 'hp', label: `圣光疗愈 (+${hpGain} HP)` }
                    ].forEach((opt) => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'shop-option';
                        btn.disabled = !can;
                        btn.innerHTML = `<span>${opt.label}</span><span class="shop-price">${cost} 金币</span>`;
                        btn.onclick = () => {
                            if (game.buyGoldAltar(opt.key)) {
                                audio.playBuy();
                                syncUI();
                                persist();
                                renderGoldShop();
                            }
                        };
                        list.appendChild(btn);
                    });
                    body.appendChild(list);
                });
            };
            renderGoldShop();
            return;
        }

        if (sub === 'altar_exp') {
            const renderExpShop = () => {
                const exp = game.state.player.exp;
                openModal('试炼传承', `经验长老（当前持有 ${exp} 经验）`, (body) => {
                    body.innerHTML = '<p>“用你的战斗经验换取即刻突破！”</p>';
                    const list = document.createElement('div');
                    list.className = 'shop-btn-list';
                    [
                        { key: 'atk', label: '剑术研习 (+4 攻击)', cost: 30 },
                        { key: 'def', label: '铁壁修心 (+4 防御)', cost: 30 },
                        { key: 'level', label: '潜能飞跃 (+1级：+800生命 +6攻 +6防)', cost: 80 }
                    ].forEach((opt) => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'shop-option';
                        btn.disabled = exp < opt.cost;
                        btn.innerHTML = `<span>${opt.label}</span><span class="shop-price">${opt.cost} 经验</span>`;
                        btn.onclick = () => {
                            if (game.buyExpSage(opt.key)) {
                                audio.playBuy();
                                syncUI();
                                persist();
                                renderExpShop();
                            }
                        };
                        list.appendChild(btn);
                    });
                    body.appendChild(list);
                });
            };
            renderExpShop();
            return;
        }

        if (sub === 'key_shop') {
            const renderKeyShop = () => {
                const gold = game.state.player.gold;
                const yCount = game.state.player.keys.yellow || 0;
                openModal('黑市摊位', `钥匙商人（持有 ${gold} 金币）`, (body) => {
                    body.innerHTML = '<p>“深渊门锁重重，这里总有你需要的钥匙。”</p>';
                    const list = document.createElement('div');
                    list.className = 'shop-btn-list';
                    [
                        { label: '购买黄钥匙 (+1)', price: '35 金币', ok: gold >= 35, fn: () => game.buyKey('yellow') },
                        { label: '购买蓝钥匙 (+1)', price: '95 金币', ok: gold >= 95, fn: () => game.buyKey('blue') },
                        { label: '购买红钥匙 (+1)', price: '220 金币', ok: gold >= 220, fn: () => game.buyKey('red') },
                        { label: `典当黄钥匙 (当前 ${yCount} 把)`, price: '+18 金币', ok: yCount > 0, fn: () => game.sellYellowKey() }
                    ].forEach((opt) => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'shop-option';
                        btn.disabled = !opt.ok;
                        btn.innerHTML = `<span>${opt.label}</span><span class="shop-price">${opt.price}</span>`;
                        btn.onclick = () => {
                            if (opt.fn()) {
                                audio.playBuy();
                                syncUI();
                                persist();
                                renderKeyShop();
                            }
                        };
                        list.appendChild(btn);
                    });
                    body.appendChild(list);
                });
            };
            renderKeyShop();
        }
    }

    function performStep(dx, dy) {
        if (!game || !el.modalBackdrop.classList.contains('hidden')) return false;
        const res = game.step(dx, dy);

        if (!res.ok) {
            walkQueue = [];
            if (res.kind === 'npc') {
                handleNpc(res);
            } else if (res.kind === 'locked') {
                toast(`需要【${res.door.name.replace('门', '钥匙')}】才能开启这扇门！`);
            } else if (res.kind === 'cant_win') {
                const need = res.calc.atkNeeded;
                toast(need > 0
                    ? `无法破防【${res.enemy.name}】！还需提升 +${need} 攻击力。`
                    : `生命不足，无法击败【${res.enemy.name}】！`);
            }
            return false;
        }

        if (res.kind === 'move') {
            audio.playStep();
        } else if (res.kind === 'key') {
            audio.playKey();
            spawnFloat(game.state.player.x, game.state.player.y, `+1 ${res.item.name}`, res.item.color);
            toast(`拾取了 ${res.item.name}`);
        } else if (res.kind === 'door') {
            audio.playDoor();
            toast(`消耗一把钥匙开启了${res.door.name}`);
        } else if (res.kind === 'item') {
            if (res.item.hp) audio.playPotion();
            else audio.playGem();
            const parts = [];
            if (res.item.hp) parts.push(`+${res.item.hp} HP`);
            if (res.item.atk) parts.push(`+${res.item.atk} 攻`);
            if (res.item.def) parts.push(`+${res.item.def} 防`);
            if (res.item.exp) parts.push(`+${res.item.exp} 经`);
            spawnFloat(game.state.player.x, game.state.player.y, parts.join(' '), res.item.color);
            toast(`获得【${res.item.name}】：${parts.join('，')}`);
        } else if (res.kind === 'battle') {
            audio.playHit(!!res.enemy.isBoss);
            if (res.enemy.isBoss) {
                el.boardFrame.classList.remove('shake');
                void el.boardFrame.offsetWidth;
                el.boardFrame.classList.add('shake');
            }
            spawnFloat(game.state.player.x, game.state.player.y, `-${res.damage} HP`, '#fb7185');
            if (res.leveled > 0) {
                audio.playLevelUp();
                spawnFloat(game.state.player.x, game.state.player.y - 0.6, `🌟 升级 Lv.${game.state.player.level}!`, '#facc15');
            }
            toast(`击败 ${res.enemy.name}，损失 ${res.damage} HP，获得 ${res.enemy.gold} 金币`);

            if (res.won) {
                audio.playVictory();
                walkQueue = [];
                const p = game.state.player;
                openModal('通关荣耀', '🏆 征服 21 层魔塔深渊！', `
                    <p>${res.enemy.rewardText}</p>
                    <p>最终战绩：<b>Lv.${p.level}</b> · 剩余生命 <b>${p.hp}</b> · 攻击 <b>${p.atk}</b> · 防御 <b>${p.def}</b> · 击杀 <b>${p.kills}</b> 怪 · 耗时 <b>${p.steps}</b> 步。</p>
                    <button class="primary-btn" type="button" id="btnWinReplay">再次挑战魔塔</button>
                `);
                document.getElementById('btnWinReplay').onclick = () => {
                    closeModal();
                    initGame(true);
                };
            }
        } else if (res.kind === 'stairs') {
            audio.playTeleport();
            anim.px = game.state.player.x;
            anim.py = game.state.player.y;
            walkQueue = [];
            toast(`来到第 ${res.floor} 层 · ${game.currentFloorData().name}`);
        }

        syncUI();
        persist();
        return true;
    }

    // ---------------- Canvas Sprite Rendering ----------------
    function drawTileSprites(now) {
        const f = game.currentFloorData();
        const zone = E.ZONES[f.zoneIdx] || E.ZONES[0];
        const p = game.state.player;
        const pulse = Math.sin(now * 0.005);

        // 1. Floor & Brick Walls
        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                const px = x * TILE;
                const py = y * TILE;
                if (f.grid[y][x] === 1) {
                    ctx.fillStyle = zone.wallSide;
                    ctx.fillRect(px, py, TILE, TILE);
                    ctx.fillStyle = zone.wallTop;
                    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 8);
                    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(px + 2, py + TILE * 0.45); ctx.lineTo(px + TILE - 2, py + TILE * 0.45);
                    ctx.moveTo(px + TILE * 0.5, py + 2); ctx.lineTo(px + TILE * 0.5, py + TILE * 0.45);
                    ctx.moveTo(px + TILE * 0.25, py + TILE * 0.45); ctx.lineTo(px + TILE * 0.25, py + TILE - 6);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = (x + y) % 2 === 0 ? zone.floorBg : zone.floorAlt;
                    ctx.fillRect(px, py, TILE, TILE);
                }
            }
        }

        // Hover cell highlight
        if (hoveredTile && hoveredTile.x >= 0 && hoveredTile.x < GRID && hoveredTile.y >= 0 && hoveredTile.y < GRID) {
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
            ctx.lineWidth = 2;
            ctx.strokeRect(hoveredTile.x * TILE + 2, hoveredTile.y * TILE + 2, TILE - 4, TILE - 4);
        }

        // 2. Entities
        for (const [k, ent] of f.entities.entries()) {
            const [gx, gy] = k.split(',').map(Number);
            const px = gx * TILE;
            const py = gy * TILE;
            const cx = px + TILE / 2;
            const cy = py + TILE / 2;

            if (ent.type === 'stairs_up' || ent.type === 'stairs_down') {
                const isUp = ent.type === 'stairs_up';
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
                ctx.fillStyle = isUp ? '#38bdf8' : '#f59e0b';
                for (let s = 0; s < 4; s++) {
                    const inset = s * 4;
                    ctx.fillRect(px + 9 + (isUp ? inset : 0), py + 10 + s * 7, TILE - 18 - inset, 5);
                }
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(isUp ? '▲上' : '▼下', cx, py + TILE - 7);
                ctx.textAlign = 'left';
            } else if (ent.type === 'door') {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
                ctx.fillStyle = ent.color;
                ctx.fillRect(px + 8, py + 7, TILE - 16, TILE - 14);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
                ctx.fillRect(px + 12, py + 12, TILE - 24, 10);
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc(cx, cy + 7, 3.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (ent.type === 'key') {
                const bob = pulse * 1.6;
                ctx.strokeStyle = ent.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(cx - 5, cy + bob, 6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = ent.color;
                ctx.fillRect(cx + 1, cy - 1.5 + bob, 13, 3);
                ctx.fillRect(cx + 9, cy + 1.5 + bob, 3, 5);
                ctx.fillRect(cx + 12, cy + 1.5 + bob, 3, 4);
            } else if (ent.type === 'item') {
                const bob = pulse * 1.5;
                if (ent.sub === 'gem_red' || ent.sub === 'gem_blue') {
                    ctx.fillStyle = ent.color;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - 12 + bob);
                    ctx.lineTo(cx + 11, cy + bob);
                    ctx.lineTo(cx, cy + 12 + bob);
                    ctx.lineTo(cx - 11, cy + bob);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.45)';
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - 9 + bob);
                    ctx.lineTo(cx + 5, cy - 2 + bob);
                    ctx.lineTo(cx, cy + bob);
                    ctx.closePath();
                    ctx.fill();
                } else if (ent.sub === 'potion_sm' || ent.sub === 'potion_lg') {
                    const r = ent.sub === 'potion_lg' ? 11 : 8.5;
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillRect(cx - 3, cy - r - 5 + bob, 6, 6);
                    ctx.fillStyle = ent.color;
                    ctx.beginPath();
                    ctx.arc(cx, cy + 2 + bob, r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.beginPath();
                    ctx.arc(cx - 3, cy - 1 + bob, r * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (ent.sub === 'weapon') {
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(cx - 10, cy + 10 + bob);
                    ctx.lineTo(cx + 11, cy - 11 + bob);
                    ctx.stroke();
                    ctx.strokeStyle = '#92400e';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(cx - 11, cy + 3 + bob);
                    ctx.lineTo(cx - 3, cy + 11 + bob);
                    ctx.stroke();
                } else if (ent.sub === 'shield') {
                    ctx.fillStyle = '#38bdf8';
                    ctx.beginPath();
                    ctx.moveTo(cx - 10, cy - 10 + bob);
                    ctx.lineTo(cx + 10, cy - 10 + bob);
                    ctx.lineTo(cx + 9, cy + 4 + bob);
                    ctx.lineTo(cx, cy + 13 + bob);
                    ctx.lineTo(cx - 9, cy + 4 + bob);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#e0f2fe';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else {
                    ctx.fillStyle = '#a855f7';
                    ctx.fillRect(cx - 10, cy - 11 + bob, 20, 22);
                    ctx.fillStyle = '#facc15';
                    ctx.fillRect(cx - 7, cy - 4 + bob, 14, 3);
                }
            } else if (ent.type === 'npc') {
                ctx.fillStyle = ent.color;
                ctx.beginPath();
                ctx.arc(cx, cy - 5 + pulse, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#e2e8f0';
                ctx.beginPath();
                ctx.moveTo(cx - 11, cy + 15);
                ctx.lineTo(cx + 11, cy + 15);
                ctx.lineTo(cx + 7, cy + 2);
                ctx.lineTo(cx - 7, cy + 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                const tag = ent.sub === 'flyer' ? '传' : ent.sub === 'altar_gold' ? '金' : ent.sub === 'altar_exp' ? '经' : ent.sub === 'key_shop' ? '钥' : '智';
                ctx.fillText(tag, cx, cy + 13);
                ctx.textAlign = 'left';
            } else if (ent.type === 'enemy') {
                const bob = pulse * 1.4;
                const sc = ent.isBoss ? 1.2 : 1;
                ctx.save();
                ctx.translate(cx, cy + bob);
                ctx.scale(sc, sc);

                // Silhouette per monster archetype
                if (ent.sprite === 'slime') {
                    ctx.fillStyle = ent.color;
                    ctx.beginPath();
                    ctx.arc(0, 3, 13, Math.PI, 0);
                    ctx.lineTo(13, 12);
                    ctx.quadraticCurveTo(0, 15, -13, 12);
                    ctx.closePath();
                    ctx.fill();
                } else if (ent.sprite === 'bat') {
                    ctx.fillStyle = ent.color;
                    ctx.beginPath();
                    ctx.moveTo(-16, -2); ctx.lineTo(-5, 3); ctx.lineTo(0, -6);
                    ctx.lineTo(5, 3); ctx.lineTo(16, -2); ctx.lineTo(8, 10);
                    ctx.lineTo(0, 5); ctx.lineTo(-8, 10);
                    ctx.closePath();
                    ctx.fill();
                } else if (ent.sprite === 'boss') {
                    ctx.fillStyle = ent.color;
                    ctx.beginPath();
                    ctx.moveTo(-14, 13); ctx.lineTo(-14, -7); ctx.lineTo(-7, -14);
                    ctx.lineTo(0, -8); ctx.lineTo(7, -14); ctx.lineTo(14, -7);
                    ctx.lineTo(14, 13);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillStyle = ent.color;
                    ctx.beginPath();
                    ctx.roundRect(-11, -12, 22, 25, 6);
                    ctx.fill();
                }
                // Glowing eyes
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(-6, -2, 4, 4);
                ctx.fillRect(2, -2, 4, 4);
                ctx.fillStyle = ent.isBoss ? '#fef08a' : '#fff';
                ctx.fillRect(-5, -1, 2, 2);
                ctx.fillRect(3, -1, 2, 2);
                ctx.restore();

                // Live damage pill overlay
                if (showDamageOverlay) {
                    const calc = E.calculateBattle(p, ent);
                    const text = !calc.canWin ? '💀' : String(calc.damage);
                    const bg = !calc.canWin
                        ? 'rgba(185, 28, 28, 0.92)'
                        : calc.damage === 0
                            ? 'rgba(21, 128, 61, 0.9)'
                            : calc.damage >= p.hp * 0.4
                                ? 'rgba(185, 28, 28, 0.88)'
                                : 'rgba(161, 98, 7, 0.9)';
                    ctx.font = 'bold 10.5px sans-serif';
                    const tw = Math.max(18, ctx.measureText(text).width + 8);
                    ctx.fillStyle = bg;
                    ctx.beginPath();
                    ctx.roundRect(px + TILE - tw - 2, py + TILE - 16, tw, 14, 4);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'center';
                    ctx.fillText(text, px + TILE - tw / 2 - 2, py + TILE - 5.5);
                    ctx.textAlign = 'left';
                }
            }
        }

        // 3. Smoothed Hero Knight
        anim.px += (p.x - anim.px) * 0.35;
        anim.py += (p.y - anim.py) * 0.35;
        const hcx = (anim.px + 0.5) * TILE;
        const hcy = (anim.py + 0.5) * TILE;

        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(hcx, hcy + 14, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cloak + Armor + Helm
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.roundRect(hcx - 11, hcy - 2, 22, 16, 5);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(hcx, hcy - 7, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(hcx, hcy - 10, 8.5, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        const ex = p.dirX * 3;
        ctx.fillRect(hcx - 4 + ex, hcy - 8, 2.5, 3);
        ctx.fillRect(hcx + 1.5 + ex, hcy - 8, 2.5, 3);
    }

    function drawFloats(dt) {
        for (let i = floats.length - 1; i >= 0; i--) {
            const ft = floats[i];
            ft.life -= dt;
            if (ft.life <= 0) {
                floats.splice(i, 1);
                continue;
            }
            ft.y -= dt * 26;
            ctx.save();
            ctx.globalAlpha = Math.min(1, ft.life * 1.4);
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = 3;
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    // ---------------- Input Handlers ----------------
    window.addEventListener('keydown', (e) => {
        if (!game) return;
        const modalOpen = !el.modalBackdrop.classList.contains('hidden');
        if (modalOpen) {
            if (e.key === 'Escape') closeModal();
            return;
        }
        const dirs = {
            ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
            ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
            ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
            ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
        };
        if (dirs[e.key]) {
            e.preventDefault();
            walkQueue = [];
            performStep(dirs[e.key][0], dirs[e.key][1]);
        } else if (e.key === 'm' || e.key === 'M') {
            e.preventDefault();
            openManual();
        } else if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            openFlyer();
        } else if (e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            showDamageOverlay = !showDamageOverlay;
            syncUI();
            persist();
        } else if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault();
            walkQueue = [];
            if (game.undo()) {
                audio.playUndo();
                anim.px = game.state.player.x;
                anim.py = game.state.player.y;
                syncUI();
                persist();
                toast('已回溯上一步');
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const gx = Math.floor(((e.clientX - rect.left) / rect.width) * GRID);
        const gy = Math.floor(((e.clientY - rect.top) / rect.height) * GRID);
        if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID) {
            hoveredTile = { x: gx, y: gy };
            updateForecast();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        hoveredTile = null;
        updateForecast();
    });

    canvas.addEventListener('click', (e) => {
        if (!game || !el.modalBackdrop.classList.contains('hidden')) return;
        const rect = canvas.getBoundingClientRect();
        const gx = Math.floor(((e.clientX - rect.left) / rect.width) * GRID);
        const gy = Math.floor(((e.clientY - rect.top) / rect.height) * GRID);
        const path = game.findPath(gx, gy);
        if (path && path.length > 0) {
            walkQueue = path;
        }
    });

    document.querySelectorAll('.d-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const [dx, dy] = btn.getAttribute('data-dir').split(',').map(Number);
            walkQueue = [];
            performStep(dx, dy);
        });
    });

    el.btnManual.onclick = openManual;
    el.btnFlyer.onclick = openFlyer;
    el.btnDmgOverlay.onclick = () => {
        showDamageOverlay = !showDamageOverlay;
        syncUI();
        persist();
    };
    el.btnUndo.onclick = () => {
        walkQueue = [];
        if (game.undo()) {
            audio.playUndo();
            anim.px = game.state.player.x;
            anim.py = game.state.player.y;
            syncUI();
            persist();
            toast('已回溯上一步');
        }
    };
    el.btnRestart.onclick = () => {
        if (confirm('确定要重新开始魔塔挑战吗？当前进度将被重置。')) {
            localStorage.removeItem(E.SAVE_KEY);
            initGame(true);
            toast('已重置第 1 层起点，祝冒险顺利！');
        }
    };
    el.btnMute.onclick = () => {
        muted = !muted;
        audio.setMuted(muted);
        syncUI();
        persist();
    };
    el.btnCloseModal.onclick = closeModal;
    el.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === el.modalBackdrop) closeModal();
    });

    let lastTs = performance.now();
    function loop(ts) {
        const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
        lastTs = ts;

        if (walkQueue.length > 0 && game && !game.state.player.won && el.modalBackdrop.classList.contains('hidden')) {
            walkTimer += dt;
            if (walkTimer >= 0.085) {
                walkTimer = 0;
                const [dx, dy] = walkQueue.shift();
                if (!performStep(dx, dy)) walkQueue = [];
            }
        }

        ctx.clearRect(0, 0, SIZE, SIZE);
        drawTileSprites(ts);
        drawFloats(dt);
        requestAnimationFrame(loop);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    initGame(false);
    requestAnimationFrame(loop);
})();
