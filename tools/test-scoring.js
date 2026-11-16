// 採点ロジックの簡易テスト:  node tools/test-scoring.js
const { evaluate } = require("../js/scoring.js");
const assert = require("assert");

const fuji = [[{ x: 100, y: 400 }, { x: 260, y: 220 }, { x: 340, y: 220 }, { x: 500, y: 400 }]];
const shift = (lines, dx, dy) => lines.map(l => l.map(p => ({ x: p.x + dx, y: p.y + dy })));

const exact = evaluate(fuji, fuji).score;
const near = evaluate(fuji, shift(fuji, 8, 6)).score;
const far = evaluate(fuji, shift(fuji, 200, 0)).score;
const half = evaluate(fuji, [fuji[0].slice(0, 2)]).score;
const scribble = evaluate(fuji, [[{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 0, y: 600 }, { x: 600, y: 600 }]]).score;

console.log({ exact, near, far, half, scribble });
assert(exact === 100);
assert(near >= 80, "少しずれただけなら高得点");
assert(far < 30, "大きくずれたら低得点");
assert(half < near && half > far, "半分だけなぞったら中くらい");
assert(scribble < 40, "でたらめに塗りつぶすと低得点");
console.log("ok");
