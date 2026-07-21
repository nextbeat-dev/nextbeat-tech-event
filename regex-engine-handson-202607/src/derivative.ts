/**
 * Brzozowski微分の中核。たった2つの再帰関数（nullable と derivative）だけ。
 * この30行が正規表現エンジンの心臓部。
 *
 * ★山場①: この2つの switch の中身を埋める。SPEC.md の規則表と1対1★
 */

import { type Re, EMPTY, EPS } from "./ast.js"; // ①で使う（今は未使用でOK）
import { mkAlt, mkConcat } from "./normalize.js"; // ①で使う（今は未使用でOK）

/**
 * nullable(r): r は空文字列 "" を受理するか？
 *  ν(∅)=false  ν(ε)=true  ν(class)=false  ν(r*)=true
 *  ν(rs)=ν(r)∧ν(s)   ν(r|s)=ν(r)∨ν(s)
 */
export function nullable(r: Re): boolean {
  switch (r.tag) {
    // TODO(山場①): SPEC.md「nullable ν(r)」の表の6行を case で実装する
    //   case "Empty": / "Eps": / "Class": / "Star": / "Concat": / "Alt":
    default:
      throw new Error(
        `TODO(山場①): nullable(${r.tag}) — SPEC.md の ν(r) の表を見て実装してください`,
      );
  }
}

/**
 * derivative(r, c): 文字 c で r を微分する。
 * 「r がマッチする文字列のうち、先頭が c のものから、その c を1文字剥がした残り」に
 * マッチする正規表現を返す。
 *
 *  ∂c(∅)=∅   ∂c(ε)=∅   ∂c(class)= c∈class ? ε : ∅
 *  ∂c(r*)  = ∂c(r)·r*
 *  ∂c(rs)  = ∂c(r)·s  |  (ν(r) ? ∂c(s) : ∅)      ← ★連接則。nullable項が唯一の非自明ポイント
 *  ∂c(r|s) = ∂c(r) | ∂c(s)
 *
 * 罠: ∂c(rs) の「ν(r) なら ∂c(s) も足す」を忘れると、a?b のような
 *     「左がεを含む連接」だけが壊れる（他のテストは通るので発見が遅れる）。
 */
export function derivative(r: Re, c: number): Re {
  switch (r.tag) {
    // TODO(山場①): SPEC.md「derivative ∂c(r)」の表の6行を case で実装する
    //  - ノード生成は必ず mkAlt / mkConcat 経由（生のオブジェクトリテラル禁止）
    //  - Class では classMatches(r.set, r.neg, c) を使う
    //  - ★連接則の ν(r) 項を忘れると a?b だけ壊れる（SPEC.md の罠）
    default:
      throw new Error(
        `TODO(山場①): derivative(${r.tag}, '${String.fromCodePoint(c)}') — SPEC.md の ∂c(r) の表を見て実装してください`,
      );
  }
}

/** 文字 c（コードポイント）が文字集合に属するか。neg なら否定。（完成品・①の対象外） */
export function classMatches(
  set: readonly (readonly [number, number])[],
  neg: boolean,
  c: number,
): boolean {
  const inSet = set.some(([lo, hi]) => lo <= c && c <= hi);
  return neg ? !inSet : inSet;
}
