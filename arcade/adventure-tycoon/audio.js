(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AdventureTycoonAudio = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    class AdventureTycoonAudio {
        constructor() {
            this.ctx = null;
            this.master = null;
            this.limiter = null;
            this.muted = false;
        }

        setMuted(m) {
            this.muted = !!m;
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

        playCoin() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            [987.77, 1318.51].forEach((freq, i) => {
                const t = now + i * 0.055;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.20, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
                osc.connect(gain);
                gain.connect(this.master);
                osc.start(t);
                osc.stop(t + 0.17);
            });
        }

        playCraft() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(760, now + 0.08);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.11);
        }

        playLoot() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99].forEach((freq, i) => {
                const t = now + i * 0.04;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.16, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
                osc.connect(gain);
                gain.connect(this.master);
                osc.start(t);
                osc.stop(t + 0.15);
            });
        }
    }

    return AdventureTycoonAudio;
});
