// 8비트 BGM / 효과음 (WebAudio, 외부 파일 없음)
let ctx = null, master = null, timer = null, playing = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.06; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'square', vol = 1) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur * 0.95);
  o.connect(g); g.connect(master);
  o.start(start); o.stop(start + dur);
}

const N = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz
// 지하철 도착 멜로디 느낌의 짧은 루프 (MIDI, 0 = 쉼표)
const MELODY = [72, 76, 79, 76, 77, 81, 79, 0, 76, 79, 84, 83, 81, 79, 77, 0, 74, 77, 81, 77, 76, 79, 77, 76, 74, 72, 74, 76, 72, 0, 0, 0];
const BASS = [48, 48, 55, 55, 53, 53, 55, 55];
const STEP = 0.16;

function scheduleBar(t0) {
  MELODY.forEach((n, i) => { if (n) tone(N(n), t0 + i * STEP, STEP * 0.9, 'square', 0.8); });
  BASS.forEach((n, i) => tone(N(n), t0 + i * STEP * 4, STEP * 3.6, 'triangle', 1));
}

export function setBgm(on) {
  if (on === playing) return playing;
  if (on) {
    if (!ac()) return false;
    playing = true;
    let next = ctx.currentTime + 0.05;
    const loop = () => { scheduleBar(next); next += MELODY.length * STEP; timer = setTimeout(loop, (next - ctx.currentTime - 0.5) * 1000); };
    loop();
  } else {
    playing = false; clearTimeout(timer);
    if (master) { master.disconnect(); master = ctx.createGain(); master.gain.value = 0.06; master.connect(ctx.destination); }
  }
  return playing;
}

export function sfx(kind) {
  if (!ac()) return;
  const t = ctx.currentTime;
  if (kind === 'coin') { tone(N(83), t, 0.08); tone(N(88), t + 0.08, 0.35); }
  else if (kind === 'ok') { tone(N(76), t, 0.08); tone(N(84), t + 0.08, 0.16); }
  else if (kind === 'err') { tone(N(50), t, 0.12, 'sawtooth'); tone(N(45), t + 0.12, 0.2, 'sawtooth'); }
  else if (kind === 'over') { [67, 64, 60, 55].forEach((n, i) => tone(N(n), t + i * 0.22, 0.24, 'square')); }
}
