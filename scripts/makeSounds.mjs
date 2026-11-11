// Makes the sounds and the music of the app (app/assets/sounds) on the spot, with no samples:
// every sound is a few oscillators and some noise, written as a WAV. The effects follow the
// website's (src/app/sound.js); the music is a calm loop of soft chords and bells.
//
//   node scripts/makeSounds.mjs
//
// The music is turned into AAC with ffmpeg to keep the app small (the effects stay WAV, they
// are tiny). The output is committed, so ffmpeg is only needed to make the files again.
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { createRandom } from '../src/game/random.js';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';

const OUT = new URL('../app/assets/sounds/', import.meta.url).pathname;
const RATE = 32000;
const TAU = Math.PI * 2;

const buffer = (seconds) => new Float32Array(Math.ceil(seconds * RATE));

/** Rises quickly, then fades out, over `duration` seconds. */
function envelope(t, duration, attack = 0.008) {
  if (t < 0 || t > duration) return 0;
  const rise = Math.min(1, t / attack);
  const fall = Math.pow(1 - t / duration, 2);
  return rise * fall;
}

/** A tone that glides from one pitch to another, added to `out` at `start` seconds. */
function chirp(out, start, from, to, duration, volume, type = 'sine') {
  const first = Math.floor(start * RATE);
  const count = Math.floor(duration * RATE);
  let phase = 0;
  for (let i = 0; i < count && first + i < out.length; i++) {
    const t = i / RATE;
    const frequency = from * Math.pow(to / from, t / duration);
    phase += (TAU * frequency) / RATE;
    const wave = type === 'triangle' ? (2 / Math.PI) * Math.asin(Math.sin(phase)) : Math.sin(phase);
    out[first + i] += wave * envelope(t, duration) * volume;
  }
}

/** Noise through a band-pass (or high-pass) filter, with a volume that follows `shape(t)`. */
function noise(out, start, duration, shape, { type = 'band', from, to, q = 1.4, seed = 1 }) {
  const rand = createRandom(seed);
  const first = Math.floor(start * RATE);
  const count = Math.floor(duration * RATE);
  let low = 0;
  let band = 0;
  for (let i = 0; i < count && first + i < out.length; i++) {
    const t = i / RATE;
    const frequency = from + ((to ?? from) - from) * (t / duration);
    const f = 2 * Math.sin((Math.PI * Math.min(frequency, RATE / 6)) / RATE);
    const input = rand() * 2 - 1;
    low += f * band;
    const high = input - low - band / q;
    band += f * high;
    out[first + i] += (type === 'high' ? high : band) * shape(t, duration);
  }
}

function toWav(samples, peak = 0.9) {
  let max = 0;
  for (const sample of samples) max = Math.max(max, Math.abs(sample));
  const gain = max > 0 ? peak / max : 1;
  const data = Buffer.alloc(44 + samples.length * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + samples.length * 2, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(RATE, 24);
  data.writeUInt32LE(RATE * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, i) =>
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample * gain)) * 32767), 44 + i * 2)
  );
  return data;
}

// --- The effects: loud enough to hear over the music, short and soft. ---

const effects = {
  tap() {
    const out = buffer(0.06);
    chirp(out, 0, 1400, 1000, 0.04, 0.3);
    return out;
  },
  pick() {
    const out = buffer(0.12);
    chirp(out, 0, 880, 620, 0.08, 0.5);
    return out;
  },
  putDown() {
    const out = buffer(0.12);
    chirp(out, 0, 560, 420, 0.08, 0.5);
    return out;
  },
  reject() {
    const out = buffer(0.26);
    chirp(out, 0, 180, 120, 0.14, 0.6, 'triangle');
    chirp(out, 0.07, 160, 110, 0.12, 0.4, 'triangle');
    return out;
  },
  // A second of water running into a tube: soft bubbles that rise in pitch as it fills, with no
  // noise in it (noise sounded like a hiss). Pours shorter than the sound are cut short.
  pour() {
    const out = buffer(1.3);
    const rand = createRandom(7);
    let at = 0;
    while (at < 1.1) {
      const fill = at / 1.1;
      const pitch = (300 + 420 * fill) * (0.9 + rand() * 0.25);
      const length = 0.07 + rand() * 0.04;
      const volume = 0.16 + rand() * 0.1;
      // A bubble pops upward in pitch, with a quiet overtone.
      chirp(out, at, pitch, pitch * 1.7, length, volume);
      chirp(out, at, pitch * 2, pitch * 3.1, length * 0.7, volume * 0.2);
      at += 0.035 + rand() * 0.07;
    }
    // A low, warm swell under the bubbles, like the weight of the liquid.
    chirp(out, 0, 150, 190, 1.2, 0.1);
    return out;
  },
  capOn() {
    const out = buffer(0.2);
    chirp(out, 0, 260, 150, 0.11, 0.7);
    noise(out, 0, 0.03, (t, d) => 0.4 * envelope(t, d, 0.002), {
      type: 'high',
      from: 3000,
      seed: 5
    });
    return out;
  },
  capOff() {
    const out = buffer(0.14);
    chirp(out, 0, 320, 720, 0.1, 0.5);
    return out;
  },
  melt() {
    const out = buffer(0.4);
    for (let i = 0; i < 5; i++) {
      noise(out, i * 0.05 + (i % 2) * 0.012, 0.03, (t, d) => 0.5 * envelope(t, d, 0.002), {
        type: 'high',
        from: 4500,
        seed: 20 + i
      });
    }
    return out;
  },
  undo() {
    const out = buffer(0.3);
    noise(out, 0, 0.24, (t, d) => 0.5 * envelope(t, d, 0.03), {
      from: 2200,
      to: 500,
      q: 2,
      seed: 9
    });
    return out;
  },
  hint() {
    const out = buffer(0.4);
    chirp(out, 0, 1320, 1320, 0.14, 0.4);
    chirp(out, 0.09, 1760, 1760, 0.2, 0.4);
    return out;
  },
  win() {
    const out = buffer(1.5);
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) =>
      chirp(out, i * 0.11, frequency, frequency, 0.6, 0.4, 'triangle')
    );
    chirp(out, 0.44, 1567.98, 1567.98, 0.9, 0.18);
    return out;
  }
};

// --- The music: four chords of eight seconds, soft bells over them, folded into a loop. ---

function music() {
  const seconds = 8;
  const chords = [
    [220.0, 261.63, 329.63], // A minor
    [174.61, 220.0, 261.63], // F
    [261.63, 329.63, 392.0], // C
    [196.0, 246.94, 293.66] // G
  ];
  const bass = [110.0, 87.31, 130.81, 98.0];
  const scale = [440, 493.88, 523.25, 587.33, 659.25, 783.99, 880, 987.77];
  const loop = chords.length * seconds;
  const out = buffer(loop + 6); // The tails run past the end and are folded back to the start.
  const rand = createRandom(2026);

  chords.forEach((notes, index) => {
    const start = index * seconds;
    // Pad: each note is two slightly detuned sines that swell in and out.
    for (const frequency of notes.concat(notes.map((note) => note * 2))) {
      for (const detune of [-0.8, 0.8]) {
        const first = Math.floor(start * RATE);
        const count = Math.floor((seconds + 3) * RATE);
        let phase = rand() * TAU;
        for (let i = 0; i < count && first + i < out.length; i++) {
          const t = i / RATE;
          phase += (TAU * (frequency + detune)) / RATE;
          const swell = Math.sin(Math.PI * Math.min(1, t / (seconds + 3))) ** 1.5;
          out[first + i] += Math.sin(phase) * swell * 0.05;
        }
      }
    }
    // Bass: one long, low note.
    chirp(out, start, bass[index], bass[index], seconds + 1.5, 0.18);
    // Bells: a few notes of the scale, never on a steady beat.
    let at = start + 0.6;
    while (at < start + seconds - 0.5) {
      const frequency = scale[Math.floor(rand() * scale.length)];
      chirp(out, at, frequency, frequency, 2.6, 0.06 + rand() * 0.04, 'sine');
      chirp(out, at, frequency * 2, frequency * 2, 1.2, 0.015, 'sine');
      at += 0.9 + rand() * 1.6;
    }
  });

  // A soft echo, so the bells sound like they are in a room.
  for (const [delay, level] of [
    [0.29, 0.3],
    [0.47, 0.22],
    [0.71, 0.16]
  ]) {
    const shift = Math.floor(delay * RATE);
    for (let i = out.length - 1; i >= shift; i--) out[i] += out[i - shift] * level;
  }

  // Fold what runs past the end onto the start, so the loop has no seam.
  const length = loop * RATE;
  const looped = new Float32Array(length);
  for (let i = 0; i < out.length; i++) looped[i % length] += out[i];
  return looped;
}

mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(effects)) {
  writeFileSync(`${OUT}${name}.wav`, toWav(make(), 0.8));
}
writeFileSync(`${OUT}music.tmp.wav`, toWav(music(), 0.6));
execFileSync('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  '-i',
  `${OUT}music.tmp.wav`,
  '-c:a',
  'aac',
  '-b:a',
  '64k',
  `${OUT}music.m4a`
]);
unlinkSync(`${OUT}music.tmp.wav`);
console.log('Sounds written to app/assets/sounds');
