// HD Asset Loader & Authentic Cartoon Sprite/Material Renderer for Angry Birds Remastered

class SpriteRenderer {
    constructor() {
        this.images = {};
        this.patterns = {};
        this.loadedCount = 0;

        const assetList = {
            bg_meadow: 'assets/bg_meadow.jpg',
            bg_desert: 'assets/bg_desert.jpg',
            bg_castle: 'assets/bg_castle.jpg',
            tex_wood: 'assets/tex_wood.jpg',
            tex_stone: 'assets/tex_stone.jpg',
            tex_ice: 'assets/tex_ice.jpg',
            tex_tnt: 'assets/tex_tnt.jpg'
        };

        Object.entries(assetList).forEach(([key, src]) => {
            const img = new Image();
            img.onload = () => {
                this.images[key] = img;
                this.loadedCount++;
                if (key.startsWith('tex_') && key !== 'tex_tnt') {
                    this.buildScaledPattern(key, img, 160);
                }
            };
            img.src = src;
        });
    }

    buildScaledPattern(key, img, size) {
        const off = document.createElement('canvas');
        off.width = size;
        off.height = size;
        const octx = off.getContext('2d');
        octx.drawImage(img, 0, 0, size, size);
        this.patterns[key] = octx.createPattern(off, 'repeat');
    }

    // =========================================================================
    // WORLD BACKGROUNDS & PARALLAX TERRAIN
    // =========================================================================
    drawWorldBackground(ctx, worldKey, camera, viewW, viewH, worldW, groundY, time) {
        const bgImg = this.images[`bg_${worldKey}`];

        // 1. Sky + Parallax Illustrated Backdrop (screen-space with smooth horizontal parallax)
        ctx.save();
        if (bgImg) {
            // Compute horizontal parallax factor (0..1 across camera pan range)
            const maxCamX = Math.max(1, worldW - viewW / camera.zoom);
            const panProgress = Math.max(0, Math.min(1, camera.x / maxCamX));
            const drawW = viewW * 1.28;
            const drawH = viewH * 1.04;
            const offsetX = -panProgress * (drawW - viewW);
            ctx.drawImage(bgImg, offsetX, -viewH * 0.04, drawW, drawH);
        } else {
            // Instant fallback sky gradient while image decodes
            const grad = ctx.createLinearGradient(0, 0, 0, viewH);
            if (worldKey === 'desert') {
                grad.addColorStop(0, '#7c2d12');
                grad.addColorStop(0.55, '#f97316');
                grad.addColorStop(1, '#fde047');
            } else if (worldKey === 'castle') {
                grad.addColorStop(0, '#090d1f');
                grad.addColorStop(0.6, '#1e1b4b');
                grad.addColorStop(1, '#4c1d95');
            } else if (worldKey === 'snow') {
                grad.addColorStop(0, '#0c1a30');
                grad.addColorStop(0.35, '#073b4c');
                grad.addColorStop(0.7, '#0ea5e9');
                grad.addColorStop(1, '#bae6fd');
            } else {
                grad.addColorStop(0, '#0284c7');
                grad.addColorStop(0.65, '#7dd3fc');
                grad.addColorStop(1, '#e0f2fe');
            }
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, viewW, viewH);
        }

        // Atmospheric floating motes / snowflakes
        if (worldKey === 'snow') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            for (let i = 0; i < 28; i++) {
                const px = ((i * 127 + time * 32 * (0.6 + (i % 4) * 0.2)) % (viewW + 40)) - 20;
                const py = (time * (42 + (i % 5) * 16) + i * 79) % (viewH + 20) - 10;
                ctx.beginPath();
                ctx.arc(px, py, 1.2 + (i % 3) * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = worldKey === 'castle' ? 'rgba(196, 181, 253, 0.45)' : 'rgba(255, 255, 230, 0.35)';
            for (let i = 0; i < 14; i++) {
                const px = ((i * 173 + time * 18 * (0.4 + (i % 3) * 0.2)) % (viewW + 40)) - 20;
                const py = 60 + ((i * 97 + Math.sin(time * 1.5 + i) * 18) % (viewH * 0.65));
                ctx.beginPath();
                ctx.arc(px, py, 1.8 + (i % 3), 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    drawForegroundGround(ctx, worldKey, worldW, groundY, worldH) {
        ctx.save();
        const depth = worldH - groundY + 120;

        // Soil / Bedrock body
        const soilGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 110);
        if (worldKey === 'desert') {
            soilGrad.addColorStop(0, '#c2410c');
            soilGrad.addColorStop(0.18, '#9a3412');
            soilGrad.addColorStop(1, '#431407');
        } else if (worldKey === 'castle') {
            soilGrad.addColorStop(0, '#334155');
            soilGrad.addColorStop(0.18, '#1e293b');
            soilGrad.addColorStop(1, '#0f172a');
        } else if (worldKey === 'snow') {
            soilGrad.addColorStop(0, '#1e293b');
            soilGrad.addColorStop(0.22, '#0f172a');
            soilGrad.addColorStop(1, '#020617');
        } else {
            soilGrad.addColorStop(0, '#5c3a21');
            soilGrad.addColorStop(0.22, '#432818');
            soilGrad.addColorStop(1, '#241409');
        }
        ctx.fillStyle = soilGrad;
        ctx.fillRect(-300, groundY, worldW + 600, depth);

        // Top Turf / Sandstone / Snow Crust / Cobblestone Cap Strip
        const capH = 18;
        const capGrad = ctx.createLinearGradient(0, groundY - 4, 0, groundY + capH);
        if (worldKey === 'desert') {
            capGrad.addColorStop(0, '#fdba74');
            capGrad.addColorStop(0.5, '#ea580c');
            capGrad.addColorStop(1, '#9a3412');
        } else if (worldKey === 'castle') {
            capGrad.addColorStop(0, '#64748b');
            capGrad.addColorStop(0.5, '#475569');
            capGrad.addColorStop(1, '#1e293b');
        } else if (worldKey === 'snow') {
            capGrad.addColorStop(0, '#ffffff');
            capGrad.addColorStop(0.35, '#e0f2fe');
            capGrad.addColorStop(0.75, '#7dd3fc');
            capGrad.addColorStop(1, '#0284c7');
        } else {
            capGrad.addColorStop(0, '#84cc16');
            capGrad.addColorStop(0.55, '#4d7c0f');
            capGrad.addColorStop(1, '#365314');
        }
        ctx.fillStyle = capGrad;
        ctx.fillRect(-300, groundY - 2, worldW + 600, capH);

        // Decorative grass tufts / pebbles / icicles / flagstones along ground surface
        ctx.strokeStyle = worldKey === 'desert' ? '#7c2d12' : (worldKey === 'castle' ? '#0f172a' : (worldKey === 'snow' ? '#0284c7' : '#1a2e05'));
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-300, groundY);
        ctx.lineTo(worldW + 300, groundY);
        ctx.stroke();

        for (let x = -100; x < worldW + 200; x += 48) {
            if (worldKey === 'meadow') {
                // Grass blades & tiny wildflowers
                ctx.fillStyle = '#65a30d';
                ctx.beginPath();
                ctx.moveTo(x, groundY);
                ctx.lineTo(x - 5, groundY - 11);
                ctx.lineTo(x + 2, groundY - 3);
                ctx.lineTo(x + 7, groundY - 13);
                ctx.lineTo(x + 12, groundY);
                ctx.fill();

                if (x % 144 === 0) {
                    ctx.fillStyle = '#fef08a';
                    ctx.beginPath();
                    ctx.arc(x + 22, groundY - 6, 3.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (worldKey === 'desert') {
                ctx.fillStyle = '#7c2d12';
                ctx.beginPath();
                ctx.ellipse(x + 14, groundY + 24 + (x % 17), 9, 4.5, 0.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (worldKey === 'snow') {
                // Frosted icicles and snow powder
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(x, groundY);
                ctx.lineTo(x + 8, groundY + 10 + (x % 9));
                ctx.lineTo(x + 16, groundY);
                ctx.fill();

                ctx.fillStyle = '#bae6fd';
                ctx.beginPath();
                ctx.arc(x + 28, groundY - 4, 3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Castle stone blocks trim
                ctx.fillStyle = '#475569';
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 1.5;
                ctx.fillRect(x, groundY + 2, 42, 12);
                ctx.strokeRect(x, groundY + 2, 42, 12);
            }
        }

        // Sub-surface decorative stones
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for (let x = 0; x < worldW; x += 95) {
            ctx.beginPath();
            ctx.ellipse(x + 30, groundY + 38 + (x % 22), 14, 7, 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // =========================================================================
    // CARVED HARDWOOD SLINGSHOT (LAUNCH MOUND + 2-LAYER DEPTH + ELASTIC BANDS)
    // =========================================================================
    drawSlingshotBack(ctx, slingPos, groundY, pullPos, kingSlingActive, worldKey = 'meadow', maxStretch = 124) {
        const { x, y } = slingPos;
        const moundTopY = groundY - 30;
        ctx.save();

        // 1. Subtle circular pull-range guide ring while aiming/dragging
        if (pullPos && (Math.hypot(pullPos.x - x, pullPos.y - y) > 4)) {
            const stretchDist = Math.hypot(pullPos.x - x, pullPos.y - y);
            const ratio = Math.min(1, stretchDist / maxStretch);

            ctx.save();
            ctx.strokeStyle = ratio > 0.85
                ? 'rgba(251, 146, 60, 0.28)'
                : 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 2;
            ctx.setLineDash([7, 7]);
            ctx.beginPath();
            ctx.arc(x, y, maxStretch, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 2. Raised Earthen / Stone Launcher Hillock Mound (grounds the slingshot naturally)
        const moundGrad = ctx.createLinearGradient(x, moundTopY, x, groundY + 12);
        if (worldKey === 'desert') {
            moundGrad.addColorStop(0, '#ea580c');
            moundGrad.addColorStop(0.4, '#9a3412');
            moundGrad.addColorStop(1, '#5c240c');
        } else if (worldKey === 'castle') {
            moundGrad.addColorStop(0, '#64748b');
            moundGrad.addColorStop(0.45, '#334155');
            moundGrad.addColorStop(1, '#1e293b');
        } else if (worldKey === 'snow') {
            moundGrad.addColorStop(0, '#e2e8f0');
            moundGrad.addColorStop(0.35, '#94a3b8');
            moundGrad.addColorStop(0.65, '#475569');
            moundGrad.addColorStop(1, '#1e293b');
        } else {
            moundGrad.addColorStop(0, '#65a30d');
            moundGrad.addColorStop(0.32, '#4d7c0f');
            moundGrad.addColorStop(0.42, '#78472a');
            moundGrad.addColorStop(1, '#432818');
        }

        ctx.fillStyle = moundGrad;
        ctx.strokeStyle = worldKey === 'castle' ? '#0f172a' : (worldKey === 'snow' ? '#0284c7' : '#2b1708');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 78, groundY + 4);
        ctx.quadraticCurveTo(x - 52, moundTopY - 2, x, moundTopY);
        ctx.quadraticCurveTo(x + 52, moundTopY - 2, x + 78, groundY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Lush grass cap / snow cap / stone trim on hillock crest
        if (worldKey === 'meadow') {
            ctx.fillStyle = '#84cc16';
            ctx.beginPath();
            ctx.ellipse(x, moundTopY + 4, 46, 7, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (worldKey === 'snow') {
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.ellipse(x, moundTopY + 4, 46, 7, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Heavy timber base collar anchored into hillock
        ctx.fillStyle = '#4a250b';
        ctx.strokeStyle = '#231004';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.roundRect(x - 24, moundTopY - 6, 48, 15, 6);
        ctx.fill();
        ctx.stroke();

        // 3. Stout Classic Y-Stem & Far (right/back) Prong
        const woodGrad = ctx.createLinearGradient(x - 18, y, x + 18, y);
        woodGrad.addColorStop(0, kingSlingActive ? '#f59e0b' : '#a1622b');
        woodGrad.addColorStop(0.5, kingSlingActive ? '#fbbf24' : '#7c4318');
        woodGrad.addColorStop(1, '#3b1d0a');

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Far prong outline + fill (drawn behind the bird)
        ctx.strokeStyle = '#231004';
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.moveTo(x, moundTopY);
        ctx.lineTo(x, y + 34);
        ctx.lineTo(x + 21, y - 16);
        ctx.stroke();

        ctx.strokeStyle = woodGrad;
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(x, moundTopY);
        ctx.lineTo(x, y + 34);
        ctx.lineTo(x + 21, y - 16);
        ctx.stroke();

        // Anchor tie wrap on far prong
        ctx.strokeStyle = '#3b1106';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x + 14, y - 12);
        ctx.lineTo(x + 26, y - 10);
        ctx.stroke();

        // Far rubber band
        if (pullPos) {
            const stretchDist = Math.hypot(pullPos.x - x, pullPos.y - y);
            const bandWidth = Math.max(3.8, 9.2 - stretchDist * 0.036);
            ctx.strokeStyle = '#1c0703';
            ctx.lineWidth = bandWidth + 2.4;
            ctx.beginPath();
            ctx.moveTo(x + 20, y - 12);
            ctx.lineTo(pullPos.x, pullPos.y);
            ctx.stroke();

            ctx.strokeStyle = kingSlingActive ? '#eab308' : '#5c190e';
            ctx.lineWidth = bandWidth;
            ctx.beginPath();
            ctx.moveTo(x + 20, y - 12);
            ctx.lineTo(pullPos.x, pullPos.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawSlingshotFront(ctx, slingPos, pullPos, birdRadius = 18, kingSlingActive = false) {
        const { x, y } = slingPos;
        ctx.save();

        if (pullPos) {
            const dx = pullPos.x - x;
            const dy = pullPos.y - y;
            const dist = Math.hypot(dx, dy) || 1;
            const nx = dx / dist;
            const ny = dy / dist;
            const pouchX = birdRadius > 0 && dist > 6 ? pullPos.x + nx * (birdRadius * 0.76) : pullPos.x;
            const pouchY = birdRadius > 0 && dist > 6 ? pullPos.y + ny * (birdRadius * 0.76) : pullPos.y;

            // Stitched Leather Pouch hugging behind the bird
            ctx.save();
            ctx.translate(pouchX, pouchY);
            ctx.rotate(Math.atan2(dy, dx));
            ctx.fillStyle = '#3b1d0a';
            ctx.strokeStyle = '#1c0c04';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Bright leather highlight stitch
            ctx.strokeStyle = '#9a5828';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(0, 0, 6, -0.8, 0.8);
            ctx.stroke();
            ctx.restore();

            // Front rubber band (from near prong to pouch) with crisp dark border
            const bandWidth = Math.max(3.8, 9.6 - dist * 0.036);
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#1c0703';
            ctx.lineWidth = bandWidth + 2.4;
            ctx.beginPath();
            ctx.moveTo(x - 20, y - 11);
            ctx.lineTo(pouchX, pouchY);
            ctx.stroke();

            ctx.strokeStyle = kingSlingActive ? '#fde047' : '#852415';
            ctx.lineWidth = bandWidth;
            ctx.beginPath();
            ctx.moveTo(x - 20, y - 11);
            ctx.lineTo(pouchX, pouchY);
            ctx.stroke();
        } else {
            // Resting rubber band hanging loosely between prongs
            ctx.strokeStyle = kingSlingActive ? '#eab308' : '#5a170c';
            ctx.lineWidth = 5.5;
            ctx.beginPath();
            ctx.moveTo(x - 20, y - 11);
            ctx.quadraticCurveTo(x, y + 8, x + 20, y - 12);
            ctx.stroke();
        }

        // Near (left/foreground) prong drawn in front of bird for true 3D fork depth!
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#231004';
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.moveTo(x, y + 34);
        ctx.lineTo(x - 21, y - 14);
        ctx.stroke();

        const frontWood = ctx.createLinearGradient(x - 24, y - 18, x, y + 34);
        frontWood.addColorStop(0, kingSlingActive ? '#fde047' : '#c27838');
        frontWood.addColorStop(1, kingSlingActive ? '#d97706' : '#7c4318');
        ctx.strokeStyle = frontWood;
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(x, y + 34);
        ctx.lineTo(x - 21, y - 14);
        ctx.stroke();

        // Anchor tie wrap on near prong
        ctx.strokeStyle = '#3b1106';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x - 26, y - 10);
        ctx.lineTo(x - 14, y - 12);
        ctx.stroke();

        // Leather handle grip wrap on stem
        ctx.fillStyle = '#3b1604';
        ctx.strokeStyle = '#1c0901';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(x - 10, y + 46 + i * 9, 20, 5.5);
            ctx.strokeRect(x - 10, y + 46 + i * 9, 20, 5.5);
        }

        ctx.restore();
    }

    // =========================================================================
    // 6 ICONIC ANGRY BIRDS (VOLUMETRIC 3D SHADING + DYNAMIC FACIAL STATES)
    // =========================================================================
    drawBird(ctx, birdBody, time, stateHint = 'idle', customScale = null) {
        const { x, y } = birdBody.position;
        const bData = birdBody.customData;
        const flags = {
            inFlight: bData.inFlight,
            abilityUsed: bData.abilityUsed,
            fuseArmed: Boolean(bData.detonateTimer),
            strained: stateHint === 'dragging',
            hurt: bData.collided
        };
        if (customScale) {
            flags.scaleX = customScale.x;
            flags.scaleY = customScale.y;
        }
        this.drawBirdAt(ctx, x, y, birdBody.angle, bData.birdType, bData.radius, time, flags);
    }

    drawBirdAt(ctx, x, y, angle, birdType, r, time, flags = {}) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        if (flags.scaleX !== undefined && flags.scaleY !== undefined) {
            ctx.scale(flags.scaleX, flags.scaleY);
        }

        // Fluttering wings during hop jump
        if (flags.flapping) {
            const flap = Math.sin(time * 32) * 0.55;
            ctx.save();
            ctx.fillStyle = birdType === 'yellow' ? '#ca8a04' : birdType === 'blue' ? '#0284c7' : '#991b1b';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.6;
            [-1, 1].forEach(side => {
                ctx.save();
                ctx.translate(-r * 0.15, side * (r * 0.65));
                ctx.rotate(side * (0.8 + flap));
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 0.38, r * 0.18, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            });
            ctx.restore();
        }

        // Supersonic Mach cone if Chuck dashed!
        if (birdType === 'yellow' && flags.abilityUsed && flags.inFlight) {
            const coneGrad = ctx.createLinearGradient(r + 12, 0, -r * 2.2, 0);
            coneGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
            coneGrad.addColorStop(0.4, 'rgba(250, 204, 21, 0.5)');
            coneGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
            ctx.fillStyle = coneGrad;
            ctx.beginPath();
            ctx.moveTo(r + 14, 0);
            ctx.lineTo(-r * 2.1, -r * 1.45);
            ctx.lineTo(-r * 2.1, r * 1.45);
            ctx.closePath();
            ctx.fill();
        }

        switch (birdType) {
            case 'red':
                this._drawRedOrTerence(ctx, r, false, time, flags);
                break;
            case 'terence':
                this._drawRedOrTerence(ctx, r, true, time, flags);
                break;
            case 'yellow':
                this._drawChuck(ctx, r, time, flags);
                break;
            case 'blue':
                this._drawBlue(ctx, r, time, flags);
                break;
            case 'bomb':
                this._drawBomb(ctx, r, time, flags);
                break;
            case 'matilda':
                this._drawMatilda(ctx, r, time, flags);
                break;
        }

        ctx.restore();
    }

    _drawRedOrTerence(ctx, r, isTerence, time, flags) {
        // Tail feathers
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.moveTo(-r * 0.85, 0);
        ctx.lineTo(-r * 1.42, -r * 0.35);
        ctx.lineTo(-r * 1.32, -r * 0.12);
        ctx.lineTo(-r * 1.48, 0.02);
        ctx.lineTo(-r * 1.3, r * 0.14);
        ctx.lineTo(-r * 1.38, r * 0.32);
        ctx.closePath();
        ctx.fill();

        // Crest plumes on top
        ctx.fillStyle = isTerence ? '#991b1b' : '#dc2626';
        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(-r * 0.12, -r * 1.08, r * 0.28, r * 0.15, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(r * 0.14, -r * 1.12, r * 0.32, r * 0.16, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Main plush body with 3D radial lighting
        const bodyGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.32, r * 0.1, 0, 0, r * 1.05);
        if (isTerence) {
            bodyGrad.addColorStop(0, '#dc2626');
            bodyGrad.addColorStop(0.55, '#991b1b');
            bodyGrad.addColorStop(1, '#450a0a');
        } else {
            bodyGrad.addColorStop(0, '#ff5a5f');
            bodyGrad.addColorStop(0.55, '#dc2626');
            bodyGrad.addColorStop(1, '#7f1d1d');
        }
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Belly cream patch (clipped inside body circle)
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = isTerence ? '#d6bcab' : '#fde8cd';
        ctx.beginPath();
        ctx.ellipse(r * 0.15, r * 0.78, r * 0.78, r * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();

        // Characteristic darker red spots on sides
        ctx.fillStyle = isTerence ? 'rgba(45, 5, 5, 0.5)' : 'rgba(127, 29, 29, 0.45)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.38, r * 0.08, r * 0.16, r * 0.22, 0.2, 0, Math.PI * 2);
        ctx.ellipse(-r * 0.12, r * 0.18, r * 0.11, r * 0.15, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Crisp dark outline
        ctx.strokeStyle = '#3b0707';
        ctx.lineWidth = isTerence ? 3.2 : 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        // Terence eye-bags / wrinkles
        if (isTerence) {
            ctx.strokeStyle = 'rgba(45, 5, 5, 0.65)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(r * 0.16, -r * 0.06, r * 0.24, 0.15 * Math.PI, 0.85 * Math.PI);
            ctx.arc(r * 0.55, -r * 0.06, r * 0.24, 0.15 * Math.PI, 0.85 * Math.PI);
            ctx.stroke();
        }

        this._drawExpressiveBirdEyesAndBeak(ctx, r, '#111827', time, flags, isTerence ? 1.15 : 1.0);
    }

    _drawChuck(ctx, r, time, flags) {
        // Black tail tuft
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.moveTo(-r * 0.85, r * 0.1);
        ctx.lineTo(-r * 1.48, -r * 0.15);
        ctx.lineTo(-r * 1.25, r * 0.08);
        ctx.lineTo(-r * 1.45, r * 0.28);
        ctx.closePath();
        ctx.fill();

        // Spiky black head crest
        ctx.beginPath();
        ctx.moveTo(-r * 0.18, -r * 0.92);
        ctx.lineTo(-r * 0.45, -r * 1.48);
        ctx.lineTo(-r * 0.02, -r * 1.05);
        ctx.lineTo(-r * 0.12, -r * 1.52);
        ctx.lineTo(r * 0.18, -r * 0.92);
        ctx.closePath();
        ctx.fill();

        // Rounded aerodynamic cone/triangle body
        const grad = ctx.createRadialGradient(-r * 0.1, -r * 0.25, r * 0.1, 0, r * 0.1, r * 1.25);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.55, '#facc15');
        grad.addColorStop(1, '#ca8a04');

        ctx.fillStyle = grad;
        ctx.strokeStyle = '#713f12';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.06);
        ctx.quadraticCurveTo(r * 1.05, -r * 0.1, r * 0.95, r * 0.72);
        ctx.quadraticCurveTo(0, r * 1.08, -r * 0.98, r * 0.74);
        ctx.quadraticCurveTo(-r * 1.02, -r * 0.1, 0, -r * 1.06);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // White lower belly patch
        ctx.fillStyle = '#fefce8';
        ctx.beginPath();
        ctx.ellipse(r * 0.08, r * 0.62, r * 0.56, r * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();

        this._drawExpressiveBirdEyesAndBeak(ctx, r * 0.96, '#9a3412', time, flags, 0.95);
    }

    _drawBlue(ctx, r, time, flags) {
        // Tail
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath();
        ctx.moveTo(-r * 0.8, 0);
        ctx.lineTo(-r * 1.4, -r * 0.28);
        ctx.lineTo(-r * 1.38, r * 0.24);
        ctx.closePath();
        ctx.fill();

        // Head crest
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#0c4a6e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(-r * 0.1, -r * 1.05, r * 0.3, r * 0.14, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Body
        const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
        grad.addColorStop(0, '#7dd3fc');
        grad.addColorStop(0.6, '#0284c7');
        grad.addColorStop(1, '#075985');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#082f49';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Orange eye-rings characteristic of The Blues
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(r * 0.18, -r * 0.12, r * 0.31, 0, Math.PI * 2);
        ctx.arc(r * 0.56, -r * 0.12, r * 0.29, 0, Math.PI * 2);
        ctx.fill();

        this._drawExpressiveBirdEyesAndBeak(ctx, r, '#0f172a', time, flags, 0.85);
    }

    _drawBomb(ctx, r, time, flags) {
        // Fuse stem
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.95);
        ctx.quadraticCurveTo(r * 0.12, -r * 1.38, r * 0.35, -r * 1.48);
        ctx.stroke();

        // Fuse tip cap
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-5, -r * 1.08, 10, 6);

        // Sparkling burning fuse!
        const sparkSize = (flags.fuseArmed || flags.inFlight) ? 6.5 + Math.sin(time * 28) * 2.5 : 3.5 + Math.sin(time * 12) * 1.2;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(r * 0.35, -r * 1.48, sparkSize * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(r * 0.35, -r * 1.48, sparkSize * 0.75, 0, Math.PI * 2);
        ctx.fill();

        // Body — pulses glowing red-hot when armed to explode!
        const armedPulse = flags.fuseArmed ? (0.5 + 0.5 * Math.sin(time * 26)) : 0;
        const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
        if (armedPulse > 0.35) {
            grad.addColorStop(0, '#fb923c');
            grad.addColorStop(0.5, '#dc2626');
            grad.addColorStop(1, '#18181b');
        } else {
            grad.addColorStop(0, '#52525b');
            grad.addColorStop(0.55, '#27272a');
            grad.addColorStop(1, '#09090b');
        }
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Grey forehead spot & belly patch
        ctx.fillStyle = 'rgba(212, 212, 216, 0.85)';
        ctx.beginPath();
        ctx.ellipse(r * 0.32, -r * 0.56, r * 0.15, r * 0.2, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(161, 161, 170, 0.45)';
        ctx.beginPath();
        ctx.ellipse(r * 0.1, r * 0.65, r * 0.58, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        this._drawExpressiveBirdEyesAndBeak(ctx, r, '#b45309', time, flags, 0.95);
    }

    _drawMatilda(ctx, r, time, flags) {
        // Black tail feathers
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.moveTo(-r * 0.8, 0);
        ctx.lineTo(-r * 1.38, -r * 0.3);
        ctx.lineTo(-r * 1.25, 0);
        ctx.lineTo(-r * 1.35, r * 0.25);
        ctx.closePath();
        ctx.fill();

        // Top crest tufts
        ctx.beginPath();
        ctx.ellipse(-r * 0.05, -r * 1.12, r * 0.12, r * 0.24, -0.2, 0, Math.PI * 2);
        ctx.ellipse(r * 0.12, -r * 1.08, r * 0.1, r * 0.2, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Egg-shaped pearlescent white body
        const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.68, '#f1f5f9');
        grad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, r * 0.04, r * 0.96, r * 1.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rosy pink cheeks!
        ctx.fillStyle = 'rgba(251, 113, 133, 0.48)';
        ctx.beginPath();
        ctx.arc(-r * 0.06, r * 0.22, r * 0.22, 0, Math.PI * 2);
        ctx.fill();

        this._drawExpressiveBirdEyesAndBeak(ctx, r, '#1e293b', time, flags, 1.05);
    }

    _drawExpressiveBirdEyesAndBeak(ctx, r, browColor, time, flags, browScale = 1) {
        const blink = !flags.inFlight && !flags.strained && (Math.sin(time * 2.3) > 0.97);

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1.6;
        if (blink) {
            ctx.beginPath();
            ctx.moveTo(r * 0.05, -r * 0.12);
            ctx.lineTo(r * 0.72, -r * 0.12);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(r * 0.2, -r * 0.14, r * 0.24, 0, Math.PI * 2);
            ctx.arc(r * 0.56, -r * 0.14, r * 0.22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Pupils
            ctx.fillStyle = '#09090b';
            const pupilR = flags.hurt ? r * 0.06 : r * 0.095;
            ctx.beginPath();
            ctx.arc(r * 0.27, -r * 0.13, pupilR, 0, Math.PI * 2);
            ctx.arc(r * 0.61, -r * 0.13, pupilR, 0, Math.PI * 2);
            ctx.fill();

            // Tiny white eye glint
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(r * 0.24, -r * 0.18, r * 0.04, 0, Math.PI * 2);
            ctx.arc(r * 0.58, -r * 0.18, r * 0.04, 0, Math.PI * 2);
            ctx.fill();
        }

        // Iconic fierce V-Eyebrows
        ctx.fillStyle = browColor;
        ctx.beginPath();
        ctx.moveTo(-r * 0.06, -r * 0.42 * browScale);
        ctx.lineTo(r * 0.4, -r * 0.2);
        ctx.lineTo(r * 0.82, -r * 0.44 * browScale);
        ctx.lineTo(r * 0.76, -r * 0.56 * browScale);
        ctx.lineTo(r * 0.4, -r * 0.34);
        ctx.lineTo(0, -r * 0.55 * browScale);
        ctx.closePath();
        ctx.fill();

        // Upper & Lower Curved Beak (opens in battle cry during flight!)
        const mouthOpen = flags.inFlight && !flags.hurt;
        if (mouthOpen) {
            // Open mouth interior
            ctx.fillStyle = '#7f1d1d';
            ctx.beginPath();
            ctx.moveTo(r * 0.34, r * 0.04);
            ctx.lineTo(r * 0.95, r * 0.08);
            ctx.lineTo(r * 0.82, r * 0.38);
            ctx.lineTo(r * 0.34, r * 0.28);
            ctx.closePath();
            ctx.fill();
        }

        // Upper mandible
        const beakGrad = ctx.createLinearGradient(r * 0.3, -r * 0.05, r * 1.15, r * 0.2);
        beakGrad.addColorStop(0, '#facc15');
        beakGrad.addColorStop(1, '#ea580c');
        ctx.fillStyle = beakGrad;
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(r * 0.32, -r * 0.02);
        ctx.quadraticCurveTo(r * 0.85, -r * 0.06, r * 1.18, mouthOpen ? r * 0.04 : r * 0.14);
        ctx.lineTo(r * 0.32, r * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Lower mandible
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(r * 0.34, r * 0.18);
        ctx.lineTo(r * 1.02, mouthOpen ? r * 0.42 : r * 0.2);
        ctx.lineTo(r * 0.38, mouthOpen ? r * 0.4 : r * 0.34);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    drawEggBomb(ctx, body) {
        const { x, y } = body.position;
        const r = body.customData.radius;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(body.angle);
        const grad = ctx.createRadialGradient(-4, -5, 2, 0, 0, r * 1.2);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.7, '#fef3c7');
        grad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.82, r * 1.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // =========================================================================
    // 4 ICONIC PIG TYPES (DYNAMIC EYE TRACKING, TERROR GASP, BRUISES, CROWNS)
    // =========================================================================
    drawPig(ctx, pigBody, threatPos, isThreatFast, time) {
        const { x, y } = pigBody.position;
        const pData = pigBody.customData;
        const r = pData.radius;
        const hpRatio = Math.max(0, pData.hp / pData.maxHp);

        // Determine pig emotion
        let distToThreat = Infinity;
        let lookX = -2;
        let lookY = 0;
        if (threatPos) {
            const dx = threatPos.x - x;
            const dy = threatPos.y - y;
            distToThreat = Math.hypot(dx, dy) || 1;
            lookX = (dx / distToThreat) * (r * 0.1);
            lookY = (dy / distToThreat) * (r * 0.1);
        }
        const terrified = isThreatFast && distToThreat < 280;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(pigBody.angle);

        if (terrified) {
            // Trembling terror shake
            ctx.translate(Math.sin(time * 50) * 1.5, Math.cos(time * 45) * 1.0);

            // Cartoon sweat drop popping over head
            ctx.save();
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.2;
            const dropY = -r * 0.95 - Math.abs(Math.sin(time * 8)) * 4;
            ctx.beginPath();
            ctx.moveTo(r * 0.65, dropY - 8);
            ctx.quadraticCurveTo(r * 0.78, dropY, r * 0.65, dropY + 4);
            ctx.quadraticCurveTo(r * 0.52, dropY, r * 0.65, dropY - 8);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Round Pig Ears (wiggle slightly)
        const earWiggle = Math.sin(time * 3.5 + pData.seed) * 0.08;
        [-1, 1].forEach(dir => {
            ctx.save();
            ctx.translate(dir * r * 0.66, -r * 0.72);
            ctx.rotate(dir * (0.35 + earWiggle));
            ctx.fillStyle = '#65a30d';
            ctx.strokeStyle = '#1a2e05';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.24, r * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#365314';
            ctx.beginPath();
            ctx.ellipse(0, 2, r * 0.12, r * 0.16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Main Green Pig Sphere (3D Volumetric Shading)
        const pigGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.32, r * 0.12, 0, 0, r * 1.05);
        pigGrad.addColorStop(0, '#bef264');
        pigGrad.addColorStop(0.55, '#65a30d');
        pigGrad.addColorStop(1, '#365314');
        ctx.fillStyle = pigGrad;
        ctx.strokeStyle = '#1a2e05';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Bruise / Swollen Black Eye when damaged!
        if (hpRatio < 0.7) {
            ctx.fillStyle = 'rgba(88, 28, 135, 0.55)';
            ctx.beginPath();
            ctx.arc(-r * 0.44, -r * 0.2, r * 0.32, 0, Math.PI * 2);
            ctx.fill();
        }
        if (hpRatio < 0.42) {
            // Plaster Bandage X on forehead!
            ctx.save();
            ctx.translate(r * 0.35, -r * 0.56);
            ctx.rotate(0.35);
            ctx.fillStyle = '#fef3c7';
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 1.2;
            ctx.fillRect(-9, -3, 18, 6);
            ctx.strokeRect(-9, -3, 18, 6);
            ctx.fillRect(-3, -9, 6, 18);
            ctx.strokeRect(-3, -9, 6, 18);
            ctx.restore();
        }

        // Mouth (Terrified gasp vs Cheeky toothy grin)
        if (terrified) {
            ctx.fillStyle = '#450a0a';
            ctx.strokeStyle = '#1a2e05';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, r * 0.56, r * 0.26, r * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillStyle = '#14532d';
            ctx.beginPath();
            ctx.arc(0, r * 0.38, r * 0.34, 0.12 * Math.PI, 0.88 * Math.PI);
            ctx.fill();
            // Goofy white pig teeth!
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-r * 0.18, r * 0.46, r * 0.14, r * 0.13);
            ctx.fillRect(r * 0.05, r * 0.46, r * 0.14, r * 0.11);
        }

        // Foreman Ginger Mustache (drawn above mouth, under snout)
        if (pData.pigType === 'foreman') {
            ctx.fillStyle = '#c2410c';
            ctx.strokeStyle = '#431407';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, r * 0.18);
            ctx.bezierCurveTo(-r * 0.75, r * 0.1, -r * 0.85, r * 0.65, -r * 0.48, r * 0.72);
            ctx.bezierCurveTo(-r * 0.3, r * 0.42, r * 0.3, r * 0.42, r * 0.48, r * 0.72);
            ctx.bezierCurveTo(r * 0.85, r * 0.65, r * 0.75, r * 0.1, 0, r * 0.18);
            ctx.fill();
            ctx.stroke();
        }

        // Iconic Protruding Oval Snout
        const snoutScale = 1 + Math.sin(time * 4 + pData.seed) * 0.03;
        ctx.fillStyle = '#a3e635';
        ctx.strokeStyle = '#365314';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, r * 0.08, r * 0.46 * snoutScale, r * 0.33 * snoutScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Nostrils (unequal size like classic Angry Birds!)
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.ellipse(-r * 0.17, r * 0.08, r * 0.11, r * 0.15, -0.1, 0, Math.PI * 2);
        ctx.ellipse(r * 0.17, r * 0.09, r * 0.085, r * 0.12, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Wide Expressive Eyes
        const blink = !terrified && Math.sin(time * 2.1 + pData.seed) > 0.975;
        [-1, 1].forEach(dir => {
            const ex = dir * r * 0.46;
            const ey = -r * 0.22;
            const eyeR = terrified ? r * 0.29 : r * 0.24;

            if (blink) {
                ctx.strokeStyle = '#1a2e05';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(ex - eyeR, ey);
                ctx.lineTo(ex + eyeR, ey);
                ctx.stroke();
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#1a2e05';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Pupil
                ctx.fillStyle = '#09090b';
                const pRadius = terrified ? r * 0.065 : r * 0.1;
                ctx.beginPath();
                ctx.arc(ex + lookX, ey + lookY, pRadius, 0, Math.PI * 2);
                ctx.fill();

                // Half-closed bruised lid if hurt on left eye
                if (hpRatio < 0.65 && dir === -1 && !terrified) {
                    ctx.fillStyle = '#65a30d';
                    ctx.beginPath();
                    ctx.arc(ex, ey, eyeR, Math.PI, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
            }
        });

        // Corporal Pig Combat Helmet!
        if (pData.pigType === 'helmet' && pData.hasHelmet) {
            const helmGrad = ctx.createLinearGradient(0, -r * 1.25, 0, -r * 0.25);
            helmGrad.addColorStop(0, '#94a3b8');
            helmGrad.addColorStop(0.6, '#475569');
            helmGrad.addColorStop(1, '#1e293b');
            ctx.fillStyle = helmGrad;
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, -r * 0.18, r * 1.06, Math.PI * 1.06, Math.PI * 1.94);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Helmet brim
            ctx.beginPath();
            ctx.moveTo(-r * 1.18, -r * 0.34);
            ctx.quadraticCurveTo(0, -r * 0.5, r * 1.18, -r * 0.34);
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        // KING PIG JEWELED GOLDEN CROWN!
        if (pData.pigType === 'king') {
            const crownGrad = ctx.createLinearGradient(-r * 0.7, -r * 1.5, r * 0.7, -r * 0.85);
            crownGrad.addColorStop(0, '#fef08a');
            crownGrad.addColorStop(0.5, '#facc15');
            crownGrad.addColorStop(1, '#ca8a04');
            ctx.fillStyle = crownGrad;
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(-r * 0.58, -r * 0.84);
            ctx.lineTo(-r * 0.72, -r * 1.42);
            ctx.lineTo(-r * 0.28, -r * 1.12);
            ctx.lineTo(0, -r * 1.56);
            ctx.lineTo(r * 0.28, -r * 1.12);
            ctx.lineTo(r * 0.72, -r * 1.42);
            ctx.lineTo(r * 0.58, -r * 0.84);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Rubies & Emeralds on Crown
            ctx.fillStyle = '#e11d48';
            ctx.beginPath();
            ctx.arc(0, -r * 1.08, 4.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(-r * 0.36, -r * 1.02, 3.2, 0, Math.PI * 2);
            ctx.arc(r * 0.36, -r * 1.02, 3.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Sweat drops when terrified!
        if (terrified) {
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(r * 0.92, -r * 0.55, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Boss HP bar above King Pig if damaged
        if (pData.pigType === 'king' && hpRatio < 0.99) {
            ctx.save();
            const bw = 64;
            const bh = 7;
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(x - bw / 2 - 1, y - r * 1.75 - 1, bw + 2, bh + 2);
            ctx.fillStyle = hpRatio > 0.4 ? '#eab308' : '#ef4444';
            ctx.fillRect(x - bw / 2, y - r * 1.75, bw * hpRatio, bh);
            ctx.restore();
        }
    }

    // =========================================================================
    // TEXTURED BLOCKS, ROOFS, BOULDERS, TNT, CHAINS & BOUNCY PADS
    // =========================================================================
    _getMaterialStyle(ctx, material) {
        if (material === 'wood') {
            return {
                fill: this.patterns.tex_wood || '#d99b52',
                border: '#5c2d0c',
                highlight: 'rgba(255, 237, 213, 0.35)',
                alpha: 1.0
            };
        } else if (material === 'glass') {
            return {
                fill: this.patterns.tex_ice || 'rgba(125, 211, 252, 0.8)',
                border: '#0284c7',
                highlight: 'rgba(255, 255, 255, 0.55)',
                alpha: 0.86
            };
        } else {
            return {
                fill: this.patterns.tex_stone || '#94a3b8',
                border: '#334155',
                highlight: 'rgba(241, 245, 249, 0.25)',
                alpha: 1.0
            };
        }
    }

    drawBlock(ctx, body) {
        const { x, y } = body.position;
        const d = body.customData;
        const style = this._getMaterialStyle(ctx, d.material);
        const hpRatio = d.maxHp ? (d.hp / d.maxHp) : 1;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(body.angle);
        ctx.globalAlpha = style.alpha;

        if (d.shape === 'roof') {
            ctx.restore(); // Draw roof directly from world-space Matter.js vertices for 100% 1:1 collider alignment!
            ctx.save();
            ctx.globalAlpha = style.alpha;
            ctx.fillStyle = style.fill;
            ctx.strokeStyle = style.border;
            ctx.lineWidth = 2.6;
            ctx.lineJoin = 'round';
            const verts = body.vertices;
            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            for (let v = 1; v < verts.length; v++) {
                ctx.lineTo(verts[v].x, verts[v].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            if (hpRatio < 0.75) {
                ctx.strokeStyle = 'rgba(20, 10, 5, 0.72)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(x, y - 6);
                ctx.lineTo(x + 12, y + 6);
                ctx.moveTo(x, y - 6);
                ctx.lineTo(x - 10, y + 8);
                ctx.stroke();
            }
            ctx.restore();
            return;
        } else if (d.shape === 'boulder') {
            const r = d.radius;
            ctx.fillStyle = style.fill;
            ctx.strokeStyle = style.border;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Spherical 3D rim shading
            const shade = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
            shade.addColorStop(0, 'rgba(255,255,255,0.28)');
            shade.addColorStop(0.65, 'rgba(0,0,0,0)');
            shade.addColorStop(1, 'rgba(0,0,0,0.38)');
            ctx.fillStyle = shade;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Rectangular plank / slab / pillar
            const hw = d.width / 2;
            const hh = d.height / 2;
            ctx.fillStyle = style.fill;
            ctx.fillRect(-hw, -hh, d.width, d.height);

            // Inner top-left specular bevel highlight
            ctx.fillStyle = style.highlight;
            ctx.fillRect(-hw + 2, -hh + 2, d.width - 4, Math.min(5, d.height * 0.28));

            // Inner bottom-right shadow bevel
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(-hw + 2, hh - Math.min(5, d.height * 0.25), d.width - 4, Math.min(4, d.height * 0.25));

            // Crisp cartoon border
            ctx.strokeStyle = style.border;
            ctx.lineWidth = 2.4;
            ctx.strokeRect(-hw, -hh, d.width, d.height);

            // End nails on wooden beams
            if (d.material === 'wood' && Math.max(d.width, d.height) > 55 && !body.isStatic) {
                ctx.fillStyle = '#3b1d0a';
                if (d.width > d.height) {
                    ctx.beginPath();
                    ctx.arc(-hw + 8, 0, 2.2, 0, Math.PI * 2);
                    ctx.arc(hw - 8, 0, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(0, -hh + 8, 2.2, 0, Math.PI * 2);
                    ctx.arc(0, hh - 8, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Progressive 3-stage Fracture Cracks!
            if (hpRatio < 0.78 && !body.isStatic) {
                ctx.strokeStyle = d.material === 'glass' ? 'rgba(255,255,255,0.9)' : 'rgba(20, 10, 5, 0.72)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(-hw * 0.35, -hh * 0.45);
                ctx.lineTo(-hw * 0.05, 0);
                ctx.lineTo(hw * 0.28, hh * 0.38);
                if (hpRatio < 0.45) {
                    ctx.moveTo(-hw * 0.05, 0);
                    ctx.lineTo(hw * 0.38, -hh * 0.35);
                    ctx.moveTo(-hw * 0.05, 0);
                    ctx.lineTo(-hw * 0.38, hh * 0.42);
                }
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    drawTNT(ctx, body) {
        const { x, y } = body.position;
        const s = body.customData.size;
        const hs = s / 2;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(body.angle);

        if (this.images.tex_tnt) {
            ctx.drawImage(this.images.tex_tnt, -hs, -hs, s, s);
            ctx.strokeStyle = '#3b0707';
            ctx.lineWidth = 2.2;
            ctx.strokeRect(-hs, -hs, s, s);
        } else {
            ctx.fillStyle = '#dc2626';
            ctx.strokeStyle = '#450a0a';
            ctx.lineWidth = 2.6;
            ctx.fillRect(-hs, -hs, s, s);
            ctx.strokeRect(-hs, -hs, s, s);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(-hs + 3, -7, s - 6, 14);
            ctx.fillStyle = '#111827';
            ctx.font = '900 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('TNT', 0, 0);
        }
        ctx.restore();
    }

    drawPendulumAndChains(ctx, constraints) {
        constraints.forEach(c => {
            const pA = c.pointA;
            const bodyB = c.bodyB;
            if (!bodyB) return;
            const pB = {
                x: bodyB.position.x + (c.pointB ? c.pointB.x : 0),
                y: bodyB.position.y + (c.pointB ? c.pointB.y : 0)
            };

            // Draw iron chain links
            const dx = pB.x - pA.x;
            const dy = pB.y - pA.y;
            const dist = Math.hypot(dx, dy);
            const steps = Math.max(3, Math.floor(dist / 13));

            ctx.save();
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const lx = pA.x + dx * t;
                const ly = pA.y + dy * t;
                ctx.fillStyle = i % 2 === 0 ? '#64748b' : '#334155';
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(lx, ly, 4.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        });
    }

    drawWreckingBall(ctx, body) {
        const { x, y } = body.position;
        const r = body.customData.radius;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(body.angle);

        const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        grad.addColorStop(0, '#94a3b8');
        grad.addColorStop(0.5, '#334155');
        grad.addColorStop(1, '#09090b');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Steel rivets
        ctx.fillStyle = '#cbd5e1';
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
            ctx.beginPath();
            ctx.arc(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65, 2.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawBouncyPad(ctx, body, time) {
        const { x, y } = body.position;
        const { width, height, bounceAnim } = body.customData;
        const scaleY = bounceAnim && (time - bounceAnim < 0.28)
            ? 1 + Math.sin((time - bounceAnim) * 35) * 0.28
            : 1;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(body.angle);
        ctx.scale(1, scaleY);

        // Metallic spring base
        ctx.fillStyle = '#475569';
        ctx.fillRect(-width * 0.35, 0, width * 0.7, height * 0.5);

        // Striped rubber cushion cap
        const grad = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, -height / 2);
        grad.addColorStop(0, '#ec4899');
        grad.addColorStop(0.5, '#f43f5e');
        grad.addColorStop(1, '#e11d48');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#881337';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-width / 2, -height / 2, width, height * 0.72, 10);
        ctx.fill();
        ctx.stroke();

        // Upward chevron arrows
        ctx.fillStyle = '#fef08a';
        [-width * 0.24, 0, width * 0.24].forEach(ox => {
            ctx.beginPath();
            ctx.moveTo(ox, -height * 0.34);
            ctx.lineTo(ox + 7, -height * 0.05);
            ctx.lineTo(ox - 7, -height * 0.05);
            ctx.closePath();
            ctx.fill();
        });

        ctx.restore();
    }
}

window.spriteRenderer = new SpriteRenderer();
