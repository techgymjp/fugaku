// 効果音と BGM（Web Audio API でその場で合成。音声ファイルは使わない）
(function () {
  "use strict";

  const KEY = "fugaku-sound";
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== "off"; } catch (e) {}

  let ctx = null, master = null, bgmGain = null, sfxGain = null, reverb = null;
  let bgmTimer = 0, bgmOn = false, nextNote = 0, step = 0;

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = enabled ? 1 : 0; master.connect(ctx.destination);
    // 簡易リバーブ（減衰するノイズのインパルス応答）
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.35; reverb.connect(wet); wet.connect(master);
    bgmGain = ctx.createGain(); bgmGain.gain.value = 0.22; bgmGain.connect(master); bgmGain.connect(reverb);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master); sfxGain.connect(reverb);
    return ctx;
  }

  // ブラウザの自動再生制限のため、最初の操作で音を有効にする
  function unlock() {
    if (!init()) return;
    if (ctx.state === "suspended") ctx.resume();
  }

  // ---- 音色 ----
  // 琴・三味線風の撥弦音
  function pluck(freq, t, dur = 1.6, vol = 0.5, out = sfxGain) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    o1.type = "triangle"; o2.type = "sawtooth";
    o1.frequency.value = freq; o2.frequency.value = freq * 2.002;
    const g2 = ctx.createGain(); g2.gain.value = 0.12;
    f.type = "lowpass"; f.Q.value = 2;
    f.frequency.setValueAtTime(freq * 8, t);
    f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(out);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  // 鈴・風鈴風の金属音
  function bell(freq, t, dur = 2.5, vol = 0.25) {
    [1, 2.76, 5.4].forEach((r, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq * r;
      const v = vol / (i * 1.8 + 1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (i + 1));
      o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur);
    });
  }

  // 拍子木・木魚風の打撃音
  function wood(t, freq = 900, vol = 0.5) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.02);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + 0.15);
  }

  // 銅鑼風の低い響き
  function gong(t, freq = 110, vol = 0.4) {
    [1, 1.48, 2.1, 2.9].forEach((r, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq * r;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol / (i + 1), t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5 - i * 0.5);
      o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + 3.6);
    });
  }

  // ---- 音階（都節音階: ミ ファ ラ シ ド） ----
  const BASE = 329.63; // E4
  const SCALE = [0, 1, 5, 7, 8]; // 半音
  const note = (deg, oct = 0) => {
    const i = ((deg % 5) + 5) % 5, o = Math.floor(deg / 5) + oct;
    return BASE * Math.pow(2, (SCALE[i] + 12 * o) / 12);
  };

  // ---- BGM：ゆったりした琴の即興（同じ旋律の繰り返しを避けるため、規則つきの乱数で作る） ----
  const TEMPO = 0.42; // 1拍の秒数
  let deg = 2;
  function scheduleBgm() {
    if (!bgmOn) return;
    while (nextNote < ctx.currentTime + 0.6) {
      const t = nextNote, beat = step % 16;
      // 低音（4拍ごと）
      if (beat % 8 === 0) pluck(note(beat === 0 ? 0 : 3, -2), t, 3.2, 0.35, bgmGain);
      // 旋律：隣の音へ動くことが多く、ときどき休む
      if (Math.random() < (beat % 4 === 0 ? 0.95 : 0.55)) {
        const r = Math.random();
        deg += r < 0.4 ? 1 : r < 0.8 ? -1 : r < 0.9 ? 2 : -2;
        deg = Math.max(-2, Math.min(8, deg));
        pluck(note(deg), t, 1.8, 0.28, bgmGain);
        // ときどき1オクターブ下を重ねる
        if (beat % 4 === 0 && Math.random() < 0.3) pluck(note(deg, -1), t + 0.02, 1.8, 0.16, bgmGain);
      }
      // フレーズの終わりは主音に戻す
      if (beat === 15) deg = Math.random() < 0.5 ? 0 : 5;
      nextNote += TEMPO * (beat % 2 === 0 ? 1.08 : 0.92); // わずかに揺らす
      step++;
    }
  }

  function startBgm() {
    if (!init() || bgmOn) return;
    bgmOn = true;
    nextNote = ctx.currentTime + 0.1; step = 0;
    bgmGain.gain.cancelScheduledValues(ctx.currentTime);
    bgmGain.gain.setTargetAtTime(0.22, ctx.currentTime, 0.5);
    bgmTimer = setInterval(scheduleBgm, 150);
    scheduleBgm();
  }
  function stopBgm() {
    if (!ctx || !bgmOn) return;
    bgmOn = false;
    clearInterval(bgmTimer);
    bgmGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
    setTimeout(() => { if (!bgmOn) bgmGain.gain.value = 0.22; }, 1500);
  }

  // ---- 時計のカチカチ（問題を解いている間） ----
  let noiseBuf = null, tickTimer = 0, tickOn = false, nextTick = 0, tickN = 0, tickInterval = 1.0;
  function noise() {
    if (noiseBuf) return noiseBuf;
    const len = Math.floor(ctx.sampleRate * 0.05);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  // 短い打撃音（ノイズ＋高い共鳴）で、時計の歯車の「カチ」を作る
  function tick(t, hi) {
    const src = ctx.createBufferSource(); src.buffer = noise();
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = hi ? 3200 : 2300; bp.Q.value = 8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(hi ? 0.9 : 0.7, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    src.connect(bp); bp.connect(g); g.connect(master);  // 残響はかけず、乾いた音にする
    src.start(t); src.stop(t + 0.05);
  }
  function scheduleTick() {
    if (!tickOn) return;
    while (nextTick < ctx.currentTime + 0.3) {
      tick(nextTick, tickN % 2 === 0);
      nextTick += tickInterval; tickN++;
    }
  }
  function startTick() {
    if (!init()) return;
    stopTick();
    tickOn = true; tickN = 0; tickInterval = 1.0;
    nextTick = ctx.currentTime + 0.5;
    tickTimer = setInterval(scheduleTick, 100);
    scheduleTick();
  }
  // 残り時間が少ないときは速く刻む（0: 1秒ごと, 1: 0.5秒ごと, 2: 0.25秒ごと）
  function setTickSpeed(level) {
    tickInterval = [1.0, 0.5, 0.25][level] || 1.0;
    if (ctx && tickOn) nextTick = Math.min(nextTick, ctx.currentTime + tickInterval);
  }
  function stopTick() {
    tickOn = false;
    clearInterval(tickTimer);
  }

  // ---- 効果音 ----
  let lastDraw = 0, drawDeg = 0;
  const sfx = {
    click() { if (!ctx) return; wood(ctx.currentTime); },
    start() {
      if (!ctx) return; const t = ctx.currentTime;
      wood(t, 700); wood(t + 0.18, 900); wood(t + 0.30, 900);
      [0, 2, 4, 5].forEach((d, i) => pluck(note(d), t + 0.45 + i * 0.09, 1.4, 0.35));
    },
    // なぞっている間、間引いて小さな音を鳴らす（線が上に行くほど高い音）
    draw(y) {
      if (!ctx) return; const now = ctx.currentTime;
      if (now - lastDraw < 0.09) return;
      lastDraw = now;
      const d = Math.round((1 - y) * 9) - 1;
      if (d === drawDeg && Math.random() < 0.5) return;
      drawDeg = d;
      bell(note(d, 1), now, 0.6, 0.05);
    },
    undo() { if (!ctx) return; pluck(note(0, -1), ctx.currentTime, 0.4, 0.3); },
    timeUp() {
      if (!ctx) return; const t = ctx.currentTime;
      // 拍子木を2回 ＋ 鈴
      wood(t, 650, 0.6); wood(t + 0.16, 650, 0.6);
      bell(note(5, 1), t + 0.3, 1.8, 0.2);
    },
    reveal() {
      if (!ctx) return; const t = ctx.currentTime;
      // 星がきらめくような上昇音
      for (let i = 0; i < 8; i++) bell(note(i, 1), t + i * 0.12, 1.5, 0.08);
    },
    result(stars, hit) {
      if (!ctx) return; const t = ctx.currentTime + 0.1;
      if (stars >= 3) {
        gong(t, 98, 0.35);
        [0, 2, 4, 5, 7, 9, 10].forEach((d, i) => pluck(note(d), t + 0.1 + i * 0.07, 2, 0.35));
        bell(note(10, 1), t + 0.7, 3, 0.2);
      } else if (hit) {
        [0, 2, 4, 5].slice(0, stars + 2).forEach((d, i) => pluck(note(d + 2), t + i * 0.1, 1.8, 0.35));
        bell(note(7, 1), t + 0.4, 2.2, 0.15);
      } else {
        pluck(note(3, -1), t, 1.5, 0.35);
        pluck(note(1, -1), t + 0.22, 2.2, 0.35);
      }
    },
    final() {
      if (!ctx) return; const t = ctx.currentTime;
      gong(t, 82, 0.4);
      [0, 2, 4, 5, 7, 5, 9, 10].forEach((d, i) => pluck(note(d), t + 0.3 + i * 0.16, 2.2, 0.3));
    },
  };

  function setEnabled(on) {
    enabled = on;
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {}
    if (on) unlock();
    if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05);
    document.querySelectorAll("[data-sound-toggle]").forEach(b => {
      b.textContent = "♪";
      const t = window.I18N ? I18N.t : (k) => (k === "sound.off" ? "音を消す" : "音を出す");
      b.setAttribute("aria-label", t(on ? "sound.off" : "sound.on"));
      b.setAttribute("title", t(on ? "sound.off" : "sound.on"));
      b.classList.toggle("off", !on);
    });
  }

  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-sound-toggle]")) setEnabled(!enabled);
  });
  document.addEventListener("DOMContentLoaded", () => {
    setEnabled(enabled);
    if (window.I18N) I18N.onChange(() => setEnabled(enabled));  // ボタンの説明文を言語に合わせる
  });

  window.FujiAudio = {
    unlock, startBgm, stopBgm, startTick, stopTick, setTickSpeed, sfx,
    get enabled() { return enabled; },
  };
})();
