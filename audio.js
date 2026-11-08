// Enhanced Web Audio API Sound & Music Engine for Angry Birds Remastered
// Zero external MP3/WAV dependencies — rich multi-layered procedural synthesis with full volume control

class SoundFX {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.bgmEnabled = false;
        this.sfxVolume = 0.85;
        this.bgmVolume = 0.50;
        this.masterGain = null;
        this.sfxGain = null;
        this.bgmGain = null;
        this.bgmTimer = null;
        this.lastCollisionSoundTime = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);

                this.sfxGain = this.ctx.createGain();
                this.sfxGain.gain.setValueAtTime(this.enabled ? this.sfxVolume : 0, this.ctx.currentTime);
                this.sfxGain.connect(this.masterGain);

                this.bgmGain = this.ctx.createGain();
                this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? this.bgmVolume : 0, this.ctx.currentTime);
                this.bgmGain.connect(this.masterGain);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    get sfxOut() {
        this.init();
        return this.sfxGain || (this.ctx ? this.ctx.destination : null);
    }

    get bgmOut() {
        this.init();
        return this.bgmGain || (this.ctx ? this.ctx.destination : null);
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.setValueAtTime(this.enabled ? this.sfxVolume : 0, this.ctx.currentTime);
        }
        if (!this.enabled) {
            this.stopBGM();
        } else if (this.bgmEnabled) {
            this.startBGM();
        }
        return this.enabled;
    }

    setBGMEnabled(enabled) {
        this.init();
        this.bgmEnabled = Boolean(enabled);
        if (this.bgmGain && this.ctx) {
            this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? this.bgmVolume : 0, this.ctx.currentTime);
        }
        if (this.bgmEnabled && this.enabled) {
            this.startBGM();
        } else {
            this.stopBGM();
        }
        return this.bgmEnabled;
    }

    setSFXVolume(val) {
        this.sfxVolume = Math.max(0, Math.min(1, parseFloat(val) || 0));
        if (this.sfxGain && this.ctx && this.enabled) {
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        }
    }

    setBGMVolume(val) {
        this.bgmVolume = Math.max(0, Math.min(1, parseFloat(val) || 0));
        if (this.bgmGain && this.ctx && this.bgmEnabled) {
            this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
        }
    }

    toggle() {
        return this.setEnabled(!this.enabled);
    }

    toggleBGM() {
        return this.setBGMEnabled(!this.bgmEnabled);
    }

    startBGM() {
        this.stopBGM();
        if (!this.ctx || !this.enabled || !this.bgmEnabled) return;

        // Jaunty Angry-Birds-inspired staccato marimba/woodwind riff
        const melody = [
            { f: 329.63, d: 0.18 }, { f: 349.23, d: 0.18 }, { f: 392.00, d: 0.32 },
            { f: 523.25, d: 0.32 }, { f: 493.88, d: 0.18 }, { f: 440.00, d: 0.18 },
            { f: 392.00, d: 0.35 }, { f: 0, d: 0.12 },
            { f: 392.00, d: 0.18 }, { f: 440.00, d: 0.18 }, { f: 493.88, d: 0.30 },
            { f: 587.33, d: 0.30 }, { f: 523.25, d: 0.22 }, { f: 493.88, d: 0.22 },
            { f: 523.25, d: 0.42 }, { f: 0, d: 0.25 }
        ];

        let step = 0;
        const playNext = () => {
            if (!this.bgmEnabled || !this.enabled || !this.ctx) return;
            const note = melody[step % melody.length];
            if (note.f > 0) {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const sub = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                sub.type = 'sine';
                osc.frequency.setValueAtTime(note.f, now);
                sub.frequency.setValueAtTime(note.f * 0.5, now);

                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + note.d * 0.92);

                osc.connect(gain);
                sub.connect(gain);
                gain.connect(this.bgmOut);
                osc.start(now);
                sub.start(now);
                osc.stop(now + note.d);
                sub.stop(now + note.d);
            }
            step++;
            this.bgmTimer = setTimeout(playNext, note.d * 1000);
        };
        playNext();
    }

    stopBGM() {
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    playClick() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.045);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.045);
    }

    playMenuOpen() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [440, 660, 880].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + i * 0.03);
            gain.gain.setValueAtTime(0.12, now + i * 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.07);
            osc.connect(gain);
            gain.connect(this.sfxOut);
            osc.start(now + i * 0.03);
            osc.stop(now + i * 0.03 + 0.07);
        });
    }

    playStarChime(starIndex = 1) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const baseFreq = [523.25, 659.25, 783.99, 1046.50][Math.min(3, Math.max(0, starIndex - 1))];
        const osc = this.ctx.createOscillator();
        const sub = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        sub.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        sub.frequency.setValueAtTime(baseFreq * 2, now);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.002, now + 0.42);
        osc.connect(gain);
        sub.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        sub.start(now);
        osc.stop(now + 0.42);
        sub.stop(now + 0.42);
    }

    playCancel() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.08);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.002, now + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playLevelUnlock() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const notes = [
            { f: 523.25, d: 0.10 },
            { f: 659.25, d: 0.10 },
            { f: 783.99, d: 0.12 },
            { f: 1046.50, d: 0.28 }
        ];
        let delay = 0;
        notes.forEach(n => {
            const now = this.ctx.currentTime + delay;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.f, now);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.002, now + n.d);
            osc.connect(gain);
            gain.connect(this.sfxOut);
            osc.start(now);
            osc.stop(now + n.d);
            delay += n.d * 0.85;
        });
    }

    playStretch(ratio = 0.5) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        const base = 75 + ratio * 75;
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.linearRampToValueAtTime(base + 30, now + 0.09);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    playLaunch(birdType = 'red') {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Rubber snap twang
        const snap = this.ctx.createOscillator();
        const snapGain = this.ctx.createGain();
        snap.type = 'triangle';
        snap.frequency.setValueAtTime(160, now);
        snap.frequency.exponentialRampToValueAtTime(65, now + 0.16);
        snapGain.gain.setValueAtTime(0.28, now);
        snapGain.gain.exponentialRampToValueAtTime(0.005, now + 0.16);
        snap.connect(snapGain);
        snapGain.connect(this.sfxOut);
        snap.start(now);
        snap.stop(now + 0.16);

        // Signature bird battle cry!
        const voice = this.ctx.createOscillator();
        const vGain = this.ctx.createGain();

        if (birdType === 'terence') {
            voice.type = 'sawtooth';
            voice.frequency.setValueAtTime(130, now + 0.03);
            voice.frequency.linearRampToValueAtTime(95, now + 0.35);
            vGain.gain.setValueAtTime(0.25, now + 0.03);
            vGain.gain.exponentialRampToValueAtTime(0.005, now + 0.36);
            voice.connect(vGain);
            vGain.connect(this.sfxOut);
            voice.start(now + 0.03);
            voice.stop(now + 0.36);
        } else if (birdType === 'yellow') {
            voice.type = 'square';
            voice.frequency.setValueAtTime(520, now + 0.02);
            voice.frequency.exponentialRampToValueAtTime(1350, now + 0.18);
            vGain.gain.setValueAtTime(0.16, now + 0.02);
            vGain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);
            voice.connect(vGain);
            vGain.connect(this.sfxOut);
            voice.start(now + 0.02);
            voice.stop(now + 0.2);
        } else if (birdType === 'blue') {
            [680, 860, 1020].forEach((f, idx) => {
                const o = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                o.type = 'sine';
                o.frequency.setValueAtTime(f, now + idx * 0.05);
                o.frequency.exponentialRampToValueAtTime(f * 1.25, now + idx * 0.05 + 0.06);
                g.gain.setValueAtTime(0.16, now + idx * 0.05);
                g.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.05 + 0.07);
                o.connect(g);
                g.connect(this.sfxOut);
                o.start(now + idx * 0.05);
                o.stop(now + idx * 0.05 + 0.07);
            });
        } else {
            // Classic Red / Bomb / Matilda war-cry arc
            voice.type = 'triangle';
            const startF = birdType === 'bomb' ? 240 : birdType === 'matilda' ? 480 : 380;
            voice.frequency.setValueAtTime(startF, now + 0.02);
            voice.frequency.exponentialRampToValueAtTime(startF * 2.2, now + 0.14);
            voice.frequency.exponentialRampToValueAtTime(startF * 1.3, now + 0.28);
            vGain.gain.setValueAtTime(0.24, now + 0.02);
            vGain.gain.exponentialRampToValueAtTime(0.005, now + 0.28);
            voice.connect(vGain);
            vGain.connect(this.sfxOut);
            voice.start(now + 0.02);
            voice.stop(now + 0.28);
        }
    }

    playDash() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(1650, now + 0.18);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.22);
    }

    playSplit() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [750, 980, 1240].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.04);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + i * 0.04 + 0.09);
            gain.gain.setValueAtTime(0.22, now + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.005, now + i * 0.04 + 0.09);
            osc.connect(gain);
            gain.connect(this.sfxOut);
            osc.start(now + i * 0.04);
            osc.stop(now + i * 0.04 + 0.09);
        });
    }

    playEggDrop() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(920, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.32);
        gain.gain.setValueAtTime(0.26, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.32);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.32);
    }

    playBattleCry() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(190, now + 0.25);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.26);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.26);
    }

    playBirdHop() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.14);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.22);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.24);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.24);
    }

    playBounce() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.18);
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    playExplosion(scale = 1.0) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const duration = 0.65 * scale;

        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.16 * scale));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(580, now);
        filter.frequency.exponentialRampToValueAtTime(42, now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(Math.min(0.95, 0.75 * scale), now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + duration);

        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(110, now);
        sub.frequency.exponentialRampToValueAtTime(28, now + 0.38);
        subGain.gain.setValueAtTime(0.6, now);
        subGain.gain.exponentialRampToValueAtTime(0.005, now + 0.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxOut);

        sub.connect(subGain);
        subGain.connect(this.sfxOut);

        noise.start(now);
        sub.start(now);
        sub.stop(now + 0.4);
    }

    playEarthquake() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const duration = 1.4;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.7;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(95, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxOut);
        src.start(now);
    }

    _canPlayImpact() {
        const t = performance.now();
        if (t - this.lastCollisionSoundTime < 35) return false;
        this.lastCollisionSoundTime = t;
        return true;
    }

    playHitWood(intensity = 1) {
        if (!this.enabled || !this._canPlayImpact()) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(185 + Math.random() * 40, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.085);
        gain.gain.setValueAtTime(Math.min(0.28, 0.09 * intensity), now);
        gain.gain.exponentialRampToValueAtTime(0.004, now + 0.085);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.085);
    }

    playHitGlass(intensity = 1) {
        if (!this.enabled || !this._canPlayImpact()) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [1950, 2650].forEach((baseF, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(baseF + Math.random() * 300, now + idx * 0.015);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.11);
            gain.gain.setValueAtTime(Math.min(0.2, 0.07 * intensity), now + idx * 0.015);
            gain.gain.exponentialRampToValueAtTime(0.004, now + 0.11);
            osc.connect(gain);
            gain.connect(this.sfxOut);
            osc.start(now + idx * 0.015);
            osc.stop(now + 0.11);
        });
    }

    playHitStone(intensity = 1) {
        if (!this.enabled || !this._canPlayImpact()) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(105, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.13);
        gain.gain.setValueAtTime(Math.min(0.38, 0.14 * intensity), now);
        gain.gain.exponentialRampToValueAtTime(0.004, now + 0.13);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    playPigSqueak() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.07);
        osc.frequency.linearRampToValueAtTime(590, now + 0.15);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playPigPop() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.055);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);
        gain.gain.setValueAtTime(0.36, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.14);
    }

    playWin() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const fanfare = [
            { f: 523.25, t: 0, d: 0.13 },
            { f: 659.25, t: 0.12, d: 0.13 },
            { f: 783.99, t: 0.24, d: 0.13 },
            { f: 1046.50, t: 0.38, d: 0.42 }
        ];
        fanfare.forEach(n => {
            const now = this.ctx.currentTime + n.t;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.f, now);
            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.003, now + n.d);
            osc.connect(gain);
            gain.connect(this.sfxOut);
            osc.start(now);
            osc.stop(now + n.d);
        });
    }

    playLose() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        [392, 369.99, 349.23, 311.13].forEach((freq, idx) => {
            const now = this.ctx.currentTime + idx * 0.2;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 0.94, now + 0.18);
            gain.gain.setValueAtTime(0.16, now);
            gain.gain.exponentialRampToValueAtTime(0.004, now + 0.2);
            osc.connect(gain);
            gain.connect(this.sfxOut);
            osc.start(now);
            osc.stop(now + 0.2);
        });
    }
}

window.soundFX = new SoundFX();
