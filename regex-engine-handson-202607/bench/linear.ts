/**
 * 線形時間の実証＝終盤のオチ。
 * 冒頭で標準RegExpを固まらせた (a+)+ を、自作エンジンに巨大入力で食わせる。
 * 入力長を10倍にすると所要時間もほぼ10倍＝O(n)。状態数は入力長に依らず一定。
 *
 *   pnpm bench:linear
 *
 * ①（derivative）が終わるまでは「まだ動かない」旨を表示して終了し、
 * ②（正規化）が終わるまでは12文字プローブで状態爆発を検知して打ち切る
 * （正規化なしで10^7文字を食わせるとOOM/フリーズするため）。
 */
import { compile } from "../src/index.js";

const re = (() => {
  try {
    const r = compile("(a+)+");
    r.test("a".repeat(12)); // 状態爆発プローブ
    return r;
  } catch (e) {
    console.log(`⚠ まだ動かない: ${(e as Error).message}`);
    console.log("  → 山場①（derivative の実装）の後にもう一度どうぞ。");
    process.exit(0);
  }
})();

if (re.stateCount() > 6) {
  console.log(`⚠ 状態爆発を検知: 12文字時点で状態数=${re.stateCount()}（完成版は2）。`);
  console.log("  正規化(②)が未実装のため、このまま巨大入力を食わせると指数的に重くなります。ここで打ち切ります。");
  console.log("  → これが②で直す「状態爆発」です。SPEC.md の正規化(ACI) へ。");
  process.exit(0);
}

const sizes = [10_000, 100_000, 1_000_000, 10_000_000];

console.log("pattern = (a+)+   （標準RegExpが28文字で固まるやつ）\n");
console.log("入力長(文字)\t所要(ms)\t結果\tDFA状態数");
for (const n of sizes) {
  const input = "a".repeat(n); // 全部 'a' → (a+)+ にマッチ(true)
  const t0 = performance.now();
  const r = re.test(input);
  const ms = performance.now() - t0;
  console.log(`${n.toLocaleString()}\t${ms.toFixed(1)}\t${r}\t${re.stateCount()}`);
}
console.log("\n入力10倍 → 時間ほぼ10倍 ＝ O(n)。状態数は入力に依らず一定（正規化のおかげ）。");
