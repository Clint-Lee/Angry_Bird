(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.FruitMergeAudio = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

    class FruitMergeAudio {
        constructor() {
            this.ctx = null;
            this.master = null;
            this.limiter = null;
            this.muted = false;
            this._lastBounce = 0;
        }

        setMuted(val) {
            this.muted = !!val;
            if (this.master && this.ctx) {
                this.master.gain.setTargetAtTime(this.muted ? 0 : 0.78, this.ctx.currentTime, 0.02);
            }
        }

        ensure() {
            if (this.muted) return null;
            if (!this.ctx) {
                const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
                if (!AC) return null;
                this.ctx = new AC();
                this.master = this.ctx.createGain();
                this.master.gain.value = this.muted ? 0 : 0.78;
                this.limiter = this.ctx.createDynamicsCompressor();
                this.limiter.threshold.value = -9;
                this.limiter.knee.value = 12;
                this.limiter.ratio.value = 10;
                this.limiter.attack.value = 0.002;
                this.limiter.release.value = 0.14;
                this.master.connect(this.limiter);
                this.limiter.connect(this.ctx.destination);
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            return this.ctx;
        }

        _tone(freq, dur, opts) {
            const ctx = this.ensure();
            if (!ctx || !this.master) return;
            const o = opts || {};
            const t0 = ctx.currentTime + (o.delay || 0);
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = o.type || 'sine';
            osc.frequency.setValueAtTime(freq, t0);
            if (o.endFreq) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(40, o.endFreq), t0 + dur);
            }
            const peak = o.gain != null ? o.gain : 0.18;
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(g);
            g.connect(this.master);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
        }

        playDrop() {
            this._tone(340, 0.09, { type: 'sine', endFreq: 210, gain: 0.14 });
        }

        playBounce(speed) {
            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            if (now - this._lastBounce < 42) return;
            this._lastBounce = now;
            const ratio = Math.min(1, Math.max(0.18, (speed || 150) / 520));
            this._tone(130 + ratio * 75, 0.055, { type: 'triangle', endFreq: 80, gain: 0.09 * ratio });
        }

        playPeg() {
            this._tone(680, 0.06, { type: 'triangle', endFreq: 940, gain: 0.07 });
        }

        playMerge(tier, combo) {
            const noteIdx = Math.min(PENTA.length - 1, Math.floor((tier || 1) / 2) + Math.min(3, Math.max(0, (combo || 1) - 1)));
            const base = PENTA[noteIdx];
            this._tone(base * 0.5, 0.11, { type: 'sine', endFreq: base, gain: 0.17 });
            this._tone(base, 0.22, { type: 'triangle', gain: 0.16, delay: 0.03 });
            if ((combo || 1) >= 2) {
                this._tone(base * 1.5, 0.24, { type: 'sine', gain: 0.12, delay: 0.06 });
            }
        }

        playGrandSlam() {
            [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
                this._tone(f, 0.34, { type: 'triangle', gain: 0.16, delay: i * 0.055 });
            });
        }

        playThaw() {
            this._tone(987.77, 0.14, { type: 'sine', gain: 0.14 });
            this._tone(1479.98, 0.20, { type: 'sine', gain: 0.11, delay: 0.04 });
        }

        playTool() {
            this._tone(587.33, 0.12, { type: 'triangle', endFreq: 880, gain: 0.15 });
        }

        playWin() {
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
                this._tone(f, 0.28, { type: 'triangle', gain: 0.16, delay: i * 0.08 });
            });
        }

        playLoss() {
            [392.0, 349.23, 293.66].forEach((f, i) => {
                this._tone(f, 0.24, { type: 'sine', gain: 0.14, delay: i * 0.10 });
            });
        }
    }

    return FruitMergeAudio;
});
