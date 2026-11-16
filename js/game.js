(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const OUTLINES = window.FUJI_OUTLINES || {};
  const PRINTS = window.PRINTS || [];
  // 正解の輪郭線が登録済みの絵だけを出題する
  const PLAYABLE = PRINTS.filter(p => Array.isArray(OUTLINES[p.id]) && OUTLINES[p.id].length);

  const A = window.FujiAudio || { sfx: new Proxy({}, { get: () => () => {} }), startBgm() {}, stopBgm() {}, startTick() {}, stopTick() {}, setTickSpeed() {}, unlock() {}, suspend() {}, resume() {} };
  // 広告（Android アプリのときだけ動く。Web 版では何もしない）
  const Ads = window.Ads || { available: false, canReward: false, showing: false, privacyOptionsRequired: false, initDone: Promise.resolve(), showInterstitial: async () => {}, showRewarded: async () => "unavailable", setBanner() {}, showPrivacyOptions: async () => {} };
  // Android / iOS アプリ(Capacitor)で動いているか。Web 版では Capacitor がないので何もしない
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const plugin = (name) => (NATIVE && window.Capacitor.Plugins ? window.Capacitor.Plugins[name] : null);
  const SHARE_URL = "https://techgym.jp/column/claude-code-game-fugaku/"; // 紹介記事
  const T = (k, v) => window.I18N.t(k, v);
  const EN = () => window.I18N.lang === "en";
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
    deadline: 0,          // 制限時間の締め切り（performance.now() の値）
    timer: 0,
    tickLevel: 0,
    paused: false,
    remaining: 0,         // ポーズ中に残っている制限時間（ミリ秒）
    redoUsed: 0,          // このゲームでリワード広告のやり直しを使った回数
  };

  // ---------- 画面切り替え ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === id));
    updateBanner();
  }
  const current = () => (document.querySelector(".screen.active") || {}).id;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---------- タイトル ----------
  function titleNote() {
    $("title-note").textContent = PLAYABLE.length ? T("title.count", { n: PLAYABLE.length }) : T("title.empty");
  }
  // ベスト記録（モードごとの合計点）
  const modeKey = (n) => (n === Infinity ? "all" : String(n));
  function loadBest(key) { try { return +localStorage.getItem("fugaku-best-" + key) || 0; } catch (e) { return 0; } }
  function saveBest(key, v) { try { localStorage.setItem("fugaku-best-" + key, String(v)); } catch (e) { /* 保存できなくても続ける */ } }
  function showBest() {
    document.querySelectorAll("[data-best]").forEach(el => {
      const b = loadBest(el.dataset.best);
      el.textContent = b ? T("best", { n: b }) : "";
    });
  }

  document.querySelectorAll("[data-start]").forEach(b => {
    b.disabled = PLAYABLE.length === 0;
    b.addEventListener("click", () => { A.unlock(); withInterstitial(() => start(b.dataset.start === "all" ? Infinity : +b.dataset.start)); });
  });
  $("btn-howto").addEventListener("click", () => { A.unlock(); A.sfx.click(); show("screen-howto"); });
  $("btn-howto-start").addEventListener("click", () => { A.unlock(); withInterstitial(() => start(5)); });
  $("btn-howto-back").addEventListener("click", () => { A.sfx.click(); withInterstitial(goTitle); });

  function start(n) {
    A.unlock(); A.sfx.start(); A.startBgm();
    closeRedo();
    state.paused = false; $("pause").hidden = true;
    state.redoUsed = 0;
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

  // ---------- 制限時間 ----------
  let TIME_LIMIT = 30;  // 秒
  // web-only:start
  // Web 版だけ、URL の ?time=10 などで変更できる（動作確認用。アプリ用のビルドでは取り除く）
  TIME_LIMIT = Math.max(3, +new URLSearchParams(location.search).get("time") || 30);
  // web-only:end
  function startTimer(ms) {
    stopTimer();
    state.deadline = performance.now() + (ms || TIME_LIMIT * 1000);
    state.tickLevel = 0;
    updateTimer();
    state.timer = setInterval(updateTimer, 100);
  }
  function stopTimer() { clearInterval(state.timer); state.timer = 0; }
  function updateTimer() {
    const left = Math.max(0, (state.deadline - performance.now()) / 1000);
    const sec = Math.ceil(left);
    $("timer-num").textContent = sec;
    $("timer-bar").style.transform = `scaleX(${left / TIME_LIMIT})`;
    $("timer").className = "timer" + (left <= 5 ? " danger" : left <= 10 ? " warn" : "");
    // 残り10秒で倍速、5秒でさらに倍速のカチカチ
    const level = left <= 5 ? 2 : left <= 10 ? 1 : 0;
    if (level !== state.tickLevel) { state.tickLevel = level; A.setTickSpeed(level); }
    if (left <= 0) timeUp();
  }
  function timeUp() {
    stopTimer();
    if (state.revealed) return;
    if (state.current) endStroke();
    A.sfx.timeUp();
    judge(true);
  }

  // ---------- 出題 ----------
  function loadQuestion() {
    const p = state.queue[state.index];
    closeRedo();
    state.strokes = []; state.current = null; state.revealed = false; state.revealProgress = 0;
    cancelAnimationFrame(state.anim);
    stage.classList.remove("revealed", "compare");
    $("result-badge").hidden = true;
    $("stage-msg").hidden = true;
    $("buttons-draw").hidden = false;
    $("buttons-next").hidden = true;
    $("btn-judge").disabled = true;
    $("q-index").textContent = state.index + 1;
    setQuestionTexts();
    $("hint").textContent = T("play.hint");
    A.startTick();
    startTimer();

    // 答え（原画）は判定するまで画面に置かない。裏で先読みだけしておく
    imgOriginal.removeAttribute("src");
    const answer = new Image();
    answer.src = `images/original/${p.id}.jpg`;
    state.answerSrc = answer.src;
    // 新しい絵が読み込まれるまで、前の問題の絵は見せない
    imgNofuji.style.visibility = "hidden";
    imgNofuji.onerror = () => {
      $("stage-msg").hidden = false;
      $("stage-msg").innerHTML = `<div>${T("play.missing")}<br><code>images/nofuji/${p.id}.jpg</code></div>`;
      // 寸法だけは原画から取る（原画は表示しない）
      if (answer.complete && answer.naturalWidth) setAspect(answer);
      else answer.onload = () => setAspect(answer);
    };
    imgNofuji.onload = () => { imgNofuji.style.visibility = ""; setAspect(imgNofuji); };
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
    if (state.revealed || state.paused) return;
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

  $("btn-judge").addEventListener("click", () => judge(false));
  function judge(timedOut) {
    if (state.revealed) return;
    stopTimer();
    const p = state.queue[state.index];
    const res = FujiScoring.evaluate(toPx(OUTLINES[p.id]), toPx(state.strokes));
    const rk = FujiScoring.rank(res.score);
    if (timedOut && !state.strokes.length) rk.key = "timeout";
    state.last = { res, rk, timedOut };
    A.stopTick();
    A.sfx.reveal();
    state.results.push({ print: p, score: res.score, rank: rk });
    state.revealed = true;
    imgOriginal.src = state.answerSrc;
    stage.classList.add("revealed");
    $("stage-msg").hidden = true;
    $("buttons-draw").hidden = true;
    $("buttons-next").hidden = false;
    setResultTexts();
    $("score-total").textContent = state.results.reduce((s, r) => s + r.score, 0);

    const badge = $("result-badge");
    badge.className = "result-badge" + (rk.hit ? "" : " miss");


    // 輪郭線を星座のように描き出すアニメーション
    const t0 = performance.now();
    const step = (t) => {
      state.revealProgress = Math.min(1, (t - t0) / 1600);
      draw();
      if (state.revealProgress < 1) state.anim = requestAnimationFrame(step);
      else { badge.hidden = false; A.sfx.result(rk.stars, rk.hit); }
    };
    state.anim = requestAnimationFrame(step);
    // 外したら、リワード広告で「この絵をやり直す」を出す（アプリのみ）
    if (!rk.hit) offerRedo();
  }

  $("btn-toggle").addEventListener("click", () => { A.sfx.click(); stage.classList.toggle("compare"); });
  $("btn-next").addEventListener("click", () => {
    A.sfx.click();
    closeRedo();
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
    if (state.revealed && state.queue[state.index]) {
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
    cancelAnimationFrame(state.anim);
    const sum = state.results.reduce((s, r) => s + r.score, 0);
    const avg = state.results.length ? sum / state.results.length : 0;
    $("final-score").textContent = sum;
    state.finalScore = sum;
    state.finalLevel = avg >= 85 ? 1 : avg >= 70 ? 2 : avg >= 50 ? 3 : avg >= 30 ? 4 : 5;
    const key = modeKey(state.lastMode);
    state.newBest = sum > loadBest(key);
    if (state.newBest) saveBest(key, sum);
    $("share-msg").textContent = "";
    setFinalTexts();
    closeRedo();
    show("screen-result");
    stopTimer(); A.stopTick(); A.stopBgm(); A.sfx.final();
  }
  $("btn-retry").addEventListener("click", () => withInterstitial(() => start(state.lastMode)));
  $("btn-top").addEventListener("click", () => { A.sfx.click(); withInterstitial(goTitle); });

  function goTitle() {
    stopTimer(); A.stopTick(); A.stopBgm(); closeRedo();
    state.paused = false; $("pause").hidden = true;
    showBest();
    show("screen-title");
  }

  // ---------- 全画面広告(アプリのみ) ----------
  // 「プレイを始める」「タイトルへ戻る」「ポーズからの再開」「もう一度」のたびに出す
  let adBusy = false;
  async function withInterstitial(next) {
    if (adBusy) return;
    if (Ads.available) {
      adBusy = true;
      await Ads.showInterstitial(3000);
      adBusy = false;
    }
    next();
  }

  // ---------- 一時停止 ----------
  // 止めている間は制限時間も止め、絵は隠す（止めている間に答えを考えられないように）
  function pause() {
    if (current() !== "screen-play" || state.paused) return;
    state.paused = true;
    if (state.current) endStroke();
    if (!state.revealed) {
      state.remaining = Math.max(0, state.deadline - performance.now());
      stopTimer();
      A.stopTick();
    }
    $("pause").hidden = false;
    updateBanner();
  }
  function resume() {
    if (!state.paused) return;
    state.paused = false;
    $("pause").hidden = true;
    if (!state.revealed) {
      A.startTick();
      state.tickLevel = 0;
      startTimer(state.remaining);
    }
    updateBanner();
  }
  $("btn-pause").addEventListener("click", () => { A.sfx.click(); pause(); });
  $("btn-resume").addEventListener("click", () => { A.sfx.click(); withInterstitial(resume); });
  $("btn-pause-top").addEventListener("click", () => { A.sfx.click(); withInterstitial(goTitle); });

  // 別のアプリに切り替えたら（裏に回ったら）一時停止して音を止める（広告の表示中は広告側が音を止めている）
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (!adBusy && !Ads.showing) pause();
      A.suspend();
    } else if (!Ads.showing) {
      A.resume();
    }
  });

  // Android の戻るボタン: 出題中はポーズ（ポーズ中なら再開）、あそびかたはタイトルへ、タイトル・結果画面ではアプリを閉じる
  if (plugin("App")) {
    plugin("App").addListener("backButton", () => {
      if (adBusy) return;
      const id = current();
      if (id === "screen-title" || id === "screen-result") plugin("App").exitApp();
      else if (id === "screen-howto") withInterstitial(goTitle);
      else if (state.paused) withInterstitial(resume);
      else pause();
    });
  }

  // ---------- リワード広告のチート: 外した絵をもう一度なぞる(アプリのみ・1 ゲーム 5 回まで) ----------
  // 判定で外したら（65 点未満）、答えの輪郭が描き終わるのを見届けられるよう少し待ってから案内を出し、
  // 数秒で自動的に消す。広告を最後まで見たときだけ、その絵の成績を取り消して同じ絵をもう一度出す
  const REDO_DELAY = 2500;
  const REDO_WAIT = 6;
  const REDO_MAX = 5;
  const redo = { active: false, busy: false, left: 0, timer: 0, pending: 0 };
  function offerRedo() {
    if (!Ads.canReward || state.redoUsed >= REDO_MAX) return;
    clearTimeout(redo.pending);
    redo.pending = setTimeout(showRedo, REDO_DELAY);
  }
  function showRedo() {
    redo.pending = 0;
    if (current() !== "screen-play" || !state.revealed) return;
    Object.assign(redo, { active: true, busy: false, left: REDO_WAIT });
    $("redo-watch").disabled = false;
    $("redo-watch").textContent = T("redo.watch");
    $("redo-note").textContent = T("redo.note", { n: REDO_MAX - state.redoUsed });
    $("redo-next").textContent = T("redo.next", { s: redo.left });
    $("redo").hidden = false;
    clearInterval(redo.timer);
    redo.timer = setInterval(() => {
      if (redo.busy || state.paused) return;
      redo.left--;
      $("redo-next").textContent = T("redo.next", { s: Math.max(0, redo.left) });
      if (redo.left <= 0) closeRedo();
    }, 1000);
  }
  function closeRedo() {
    clearTimeout(redo.pending); redo.pending = 0;
    clearInterval(redo.timer); redo.timer = 0;
    redo.active = false;
    $("redo").hidden = true;
  }
  $("redo-next").addEventListener("click", () => { A.sfx.click(); closeRedo(); });
  $("redo-watch").addEventListener("click", async () => {
    if (!redo.active || redo.busy) return;
    redo.busy = true;
    $("redo-watch").disabled = true;
    $("redo-watch").textContent = T("redo.loading");
    adBusy = true;
    const result = await Ads.showRewarded();
    adBusy = false;
    if (!redo.active) return;
    if (result === "unavailable") {
      $("redo-note").textContent = T("redo.fail");
      setTimeout(closeRedo, 2000);
      return;
    }
    closeRedo();
    if (result !== "rewarded") return;
    // 外した絵の成績を取り消して、同じ絵をもう一度
    state.results.pop();
    state.redoUsed++;
    $("score-total").textContent = state.results.reduce((s, r) => s + r.score, 0);
    loadQuestion();
  });

  // ---------- バナー広告: タイトル・あそびかた・ポーズ・結果画面だけ（出題中は絵や操作ボタンと重なるので出さない） ----------
  function updateBanner() {
    const id = current();
    const want = id === "screen-title" || id === "screen-howto" || id === "screen-result" || (id === "screen-play" && state.paused);
    Ads.setBanner(want);
  }
  if (Ads.available) document.body.classList.add("with-banner");

  // ---------- シェア ----------
  function shareText() {
    return T("share.text", {
      n: state.results.length,
      score: state.finalScore || 0,
      rank: T("title." + state.finalLevel),
      redo: state.redoUsed ? T("share.redo", { n: state.redoUsed }) : "",
    });
  }
  async function shareResult() {
    const text = shareText();
    // アプリでは Android の共有メニューを出す
    const nativeShare = plugin("Share");
    if (nativeShare) {
      try { await nativeShare.share({ title: T("share.title"), text, url: SHARE_URL, dialogTitle: T("share.dialog") }); } catch (e) { /* キャンセル */ }
      return;
    }
    if (navigator.share) {
      try { await navigator.share({ title: T("share.title"), text, url: SHARE_URL }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    copyResult(text + "\n" + SHARE_URL);
  }
  async function copyResult(text) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { /* 非対応 */ }
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta);
        ta.select(); ok = document.execCommand("copy"); ta.remove();
      } catch (e) { /* 非対応 */ }
    }
    $("share-msg").textContent = T(ok ? "share.copied" : "share.copyFail");
  }
  $("btn-share").addEventListener("click", () => { A.sfx.click(); shareResult(); });

  // ---------- タイトル画面の下: バージョン（アプリ版）・プライバシーポリシー・広告の設定（EU など） ----------
  if (window.APP_VERSION && window.APP_VERSION !== "dev") $("build-info").textContent = window.APP_VERSION;
  Ads.initDone.then(() => { if (Ads.privacyOptionsRequired) $("ad-privacy").hidden = false; });
  $("ad-privacy-link").addEventListener("click", (e) => { e.preventDefault(); Ads.showPrivacyOptions(); });

  // ---------- 言語の切り替え ----------
  const esc = (x) => String(x).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const printName = (p) => (EN() ? p.en : p.ja);

  function setQuestionTexts() {
    const p = state.queue[state.index];
    if (!p) return;
    // 英語では英題を大きく、和題を小さく。日本語では和題と読み
    $("q-name").textContent = printName(p);
    $("q-yomi").textContent = EN() ? p.ja : p.yomi;
    $("btn-next").textContent = T(state.index + 1 >= state.total ? "play.toResult" : "play.next");
  }
  function setResultTexts() {
    if (!state.last) return;
    const { res, rk, timedOut } = state.last;
    $("hint").textContent = (timedOut ? T("play.timeUp") : "") +
      T("play.stats", { cov: Math.round(res.coverage * 100), prec: Math.round(res.precision * 100) });
    const badge = $("result-badge");
    badge.innerHTML = `<div class="pt">${res.score}</div><div class="lb">${"★".repeat(rk.stars)}${esc(T("rank." + rk.key))}</div>`;
  }
  function setFinalTexts() {
    if (!state.finalLevel) return;
    $("final-rank").textContent = T("title." + state.finalLevel);
    const extra = [];
    if (state.newBest) extra.push(T("result.newBest"));
    if (state.redoUsed) extra.push(T("result.redo", { n: state.redoUsed }));
    $("final-extra").textContent = extra.join("　");
    $("result-list").innerHTML = state.results.map(r =>
      `<li><span>${esc(printName(r.print))}</span><span class="s">${"★".repeat(r.rank.stars)} ${esc(T("result.pt", { n: r.score }))}</span></li>`).join("");
  }
  function refreshTexts() {
    titleNote();
    showBest();
    if (redo.active) {
      $("redo-note").textContent = T("redo.note", { n: REDO_MAX - state.redoUsed });
      if (!redo.busy) $("redo-watch").textContent = T("redo.watch");
      $("redo-next").textContent = T("redo.next", { s: Math.max(0, redo.left) });
    }
    if ($("screen-play").classList.contains("active")) {
      setQuestionTexts();
      if (state.revealed) setResultTexts();
      else $("hint").textContent = T("play.hint");
    }
    if ($("screen-result").classList.contains("active")) setFinalTexts();
  }
  $("howto-time").dataset.i18nVars = JSON.stringify({ sec: TIME_LIMIT });
  I18N.onChange(refreshTexts);
  I18N.apply();
  refreshTexts();
  updateBanner();
})();
