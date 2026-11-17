(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.JumpJumpAudio = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const PIANO_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 987.77, 1046.5, 1174.66];

    class JumpJumpAudio {
        constructor() {
            this.ctx = null;
            this.master = null;
            this.limiter = null;
            this.muted = false;
            this.chargeOsc = null;
            this.chargeGain = null;
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

        startCharge() {
            const ctx = this.init();
            if (!ctx || this.muted || this.chargeOsc) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(190, now);
            osc.frequency.linearRampToValueAtTime(560, now + 1.4);
            gain.gain.setValueAtTime(0.08, now);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            this.chargeOsc = osc;
            this.chargeGain = gain;
        }

        stopCharge() {
            if (this.chargeOsc && this.ctx) {
                try {
                    const now = this.ctx.currentTime;
                    this.chargeGain.gain.setTargetAtTime(0.0001, now, 0.015);
                    this.chargeOsc.stop(now + 0.05);
                } catch {}
            }
            this.chargeOsc = null;
            this.chargeGain = null;
        }

        playLand(isBullseye, streak) {
            this.stopCharge();
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const freq = isBullseye
                ? PIANO_SCALE[Math.min(PIANO_SCALE.length - 1, Math.max(0, (streak || 1) - 1))]
                : 310;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = isBullseye ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            if (!isBullseye) osc.frequency.exponentialRampToValueAtTime(220, now + 0.07);
            gain.gain.setValueAtTime(isBullseye ? 0.24 : 0.16, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (isBullseye ? 0.25 : 0.09));
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.27);
        }

        playBonus() {
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            [659.25, 880, 1174.66, 1567.98].forEach((f, i) => {
                const t = now + i * 0.05;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, t);
                gain.gain.setValueAtTime(0.20, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                osc.connect(gain);
                gain.connect(this.master);
                osc.start(t);
                osc.stop(t + 0.24);
            });
        }

        playFall() {
            this.stopCharge();
            const ctx = this.init();
            if (!ctx || this.muted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(360, now);
            osc.frequency.exponentialRampToValueAtTime(85, now + 0.32);
            gain.gain.setValueAtTime(0.20, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(now);
            osc.stop(now + 0.35);
        }
    }

    return JumpJumpAudio;
});

