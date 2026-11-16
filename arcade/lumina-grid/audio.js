(function (root) {
    'use strict';

    const PENTATONIC_HZ = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98];

    class LuminaAudio {
        constructor() {
            this.ctx = null;
            this.master = null;
            this.limiter = null;
            this.enabled = true;
            this.volume = 0.65;
        }

        init() {
            if (this.ctx) {
                if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
                return this.ctx;
            }
            const AudioCtx = root.AudioContext || root.webkitAudioContext;
            if (!AudioCtx) return null;
            this.ctx = new AudioCtx();
            this.master = this.ctx.createGain();
            this.master.gain.setValueAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime);
            this.limiter = this.ctx.createDynamicsCompressor();
            this.limiter.threshold.setValueAtTime(-10, this.ctx.currentTime);
            this.limiter.knee.setValueAtTime(18, this.ctx.currentTime);
            this.limiter.ratio.setValueAtTime(8, this.ctx.currentTime);
            this.limiter.attack.setValueAtTime(0.004, this.ctx.currentTime);
            this.limiter.release.setValueAtTime(0.16, this.ctx.currentTime);
            this.master.connect(this.limiter);
            this.limiter.connect(this.ctx.destination);
            return this.ctx;
        }

        setEnabled(flag) {
            this.enabled = Boolean(flag);
            if (this.master && this.ctx) {
                this.master.gain.setValueAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime);
            }
        }

        tone(freq, type, startOffset, duration, peakGain = 0.2, slideTo = null) {
            if (!this.enabled) return;
            const ctx = this.init();
            if (!ctx) return;
            const t0 = ctx.currentTime + startOffset;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, t0);
            if (slideTo) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + duration);
            }
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(t0);
            osc.stop(t0 + duration + 0.02);
        }

        playPick() {
            this.tone(480, 'sine', 0, 0.08, 0.08, 660);
        }

        playPlace() {
            this.tone(240, 'triangle', 0, 0.09, 0.14, 170);
            this.tone(720, 'sine', 0.008, 0.09, 0.07, 940);
        }

        playInvalid() {
            this.tone(180, 'triangle', 0, 0.09, 0.07, 130);
        }

        playClear(linesCount = 1, combo = 1, isCross = false) {
            const idx = Math.min(PENTATONIC_HZ.length - 1, Math.max(0, combo - 1));
            const base = PENTATONIC_HZ[idx];
            const steps = Math.min(4, Math.max(2, linesCount + (isCross ? 1 : 0)));
            for (let i = 0; i < steps; i++) {
                const noteIdx = Math.min(PENTATONIC_HZ.length - 1, idx + i);
                this.tone(PENTATONIC_HZ[noteIdx], 'sine', i * 0.045, 0.28, 0.15);
                this.tone(PENTATONIC_HZ[noteIdx] * 2, 'triangle', i * 0.045 + 0.01, 0.18, 0.045);
            }
            this.tone(base * 0.5, 'sine', 0, 0.22, 0.12);
        }

        playFrostBreak(shattered = true) {
            if (shattered) {
                this.tone(1180, 'triangle', 0, 0.14, 0.12, 1680);
                this.tone(1760, 'sine', 0.03, 0.16, 0.09, 2100);
            } else {
                this.tone(920, 'triangle', 0, 0.09, 0.09, 640);
            }
        }

        playShuffle() {
            [392, 493.88, 587.33].forEach((hz, i) => this.tone(hz, 'sine', i * 0.04, 0.14, 0.09));
        }

        playWin() {
            [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((hz, i) => {
                this.tone(hz, 'sine', i * 0.075, 0.36, 0.16);
                this.tone(hz * 0.5, 'triangle', i * 0.075, 0.28, 0.06);
            });
        }

        playGameOver() {
            [440, 392, 329.63, 261.63].forEach((hz, i) => {
                this.tone(hz, 'sine', i * 0.11, 0.28, 0.11);
            });
        }
    }

    const luminaAudio = new LuminaAudio();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { LuminaAudio, luminaAudio };
    }
    if (root) {
        root.luminaAudio = luminaAudio;
    }
})(typeof window !== 'undefined' ? window : globalThis);
