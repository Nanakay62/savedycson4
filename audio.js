/**
 * audio.js — Original, procedurally-generated cinematic score + SFX.
 *
 * IMPORTANT HONESTY NOTE: there is no licensed or pre-recorded orchestral
 * audio here — that isn't something this project has access to. Every note
 * is synthesized live with the Web Audio API: war-drum percussion, brass-
 * style stabs (detuned sawtooth through a bandpass filter), and a sustained
 * bass drone. It's original, dramatic, and — crucially — it always works
 * offline with zero missing files, which was the actual bug being fixed.
 *
 * Architecture:
 *  - Two alternating "buses" (busA / busB) let one theme fade out while the
 *    next fades in, so switching eras never hard-cuts the music.
 *  - A lightweight lookahead scheduler (the standard robust pattern for
 *    precise Web Audio timing) drives whichever bus is currently playing.
 *  - A separate ambient bus layers in continuous filtered noise (wind) that
 *    is independent of the music track and never crossfades away.
 *  - Master gain nodes for BGM and SFX are wired to the Settings sliders.
 */

const THEMES = {
  menu: {
    tempo: 76, drumIntensity: 0.35, brassIntensity: 0.45,
    chords: [[196.00,233.08,293.66],[164.81,196.00,246.94],[174.61,220.00,261.63],[196.00,233.08,293.66]],
    bass:   [98.00, 82.41, 87.31, 98.00]
  },
  era1: { // Patriarchs — sparse, ancient, contemplative
    tempo: 80, drumIntensity: 0.45, brassIntensity: 0.35,
    chords: [[146.83,174.61,220.00],[130.81,164.81,196.00],[174.61,220.00,261.63],[146.83,174.61,220.00]],
    bass:   [73.42, 65.41, 87.31, 73.42]
  },
  era2: { // Exodus & Law — marching, purposeful
    tempo: 88, drumIntensity: 0.65, brassIntensity: 0.55,
    chords: [[164.81,196.00,246.94],[146.83,174.61,220.00],[196.00,233.08,293.66],[164.81,196.00,246.94]],
    bass:   [82.41, 73.42, 98.00, 82.41]
  },
  era3: { // The Kingdom — regal, confident
    tempo: 92, drumIntensity: 0.7, brassIntensity: 0.7,
    chords: [[174.61,220.00,261.63],[196.00,246.94,293.66],[146.83,174.61,220.00],[174.61,220.00,261.63]],
    bass:   [87.31, 98.00, 73.42, 87.31]
  },
  era4: { // Prophets & Exile — dark, tense
    tempo: 84, drumIntensity: 0.75, brassIntensity: 0.5,
    chords: [[138.59,164.81,207.65],[123.47,155.56,196.00],[146.83,174.61,220.00],[138.59,164.81,207.65]],
    bass:   [69.30, 61.74, 73.42, 69.30]
  },
  era5: { // The Gospels — warm, hopeful
    tempo: 82, drumIntensity: 0.4, brassIntensity: 0.6,
    chords: [[196.00,246.94,293.66],[220.00,261.63,329.63],[174.61,220.00,261.63],[196.00,246.94,293.66]],
    bass:   [98.00, 110.00, 87.31, 98.00]
  },
  era6: { // Acts & Epistles — driving, urgent
    tempo: 98, drumIntensity: 0.8, brassIntensity: 0.75,
    chords: [[164.81,196.00,246.94],[184.99,220.00,277.18],[146.83,174.61,220.00],[164.81,196.00,246.94]],
    bass:   [82.41, 92.50, 73.42, 82.41]
  },
  era7: { // Revelation — grand, climactic
    tempo: 100, drumIntensity: 0.9, brassIntensity: 0.9,
    chords: [[174.61,220.00,261.63,329.63],[196.00,246.94,293.66,369.99],[146.83,174.61,220.00,277.18],[174.61,220.00,261.63,329.63]],
    bass:   [87.31, 98.00, 73.42, 87.31]
  },
  stronghold: { // boss-battle intensity for the timeline puzzle
    tempo: 112, drumIntensity: 1.0, brassIntensity: 0.85,
    chords: [[146.83,174.61,220.00],[164.81,196.00,246.94],[130.81,164.81,196.00],[146.83,174.61,220.00]],
    bass:   [73.42, 82.41, 65.41, 73.42]
  }
};

const AudioSystem = {
  ctx: null,
  masterBgm: null, masterSfx: null, ambientGain: null,
  busA: null, busB: null, activeBus: 'A',
  schedulers: { A: null, B: null },
  currentThemeName: null,
  ambientSource: null,
  ready: false,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('[audio] Web Audio unavailable; game will run silently.', e);
      this.ctx = null;
      return;
    }
    this.masterBgm = this.ctx.createGain();
    this.masterBgm.gain.value = Settings.data.bgmVolume;
    this.masterBgm.connect(this.ctx.destination);

    this.masterSfx = this.ctx.createGain();
    this.masterSfx.gain.value = Settings.data.sfxVolume;
    this.masterSfx.connect(this.ctx.destination);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0;
    this.ambientGain.connect(this.masterBgm);

    this.busA = this.ctx.createGain(); this.busA.gain.value = 0; this.busA.connect(this.masterBgm);
    this.busB = this.ctx.createGain(); this.busB.gain.value = 0; this.busB.connect(this.masterBgm);

    // Autoplay policies require a user gesture; catch the first one anywhere.
    const resume = () => { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); };
    ['pointerdown', 'touchstart', 'keydown'].forEach(evt =>
      document.addEventListener(evt, resume, { once: true, passive: true })
    );

    this.ready = true;
  },

  setVolumes(bgmVol, sfxVol) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterBgm.gain.linearRampToValueAtTime(bgmVol, now + 0.15);
    this.masterSfx.gain.linearRampToValueAtTime(sfxVol, now + 0.15);
  },

  resumeThen(cb) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().then(cb).catch(() => {});
    else cb();
  },

  // ---------------- Theme playback with crossfade ----------------

  playTheme(name, fadeTime) {
    if (!this.ctx || !THEMES[name]) return;
    if (name === this.currentThemeName) { this.resumeThen(() => {}); return; }
    this.resumeThen(() => this._crossfadeTo(name, fadeTime || 1.6));
  },

  _crossfadeTo(name, fadeTime) {
    const theme = THEMES[name];
    const incomingKey = this.activeBus === 'A' ? 'B' : 'A';
    const outgoingKey = this.activeBus;
    const incomingBus = incomingKey === 'A' ? this.busA : this.busB;
    const outgoingBus = outgoingKey === 'A' ? this.busA : this.busB;
    const now = this.ctx.currentTime;

    this._stopScheduler(incomingKey);
    incomingBus.gain.cancelScheduledValues(now);
    incomingBus.gain.setValueAtTime(incomingBus.gain.value, now);
    incomingBus.gain.linearRampToValueAtTime(0, now + 0.01);

    this._startScheduler(incomingKey, incomingBus, theme);

    incomingBus.gain.linearRampToValueAtTime(1, now + fadeTime);
    outgoingBus.gain.cancelScheduledValues(now);
    outgoingBus.gain.setValueAtTime(outgoingBus.gain.value, now);
    outgoingBus.gain.linearRampToValueAtTime(0, now + fadeTime);

    setTimeout(() => this._stopScheduler(outgoingKey), fadeTime * 1000 + 150);

    this.activeBus = incomingKey;
    this.currentThemeName = name;
  },

  stop(fadeTime) {
    const ft = fadeTime || 0.4;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      [this.busA, this.busB].forEach(bus => {
        bus.gain.cancelScheduledValues(now);
        bus.gain.setValueAtTime(bus.gain.value, now);
        bus.gain.linearRampToValueAtTime(0, now + ft);
      });
    }
    setTimeout(() => { this._stopScheduler('A'); this._stopScheduler('B'); }, ft * 1000 + 100);
    this.currentThemeName = null;
  },

  _startScheduler(busKey, busNode, theme) {
    const state = { running: true, bar: 0, beat: 0, nextNoteTime: this.ctx.currentTime + 0.1, theme, bus: busNode, timerID: null };
    this.schedulers[busKey] = state;
    const step = () => {
      if (!state.running) return;
      while (state.nextNoteTime < this.ctx.currentTime + 0.12) {
        this._scheduleBeat(state);
        state.nextNoteTime += 60 / theme.tempo;
        state.beat++;
        if (state.beat >= 4) { state.beat = 0; state.bar = (state.bar + 1) % theme.chords.length; }
      }
      state.timerID = setTimeout(step, 25);
    };
    step();
  },

  _stopScheduler(busKey) {
    const state = this.schedulers[busKey];
    if (state) { state.running = false; if (state.timerID) clearTimeout(state.timerID); }
    this.schedulers[busKey] = null;
  },

  _scheduleBeat(state) {
    const { theme, bar, beat, nextNoteTime, bus } = state;
    const time = nextNoteTime;
    const secondsPerBeat = 60 / theme.tempo;

    if (beat === 0 || beat === 2) this._drumHit(bus, time, 'kick', theme.drumIntensity);
    if ((beat === 1 || beat === 3) && theme.drumIntensity > 0.35) {
      this._drumHit(bus, time + secondsPerBeat * 0.5, 'tom', theme.drumIntensity);
    }
    if (beat === 0) this._bassNote(bus, time, theme.bass[bar], secondsPerBeat * 4);
    if (beat === 0 && bar % 2 === 0) this._brassStab(bus, time, theme.chords[bar], theme.brassIntensity);
    if (beat === 2 && bar % 2 === 1 && theme.brassIntensity > 0.3) {
      this._brassStab(bus, time, theme.chords[bar], theme.brassIntensity * 0.55);
    }
  },

  _drumHit(bus, time, type, intensity) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = type === 'kick' ? 60 : 96;
    osc.frequency.setValueAtTime(baseFreq, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, time + 0.22);
    const peak = (type === 'kick' ? 0.9 : 0.5) * intensity;
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (type === 'kick' ? 0.35 : 0.22));
    osc.connect(gain); gain.connect(bus);
    osc.start(time); osc.stop(time + 0.4);

    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = type === 'kick' ? 300 : 700;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime((type === 'kick' ? 0.5 : 0.3) * intensity, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(bus);
    noise.start(time); noise.stop(time + 0.1);
  },

  _bassNote(bus, time, freq, duration) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 220;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.26, time + 0.4);
    gain.gain.setValueAtTime(0.26, time + duration - 0.3);
    gain.gain.linearRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter); filter.connect(gain); gain.connect(bus);
    osc.start(time); osc.stop(time + duration + 0.05);
  },

  _brassStab(bus, time, chordFreqs, intensity) {
    const ctx = this.ctx;
    chordFreqs.forEach(freq => {
      [1, 1.003].forEach(detune => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * detune, time);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 2.2, time);
        filter.Q.value = 1.3;
        const peak = 0.16 * intensity / chordFreqs.length;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(peak, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 1.1);
        osc.connect(filter); filter.connect(gain); gain.connect(bus);
        osc.start(time); osc.stop(time + 1.2);
      });
    });
  },

  // ---------------- One-shot stingers ----------------

  playVictoryStinger() {
    if (!this.ctx) return;
    this.resumeThen(() => {
      const notes = [261.63, 329.63, 392.00, 523.25]; // C major arpeggio, ascending
      let t = this.ctx.currentTime + 0.05;
      notes.forEach((freq, i) => {
        this._brassStab(this.masterBgm, t, [freq], 0.8);
        t += 0.18;
      });
      this._drumHit(this.masterBgm, this.ctx.currentTime + 0.05, 'kick', 0.8);
    });
  },

  playGameOverStinger() {
    if (!this.ctx) return;
    this.resumeThen(() => {
      const notes = [220.00, 196.00, 174.61, 146.83]; // descending minor motif
      let t = this.ctx.currentTime + 0.05;
      notes.forEach(freq => {
        this._bassNote(this.masterBgm, t, freq, 0.6);
        t += 0.42;
      });
    });
  },

  // ---------------- Ambient layer (independent of music, never crossfades away) ----------------

  startAmbient() {
    if (!this.ctx || this.ambientSource) return;
    const ctx = this.ctx;
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5; // brown noise, gentle "wind"
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    source.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.gain.cancelScheduledValues(ctx.currentTime);
    this.ambientGain.gain.setValueAtTime(0, ctx.currentTime);
    this.ambientGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2);
    source.start();
    this.ambientSource = source;
  },

  stopAmbient() {
    if (!this.ctx || !this.ambientSource) return;
    const now = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
    this.ambientGain.gain.linearRampToValueAtTime(0, now + 1.2);
    const src = this.ambientSource;
    setTimeout(() => { try { src.stop(); } catch (e) {} }, 1300);
    this.ambientSource = null;
  },

  // ---------------- SFX ----------------

  sfx: {
    correct() {
      if (!AudioSystem.ctx) return;
      const ctx = AudioSystem.ctx;
      const notes = [880, 1108.73, 1318.51]; // bright ascending chime
      let t = ctx.currentTime;
      notes.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain); gain.connect(AudioSystem.masterSfx);
        osc.start(t); osc.stop(t + 0.25);
        t += 0.07;
      });
    },
    wrong() {
      if (!AudioSystem.ctx) return;
      const ctx = AudioSystem.ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.3);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain); gain.connect(AudioSystem.masterSfx);
      osc.start(t); osc.stop(t + 0.35);
    }
  }
};