// なぞった線と正解の輪郭線の一致度を計算する。
// 座標はすべてピクセル空間（同じ縮尺）で渡すこと。
// polylines: [[{x,y}, ...], ...]  （線は複数あってよい）
(function (global) {
  "use strict";

  function segLen(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }

  // 折れ線を等間隔の点列に再サンプリング
  function resample(polylines, step) {
    const out = [];
    for (const line of polylines) {
      if (!line || line.length === 0) continue;
      if (line.length === 1) { out.push({ x: line[0].x, y: line[0].y }); continue; }
      out.push({ x: line[0].x, y: line[0].y });
      let carry = 0;
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i];
        const L = segLen(a, b);
        if (L === 0) continue;
        let t = step - carry;
        while (t <= L) {
          out.push({ x: a.x + (b.x - a.x) * t / L, y: a.y + (b.y - a.y) * t / L });
          t += step;
        }
        carry = L - (t - step);
      }
      const last = line[line.length - 1];
      out.push({ x: last.x, y: last.y });
    }
    return out;
  }

  function distPointSeg(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const L2 = dx * dx + dy * dy;
    let t = L2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  function distToPolylines(p, polylines) {
    let best = Infinity;
    for (const line of polylines) {
      if (line.length === 1) { best = Math.min(best, segLen(p, line[0])); continue; }
      for (let i = 1; i < line.length; i++) best = Math.min(best, distPointSeg(p, line[i - 1], line[i]));
    }
    return best;
  }

  function bbox(polylines) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const line of polylines) for (const p of line) {
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  }

  // 戻り値: { score: 0-100, coverage, precision, meanDist, scale }
  //   coverage  … 正解の輪郭のうち、なぞった線の近くにある割合（なぞり残しが少ないほど高い）
  //   precision … なぞった線のうち、正解の輪郭の近くにある割合（はみ出しが少ないほど高い）
  function evaluate(truth, drawn) {
    const tLines = truth.filter(l => l && l.length);
    const dLines = drawn.filter(l => l && l.length);
    if (!tLines.length || !dLines.length) return { score: 0, coverage: 0, precision: 0, meanDist: Infinity, scale: 0 };

    const bb = bbox(tLines);
    // 富士山の大きさを基準に許容誤差を決める（小さく描かれた富士ほど厳しくなりすぎないよう下限を設ける）
    const scale = Math.max(Math.hypot(bb.w, bb.h), 60);
    const tol = scale * 0.08;   // この距離以内なら「重なっている」
    const step = Math.max(scale / 80, 1.5);

    const tPts = resample(tLines, step);
    const dPts = resample(dLines, step);

    let covered = 0, sumT = 0;
    for (const p of tPts) { const d = distToPolylines(p, dLines); sumT += d; if (d <= tol) covered++; }
    let precise = 0, sumD = 0;
    for (const p of dPts) { const d = distToPolylines(p, tLines); sumD += d; if (d <= tol) precise++; }

    const coverage = covered / tPts.length;
    const precision = precise / dPts.length;
    const meanDist = (sumT / tPts.length + sumD / dPts.length) / 2;
    const closeness = Math.max(0, 1 - meanDist / (scale * 0.35));

    // F値（なぞり残し を はみ出し より少し重く見る F1.5）＋ 平均距離の近さ
    const b2 = 1.5 * 1.5;
    const f = coverage + precision > 0 ? (1 + b2) * coverage * precision / (b2 * precision + coverage) : 0;
    const score = Math.round(100 * (0.7 * f + 0.3 * closeness));
    return { score, coverage, precision, meanDist, scale };
  }

  function rank(score) {
    // key は表示用の言語ごとの文言（js/i18n.js の rank.*）を引くためのもの
    if (score >= 92) return { key: "god", label: "神業！", stars: 3, hit: true };
    if (score >= 80) return { key: "great", label: "お見事！", stars: 2, hit: true };
    if (score >= 65) return { key: "hit", label: "当たり", stars: 1, hit: true };
    if (score >= 35) return { key: "close", label: "惜しい…", stars: 0, hit: false };
    return { key: "miss", label: "はずれ", stars: 0, hit: false };
  }

  const api = { evaluate, rank, resample };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.FujiScoring = api;
})(typeof window !== "undefined" ? window : globalThis);
