(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.DragonSweeperAudio = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    class DragonSweeperAudio {
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

        playReveal() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(480, now + 0.045);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.07);
        }

        playMark() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.exponentialRampToValueAtTime(840, now + 0.04);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.06);
        }

        playSlash(lv) {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            const f0 = 360 + (lv || 1) * 45;
            osc.frequency.setValueAtTime(f0, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.12);
        }

        playHurt() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(175, now);
            osc.frequency.exponentialRampToValueAtTime(55, now + 0.20);
            gain.gain.setValueAtTime(0.30, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.23);
        }

        playItem() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            [659.25, 880, 1174.66].forEach((freq, i) => {
                const t = now + i * 0.045;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.16, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
                osc.connect(gain);
                gain.connect(this.master);
                osc.start(t);
                osc.stop(t + 0.18);
            });
        }

        playScroll() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(1240, now + 0.18);
            gain.gain.setValueAtTime(0.20, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.24);
        }

        playLevelUp() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
                const t = now + i * 0.06;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.22, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
                osc.connect(gain);
                gain.connect(this.master);
                osc.start(t);
                osc.stop(t + 0.28);
            });
        }

        playWin() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
                const t = now + i * 0.07;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.24, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                osc.connect(gain);
                gain.connect(this.master);
                osc.start(t);
                osc.stop(t + 0.37);
            });
        }

        playLose() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            [293.66, 261.63, 220, 164.81].forEach((freq, i) => {
                const t = now + i * 0.09;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.18, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                osc.connect(gain);
                gain.connect(this.master);
                osc.start(t);
                osc.stop(t + 0.24);
            });
        }
    }

    return DragonSweeperAudio;
});
