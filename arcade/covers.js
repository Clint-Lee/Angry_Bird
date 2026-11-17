// Procedural 16:9 Canvas Cover Artwork for Arcade Lobby
// Keeps card visuals cohesive, crisp at retina DPR, and faithful to each game's actual scene.
(function (root) {
    'use strict';

    const W = 400;
    const H = 225;

    function roundPath(ctx, x, y, w, h, r) {
        const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
        ctx.beginPath();
        ctx.moveTo(x + tl, y);
        ctx.lineTo(x + w - tr, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
        ctx.lineTo(x + w, y + h - br);
        ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
        ctx.lineTo(x + bl, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
        ctx.lineTo(x, y + tl);
        ctx.quadraticCurveTo(x, y, x + tl, y);
        ctx.closePath();
    }

    function drawAngryBirds(ctx) {
        // Sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#59b5f7');
        sky.addColorStop(0.7, '#bde6fe');
        sky.addColorStop(1, '#eaf7dc');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        // Soft cloud shapes
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        for (const [cx, cy, r] of [[75, 48, 22], [96, 44, 26], [118, 50, 18], [260, 42, 20], [282, 38, 24], [302, 44, 16]]) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Far green hills
        ctx.fillStyle = '#5eb857';
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.quadraticCurveTo(100, 130, 210, 168);
        ctx.quadraticCurveTo(320, 136, W, 165);
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();

        // Foreground turf
        ctx.fillStyle = '#3f9638';
        ctx.fillRect(0, 184, W, 41);
        ctx.fillStyle = '#4e331f';
        ctx.fillRect(0, 194, W, 31);

        // Wooden Slingshot (left)
        ctx.fillStyle = '#6f4222';
        roundPath(ctx, 72, 132, 12, 56, 4);
        ctx.fill();
        ctx.strokeStyle = '#6f4222';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(78, 140); ctx.lineTo(66, 114);
        ctx.moveTo(78, 140); ctx.lineTo(90, 112);
        ctx.stroke();

        // Trajectory dots
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        for (const [tx, ty, r] of [[104, 102, 2.5], [122, 92, 3], [142, 86, 3.2], [164, 83, 3.5], [186, 85, 3]]) {
            ctx.beginPath();
            ctx.arc(tx, ty, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Flying Red Bird
        ctx.save();
        ctx.translate(208, 92);
        ctx.rotate(-0.18);
        ctx.fillStyle = '#d92b2b';
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f5d7c4';
        ctx.beginPath();
        ctx.ellipse(3, 6, 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes + brow
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(4, -3, 4.2, 0, Math.PI * 2);
        ctx.arc(11, -3, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(5.2, -3, 1.8, 0, Math.PI * 2);
        ctx.arc(11.8, -3, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(0, -8); ctx.lineTo(8, -5.5); ctx.lineTo(15, -8.5);
        ctx.stroke();
        // Beak
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(14, -1); ctx.lineTo(23, 2); ctx.lineTo(14, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Right Fortress Tower (Wood & Stone & Glass)
        const baseX = 310;
        // Stone left/right lower pillars
        ctx.fillStyle = '#7c8594';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.fillRect(baseX - 38, 134, 14, 52); ctx.strokeRect(baseX - 38, 134, 14, 52);
        ctx.fillRect(baseX + 24, 134, 14, 52); ctx.strokeRect(baseX + 24, 134, 14, 52);
        // Wooden crossbeam
        ctx.fillStyle = '#b46f35';
        ctx.fillRect(baseX - 44, 122, 88, 12);
        ctx.strokeStyle = '#713f18';
        ctx.strokeRect(baseX - 44, 122, 88, 12);
        // Glass upper pillars
        ctx.fillStyle = 'rgba(125, 211, 252, 0.72)';
        ctx.fillRect(baseX - 28, 82, 11, 40);
        ctx.fillRect(baseX + 17, 82, 11, 40);
        // Upper wooden roof slab
        ctx.fillStyle = '#b46f35';
        ctx.fillRect(baseX - 34, 72, 68, 10);

        // Two Green Pigs
        for (const [px, py, pr] of [[baseX, 168, 14], [baseX, 109, 11]]) {
            ctx.fillStyle = '#65c938';
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#9be36b';
            ctx.beginPath();
            ctx.ellipse(px, py + 2, pr * 0.45, pr * 0.34, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#14532d';
            ctx.beginPath();
            ctx.arc(px - pr * 0.45, py - 2, 1.8, 0, Math.PI * 2);
            ctx.arc(px + pr * 0.45, py - 2, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawShadedFruit(ctx, x, y, r, topCol, botCol) {
        const g = ctx.createRadialGradient(x - r * 0.32, y - r * 0.35, r * 0.1, x, y, r);
        g.addColorStop(0, topCol);
        g.addColorStop(1, botCol);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.34)';
        ctx.beginPath();
        ctx.ellipse(x - r * 0.32, y - r * 0.34, r * 0.28, r * 0.14, -0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawFruitMerge(ctx) {
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#fdf2e3');
        bg.addColorStop(1, '#f4d9b8');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Soft counter shelf
        ctx.fillStyle = '#b47746';
        ctx.fillRect(0, 192, W, 33);

        // Glass Jar Walls
        ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
        ctx.strokeStyle = 'rgba(180, 130, 86, 0.42)';
        ctx.lineWidth = 4;
        roundPath(ctx, 102, 22, 196, 172, [6, 6, 18, 18]);
        ctx.fill();
        ctx.stroke();

        // Danger dashed line
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = 'rgba(225, 29, 72, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(106, 52); ctx.lineTo(294, 52);
        ctx.stroke();
        ctx.setLineDash([]);

        // Watermelon (main large fruit bottom-right)
        drawShadedFruit(ctx, 228, 140, 48, '#4ade80', '#15803d');
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 4.5;
        for (const ox of [-20, 0, 20]) {
            ctx.beginPath();
            ctx.moveTo(228 + ox * 0.65, 96);
            ctx.quadraticCurveTo(228 + ox, 140, 228 + ox * 0.6, 184);
            ctx.stroke();
        }
        // Cute calm expression on watermelon
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(216, 138, 2.5, 0, Math.PI * 2);
        ctx.arc(240, 138, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Cantaloupe / Peach / Orange / Strawberry / Grape stack
        drawShadedFruit(ctx, 152, 152, 34, '#fb923c', '#c2410c');
        drawShadedFruit(ctx, 166, 98, 24, '#fda4af', '#e11d48');
        drawShadedFruit(ctx, 214, 72, 19, '#fde047', '#ca8a04');
        drawShadedFruit(ctx, 128, 108, 16, '#c084fc', '#7e22ce');
        drawShadedFruit(ctx, 266, 92, 14, '#f87171', '#b91c1c');
    }

    function drawCutRope(ctx) {
        // Cozy Cardboard Box Interior
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#725238');
        bg.addColorStop(1, '#4a3220');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Subtle cardboard fold lines
        ctx.strokeStyle = 'rgba(255, 224, 184, 0.14)';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 14, W - 40, H - 28);

        // Anchor pins
        for (const [ax, ay] of [[126, 26], [274, 26]]) {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(ax, ay, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(ax, ay, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Tensioned Ropes
        ctx.strokeStyle = '#d99b52';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(126, 26); ctx.quadraticCurveTo(156, 72, 196, 98);
        ctx.moveTo(274, 26); ctx.quadraticCurveTo(240, 70, 196, 98);
        ctx.stroke();

        // Scissors / Slice shimmer across left rope
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(128, 72); ctx.lineTo(176, 52);
        ctx.stroke();

        // Translucent floating bubble behind candy
        ctx.fillStyle = 'rgba(186, 230, 253, 0.25)';
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.72)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(196, 98, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Swirled Red/Cream Candy
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(196, 98, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(196, 98, 9, 0.2, Math.PI * 1.45);
        ctx.stroke();

        // Golden Star waiting below-right
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const ang = (i * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? 15 : 6.5;
            const sx = 248 + Math.cos(ang) * r;
            const sy = 148 + Math.sin(ang) * r;
            if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();

        // Green Hungry Monster at bottom-center
        ctx.fillStyle = '#22c55e';
        roundPath(ctx, 166, 152, 60, 52, [24, 24, 14, 14]);
        ctx.fill();
        // Big eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(184, 168, 7, 0, Math.PI * 2);
        ctx.arc(208, 168, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(185, 166, 3, 0, Math.PI * 2);
        ctx.arc(209, 166, 3, 0, Math.PI * 2);
        ctx.fill();
        // Open mouth
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.ellipse(196, 187, 15, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(189, 179, 5, 4);
        ctx.fillRect(198, 179, 5, 4);
    }

    function drawAdventureTycoon(ctx) {
        // Warm Tavern / Guild Shop Interior
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#2b203a');
        bg.addColorStop(1, '#191324');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Warm arched window light
        const glow = ctx.createRadialGradient(200, 95, 10, 200, 95, 175);
        glow.addColorStop(0, 'rgba(251, 191, 36, 0.24)');
        glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        // Wooden display shelf (mid-back)
        ctx.fillStyle = '#5c3c24';
        ctx.fillRect(72, 102, 256, 12);

        // Potion Bottle 1 (Ruby HP)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(118, 86, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(113, 62, 10, 10);

        // Potion Bottle 2 (Cyan Mana)
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(172, 86, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(167, 63, 10, 9);

        // Forged Steel Broadsword on rack
        ctx.save();
        ctx.translate(256, 76);
        ctx.rotate(0.55);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-4, -30, 8, 44);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-13, 12, 26, 6);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-3, 18, 6, 14);
        ctx.restore();

        // Foreground Timber Shop Counter
        ctx.fillStyle = '#784e2e';
        ctx.fillRect(36, 148, 328, 77);
        ctx.fillStyle = '#92613b';
        ctx.fillRect(28, 140, 344, 14);

        // Gold Coins Stacks & Bag
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(298, 128, 20, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d97706';
        roundPath(ctx, 290, 107, 16, 10, 3);
        ctx.fill();

        for (const [cx, cy] of [[126, 134], [148, 134], [137, 126], [174, 134]]) {
            ctx.fillStyle = '#facc15';
            ctx.strokeStyle = '#ca8a04';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 11, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    function drawIsoBlock(ctx, cx, cy, hw, h, topCol, leftCol, rightCol) {
        const dy = hw * 0.54;
        // Left face
        ctx.fillStyle = leftCol;
        ctx.beginPath();
        ctx.moveTo(cx - hw, cy); ctx.lineTo(cx, cy + dy);
        ctx.lineTo(cx, cy + dy + h); ctx.lineTo(cx - hw, cy + h);
        ctx.closePath();
        ctx.fill();
        // Right face
        ctx.fillStyle = rightCol;
        ctx.beginPath();
        ctx.moveTo(cx, cy + dy); ctx.lineTo(cx + hw, cy);
        ctx.lineTo(cx + hw, cy + h); ctx.lineTo(cx, cy + dy + h);
        ctx.closePath();
        ctx.fill();
        // Top face
        ctx.fillStyle = topCol;
        ctx.beginPath();
        ctx.moveTo(cx, cy - dy); ctx.lineTo(cx + hw, cy);
        ctx.lineTo(cx, cy + dy); ctx.lineTo(cx - hw, cy);
        ctx.closePath();
        ctx.fill();
    }

    function drawJumpJump(ctx) {
        // Minimalist Sage Studio Gradient
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#dae8da');
        bg.addColorStop(1, '#edf3ec');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Ground shadow ellipses
        ctx.fillStyle = 'rgba(20, 30, 45, 0.13)';
        ctx.beginPath();
        ctx.ellipse(122, 178, 42, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(274, 134, 42, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Far destination cube (24h store feel)
        drawIsoBlock(ctx, 278, 102, 42, 34, '#ffffff', '#cfd9e3', '#b3c0cf');
        // Red/white stripe awning detail on right face
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#ffffff';
            const x0 = 278 + i * 10;
            const y0 = 123 - i * 5.2;
            ctx.fillRect(x0, y0, 8, 7);
        }

        // Near pedestal cube
        drawIsoBlock(ctx, 132, 146, 44, 36, '#ecd7bc', '#cfa880', '#b48a62');

        // Parabolic Dotted Trajectory
        ctx.fillStyle = 'rgba(34, 38, 56, 0.34)';
        for (const [px, py] of [[156, 104], [176, 82], [202, 68], [228, 69], [252, 82]]) {
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Iconic Dark "i" Chess Pawn Piece on left cube
        ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
        ctx.beginPath();
        ctx.ellipse(132, 144, 12, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#25293a';
        ctx.beginPath();
        ctx.moveTo(122, 144);
        ctx.quadraticCurveTo(124, 130, 128, 120);
        ctx.lineTo(136, 120);
        ctx.quadraticCurveTo(140, 130, 142, 144);
        ctx.closePath();
        ctx.fill();

        const hg = ctx.createRadialGradient(130, 107, 1, 132, 110, 9);
        hg.addColorStop(0, '#646d8f');
        hg.addColorStop(1, '#1e2230');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(132, 110, 8.5, 0, Math.PI * 2);
        ctx.fill();
    }

    const PAINTERS = {
        'angry-birds': drawAngryBirds,
        'fruit-merge': drawFruitMerge,
        'cut-rope': drawCutRope,
        'adventure-tycoon': drawAdventureTycoon,
        'jump-jump': drawJumpJump
    };

    function renderAllCovers() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        document.querySelectorAll('canvas[data-cover]').forEach((cvs) => {
            const key = cvs.getAttribute('data-cover');
            const paint = PAINTERS[key];
            if (!paint) return;
            cvs.width = W * dpr;
            cvs.height = H * dpr;
            const ctx = cvs.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            paint(ctx);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderAllCovers);
    } else {
        renderAllCovers();
    }
    root.renderArcadeCovers = renderAllCovers;
})(window);
