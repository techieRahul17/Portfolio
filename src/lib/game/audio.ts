/**
 * Every sound in the game is synthesised with WebAudio — a kick is a pitched
 * thump, the crowd is shaped noise, the whistle is a warbling sine. Nothing to
 * download, and the context is only created after the visitor clicks, which
 * is what browsers require anyway.
 */
export function createAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let crowdGain: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let muted = false;

  const now = () => ctx!.currentTime;

  function unlock() {
    if (ctx) {
      void ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(ctx.destination);

    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Ambient crowd: looped noise through a vocal-ish band, gently breathing.
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 700;
    band.Q.value = 0.6;
    crowdGain = ctx.createGain();
    crowdGain.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.13;
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain).connect(crowdGain.gain);
    src.connect(band).connect(crowdGain).connect(master);
    src.start();
    lfo.start();
  }

  function burst(duration: number, freq: number, q: number, gain: number, type: BiquadFilterType = "bandpass") {
    if (!ctx || !master || !noise) return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    const t = now();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, duration / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random());
    src.stop(t + duration + 0.05);
  }

  function tone(freq: number, duration: number, gain: number, type: OscillatorType = "sine", endFreq?: number, delay = 0) {
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t = now() + delay;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + duration + 0.05);
  }

  return {
    unlock,
    get muted() {
      return muted;
    },
    setMuted(m: boolean) {
      muted = m;
      if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05);
    },
    kick(power: number) {
      tone(160, 0.18, 0.5 + power * 0.4, "sine", 45);
      burst(0.06, 2500, 0.8, 0.25 + power * 0.2, "highpass");
    },
    bounce(speed: number) {
      const v = Math.min(1, speed / 12);
      if (v < 0.08) return;
      tone(120, 0.1, 0.15 + v * 0.25, "sine", 60);
    },
    /** Countdown pip: three short, then a long high one for the kick-off. */
    beep(final = false) {
      tone(final ? 1320 : 880, final ? 0.4 : 0.14, 0.14, "square");
    },
    whistle() {
      if (!ctx) return;
      for (const [d, len] of [
        [0, 0.18],
        [0.26, 0.5],
      ]) {
        const o = ctx.createOscillator();
        const vib = ctx.createOscillator();
        const vibGain = ctx.createGain();
        const g = ctx.createGain();
        const t = now() + d;
        o.frequency.value = 2900;
        vib.frequency.value = 38;
        vibGain.gain.value = 120;
        vib.connect(vibGain).connect(o.frequency);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
        g.gain.setValueAtTime(0.09, t + len - 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(g).connect(master!);
        o.start(t);
        vib.start(t);
        o.stop(t + len + 0.05);
        vib.stop(t + len + 0.05);
      }
    },
    cheer(big = true) {
      if (!ctx || !crowdGain) return;
      burst(big ? 2.6 : 1.4, 900, 0.4, big ? 0.55 : 0.3);
      burst(big ? 2.2 : 1.1, 1800, 0.7, big ? 0.25 : 0.12);
      const t = now();
      crowdGain.gain.cancelScheduledValues(t);
      crowdGain.gain.setTargetAtTime(big ? 0.14 : 0.09, t, 0.1);
      crowdGain.gain.setTargetAtTime(0.05, t + (big ? 2.2 : 1.2), 0.6);
    },
    /** A soft footfall on turf: quieter walking, a touch crisper sprinting. */
    step(speed: number) {
      burst(0.05, 900 + speed * 900, 1.2, 0.015 + speed * 0.03, "bandpass");
    },
    /** Boots scraping the grass. */
    skid() {
      burst(0.35, 1400, 0.6, 0.12, "bandpass");
    },
    groan() {
      burst(1.2, 380, 0.5, 0.35, "lowpass");
    },
    collect(step = 0) {
      const base = 660 * Math.pow(2, (step % 7) / 12);
      tone(base, 0.18, 0.18, "triangle");
      tone(base * 1.5, 0.25, 0.14, "triangle", undefined, 0.08);
    },
    unlockChime() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 0.12, "triangle", undefined, i * 0.07));
    },
    dispose() {
      void ctx?.close();
      ctx = null;
    },
  };
}

export type GameAudio = ReturnType<typeof createAudio>;
