/**
 * Brzozowski微分の中核。たった2つの再帰関数（nullable と derivative）だけ。
 * この30行が正規表現エンジンの心臓部。
 */

import { type Re, EMPTY, EPS } from "./ast.js";
import { mkAlt, mkConcat } from "./normalize.js";

/**
 * nullable(r): r は空文字列 "" を受理するか？
 *  ν(∅)=false  ν(ε)=true  ν(class)=false  ν(r*)=true
 *  ν(rs)=ν(r)∧ν(s)   ν(r|s)=ν(r)∨ν(s)
 */
export function nullable(r: Re): boolean {
  switch (r.tag) {
    case "Empty":
      return false;
    case "Eps":
      return true;
    case "Class":
      return false; // どんな1文字集合も「1文字」消費するので "" は受理しない
    case "Star":
      return true; // r* は0回マッチ（=ε）を含む
    case "Concat":
      return nullable(r.left) && nullable(r.right);
    case "Alt":
      return nullable(r.left) || nullable(r.right);
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
    case "Empty":
      return EMPTY;
    case "Eps":
      return EMPTY;
    case "Class":
      return classMatches(r.set, r.neg, c) ? EPS : EMPTY;
    case "Star":
      // (∂c body) · (body*)  ※ body* は r 自身を再利用
      return mkConcat(derivative(r.body, c), r);
    case "Concat": {
      const dLeft = mkConcat(derivative(r.left, c), r.right); // ∂c(r)·s
      return nullable(r.left)
        ? mkAlt(dLeft, derivative(r.right, c)) // + ∂c(s)
        : dLeft;
    }
    case "Alt":
      return mkAlt(derivative(r.left, c), derivative(r.right, c));
  }
}

/** 文字 c（コードポイント）が文字集合に属するか。neg なら否定。 */
export function classMatches(
  set: readonly (readonly [number, number])[],
  neg: boolean,
  c: number,
): boolean {
  const inSet = set.some(([lo, hi]) => lo <= c && c <= hi);
  return neg ? !inSet : inSet;
}
