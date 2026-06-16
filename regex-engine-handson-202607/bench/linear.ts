/**
 * 線形時間の実証＝オチ（20:05-20:13）。
 * 冒頭で標準RegExpを固まらせた (a+)+ を、自作エンジンに巨大入力で食わせる。
 * 入力長を10倍にすると所要時間もほぼ10倍＝O(n)。状態数は入力長に依らず一定。
 *
 *   pnpm bench:linear
 */
import { compile } from "../src/index.js";

const re = compile("(a+)+");
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
