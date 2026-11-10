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
        this.limiter = null;
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

                // Gentle bus limiter (DynamicsCompressor) inserted between the master
                // gain and the destination. It only engages on peaks that would otherwise
                // sum past ~0 dBFS (e.g. many SFX/BGM voices stacking on one physics
                // frame), preventing digital clipping/distortion. Normal playback levels
                // stay transparent, so perceived volume and the public API are unchanged.
                // Falls back to a direct connection on engines lacking the node.
                try {
                    this.limiter = this.ctx.createDynamicsCompressor();
                    this.limiter.threshold.setValueAtTime(-1, this.ctx.currentTime);
                    this.limiter.knee.setValueAtTime(0, this.ctx.currentTime);
                    this.limiter.ratio.setValueAtTime(20, this.ctx.currentTime);
                    this.limiter.attack.setValueAtTime(0.002, this.ctx.currentTime);
                    this.limiter.release.setValueAtTime(0.1, this.ctx.currentTime);
                    this.masterGain.connect(this.limiter);
                    this.limiter.connect(this.ctx.destination);
                } catch (e) {
                    this.limiter = null;
                    this.masterGain.connect(this.ctx.destination);
                }

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

        // 1. Rubber Slingshot Snap & Twang
        const snap = this.ctx.createOscillator();
        const snapGain = this.ctx.createGain();
        snap.type = 'triangle';
        snap.frequency.setValueAtTime(190, now);
        snap.frequency.exponentialRampToValueAtTime(52, now + 0.14);
        snapGain.gain.setValueAtTime(0.32, now);
        snapGain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);
        snap.connect(snapGain);
        snapGain.connect(this.sfxOut);
        snap.start(now);
        snap.stop(now + 0.14);

        // 2. Iconic Classic Angry Birds Battle Cry Vocalization!
        if (birdType === 'yellow') {
            // Chuck / Yellow: Sharp energetic ninja screech: "Ha-chaaa!"
            const voice = this.ctx.createOscillator();
            const vGain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, now + 0.02);
            filter.Q.setValueAtTime(2.8, now + 0.02);

            voice.type = 'sawtooth';
            voice.frequency.setValueAtTime(520, now + 0.02);
            voice.frequency.exponentialRampToValueAtTime(1650, now + 0.11);
            voice.frequency.exponentialRampToValueAtTime(820, now + 0.24);

            vGain.gain.setValueAtTime(0.001, now + 0.02);
            vGain.gain.linearRampToValueAtTime(0.28, now + 0.04);
            vGain.gain.exponentialRampToValueAtTime(0.004, now + 0.24);

            voice.connect(filter);
            filter.connect(vGain);
            vGain.connect(this.sfxOut);
            voice.start(now + 0.02);
            voice.stop(now + 0.24);
        } else if (birdType === 'blue') {
            // Blues: 3 Cute rapid chirping twitter warbles: "Peep-peep-wheee!"
            [0, 0.055, 0.11].forEach((del, i) => {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.type = 'triangle';
                const f = 1100 + i * 280;
                osc.frequency.setValueAtTime(f, now + 0.02 + del);
                osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.02 + del + 0.04);
                osc.frequency.exponentialRampToValueAtTime(f * 0.9, now + 0.02 + del + 0.07);

                g.gain.setValueAtTime(0.001, now + 0.02 + del);
                g.gain.linearRampToValueAtTime(0.22, now + 0.02 + del + 0.01);
                g.gain.exponentialRampToValueAtTime(0.003, now + 0.02 + del + 0.07);

                osc.connect(g);
                g.connect(this.sfxOut);
                osc.start(now + 0.02 + del);
                osc.stop(now + 0.02 + del + 0.07);
            });
        } else if (birdType === 'bomb') {
            // Bomb: Low rumbling battle growl: "Rrrrr-waaagh!"
            const voice = this.ctx.createOscillator();
            const vGain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(750, now + 0.02);

            voice.type = 'sawtooth';
            voice.frequency.setValueAtTime(210, now + 0.02);
            voice.frequency.linearRampToValueAtTime(460, now + 0.12);
            voice.frequency.exponentialRampToValueAtTime(170, now + 0.32);

            vGain.gain.setValueAtTime(0.001, now + 0.02);
            vGain.gain.linearRampToValueAtTime(0.32, now + 0.05);
            vGain.gain.exponentialRampToValueAtTime(0.005, now + 0.32);

            voice.connect(filter);
            filter.connect(vGain);
            vGain.connect(this.sfxOut);
            voice.start(now + 0.02);
            voice.stop(now + 0.32);
        } else if (birdType === 'matilda') {
            // Matilda: Proud hen cackle cluck: "Bawk-bawk!"
            [0, 0.09].forEach((del, i) => {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.type = 'triangle';
                const f = i === 0 ? 460 : 580;
                osc.frequency.setValueAtTime(f, now + 0.02 + del);
                osc.frequency.exponentialRampToValueAtTime(f * 1.6, now + 0.02 + del + 0.04);
                osc.frequency.exponentialRampToValueAtTime(f * 0.8, now + 0.02 + del + 0.08);

                g.gain.setValueAtTime(0.001, now + 0.02 + del);
                g.gain.linearRampToValueAtTime(0.24, now + 0.02 + del + 0.012);
                g.gain.exponentialRampToValueAtTime(0.004, now + 0.02 + del + 0.08);

                osc.connect(g);
                g.connect(this.sfxOut);
                osc.start(now + 0.02 + del);
                osc.stop(now + 0.02 + del + 0.08);
            });
        } else if (birdType === 'hal') {
            // Hal / Boomerang: Spinning whistling avian warble: "Whoooo-weee-wheee!"
            const voice = this.ctx.createOscillator();
            const vGain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1250, now + 0.02);
            filter.Q.setValueAtTime(2.4, now + 0.02);

            voice.type = 'sawtooth';
            voice.frequency.setValueAtTime(450, now + 0.02);
            voice.frequency.exponentialRampToValueAtTime(1420, now + 0.12);
            voice.frequency.exponentialRampToValueAtTime(680, now + 0.28);

            // Fast flutter LFO
            const lfo = this.ctx.createOscillator();
            const lfoG = this.ctx.createGain();
            lfo.frequency.setValueAtTime(18, now + 0.02);
            lfoG.gain.setValueAtTime(35, now + 0.02);
            lfo.connect(voice.frequency);
            lfo.start(now + 0.02);
            lfo.stop(now + 0.28);

            vGain.gain.setValueAtTime(0.001, now + 0.02);
            vGain.gain.linearRampToValueAtTime(0.28, now + 0.04);
            vGain.gain.exponentialRampToValueAtTime(0.004, now + 0.28);

            voice.connect(filter);
            filter.connect(vGain);
            vGain.connect(this.sfxOut);
            voice.start(now + 0.02);
            voice.stop(now + 0.28);
        } else if (birdType === 'terence') {
            // Terence: Guttural menacing low-pitch heavy grunt: "Grrrr-huuumph!"
            const voice = this.ctx.createOscillator();
            const vGain = this.ctx.createGain();
            voice.type = 'sawtooth';
            voice.frequency.setValueAtTime(115, now + 0.02);
            voice.frequency.linearRampToValueAtTime(80, now + 0.36);
            vGain.gain.setValueAtTime(0.32, now + 0.02);
            vGain.gain.exponentialRampToValueAtTime(0.005, now + 0.36);
            voice.connect(vGain);
            vGain.connect(this.sfxOut);
            voice.start(now + 0.02);
            voice.stop(now + 0.36);
        } else {
            // Classic Red Bird: Iconic 3-syllable battle cry: "Wha-heee-ha!"
            const voice = this.ctx.createOscillator();
            const vGain = this.ctx.createGain();
            const formant = this.ctx.createBiquadFilter();

            formant.type = 'bandpass';
            formant.frequency.setValueAtTime(1180, now + 0.02);
            formant.Q.setValueAtTime(2.6, now + 0.02);

            voice.type = 'sawtooth';
            // Syllable 1 (Wha): 360 -> 640Hz
            voice.frequency.setValueAtTime(360, now + 0.02);
            voice.frequency.exponentialRampToValueAtTime(640, now + 0.08);
            // Syllable 2 (Heeee soaring cry with vibrato): 640 -> 1320Hz -> 960Hz
            voice.frequency.exponentialRampToValueAtTime(1320, now + 0.17);
            voice.frequency.exponentialRampToValueAtTime(960, now + 0.25);
            // Syllable 3 (Ha dip punctuation): 960 -> 480Hz
            voice.frequency.exponentialRampToValueAtTime(480, now + 0.34);

            // Vibrato LFO for realistic vocal cords flutter
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.frequency.setValueAtTime(22, now + 0.02);
            lfoGain.gain.setValueAtTime(28, now + 0.02);
            lfo.connect(voice.frequency);
            lfo.start(now + 0.02);
            lfo.stop(now + 0.34);

            vGain.gain.setValueAtTime(0.001, now + 0.02);
            vGain.gain.linearRampToValueAtTime(0.28, now + 0.05);
            vGain.gain.exponentialRampToValueAtTime(0.004, now + 0.34);

            voice.connect(formant);
            formant.connect(vGain);
            vGain.connect(this.sfxOut);
            voice.start(now + 0.02);
            voice.stop(now + 0.34);
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

    playBoomerang() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Spinning boomerang reverse whoosh + Doppler warble
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(950, now);
        filter.Q.setValueAtTime(2.6, now);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(1280, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.32);

        // Rapid spinning blade tremolo
        const trem = this.ctx.createOscillator();
        const tremG = this.ctx.createGain();
        trem.frequency.setValueAtTime(24, now);
        tremG.gain.setValueAtTime(0.18, now);
        trem.connect(gain.gain);
        trem.start(now);
        trem.stop(now + 0.32);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.32, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.32);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.32);
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

    // Bird Chirp & Slingshot Hop (Classic avian chirping & cheerful squawks)
    playBirdChirp() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Rapid bright avian chirps (2 cheerful syllables: "Tweet-tweet!")
        const syllables = [
            { startF: 2100, peakF: 3400, endF: 2600, t: 0, dur: 0.075 },
            { startF: 2500, peakF: 4100, endF: 3000, t: 0.082, dur: 0.090 }
        ];

        syllables.forEach(s => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(3200, now + s.t);
            filter.Q.setValueAtTime(2.2, now + s.t);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(s.startF, now + s.t);
            osc.frequency.exponentialRampToValueAtTime(s.peakF, now + s.t + s.dur * 0.45);
            osc.frequency.exponentialRampToValueAtTime(s.endF, now + s.t + s.dur);

            gain.gain.setValueAtTime(0.001, now + s.t);
            gain.gain.linearRampToValueAtTime(0.24, now + s.t + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.002, now + s.t + s.dur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxOut);

            osc.start(now + s.t);
            osc.stop(now + s.t + s.dur);
        });
    }

    playBirdHop() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Springy hop boing
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(290, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.09);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.17);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.17);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.17);

        // 2. Play distinct bird chirp upon landing on the slingshot!
        setTimeout(() => {
            this.playBirdChirp();
        }, 95);
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

    // Classic Angry Birds Pig Grunt & Oink System (Authentic snout flutter & nasal resonance)
    playPigGrunt(intensity = 1.0, isHeavy = false) {
        if (!this.enabled || !this._canPlayImpact()) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Choose between 3 authentic pig vocalization variants:
        // 0: Classic Double-Oink ("Oink-oink!")
        // 1: Deep Guttural Snout Grunt ("Hrrrn-ggh!")
        // 2: Startled Squeal-Oink ("Squeee-oink!")
        const variant = isHeavy ? 1 : Math.floor(Math.random() * 3);

        if (variant === 0) {
            // Classic Double-Oink: two rapid rhythmic nasal snout snorts
            [0, 0.095].forEach((del, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const formant = this.ctx.createBiquadFilter();

                // Nasal snout bandpass cavity filter
                formant.type = 'bandpass';
                formant.frequency.setValueAtTime(idx === 0 ? 690 : 810, now + del);
                formant.Q.setValueAtTime(3.4, now + del);

                osc.type = 'sawtooth';
                const baseF = idx === 0 ? 220 : 260;
                osc.frequency.setValueAtTime(baseF + 45, now + del);
                osc.frequency.linearRampToValueAtTime(baseF, now + del + 0.025);
                osc.frequency.exponentialRampToValueAtTime(baseF * 0.70, now + del + 0.11);

                // Snout flutter LFO (28Hz flappy vibrato)
                const lfo = this.ctx.createOscillator();
                const lfoGain = this.ctx.createGain();
                lfo.frequency.setValueAtTime(28, now + del);
                lfoGain.gain.setValueAtTime(22, now + del);
                lfo.connect(osc.frequency);
                lfo.start(now + del);
                lfo.stop(now + del + 0.12);

                gain.gain.setValueAtTime(0.001, now + del);
                gain.gain.linearRampToValueAtTime(Math.min(0.40, 0.24 * intensity), now + del + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.003, now + del + 0.11);

                osc.connect(formant);
                formant.connect(gain);
                gain.connect(this.sfxOut);

                osc.start(now + del);
                osc.stop(now + del + 0.12);
            });
        } else if (variant === 1) {
            // Deep Guttural Pain Grunt: when squashed or smashed by a heavy plank/stone
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const formant = this.ctx.createBiquadFilter();

            formant.type = 'bandpass';
            formant.frequency.setValueAtTime(540, now);
            formant.Q.setValueAtTime(2.6, now);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(195, now);
            osc.frequency.linearRampToValueAtTime(235, now + 0.04);
            osc.frequency.exponentialRampToValueAtTime(130, now + 0.22);

            // Guttural snout tremble LFO
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.frequency.setValueAtTime(25, now);
            lfoGain.gain.setValueAtTime(24, now);
            lfo.connect(osc.frequency);
            lfo.start(now);
            lfo.stop(now + 0.22);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(Math.min(0.44, (isHeavy ? 0.35 : 0.26) * intensity), now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.004, now + 0.22);

            osc.connect(formant);
            formant.connect(gain);
            gain.connect(this.sfxOut);

            osc.start(now);
            osc.stop(now + 0.22);
        } else {
            // Startled High Squeal-Oink: sharp comedic pig screech
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const formant = this.ctx.createBiquadFilter();

            formant.type = 'bandpass';
            formant.frequency.setValueAtTime(1050, now);
            formant.Q.setValueAtTime(3.2, now);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(410, now);
            osc.frequency.exponentialRampToValueAtTime(680, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(210, now + 0.18);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(Math.min(0.36, 0.22 * intensity), now + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.004, now + 0.18);

            osc.connect(formant);
            formant.connect(gain);
            gain.connect(this.sfxOut);

            osc.start(now);
            osc.stop(now + 0.18);
        }
    }

    playPigSqueak(intensity = 1.0) {
        this.playPigGrunt(intensity, false);
    }

    playPigCrush() {
        this.playPigGrunt(1.4, true);
    }

    playPigPop() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Balloon pop transient
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(58, now + 0.08);
        gain.gain.setValueAtTime(0.42, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxOut);
        osc.start(now);
        osc.stop(now + 0.08);

        // 2. Air burst noise puff
        try {
            const bufLen = Math.floor(this.ctx.sampleRate * 0.08);
            const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
            const chan = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) {
                chan[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.3));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buf;
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.24, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.004, now + 0.08);
            noise.connect(noiseGain);
            noiseGain.connect(this.sfxOut);
            noise.start(now);
        } catch (e) {}

        // 3. Cute tiny dying oink squeak
        const squeak = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();
        squeak.type = 'sine';
        squeak.frequency.setValueAtTime(560, now + 0.03);
        squeak.frequency.exponentialRampToValueAtTime(240, now + 0.16);
        sGain.gain.setValueAtTime(0.18, now + 0.03);
        sGain.gain.exponentialRampToValueAtTime(0.004, now + 0.16);
        squeak.connect(sGain);
        sGain.connect(this.sfxOut);
        squeak.start(now + 0.03);
        squeak.stop(now + 0.16);
    }

    playWin() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Multi-voice Triumphant Brass Fanfare (Classic 5-note victory phrase with rich chords)
        const chords = [
            { t: 0.00, dur: 0.14, notes: [392.00, 493.88, 587.33] },          // G major pickup (G4, B4, D5)
            { t: 0.15, dur: 0.14, notes: [523.25, 659.25, 783.99] },          // C major (C5, E5, G5)
            { t: 0.30, dur: 0.14, notes: [587.33, 739.99, 880.00] },          // D major (D5, F#5, A5)
            { t: 0.45, dur: 0.18, notes: [659.25, 783.99, 987.77] },          // E minor / G (E5, G5, B5)
            { t: 0.65, dur: 0.75, notes: [523.25, 659.25, 783.99, 1046.50] }  // Grand High C6 Tutti!
        ];

        chords.forEach((chord, cIdx) => {
            const startT = now + chord.t;
            const endT = startT + chord.dur;

            chord.notes.forEach((freq, nIdx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();

                osc.type = nIdx === chord.notes.length - 1 ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(freq, startT);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(cIdx === 4 ? 3200 : 2200, startT);
                filter.Q.setValueAtTime(2.0, startT);

                const baseVol = cIdx === 4 ? 0.22 : 0.17;
                gain.gain.setValueAtTime(0.001, startT);
                gain.gain.linearRampToValueAtTime(baseVol, startT + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.003, endT);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.sfxOut);

                osc.start(startT);
                osc.stop(endT);
            });
        });

        // 2. Cheerful Celebratory Bird Flock Chirping & Cheering (starts at +0.9s)
        const chirpTimes = [0.90, 1.05, 1.18, 1.32, 1.48];
        chirpTimes.forEach((del, i) => {
            const startT = now + del;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            const f1 = 1200 + i * 220;
            const f2 = f1 * (i % 2 === 0 ? 1.6 : 1.3);
            osc.frequency.setValueAtTime(f1, startT);
            osc.frequency.exponentialRampToValueAtTime(f2, startT + 0.04);
            osc.frequency.exponentialRampToValueAtTime(f1 * 0.9, startT + 0.09);

            gain.gain.setValueAtTime(0.001, startT);
            gain.gain.linearRampToValueAtTime(0.20, startT + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.002, startT + 0.09);

            osc.connect(gain);
            gain.connect(this.sfxOut);

            osc.start(startT);
            osc.stop(startT + 0.09);
        });
    }

    // Iconic Mocking Pig Laugh ("Heh-heh-heh-heh! *SNORT* *OINK*!")
    playPigMockLaugh() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Five rapid comedic giggles: "He-he-he-he-he!"
        const gigglePitches = [460, 420, 490, 440, 390];
        gigglePitches.forEach((pitch, i) => {
            const startT = now + i * 0.11;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const formant = this.ctx.createBiquadFilter();

            formant.type = 'bandpass';
            formant.frequency.setValueAtTime(820, startT);
            formant.Q.setValueAtTime(3.8, startT);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(pitch, startT);
            osc.frequency.linearRampToValueAtTime(pitch * 1.15, startT + 0.03);
            osc.frequency.exponentialRampToValueAtTime(pitch * 0.85, startT + 0.085);

            gain.gain.setValueAtTime(0.001, startT);
            gain.gain.linearRampToValueAtTime(0.24, startT + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.004, startT + 0.085);

            osc.connect(formant);
            formant.connect(gain);
            gain.connect(this.sfxOut);

            osc.start(startT);
            osc.stop(startT + 0.085);
        });

        // 2. Punchline: Loud nasal snort + triumphant oink ("Huuunk-oink!") at t + 0.62s
        const snortT = now + 0.62;
        const snortOsc = this.ctx.createOscillator();
        const snortGain = this.ctx.createGain();
        const snortFilter = this.ctx.createBiquadFilter();

        snortFilter.type = 'bandpass';
        snortFilter.frequency.setValueAtTime(680, snortT);
        snortFilter.Q.setValueAtTime(3.2, snortT);

        snortOsc.type = 'sawtooth';
        snortOsc.frequency.setValueAtTime(180, snortT);
        snortOsc.frequency.linearRampToValueAtTime(240, snortT + 0.05);
        snortOsc.frequency.exponentialRampToValueAtTime(140, snortT + 0.22);

        // Palate flutter LFO for realistic pig snort vibration
        const lfo = this.ctx.createOscillator();
        const lfoG = this.ctx.createGain();
        lfo.frequency.setValueAtTime(26, snortT);
        lfoG.gain.setValueAtTime(32, snortT);
        lfo.connect(snortOsc.frequency);
        lfo.start(snortT);
        lfo.stop(snortT + 0.22);

        snortGain.gain.setValueAtTime(0.001, snortT);
        snortGain.gain.linearRampToValueAtTime(0.35, snortT + 0.03);
        snortGain.gain.exponentialRampToValueAtTime(0.004, snortT + 0.22);

        snortOsc.connect(snortFilter);
        snortFilter.connect(snortGain);
        snortGain.connect(this.sfxOut);

        snortOsc.start(snortT);
        snortOsc.stop(snortT + 0.22);
    }

    playLose() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Authentic Sad Brass Trombone Slide ("Wah-wah-wah-waaaah")
        // 4 mournful descending steps with resonant brass plunger mute sweep
        const notes = [
            { f: 311.13, targetF: 293.66, dur: 0.28, t: 0.0 },    // Eb4 -> D4
            { f: 293.66, targetF: 277.18, dur: 0.28, t: 0.32 },   // D4 -> Db4
            { f: 277.18, targetF: 261.63, dur: 0.28, t: 0.64 },   // Db4 -> C4
            { f: 261.63, targetF: 196.00, dur: 0.72, t: 0.96 }    // C4 -> G3 long mournful slide!
        ];

        notes.forEach((n, idx) => {
            const startT = now + n.t;
            const endT = startT + n.dur;

            // Dual tone for warm brass trombone body (sawtooth + triangle)
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const brassGain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc1.type = 'sawtooth';
            osc2.type = 'triangle';
            osc1.frequency.setValueAtTime(n.f, startT);
            osc2.frequency.setValueAtTime(n.f * 0.5, startT);

            if (idx === 3) {
                // Longest final note: expressive weeping slide + lip vibrato
                osc1.frequency.linearRampToValueAtTime(n.f * 0.96, startT + 0.22);
                osc1.frequency.exponentialRampToValueAtTime(n.targetF, endT);
                osc2.frequency.exponentialRampToValueAtTime(n.targetF * 0.5, endT);

                // Mournful brass lip vibrato LFO
                const vibrato = this.ctx.createOscillator();
                const vGain = this.ctx.createGain();
                vibrato.frequency.setValueAtTime(6.5, startT + 0.20);
                vGain.gain.setValueAtTime(14, startT + 0.20);
                vibrato.connect(osc1.frequency);
                vibrato.start(startT + 0.20);
                vibrato.stop(endT);
            } else {
                osc1.frequency.linearRampToValueAtTime(n.targetF, endT);
                osc2.frequency.linearRampToValueAtTime(n.targetF * 0.5, endT);
            }

            // Resonant Wah-wah plunger filter sweep (high Q bandpass / lowpass)
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(idx === 3 ? 650 : 780, startT);
            filter.frequency.linearRampToValueAtTime(idx === 3 ? 320 : 420, endT);
            filter.Q.setValueAtTime(4.2, startT);

            brassGain.gain.setValueAtTime(0.001, startT);
            brassGain.gain.linearRampToValueAtTime(idx === 3 ? 0.32 : 0.26, startT + 0.035);
            brassGain.gain.exponentialRampToValueAtTime(0.003, endT);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(brassGain);
            brassGain.connect(this.sfxOut);

            osc1.start(startT);
            osc2.start(startT);
            osc1.stop(endT);
            osc2.stop(endT);
        });

        // 2. Mocking Green Pigs Chuckle & Snort (starts right after the trombone finishes at 1.75s!)
        setTimeout(() => {
            this.playPigMockLaugh();
        }, 1750);
    }
}

window.soundFX = new SoundFX();
