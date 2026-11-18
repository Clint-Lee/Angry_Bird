(function () {
    'use strict';

    const E = window.MotaEngine;
    const AudioSys = window.MotaAudio;

    const canvas = document.getElementById('motaCanvas');
    const ctx = canvas.getContext('2d');
    const GRID = E.GRID; // 15
    const TILE = 44;
    const SIZE = GRID * TILE; // 660

    const el = {
        zoneBadge: document.getElementById('zoneBadge'),
        floorTitle: document.getElementById('floorTitle'),
        btnManual: document.getElementById('btnManual'),
        btnFlyer: document.getElementById('btnFlyer'),
        btnDmgOverlay: document.getElementById('btnDmgOverlay'),
        btnBattleAnim: document.getElementById('btnBattleAnim'),
        btnUndo: document.getElementById('btnUndo'),
        btnRestart: document.getElementById('btnRestart'),
        btnMute: document.getElementById('btnMute'),
        heroAvatarCanvas: document.getElementById('heroAvatarCanvas'),
        lvVal: document.getElementById('lvVal'),
        expNeedVal: document.getElementById('expNeedVal'),
        expBarFill: document.getElementById('expBarFill'),
        hpVal: document.getElementById('hpVal'),
        atkVal: document.getElementById('atkVal'),
        defVal: document.getElementById('defVal'),
        goldVal: document.getElementById('goldVal'),
        weaponVal: document.getElementById('weaponVal'),
        shieldVal: document.getElementById('shieldVal'),
        keyY: document.getElementById('keyY'),
        keyB: document.getElementById('keyB'),
        keyR: document.getElementById('keyR'),
        forecastHintTag: document.getElementById('forecastHintTag'),
        forecastBody: document.getElementById('forecastBody'),
        boardFrame: document.getElementById('boardFrame'),
        toastStrip: document.getElementById('toastStrip'),
        modalBackdrop: document.getElementById('modalBackdrop'),
        modalEyebrow: document.getElementById('modalEyebrow'),
        modalTitle: document.getElementById('modalTitle'),
        modalBody: document.getElementById('modalBody'),
        btnCloseModal: document.getElementById('btnCloseModal'),

        battleOverlay: document.getElementById('battleOverlay'),
        battleEnemyBadge: document.getElementById('battleEnemyBadge'),
        battleRoundTag: document.getElementById('battleRoundTag'),
        btnSkipBattleNow: document.getElementById('btnSkipBattleNow'),
        battleStageCanvas: document.getElementById('battleStageCanvas'),
        heroHpBar: document.getElementById('heroHpBar'),
        enemyHpBar: document.getElementById('enemyHpBar'),
        heroHpText: document.getElementById('heroHpText'),
        enemyHpText: document.getElementById('enemyHpText'),
        heroBattleStats: document.getElementById('heroBattleStats'),
        enemyBattleName: document.getElementById('enemyBattleName'),
        enemyBattleStats: document.getElementById('enemyBattleStats')
    };

    const audio = new AudioSys();
    let showDamageOverlay = true;
    let skipBattleAnim = false;
    let muted = false;
    let game = null;
    let walkQueue = [];
    let walkTimer = 0;
    let hoveredTile = null;
    let battlePlaying = false;
    let battleFinishCb = null;
    let battleTimer = null;
    let battleRaf = null;
    const floats = [];
    const anim = { px: 7, py: 13 };

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
                if (typeof raw.skipBattleAnim === 'boolean') skipBattleAnim = raw.skipBattleAnim;
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
                skipBattleAnim,
                session: game.serialize()
            }));
        } catch {}
    }

    function initGame(forceReset = false) {
        stopBattleAnimation(true);
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
        const expReq = p.level * 60;
        el.lvVal.textContent = `Lv.${p.level}`;
        el.expNeedVal.textContent = `${p.exp} / ${expReq} EXP`;
        if (el.expBarFill) {
            el.expBarFill.style.width = `${Math.min(100, Math.round((p.exp / expReq) * 100))}%`;
        }
        if (el.heroAvatarCanvas) {
            const hCtx = el.heroAvatarCanvas.getContext('2d');
            hCtx.clearRect(0, 0, 42, 42);
            drawHeroShape(hCtx, 21, 22, 1.18, 1);
        }
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
        el.btnBattleAnim.textContent = skipBattleAnim ? '战斗动画: 跳过' : '战斗动画: 开';
        el.btnBattleAnim.classList.toggle('active', !skipBattleAnim);
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
            if (el.forecastHintTag) el.forecastHintTag.textContent = '悬停或贴近';
            el.forecastBody.className = 'forecast-empty';
            el.forecastBody.innerHTML = `
                <div class="key-hints-grid">
                    <span><b>WASD</b> / 点击寻路</span>
                    <span><b>M</b> 本层怪物图鉴</span>
                    <span><b>Z</b> 撤销上一步</span>
                    <span><b>F</b> 楼层快速传送</span>
                </div>
            `;
            return;
        }

        if (el.forecastHintTag) el.forecastHintTag.textContent = targetEnemy.isBoss ? '守关首领' : '交锋预估';
        const c = E.calculateBattle(p, targetEnemy);
        const dmgClass = !c.canWin
            ? 'fc-dmg-danger'
            : c.damage === 0 || c.damage < p.hp * 0.25
                ? 'fc-dmg-safe'
                : 'fc-dmg-warn';

        const dmgText = c.canWin ? (c.damage === 0 ? '无伤击杀' : `-${c.damage} HP · ${c.turns}合`) : '无法战胜';
        let tipHtml = '';
        if (!c.canWin && c.atkNeeded > 0) {
            tipHtml = `<div class="fc-tip">还需 <b>+${c.atkNeeded} 攻击力</b> 方可破防</div>`;
        } else if (!c.canWin) {
            tipHtml = `<div class="fc-tip">生命不足（差 ${c.damage - p.hp + 1}），请先补血强化</div>`;
        } else if (c.nextAtkForLess > 0) {
            tipHtml = `<div class="fc-tip">临界：再加 <b>+${c.nextAtkForLess} 攻</b> 减伤 <b>${c.nextAtkSave}</b></div>`;
        }

        el.forecastBody.className = '';
        el.forecastBody.innerHTML = `
            <div class="fc-top">
                <canvas class="fc-avatar" id="forecastEnemyCanvas" width="44" height="44"></canvas>
                <div class="fc-head-col">
                    <div class="fc-head">
                        <span>${targetEnemy.name}</span>
                        <span class="${dmgClass}">${dmgText}</span>
                    </div>
                    <div class="fc-meta">
                        <span>血 <b>${targetEnemy.hp}</b></span>
                        <span>攻 <b>${targetEnemy.atk}</b> / 防 <b>${targetEnemy.def}</b></span>
                        <span>+${targetEnemy.gold}金 +${targetEnemy.exp}经</span>
                    </div>
                </div>
            </div>
            ${tipHtml}
        `;
        const fcCv = document.getElementById('forecastEnemyCanvas');
        if (fcCv) {
            const fcCtx = fcCv.getContext('2d');
            fcCtx.clearRect(0, 0, 44, 44);
            drawEnemyShape(fcCtx, targetEnemy, 22, 23, 1.15);
        }
    }

    // Shared crisp RPG sprite painter used on Map, HUD, Monster Manual, and Duel Stage
    function drawHeroShape(c2d, cx, cy, scale, dirX = 0, swingPhase = 0) {
        c2d.save();
        c2d.translate(cx, cy);
        c2d.scale(scale, scale);

        // Ground shadow
        c2d.fillStyle = 'rgba(0,0,0,0.4)';
        c2d.beginPath();
        c2d.ellipse(0, 14, 12, 4.5, 0, 0, Math.PI * 2);
        c2d.fill();

        // Crimson hero cloak
        c2d.fillStyle = '#dc2626';
        c2d.beginPath();
        c2d.moveTo(-11, -1); c2d.lineTo(-13, 12); c2d.lineTo(13, 12); c2d.lineTo(11, -1);
        c2d.closePath();
        c2d.fill();

        // Royal blue breastplate armor
        c2d.fillStyle = '#2563eb';
        c2d.beginPath();
        c2d.roundRect(-9.5, -2, 19, 14, 4);
        c2d.fill();
        c2d.fillStyle = '#93c5fd';
        c2d.fillRect(-5, 0, 10, 3);

        // Knight shield on left side
        c2d.fillStyle = '#38bdf8';
        c2d.strokeStyle = '#e0f2fe';
        c2d.lineWidth = 1.4;
        c2d.beginPath();
        c2d.roundRect(-13.5, 0, 7, 10, 3);
        c2d.fill();
        c2d.stroke();

        // Steel broadsword on right hand (rotates during duel lunge)
        c2d.save();
        c2d.translate(9, 4);
        c2d.rotate(-0.45 + swingPhase * 1.45);
        c2d.fillStyle = '#cbd5e1';
        c2d.fillRect(-1.5, -14, 3, 14);
        c2d.fillStyle = '#facc15';
        c2d.fillRect(-4, -2, 8, 2.5);
        c2d.restore();

        // Face & silver helmet with golden crest
        c2d.fillStyle = '#fde68a';
        c2d.beginPath();
        c2d.arc(0, -7, 8, 0, Math.PI * 2);
        c2d.fill();

        c2d.fillStyle = '#94a3b8';
        c2d.beginPath();
        c2d.arc(0, -9, 8.8, Math.PI * 0.92, Math.PI * 0.08);
        c2d.fill();
        c2d.fillStyle = '#facc15';
        c2d.fillRect(-2, -18, 4, 4.5);

        // Determined eyes
        c2d.fillStyle = '#0f172a';
        const ex = dirX * 2.4;
        c2d.fillRect(-3.8 + ex, -7.5, 2.3, 2.8);
        c2d.fillRect(1.6 + ex, -7.5, 2.3, 2.8);
        c2d.restore();
    }

    function drawEnemyShape(c2d, ent, cx, cy, scale, flash = false) {
        c2d.save();
        c2d.translate(cx, cy);
        c2d.scale(scale, scale);

        const bodyCol = flash ? '#ffffff' : ent.color;
        if (ent.sprite === 'slime') {
            c2d.fillStyle = 'rgba(0,0,0,0.32)';
            c2d.beginPath(); c2d.ellipse(0, 12, 12, 4, 0, 0, Math.PI * 2); c2d.fill();
            c2d.fillStyle = bodyCol;
            c2d.beginPath();
            c2d.arc(0, 3, 12.5, Math.PI, 0);
            c2d.lineTo(13, 11);
            c2d.quadraticCurveTo(0, 14, -13, 11);
            c2d.closePath();
            c2d.fill();
            c2d.fillStyle = 'rgba(255,255,255,0.45)';
            c2d.beginPath(); c2d.ellipse(-5, -3, 3.5, 2, -0.4, 0, Math.PI * 2); c2d.fill();
        } else if (ent.sprite === 'bat') {
            c2d.fillStyle = bodyCol;
            c2d.beginPath();
            c2d.moveTo(-16, -4); c2d.lineTo(-6, 1); c2d.lineTo(-3, -7);
            c2d.lineTo(0, -3); c2d.lineTo(3, -7); c2d.lineTo(6, 1);
            c2d.lineTo(16, -4); c2d.lineTo(10, 9); c2d.lineTo(0, 5); c2d.lineTo(-10, 9);
            c2d.closePath();
            c2d.fill();
        } else if (ent.sprite === 'skeleton') {
            c2d.fillStyle = bodyCol;
            c2d.beginPath(); c2d.arc(0, -6, 8.5, 0, Math.PI * 2); c2d.fill();
            c2d.fillRect(-6, 2, 12, 10);
            c2d.fillStyle = '#1e293b';
            c2d.fillRect(-4, 5, 8, 1.8);
            c2d.fillRect(-4, 8.5, 8, 1.8);
            c2d.strokeStyle = '#94a3b8'; c2d.lineWidth = 2.2;
            c2d.beginPath(); c2d.moveTo(9, 10); c2d.lineTo(13, -7); c2d.stroke();
        } else if (ent.sprite === 'mage') {
            c2d.fillStyle = bodyCol;
            c2d.beginPath();
            c2d.moveTo(0, -14); c2d.lineTo(11, -3); c2d.lineTo(12, 13); c2d.lineTo(-12, 13); c2d.lineTo(-11, -3);
            c2d.closePath();
            c2d.fill();
            c2d.fillStyle = '#0f172a';
            c2d.beginPath(); c2d.arc(0, -4, 6.5, 0, Math.PI * 2); c2d.fill();
            c2d.fillStyle = '#fde047';
            c2d.fillRect(-13, -10, 2.5, 22);
            c2d.beginPath(); c2d.arc(-11.8, -11, 3.2, 0, Math.PI * 2); c2d.fill();
        } else if (ent.sprite === 'knight' || ent.sprite === 'orc') {
            c2d.fillStyle = bodyCol;
            c2d.beginPath(); c2d.roundRect(-11, -10, 22, 23, 5); c2d.fill();
            c2d.fillStyle = '#cbd5e1';
            c2d.beginPath();
            c2d.moveTo(-10, -10); c2d.lineTo(-13, -16); c2d.lineTo(-6, -12);
            c2d.moveTo(10, -10); c2d.lineTo(13, -16); c2d.lineTo(6, -12);
            c2d.fill();
            c2d.fillStyle = '#dc2626';
            c2d.fillRect(-9, 1, 18, 3);
        } else if (ent.sprite === 'boss') {
            c2d.fillStyle = 'rgba(239, 68, 68, 0.28)';
            c2d.beginPath(); c2d.arc(0, 0, 17, 0, Math.PI * 2); c2d.fill();
            c2d.fillStyle = bodyCol;
            c2d.beginPath();
            c2d.moveTo(-14, 13); c2d.lineTo(-14, -7); c2d.lineTo(-8, -15);
            c2d.lineTo(0, -9); c2d.lineTo(8, -15); c2d.lineTo(14, -7);
            c2d.lineTo(14, 13);
            c2d.closePath();
            c2d.fill();
            c2d.fillStyle = '#facc15';
            c2d.fillRect(-8, 6, 16, 3);
        } else {
            c2d.fillStyle = bodyCol;
            c2d.beginPath();
            c2d.roundRect(-11, -12, 22, 24, 7);
            c2d.fill();
        }

        if (!flash) {
            c2d.fillStyle = ent.sprite === 'mage' ? '#e879f9' : '#0f172a';
            c2d.fillRect(-5.5, -4, 3.6, 3.6);
            c2d.fillRect(2, -4, 3.6, 3.6);
            c2d.fillStyle = ent.isBoss ? '#fef08a' : '#fff';
            c2d.fillRect(-4.5, -3, 1.6, 1.6);
            c2d.fillRect(3, -3, 1.6, 1.6);
        }
        c2d.restore();
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
        openModal(`第 ${f.floor} 层 · 怪物图鉴（含头像 / 掉血 / 收益）`, `${f.name} · 怪物图鉴`, (body) => {
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
                    ? `掉血 ${calc.damage} HP (${calc.turns}回合)`
                    : (calc.atkNeeded > 0 ? `打不过（差 ${calc.atkNeeded} 攻破防）` : '血量不足（打不过）');
                const breakHint = calc.canWin && calc.nextAtkForLess > 0
                    ? `再+${calc.nextAtkForLess}攻少伤${calc.nextAtkSave}`
                    : '已达当前最低战损';

                row.innerHTML = `
                    <div class="manual-left">
                        <canvas class="manual-avatar" width="40" height="40"></canvas>
                        <div class="manual-info">
                            <strong>${enemy.name} ×${count}</strong>
                            <small>生命 ${enemy.hp} · 攻击 ${enemy.atk} · 防御 ${enemy.def}</small>
                            <small>${breakHint}</small>
                        </div>
                    </div>
                    <div class="manual-right">
                        <strong style="color:${statusColor}">${dmgLabel}</strong>
                        <span class="manual-reward">+${enemy.gold} 金币 · +${enemy.exp} 经验</span>
                    </div>
                `;
                body.appendChild(row);
                const avCanvas = row.querySelector('.manual-avatar');
                const avCtx = avCanvas.getContext('2d');
                drawEnemyShape(avCtx, enemy, 20, 20, 1.05);
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
                <p>“勇者，魔塔共有 <b>30 层</b>，第 10、20、30 层均有强力守关 Boss 镇守！”</p>
                <p>“第 2 层的【次元行者】可赠送你楼层传送器；按 <b>M</b> 可看带头像的详细怪物图鉴，遇到打不过的怪物系统会自动拦截并提示差距。”</p>
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
                const z = Math.floor((game.state.currentFloor - 1) / 10);
                const atkGain = 4 + z * 3;
                const defGain = 4 + z * 3;
                const hpGain = 750 + z * 500;
                const can = game.state.player.gold >= cost;
                openModal('神秘供奉', `金币祭坛（持有 ${game.state.player.gold} 金币）`, (body) => {
                    body.innerHTML = `<p>献上金币强化身躯（已供奉 ${game.state.player.goldBuys} 次）：</p>`;
                    const list = document.createElement('div');
                    list.className = 'shop-btn-list';
                    [
                        { key: 'atk', label: `强化攻击 (+${atkGain} 攻击)` },
                        { key: 'def', label: `强化防御 (+${defGain} 防御)` },
                        { key: 'hp', label: `圣光疗愈 (+${hpGain} 生命)` }
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
                openModal('试炼传承', `经验长老（持有 ${exp} 经验）`, (body) => {
                    body.innerHTML = '<p>“用你的战斗经验换取即刻突破！”</p>';
                    const list = document.createElement('div');
                    list.className = 'shop-btn-list';
                    [
                        { key: 'atk', label: '剑术研习 (+4 攻击)', cost: 30 },
                        { key: 'def', label: '铁壁修心 (+4 防御)', cost: 30 },
                        { key: 'level', label: '潜能飞跃 (+1级：+850生命 +6攻 +6防)', cost: 80 }
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

    // ---------------- Snappy Animated Canvas RPG Duel ----------------
    function stopBattleAnimation(silent = false) {
        if (battleTimer) {
            clearTimeout(battleTimer);
            battleTimer = null;
        }
        if (battleRaf) {
            cancelAnimationFrame(battleRaf);
            battleRaf = null;
        }
        battlePlaying = false;
        el.battleOverlay.classList.add('hidden');
        if (!silent && battleFinishCb) {
            const cb = battleFinishCb;
            battleFinishCb = null;
            cb();
        } else {
            battleFinishCb = null;
        }
    }

    function playBattleAnimation(res, onComplete) {
        const enemy = res.enemy;
        const p = game.state.player;
        const startHeroHp = res.preBattleHeroHp;
        const startEnemyHp = enemy.hp;

        if (el.battleEnemyBadge) el.battleEnemyBadge.textContent = enemy.isBoss ? 'BOSS 决战' : '交锋对决';
        if (el.battleRoundTag) el.battleRoundTag.textContent = '准备交锋';
        el.enemyBattleName.textContent = enemy.name;
        el.heroBattleStats.textContent = `攻 ${p.atk} · 防 ${p.def}`;
        el.enemyBattleStats.textContent = `攻 ${enemy.atk} · 防 ${enemy.def}`;
        el.heroHpBar.style.width = '100%';
        el.enemyHpBar.style.width = '100%';
        el.heroHpText.textContent = `HP ${startHeroHp}`;
        el.enemyHpText.textContent = `HP ${startEnemyHp}`;

        el.battleOverlay.classList.remove('hidden');
        battlePlaying = true;
        battleFinishCb = onComplete;

        const cv = el.battleStageCanvas;
        const sCtx = cv.getContext('2d');
        const W = cv.width;
        const H = cv.height;

        const stage = {
            heroX: 112, enemyX: 348,
            heroPush: 0, enemyPush: 0,
            heroHurt: 0, enemyHurt: 0,
            swing: 0, shake: 0,
            slashArc: null,
            sparks: [],
            pops: []
        };

        const frames = res.timeline || [];
        let idx = 0;
        let round = 0;

        function spawnSparks(x, y, col, dir) {
            for (let i = 0; i < 11; i++) {
                const a = (Math.random() - 0.5) * 1.9 + (dir > 0 ? 0 : Math.PI);
                const spd = 95 + Math.random() * 195;
                stage.sparks.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 35, life: 0.24 + Math.random() * 0.14, col });
            }
        }

        function renderDuel(now) {
            if (!battlePlaying) return;
            const sx = stage.shake > 0 ? (Math.random() - 0.5) * stage.shake * 7 : 0;
            const sy = stage.shake > 0 ? (Math.random() - 0.5) * stage.shake * 5 : 0;
            stage.shake = Math.max(0, stage.shake - 0.12);
            stage.heroPush *= 0.78;
            stage.enemyPush *= 0.78;
            stage.heroHurt = Math.max(0, stage.heroHurt - 0.11);
            stage.enemyHurt = Math.max(0, stage.enemyHurt - 0.11);
            stage.swing *= 0.78;

            sCtx.save();
            sCtx.setTransform(1, 0, 0, 1, sx, sy);

            // Moody dungeon duel floor & torchlight vignette
            const bg = sCtx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#0f172a');
            bg.addColorStop(0.66, '#172033');
            bg.addColorStop(1, '#1e293b');
            sCtx.fillStyle = bg;
            sCtx.fillRect(-10, -10, W + 20, H + 20);

            const torch = sCtx.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H * 0.45, 220);
            torch.addColorStop(0, enemy.isBoss ? 'rgba(239,68,68,0.16)' : 'rgba(250,204,21,0.1)');
            torch.addColorStop(1, 'rgba(0,0,0,0)');
            sCtx.fillStyle = torch;
            sCtx.fillRect(0, 0, W, H);

            // Perspective stone slabs on floor
            sCtx.strokeStyle = 'rgba(148,163,184,0.12)';
            sCtx.lineWidth = 1.5;
            sCtx.beginPath();
            sCtx.moveTo(0, 128); sCtx.lineTo(W, 128);
            for (let gx = 40; gx < W; gx += 75) {
                sCtx.moveTo(gx, 128); sCtx.lineTo(gx + (gx - W / 2) * 0.35, H);
            }
            sCtx.stroke();

            // Draw combatants
            const hx = stage.heroX + stage.heroPush;
            const ex = stage.enemyX - stage.enemyPush;
            if (stage.heroPush > 8) {
                sCtx.globalAlpha = 0.25;
                drawHeroShape(sCtx, hx - 22, 114, 2.3, 1, stage.swing * 0.5);
                sCtx.globalAlpha = 1;
            }
            drawHeroShape(sCtx, hx, 114, 2.35, 1, stage.swing);
            if (stage.heroHurt > 0.35) {
                sCtx.fillStyle = `rgba(239,68,68,${stage.heroHurt * 0.42})`;
                sCtx.beginPath(); sCtx.arc(hx, 108, 30, 0, Math.PI * 2); sCtx.fill();
            }

            drawEnemyShape(sCtx, enemy, ex, 110, enemy.isBoss ? 2.6 : 2.35, stage.enemyHurt > 0.55);

            // Crisp blade / claw slash arc
            if (stage.slashArc && stage.slashArc.life > 0) {
                const sl = stage.slashArc;
                sl.life -= 0.085;
                sCtx.save();
                sCtx.globalAlpha = Math.max(0, sl.life * 1.4);
                sCtx.strokeStyle = sl.color;
                sCtx.lineCap = 'round';
                sCtx.lineWidth = 5 * Math.max(0.2, sl.life);
                sCtx.beginPath();
                if (sl.type === 'hero') {
                    sCtx.arc(sl.x - 10, sl.y, 38, -0.95, 0.85);
                } else {
                    sCtx.moveTo(sl.x + 22, sl.y - 26); sCtx.lineTo(sl.x - 22, sl.y + 22);
                    sCtx.moveTo(sl.x + 12, sl.y - 28); sCtx.lineTo(sl.x - 26, sl.y + 12);
                }
                sCtx.stroke();
                sCtx.restore();
            }

            // Sparks
            for (let i = stage.sparks.length - 1; i >= 0; i--) {
                const sp = stage.sparks[i];
                sp.life -= 0.018;
                if (sp.life <= 0) { stage.sparks.splice(i, 1); continue; }
                sp.x += sp.vx * 0.016;
                sp.y += sp.vy * 0.016;
                sp.vy += 320 * 0.016;
                sCtx.globalAlpha = Math.min(1, sp.life * 3);
                sCtx.fillStyle = sp.col;
                sCtx.fillRect(sp.x - 2, sp.y - 2, 4, 4);
            }
            sCtx.globalAlpha = 1;

            // Floating crisp combat damage numbers
            for (let i = stage.pops.length - 1; i >= 0; i--) {
                const pp = stage.pops[i];
                pp.life -= 0.025;
                if (pp.life <= 0) { stage.pops.splice(i, 1); continue; }
                pp.y -= 0.85;
                sCtx.globalAlpha = Math.min(1, pp.life * 2);
                sCtx.font = 'bold 20px sans-serif';
                sCtx.textAlign = 'center';
                sCtx.lineWidth = 4;
                sCtx.strokeStyle = '#090d16';
                sCtx.strokeText(pp.text, pp.x, pp.y);
                sCtx.fillStyle = pp.color;
                sCtx.fillText(pp.text, pp.x, pp.y);
            }
            sCtx.textAlign = 'left';
            sCtx.globalAlpha = 1;
            sCtx.restore();

            battleRaf = requestAnimationFrame(renderDuel);
        }

        function nextTurn() {
            if (!battlePlaying) return;
            if (idx >= frames.length) {
                if (el.battleRoundTag) el.battleRoundTag.textContent = `胜 · -${res.damage} HP`;
                battleTimer = setTimeout(() => stopBattleAnimation(false), 210);
                return;
            }

            const f = frames[idx++];
            audio.playHit(!!enemy.isBoss && f.actor === 'hero');

            if (f.actor === 'hero') {
                round++;
                if (el.battleRoundTag) el.battleRoundTag.textContent = `第 ${round} 合`;
                stage.heroPush = 68;
                stage.enemyPush = -16;
                stage.enemyHurt = 1;
                stage.swing = 1;
                stage.shake = enemy.isBoss ? 1.0 : 0.45;
                stage.slashArc = { type: 'hero', x: stage.enemyX, y: 106, color: '#fef08a', life: 0.9 };
                spawnSparks(stage.enemyX - 10, 102, '#fde047', 1);
                stage.pops.push({ x: stage.enemyX, y: 60, text: `-${f.dmg}`, color: '#fde047', life: 0.9 });
                el.enemyHpBar.style.width = `${Math.max(0, (f.enemyHp / startEnemyHp) * 100)}%`;
                el.enemyHpText.textContent = `HP ${f.enemyHp}`;
            } else {
                stage.enemyPush = 62;
                stage.heroPush = -14;
                stage.heroHurt = 1;
                stage.shake = f.dmg > 0 ? 0.55 : 0.15;
                stage.slashArc = { type: 'enemy', x: stage.heroX, y: 108, color: f.dmg > 0 ? '#fb7185' : '#38bdf8', life: 0.9 };
                spawnSparks(stage.heroX + 12, 105, f.dmg > 0 ? '#fb7185' : '#7dd3fc', -1);
                stage.pops.push({
                    x: stage.heroX, y: 60,
                    text: f.dmg > 0 ? `-${f.dmg}` : '挡 0',
                    color: f.dmg > 0 ? '#fb7185' : '#7dd3fc',
                    life: 0.9
                });
                el.heroHpBar.style.width = `${Math.max(0, (f.heroHp / startHeroHp) * 100)}%`;
                el.heroHpText.textContent = `HP ${f.heroHp}`;
            }

            battleTimer = setTimeout(nextTurn, 92);
        }

        battleRaf = requestAnimationFrame(renderDuel);
        battleTimer = setTimeout(nextTurn, 50);
    }

    function finishBattleEffects(res) {
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
        syncUI();
        persist();

        if (res.won) {
            audio.playVictory();
            walkQueue = [];
            const p = game.state.player;
            openModal('通关荣耀', '🏆 征服 30 层魔塔深渊！', `
                <p>${res.enemy.rewardText}</p>
                <p>最终战绩：<b>Lv.${p.level}</b> · 剩余生命 <b>${p.hp}</b> · 攻击 <b>${p.atk}</b> · 防御 <b>${p.def}</b> · 击杀 <b>${p.kills}</b> 怪 · 耗时 <b>${p.steps}</b> 步。</p>
                <button class="primary-btn" type="button" id="btnWinReplay">再次挑战魔塔</button>
            `);
            document.getElementById('btnWinReplay').onclick = () => {
                closeModal();
                initGame(true);
            };
        } else if (res.enemy.isBoss && res.enemy.rewardText) {
            audio.playVictory();
            openModal('守关首领击败', `击败 ${res.enemy.name}`, `
                <p>${res.enemy.rewardText}</p>
                <button class="primary-btn" type="button" id="btnBossNext">继续攀登</button>
            `);
            document.getElementById('btnBossNext').onclick = closeModal;
        }
    }

    function performStep(dx, dy) {
        if (!game || battlePlaying || !el.modalBackdrop.classList.contains('hidden')) return false;
        const res = game.step(dx, dy);

        if (!res.ok) {
            walkQueue = [];
            if (res.kind === 'npc') {
                handleNpc(res);
            } else if (res.kind === 'locked') {
                toast(`需要【${res.door.name.replace('门', '钥匙')}】才能开启这扇门！`);
            } else if (res.kind === 'cant_win') {
                audio.playHit(false);
                const enemy = res.enemy;
                const c = res.calc;
                const detailMsg = c.reason === 'no_break'
                    ? `你的攻击力（<b>${game.state.player.atk}</b>）尚未高于 <b>${enemy.name}</b> 的防御力（<b>${enemy.def}</b>），无法造成任何伤害！<br><br>需要至少再提升 <b>+${c.atkNeeded} 点攻击力</b> 才能破防，目前已阻止你从此方向强行通过。`
                    : `挑战 <b>${enemy.name}</b> 预计将承受 <b>${c.damage}</b> 点伤害，已超过你当前剩余的 <b>${game.state.player.hp}</b> 生命值！<br><br>硬闯必败，系统已阻止你继续前进，请先收集血瓶或升级防具后再来挑战。`;

                openModal('战力不足 · 禁止通行', `打不过【${enemy.name}】！`, `
                    <p>${detailMsg}</p>
                    <button class="primary-btn" type="button" id="btnCantWinOk">撤回整备</button>
                `);
                document.getElementById('btnCantWinOk').onclick = closeModal;
                toast(`警告：打不过 ${enemy.name}，无法从此方向通过！`);
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
            walkQueue = [];
            if (skipBattleAnim) {
                audio.playHit(!!res.enemy.isBoss);
                finishBattleEffects(res);
                return true;
            }
            syncUI();
            playBattleAnimation(res, () => finishBattleEffects(res));
            return true;
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

    // ---------------- Canvas Sprite Rendering (15x15 x 44px) ----------------
    function drawTileSprites(now) {
        const f = game.currentFloorData();
        const zone = E.ZONES[f.zoneIdx] || E.ZONES[0];
        const p = game.state.player;
        const pulse = Math.sin(now * 0.005);

        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                const px = x * TILE;
                const py = y * TILE;
                if (f.grid[y][x] === 1) {
                    ctx.fillStyle = zone.wallSide;
                    ctx.fillRect(px, py, TILE, TILE);
                    ctx.fillStyle = zone.wallTop;
                    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 7);
                    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(px + 2, py + TILE * 0.45); ctx.lineTo(px + TILE - 2, py + TILE * 0.45);
                    ctx.moveTo(px + TILE * 0.5, py + 2); ctx.lineTo(px + TILE * 0.5, py + TILE * 0.45);
                    ctx.moveTo(px + TILE * 0.25, py + TILE * 0.45); ctx.lineTo(px + TILE * 0.25, py + TILE - 5);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = (x + y) % 2 === 0 ? zone.floorBg : zone.floorAlt;
                    ctx.fillRect(px, py, TILE, TILE);
                }
            }
        }

        if (hoveredTile && hoveredTile.x >= 0 && hoveredTile.x < GRID && hoveredTile.y >= 0 && hoveredTile.y < GRID) {
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
            ctx.lineWidth = 2;
            ctx.strokeRect(hoveredTile.x * TILE + 2, hoveredTile.y * TILE + 2, TILE - 4, TILE - 4);
        }

        for (const [k, ent] of f.entities.entries()) {
            const [gx, gy] = k.split(',').map(Number);
            const px = gx * TILE;
            const py = gy * TILE;
            const cx = px + TILE / 2;
            const cy = py + TILE / 2;

            if (ent.type === 'stairs_up' || ent.type === 'stairs_down') {
                const isUp = ent.type === 'stairs_up';
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
                ctx.fillStyle = isUp ? '#38bdf8' : '#f59e0b';
                for (let s = 0; s < 4; s++) {
                    const inset = s * 3.5;
                    ctx.fillRect(px + 8 + (isUp ? inset : 0), py + 9 + s * 6, TILE - 16 - inset, 4.5);
                }
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10.5px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(isUp ? '▲上' : '▼下', cx, py + TILE - 6);
                ctx.textAlign = 'left';
            } else if (ent.type === 'door') {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
                ctx.fillStyle = ent.color;
                ctx.fillRect(px + 7, py + 6, TILE - 14, TILE - 12);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
                ctx.fillRect(px + 11, py + 11, TILE - 22, 9);
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc(cx, cy + 6, 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (ent.type === 'key') {
                const bob = pulse * 1.4;
                ctx.strokeStyle = ent.color;
                ctx.lineWidth = 2.8;
                ctx.beginPath();
                ctx.arc(cx - 5, cy + bob, 5.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = ent.color;
                ctx.fillRect(cx + 1, cy - 1.5 + bob, 12, 3);
                ctx.fillRect(cx + 8, cy + 1.5 + bob, 3, 4.5);
                ctx.fillRect(cx + 11, cy + 1.5 + bob, 2.5, 3.5);
            } else if (ent.type === 'item') {
                const bob = pulse * 1.4;
                if (ent.sub === 'gem_red' || ent.sub === 'gem_blue') {
                    ctx.fillStyle = ent.color;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - 11 + bob);
                    ctx.lineTo(cx + 10, cy + bob);
                    ctx.lineTo(cx, cy + 11 + bob);
                    ctx.lineTo(cx - 10, cy + bob);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.45)';
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - 8 + bob);
                    ctx.lineTo(cx + 4.5, cy - 2 + bob);
                    ctx.lineTo(cx, cy + bob);
                    ctx.closePath();
                    ctx.fill();
                } else if (ent.sub === 'potion_sm' || ent.sub === 'potion_lg') {
                    const r = ent.sub === 'potion_lg' ? 10 : 8;
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillRect(cx - 3, cy - r - 4 + bob, 6, 5);
                    ctx.fillStyle = ent.color;
                    ctx.beginPath();
                    ctx.arc(cx, cy + 2 + bob, r, 0, Math.PI * 2);
                    ctx.fill();
                } else if (ent.sub === 'weapon') {
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.moveTo(cx - 9, cy + 9 + bob);
                    ctx.lineTo(cx + 10, cy - 10 + bob);
                    ctx.stroke();
                    ctx.strokeStyle = '#92400e';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(cx - 10, cy + 2 + bob);
                    ctx.lineTo(cx - 2, cy + 10 + bob);
                    ctx.stroke();
                } else if (ent.sub === 'shield') {
                    ctx.fillStyle = '#38bdf8';
                    ctx.beginPath();
                    ctx.moveTo(cx - 9, cy - 9 + bob);
                    ctx.lineTo(cx + 9, cy - 9 + bob);
                    ctx.lineTo(cx + 8, cy + 3 + bob);
                    ctx.lineTo(cx, cy + 12 + bob);
                    ctx.lineTo(cx - 8, cy + 3 + bob);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#e0f2fe';
                    ctx.lineWidth = 1.8;
                    ctx.stroke();
                } else {
                    ctx.fillStyle = '#a855f7';
                    ctx.fillRect(cx - 9, cy - 10 + bob, 18, 20);
                    ctx.fillStyle = '#facc15';
                    ctx.fillRect(cx - 6, cy - 3 + bob, 12, 3);
                }
            } else if (ent.type === 'npc') {
                ctx.fillStyle = ent.color;
                ctx.beginPath();
                ctx.arc(cx, cy - 5 + pulse, 7.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#e2e8f0';
                ctx.beginPath();
                ctx.moveTo(cx - 10, cy + 14);
                ctx.lineTo(cx + 10, cy + 14);
                ctx.lineTo(cx + 6.5, cy + 1.5);
                ctx.lineTo(cx - 6.5, cy + 1.5);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                const tag = ent.sub === 'flyer' ? '传' : ent.sub === 'altar_gold' ? '金' : ent.sub === 'altar_exp' ? '经' : ent.sub === 'key_shop' ? '钥' : '智';
                ctx.fillText(tag, cx, cy + 12);
                ctx.textAlign = 'left';
            } else if (ent.type === 'enemy') {
                const bob = pulse * 1.3;
                const sc = ent.isBoss ? 1.15 : 0.94;
                drawEnemyShape(ctx, ent, cx, cy + bob, sc);

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
                    ctx.font = 'bold 10px sans-serif';
                    const tw = Math.max(17, ctx.measureText(text).width + 7);
                    ctx.fillStyle = bg;
                    ctx.beginPath();
                    ctx.roundRect(px + TILE - tw - 2, py + TILE - 15, tw, 13, 4);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'center';
                    ctx.fillText(text, px + TILE - tw / 2 - 2, py + TILE - 5);
                    ctx.textAlign = 'left';
                }
            }
        }

        anim.px += (p.x - anim.px) * 0.35;
        anim.py += (p.y - anim.py) * 0.35;
        drawHeroShape(ctx, (anim.px + 0.5) * TILE, (anim.py + 0.5) * TILE, 0.96, p.dirX);
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
        if (battlePlaying) {
            if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                stopBattleAnimation(false);
            }
            return;
        }
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
        } else if (e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            skipBattleAnim = !skipBattleAnim;
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
        if (!game || battlePlaying || !el.modalBackdrop.classList.contains('hidden')) return;
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
    el.btnBattleAnim.onclick = () => {
        skipBattleAnim = !skipBattleAnim;
        syncUI();
        persist();
    };
    el.btnSkipBattleNow.onclick = () => stopBattleAnimation(false);
    el.btnUndo.onclick = () => {
        if (battlePlaying) return;
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
        if (confirm('确定要重新开始 30 层魔塔挑战吗？当前进度将被重置。')) {
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

        if (walkQueue.length > 0 && game && !battlePlaying && !game.state.player.won && el.modalBackdrop.classList.contains('hidden')) {
            walkTimer += dt;
            if (walkTimer >= 0.08) {
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
