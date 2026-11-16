// 日本語 / 英語の切り替え
//   HTML: data-i18n="キー"（テキスト）、data-i18n-html="キー"（タグを含む文）、
//         data-i18n-attr="属性:キー,属性:キー"（aria-label など）
//   JS:   I18N.t("キー", { 変数 })
(function () {
  "use strict";

  const DICT = {
    ja: {
      "doc.title": "富嶽三十六景　富士山どこだっけ？",
      "doc.desc": "富士山が消えた北斎の富嶽三十六景。星座をなぞるように、富士山のシルエットの輪郭をなぞって当てよう。",
      "lang.toggle": "EN",
      "lang.label": "Switch to English",
      "sound.off": "音を消す",
      "sound.on": "音を出す",
      "title.artist": "葛飾北斎",
      "title.main": "富嶽三十六景",
      "title.sub": "富士山どこだっけ？",
      "title.lead": "絵から富士山が消えてしまった！<br>富士山があったはずの<strong>輪郭</strong>をなぞろう。",
      "mode.5": "五問勝負",
      "mode.10": "十問勝負",
      "mode.all": "全図制覇",
      "title.count": "収録 {n} 図",
      "title.empty": "正解の輪郭線がまだ登録されていません（editor.html で作成してください）",
      "howto.open": "あそびかた",
      "howto.title": "あそびかた",
      "howto.back": "もどる",
      "howto.1": "富士山が消された浮世絵が表示されます。",
      "howto.2": "富士山の<strong>稜線（シルエットの輪郭）</strong>を、ドラッグ／指でなぞってください。何本かに分けてなぞってもOK。",
      "howto.3": "「判定」を押すと、本当の富士山と輪郭線が星座のように現れます。",
      "howto.4": "なぞった線が本物の輪郭にどれだけ重なったかで点数がつきます。なぞり残しも、はみ出しも減点です。",
      "howto.5": "制限時間は1問<strong>{sec}秒</strong>。時間切れになると、そこまでになぞった線で判定します。",
      "howto.start": "はじめる",
      "play.score": "得点",
      "play.hint": "富士山の輪郭（稜線）をなぞってください",
      "play.undo": "一筆戻す",
      "play.clear": "全部消す",
      "play.judge": "判定",
      "play.compare": "見比べる",
      "play.next": "次へ",
      "play.toResult": "結果を見る",
      "play.altNofuji": "富士山が消された浮世絵",
      "play.altOriginal": "原画",
      "play.missing": "富士山を消した画像が見つかりません",
      "play.stats": "なぞり具合 {cov}%　／　正確さ {prec}%",
      "play.timeUp": "時間切れ！　",
      "rank.god": "神業！",
      "rank.great": "お見事！",
      "rank.hit": "当たり",
      "rank.close": "惜しい…",
      "rank.miss": "はずれ",
      "rank.timeout": "時間切れ",
      "result.title": "結果",
      "result.points": " 点",
      "result.pt": "{n}点",
      "result.retry": "もう一度",
      "result.redo": "やり直し {n} 回",
      "result.newBest": "ベスト更新！",
      "best": "ベスト {n}",
      "pause.open": "一時停止",
      "pause.title": "一時停止",
      "pause.resume": "再開",
      "pause.top": "タイトルへ",
      "redo.watch": "▶ 広告を見てこの絵をやり直す",
      "redo.next": "つぎへ ({s})",
      "redo.loading": "広告を読み込み中…",
      "redo.fail": "広告を読み込めませんでした",
      "redo.note": "外した絵をもう一度なぞれます（このゲームであと {n} 回）",
      "share.btn": "📤 結果をシェア",
      "share.title": "富嶽三十六景 富士山どこだっけ？",
      "share.dialog": "結果をシェア",
      "share.text": "🗻富嶽三十六景 富士山どこだっけ？で{n}図に挑戦！\n{score}点 {rank}{redo}\n#富士山どこだっけ #富嶽三十六景 #葛飾北斎 #ClaudeCode",
      "share.redo": "（やり直し{n}回）",
      "share.copied": "結果をコピーしました！SNSに貼り付けてください",
      "share.copyFail": "コピーできませんでした",
      "legal.privacy": "プライバシーポリシー",
      "legal.adSettings": "広告の設定",
      "url.privacy": "https://techgym.jp/privacy-policy/",
      "result.top": "タイトルへ",
      "title.1": "称号：画狂老人（北斎級）",
      "title.2": "称号：富士見の達人",
      "title.3": "称号：江戸の旅人",
      "title.4": "称号：駆け出しの絵師",
      "title.5": "称号：富士山はどこへ…",
    },
    en: {
      "doc.title": "Where's Mt. Fuji? — Thirty-six Views",
      "doc.desc": "Mount Fuji has vanished from Hokusai's Thirty-six Views. Trace its silhouette like a constellation to find it again.",
      "lang.toggle": "日本語",
      "lang.label": "日本語に切り替える",
      "sound.off": "Mute",
      "sound.on": "Unmute",
      "title.artist": "Katsushika Hokusai",
      "title.main": "Thirty-six Views of Mount Fuji",
      "title.sub": "Where's Mt. Fuji?",
      "title.lead": "Mount Fuji has vanished from the prints!<br>Trace the <strong>outline</strong> of where Fuji should be.",
      "mode.5": "5 Prints",
      "mode.10": "10 Prints",
      "mode.all": "All Prints",
      "title.count": "{n} prints",
      "title.empty": "No answer outlines yet (create them with editor.html)",
      "howto.open": "How to play",
      "howto.title": "How to play",
      "howto.back": "Back",
      "howto.1": "You'll see a ukiyo-e print with Mount Fuji erased.",
      "howto.2": "Drag your mouse or finger along Fuji's <strong>ridgeline (the outline of its silhouette)</strong>. You can use several strokes.",
      "howto.3": "Press “Check” and the real Fuji appears, with its outline drawn like a constellation.",
      "howto.4": "You score by how closely your line matches the real outline. Missing parts and stray lines both cost points.",
      "howto.5": "You have <strong>{sec} seconds</strong> per print. When time runs out, whatever you've traced is checked.",
      "howto.start": "Start",
      "play.score": "Score",
      "play.hint": "Trace the outline (ridgeline) of Mount Fuji",
      "play.undo": "Undo",
      "play.clear": "Clear",
      "play.judge": "Check",
      "play.compare": "Compare",
      "play.next": "Next",
      "play.toResult": "See results",
      "play.altNofuji": "Ukiyo-e print with Mount Fuji erased",
      "play.altOriginal": "Original print",
      "play.missing": "The Fuji-free image is missing",
      "play.stats": "Coverage {cov}%  /  Accuracy {prec}%",
      "play.timeUp": "Time's up!  ",
      "rank.god": "Masterful!",
      "rank.great": "Excellent!",
      "rank.hit": "Got it",
      "rank.close": "So close…",
      "rank.miss": "Missed",
      "rank.timeout": "Time's up",
      "result.title": "Results",
      "result.points": " pts",
      "result.pt": "{n} pts",
      "result.retry": "Play again",
      "result.redo": "{n} retries",
      "result.newBest": "New best!",
      "best": "Best {n}",
      "pause.open": "Pause",
      "pause.title": "Paused",
      "pause.resume": "Resume",
      "pause.top": "Title",
      "redo.watch": "▶ Watch an ad to retry this print",
      "redo.next": "Next ({s})",
      "redo.loading": "Loading ad…",
      "redo.fail": "Could not load an ad",
      "redo.note": "Trace the print you missed again ({n} left this game)",
      "share.btn": "📤 Share result",
      "share.title": "Where's Mt. Fuji?",
      "share.dialog": "Share result",
      "share.text": "🗻I traced Mt. Fuji in {n} of Hokusai's Thirty-six Views!\n{score} pts {rank}{redo}\n#WheresMtFuji #Hokusai #ClaudeCode",
      "share.redo": " ({n} retries)",
      "share.copied": "Copied! Paste it into your social media",
      "share.copyFail": "Could not copy",
      "legal.privacy": "Privacy Policy",
      "legal.adSettings": "Ad settings",
      "url.privacy": "https://techgym.jp/privacy-policy-en/",
      "result.top": "Title",
      "title.1": "Rank: Old Man Mad About Painting (Hokusai level)",
      "title.2": "Rank: Master Fuji-Watcher",
      "title.3": "Rank: Edo Traveler",
      "title.4": "Rank: Apprentice Artist",
      "title.5": "Rank: Where did Fuji go…?",
    },
  };

  const KEY = "fugaku-lang";
  function initial() {
    // web-only:start
    // Web 版だけ、URL の ?lang=en / ?lang=ja で言語を指定できる（アプリ用のビルドでは取り除く）
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "ja" || q === "en") return q;
    // web-only:end
    try { const s = localStorage.getItem(KEY); if (s === "ja" || s === "en") return s; } catch (e) {}
    return /^ja\b/i.test(navigator.language || "") ? "ja" : "en";
  }
  let lang = initial();
  const listeners = [];

  function t(key, vars) {
    let s = (DICT[lang] && DICT[lang][key]) ?? DICT.ja[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
    return s;
  }

  function apply(root = document) {
    document.documentElement.lang = lang;
    document.title = t("doc.title");
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", t("doc.desc"));
    root.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n, JSON.parse(el.dataset.i18nVars || "null")); });
    root.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml, JSON.parse(el.dataset.i18nVars || "null")); });
    root.querySelectorAll("[data-i18n-attr]").forEach(el => {
      el.dataset.i18nAttr.split(",").forEach(pair => {
        const [attr, key] = pair.split(":");
        el.setAttribute(attr.trim(), t(key.trim()));
      });
    });
    document.body.classList.toggle("lang-en", lang === "en");
  }

  function setLang(l) {
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    apply();
    listeners.forEach(fn => fn(l));
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-lang-toggle]")) setLang(lang === "ja" ? "en" : "ja");
  });

  window.I18N = {
    t, apply, setLang,
    get lang() { return lang; },
    onChange(fn) { listeners.push(fn); },
  };
})();
