/**
 * ReDoS実演＝イントロの掴み（講師デモ、約5分）。
 * 標準の RegExp は /^(a+)+$/ のようなパターンでバックトラッキング爆発（ReDoS）する。
 * 自作エンジンは同じ入力を一瞬で返す。その対比を見せる。
 *
 *   pnpm bench:redos [n]           （n=攻撃文字数, 省略時26）
 *   pnpm bench:redos 32 --force    （n>30 を承知の上で実行する場合）
 *
 * 標準 RegExp 側は n+1 ごとに約2倍で重くなる（目安: 26≈2秒/28≈9秒/30≈35秒/32≈2.4分/34≈9分。
 * 実測値はマシン依存）。n>30 は誤って打つと数分マシンが返ってこないため --force を必須にしてある。
 *
 * 自作エンジン側は、①（derivative の実装）が終わるまでは「まだ動かない」旨を表示して終了し、
 * ②（正規化）が終わるまでは12文字プローブで状態爆発を検知して打ち切る（OOM/フリーズを避けるため）。
 */
import { compile } from "../src/index.js";

const rawArgs = process.argv.slice(2);
const force = rawArgs.includes("--force");
const nArg = rawArgs.find((a) => a !== "--force");
const n = Number(nArg ?? 26);

if (n > 30 && !force) {
  console.error(
    `n=${n} は標準 RegExp 側が分オーダーで固まります（n+1 ごとに約2倍。目安: 26≈2秒/28≈9秒/30≈35秒/32≈2.4分/34≈9分）。`,
  );
  console.error(`本当に実行する場合のみ --force を付けてください: pnpm bench:redos ${n} --force`);
  process.exit(1);
}

const attack = "a".repeat(n) + "X"; // 最後にXを置くと(a+)+$は失敗方向でバックトラック爆発

console.log(`攻撃入力: "a"×${n} + "X"  (length=${attack.length})\n`);

// --- 標準 RegExp（バックトラッキング型）---
const native = /^(a+)+$/;
console.log("[1] 標準 RegExp  /^(a+)+$/.test(...)");
{
  const t0 = performance.now();
  const r = native.test(attack);
  const ms = performance.now() - t0;
  console.log(`    => ${r}   ${ms.toFixed(1)} ms` + (ms > 1000 ? "  ★固まった（ReDoS）" : ""));
}

// --- 自作エンジン（DFA型・Brzozowski微分）---
console.log("\n[2] 自作エンジン  compile('(a+)+').test(...)");
{
  let re;
  try {
    re = compile("(a+)+");
    re.test("a".repeat(12)); // 状態爆発プローブ（正規化②がまだ無いと巨大化する）
  } catch (e) {
    console.log(`    ⚠ まだ動かない: ${(e as Error).message}`);
    console.log("      → 山場①（derivative の実装）の後にもう一度どうぞ。");
    process.exit(0);
  }
  if (re.stateCount() > 6) {
    console.log(`    ⚠ 状態爆発を検知: 12文字時点で状態数=${re.stateCount()}（完成版は2）。`);
    console.log("      正規化(②)が未実装のため、このまま計測すると指数的に重くなります。ここで打ち切ります。");
    console.log("      → これが②で直す「状態爆発」です。SPEC.md の正規化(ACI) へ。");
    process.exit(0);
  }
  const t0 = performance.now();
  const r = re.test(attack);
  const ms = performance.now() - t0;
  console.log(`    => ${r}   ${ms.toFixed(3)} ms   (DFA状態数=${re.stateCount()})`);
}

console.log(
  "\nバックトラッキングは「(a+)+ の分け方」を全探索して指数爆発する。\n" +
    "DFAは正規表現を状態とみなして1文字1遷移＝入力長に線形。これが実用品質の正体。",
);
