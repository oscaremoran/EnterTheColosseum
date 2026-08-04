// The band, the crowd and every noise the arena makes
//
// All of it synthesized at runtime out of oscillators and filtered noise — no
// sample files, so the game stays one page you can open off the disk. The band
// is the one the games really had: cornu, tuba, tibia, hydraulis, and a frame
// drum, each built as a stacked timbre rather than a picked waveform.
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it — ES modules are blocked over file://.
//
// Unlike the other files in here this one is NOT content: it owns live state —
// the AudioContext, its buses, the running sequencer and the crowd bed — and it
// is the only thing in the game that does. What it does not own is the arena:
// nothing below reads the canvas, the DOM or a single variable belonging to the
// fight. It is told what to play and it plays it. The two toggle buttons live
// in the engine, but the on/off settings themselves live here, next to the
// sound they govern, so this file remembers its own state across a reload.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});

  // ---- Settings ----
  // Kept here rather than with the engine's other storage keys: they are this
  // file's own memory, and nothing outside needs to know how they persist.
  const SOUND_KEY = "dodger_sound";
  const MUSIC_KEY = "dodger_music";
  let soundOn = localStorage.getItem(SOUND_KEY) !== "off";
  let musicOn = localStorage.getItem(MUSIC_KEY) !== "off";
  let actx = null;

  // The engine hangs its button-refresh here. Called only when the context
  // fails to open at all and the settings are forced off behind the player's
  // back — the buttons have to stop claiming the sound is on.
  let onDisabled = null;

  // ---- Sound ----
  // Everything is synthesized at runtime — no files, so the game stays one page.
  // The context is created on the first real interaction, because browsers won't
  // let it start before one.
  let masterGain = null, sfxBus = null, musicBus = null, noiseBuf = null;

  function ensureAudio() {
    if (actx) return true;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = actx.createGain();
      masterGain.gain.value = 0.9;
      masterGain.connect(actx.destination);
      sfxBus = actx.createGain();
      sfxBus.gain.value = 1;
      sfxBus.connect(masterGain);
      musicBus = actx.createGain();
      musicBus.gain.value = 0;      // faded in when a theme starts
      musicBus.connect(masterGain);
      // One second of white noise, reused by every percussive voice.
      noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) {
      actx = null;
      soundOn = false; musicOn = false;
      if (onDisabled) onDisabled();
      return false;
    }
  }
  function resumeAudio() {
    if (!ensureAudio()) return false;
    if (actx.state === "suspended") actx.resume();
    return true;
  }

  // ---- Voice primitives ----
  // A pitched blip with an optional second detuned copy for weight.
  function tone(o) {
    const t0 = o.t0 != null ? o.t0 : actx.currentTime;
    const dest = o.dest || sfxBus;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = o.type || "square";
    osc.frequency.setValueAtTime(o.from, t0);
    if (o.to && o.to !== o.from) {
      // exponentialRamp can't touch zero, and refuses to cross it.
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + o.dur);
    }
    if (o.detune) osc.detune.setValueAtTime(o.detune, t0);
    let node = osc;
    if (o.filter) {
      const f = actx.createBiquadFilter();
      f.type = o.filter;
      f.frequency.setValueAtTime(o.fFrom || 2000, t0);
      if (o.fTo) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.fTo), t0 + o.dur);
      f.Q.value = o.q || 1;
      node.connect(f);
      node = f;
    }
    const atk = o.atk != null ? o.atk : 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    node.connect(g).connect(dest);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.03);
    return osc;
  }
  // Filtered noise — the body of every hit, impact and hi-hat.
  function noise(o) {
    const t0 = o.t0 != null ? o.t0 : actx.currentTime;
    const dest = o.dest || sfxBus;
    const src = actx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = actx.createBiquadFilter();
    f.type = o.filter || "bandpass";
    f.frequency.setValueAtTime(o.fFrom || 1200, t0);
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.fTo), t0 + o.dur);
    f.Q.value = o.q || 1;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), t0 + (o.atk || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t0);
    src.stop(t0 + o.dur + 0.03);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---- Instruments ----
  // The games had a real band, and we know what was in it: the cornu (a big
  // circular horn), the tuba (a straight war trumpet), the tibia (a double reed
  // played in pairs) and the hydraulis — a water organ, which is the one detail
  // people never believe. A relief from Zliten shows all four playing over a
  // fight. Each of these builds a genuine timbre out of stacked oscillators
  // rather than picking an oscillator type, which is what finally makes eighteen
  // themes sound like eighteen different things instead of one synth.
  //
  // Signature: (f, t0, dur, gain, dest, opt) -> void
  function adsr(g, t0, dur, peak, atk, dec) {
    // exponentialRamp can't reach zero, so everything floors at 0.0001.
    const p = Math.max(0.0002, peak);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(p, t0 + atk);
    if (dec != null && dec < dur) {
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, p * 0.55), t0 + dec);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  function osc(type, f, t0, dur, detune) {
    const o = actx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (detune) o.detune.setValueAtTime(detune, t0);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
    return o;
  }

  const INSTRUMENTS = {
    // Cornu — the deep circular horn. Brass gets its character from the filter
    // opening on the attack and closing again, not from the waveform.
    cornu(f, t0, dur, gain, dest) {
      const g = actx.createGain();
      const lp = actx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 1.6;
      lp.frequency.setValueAtTime(Math.max(90, f * 1.1), t0);
      lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 5), t0 + 0.07);
      lp.frequency.exponentialRampToValueAtTime(Math.max(120, f * 2), t0 + dur);
      osc("sawtooth", f, t0, dur).connect(lp);
      osc("sawtooth", f, t0, dur, 8).connect(lp);
      osc("sine", f * 0.5, t0, dur).connect(lp);        // the horn's long body
      adsr(g, t0, dur, gain, 0.045, dur * 0.5);
      lp.connect(g).connect(dest);
    },
    // Tuba — the straight trumpet that called the bouts. Brighter, harder onset.
    tuba(f, t0, dur, gain, dest) {
      const g = actx.createGain();
      const lp = actx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 2.2;
      lp.frequency.setValueAtTime(Math.max(150, f * 2), t0);
      lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 8), t0 + 0.025);
      lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 3), t0 + dur);
      osc("sawtooth", f, t0, dur).connect(lp);
      osc("square", f * 2, t0, dur, -6).connect(lp);
      adsr(g, t0, dur, gain, 0.015, dur * 0.4);
      lp.connect(g).connect(dest);
    },
    // Hydraulis — the water organ. Additive pipes, near-instant attack, flat
    // sustain, and two ranks a few cents apart so it choruses like real pipework.
    hydraulis(f, t0, dur, gain, dest) {
      const g = actx.createGain();
      const lp = actx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = Math.min(7000, f * 9);
      // Pipe ranks: unison, octave, twelfth, fifteenth — the classic organ stack.
      [[1, 1], [2, 0.5], [3, 0.28], [4, 0.16]].forEach(([mult, amp]) => {
        const s = actx.createGain();
        s.gain.value = amp;
        osc("sine", f * mult, t0, dur).connect(s);
        osc("sine", f * mult, t0, dur, 7).connect(s);   // the second rank
        s.connect(lp);
      });
      const reed = actx.createGain();
      reed.gain.value = 0.12;
      osc("square", f, t0, dur).connect(reed);
      reed.connect(lp);
      adsr(g, t0, dur, gain, 0.012, null);
      lp.connect(g).connect(dest);
    },
    // Tibia — the double reed. Nasal, and it wavers, because a human is blowing it.
    tibia(f, t0, dur, gain, dest) {
      const g = actx.createGain();
      const bp = actx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = Math.min(5000, f * 2.6);
      bp.Q.value = 3.2;
      const o1 = osc("sawtooth", f, t0, dur);
      const o2 = osc("triangle", f, t0, dur, 11);
      // Vibrato, deliberately a touch uneven in rate between the two pipes.
      const lfo = actx.createOscillator();
      lfo.frequency.value = 5.4;
      const lg = actx.createGain();
      lg.gain.value = 13;
      lfo.connect(lg);
      lg.connect(o1.detune);
      lg.connect(o2.detune);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.03);
      o1.connect(bp); o2.connect(bp);
      adsr(g, t0, dur, gain, 0.03, dur * 0.6);
      bp.connect(g).connect(dest);
    },
    // Lyra — plucked gut. All attack and decay, no sustain to speak of.
    lyra(f, t0, dur, gain, dest) {
      const g = actx.createGain();
      const lp = actx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(Math.min(9000, f * 7), t0);
      lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 2), t0 + dur);
      osc("triangle", f, t0, dur).connect(lp);
      osc("sine", f * 2, t0, dur).connect(lp);
      const g2 = actx.createGain();
      g2.gain.value = 0.35;
      osc("sawtooth", f, t0, Math.min(dur, 0.05)).connect(g2);   // the pluck itself
      g2.connect(lp);
      adsr(g, t0, dur, gain, 0.003, dur * 0.18);
      lp.connect(g).connect(dest);
    },
  };
  // Percussion. The tympanum is a frame drum; the scabellum was a clapper strapped
  // to the tibia player's foot, which is how the band kept time.
  const PERCUSSION = {
    tympanum(t0, gain, dest, accent) {
      tone({ t0, dest, type: "sine", from: accent ? 105 : 92, to: 46,
             dur: 0.26, gain: 0.55 * gain });
      noise({ t0, dest, filter: "lowpass", fFrom: 900, fTo: 160, dur: 0.1, gain: 0.2 * gain });
    },
    kick(t0, gain, dest) {
      tone({ t0, dest, type: "sine", from: 130, to: 42, dur: 0.18, gain: 0.5 * gain });
      noise({ t0, dest, filter: "lowpass", fFrom: 700, fTo: 100, dur: 0.07, gain: 0.16 * gain });
    },
    scabellum(t0, gain, dest) {
      noise({ t0, dest, filter: "highpass", fFrom: 3400, dur: 0.03, gain: 0.22 * gain });
      tone({ t0, dest, type: "square", from: 420, to: 180, dur: 0.035, gain: 0.09 * gain });
    },
    cymbala(t0, gain, dest) {
      // Small bronze finger-cymbals: metallic, and they ring.
      noise({ t0, dest, filter: "bandpass", fFrom: 6200, dur: 0.3, gain: 0.12 * gain, q: 1.4 });
      noise({ t0, dest, filter: "highpass", fFrom: 9000, dur: 0.16, gain: 0.09 * gain });
    },
    hat(t0, gain, dest, accent) {
      noise({ t0, dest, filter: "highpass", fFrom: 7000, dur: 0.035,
              gain: (accent ? 0.10 : 0.06) * gain });
    },
  };

  // ---- One-shot effects ----
  // Each is a small stack of voices rather than a single ramp, so repeated hits
  // don't sound identical and impacts have both a click and a body.
  const SFX = {
    pickup(t0) {
      // Bright two-note lift, slightly randomized so a run of pickups sparkles.
      const f = rnd(600, 700);
      tone({ t0, type: "triangle", from: f, to: f, dur: 0.09, gain: 0.16 });
      tone({ t0: t0 + 0.07, type: "triangle", from: f * 1.5, to: f * 1.5, dur: 0.16, gain: 0.14 });
      tone({ t0: t0 + 0.07, type: "sine", from: f * 3, to: f * 3, dur: 0.12, gain: 0.05 });
    },
    hit(t0) {
      // Click, thump, and a short burst of grit.
      noise({ t0, filter: "highpass", fFrom: 3000, dur: 0.05, gain: 0.28 });
      tone({ t0, type: "sawtooth", from: rnd(280, 330), to: 70, dur: 0.26, gain: 0.24,
             filter: "lowpass", fFrom: 2200, fTo: 320 });
      noise({ t0, filter: "bandpass", fFrom: 900, fTo: 180, q: 1.4, dur: 0.2, gain: 0.16 });
    },
    death(t0) {
      noise({ t0, filter: "highpass", fFrom: 2600, dur: 0.09, gain: 0.3 });
      tone({ t0, type: "sawtooth", from: 240, to: 32, dur: 0.9, gain: 0.26,
             filter: "lowpass", fFrom: 1800, fTo: 140 });
      tone({ t0: t0 + 0.02, type: "square", from: 120, to: 24, dur: 0.85, gain: 0.14 });
      noise({ t0, filter: "lowpass", fFrom: 700, fTo: 90, dur: 0.7, gain: 0.2 });
    },
    clear(t0) {
      // Rising major triad — the "that's done" sound.
      [0, 4, 7].forEach((s, i) => {
        const f = 440 * Math.pow(2, s / 12);
        tone({ t0: t0 + i * 0.055, type: "triangle", from: f, to: f, dur: 0.34, gain: 0.15 });
      });
      noise({ t0, filter: "highpass", fFrom: 4000, dur: 0.14, gain: 0.12 });
    },
    phase(t0) {
      // Downward sweep under a swell — used when a final boss changes gear.
      tone({ t0, type: "sawtooth", from: 520, to: 90, dur: 0.6, gain: 0.18,
             filter: "lowpass", fFrom: 3000, fTo: 400 });
      tone({ t0, type: "square", from: 65, to: 65, dur: 0.7, gain: 0.14, atk: 0.2 });
      noise({ t0, filter: "bandpass", fFrom: 300, fTo: 2600, q: 0.8, dur: 0.55, gain: 0.14 });
    },
    win(t0) {
      [0, 4, 7, 12].forEach((s, i) => {
        const f = 523.25 * Math.pow(2, s / 12);
        tone({ t0: t0 + i * 0.1, type: "triangle", from: f, to: f, dur: 0.55, gain: 0.16 });
        tone({ t0: t0 + i * 0.1, type: "sine", from: f * 2, to: f * 2, dur: 0.4, gain: 0.06 });
      });
    },
    // Dialogue: a soft tick per advance, and a countdown blip before play resumes.
    talk(t0) {
      tone({ t0, type: "sine", from: rnd(760, 900), to: rnd(500, 600), dur: 0.07, gain: 0.07 });
    },
    tick(t0) {
      tone({ t0, type: "square", from: 700, to: 700, dur: 0.07, gain: 0.10 });
    },
    go(t0) {
      tone({ t0, type: "square", from: 1050, to: 1050, dur: 0.16, gain: 0.13 });
    },
  };

  function sfx(kind, when) {
    if (!soundOn || !SFX[kind]) return;
    if (!resumeAudio()) return;
    try { SFX[kind](when != null ? when : actx.currentTime); } catch (e) { /* keep playing silently */ }
  }

  // ---- Music ----
  // Each boss gets a theme built from a step sequencer scheduled a little ahead of
  // the clock. Act I themes are warm and keep a pulse; Act II detunes and loses it.
  // Easier forms share their act's tier theme; the ones with a real identity get
  // their own.
  const SCALE = {
    minor: [0, 2, 3, 5, 7, 8, 10], phryg: [0, 1, 3, 5, 7, 8, 10], whole: [0, 2, 4, 6, 8, 10],
    // Two more for the armatura themes. Harmonic minor's raised seventh is the
    // sound most people hear as "ancient"; the pentatonic leaves gaps to breathe.
    harm: [0, 2, 3, 5, 7, 8, 11], penta: [0, 3, 5, 7, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  };

  const THEMES = {
    // --- Act I: the furnace. Rooted, driving, warm sawtooth. ---
    ember: {
      // the forge gets a horn over it and a frame drum under it
      callVoice: "cornu", perc: "tympanum",
      call: [0, null, null, null, null, null, null, null, null, null, 3, null, null, null, null, null],
      bpm: 132, root: 55, scale: SCALE.minor, gain: 0.5,
      bass: [0, null, 0, null, 3, null, 0, null, 5, null, 3, null, 0, null, -2, null],
      arp:  [7, 10, 12, 10, 7, 5, 7, 12, 14, 12, 10, 7, 5, 7, 10, 12],
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
      hat:  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1],
      bassType: "sawtooth", arpType: "square", arpGain: 0.055, warm: true,
    },
    // --- Act II: the gap. No kick, detuned pads, arp thins out. ---
    gap: {
      // a single reed in the empty places between acts
      arpVoice: "tibia",
      bpm: 96, root: 49, scale: SCALE.phryg, gain: 0.5,
      bass: [0, null, null, null, -5, null, null, null, -2, null, null, null, -7, null, null, null],
      arp:  [12, null, 15, null, 14, null, 12, null, 10, null, 12, null, 15, null, 17, null],
      kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hat:  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      bassType: "sine", arpType: "triangle", arpGain: 0.06, detune: 14, pad: true,
    },
    // --- Bespoke: Hades. Same key as ember, faster, heavier, relentless. ---
    hades: {
      // war trumpet and drum: the loudest the band gets
      callVoice: "tuba", perc: "tympanum", bassVoice: "cornu",
      call: [0, null, null, null, null, null, 7, null, null, null, null, null, 5, null, 3, null],
      bpm: 154, root: 41, scale: SCALE.minor, gain: 0.62,
      bass: [0, 0, null, 0, 0, null, 3, null, 0, 0, null, 0, 5, null, 3, 2],
      arp:  [12, 15, 19, 15, 12, 15, 19, 22, 24, 22, 19, 15, 12, 15, 19, 15],
      kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1],
      hat:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      bassType: "sawtooth", arpType: "sawtooth", arpGain: 0.05, warm: true, lead: true,
    },
    // --- Bespoke: the Void. Whole-tone, no root movement, everything drifts. ---
    void: {
      bpm: 84, root: 37, scale: SCALE.whole, gain: 0.66,
      bass: [0, null, null, null, null, null, null, null, 0, null, null, null, null, null, null, null],
      arp:  [12, null, 18, null, 12, null, 6, null, 12, null, 18, null, 24, null, 18, null],
      kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hat:  [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      bassType: "sine", arpType: "sine", arpGain: 0.07, detune: 26, pad: true, tritone: true,
    },
    // --- Bespoke: Mirror. The arp is answered by its own inversion, half a bar late. ---
    mirror: {
      // plucked, so the canon reads as two players and not one patch
      arpVoice: "lyra",
      bpm: 104, root: 49, scale: SCALE.phryg, gain: 0.52,
      bass: [0, null, null, null, 0, null, null, null, -5, null, null, null, -5, null, null, null],
      arp:  [12, 14, 15, 17, 19, 17, 15, 14, 12, 14, 15, 17, 19, 17, 15, 14],
      kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hat:  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      bassType: "triangle", arpType: "triangle", arpGain: 0.055, detune: 8, canon: true, pad: true,
    },
    // --- Bespoke: Pulsar. Strict metronome, one note, everything on the count. ---
    pulsar: {
      // the organ holding one note while the clapper keeps the time
      arpVoice: "hydraulis", hatVoice: "scabellum",
      bpm: 112, root: 45, scale: SCALE.minor, gain: 0.54,
      bass: [0, null, null, null, 0, null, null, null, 0, null, null, null, 0, null, null, null],
      arp:  [12, null, null, null, 12, null, null, null, 12, null, null, 19, 12, null, null, null],
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      hat:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      bassType: "square", arpType: "square", arpGain: 0.05, pad: true,
    },
  };

  // ---- One theme per armatura ----
  // A ladder bout is a named person with a known way of fighting, so it gets its
  // own music rather than the pattern's. Each is written off what the fighter
  // physically is: a horseman gallops, a shield man plods, an archer keeps time,
  // and the blind man's theme has no pulse to keep time by at all.
  Object.assign(THEMES, {
    // Eques — the gallop. Triplet-feel kick, light and quick, opens the games.
    eques: {
      // the horseman opens the games, so he gets the fanfare: trumpet over horn
      arpVoice: "tuba", bassVoice: "cornu", hatVoice: "scabellum", callVoice: "cornu",
      call: [0, null, null, null, null, null, null, null, 4, null, null, null, null, null, null, null],
      bpm: 152, root: 52, scale: SCALE.dorian, gain: 0.5,
      bass: [0, null, 0, 0, null, 0, 4, null, 5, null, 5, 4, null, 2, 0, null],
      arp:  [12, 14, 16, 14, 12, 16, 19, 16, 14, 16, 19, 21, 19, 16, 14, 12],
      kick: [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0],
      hat:  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1],
      bassType: "triangle", arpType: "square", arpGain: 0.05, warm: true,
    },
    // Thraex — the curved sica. Everything bends; the arp never sits still.
    thraex: {
      // the reed pipe bends and wavers the way his sica does
      arpVoice: "tibia",
      bpm: 118, root: 50, scale: SCALE.phryg, gain: 0.52,
      bass: [0, null, null, 1, null, 0, null, null, -2, null, null, -1, null, -2, null, null],
      arp:  [12, 13, 15, 13, 12, 10, 8, 10, 12, 15, 17, 15, 13, 12, 10, 8],
      kick: [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
      hat:  [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1],
      bassType: "sawtooth", arpType: "triangle", arpGain: 0.055, detune: 9, warm: true,
    },
    // Murmillo — a stone and a half of shield. Slow, low, immovable, and heavy on
    // the downbeat because that is the only place he can be.
    murmillo: {
      // all brass and frame drum — the heaviest thing in the band for the heaviest man on the sand
      arpVoice: "cornu", bassVoice: "cornu", perc: "tympanum", callVoice: "cornu",
      call: [0, null, null, null, null, null, null, null, null, null, null, null, -2, null, null, null],
      bpm: 88, root: 38, scale: SCALE.minor, gain: 0.6,
      bass: [0, null, null, null, 0, null, null, null, -4, null, null, null, -4, null, 0, null],
      arp:  [7, null, null, 7, null, null, 10, null, 7, null, null, 5, null, null, 7, null],
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      hat:  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      bassType: "sawtooth", arpType: "square", arpGain: 0.045, warm: true,
    },
    // Hoplomachus — the spear. Patient, held at range, nothing wasted.
    hoplomachus: {
      // plucked and spare, held at arm's length like his spear
      arpVoice: "lyra", bassVoice: "cornu", hatVoice: "scabellum",
      bpm: 104, root: 45, scale: SCALE.penta, gain: 0.5,
      bass: [0, null, null, null, null, null, 3, null, 0, null, null, null, null, null, 2, null],
      arp:  [10, null, null, 12, null, null, 10, null, 7, null, null, 10, null, null, 12, null],
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      hat:  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      bassType: "sine", arpType: "triangle", arpGain: 0.06, pad: true,
    },
    // Secutor — the chaser. He does not stop, so neither does the hat.
    secutor: {
      // the trumpet that will not stop calling
      arpVoice: "tuba", bassVoice: "cornu", perc: "kick",
      call: [null, null, null, null, null, null, null, null, 0, null, null, null, 3, null, null, null],
      bpm: 160, root: 43, scale: SCALE.harm, gain: 0.58,
      bass: [0, 0, null, 0, 0, null, 0, 0, 4, null, 4, null, 3, null, 1, 0],
      arp:  [12, 15, 19, 15, 12, 15, 20, 15, 12, 15, 19, 23, 20, 19, 15, 12],
      kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      hat:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      bassType: "sawtooth", arpType: "sawtooth", arpGain: 0.05, warm: true, lead: true,
    },
    // Retiarius — the net. Whole-tone drift, nothing to grab onto, then it closes.
    retiarius: {
      // the water organ, for the man with the net — nothing to grip
      arpVoice: "hydraulis", bassVoice: "hydraulis", arpLong: true,
      bpm: 100, root: 41, scale: SCALE.whole, gain: 0.54,
      bass: [0, null, null, null, 2, null, null, null, 0, null, null, null, -2, null, null, null],
      arp:  [12, null, 14, 16, null, 14, 12, null, 10, null, 12, 14, null, 12, 10, null],
      kick: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
      hat:  [0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1],
      bassType: "sine", arpType: "sine", arpGain: 0.065, detune: 18, pad: true,
    },
    // Dimachaerus — two swords. The arp answers itself; canon does the rest.
    dimachaerus: {
      // two plucked voices answering each other, one per sword
      arpVoice: "lyra", hatVoice: "scabellum",
      bpm: 126, root: 47, scale: SCALE.phryg, gain: 0.54,
      bass: [0, null, 0, null, -5, null, -5, null, -3, null, -3, null, 0, null, 0, null],
      arp:  [12, 14, 16, 17, 19, 17, 16, 14, 12, 14, 16, 17, 19, 17, 16, 14],
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
      hat:  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      bassType: "triangle", arpType: "square", arpGain: 0.05, canon: true, detune: 7,
    },
    // Provocator — the breastplate. The slowest thing on the board.
    provocator: {
      // the slowest brass in the book, for the only man in a breastplate
      arpVoice: "cornu", bassVoice: "cornu", perc: "tympanum", bassLong: true,
      bpm: 76, root: 36, scale: SCALE.minor, gain: 0.62,
      bass: [0, null, null, null, null, null, null, null, -5, null, null, null, null, null, null, null],
      arp:  [7, null, null, null, 10, null, null, null, 7, null, null, null, 3, null, null, null],
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      hat:  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      bassType: "sawtooth", arpType: "sine", arpGain: 0.055, pad: true, warm: true,
    },
    // Scissor — the crescent welded to his arm. Tritones and hooks.
    scissor: {
      // the reed at its most nasal, hooking like the blade
      arpVoice: "tibia", perc: "tympanum",
      bpm: 132, root: 44, scale: SCALE.whole, gain: 0.56,
      bass: [0, null, 3, null, 0, null, 3, null, 1, null, 4, null, 1, null, 4, null],
      arp:  [12, 15, 18, 15, 12, 9, 12, 18, 21, 18, 15, 12, 9, 12, 15, 18],
      kick: [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0],
      hat:  [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1],
      bassType: "square", arpType: "sawtooth", arpGain: 0.048, tritone: true,
    },
    // Sagittarius — the archer. A metronome you can set your watch by, because
    // every shaft is aimed and nothing is improvised.
    sagittarius: {
      // plucked, and exactly on the count — every shaft is aimed
      arpVoice: "lyra", hatVoice: "scabellum",
      bpm: 140, root: 48, scale: SCALE.penta, gain: 0.52,
      bass: [0, null, null, null, 0, null, null, null, 0, null, null, null, 0, null, null, null],
      arp:  [12, null, 12, null, 15, null, 15, null, 17, null, 17, null, 15, null, 12, null],
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      hat:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      bassType: "square", arpType: "square", arpGain: 0.05,
    },
    // Bestiarius — he brings the beasts. Low, irregular, growling underneath.
    bestiarius: {
      // drums and a low reed: this is the beast-hunt band
      arpVoice: "tibia", bassVoice: "cornu", perc: "tympanum",
      bpm: 122, root: 34, scale: SCALE.phryg, gain: 0.6,
      bass: [0, 0, null, 1, null, null, 0, 0, null, -1, null, 0, 0, null, 1, null],
      arp:  [7, null, 8, null, 7, null, 5, null, 7, null, 10, null, 8, null, 7, null],
      kick: [1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1],
      hat:  [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1],
      bassType: "sawtooth", arpType: "triangle", arpGain: 0.05, detune: 12, warm: true,
    },
    // Andabata — fought blind in a closed helm. No kick at all: there is no beat
    // to orient yourself by, which is the whole point of him.
    andabata: {
      // the organ alone in the dark. No drum, because he has no beat to find either
      arpVoice: "hydraulis", bassVoice: "hydraulis", arpLong: true,
      bpm: 68, root: 37, scale: SCALE.whole, gain: 0.66,
      bass: [0, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      arp:  [12, null, null, 13, null, null, null, 11, null, null, 12, null, null, null, 10, null],
      kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hat:  [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      bassType: "sine", arpType: "sine", arpGain: 0.075, detune: 30, pad: true, tritone: true,
    },
  });

  // Which theme each of the 14 forms plays. The plain forms reuse their act's tier.
  const THEME_BY_KEY = {
    pursuer: "ember", nova: "ember", charger: "ember", spiral: "ember",
    gatling: "ember", lattice: "ember", hades: "hades",
    weaver: "gap", serpent: "gap", cross: "gap", swarm: "gap",
    mirror: "mirror", pulsar: "pulsar", void: "void",
  };

  const music = { name: null, theme: null, step: 0, nextTime: 0, timer: null, intensity: 1 };
  const LOOKAHEAD = 0.12;   // seconds of notes scheduled ahead of the clock

  // ---- The crowd ----
  // Fifty thousand people is not silence, and it is not steady either. A bandpassed
  // noise bed with a slow wander, whose level tracks the fight: it swells as your
  // opponent's health falls, jumps when blood is drawn, and goes quiet at the very
  // start of a bout the way a real crowd does before the first exchange.
  let crowdSrc = null, crowdGain = null, crowdFilt = null, crowdLfo = null;
  let crowdWant = 0;     // where the level should be, set from the game loop
  let crowdSurgeV = 0;   // a decaying spike on top, from hits and kills
  const CROWD_MAX = 0.5;

  function startCrowd() {
    if (!musicOn || !resumeAudio() || crowdSrc) return;
    try {
      crowdSrc = actx.createBufferSource();
      crowdSrc.buffer = noiseBuf;
      crowdSrc.loop = true;
      // Two filters: a bandpass for the "voices" formant, then a lowpass to take
      // the hiss off so it reads as a mass of people rather than static.
      crowdFilt = actx.createBiquadFilter();
      crowdFilt.type = "bandpass";
      crowdFilt.frequency.value = 720;
      crowdFilt.Q.value = 0.55;
      const lp = actx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2100;
      crowdGain = actx.createGain();
      crowdGain.gain.value = 0.0001;
      // A slow wander through the formant so it never sits still.
      crowdLfo = actx.createOscillator();
      crowdLfo.frequency.value = 0.09;
      const lg = actx.createGain();
      lg.gain.value = 190;
      crowdLfo.connect(lg).connect(crowdFilt.frequency);
      crowdLfo.start();
      crowdSrc.connect(crowdFilt).connect(lp).connect(crowdGain).connect(masterGain);
      crowdSrc.start();
    } catch (e) {
      crowdSrc = null;
    }
  }
  function stopCrowd() {
    if (!crowdSrc) return;
    try {
      const now = actx.currentTime;
      crowdGain.gain.cancelScheduledValues(now);
      crowdGain.gain.setValueAtTime(Math.max(0.0001, crowdGain.gain.value), now);
      crowdGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      crowdSrc.stop(now + 0.7);
      if (crowdLfo) crowdLfo.stop(now + 0.7);
    } catch (e) { /* already gone */ }
    crowdSrc = null; crowdGain = null; crowdFilt = null; crowdLfo = null;
    crowdWant = 0; crowdSurgeV = 0;
  }
  // Called from the game loop: 0 = polite silence, 1 = they are on their feet.
  function setCrowd(v) { crowdWant = Math.max(0, Math.min(1, v)); }
  // A moment worth reacting to.
  function crowdSurge(v) { crowdSurgeV = Math.min(1.4, crowdSurgeV + v); }
  // Smoothed on the music clock so it breathes instead of stepping.
  function crowdTick() {
    if (!crowdSrc || !crowdGain) return;
    crowdSurgeV *= 0.94;
    const level = Math.min(1.5, crowdWant + crowdSurgeV);
    const now = actx.currentTime;
    crowdGain.gain.setTargetAtTime(Math.max(0.0001, level * CROWD_MAX), now, 0.28);
    // Excitement brightens them: a roar sits higher than a murmur.
    if (crowdFilt) crowdFilt.frequency.setTargetAtTime(620 + level * 520, now, 0.4);
  }

  function midiToFreq(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  // Degrees are scale steps, so a pattern transposes correctly into any mode.
  function degToMidi(root, scale, deg) {
    const oct = Math.floor(deg / scale.length);
    let i = deg % scale.length;
    if (i < 0) i += scale.length;
    return root + oct * 12 + scale[i];
  }

  function scheduleStep(th, step, t) {
    const bus = musicBus;
    const g = th.gain;
    const beat = 60 / th.bpm / 2;   // one step is an eighth note
    const inten = music.intensity;  // rises in a final boss's second phase

    const b = th.bass[step % th.bass.length];
    if (b != null) {
      const f = midiToFreq(degToMidi(th.root, th.scale, b));
      // A theme naming a real instrument gets it; the older themes fall through to
      // the plain filtered oscillator they were written for.
      const inst = INSTRUMENTS[th.bassVoice];
      if (inst) {
        inst(f, t, beat * (th.bassLong ? 3.4 : 1.9), 0.14 * g, bus);
      } else {
        tone({ t0: t, dest: bus, type: th.bassType, from: f, to: f, dur: beat * 1.8,
               gain: 0.13 * g, filter: "lowpass", fFrom: th.warm ? 900 : 500, q: 1.2 });
        if (th.detune) {
          tone({ t0: t, dest: bus, type: th.bassType, from: f, to: f, dur: beat * 1.8,
                 gain: 0.09 * g, detune: th.detune, filter: "lowpass", fFrom: 600 });
        }
      }
    }

    const a = th.arp[step % th.arp.length];
    if (a != null) {
      const md = degToMidi(th.root, th.scale, a) + (th.tritone && step % 8 >= 4 ? 6 : 0);
      const f = midiToFreq(md);
      const inst = INSTRUMENTS[th.arpVoice];
      const dur = beat * (th.pad ? 3.2 : th.arpLong ? 1.9 : 0.9);
      if (inst) {
        inst(f, t, dur, th.arpGain * 1.5 * g * inten, bus);
      } else {
        tone({ t0: t, dest: bus, type: th.arpType, from: f, to: f, dur: dur,
               gain: th.arpGain * g * inten, atk: th.pad ? 0.08 : 0.005,
               filter: "lowpass", fFrom: th.warm ? 3200 : 1800, fTo: th.pad ? 700 : null });
        if (th.detune) {
          tone({ t0: t, dest: bus, type: th.arpType, from: f, to: f, dur: beat * 3.2,
                 gain: th.arpGain * 0.7 * g, detune: -th.detune, atk: 0.1,
                 filter: "lowpass", fFrom: 1400 });
        }
      }
      // Mirror answers itself: the same line, inverted, half a bar behind.
      if (th.canon) {
        const inv = midiToFreq(degToMidi(th.root, th.scale, 24 - a));
        const ci = INSTRUMENTS[th.arpVoice];
        if (ci) ci(inv, t + beat * 8, beat * 2.4, th.arpGain * 0.8 * g, bus);
        else tone({ t0: t + beat * 8, dest: bus, type: th.arpType, from: inv, to: inv,
                    dur: beat * 2.4, gain: th.arpGain * 0.55 * g, atk: 0.06,
                    filter: "lowpass", fFrom: 1600 });
      }
      // Hades carries an octave lead over the top once he's relit.
      if (th.lead && inten > 1) {
        tone({ t0: t, dest: bus, type: "square", from: f * 2, to: f * 2, dur: beat * 0.7,
               gain: 0.03 * g, filter: "lowpass", fFrom: 4000 });
      }
    }

    // A horn call laid over the top of the bar — the cornu announcing, which is
    // what it was actually for. Only on themes that ask for it.
    if (th.callVoice && th.call) {
      const c = th.call[step % th.call.length];
      if (c != null) {
        const inst = INSTRUMENTS[th.callVoice] || INSTRUMENTS.cornu;
        inst(midiToFreq(degToMidi(th.root, th.scale, c)), t, beat * 3.6,
             0.075 * g * inten, bus);
      }
    }

    const percKit = th.perc || "kick";
    if (th.kick[step % th.kick.length]) {
      (PERCUSSION[percKit] || PERCUSSION.kick)(t, g, bus, step % 8 === 0);
    }
    if (th.hat[step % th.hat.length]) {
      (PERCUSSION[th.hatVoice] || PERCUSSION.hat)(t, g, bus, step % 4 === 0);
    }
    // Once a fight is nearly over the band leans on the cymbals. Driven by the
    // same intensity value the final-boss phase change raises.
    if (inten > 1.15 && step % 4 === 2) {
      PERCUSSION.cymbala(t, g * 0.7 * (inten - 1), bus);
    }
  }

  function musicTick() {
    if (!actx || !music.theme) return;
    crowdTick();
    const beat = 60 / music.theme.bpm / 2;
    while (music.nextTime < actx.currentTime + LOOKAHEAD) {
      if (music.nextTime < actx.currentTime) music.nextTime = actx.currentTime + 0.02;
      try { scheduleStep(music.theme, music.step, music.nextTime); } catch (e) { /* skip a step */ }
      music.step++;
      music.nextTime += beat;
    }
  }

  // Start the theme for a pattern key. Re-calling with the same theme is a no-op,
  // so chaining two stages that share a tier doesn't restart the loop.
  // A named ladder fighter brings their own theme; anything else plays the tier
  // its attack pattern belongs to.
  function startMusic(key, armKey) {
    if (!musicOn) return;
    const name = (armKey && THEMES[armKey] ? armKey : null) || THEME_BY_KEY[key] || "ember";
    if (music.name === name && music.timer) { setMusicIntensity(1); return; }
    if (!resumeAudio()) return;
    // A crossfade rather than a cut. Notes already scheduled from the outgoing
    // theme ring out over the incoming one, which is what makes moving between
    // two bouts sound like the band changing pieces instead of a tape splice.
    const was = music.timer ? musicBus.gain.value : 0;
    if (music.timer) { clearInterval(music.timer); music.timer = null; }
    music.name = name;
    music.theme = THEMES[name];
    music.step = 0;
    music.intensity = 1;
    music.nextTime = actx.currentTime + 0.05;
    const now = actx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(Math.max(0.0001, was * 0.6), now);
    musicBus.gain.linearRampToValueAtTime(1, now + (was ? 0.8 : 1.2));
    music.timer = setInterval(musicTick, 25);
    musicTick();
    startCrowd();
  }

  function stopMusic(immediate) {
    if (music.timer) { clearInterval(music.timer); music.timer = null; }
    music.name = null;
    music.theme = null;
    stopCrowd();
    if (actx && musicBus) {
      musicBus.gain.cancelScheduledValues(actx.currentTime);
      const now = actx.currentTime;
      if (immediate) musicBus.gain.setValueAtTime(0.0001, now);
      else {
        musicBus.gain.setValueAtTime(musicBus.gain.value, now);
        musicBus.gain.linearRampToValueAtTime(0.0001, now + 0.5);
      }
    }
  }

  // Second phase of a final boss: push the theme harder without restarting it.
  function setMusicIntensity(v) {
    music.intensity = v;
  }
  // Dialogue ducks the music rather than cutting it, so the pause still has a floor.
  function duckMusic(on) {
    if (!actx || !musicBus || !music.timer) return;
    const now = actx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(on ? 0.3 : 1, now + 0.35);
  }

  // ---- What the engine may ask for ----
  // Deliberately narrow: play a noise, start or stop a theme, lean on it, and
  // tell the crowd how the fight is going. Everything above — the context, the
  // buses, the voices, the sequencer clock — is this file's business alone.
  //
  // The functions are plain closures rather than methods, so the engine can
  // destructure them and go on calling sfx() and startMusic() unqualified.
  const AUDIO = {
    get soundOn() { return soundOn; },
    get musicOn() { return musicOn; },
    setSound(on) {
      soundOn = !!on;
      localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
    },
    setMusic(on) {
      musicOn = !!on;
      localStorage.setItem(MUSIC_KEY, musicOn ? "on" : "off");
    },
    set onDisabled(fn) { onDisabled = fn; },
    get onDisabled() { return onDisabled; },

    resumeAudio, sfx,
    startMusic, stopMusic, setMusicIntensity, duckMusic,
    setCrowd, crowdSurge,
  };

  Object.assign(C, { AUDIO });
})();
