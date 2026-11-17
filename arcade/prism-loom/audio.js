(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PrismLoomAudio = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

    class PrismLoomAudio {
        constructor() {
            this.ctx = null;
            this.master = null;
            this.limiter = null;
            this.muted = false;
        }

        setMuted(muted) {
            this.muted = !!muted;
            if (this.master && this.ctx) {
                this.master.gain.setTargetAtTime(this.muted ? 0 : 0.42, this.ctx.currentTime, 0.02);
            }
        }

        init() {
            if (this.ctx) {
                if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
                return this.ctx;
            }
            const Ctx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
            if (!Ctx) return null;

            const ctx = new Ctx();
            const master = ctx.createGain();
            master.gain.value = this.muted ? 0 : 0.42;

            const limiter = ctx.createDynamicsCompressor();
            limiter.threshold.value = -10;
            limiter.knee.value = 18;
            limiter.ratio.value = 10;
            limiter.attack.value = 0.004;
            limiter.release.value = 0.16;

            master.connect(limiter);
            limiter.connect(ctx.destination);

            this.ctx = ctx;
            this.master = master;
            this.limiter = limiter;
            return ctx;
        }

        playRotate() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(640, now);
            osc.frequency.exponentialRampToValueAtTime(980, now + 0.055);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.075);
        }

        playCrystalChime(litIndex) {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const freq = PENTA[Math.max(0, litIndex) % PENTA.length];
            const osc = ctx.createOscillator();
            const over = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            over.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            over.frequency.setValueAtTime(freq * 2, now);
            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc.connect(gain);
            over.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            over.start(now);
            osc.stop(now + 0.30);
            over.stop(now + 0.30);
        }

        playHint() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12);
            gain.gain.setValueAtTime(0.16, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.18);
        }

        playUndo() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(340, now + 0.08);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.10);
        }

        playWin() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
                const t = now + idx * 0.075;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.22, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
                osc.connect(gain);
                gain.connect(this.master);
                osc.start(t);
                osc.stop(t + 0.38);
            });
        }
    }

    return PrismLoomAudio;
});
