import { describe, it, expect } from "vitest";
import { compile } from "../src/index.js";

/**
 * stage2（②正規化の完了判定）。`pnpm test:all` で実行される（`pnpm test` には含まれない）。
 * ①完了直後（正規化なし）は「ここだけ赤」が正常な状態。②（ACI正規化）を実装すると緑になる。
 *
 * 収束ゲート（stateCount のアサーション）を100k文字の本番アサーションより先に置いている。
 * 正規化なしのまま100k文字を食わせると式サイズが指数的に増えて同期処理のままハングし、
 * vitest の testTimeout では中断できない（同期コードは割り込めないため）。ゲートは
 * 十数文字で即座に読める赤を出し、expect が先に throw するので100k行には到達しない。
 *
 * しきい値は実測（完成版 main）に基づく: (a+)+ は12文字時点で2状態・100k文字後も3状態、
 * (a|b)*c は2状態に収束する。正規化なしだと1文字ごとに新状態が増えるため、
 * 12文字時点で ≤5 のゲートは即座に破られる。
 */
describe("線形性（②の正規化で緑になる）", () => {
  it("(a+)+ が有限状態に収束し、攻撃入力 100k 文字でも線形", () => {
    const re = compile("(a+)+");
    // [収束ゲート] 12文字時点の状態数（完成版=2 / 正規化なし=13前後）
    expect(re.test("a".repeat(12))).toBe(true);
    expect(re.stateCount()).toBeLessThanOrEqual(5);
    // [本番] ゲートを通った実装だけが挑む（タイムアウトしなければ線形性の証拠）
    expect(re.test("a".repeat(100_000) + "b")).toBe(false);
    expect(re.stateCount()).toBeLessThan(10); // 状態数は入力長に依らず一定（完成版=3）
  });

  it("(a|b)*c も収束する（(a+)+ 専用の偶然でないことの確認）", () => {
    const re = compile("(a|b)*c");
    expect(re.test("ab".repeat(6) + "c")).toBe(true);
    expect(re.stateCount()).toBeLessThanOrEqual(5); // 完成版=2
  });
});
