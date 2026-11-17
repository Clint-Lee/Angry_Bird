(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CandyRopeAudio = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const STAR_NOTES = [587.33, 698.46, 880.0];

    class CandyRopeAudio {
        constructor() {
            this.ctx = null;
            this.master = null;
            this.limiter = null;
            this.muted = false;
        }

        setMuted(m) {
            this.muted = !!m;
            if (this.master && this.ctx) {
                this.master.gain.setTargetAtTime(this.muted ? 0 : 0.45, this.ctx.currentTime, 0.02);
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
            master.gain.value = this.muted ? 0 : 0.45;

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

        playCut() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(920, now);
            osc.frequency.exponentialRampToValueAtTime(340, now + 0.06);
            gain.gain.setValueAtTime(0.20, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.09);
        }

        playPop() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(480, now);
            osc.frequency.exponentialRampToValueAtTime(1180, now + 0.05);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.08);
        }

        playBlow() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.15);
        }

        playStar(count) {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const freq = STAR_NOTES[Math.max(0, (count || 1) - 1) % STAR_NOTES.length];
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.16);
            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.26);
        }

        playChompWin() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
                const t = now + i * 0.07;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.24, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
                osc.connect(gain);
                gain.connect(this.master);
                osc.start(t);
                osc.stop(t + 0.32);
            });
        }

        playFail() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.exponentialRampToValueAtTime(95, now + 0.24);
            gain.gain.setValueAtTime(0.20, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.28);
        }
    }

    return CandyRopeAudio;
});
