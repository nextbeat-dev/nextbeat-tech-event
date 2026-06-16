/**
 * ReDoS実演＝掴み（19:00-19:06）。
 * 標準の RegExp は /^(a+)+$/ のようなパターンでバックトラッキング爆発（ReDoS）する。
 * 自作エンジンは同じ入力を一瞬で返す。その対比を見せる。
 *
 *   pnpm bench:redos [n]   （n=攻撃文字数, 省略時26）
 *
 * 注意: 標準 RegExp は n を少し増やすだけで秒〜分オーダーで固まる。
 *       ライブでは n を 28→30→32... と上げて「固まる」を体感させる。
 */
import { compile } from "../src/index.js";

const n = Number(process.argv[2] ?? 26);
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
  const re = compile("(a+)+");
  const t0 = performance.now();
  const r = re.test(attack);
  const ms = performance.now() - t0;
  console.log(`    => ${r}   ${ms.toFixed(3)} ms   (DFA状態数=${re.stateCount()})`);
}

console.log(
  "\nバックトラッキングは「(a+)+ の分け方」を全探索して指数爆発する。\n" +
    "DFAは正規表現を状態とみなして1文字1遷移＝入力長に線形。これが実用品質の正体。",
);
