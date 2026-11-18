(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SokobanAudio = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    class SokobanAudio {
        constructor() {
            this.ctx = null;
            this.master = null;
            this.limiter = null;
            this.muted = false;
        }

        init() {
            if (this.ctx) return;
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.muted ? 0 : 0.42;

            this.limiter = this.ctx.createDynamicsCompressor();
            this.limiter.threshold.value = -12;
            this.limiter.knee.value = 14;
            this.limiter.ratio.value = 10;
            this.limiter.attack.value = 0.004;
            this.limiter.release.value = 0.14;

            this.master.connect(this.limiter);
            this.limiter.connect(this.ctx.destination);
        }

        setMuted(muted) {
            this.muted = !!muted;
            if (this.master && this.ctx) {
                this.master.gain.setTargetAtTime(this.muted ? 0 : 0.42, this.ctx.currentTime, 0.02);
            }
        }

        _tone(freq, dur, type = 'triangle', gainVal = 0.22, delay = 0) {
            this.init();
            if (!this.ctx || !this.master || this.muted) return;
            if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
            const t = this.ctx.currentTime + delay;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(gainVal, t + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            osc.connect(g);
            g.connect(this.master);
            osc.start(t);
            osc.stop(t + dur + 0.02);
        }

        playStep() {
            this._tone(160, 0.055, 'triangle', 0.12);
        }

        playPush(onGoal) {
            this._tone(110, 0.1, 'square', 0.14);
            if (onGoal) {
                this._tone(587.3, 0.14, 'triangle', 0.26, 0.03);
                this._tone(880, 0.18, 'sine', 0.2, 0.08);
            }
        }

        playUndo() {
            this._tone(340, 0.07, 'sine', 0.15);
            this._tone(250, 0.08, 'sine', 0.12, 0.05);
        }

        playWin() {
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
                this._tone(f, 0.22, 'triangle', 0.24, i * 0.08);
            });
        }
    }

    return SokobanAudio;
});

