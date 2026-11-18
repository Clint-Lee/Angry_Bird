(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MotaAudio = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    class MotaAudio {
        constructor() {
            this.ctx = null;
            this.master = null;
            this.limiter = null;
            this.muted = false;
        }

        setMuted(val) {
            this.muted = !!val;
            if (this.master && this.ctx) {
                this.master.gain.setTargetAtTime(this.muted ? 0 : 0.4, this.ctx.currentTime, 0.02);
            }
        }

        init() {
            if (this.ctx) return this.ctx;
            const Ctx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
            if (!Ctx) return null;
            const ctx = new Ctx();
            const master = ctx.createGain();
            master.gain.value = this.muted ? 0 : 0.4;

            const limiter = ctx.createDynamicsCompressor();
            limiter.threshold.value = -12;
            limiter.knee.value = 18;
            limiter.ratio.value = 12;
            limiter.attack.value = 0.003;
            limiter.release.value = 0.16;

            master.connect(limiter);
            limiter.connect(ctx.destination);

            this.ctx = ctx;
            this.master = master;
            this.limiter = limiter;
            return ctx;
        }

        tone(freq, dur, type = 'triangle', vol = 0.25, delay = 0, slideTo = null) {
            if (this.muted) return;
            const ctx = this.init();
            if (!ctx || !this.master) return;
            if (ctx.state === 'suspended') ctx.resume().catch(() => {});

            const now = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);

            g.gain.setValueAtTime(0.0001, now);
            g.gain.linearRampToValueAtTime(vol, now + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

            osc.connect(g);
            g.connect(this.master);
            osc.start(now);
            osc.stop(now + dur + 0.02);
        }

        playStep() {
            this.tone(175, 0.04, 'sine', 0.08, 0, 130);
        }

        playGem() {
            this.tone(784, 0.09, 'sine', 0.22);
            this.tone(1175, 0.14, 'triangle', 0.2, 0.06);
        }

        playPotion() {
            this.tone(523, 0.09, 'sine', 0.2);
            this.tone(659, 0.09, 'sine', 0.2, 0.07);
            this.tone(880, 0.14, 'sine', 0.2, 0.14);
        }

        playKey() {
            this.tone(988, 0.07, 'triangle', 0.22);
            this.tone(1319, 0.12, 'sine', 0.2, 0.06);
        }

        playDoor() {
            this.tone(240, 0.12, 'sawtooth', 0.16, 0, 110);
            this.tone(440, 0.12, 'triangle', 0.14, 0.08, 660);
        }

        playHit(isBoss = false) {
            if (isBoss) {
                this.tone(140, 0.18, 'sawtooth', 0.28, 0, 62);
                this.tone(290, 0.14, 'square', 0.18, 0.08, 120);
            } else {
                this.tone(260, 0.08, 'square', 0.16, 0, 120);
                this.tone(360, 0.09, 'triangle', 0.16, 0.04, 180);
            }
        }

        playBuy() {
            this.tone(659, 0.08, 'triangle', 0.22);
            this.tone(880, 0.12, 'triangle', 0.22, 0.07);
        }

        playTeleport() {
            this.tone(440, 0.18, 'sine', 0.2, 0, 880);
        }

        playUndo() {
            this.tone(420, 0.08, 'sine', 0.15, 0, 260);
        }

        playLevelUp() {
            [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
                this.tone(f, 0.16, 'triangle', 0.22, idx * 0.07);
            });
        }

        playVictory() {
            [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, idx) => {
                this.tone(f, 0.22, 'triangle', 0.24, idx * 0.09);
            });
        }
    }

    return MotaAudio;
});

