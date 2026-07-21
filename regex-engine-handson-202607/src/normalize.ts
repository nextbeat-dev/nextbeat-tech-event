/**
 * スマートコンストラクタ（正規化を内蔵したノード生成）。
 *
 * ★ここが「線形時間」の土台★
 * Brzozowski微分は ∂c(r*) = ∂c(r)·r* のように、微分のたびに新しい正規表現を生む。
 * 素朴に作ると ε·r や r|r のような「意味は同じだが構造が違う」ノードが無限に増殖し、
 * 遅延DFAの状態が収束せず、線形時間が崩壊する（(a+)+ で状態数が指数爆発する）。
 *
 * いまは「素直にノードを作るだけ」の naive 版。正しく動くが、状態が入力長に比例して
 * 増え続ける。山場①のあと pnpm bench:redos 16 で爆発を確認し、②で SPEC.md の
 * ACI（結合/可換/冪等）正規化をここに実装して直す。
 */

import { type Re, EMPTY, EPS, canonicalKey } from "./ast.js"; // ②で使う（今は未使用でOK）

/**
 * 選択 r | s。
 * TODO(②): SPEC.md「正規化（ACI）」の mkAlt 規則を実装する
 *  - ∅|r = r, r|∅ = r（吸収）
 *  - r|r = r（冪等）
 *  - r|s = s|r（可換 → canonicalKey でソートして順序固定）
 *  - (r|s)|t = r|(s|t)（結合 → フラット化して一意な右畳み）
 */
export function mkAlt(a: Re, b: Re): Re {
  return { tag: "Alt", left: a, right: b }; // naive: そのまま作る
}

/**
 * 連接 r · s。
 * TODO(②): ∅·r = ∅, r·∅ = ∅（零元）/ ε·r = r, r·ε = r（単位元）/ 右結合に固定
 */
export function mkConcat(a: Re, b: Re): Re {
  return { tag: "Concat", left: a, right: b }; // naive: そのまま作る
}

/**
 * 星 r*。
 * TODO(②): ∅* = ε, ε* = ε / (r*)* = r*
 */
export function mkStar(r: Re): Re {
  return { tag: "Star", body: r }; // naive: そのまま作る
}
