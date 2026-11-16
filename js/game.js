(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const OUTLINES = window.FUJI_OUTLINES || {};
  const PRINTS = window.PRINTS || [];
  // 正解の輪郭線が登録済みの絵だけを出題する
  const PLAYABLE = PRINTS.filter(p => Array.isArray(OUTLINES[p.id]) && OUTLINES[p.id].length);

  const A = window.FujiAudio || { sfx: new Proxy({}, { get: () => () => {} }), startBgm() {}, stopBgm() {}, startTick() {}, stopTick() {}, unlock() {} };
  const stage = $("stage");
  const canvas = $("canvas");
  const ctx = canvas.getContext("2d");
  const imgNofuji = $("img-nofuji");
  const imgOriginal = $("img-original");

  const state = {
    queue: [], index: 0, total: 0, results: [], lastMode: 5,
    strokes: [],          // なぞった線（正規化座標 0-1）
    current: null,        // 描画中の線
    revealed: false,
    aspect: 1,            // 画像の 高さ/幅
    revealProgress: 0,
    anim: 0,
  };

  // ---------- 画面切り替え ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === id));
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---------- タイトル ----------
  $("title-note").textContent = PLAYABLE.length
    ? `収録 ${PLAYABLE.length} 図`
    : "正解の輪郭線がまだ登録されていません（editor.html で作成してください）";
  document.querySelectorAll("[data-start]").forEach(b => {
    b.disabled = PLAYABLE.length === 0;
    b.addEventListener("click", () => start(b.dataset.start === "all" ? Infinity : +b.dataset.start));
  });
  $("btn-howto").addEventListener("click", () => { A.unlock(); A.sfx.click(); $("howto").showModal(); });

  function start(n) {
    A.unlock(); A.sfx.start(); A.startBgm();
    state.lastMode = n;
    state.queue = shuffle(PLAYABLE.slice()).slice(0, Math.min(n, PLAYABLE.length));
    state.total = state.queue.length;
    state.index = 0;
    state.results = [];
    $("q-total").textContent = state.total;
    $("score-total").textContent = 0;
    show("screen-play");
    loadQuestion();
  }

  // ---------- 出題 ----------
  function loadQuestion() {
    const p = state.queue[state.index];
    state.strokes = []; state.current = null; state.revealed = false; state.revealProgress = 0;
    cancelAnimationFrame(state.anim);
    stage.classList.remove("revealed", "compare");
    $("result-badge").hidden = true;
    $("stage-msg").hidden = true;
    $("buttons-draw").hidden = false;
    $("buttons-next").hidden = true;
    $("btn-judge").disabled = true;
    $("q-index").textContent = state.index + 1;
    $("q-name").textContent = p.ja;
    $("q-yomi").textContent = p.yomi;
    $("hint").textContent = "富士山の輪郭（稜線）をなぞってください";
    $("btn-next").textContent = state.index + 1 >= state.total ? "結果を見る" : "次へ";
    A.startTick();

    imgOriginal.src = `images/original/${p.id}.jpg`;
    imgNofuji.onerror = () => {
      $("stage-msg").hidden = false;
      imgNofuji.style.visibility = "hidden";
      $("stage-msg").innerHTML = `<div>富士山を消した画像が見つかりません<br><code>images/nofuji/${p.id}.jpg</code></div>`;
      // 寸法だけは原画から取る
      if (imgOriginal.complete && imgOriginal.naturalWidth) setAspect(imgOriginal);
      else imgOriginal.onload = () => setAspect(imgOriginal);
    };
    imgNofuji.style.visibility = "";
    imgNofuji.onload = () => setAspect(imgNofuji);
    imgNofuji.src = `images/nofuji/${p.id}.jpg`;
  }

  function setAspect(img) {
    state.aspect = img.naturalHeight / img.naturalWidth;
    layout();
  }

  // ステージを画面に収まるサイズに合わせる
  function layout() {
    const wrap = stage.parentElement;
    const cs = getComputedStyle(wrap);
    const W = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const H = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    let w = W, h = W * state.aspect;
    if (h > H) { h = H; w = H / state.aspect; }
    stage.style.width = `${Math.floor(w)}px`;
    stage.style.height = `${Math.floor(h)}px`;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    draw();
  }
  window.addEventListener("resize", () => { if ($("screen-play").classList.contains("active")) layout(); });

  // ---------- なぞる ----------
  function toNorm(e) {
    const r = canvas.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
            Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (state.revealed) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    state.current = [toNorm(e)];
    state.strokes.push(state.current);
    draw();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!state.current) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events) state.current.push(toNorm(ev));
    A.sfx.draw(state.current[state.current.length - 1][1]);
    draw();
  });
  const endStroke = () => {
    if (!state.current) return;
    if (state.current.length < 2) state.strokes.pop();   // 点だけのタップは無視
    state.current = null;
    $("btn-judge").disabled = state.strokes.length === 0;
    draw();
  };
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);

  $("btn-undo").addEventListener("click", () => { A.sfx.undo(); state.strokes.pop(); $("btn-judge").disabled = !state.strokes.length; draw(); });
  $("btn-clear").addEventListener("click", () => { A.sfx.undo(); state.strokes = []; $("btn-judge").disabled = true; draw(); });

  // ---------- 判定 ----------
  // 縦横比を保ったピクセル空間（幅1000）に変換して採点
  function toPx(lines) {
    return lines.map(l => l.map(([x, y]) => ({ x: x * 1000, y: y * 1000 * state.aspect })));
  }

  $("btn-judge").addEventListener("click", judge);
  function judge() {
    const p = state.queue[state.index];
    const res = FujiScoring.evaluate(toPx(OUTLINES[p.id]), toPx(state.strokes));
    const rk = FujiScoring.rank(res.score);
    A.stopTick();
    A.sfx.reveal();
    state.results.push({ print: p, score: res.score, rank: rk });
    state.revealed = true;
    stage.classList.add("revealed");
    $("stage-msg").hidden = true;
    $("buttons-draw").hidden = true;
    $("buttons-next").hidden = false;
    $("hint").textContent = `なぞり具合 ${Math.round(res.coverage * 100)}%　／　正確さ ${Math.round(res.precision * 100)}%`;
    $("score-total").textContent = state.results.reduce((s, r) => s + r.score, 0);

    const badge = $("result-badge");
    badge.className = "result-badge" + (rk.hit ? "" : " miss");
    badge.innerHTML = `<div class="pt">${res.score}</div><div class="lb">${"★".repeat(rk.stars)}${rk.label}</div>`;

    // 輪郭線を星座のように描き出すアニメーション
    const t0 = performance.now();
    const step = (t) => {
      state.revealProgress = Math.min(1, (t - t0) / 1600);
      draw();
      if (state.revealProgress < 1) state.anim = requestAnimationFrame(step);
      else { badge.hidden = false; A.sfx.result(rk.stars, rk.hit); }
    };
    state.anim = requestAnimationFrame(step);
  }

  $("btn-toggle").addEventListener("click", () => { A.sfx.click(); stage.classList.toggle("compare"); });
  $("btn-next").addEventListener("click", () => {
    A.sfx.click();
    state.index++;
    if (state.index >= state.total) showResult(); else loadQuestion();
  });

  // ---------- 描画 ----------
  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const P = ([x, y]) => [x * w, y * h];

    // プレイヤーの線（金色に光る）
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = state.revealed ? "rgba(242,193,78,.75)" : "#f2c14e";
    ctx.shadowColor = "rgba(242,193,78,.9)"; ctx.shadowBlur = 10 * dpr;
    ctx.lineWidth = 4 * dpr;
    for (const s of state.strokes) {
      if (s.length < 1) continue;
      ctx.beginPath();
      s.forEach((pt, i) => { const [x, y] = P(pt); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    }
    ctx.restore();

    // 正解の輪郭線（星座風）
    if (state.revealed) {
      const lines = OUTLINES[state.queue[state.index].id];
      const total = lines.reduce((s, l) => s + polyLen(l.map(P)), 0);
      let budget = total * state.revealProgress;
      ctx.save();
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const line of lines) {
        const pts = line.map(P);
        // 線
        ctx.strokeStyle = "rgba(255,255,255,.9)";
        ctx.shadowColor = "#9fd3ff"; ctx.shadowBlur = 12 * dpr;
        ctx.lineWidth = 2 * dpr;
        ctx.setLineDash([6 * dpr, 6 * dpr]);
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        const shown = [pts[0]];
        for (let i = 1; i < pts.length && budget > 0; i++) {
          const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          if (L <= budget) { ctx.lineTo(pts[i][0], pts[i][1]); shown.push(pts[i]); budget -= L; }
          else {
            const t = budget / L;
            ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t);
            budget = 0;
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
        // 星（頂点）
        for (const [x, y] of shown) drawStar(x, y, 5 * dpr);
      }
      ctx.restore();
    }
  }

  function polyLen(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return s;
  }

  function drawStar(x, y, r) {
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#cfe8ff"; ctx.shadowBlur = r * 3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.35;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ---------- 結果 ----------
  function showResult() {
    const sum = state.results.reduce((s, r) => s + r.score, 0);
    const avg = state.results.length ? sum / state.results.length : 0;
    $("final-score").textContent = sum;
    $("final-rank").textContent =
      avg >= 85 ? "称号：画狂老人（北斎級）" :
      avg >= 70 ? "称号：富士見の達人" :
      avg >= 50 ? "称号：江戸の旅人" :
      avg >= 30 ? "称号：駆け出しの絵師" : "称号：富士山はどこへ…";
    $("result-list").innerHTML = state.results.map(r =>
      `<li><span>${r.print.ja}</span><span class="s">${"★".repeat(r.rank.stars)} ${r.score}点</span></li>`).join("");
    show("screen-result");
    A.stopTick(); A.stopBgm(); A.sfx.final();
  }
  $("btn-retry").addEventListener("click", () => start(state.lastMode));
  $("btn-top").addEventListener("click", () => { A.sfx.click(); A.stopTick(); A.stopBgm(); show("screen-title"); });
})();
